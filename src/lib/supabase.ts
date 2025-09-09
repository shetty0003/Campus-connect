// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fnmzojmkqwaotrkpnurg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubXpvam1rcXdhb3Rya3BudXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjA4NTYsImV4cCI6MjA3MjgzNjg1Nn0.2L34pnEJNDxa-TvoXsaRFrksfebem1YPfbXeoJmFjFM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          user_type: 'student' | 'lecturer'
          department: string | null
          year: string | null
          bio: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          user_type: 'student' | 'lecturer'
          department?: string | null
          year?: string | null
          bio?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          user_type?: 'student' | 'lecturer'
          department?: string | null
          year?: string | null
          bio?: string | null
          phone?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          title: string
          content: string
          type: 'announcement' | 'event' | 'discussion' | 'help'
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type: 'announcement' | 'event' | 'discussion' | 'help'
          author_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: 'announcement' | 'event' | 'discussion' | 'help'
          author_id?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          name: string
          url: string
          type: string
          size: number
          category: string
          uploader_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          type: string
          size: number
          category: string
          uploader_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          type?: string
          size?: number
          category?: string
          uploader_id?: string
        }
      }
    }
  }
}