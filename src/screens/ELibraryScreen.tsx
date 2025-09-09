// src/screens/ELibraryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialIcons, } from '@expo/vector-icons';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStats } from '../hooks/useStats';

interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  url: string;
  created_at: string;
  uploader_id: string;
  file_format?: string;
}

export default function ELibraryScreen(): React.JSX.Element {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Notes');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [showOfflineFiles, setShowOfflineFiles] = useState(false);
  const [offlineFiles, setOfflineFiles] = useState<any[]>([]);
  const { user, profile } = useAuth();
  const { recordDownload } = useStats(user?.id, profile?.created_at);

  useEffect(() => {
    loadFiles();
    loadDownloadedFiles();
  }, []);

  // Load list of downloaded files
  const loadDownloadedFiles = async () => {
    try {
      const downloadDir = FileSystem.documentDirectory + 'downloads/';
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (dirInfo.exists) {
        const downloadedList = await FileSystem.readDirectoryAsync(downloadDir);
        setDownloadedFiles(new Set(downloadedList));
        
        // Load offline files info
        const offlineFilesInfo = await Promise.all(
          downloadedList.map(async (fileName) => {
            const fileInfo = await FileSystem.getInfoAsync(downloadDir + fileName);
            const originalFile = files.find(f => fileName.startsWith(f.id));
            return {
              fileName,
              localUri: downloadDir + fileName,
              size: ('size' in fileInfo) ? fileInfo.size : 0,
              modificationTime: ('modificationTime' in fileInfo) ? fileInfo.modificationTime : 0,
              originalName: originalFile?.name || fileName,
              category: originalFile?.category || 'Unknown'
            };
          })
        );
        setOfflineFiles(offlineFilesInfo);
      }
    } catch (error) {
      console.error('Error loading downloaded files:', error);
    }
  };

  // Open offline file
  const openOfflineFile = async (offlineFile: any) => {
    try {
      Alert.alert(
        'Offline File',
        `File: ${offlineFile.originalName}\nSize: ${(offlineFile.size / (1024 * 1024)).toFixed(2)} MB\nDownloaded: ${new Date(offlineFile.modificationTime).toLocaleDateString()}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: async () => {
              try {
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                  await Sharing.shareAsync(offlineFile.localUri);
                } else {
                  Alert.alert('Error', 'Sharing not available on this device');
                }
              } catch (error) {
                console.error('Error opening file:', error);
                Alert.alert('Error', 'Cannot open file');
              }
            }
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteOfflineFile(offlineFile)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Cannot access file');
    }
  };

  // Delete offline file
  const deleteOfflineFile = async (offlineFile: any) => {
    try {
      await FileSystem.deleteAsync(offlineFile.localUri);
      loadDownloadedFiles();
      Alert.alert('Success', 'File deleted from offline storage');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  // Fetch files from Supabase with uploader names
  const loadFiles = async () => {
    const { data, error } = await supabase
      .from('files')
      .select(`
        *,
        profiles!uploader_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error.message);
    } else {
      setFiles(data || []);
    }
  };

  // Show upload form
  const showUploadDialog = () => {
    setShowUploadForm(true);
  };

  // Select file for upload
  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to select file');
    }
  };

  // Get file format from filename
  const getFileFormat = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ext.toUpperCase();
  };

  // Upload file (lecturer only)
  const handleUpload = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!uploadTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file');
      return;
    }

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const fileFormat = getFileFormat(selectedFile.name);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/octet-stream',
          name: selectedFile.name,
        } as any);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Insert metadata
      const { error: insertError } = await supabase.from('files').insert({
        name: uploadTitle.trim(),
        size: (selectedFile.size || 0),
        type: selectedFile.mimeType || 'application/octet-stream',
        category: uploadCategory,
        uploader_id: user.id,
        url: urlData.publicUrl,
        file_format: fileFormat,
      });

      if (insertError) throw insertError;

      Alert.alert('Success', 'File uploaded!');
      setShowUploadForm(false);
      setUploadTitle('');
      setUploadCategory('Notes');
      setSelectedFile(null);
      loadFiles();
    } catch (err: any) {
      console.error('Upload failed:', err.message);
      Alert.alert('Error', err.message);
    }
  };

  // Handle download to offline storage
  const handleDownload = async (file: LibraryFile) => {
    const fileName = `${file.id}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    if (downloadedFiles.has(fileName)) {
      Alert.alert('Already Downloaded', 'This file is already available offline.');
      return;
    }

    Alert.alert('Download', `Download "${file.name}" for offline access?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Download',
        onPress: async () => {
          try {
            setDownloadingFiles(prev => new Set(prev).add(file.id));
            
            // Create downloads directory if it doesn't exist
            const downloadDir = FileSystem.documentDirectory + 'downloads/';
            const dirInfo = await FileSystem.getInfoAsync(downloadDir);
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
            }

            // Download file
            const localUri = downloadDir + fileName;
            const downloadResult = await FileSystem.downloadAsync(file.url, localUri);
            
            if (downloadResult.status === 200) {
              setDownloadedFiles(prev => new Set(prev).add(fileName));
              await recordDownload(file.name, file.type, file.id);
              Alert.alert('Success', 'File downloaded for offline access!');
            } else {
              Alert.alert('Error', 'Failed to download file');
            }
          } catch (err) {
            console.error('Download error:', err);
            Alert.alert('Error', 'Failed to download file');
          } finally {
            setDownloadingFiles(prev => {
              const newSet = new Set(prev);
              newSet.delete(file.id);
              return newSet;
            });
          }
        },
      },
    ]);
  };

  const getFilteredFiles = (): LibraryFile[] => {
    let filtered = files;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((f) => f.category === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ((f as any).profiles?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const getUniqueCategories = (): string[] => {
    const categories = files.map((f) => f.category);
    return ['all', ...Array.from(new Set(categories))];
  };

  // Get file icon based on format
  const getFileIcon = (format: string): keyof typeof MaterialIcons.glyphMap => {
    const f = format.toLowerCase();
    if (['pdf'].includes(f)) return 'picture-as-pdf';
    if (['doc', 'docx'].includes(f)) return 'description';
    if (['ppt', 'pptx'].includes(f)) return 'slideshow';
    if (['xls', 'xlsx'].includes(f)) return 'table-chart';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(f)) return 'image';
    if (['mp4', 'avi', 'mov'].includes(f)) return 'video-library';
    if (['mp3', 'wav'].includes(f)) return 'audiotrack';
    if (['zip', 'rar'].includes(f)) return 'archive';
    return 'insert-drive-file';
  };

  // Get file color based on format
  const getFileColor = (format: string): string => {
    const f = format.toLowerCase();
    if (['pdf'].includes(f)) return '#FF5722';
    if (['doc', 'docx'].includes(f)) return '#2196F3';
    if (['ppt', 'pptx'].includes(f)) return '#FF9800';
    if (['xls', 'xlsx'].includes(f)) return '#4CAF50';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(f)) return '#E91E63';
    if (['mp4', 'avi', 'mov'].includes(f)) return '#9C27B0';
    if (['mp3', 'wav'].includes(f)) return '#FF5722';
    return '#666';
  };

  const renderOfflineFile = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => openOfflineFile(item)}
    >
      <View style={styles.fileHeader}>
        <MaterialIcons name="cloud-off" size={24} color="#4CAF50" />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={2}>
            {item.originalName}
          </Text>
          <Text style={styles.fileDetails}>
            {(item.size / (1024 * 1024)).toFixed(2)} MB • {item.category}
          </Text>
        </View>
        <MaterialIcons name="folder" size={20} color="#4CAF50" />
      </View>
      <View style={styles.fileFooter}>
        <Text style={styles.uploader}>Downloaded offline</Text>
        <Text style={styles.uploadDate}>
          {new Date(item.modificationTime).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFile = ({ item }: { item: LibraryFile }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => handleDownload(item)}
    >
      <View style={styles.fileHeader}>
        <MaterialIcons name={getFileIcon(item.file_format || getFileFormat(item.name)) as any} size={24} color={getFileColor(item.file_format || getFileFormat(item.name))} />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.fileDetails}>
            {typeof item.size === 'number' ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : item.size} • {item.category} • {item.file_format || getFileFormat(item.name)}
          </Text>
        </View>
        {downloadingFiles.has(item.id) ? (
          <ActivityIndicator size={20} color="#4CAF50" />
        ) : downloadedFiles.has(`${item.id}_${item.name.replace(/[^a-zA-Z0-9.]/g, '_')}`) ? (
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
        ) : (
          <MaterialIcons name="download" size={20} color="#4CAF50" />
        )}
      </View>
      <View style={styles.fileFooter}>
        <Text style={styles.uploader}>Uploaded by: {(item as any).profiles?.name || 'Unknown'}</Text>
        <Text style={styles.uploadDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryContainer}
    >
      {getUniqueCategories().map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            selectedCategory === category && styles.activeCategoryButton,
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text
            style={[
              styles.categoryButtonText,
              selectedCategory === category && styles.activeCategoryButtonText,
            ]}
          >
            {category === 'all' ? 'All' : category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.headerButton, !showOfflineFiles && styles.activeHeaderButton]}
            onPress={() => setShowOfflineFiles(false)}
          >
            <Text style={[styles.headerButtonText, !showOfflineFiles && styles.activeHeaderButtonText]}>Online</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerButton, showOfflineFiles && styles.activeHeaderButton]}
            onPress={() => {
              setShowOfflineFiles(true);
              loadDownloadedFiles();
            }}
          >
            <Text style={[styles.headerButtonText, showOfflineFiles && styles.activeHeaderButtonText]}>Offline ({downloadedFiles.size})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!showOfflineFiles && (
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search files or authors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {!showOfflineFiles && renderCategoryFilter()}

      <FlatList
        data={showOfflineFiles ? offlineFiles : getFilteredFiles()}
        renderItem={showOfflineFiles ? renderOfflineFile : renderFile}
        keyExtractor={(item) => showOfflineFiles ? (item as any).fileName : (item as any).id}
        style={styles.filesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name={showOfflineFiles ? "cloud-off" : "folder-open"} size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {showOfflineFiles ? 'No offline files' : 'No files found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {showOfflineFiles ? 'Download files to access them offline' : 'Try adjusting your search or filter'}
            </Text>
          </View>
        }
      />

      {profile?.user_type === 'lecturer' && (
        <TouchableOpacity style={styles.uploadButton} onPress={showUploadDialog}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {showUploadForm && (
        <View style={styles.uploadModal}>
          <View style={styles.uploadForm}>
            <Text style={styles.uploadTitle}>Upload File</Text>
            
            <TextInput
              style={styles.uploadInput}
              placeholder="File title"
              value={uploadTitle}
              onChangeText={setUploadTitle}
            />
            
            <TouchableOpacity 
              style={styles.fileSelectButton}
              onPress={selectFile}
            >
              <MaterialIcons name="attach-file" size={20} color="#666" />
              <Text style={styles.fileSelectText}>
                {selectedFile ? `${selectedFile.name} (${getFileFormat(selectedFile.name)})` : 'Select File'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.categoryPicker}>
              <Text style={styles.categoryLabel}>Category:</Text>
              <TouchableOpacity 
                style={styles.categoryButton}
                onPress={() => {
                  Alert.alert('Select Category', '', [
                    {text: 'Notes', onPress: () => setUploadCategory('Notes')},
                    {text: 'Assignments', onPress: () => setUploadCategory('Assignments')},
                    {text: 'Textbooks', onPress: () => setUploadCategory('Textbooks')},
                    {text: 'Research', onPress: () => setUploadCategory('Research')},
                    {text: 'Cancel', style: 'cancel'}
                  ]);
                }}
              >
                <Text>{uploadCategory}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.uploadButtons}>
              <TouchableOpacity 
                style={styles.cancelUploadButton}
                onPress={() => {
                  setShowUploadForm(false);
                  setUploadTitle('');
                  setUploadCategory('Notes');
                }}
              >
                <Text style={styles.cancelUploadText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmUploadButton}
                onPress={handleUpload}
              >
                <Text style={styles.confirmUploadText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  headerButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeHeaderButton: {
    backgroundColor: '#4CAF50',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeHeaderButtonText: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    paddingHorizontal: 15,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  categoryContainer: { marginHorizontal: 8, maxHeight: 40 },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ddd',
    borderRadius: 16,
    marginRight: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
  },
  activeCategoryButton: { backgroundColor: '#4CAF50' },
  categoryButtonText: { fontSize: 14, color: '#666', fontWeight: '500' },
  activeCategoryButtonText: { color: '#fff' },
  filesList: { flex: 1, paddingHorizontal: 20 },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    elevation: 3,
  },
  fileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fileInfo: { flex: 1, marginLeft: 12 },
  fileName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  fileDetails: { fontSize: 12, color: '#666' },
  fileFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  uploader: { fontSize: 12, color: '#888' },
  uploadDate: { fontSize: 12, color: '#888' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 18, color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#ccc', textAlign: 'center' },
  uploadButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  uploadModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadForm: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: '90%',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  uploadInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  categoryPicker: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },

  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelUploadButton: {
    flex: 1,
    padding: 12,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  confirmUploadButton: {
    flex: 1,
    padding: 12,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  cancelUploadText: {
    color: '#666',
    fontWeight: '500',
  },
  confirmUploadText: {
    color: '#fff',
    fontWeight: '500',
  },
  fileSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  fileSelectText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
});
