

// types/supabase.ts

// src/types/index.ts - Type definitions
export interface User {
  id: string;
  email: string;
  userType: 'student' | 'lecturer';
  name: string;
  department?: string;
  year?: string | null;
  bio?: string;
  phone?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}
// src/types/index.ts
export interface FeedPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorType: 'admin' | 'lecturer' | 'student';
  timestamp: string;
  type: 'announcement' | 'event' | 'news' | 'discussion' | 'help';
  department?: string;
  priority?: 'high' | 'medium' | 'low';
  likes?: number;
  comments?: number;
  isLiked?: boolean;
  eventDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  userType: 'student' | 'lecturer';
  department?: string;
  year?: string | null;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface FileItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  category: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
}
export interface LibraryFile {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  uploader: string;
  category: string;
  downloadUrl: string;
}

export interface MapLocation {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  type: 'building' | 'facility';
  isOpen: boolean;
  lastUpdated: string;
}

export interface RegisterData {
  name: string;
  department: string;
  year?: string;
  bio?: string;
  phone?: string;
}
