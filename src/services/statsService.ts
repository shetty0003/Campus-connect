// src/services/statsService.ts - Service for managing user stats
import { supabase } from '../lib/supabase';

export interface UserStats {
  filesDownloaded: number;
  eventsAttended: number;
  monthsActive: number;
}

class StatsService {
  private listeners: Set<(stats: UserStats) => void> = new Set();
  private currentStats: UserStats | null = null;
  private userId: string | null = null;

  // Subscribe to stats changes
  subscribe(callback: (stats: UserStats) => void) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners
  private notify(stats: UserStats) {
    this.currentStats = stats;
    this.listeners.forEach(callback => callback(stats));
  }

  // Get current stats from cache
  getCurrentStats(): UserStats | null {
    return this.currentStats;
  }

  // Load stats from database
  async loadStats(userId: string, profileCreatedAt: string): Promise<UserStats> {
    try {
      this.userId = userId;

      // Calculate months active
      const createdAt = new Date(profileCreatedAt);
      const now = new Date();
      const monthsActive = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));

      // Load stats from database in parallel
      const [downloadsResult, eventsResult] = await Promise.all([
        supabase
          .from('downloads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        supabase
          .from('event_attendances')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ]);

      const stats: UserStats = {
        filesDownloaded: downloadsResult.count || 0,
        eventsAttended: eventsResult.count || 0,
        monthsActive,
      };

      // Notify listeners
      this.notify(stats);
      
      return stats;
    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  }

  // Record a file download and refresh stats
  async recordDownload(userId: string, fileName: string, fileType: string, fileId?: string) {
    try {
      const { error } = await supabase
        .from('downloads')
        .insert({
          user_id: userId,
          file_id: fileId,
          file_name: fileName,
          file_type: fileType
        });

      if (error) throw error;

      // Immediately update the cached stats
      if (this.currentStats) {
        const updatedStats = {
          ...this.currentStats,
          filesDownloaded: this.currentStats.filesDownloaded + 1
        };
        this.notify(updatedStats);
      }

      console.log('Download recorded successfully');
    } catch (error) {
      console.error('Error recording download:', error);
      throw error;
    }
  }

  // Record event attendance and refresh stats
  async recordEventAttendance(userId: string, eventId: string, eventName: string) {
    try {
      const { error } = await supabase
        .from('event_attendances')
        .insert({
          user_id: userId,
          event_id: eventId,
          event_name: eventName
        });

      if (error) throw error;

      // Immediately update the cached stats
      if (this.currentStats) {
        const updatedStats = {
          ...this.currentStats,
          eventsAttended: this.currentStats.eventsAttended + 1
        };
        this.notify(updatedStats);
      }

      console.log('Event attendance recorded successfully');
    } catch (error) {
      console.error('Error recording event attendance:', error);
      throw error;
    }
  }

  // Remove event attendance and refresh stats
  async removeEventAttendance(userId: string, eventId: string) {
    try {
      const { error } = await supabase
        .from('event_attendances')
        .delete()
        .match({ user_id: userId, event_id: eventId });

      if (error) throw error;

      // Immediately update the cached stats
      if (this.currentStats) {
        const updatedStats = {
          ...this.currentStats,
          eventsAttended: Math.max(0, this.currentStats.eventsAttended - 1)
        };
        this.notify(updatedStats);
      }

      console.log('Event attendance removed successfully');
    } catch (error) {
      console.error('Error removing event attendance:', error);
      throw error;
    }
  }

  // Force refresh stats from database
  async refreshStats(): Promise<UserStats | null> {
    if (!this.userId) return null;
    
    try {
      // We need profile creation date, so this should be called with it
      console.log('Manual stats refresh requested');
      return this.currentStats;
    } catch (error) {
      console.error('Error refreshing stats:', error);
      throw error;
    }
  }

  // Clear all data (for logout)
  clear() {
    this.currentStats = null;
    this.userId = null;
    this.listeners.clear();
  }
}

// Export singleton instance
export const statsService = new StatsService();