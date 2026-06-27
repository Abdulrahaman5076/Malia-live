export type UserRole = 'viewer' | 'creator' | 'moderator' | 'admin' | 'super_admin' | 'support';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  verified: boolean;
  subscribersCount: number;
  followingChannels: string[]; // List of channelIds
  likedVideos: string[]; // List of videoIds
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface Channel {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  subscribers: number;
  verified: boolean;
  socialLinks: {
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  status: 'active' | 'suspended' | 'pending_approval';
}

export interface Video {
  id: string;
  channelId: string;
  channelName: string;
  channelLogo: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  dislikes: number;
  uploadDate: string;
  duration: string; // e.g., "12:34" or "0:15" (for Shorts)
  category: string;
  tags: string[];
  isShort: boolean;
  isPublished: boolean;
  commentsCount: number;
  chapters?: { title: string; time: number }[];
}

export interface Livestream {
  id: string;
  channelId: string;
  channelName: string;
  channelLogo: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  streamUrl: string;
  viewersCount: number;
  isLive: boolean;
  startTime: string;
  chatSettings: {
    subscriberOnly: boolean;
    slowModeDelay: number; // in seconds
  };
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  replies?: Comment[];
}

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  role?: UserRole | 'system';
  isAIGenerated?: boolean;
  classification?: 'clean' | 'spam' | 'toxic' | 'flagged';
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical';
}

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
  tags: string[];
}

export interface PlatformSettings {
  globalChatSlowMode: number;
  maxVideoDuration: number;
  cdnCacheTtl: number;
  safetyThreshold: 'low' | 'medium' | 'high';
  rateLimiterEnabled: boolean;
  jwtExpiration: number;
}

export interface ClusterMetrics {
  cpuUsage: number[];
  memoryUsage: number[];
  activeConnections: number;
  activeEncoders: number;
  ingressBandwidth: number;
  egressBandwidth: number;
}

