 // src/services/postsService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];
type PostType = Database['public']['Tables']['posts']['Row']['type'];

export interface PostWithProfile extends Post {
  profiles: {
    id: string;
    name: string;
    user_type: 'student' | 'lecturer';
    department: string | null;
    email: string;
  } | null;
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

export class PostsService {
  /**
   * Fetch all posts with author profiles
   */
  static async getAllPosts(): Promise<{ data: PostWithProfile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            name,
            user_type,
            department,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return { data: null, error };
      }

      // Transform data to include additional fields
      const postsWithExtras = data?.map(post => ({
        ...post,
        likes_count: 0, // TODO: Implement likes functionality
        comments_count: 0, // TODO: Implement comments functionality
        user_has_liked: false, // TODO: Implement user likes tracking
      })) || [];

      return { data: postsWithExtras, error: null };
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch posts by type
   */
  static async getPostsByType(type: PostType): Promise<{ data: PostWithProfile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            name,
            user_type,
            department,
            email
          )
        `)
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts by type:', error);
        return { data: null, error };
      }

      const postsWithExtras = data?.map(post => ({
        ...post,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false,
      })) || [];

      return { data: postsWithExtras, error: null };
    } catch (error) {
      console.error('Error in getPostsByType:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new post
   */
  static async createPost(post: Omit<PostInsert, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: PostWithProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([post])
        .select(`
          *,
          profiles (
            id,
            name,
            user_type,
            department,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Error creating post:', error);
        return { data: null, error };
      }

      const postWithExtras = {
        ...data,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false,
      };

      return { data: postWithExtras, error: null };
    } catch (error) {
      console.error('Error in createPost:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a post (only if user is the author)
   */
  static async updatePost(
    postId: string, 
    updates: PostUpdate, 
    userId: string
  ): Promise<{ data: PostWithProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
        .eq('author_id', userId) // Ensure only author can update
        .select(`
          *,
          profiles (
            id,
            name,
            user_type,
            department,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Error updating post:', error);
        return { data: null, error };
      }

      const postWithExtras = {
        ...data,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false,
      };

      return { data: postWithExtras, error: null };
    } catch (error) {
      console.error('Error in updatePost:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a post (only if user is the author)
   */
  static async deletePost(postId: string, userId: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', userId); // Ensure only author can delete

      if (error) {
        console.error('Error deleting post:', error);
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in deletePost:', error);
      return { success: false, error };
    }
  }

  /**
   * Search posts by title, content, or author
   */
  static async searchPosts(query: string): Promise<{ data: PostWithProfile[] | null; error: any }> {
    try {
      if (!query.trim()) {
        return this.getAllPosts();
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            name,
            user_type,
            department,
            email
          )
        `)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching posts:', error);
        return { data: null, error };
      }

      // Also search by author name (requires additional query due to JOIN limitations)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .ilike('name', `%${query}%`);

      if (profileData && profileData.length > 0) {
        const authorIds = profileData.map(p => p.id);
        const { data: authorPosts } = await supabase
          .from('posts')
          .select(`
            *,
            profiles (
              id,
              name,
              user_type,
              department,
              email
            )
          `)
          .in('author_id', authorIds)
          .order('created_at', { ascending: false });

        // Combine and deduplicate results
        const combinedPosts = [...(data || []), ...(authorPosts || [])];
        const uniquePosts = combinedPosts.filter(
          (post, index, self) => index === self.findIndex(p => p.id === post.id)
        );

        const postsWithExtras = uniquePosts.map(post => ({
          ...post,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false,
        }));

        return { data: postsWithExtras, error: null };
      }

      const postsWithExtras = data?.map(post => ({
        ...post,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false,
      })) || [];

      return { data: postsWithExtras, error: null };
    } catch (error) {
      console.error('Error in searchPosts:', error);
      return { data: null, error };
    }
  }

  /**
   * Get posts by user
   */
  static async getUserPosts(userId: string): Promise<{ data: PostWithProfile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            name,
            user_type,
            department,
            email
          )
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user posts:', error);
        return { data: null, error };
      }

      const postsWithExtras = data?.map(post => ({
        ...post,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false,
      })) || [];

      return { data: postsWithExtras, error: null };
    } catch (error) {
      console.error('Error in getUserPosts:', error);
      return { data: null, error };
    }
  }

  /**
   * Get post statistics
   */
  static async getPostStats(): Promise<{
    data: {
      total_posts: number;
      announcements: number;
      events: number;
      discussions: number;
      help_requests: number;
    } | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('type');

      if (error) {
        console.error('Error fetching post stats:', error);
        return { data: null, error };
      }

      const stats = {
        total_posts: data.length,
        announcements: data.filter(p => p.type === 'announcement').length,
        events: data.filter(p => p.type === 'event').length,
        discussions: data.filter(p => p.type === 'discussion').length,
        help_requests: data.filter(p => p.type === 'help').length,
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error in getPostStats:', error);
      return { data: null, error };
    }
  }

  /**
   * Subscribe to real-time post changes
   */
  static subscribeToPostChanges(callback: (payload: any) => void) {
    return supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        callback
      )
      .subscribe();
  }
}