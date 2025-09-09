// src/hooks/usePosts.ts
import { useState, useEffect, useCallback } from 'react';
import { PostsService, PostWithProfile } from '../services/postsService';
import type { Database } from '../lib/supabase';

type PostType = Database['public']['Tables']['posts']['Row']['type'];

interface UsePostsReturn {
  posts: PostWithProfile[];
  loading: boolean;
  error: string | null;
  refreshPosts: () => Promise<void>;
  createPost: (postData: {
    title: string;
    content: string;
    type: PostType;
    author_id: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updatePost: (
    postId: string,
    updates: { title?: string; content?: string; type?: PostType },
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  deletePost: (postId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  searchPosts: (query: string) => Promise<void>;
  filterPostsByType: (type: PostType | 'all') => PostWithProfile[];
}

export const usePosts = (initialType: PostType | 'all' = 'all'): UsePostsReturn => {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async (type: PostType | 'all' = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const result = type === 'all' 
        ? await PostsService.getAllPosts()
        : await PostsService.getPostsByType(type);

      if (result.error) {
        setError('Failed to load posts');
        console.error('Error loading posts:', result.error);
        return;
      }

      setPosts(result.data || []);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error in loadPosts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPosts = useCallback(async () => {
    await loadPosts(initialType);
  }, [loadPosts, initialType]);

  const createPost = useCallback(async (postData: {
    title: string;
    content: string;
    type: PostType;
    author_id: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await PostsService.createPost(postData);

      if (result.error) {
        return { success: false, error: 'Failed to create post' };
      }

      if (result.data) {
        // Add the new post to the beginning of the list
        setPosts(prev => [result.data!, ...prev]);
      }

      return { success: true };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const updatePost = useCallback(async (
    postId: string,
    updates: { title?: string; content?: string; type?: PostType },
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await PostsService.updatePost(postId, updates, userId);

      if (result.error) {
        return { success: false, error: 'Failed to update post' };
      }

      if (result.data) {
        // Update the post in the list
        setPosts(prev => 
          prev.map(post => 
            post.id === postId ? result.data! : post
          )
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating post:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const deletePost = useCallback(async (
    postId: string, 
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await PostsService.deletePost(postId, userId);

      if (!result.success) {
        return { success: false, error: 'Failed to delete post' };
      }

      // Remove the post from the list
      setPosts(prev => prev.filter(post => post.id !== postId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const searchPosts = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await PostsService.searchPosts(query);

      if (result.error) {
        setError('Failed to search posts');
        console.error('Error searching posts:', result.error);
        return;
      }

      setPosts(result.data || []);
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Error in searchPosts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterPostsByType = useCallback((type: PostType | 'all'): PostWithProfile[] => {
    return type === 'all' ? posts : posts.filter(post => post.type === type);
  }, [posts]);

  // Load posts on mount
  useEffect(() => {
    loadPosts(initialType);
  }, [loadPosts, initialType]);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = PostsService.subscribeToPostChanges((payload) => {
      console.log('Real-time post change:', payload);

      switch (payload.eventType) {
        case 'INSERT':
          // Refresh posts to get the complete data with profile
          refreshPosts();
          break;
        case 'UPDATE':
          // Update the specific post
          setPosts(prev =>
            prev.map(post =>
              post.id === payload.new.id
                ? { ...post, ...payload.new }
                : post
            )
          );
          break;
        case 'DELETE':
          // Remove the deleted post
          setPosts(prev => prev.filter(post => post.id !== payload.old.id));
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshPosts]);

  return {
    posts,
    loading,
    error,
    refreshPosts,
    createPost,
    updatePost,
    deletePost,
    searchPosts,
    filterPostsByType,
  };
};