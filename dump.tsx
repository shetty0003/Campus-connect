import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const filters = ['All', 'Events', 'Announcements', 'Discussions', 'Lost & Found'];

const posts = [
  {
    id: '1',
    type: 'Event',
    title: 'Tech Fest 2025',
    content: 'Join us for the biggest tech festival on campus!',
    author: 'Computer Science Dept.',
    department: 'CSC',
    likes: 24,
    comments: 5,
    time: '2h ago',
  },
  {
    id: '2',
    type: 'Announcement',
    title: 'Exam Timetable Released',
    content: 'Check your student portal for the latest exam timetable.',
    author: 'Exams Office',
    department: 'Admin',
    likes: 10,
    comments: 2,
    time: '5h ago',
  },
  {
    id: '3',
    type: 'Discussion',
    title: 'Best Study Spots on Campus?',
    content: 'Where do you prefer to study? Share your favorite spots!',
    author: 'Student Council',
    department: 'General',
    likes: 5,
    comments: 1,
    time: '1d ago',
  }
];

export default function FeedScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Animate header + filter fade out
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  const filterOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const filterTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesFilter = activeFilter === 'All' || post.type === activeFilter;
      const matchesSearch =
        searchText.trim() === '' ||
        post.title.toLowerCase().includes(searchText.toLowerCase()) ||
        post.content.toLowerCase().includes(searchText.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchText]);

  const renderFilterButton = (filter: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        activeFilter === filter && styles.activeFilterButton,
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          activeFilter === filter && styles.activeFilterText,
        ]}
      >
        {filter}
      </Text>
    </TouchableOpacity>
  );

  const renderPost = (post: any) => (
    <View key={post.id} style={styles.postCard}>
      <View style={styles.postHeader}>
        <Text style={styles.postType}>{post.type}</Text>
        <Text style={styles.timestamp}>{post.time}</Text>
      </View>

      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postContent}>{post.content}</Text>

      <View style={styles.postStats}>
        <TouchableOpacity
          style={styles.statButton}
          onPress={() => toggleLike(post.id)}
        >
          <Ionicons
            name={likedPosts[post.id] ? 'heart' : 'heart-outline'}
            size={18}
            color={likedPosts[post.id] ? '#FF6B35' : '#999'}
          />
          <Text
            style={[
              styles.statText,
              likedPosts[post.id] && styles.likedText,
            ]}
          >
            {post.likes + (likedPosts[post.id] ? 1 : 0)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statButton}>
          <Ionicons name="chatbubble-outline" size={18} color="#999" />
          <Text style={styles.statText}>{post.comments}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.postFooter}>
        <View style={styles.authorSection}>
          <View style={styles.authorAvatar}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
              {post.department}
            </Text>
          </View>
          <Text style={styles.postAuthor}>{post.author}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <Text style={styles.feedTitle}>Campus Feed</Text>
          <Text style={styles.feedSubtitle}>
            Stay updated with events and discussions
          </Text>
        </Animated.View>

        {/* Search Button / Input */}
        <View style={styles.searchWrapper}>
          {!showSearch ? (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={18} color="#666" />
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={18} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearchText(''); }}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filters */}
        <Animated.View
          style={[
            styles.filterSection,
            {
              opacity: filterOpacity,
              transform: [{ translateY: filterTranslateY }],
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map(renderFilterButton)}
          </ScrollView>
        </Animated.View>

        {/* Posts */}
        {filteredPosts.length > 0 ? (
          filteredPosts.map(renderPost)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No posts found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your filters or search
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 80 },

  headerSection: { marginBottom: 20 },
  feedTitle: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  feedSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },

  searchWrapper: { marginBottom: 12 },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  searchButtonText: { marginLeft: 8, fontSize: 14, color: '#666' },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, padding: 8, fontSize: 14 },

  filterSection: { marginBottom: 20 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  activeFilterButton: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterText: { fontSize: 13, color: '#666' },
  activeFilterText: { color: '#fff', fontWeight: '600' },

  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postType: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  timestamp: { fontSize: 11, color: '#999' },
  postTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6, color: '#333' },
  postContent: { fontSize: 14, color: '#555', marginBottom: 12, lineHeight: 20 },
  postStats: { flexDirection: 'row', marginTop: 4, marginBottom: 12 },
  statButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  statText: { marginLeft: 4, fontSize: 12, color: '#999' },
  likedText: { color: '#FF6B35', fontWeight: '600' },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  authorSection: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  postAuthor: { fontSize: 12, fontWeight: '600', color: '#333' },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyStateText: { fontSize: 16, color: '#666', marginTop: 16, fontWeight: '600' },
  emptyStateSubtext: { fontSize: 14, color: '#999', marginTop: 8 },
});
