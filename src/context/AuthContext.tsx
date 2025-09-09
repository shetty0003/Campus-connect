// src/context/AuthContext.tsx - Enhanced Auth Context with Real-time Updates
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  user_type: 'student' | 'lecturer';
  department?: string;
  year?: string;
  bio?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: () => boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    email: string,
    password: string,
    profileData: {
      name: string;
      user_type: 'student' | 'lecturer';
      department?: string;
      year?: string;
      bio?: string;
      phone?: string;
    }
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileChannel, setProfileChannel] = useState<RealtimeChannel | null>(null);

  // Function to check if user is authenticated
  const isAuthenticated = (): boolean => {
    return !!(user && session);
  };

  const loadUserProfile = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      } else if (data) {
        setProfile(data);
        console.log('Profile loaded:', data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!user?.id) return;
    await loadUserProfile(user.id);
  };

  // Set up real-time subscription for profile changes
  const setupProfileSubscription = (userId: string): void => {
    // Clean up existing subscription
    if (profileChannel) {
      supabase.removeChannel(profileChannel);
    }

    // Create new subscription for this user's profile
    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Profile updated in real-time:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newProfile = payload.new as UserProfile;
            setProfile(newProfile);
          } else if (payload.eventType === 'DELETE') {
            setProfile(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('Profile subscription status:', status);
      });

    setProfileChannel(channel);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Always check for existing session first
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session);
        
        if (session) {
          setSession(session);
          setUser(session.user);
          await loadUserProfile(session.user.id);
          setupProfileSubscription(session.user.id);
          console.log('Auto-login successful');
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
          setupProfileSubscription(session.user.id);
        } else {
          setProfile(null);
          
          // Clean up profile subscription
          if (profileChannel) {
            supabase.removeChannel(profileChannel);
            setProfileChannel(null);
          }
          
          setLoading(false);
        }
      }
    );

    // Handle deep link for email confirmation / magic links
    const handleDeepLink = async (event: Linking.EventType) => {
      const url = event.url;
      console.log('Deep link received:', url);

      // Check if this is an auth callback URL
      if (url.includes('code=')) {
        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('Error exchanging code for session:', error);
            } else if (data?.session) {
              console.log('Session restored from deep link:', data.session);
              setSession(data.session);
              setUser(data.session.user);
              await loadUserProfile(data.session.user.id);
              setupProfileSubscription(data.session.user.id);
            }
          }
        } catch (err) {
          console.error('Error processing deep link:', err);
        }
      }
    };

    const subscriptionLinking = Linking.addEventListener('url', handleDeepLink);

    // If app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url } as Linking.EventType);
    });

    return () => {
      subscription.unsubscribe();
      subscriptionLinking.remove();
      
      // Clean up profile subscription
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Login error:', error);

        if (error.message.includes('Email not confirmed')) {
          return {
            success: false,
            error: 'Please check your email and click the confirmation link before logging in.',
            needsEmailConfirmation: true
          };
        }

        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login failed - no user data returned' };
      }

      return { success: true, message: 'Login successful!' };
    } catch (error) {
      console.error('Login catch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    profileData: {
      name: string;
      user_type: 'student' | 'lecturer';
      department?: string;
      year?: string;
      bio?: string;
      phone?: string;
    }
  ): Promise<AuthResult> => {
    try {
      setLoading(true);

      console.log('Starting registration for:', email);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: profileData.name,
            user_type: profileData.user_type,
            department: profileData.department || null,
            year: profileData.year || null,
            bio: profileData.bio || null,
            phone: profileData.phone || null,
          },
          emailRedirectTo: 'campusconnect://auth/callback'
        }
      });

      console.log('Supabase signup response:', { data, error });

      if (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        console.error('No user in registration response');
        return { success: false, error: 'Registration failed - no user created' };
      }

      console.log('User created successfully:', data.user.id);

      const needsConfirmation = !data.user.email_confirmed_at && !data.session;

      if (needsConfirmation) {
        return {
          success: true,
          needsEmailConfirmation: true,
          message: 'Registration successful! Please check your email and click the confirmation link to activate your account.'
        };
      } else {
        return {
          success: true,
          needsEmailConfirmation: false,
          message: 'Registration successful! You can now log in.'
        };
      }
    } catch (error) {
      console.error('Registration catch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });

      if (error) {
        console.error('Resend confirmation error:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Confirmation email sent! Please check your inbox and spam folder.'
      };
    } catch (error) {
      console.error('Resend confirmation catch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend confirmation email'
      };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      // Clear timestamp and subscription will be handled by auth state change listener
    } catch (error) {
      console.error('Logout catch error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      resendConfirmation,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};