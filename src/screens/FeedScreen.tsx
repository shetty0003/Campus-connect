// src/screens/FeedScreen.tsx - Optimized Feed Screen with usePosts Hook
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../hooks/usePosts';
import { PostWithProfile } from '../services/postsService';
import type { Database } from '../lib/supabase';

type PostType = Database['public']['Tables']['posts']['Row']['type'];

export default function FeedScreen(): React.JSX.Element {
  const [filter, setFilter] = useState<'all' | PostType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  
  const { user, profile } = useAuth();
  const { 
    posts, 
    loading, 
    error, 
    refreshPosts, 
    createPost, 
    deletePost,
    searchPosts 
  } = usePosts();

  // Create post form state
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'discussion' as PostType,
  });
  const [creatingPost, setCreatingPost] = useState<boolean>(false);

  // Memoized filtered posts
  const filteredPosts = useMemo(() => {
    let filtered = filter === 'all' ? posts : posts.filter(post => post.type === filter);
    
    if (searchQuery) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.profiles?.name && post.profiles.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [posts, filter, searchQuery]);

  const handleCreatePost = async (): Promise<void> => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }

    try {
      setCreatingPost(true);

      const result = await createPost({
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        type: newPost.type,
        author_id: user.id,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create post.');
        return;
      }

      // Reset form and close modal
      setNewPost({ title: '', content: '', type: 'discussion' });
      setShowCreateModal(false);
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleDeletePost = async (postId: string, postTitle: string): Promise<void> => {
    if (!user) return;

    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete "${postTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePost(postId, user.id);
            if (result.success) {
              Alert.alert('Success', 'Post deleted successfully!');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete post.');
            }
          }
        },
      ]
    );
  };

  const handleSearch = async (query: string): Promise<void> => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchPosts(query);
    }
  };

  const getPostIcon = (type: PostType): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'announcement': return 'campaign';
      case 'event': return 'event';
      case 'discussion': return 'forum';
      case 'help': return 'help';
      default: return 'info';
    }
  };

  const getPostColor = (type: PostType): string => {
    switch (type) {
      case 'announcement': return '#FF6B35';
      case 'event': return '#4CAF50';
      case 'discussion': return '#2196F3';
      case 'help': return '#9C27B0';
      default: return '#757575';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const renderPost = ({ item }: { item: PostWithProfile }): React.JSX.Element => {
    const isOwnPost = user?.id === item.author_id;
    
    return (
      <Animated.View style={[styles.postCard, { opacity: fadeAnim }]}>
        <View style={styles.postHeader}>
          <View style={styles.postMeta}>
            <View style={[styles.iconContainer, { backgroundColor: getPostColor(item.type) + '20' }]}>
              <MaterialIcons 
                name={getPostIcon(item.type)} 
                size={16} 
                color={getPostColor(item.type)} 
              />
            </View>
            <View>
              <Text style={[styles.postType, { color: getPostColor(item.type) }]}>
                {item.type.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
            {isOwnPost && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePost(item.id, item.title)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete-outline" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
        
        <View style={styles.postStats}>
          <TouchableOpacity style={styles.statButton} activeOpacity={0.7}>
            <MaterialIcons 
              name={item.user_has_liked ? "favorite" : "favorite-border"} 
              size={16} 
              color={item.user_has_liked ? "#FF6B35" : "#999"} 
            />
            <Text style={[styles.statText, item.user_has_liked && styles.likedText]}>
              {item.likes_count || 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statButton} activeOpacity={0.7}>
            <MaterialIcons name="chat-bubble-outline" size={16} color="#999" />
            <Text style={styles.statText}>{item.comments_count || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statButton} activeOpacity={0.7}>
            <MaterialIcons name="share" size={16} color="#999" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.postFooter}>
          <View style={styles.authorSection}>
            <View style={styles.authorAvatar}>
              <MaterialIcons 
                name={item.profiles?.user_type === 'lecturer' ? 'school' : 'person'} 
                size={14} 
                color="#fff" 
              />
            </View>
            <View>
              <Text style={styles.postAuthor}>
                {item.profiles?.name || 'Anonymous'}
              </Text>
              {item.profiles?.department && (
                <Text style={styles.postDepartment}>{item.profiles.department}</Text>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFilterButton = (
    filterType: typeof filter, 
    label: string, 
    icon: keyof typeof MaterialIcons.glyphMap
  ): React.JSX.Element => {
    const isActive = filter === filterType;
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          isActive && styles.activeFilterButton,
        ]}
        onPress={() => setFilter(filterType)}
        activeOpacity={0.7}
      >
        <MaterialIcons 
          name={icon} 
          size={16} 
          color={isActive ? '#fff' : '#666'} 
        />
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.activeFilterButtonText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = (): React.JSX.Element => (
    <View style={styles.headerSection}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      <View style={styles.headerTop}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {profile?.name || 'User'}! 👋
          </Text>
          <Text style={styles.subtitleText}>Stay updated with campus life</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="search" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.createButton]}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {showSearch && (
        <Animated.View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, authors, departments..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );

  const renderCreatePostModal = (): React.JSX.Element => (
    <Modal
      visible={showCreateModal}
      presentationStyle="pageSheet"
      >
      <View style={styles.modalContainer}>
      animationType="slide"
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setShowCreateModal(false)}
            style={[styles.modalCloseButton, { backgroundColor: '#4CAF50' }]}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Post</Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            style={[styles.modalSubmitButton, creatingPost && styles.disabledButton]}
            disabled={creatingPost}
          >
            {creatingPost ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.modalSubmitText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Post Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
              {(['discussion', 'announcement', 'event', 'help'] as PostType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    newPost.type === type && styles.selectedTypeButton,
                  ]}
                  onPress={() => setNewPost(prev => ({ ...prev, type }))}
                >
                  <MaterialIcons
                    name={getPostIcon(type)}
                    size={16}
                    color={newPost.type === type ? '#fff' : getPostColor(type)}
                  />
                  <Text style={[
                    styles.typeButtonText,
                    newPost.type === type && styles.selectedTypeButtonText,
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Enter post title..."
              value={newPost.title}
              onChangeText={(text) => setNewPost(prev => ({ ...prev, title: text }))}
              maxLength={100}
              editable={!creatingPost}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Content</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="Write your post content here..."
              value={newPost.content}
              onChangeText={(text) => setNewPost(prev => ({ ...prev, content: text }))}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={1000}
              editable={!creatingPost}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF5722" />
        <Text style={styles.errorText}>Failed to load posts</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshPosts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {renderFilterButton('all', 'All', 'view-list')}
        {renderFilterButton('announcement', 'Announcements', 'campaign')}
        {renderFilterButton('event', 'Events', 'event')}
        {renderFilterButton('discussion', 'Discussion', 'forum')}
        {renderFilterButton('help', 'Help', 'help')}
      </ScrollView>

      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        style={styles.feedList}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={refreshPosts}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No posts found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try a different search term' : 'Be the first to create a post!'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.createFirstPostButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.createFirstPostText}>Create Post</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {renderCreatePostModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  createButton: {
    backgroundColor: '#FF6B35',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    marginTop: 12,
    marginHorizontal: 8,
    minHeight: 10,
    maxHeight: 40,
  },
  filterContent: {
    paddingHorizontal: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    minWidth: 80,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  activeFilterButton: {
    backgroundColor: '#4CAF50',
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginLeft: 4,
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  feedList: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  postType: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  postContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    marginBottom: 12,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 4,
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
    fontWeight: '500',
  },
  likedText: {
    color: '#FF6B35',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  postAuthor: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  postDepartment: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  createFirstPostButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createFirstPostText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubmitButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typeSelector: {
    maxHeight: 50,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTypeButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedTypeButtonText: {
    color: '#fff',
  },
  titleInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  contentInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    height: 120,
    textAlignVertical: 'top',
  },
});