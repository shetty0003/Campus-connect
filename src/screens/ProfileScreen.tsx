// src/screens/ProfileScreen.tsx - Real-time User Profile Screen
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ProfileStats {
  filesDownloaded: number;
  eventsAttended: number;
  monthsActive: number;
}

export default function ProfileScreen(): React.JSX.Element {
  const { user, profile, logout, loading } = useAuth();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<ProfileStats>({
    filesDownloaded: 0,
    eventsAttended: 0,
    monthsActive: 0,
  });
  
  // Real-time subscriptions
  const downloadsChannelRef = useRef<RealtimeChannel | null>(null);
  const eventsChannelRef = useRef<RealtimeChannel | null>(null);
  
  const [editData, setEditData] = useState({
    name: profile?.name || '',
    department: profile?.department || '',
    year: profile?.year || '',
    bio: profile?.bio || '',
    phone: profile?.phone || '',
  });

  // Update editData when profile changes (real-time updates)
  useEffect(() => {
    if (profile) {
      setEditData({
        name: profile.name || '',
        department: profile.department || '',
        year: profile.year || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Load user stats with real database queries
  const loadUserStats = useCallback(async (): Promise<void> => {
    if (!profile?.id) return;

    try {
      setStatsLoading(true);

      // Calculate months active
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      const monthsActive = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));

      // Real database queries
      const [downloadsResult, eventsResult] = await Promise.all([
        // Query downloads table
        supabase
          .from('downloads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id),
        
        // Query event_attendances table  
        supabase
          .from('event_attendances')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
      ]);

      if (downloadsResult.error) {
        console.error('Error loading downloads:', downloadsResult.error);
      }

      if (eventsResult.error) {
        console.error('Error loading events:', eventsResult.error);
      }

      const realStats = {
        filesDownloaded: downloadsResult.count || 0,
        eventsAttended: eventsResult.count || 0,
        monthsActive,
      };

      setStats(realStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
      // Fallback to previous stats or defaults
    } finally {
      setStatsLoading(false);
    }
  }, [profile?.id, profile?.created_at]);

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!profile?.id) return;

    // Cleanup existing subscriptions
    if (downloadsChannelRef.current) {
      supabase.removeChannel(downloadsChannelRef.current);
    }
    if (eventsChannelRef.current) {
      supabase.removeChannel(eventsChannelRef.current);
    }

    // Subscribe to downloads changes
    downloadsChannelRef.current = supabase
      .channel('downloads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'downloads',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Downloads changed:', payload);
          // Update downloads count in real-time
          loadUserStats();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Downloads subscription active');
        }
      });

    // Subscribe to event attendances changes
    eventsChannelRef.current = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendances',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Event attendances changed:', payload);
          // Update events count in real-time
          loadUserStats();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Events subscription active');
        }
      });
  }, [profile?.id, loadUserStats]);

  // Load stats and setup subscriptions
  useEffect(() => {
    loadUserStats();
    setupRealtimeSubscriptions();

    // Cleanup subscriptions on unmount
    return () => {
      if (downloadsChannelRef.current) {
        supabase.removeChannel(downloadsChannelRef.current);
      }
      if (eventsChannelRef.current) {
        supabase.removeChannel(eventsChannelRef.current);
      }
    };
  }, [loadUserStats, setupRealtimeSubscriptions]);

  const handleSave = async (): Promise<void> => {
    if (!profile?.id) {
      Alert.alert('Error', 'Profile not loaded');
      return;
    }

    // Validate required fields
    if (!editData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setUpdateLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: editData.name.trim(),
          department: editData.department.trim() || null,
          year: editData.year.trim() || null,
          bio: editData.bio.trim() || null,
          phone: editData.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
        // The profile will update automatically through the auth context real-time subscription
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadUserStats();
    // Profile data will refresh automatically through auth context
    setRefreshing(false);
  };

  const handleLogout = (): void => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Cleanup subscriptions before logout
              if (downloadsChannelRef.current) {
                supabase.removeChannel(downloadsChannelRef.current);
              }
              if (eventsChannelRef.current) {
                supabase.removeChannel(eventsChannelRef.current);
              }
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        },
      ]
    );
  };

  const renderProfileField = (
    label: string,
    value: string,
    field: keyof typeof editData,
    icon: string,
    multiline: boolean = false
  ): React.JSX.Element => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Icon name={icon} size={20} color="#4CAF50" />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {isEditing ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.multilineInput]}
          value={editData[field]}
          onChangeText={(text) => setEditData({ ...editData, [field]: text })}
          placeholder={`Enter ${label.toLowerCase()}`}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          editable={!updateLoading}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || 'Not provided'}</Text>
      )}
    </View>
  );

  const renderStats = (): React.JSX.Element => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        {statsLoading ? (
          <ActivityIndicator size={20} color="#4CAF50" />
        ) : (
          <Text style={styles.statNumber}>{stats.filesDownloaded}</Text>
        )}
        <Text style={styles.statLabel}>Files Downloaded</Text>
      </View>
      <View style={styles.statItem}>
        {statsLoading ? (
          <ActivityIndicator size={20} color="#4CAF50" />
        ) : (
          <Text style={styles.statNumber}>{stats.eventsAttended}</Text>
        )}
        <Text style={styles.statLabel}>Events Attended</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.monthsActive}</Text>
        <Text style={styles.statLabel}>Months Active</Text>
      </View>
    </View>
  );

  const getAvatarInitials = (): string => {
    if (!profile?.name) return '?';
    return profile.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const formatUserType = (userType: string | undefined): string => {
    if (!userType) return 'User';
    return userType.charAt(0).toUpperCase() + userType.slice(1);
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Text style={styles.avatarText}>IMG</Text>
            ) : (
              <Text style={styles.avatarText}>{getAvatarInitials()}</Text>
            )}
          </View>
          <Text style={styles.userName}>{profile.name}</Text>
          <Text style={styles.userEmail}>{profile.email}</Text>
          <View style={styles.userTypeContainer}>
            <Text style={styles.userType}>
              {formatUserType(profile.user_type)}
            </Text>
          </View>
          <Text style={styles.joinDate}>
            Joined {new Date(profile.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>

        {renderStats()}

        <View style={styles.profileSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <TouchableOpacity
              style={[styles.editButton, updateLoading && styles.disabledButton]}
              onPress={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <ActivityIndicator size={16} color="#4CAF50" />
              ) : (
                <Icon 
                  name={isEditing ? 'save' : 'edit'} 
                  size={20} 
                  color="#4CAF50" 
                />
              )}
              <Text style={styles.editButtonText}>
                {updateLoading ? 'Saving...' : (isEditing ? 'Save' : 'Edit')}
              </Text>
            </TouchableOpacity>
          </View>

          {renderProfileField('Full Name', profile.name || '', 'name', 'person')}
          {renderProfileField('Department', profile.department || '', 'department', 'school')}
          
          {profile.user_type === 'student' && 
            renderProfileField('Year', profile.year || '', 'year', 'class')
          }
          
          {renderProfileField('Phone', profile.phone || '', 'phone', 'phone')}
          {renderProfileField('Bio', profile.bio || '', 'bio', 'info', true)}

          {isEditing && (
            <TouchableOpacity
              style={[styles.cancelButton, updateLoading && styles.disabledButton]}
              onPress={() => {
                setIsEditing(false);
                setEditData({
                  name: profile.name || '',
                  department: profile.department || '',
                  year: profile.year || '',
                  bio: profile.bio || '',
                  phone: profile.phone || '',
                });
              }}
              disabled={updateLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="settings" size={24} color="#666" />
            <Text style={styles.actionText}>Settings</Text>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="notifications" size={24} color="#666" />
            <Text style={styles.actionText}>Notifications</Text>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="help" size={24} color="#666" />
            <Text style={styles.actionText}>Help & Support</Text>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="info" size={24} color="#666" />
            <Text style={styles.actionText}>About Campus Connect</Text>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionItem, styles.logoutItem]} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#F44336" />
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  userTypeContainer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  userType: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    margin: 20,
    paddingVertical: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  editButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#666',
    paddingLeft: 28,
    lineHeight: 22,
  },
  fieldInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 28,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  cancelButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#F44336',
  },
});