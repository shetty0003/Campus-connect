// src/hooks/useStats.ts - Hook for managing user stats
import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { statsService, UserStats } from '../services/statsService';

interface UseStatsReturn {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  recordDownload: (fileName: string, fileType: string, fileId?: string) => Promise<void>;
  recordEventAttendance: (eventId: string, eventName: string) => Promise<void>;
  removeEventAttendance: (eventId: string) => Promise<void>;
}

export const useStats = (userId?: string, profileCreatedAt?: string): UseStatsReturn => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stats initially
  const loadStats = useCallback(async () => {
    if (!userId || !profileCreatedAt) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newStats = await statsService.loadStats(userId, profileCreatedAt);
      setStats(newStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      console.error('Stats loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, profileCreatedAt]);

  // Manual refresh function
  const refreshStats = useCallback(async () => {
    if (!userId || !profileCreatedAt) return;
    await loadStats();
  }, [loadStats, userId, profileCreatedAt]);

  // Record download wrapper
  const recordDownload = useCallback(async (fileName: string, fileType: string, fileId?: string) => {
    if (!userId) throw new Error('User ID not available');
    
    try {
      await statsService.recordDownload(userId, fileName, fileType, fileId);
    } catch (error) {
      console.error('Failed to record download:', error);
      throw error;
    }
  }, [userId]);

  // Record event attendance wrapper
  const recordEventAttendance = useCallback(async (eventId: string, eventName: string) => {
    if (!userId) throw new Error('User ID not available');
    
    try {
      await statsService.recordEventAttendance(userId, eventId, eventName);
    } catch (error) {
      console.error('Failed to record event attendance:', error);
      throw error;
    }
  }, [userId]);

  // Remove event attendance wrapper
  const removeEventAttendance = useCallback(async (eventId: string) => {
    if (!userId) throw new Error('User ID not available');
    
    try {
      await statsService.removeEventAttendance(userId, eventId);
    } catch (error) {
      console.error('Failed to remove event attendance:', error);
      throw error;
    }
  }, [userId]);

  // Subscribe to stats changes
  useEffect(() => {
    const unsubscribe = statsService.subscribe((newStats) => {
      setStats(newStats);
    });

    return unsubscribe;
  }, []);

  // Load stats on mount and when dependencies change
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Small delay to avoid too frequent refreshes
        setTimeout(() => {
          refreshStats();
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshStats]);

  // Periodic refresh every 30 seconds when app is active
  useEffect(() => {
    if (!userId || !profileCreatedAt) return;

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshStats();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshStats, userId, profileCreatedAt]);

  return {
    stats,
    loading,
    error,
    refreshStats,
    recordDownload,
    recordEventAttendance,
    removeEventAttendance,
  };
};