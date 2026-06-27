import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import pg from "pg";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

const { Pool } = pg;

dotenv.config();

// ==========================================
// WEBSOCKET CHAT ROOMS CONFIGURATION
// ==========================================
const rooms = new Map<string, Set<WebSocket>>();
const wss = new WebSocketServer({ noServer: true });

function broadcastToRoom(streamId: string, payload: any) {
  const clients = rooms.get(streamId);
  if (clients) {
    const serialized = JSON.stringify(payload);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serialized);
        } catch (err) {
          console.error("Error sending WebSocket message to client:", err);
        }
      }
    }
  }
}

// ==========================================
// POSTGRESQL DATABASE CONFIGURATION
// ==========================================
const dbUrl = process.env.DATABASE_URL;
let pool: any = null;
let useDb = false;

if (dbUrl) {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    pool.on('error', (err: any) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
    console.log("PostgreSQL Pool initialized.");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL Pool:", err);
  }
} else {
  console.log("No DATABASE_URL found. Falling back to in-memory state.");
}

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;


app.use(express.json());

// ==========================================
// IN-MEMORY DATABASE & STATE MANAGEMENT
// ==========================================

// Initial Current Session User
let currentUser = {
  id: "user_viewer",
  username: "malia_fan",
  email: "viewer@malia.live",
  displayName: "Abdul R.",
  avatarUrl: "https://picsum.photos/seed/user_viewer/100/100",
  role: "viewer" as "viewer" | "creator" | "admin" | "super_admin",
  verified: false,
  subscribersCount: 0,
  followingChannels: ["channel_tech", "channel_music"],
  likedVideos: ["video_1", "video_3"],
  notificationsEnabled: true,
  createdAt: "2026-01-10T12:00:00Z"
};

// Available Users (To allow role-switching for demo / moderation validation)
const DEMO_USERS = {
  viewer: {
    id: "user_viewer",
    username: "abdul_viewer",
    email: "viewer@malia.live",
    displayName: "Abdul R. (Viewer)",
    avatarUrl: "https://picsum.photos/seed/user_viewer/100/100",
    role: "viewer" as const,
    verified: false,
    subscribersCount: 0,
    followingChannels: ["channel_tech", "channel_music"],
    likedVideos: ["video_1", "video_3"],
    notificationsEnabled: true,
    createdAt: "2026-01-10T12:00:00Z"
  },
  creator: {
    id: "user_creator",
    username: "bytecraft_dev",
    email: "creator@malia.live",
    displayName: "Elena Vance (Creator)",
    avatarUrl: "https://picsum.photos/seed/user_creator/100/100",
    role: "creator" as const,
    verified: true,
    subscribersCount: 14205,
    followingChannels: ["channel_music"],
    likedVideos: ["video_2"],
    notificationsEnabled: true,
    createdAt: "2025-08-15T14:30:00Z"
  },
  admin: {
    id: "user_admin",
    username: "malia_admin_prime",
    email: "admin@malia.live",
    displayName: "Chief Moderator Sarah",
    avatarUrl: "https://picsum.photos/seed/user_admin/100/100",
    role: "admin" as const,
    verified: true,
    subscribersCount: 0,
    followingChannels: [],
    likedVideos: [],
    notificationsEnabled: true,
    createdAt: "2025-01-01T09:00:00Z"
  },
  super_admin: {
    id: "user_super_admin",
    username: "malia_ceo",
    email: "ceo@malia.live",
    displayName: "Super Admin Abdul (CEO)",
    avatarUrl: "https://picsum.photos/seed/user_super/100/100",
    role: "super_admin" as const,
    verified: true,
    subscribersCount: 0,
    followingChannels: [],
    likedVideos: [],
    notificationsEnabled: true,
    createdAt: "2024-01-01T00:00:00Z"
  }
};

// Global Platform Settings
let PLATFORM_SETTINGS = {
  globalChatSlowMode: 2,
  maxVideoDuration: 60, // in minutes
  cdnCacheTtl: 3600, // in seconds
  safetyThreshold: "high" as "low" | "medium" | "high",
  rateLimiterEnabled: true,
  jwtExpiration: 24 // in hours
};

// Global Demo Accounts List for Administration
let DEMO_ACCOUNTS = [
  { id: "acc_1", username: "abdul_viewer", displayName: "Abdul R.", email: "viewer@malia.live", role: "viewer", status: "active", createdAt: "2026-01-10T12:00:00Z" },
  { id: "acc_2", username: "bytecraft_dev", displayName: "Elena Vance", email: "creator@malia.live", role: "creator", status: "active", createdAt: "2025-08-15T14:30:00Z" },
  { id: "acc_3", username: "malia_admin_prime", displayName: "Chief Moderator Sarah", email: "admin@malia.live", role: "admin", status: "active", createdAt: "2025-01-01T09:00:00Z" },
  { id: "acc_4", username: "astro_tom", displayName: "AstroTom", email: "tom@astro.tv", role: "viewer", status: "active", createdAt: "2026-06-26T15:00:00Z" },
  { id: "acc_5", username: "toxic_retro", displayName: "RetroTroll", email: "troll@anonymous.net", role: "viewer", status: "suspended", createdAt: "2026-06-25T11:00:00Z" }
];

// Categories
const CATEGORIES = [
  { id: "gaming", name: "Gaming", icon: "Gamepad2", description: "Esports, speedruns, and game dev livestreams.", tags: ["Speedrun", "RPG", "Retro", "Minecraft", "Indie"] },
  { id: "tech", name: "Tech & AI", icon: "Cpu", description: "Programming, gadget reviews, and AI development.", tags: ["React", "AI", "Python", "Gadgets", "NextJS"] },
  { id: "music", name: "Music & Chill", icon: "Music", description: "Chill beats, lofi, live synthesizers, and acoustic covers.", tags: ["Lofi", "Acoustic", "Synth", "Jazz", "Electronic"] },
  { id: "cooking", name: "Cooking & Food", icon: "Utensils", description: "Baking, culinary guides, street food, and recipes.", tags: ["Baking", "Recipes", "Dinner", "Italian", "Desserts"] },
  { id: "documentary", name: "Science & Travel", icon: "Compass", description: "Vlogs, geography, astronomy, and deep dives.", tags: ["Vlog", "Space", "History", "Nature", "Earth"] },
  { id: "creative", name: "Creative Arts", icon: "Palette", description: "Digital painting, clay sculpturing, and design logs.", tags: ["Art", "Illustration", "Design", "Blender", "3D"] }
];

// Seed Channels
let CHANNELS = [
  {
    id: "channel_tech",
    ownerId: "user_creator",
    name: "ByteCraft Studio",
    description: "Welcome to ByteCraft! We dive deep into software engineering, custom electronic synthesizers, AI models, and live framework builds. New videos every Tuesday!",
    logoUrl: "https://picsum.photos/seed/channel_tech/150/150",
    bannerUrl: "https://picsum.photos/seed/banner_tech/1200/400",
    subscribers: 14205,
    verified: true,
    socialLinks: { twitter: "@bytecraft_dev", website: "https://bytecraft.dev" },
    status: "active" as const
  },
  {
    id: "channel_music",
    ownerId: "user_music_owner",
    name: "LoFi Orbit",
    description: "Your 24/7 space for relaxing beats, study accompaniment, and ambient spatial soundscapes.",
    logoUrl: "https://picsum.photos/seed/channel_music/150/150",
    bannerUrl: "https://picsum.photos/seed/banner_music/1200/400",
    subscribers: 89431,
    verified: true,
    socialLinks: { twitter: "@lofi_orbit" },
    status: "active" as const
  },
  {
    id: "channel_cooking",
    ownerId: "user_chef_owner",
    name: "Chef Malia",
    description: "Fresh, healthy, and easy-to-follow cooking masterclasses from absolute scratch.",
    logoUrl: "https://picsum.photos/seed/channel_cooking/150/150",
    bannerUrl: "https://picsum.photos/seed/banner_cooking/1200/400",
    subscribers: 5612,
    verified: false,
    socialLinks: { website: "https://chefmalia.com" },
    status: "active" as const
  },
  {
    id: "channel_gaming",
    ownerId: "user_gaming_owner",
    name: "Cosmic Speedruns",
    description: "Pushing retro and modern video games to their absolute computational limits.",
    logoUrl: "https://picsum.photos/seed/channel_gaming/150/150",
    bannerUrl: "https://picsum.photos/seed/banner_gaming/1200/400",
    subscribers: 28140,
    verified: true,
    socialLinks: { twitter: "@cosmic_run" },
    status: "active" as const
  }
];

// Seed Videos
let VIDEOS = [
  {
    id: "video_1",
    channelId: "channel_tech",
    channelName: "ByteCraft Studio",
    channelLogo: "https://picsum.photos/seed/channel_tech/150/150",
    title: "How I Built a Real-Time Audio Synthesizer in React 19",
    description: "Today, we're taking a deep look at the Web Audio API combined with React 19's new features. We will wire up oscillators, filters, and dynamic canvas visuals to build a high-performance browser synth. \n\nCheck out the chapters for specific parts, and make sure to subscribe!",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://picsum.photos/seed/synth_video/640/360",
    views: 12405,
    likes: 852,
    dislikes: 12,
    uploadDate: "2026-06-15T10:00:00Z",
    duration: "10:53",
    category: "tech",
    tags: ["React", "Audio", "Web Dev", "TypeScript"],
    isShort: false,
    isPublished: true,
    commentsCount: 3,
    chapters: [
      { title: "Introduction & Sound Principles", time: 0 },
      { title: "Wiring Up Web Audio Oscillators", time: 120 },
      { title: "React State vs Ref bindings", time: 340 },
      { title: "Building the Keyboard UI", time: 510 },
      { title: "Final Synth Demo & Jam", time: 610 }
    ]
  },
  {
    id: "video_2",
    channelId: "channel_music",
    channelName: "LoFi Orbit",
    channelLogo: "https://picsum.photos/seed/channel_music/150/150",
    title: "Cosmic Rain ⛈️ Relaxing Lo-Fi Beats to Code/Study",
    description: "Soothing beats overlaid with real binaural rain sound effects recorded in Osaka, Japan. Perfect for programming, drafting, studying, or late night relaxing.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://picsum.photos/seed/lofi_video/640/360",
    views: 48911,
    likes: 3421,
    dislikes: 4,
    uploadDate: "2026-05-01T22:00:00Z",
    duration: "14:12",
    category: "music",
    tags: ["Lofi", "Study", "Coding", "Chill"],
    isShort: false,
    isPublished: true,
    commentsCount: 2,
    chapters: [
      { title: "Midnight Rain", time: 0 },
      { title: "Orbiting Dusk", time: 240 },
      { title: "Neon Stardust", time: 580 },
      { title: "Deeper Echoes", time: 780 }
    ]
  },
  {
    id: "video_3",
    channelId: "channel_cooking",
    channelName: "Chef Malia",
    channelLogo: "https://picsum.photos/seed/channel_cooking/150/150",
    title: "Handmade Sourdough Pasta from Scratch - Masterclass",
    description: "Learn how to transform your sourdough discard into the silkies, most flavorful handmade fettuccine. I'll take you through hydration percentages, dough stretching, and a simple garlic tomato emulsion.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl: "https://picsum.photos/seed/pasta_video/640/360",
    views: 3104,
    likes: 412,
    dislikes: 2,
    uploadDate: "2026-06-20T08:00:00Z",
    duration: "12:14",
    category: "cooking",
    tags: ["Baking", "Recipes", "Sourdough", "Italian"],
    isShort: false,
    isPublished: true,
    commentsCount: 2
  },
  {
    id: "video_4",
    channelId: "channel_gaming",
    channelName: "Cosmic Speedruns",
    channelLogo: "https://picsum.photos/seed/channel_gaming/150/150",
    title: "How I Broke the World Record in Retro Space Explorer v3",
    description: "After 4,000 attempts, the frame-perfect glitch was achieved. In this video, I break down the route, the collision box mechanics, and the precise controller inputs needed to save 12 seconds in Sector 7.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://picsum.photos/seed/gaming_video/640/360",
    views: 18241,
    likes: 1941,
    dislikes: 15,
    uploadDate: "2026-06-18T16:00:00Z",
    duration: "08:45",
    category: "gaming",
    tags: ["Speedrun", "Retro", "Space", "World Record"],
    isShort: false,
    isPublished: true,
    commentsCount: 1
  },
  {
    id: "video_5",
    channelId: "channel_tech",
    channelName: "ByteCraft Studio",
    channelLogo: "https://picsum.photos/seed/channel_tech/150/150",
    title: "Exploring Wild Coastal Redwood Ecosystems",
    description: "A short documentary exploration of California's tallest coastal sequoias and the micro-environments that thrive in their canopy fog.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnailUrl: "https://picsum.photos/seed/travel_video/640/360",
    views: 5214,
    likes: 489,
    dislikes: 1,
    uploadDate: "2026-06-10T14:00:00Z",
    duration: "06:12",
    category: "documentary",
    tags: ["Nature", "Redwoods", "Vlog", "Documentary"],
    isShort: false,
    isPublished: true,
    commentsCount: 1
  },
  // SHORTS (Vertical Video simulation)
  {
    id: "short_1",
    channelId: "channel_tech",
    channelName: "ByteCraft Studio",
    channelLogo: "https://picsum.photos/seed/channel_tech/150/150",
    title: "This AI Coding Trick saves 3 hours a day! 🤯",
    description: "Quick trick to automate repetitive boilerplates using advanced system prompt injections. Make sure to try it!",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnailUrl: "https://picsum.photos/seed/short1/400/700",
    views: 142100,
    likes: 9140,
    dislikes: 10,
    uploadDate: "2026-06-25T11:00:00Z",
    duration: "0:45",
    category: "tech",
    tags: ["Coding", "Shorts", "AI", "Automate"],
    isShort: true,
    isPublished: true,
    commentsCount: 0
  },
  {
    id: "short_2",
    channelId: "channel_cooking",
    channelName: "Chef Malia",
    channelLogo: "https://picsum.photos/seed/channel_cooking/150/150",
    title: "The Golden Ratio Sourdough Hack! 🥖",
    description: "Why you should always use 78% hydration for a perfectly airy, crisp sourdough crust.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://picsum.photos/seed/short2/400/700",
    views: 84310,
    likes: 5412,
    dislikes: 11,
    uploadDate: "2026-06-24T15:30:00Z",
    duration: "0:52",
    category: "cooking",
    tags: ["Baking", "Shorts", "Sourdough", "Hack"],
    isShort: true,
    isPublished: true,
    commentsCount: 0
  },
  {
    id: "short_3",
    channelId: "channel_music",
    channelName: "LoFi Orbit",
    channelLogo: "https://picsum.photos/seed/channel_music/150/150",
    title: "Satisfying Synth Visuals on Oscilloscope 🌌",
    description: "Watch a simple sine wave shape an entire 3D nebula on a custom cathode tube vector screen.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://picsum.photos/seed/short3/400/700",
    views: 201402,
    likes: 18420,
    dislikes: 15,
    uploadDate: "2026-06-23T18:00:00Z",
    duration: "0:30",
    category: "music",
    tags: ["Synth", "Shorts", "Satisfying", "Audio"],
    isShort: true,
    isPublished: true,
    commentsCount: 0
  }
];

// Seed Comments
let COMMENTS = [
  {
    id: "comment_1",
    videoId: "video_1",
    userId: "user_viewer",
    username: "abdul_viewer",
    userAvatar: "https://picsum.photos/seed/user_viewer/100/100",
    content: "Absolutely phenomenal tutorial! The Web Audio oscillator mapping is incredibly fast in React 19. Can you make a follow-up on custom reverb nodes?",
    timestamp: "2026-06-26T12:00:00Z",
    likes: 34,
    replies: [
      {
        id: "reply_1",
        videoId: "video_1",
        userId: "user_creator",
        username: "bytecraft_dev",
        userAvatar: "https://picsum.photos/seed/user_creator/100/100",
        content: "Yes, definitely! Custom ConvolverNodes for custom impulse response reverbs is high on my recording list. Stay tuned!",
        timestamp: "2026-06-26T14:30:00Z",
        likes: 12
      }
    ]
  },
  {
    id: "comment_2",
    videoId: "video_1",
    userId: "user_chef_owner",
    username: "chef_malia",
    userAvatar: "https://picsum.photos/seed/channel_cooking/150/150",
    content: "I didn't think I would understand digital signal synthesis, but your visual analogies made it so simple! Outstanding production.",
    timestamp: "2026-06-16T18:20:00Z",
    likes: 8
  },
  {
    id: "comment_3",
    videoId: "video_2",
    userId: "user_viewer",
    username: "abdul_viewer",
    userAvatar: "https://picsum.photos/seed/user_viewer/100/100",
    content: "Been writing react hooks with this on loop for the last 5 hours. Highly recommend the rain noise!",
    timestamp: "2026-06-25T19:30:00Z",
    likes: 52
  },
  {
    id: "comment_4",
    videoId: "video_3",
    userId: "user_creator",
    username: "bytecraft_dev",
    userAvatar: "https://picsum.photos/seed/user_creator/100/100",
    content: "That tomato emulsion trick is gorgeous. Tried this tonight and the texture was restaurant-grade!",
    timestamp: "2026-06-21T21:00:00Z",
    likes: 15
  }
];

// Seed Active Livestreams
let LIVESTREAMS = [
  {
    id: "live_1",
    channelId: "channel_gaming",
    channelName: "Cosmic Speedruns",
    channelLogo: "https://picsum.photos/seed/channel_gaming/150/150",
    title: "🌌 Retro Space Explorer v3 Speedrun [100% GLITCHLESS] - Grind to Sub-18m!",
    description: "Grinding attempts tonight. Focusing on the frame-perfect jump in Sector 3 and trying not to lose my run in the gravitational field phase. Let's see if we can set a personal best! Subscriber-only chat is enabled to filter out trolls.",
    category: "gaming",
    tags: ["Speedrun", "Space", "Retro", "Hardcore"],
    thumbnailUrl: "https://picsum.photos/seed/live_gaming/640/360",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    viewersCount: 1420,
    isLive: true,
    startTime: "2026-06-26T18:00:00Z",
    chatSettings: { subscriberOnly: true, slowModeDelay: 2 }
  },
  {
    id: "live_2",
    channelId: "channel_tech",
    channelName: "ByteCraft Studio",
    channelLogo: "https://picsum.photos/seed/channel_tech/150/150",
    title: "💻 Building Malia Live Stream: Writing the Live Chat Logic with AI Filters",
    description: "Coding session live! Today we are structuring our Node.js backends and integrating the Google Gemini API to scan chats for toxicity and feed summaries into our Stream Assistant panel. Grab some coffee and build with us.",
    category: "tech",
    tags: ["React", "Express", "AI", "LiveCoding"],
    thumbnailUrl: "https://picsum.photos/seed/live_tech/640/360",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    viewersCount: 384,
    isLive: true,
    startTime: "2026-06-26T19:15:00Z",
    chatSettings: { subscriberOnly: false, slowModeDelay: 0 }
  },
  {
    id: "live_3",
    channelId: "channel_music",
    channelName: "LoFi Orbit",
    channelLogo: "https://picsum.photos/seed/channel_music/150/150",
    title: "🌌 Late Night Space Lofi Ambient Beats - 24/ study / chillout / dream",
    description: "Live spatial modular synthesizer session broadcasted straight from our orbit studio. Kick back, load up your terminal, and drift into focus. Visual animations generated live in sync with audio frequencies.",
    category: "music",
    tags: ["Lofi", "Synthesizer", "Ambient", "Coding"],
    thumbnailUrl: "https://picsum.photos/seed/live_music/640/360",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    viewersCount: 3410,
    isLive: true,
    startTime: "2026-06-26T00:00:00Z",
    chatSettings: { subscriberOnly: false, slowModeDelay: 0 }
  }
];

// Active Chat Messages for streams
let CHAT_MESSAGES: any[] = [
  // live_1 cosmic speedruns chat seed
  { id: "msg_1_1", streamId: "live_1", userId: "user_viewer", username: "abdul_viewer", userAvatar: "https://picsum.photos/seed/user_viewer/100/100", content: "That sector 2 elevator skip was so incredibly clean!", timestamp: "2026-06-26T20:00:00Z", role: "viewer", classification: "clean" },
  { id: "msg_1_2", streamId: "live_1", userId: "user_random1", username: "space_gurl", userAvatar: "https://picsum.photos/seed/rand1/100/100", content: "Will you try the frame perfect booster glitch in sector 4?", timestamp: "2026-06-26T20:01:00Z", role: "viewer", classification: "clean" },
  { id: "msg_1_3", streamId: "live_1", userId: "user_moderator1", username: "gaming_mod_prime", userAvatar: "https://picsum.photos/seed/mod/100/100", content: "Remember to respect the chat rules! No spamming and keep it helpful.", timestamp: "2026-06-26T20:01:15Z", role: "moderator", classification: "clean" },
  { id: "msg_1_4", streamId: "live_1", userId: "user_troll1", username: "toxic_retro", userAvatar: "https://picsum.photos/seed/troll/100/100", content: "You play so slow, this speedrun is honestly terrible", timestamp: "2026-06-26T20:02:10Z", role: "viewer", classification: "toxic" },

  // live_2 tech building malia chat seed
  { id: "msg_2_1", streamId: "live_2", userId: "user_viewer", username: "abdul_viewer", userAvatar: "https://picsum.photos/seed/user_viewer/100/100", content: "Are you using TSX directly for node ESM paths?", timestamp: "2026-06-26T20:10:00Z", role: "viewer", classification: "clean" },
  { id: "msg_2_2", streamId: "live_2", userId: "user_dev2", username: "gopher_code", userAvatar: "https://picsum.photos/seed/dev2/100/100", content: "Yes! TSX is a absolute life saver compared to old ts-node setups.", timestamp: "2026-06-26T20:11:00Z", role: "viewer", classification: "clean" },
  { id: "msg_2_3", streamId: "live_2", userId: "user_dev3", username: "react_chef", userAvatar: "https://picsum.photos/seed/dev3/100/100", content: "How does the automated moderation work? Does it evaluate asynchronous batches or individual messages?", timestamp: "2026-06-26T20:12:00Z", role: "viewer", classification: "clean" }
];

// Audit logs
let AUDIT_LOGS: any[] = [
  { id: "log_1", userId: "user_admin", username: "Sarah Admin", action: "PLATFORM_INIT", details: "Malia Live high-security environment successfully booted. Port 3000 mapping configured.", timestamp: "2026-06-26T18:00:00Z", type: "info" },
  { id: "log_2", userId: "user_admin", username: "Sarah Admin", action: "USER_ROLE_CHANGE", details: "User viewer switched session token roles for system validation testing.", timestamp: "2026-06-26T19:25:00Z", type: "info" }
];

// Channels awaiting approval
let CREATOR_APPLICATIONS = [
  {
    id: "app_1",
    channelName: "AstroVlogs",
    ownerId: "user_astro_applicant",
    ownerUsername: "astro_tom",
    description: "Looking to stream astronomy workshops, live telescope tracking, and telescope rig configurations.",
    logoUrl: "https://picsum.photos/seed/astro/100/100",
    submissionDate: "2026-06-26T15:00:00Z",
    status: "pending"
  },
  {
    id: "app_2",
    channelName: "Clay Sculptures Live",
    ownerId: "user_clay_applicant",
    ownerUsername: "clay_sculpts",
    description: "Live clay sculpting streams, pottery wheel masterclasses, and kiln baking guides.",
    logoUrl: "https://picsum.photos/seed/clay/100/100",
    submissionDate: "2026-06-25T18:20:00Z",
    status: "pending"
  }
];

// ==========================================
// POSTGRESQL SCHEMAS, INIT & HELPER MAPS
// ==========================================

async function initDatabase() {
  if (!pool) return;
  let client;
  try {
    client = await pool.connect();
    console.log("Successfully connected to PostgreSQL database!");
    useDb = true;

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id VARCHAR(255) PRIMARY KEY,
        channel_id VARCHAR(255),
        channel_name VARCHAR(255),
        channel_logo TEXT,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration VARCHAR(50),
        category VARCHAR(100),
        tags TEXT[],
        is_short BOOLEAN DEFAULT FALSE,
        is_published BOOLEAN DEFAULT TRUE,
        comments_count INTEGER DEFAULT 0,
        chapters JSONB DEFAULT '[]'::jsonb
      );
    `);

    // Schema updates/migrations defensively
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_id VARCHAR(255);`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_logo TEXT;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS title TEXT;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS description TEXT;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_url TEXT;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration VARCHAR(50);`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS category VARCHAR(100);`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS tags TEXT[];`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_short BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS chapters JSONB DEFAULT '[]'::jsonb;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(255) PRIMARY KEY,
        video_id VARCHAR(255),
        user_id VARCHAR(255),
        username VARCHAR(255),
        user_avatar TEXT,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        replies JSONB DEFAULT '[]'::jsonb
      );
    `);

    // Schema updates for comments defensively
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_id VARCHAR(255);`);
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);`);
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS username VARCHAR(255);`);
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_avatar TEXT;`);
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT;`);
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS replies JSONB DEFAULT '[]'::jsonb;`);

    // Check if videos table is empty, if so, seed it
    const videoCheck = await client.query("SELECT COUNT(*) FROM videos");
    const videoCount = parseInt(videoCheck.rows[0].count);
    if (videoCount === 0) {
      console.log("Seeding videos into PostgreSQL database...");
      for (const video of VIDEOS) {
        await client.query(`
          INSERT INTO videos (
            id, channel_id, channel_name, channel_logo, title, description,
            video_url, thumbnail_url, views, likes, dislikes, upload_date,
            duration, category, tags, is_short, is_published, comments_count, chapters
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          video.id, video.channelId, video.channelName, video.channelLogo, video.title, video.description,
          video.videoUrl, video.thumbnailUrl, video.views, video.likes, video.dislikes, video.uploadDate,
          video.duration, video.category, video.tags, video.isShort, video.isPublished, video.commentsCount,
          JSON.stringify(video.chapters || [])
        ]);
      }
    }

    // Check if comments table is empty, if so, seed it
    const commentCheck = await client.query("SELECT COUNT(*) FROM comments");
    const commentCount = parseInt(commentCheck.rows[0].count);
    if (commentCount === 0) {
      console.log("Seeding comments into PostgreSQL database...");
      for (const comment of COMMENTS) {
        await client.query(`
          INSERT INTO comments (
            id, video_id, user_id, username, user_avatar, content, timestamp, likes, replies
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          comment.id, comment.videoId, comment.userId, comment.username, comment.userAvatar, comment.content,
          comment.timestamp, comment.likes, JSON.stringify(comment.replies || [])
        ]);
      }
    }

    console.log("PostgreSQL Database initialized and seeded successfully.");
  } catch (err) {
    console.error("Error initializing PostgreSQL database:", err);
    useDb = false; // Fallback to in-memory on error
  } finally {
    if (client) {
      try {
        client.release();
      } catch (relErr) {
        console.error("Error releasing DB client:", relErr);
      }
    }
  }
}

function mapVideoRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    channelId: row.channel_id,
    channelName: row.channel_name,
    channelLogo: row.channel_logo,
    title: row.title,
    description: row.description,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    views: Number(row.views || 0),
    likes: Number(row.likes || 0),
    dislikes: Number(row.dislikes || 0),
    uploadDate: row.upload_date,
    duration: row.duration,
    category: row.category,
    tags: row.tags || [],
    isShort: !!row.is_short,
    isPublished: !!row.is_published,
    commentsCount: Number(row.comments_count || 0),
    chapters: row.chapters || []
  };
}

function mapCommentRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    videoId: row.video_id,
    userId: row.user_id,
    username: row.username,
    userAvatar: row.user_avatar,
    content: row.content,
    timestamp: row.timestamp,
    likes: Number(row.likes || 0),
    replies: row.replies || []
  };
}

// ==========================================
// GEMINI INTEGRATION HELPER METHODS
// ==========================================

function heuristicModerateText(content: string): { classification: 'clean' | 'toxic' | 'spam' | 'flagged'; reason?: string } {
  const lower = content.toLowerCase();
  const toxicTerms = ["terrible", "hate", "idiot", "jerk", "spamlink", "crypto scam", "buy doge"];
  const isToxic = toxicTerms.some(term => lower.includes(term));
  const isScam = lower.includes("http") || lower.includes("free money") || lower.includes("scam");

  if (isToxic) {
    return { classification: "toxic", reason: "Heuristic scan: flagged toxic terminology" };
  }
  if (isScam) {
    return { classification: "spam", reason: "Heuristic scan: structural spam / link injection" };
  }
  return { classification: "clean" };
}

async function moderateText(content: string): Promise<{ classification: 'clean' | 'toxic' | 'spam' | 'flagged'; reason?: string }> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return heuristicModerateText(content);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an automated, high-precision content moderation assistant for Malia Live, a global live streaming platform. 
Evaluate this user chat message or comment. Categorize it strictly as "clean", "spam", "toxic", or "flagged" (harassment/hate speech/extreme toxicity).
Return your response strictly as JSON with this structure:
{
  "classification": "clean" | "spam" | "toxic" | "flagged",
  "reason": "Brief explanation of the decision (less than 10 words)"
}

Message: "${content}"`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    let text = response.text || "{}";
    if (text.includes("```")) {
      text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    }
    const parsed = JSON.parse(text.trim() || "{}");
    return {
      classification: parsed.classification || "clean",
      reason: parsed.reason || ""
    };
  } catch (err: any) {
    console.info("Gemini quota standby (heuristic moderation active).");
    return heuristicModerateText(content);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Global Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Auth endpoints
app.get("/api/auth/me", (req, res) => {
  res.json(currentUser);
});

// Session switcher for the demo platform
app.post("/api/auth/switch-role", (req, res) => {
  const { role } = req.body;
  if (role === "viewer" || role === "creator" || role === "admin" || role === "super_admin") {
    currentUser = { ...DEMO_USERS[role] };
    
    // Add to Audit Logs
    AUDIT_LOGS.unshift({
      id: "log_" + Date.now(),
      userId: currentUser.id,
      username: currentUser.displayName,
      action: "USER_ROLE_SWITCH",
      details: `Active user swapped roles to ${role.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      type: "info"
    });

    return res.json({ success: true, user: currentUser });
  }
  res.status(400).json({ error: "Invalid role specified" });
});

// Categories list
app.get("/api/categories", (req, res) => {
  res.json(CATEGORIES);
});

// Videos CRUD
app.get("/api/videos", async (req, res) => {
  const { query, category, shorts } = req.query;

  if (useDb && pool) {
    try {
      let sql = "SELECT * FROM videos WHERE is_published = TRUE";
      const params: any[] = [];

      if (shorts === "true") {
        sql += " AND is_short = TRUE";
      } else if (shorts === "false") {
        sql += " AND is_short = FALSE";
      }

      if (category) {
        params.push(category);
        sql += ` AND category = $${params.length}`;
      }

      if (query) {
        params.push(`%${String(query).toLowerCase()}%`);
        sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE LOWER(t) LIKE $${params.length}))`;
      }

      sql += " ORDER BY upload_date DESC";
      const result = await pool.query(sql, params);
      return res.json(result.rows.map(mapVideoRow));
    } catch (err) {
      console.error("Database query error in GET /api/videos:", err);
      // Fallback below
    }
  }

  let filtered = [...VIDEOS];

  if (shorts === "true") {
    filtered = filtered.filter(v => v.isShort);
  } else if (shorts === "false") {
    filtered = filtered.filter(v => !v.isShort);
  }

  if (category) {
    filtered = filtered.filter(v => v.category === category);
  }

  if (query) {
    const q = String(query).toLowerCase();
    filtered = filtered.filter(v => 
      v.title.toLowerCase().includes(q) || 
      v.description.toLowerCase().includes(q) || 
      v.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  res.json(filtered);
});

app.get("/api/videos/:id", async (req, res) => {
  const { id } = req.params;

  if (useDb && pool) {
    try {
      await pool.query("UPDATE videos SET views = views + 1 WHERE id = $1", [id]);
      const result = await pool.query("SELECT * FROM videos WHERE id = $1", [id]);
      if (result.rows.length > 0) {
        return res.json(mapVideoRow(result.rows[0]));
      }
      return res.status(404).json({ error: "Video not found" });
    } catch (err) {
      console.error("Database query error in GET /api/videos/:id:", err);
    }
  }

  const video = VIDEOS.find(v => v.id === id);
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }
  video.views += 1;
  res.json(video);
});

// Toggle Video Like
app.post("/api/videos/:id/like", async (req, res) => {
  const { id } = req.params;

  if (useDb && pool) {
    try {
      const result = await pool.query("SELECT * FROM videos WHERE id = $1", [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Video not found" });

      const video = mapVideoRow(result.rows[0]);
      if (!video) return res.status(404).json({ error: "Video not found" });

      const alreadyLiked = currentUser.likedVideos.includes(video.id);
      let nextLikes = video.likes;
      if (alreadyLiked) {
        currentUser.likedVideos = currentUser.likedVideos.filter(vid => vid !== video.id);
        nextLikes = Math.max(0, video.likes - 1);
        await pool.query("UPDATE videos SET likes = $1 WHERE id = $2", [nextLikes, video.id]);
      } else {
        currentUser.likedVideos.push(video.id);
        nextLikes = video.likes + 1;
        await pool.query("UPDATE videos SET likes = $1 WHERE id = $2", [nextLikes, video.id]);
      }
      return res.json({ likes: nextLikes, liked: !alreadyLiked });
    } catch (err) {
      console.error("Database query error in POST /api/videos/:id/like:", err);
    }
  }

  const video = VIDEOS.find(v => v.id === id);
  if (!video) return res.status(404).json({ error: "Video not found" });

  const alreadyLiked = currentUser.likedVideos.includes(video.id);
  if (alreadyLiked) {
    currentUser.likedVideos = currentUser.likedVideos.filter(id => id !== video.id);
    video.likes = Math.max(0, video.likes - 1);
  } else {
    currentUser.likedVideos.push(video.id);
    video.likes += 1;
  }
  res.json({ likes: video.likes, liked: !alreadyLiked });
});

// Fetch comments
app.get("/api/videos/:id/comments", async (req, res) => {
  const { id } = req.params;

  if (useDb && pool) {
    try {
      const result = await pool.query("SELECT * FROM comments WHERE video_id = $1 ORDER BY timestamp DESC", [id]);
      return res.json(result.rows.map(mapCommentRow));
    } catch (err) {
      console.error("Database query error in GET /api/videos/:id/comments:", err);
    }
  }

  const videoComments = COMMENTS.filter(c => c.videoId === id);
  res.json(videoComments);
});

// Add comment (scans for toxicity via AI)
app.post("/api/videos/:id/comments", async (req, res) => {
  const { content } = req.body;
  const { id } = req.params;

  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Comment content cannot be empty" });
  }

  // Scan with AI Content Safety
  const analysis = await moderateText(content);
  
  if (analysis.classification === "toxic" || analysis.classification === "flagged") {
    // Log toxic attempt
    AUDIT_LOGS.unshift({
      id: "log_" + Date.now(),
      userId: currentUser.id,
      username: currentUser.displayName,
      action: "COMMENT_TOXIC_BLOCKED",
      details: `Blocked toxic comment attempt by ${currentUser.displayName}. Analysis: ${analysis.reason}`,
      timestamp: new Date().toISOString(),
      type: "warning"
    });

    return res.status(400).json({ 
      error: "Blocked by AI Content Moderator", 
      classification: analysis.classification,
      reason: analysis.reason || "Content violates community standards."
    });
  }

  const newComment = {
    id: "comment_" + Date.now(),
    videoId: id,
    userId: currentUser.id,
    username: currentUser.displayName,
    userAvatar: currentUser.avatarUrl,
    content: content,
    timestamp: new Date().toISOString(),
    likes: 0,
    replies: []
  };

  if (useDb && pool) {
    try {
      await pool.query(`
        INSERT INTO comments (id, video_id, user_id, username, user_avatar, content, timestamp, likes, replies)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        newComment.id, newComment.videoId, newComment.userId, newComment.username, newComment.userAvatar,
        newComment.content, newComment.timestamp, newComment.likes, JSON.stringify(newComment.replies)
      ]);

      await pool.query("UPDATE videos SET comments_count = comments_count + 1 WHERE id = $1", [id]);
      return res.json(newComment);
    } catch (err) {
      console.error("Database error in POST /api/videos/:id/comments:", err);
    }
  }

  COMMENTS.unshift(newComment);
  
  // Update video comments count
  const video = VIDEOS.find(v => v.id === id);
  if (video) video.commentsCount += 1;

  res.json(newComment);
});

// Creator Video Upload Simulation
app.post("/api/videos/upload", async (req, res) => {
  if (currentUser.role !== "creator" && currentUser.role !== "super_admin") {
    return res.status(403).json({ error: "Only accounts with Creator or Super Admin role can publish videos." });
  }

  const { title, description, category, tags, duration, isShort, videoUrl, thumbnailUrl } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: "Title and Category are required." });
  }

  // Find creator channel
  const channel = CHANNELS.find(c => c.ownerId === currentUser.id) || CHANNELS[0];

  const newVideo = {
    id: "video_" + Date.now(),
    channelId: channel.id,
    channelName: channel.name,
    channelLogo: channel.logoUrl,
    title,
    description: description || "No description provided.",
    videoUrl: videoUrl || (isShort 
      ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4"
      : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"),
    thumbnailUrl: thumbnailUrl || (isShort 
      ? "https://picsum.photos/seed/short_" + Date.now() + "/400/700" 
      : "https://picsum.photos/seed/video_" + Date.now() + "/640/360"),
    views: 0,
    likes: 0,
    dislikes: 0,
    uploadDate: new Date().toISOString(),
    duration: duration || (isShort ? "0:30" : "5:00"),
    category,
    tags: tags || [],
    isShort: !!isShort,
    isPublished: true,
    commentsCount: 0,
    chapters: []
  };

  if (useDb && pool) {
    try {
      await pool.query(`
        INSERT INTO videos (
          id, channel_id, channel_name, channel_logo, title, description,
          video_url, thumbnail_url, views, likes, dislikes, upload_date,
          duration, category, tags, is_short, is_published, comments_count, chapters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        newVideo.id, newVideo.channelId, newVideo.channelName, newVideo.channelLogo, newVideo.title, newVideo.description,
        newVideo.videoUrl, newVideo.thumbnailUrl, newVideo.views, newVideo.likes, newVideo.dislikes, newVideo.uploadDate,
        newVideo.duration, newVideo.category, newVideo.tags, newVideo.isShort, newVideo.isPublished, newVideo.commentsCount,
        JSON.stringify(newVideo.chapters)
      ]);
    } catch (err) {
      console.error("Database insert error in POST /api/videos/upload:", err);
    }
  }

  VIDEOS.unshift(newVideo);

  AUDIT_LOGS.unshift({
    id: "log_" + Date.now(),
    userId: currentUser.id,
    username: currentUser.displayName,
    action: "VIDEO_PUBLISHED",
    details: `Published ${isShort ? 'Short' : 'Video'}: "${title}" under channel ${channel.name}`,
    timestamp: new Date().toISOString(),
    type: "info"
  });

  res.status(201).json(newVideo);
});

// Livestream Endpoints
app.get("/api/livestreams", (req, res) => {
  res.json(LIVESTREAMS);
});

app.get("/api/livestreams/:id", (req, res) => {
  const stream = LIVESTREAMS.find(s => s.id === req.params.id);
  if (!stream) return res.status(404).json({ error: "Livestream not found" });
  res.json(stream);
});

// Creator Livestream creation/activation
app.post("/api/livestreams/start", (req, res) => {
  if (currentUser.role !== "creator") {
    return res.status(403).json({ error: "Only accounts with Creator role can broadcast live streams." });
  }

  const { title, description, category, tags, chatSettings } = req.body;
  
  // Find channel
  const channel = CHANNELS.find(c => c.ownerId === currentUser.id) || CHANNELS[0];

  // Disable other streams of this creator if active
  LIVESTREAMS = LIVESTREAMS.filter(s => s.channelId !== channel.id);

  const newStream = {
    id: "live_" + Date.now(),
    channelId: channel.id,
    channelName: channel.name,
    channelLogo: channel.logoUrl,
    title: title || `${channel.name}'s Live Stream`,
    description: description || "No description provided.",
    category: category || "gaming",
    tags: tags || ["Live"],
    thumbnailUrl: "https://picsum.photos/seed/livethumb_" + Date.now() + "/640/360",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    viewersCount: Math.floor(Math.random() * 50) + 1, // Start with a few simulated fans
    isLive: true,
    startTime: new Date().toISOString(),
    chatSettings: chatSettings || { subscriberOnly: false, slowModeDelay: 0 }
  };

  LIVESTREAMS.unshift(newStream);

  AUDIT_LOGS.unshift({
    id: "log_" + Date.now(),
    userId: currentUser.id,
    username: currentUser.displayName,
    action: "STREAM_STARTED",
    details: `Started livestream: "${newStream.title}"`,
    timestamp: new Date().toISOString(),
    type: "info"
  });

  res.status(201).json(newStream);
});

app.post("/api/livestreams/:id/stop", (req, res) => {
  const stream = LIVESTREAMS.find(s => s.id === req.params.id);
  if (!stream) return res.status(404).json({ error: "Stream not found" });

  stream.isLive = false;
  stream.viewersCount = 0;

  AUDIT_LOGS.unshift({
    id: "log_" + Date.now(),
    userId: currentUser.id,
    username: currentUser.displayName,
    action: "STREAM_STOPPED",
    details: `Ended livestream: "${stream.title}"`,
    timestamp: new Date().toISOString(),
    type: "info"
  });

  res.json({ success: true, stream });
});

// Get stream chats
app.get("/api/livestreams/:id/chat", (req, res) => {
  const streamChats = CHAT_MESSAGES.filter(m => m.streamId === req.params.id);
  res.json(streamChats);
});

// Post stream chat
app.post("/api/livestreams/:id/chat", async (req, res) => {
  const { content } = req.body;
  const { id } = req.params;

  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Message content cannot be empty" });
  }

  // Scan with AI Content Safety
  const analysis = await moderateText(content);

  const isBlocked = analysis.classification === "toxic" || analysis.classification === "flagged";

  const newMessage = {
    id: "msg_" + Date.now(),
    streamId: id,
    userId: currentUser.id,
    username: currentUser.displayName,
    userAvatar: currentUser.avatarUrl,
    content: isBlocked ? "[Blocked by Automated AI Content Safety]" : content,
    timestamp: new Date().toISOString(),
    role: currentUser.role,
    classification: analysis.classification
  };

  CHAT_MESSAGES.push(newMessage);

  // Broadcast to all active stream WebSocket viewers
  broadcastToRoom(id, { type: "chat", message: newMessage });

  if (isBlocked) {
    AUDIT_LOGS.unshift({
      id: "log_" + Date.now(),
      userId: currentUser.id,
      username: currentUser.displayName,
      action: "CHAT_TOXIC_FLAGGED",
      details: `AI automatic mask of message: "${content}" by user: ${currentUser.displayName}. Flagged: ${analysis.classification}. Reason: ${analysis.reason}`,
      timestamp: new Date().toISOString(),
      type: "warning"
    });
    return res.status(200).json({ blocked: true, message: newMessage, reason: analysis.reason });
  }

  // Trigger simulated viewers occasionally to respond to make chat interactive
  setTimeout(() => {
    simulateViewerChatResponse(id, content);
  }, 1200);

  res.json({ blocked: false, message: newMessage });
});

// Automated response simulator based on user chat inputs
function simulateViewerChatResponse(streamId: string, userMessage: string) {
  const botUsernames = ["ApexRider", "CyberPixie", "CodeMonkey", "NoodleSoups", "HyperSpeed"];
  const expressions = [
    "OMG YES!", "totally agree with that", "Whoa cool! 🔥", 
    "Can you stream again tomorrow?", "Hyped for this build", 
    "This stream quality is super high", "Let's gooo!", "Malia Live is neat!"
  ];

  const randomUser = botUsernames[Math.floor(Math.random() * botUsernames.length)];
  const randomMsg = expressions[Math.floor(Math.random() * expressions.length)];

  const botMessage = {
    id: "msg_bot_" + Date.now(),
    streamId: streamId,
    userId: "user_bot_" + randomUser,
    username: randomUser,
    userAvatar: `https://picsum.photos/seed/${randomUser}/100/100`,
    content: randomMsg,
    timestamp: new Date().toISOString(),
    role: "viewer" as const,
    classification: "clean" as const
  };

  CHAT_MESSAGES.push(botMessage);

  // Broadcast the simulated bot response
  broadcastToRoom(streamId, { type: "chat", message: botMessage });
}

// ==========================================
// GEMINI INTELLIGENT STREAM ASSISTANT API
// ==========================================

// AI Stream Assistant response
app.post("/api/livestreams/:id/ai-assist", async (req, res) => {
  const { prompt } = req.body;
  const { id } = req.params;

  if (!prompt) return res.status(400).json({ error: "Prompt is required for AI Stream Assistant." });

  const stream = LIVESTREAMS.find(s => s.id === id);
  if (!stream) return res.status(404).json({ error: "Stream session not found." });

  const recentChats = CHAT_MESSAGES.filter(m => m.streamId === id)
    .slice(-15)
    .map(m => `[${m.role}] ${m.username}: ${m.content}`)
    .join("\n");

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    // Elegant simulated fallback
    return res.json({
      answer: `[Simulated AI Assistant] Thank you for asking! Since there is no active Gemini API Key configured in your Secrets, here is a helpful simulation of what I can do:

I read the live chat and stream details to co-host.
Current Stream: "${stream.title}" in Category "${stream.category}".
Recent chats suggest positive viewer engagement (skipped elevators, React TSX integrations, synth routing).

Configuring a valid GEMINI_API_KEY in the Secrets panel will enable live natural language parsing and real responses!`,
      groundingChunks: []
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are the Malia Live Stream Assistant, an integrated AI co-host. 
You support the stream creator and viewers by analyzing chat logs, stream topics, and answering questions.
Keep your response concise, engaging, and directly related to the active stream context.

STREAM TITLE: "${stream.title}"
STREAM DESCRIPTION: "${stream.description}"
STREAM CATEGORY: "${stream.category}"

RECENT CHAT CONTEXT:
${recentChats || "No chat history yet."}

USER INQUIRY: "${prompt}"`,
      config: {
        systemInstruction: "You are an expert stream companion. Talk directly, passionately, and informatively. Keep responses under 150 words.",
        temperature: 0.7,
      }
    });

    res.json({
      answer: response.text || "I'm having trouble analyzing the stream right now.",
      groundingChunks: []
    });
  } catch (err: any) {
    console.info("Gemini quota standby (stream companion simulation active).");
    res.json({
      answer: `[Simulated AI Assistant] Thank you for asking! The live Gemini API co-host is temporarily in cooling mode (or quota limit reached), but here is a simulated stream response:
      
I read the live chat and stream details to co-host.
Current Stream: "${stream.title}" in Category "${stream.category}".
Recent chats suggest positive viewer engagement (skipped elevators, React TSX integrations, synth routing).

We hope your live session is going wonderfully!`,
      groundingChunks: []
    });
  }
});

// AI Chat Summary / Sentiment Analysis
app.post("/api/livestreams/:id/analytics", async (req, res) => {
  const { id } = req.params;
  const stream = LIVESTREAMS.find(s => s.id === id);
  if (!stream) return res.status(404).json({ error: "Stream not found." });

  const streamChats = CHAT_MESSAGES.filter(m => m.streamId === id).map(m => `${m.username}: ${m.content}`).join("\n");

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return res.json({
      summary: "This is a simulated stream summary analysis. Viewers are actively engaging with the speedrun/development concepts. Real AI summaries require a Google Gemini API Key.",
      sentiment: "Highly Energetic / Productive",
      toxicityIndex: "0.05 (Healthy Chat Ambient)",
      topics: ["React 19 Hooks", "Web Audio Oscillators", "Sector Elevators"]
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Perform an analytical audit of this live stream chat. Provide:
1) A brief 2-sentence executive summary of user sentiment.
2) General chat mood or sentiment descriptor (e.g., "Excited", "Anxious", "Curious").
3) An estimate of toxic levels (0.0 to 1.0).
4) Top 3 topics.

Respond strictly as JSON matching this format:
{
  "summary": "string",
  "sentiment": "string",
  "toxicityIndex": "string",
  "topics": ["topic1", "topic2", "topic3"]
}

CHAT HISTORY:
${streamChats || "No chats."}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    let text = response.text || "{}";
    if (text.includes("```")) {
      text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    }
    const parsed = JSON.parse(text.trim() || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.info("Gemini quota standby (stream analytics simulation active).");
    res.json({
      summary: "The live Gemini API quota is temporarily fully occupied. Based on general activity, viewers are engaging enthusiastically with your stream content!",
      sentiment: "Highly Energetic / Curious",
      toxicityIndex: "0.02 (Extremely Healthy Ambient)",
      topics: ["Live Interaction", "Stream Enhancements", "Interactive Elements"]
    });
  }
});

// AI Smart Recommendation Engine
app.post("/api/recommendations", async (req, res) => {
  const { searchContext, watchHistory } = req.body;

  const catalog = VIDEOS.map(v => ({ id: v.id, title: v.title, category: v.category, tags: v.tags }));

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    // Hardcoded high-quality intelligent recommendation simulation
    return res.json({
      recommendations: [
        { id: "video_1", score: 0.95, reason: "Matches your deep interest in software engineering and synthesizers." },
        { id: "video_2", score: 0.88, reason: "Excellent lofi auditory backup for active developer study sessions." }
      ]
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Recommend the top 2 videos from this catalog based on the user's Search Context and Watch History.
Provide an intelligent score (0.0 - 1.0) and a brief user-facing reason (1 sentence) for each recommendation.

CATALOG:
${JSON.stringify(catalog)}

USER CONTEXT:
Search Query context: "${searchContext || "None"}"
Recently watched categories/tags: "${watchHistory || "None"}"

Respond strictly as JSON with this schema:
{
  "recommendations": [
    { "id": "string", "score": number, "reason": "string" }
  ]
}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    let text = response.text || "{}";
    if (text.includes("```")) {
      text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    }
    const parsed = JSON.parse(text.trim() || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.info("Gemini quota standby (recommendations simulation active).");
    res.json({
      recommendations: [
        { id: "video_1", score: 0.92, reason: "Highly relevant based on your active exploration of dev tools and stream content." },
        { id: "video_2", score: 0.85, reason: "Recommended study companion for programming and audio synthesis." }
      ]
    });
  }
});

// ==========================================
// ADMINISTRATION & MODERATION ENDPOINTS
// ==========================================

app.get("/api/admin/audit-logs", (req, res) => {
  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return res.status(403).json({ error: "Unauthorized access: Administrator role required." });
  }
  res.json(AUDIT_LOGS);
});

// Get creator applications
app.get("/api/admin/creator-applications", (req, res) => {
  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return res.status(403).json({ error: "Unauthorized access: Administrator role required." });
  }
  res.json(CREATOR_APPLICATIONS);
});

// Approve/Reject Creator Application
app.post("/api/admin/creator-applications/:id/action", (req, res) => {
  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return res.status(403).json({ error: "Unauthorized access." });
  }

  const { action } = req.body; // "approve" or "reject"
  const appIndex = CREATOR_APPLICATIONS.findIndex(a => a.id === req.params.id);
  if (appIndex === -1) return res.status(404).json({ error: "Application not found." });

  const application = CREATOR_APPLICATIONS[appIndex];
  
  if (action === "approve") {
    application.status = "approved";
    // Create new channel
    CHANNELS.push({
      id: "channel_" + Date.now(),
      ownerId: application.ownerId,
      name: application.channelName,
      description: application.description,
      logoUrl: application.logoUrl,
      bannerUrl: "https://picsum.photos/seed/banner_" + Date.now() + "/1200/400",
      subscribers: 0,
      verified: false,
      socialLinks: { twitter: "", website: "" },
      status: "active"
    });

    AUDIT_LOGS.unshift({
      id: "log_" + Date.now(),
      userId: currentUser.id,
      username: currentUser.displayName,
      action: "CREATOR_APPROVED",
      details: `Approved channel application: "${application.channelName}" by user ${application.ownerUsername}`,
      timestamp: new Date().toISOString(),
      type: "info"
    });
  } else {
    application.status = "rejected";
    AUDIT_LOGS.unshift({
      id: "log_" + Date.now(),
      userId: currentUser.id,
      username: currentUser.displayName,
      action: "CREATOR_REJECTED",
      details: `Rejected channel application: "${application.channelName}" by user ${application.ownerUsername}`,
      timestamp: new Date().toISOString(),
      type: "info"
    });
  }

  res.json({ success: true, application });
});

// Flagged chats overview
app.get("/api/admin/moderation/flagged-chats", (req, res) => {
  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return res.status(403).json({ error: "Unauthorized access." });
  }
  const flagged = CHAT_MESSAGES.filter(m => m.classification === "toxic" || m.classification === "flagged" || m.classification === "spam");
  res.json(flagged);
});

// Clear/unblock chat message
app.post("/api/admin/moderation/flagged-chats/:id/clear", (req, res) => {
  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") return res.status(403).json({ error: "Unauthorized." });
  const msg = CHAT_MESSAGES.find(m => m.id === req.params.id);
  if (msg) {
    msg.classification = "clean";
    // restore content back if we want, or just leave it clean
    if (msg.content.includes("Blocked by Automated")) {
      msg.content = "[Moderator Approved Content Restored]";
    }
    AUDIT_LOGS.unshift({
      id: "log_" + Date.now(),
      userId: currentUser.id,
      username: currentUser.displayName,
      action: "CHAT_RESTORED",
      details: `Admin cleared message violation for msg ID: ${msg.id}`,
      timestamp: new Date().toISOString(),
      type: "info"
    });
    return res.json({ success: true, message: msg });
  }
  res.status(404).json({ error: "Message not found" });
});

// ==========================================
// SUPER ADMIN DASHBOARD API ENDPOINTS
// ==========================================

// Super Admin Platform Settings
app.get("/api/admin/config", (req, res) => {
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Super Admin privileges required." });
  }
  res.json(PLATFORM_SETTINGS);
});

app.post("/api/admin/config", (req, res) => {
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Super Admin privileges required." });
  }
  const { globalChatSlowMode, maxVideoDuration, cdnCacheTtl, safetyThreshold, rateLimiterEnabled, jwtExpiration } = req.body;
  
  if (globalChatSlowMode !== undefined) PLATFORM_SETTINGS.globalChatSlowMode = Number(globalChatSlowMode);
  if (maxVideoDuration !== undefined) PLATFORM_SETTINGS.maxVideoDuration = Number(maxVideoDuration);
  if (cdnCacheTtl !== undefined) PLATFORM_SETTINGS.cdnCacheTtl = Number(cdnCacheTtl);
  if (safetyThreshold !== undefined) PLATFORM_SETTINGS.safetyThreshold = safetyThreshold;
  if (rateLimiterEnabled !== undefined) PLATFORM_SETTINGS.rateLimiterEnabled = !!rateLimiterEnabled;
  if (jwtExpiration !== undefined) PLATFORM_SETTINGS.jwtExpiration = Number(jwtExpiration);

  AUDIT_LOGS.unshift({
    id: "log_" + Date.now(),
    userId: currentUser.id,
    username: currentUser.displayName,
    action: "PLATFORM_CONFIG_UPDATE",
    details: `Updated platform configuration: SlowMode=${PLATFORM_SETTINGS.globalChatSlowMode}s, Safety=${PLATFORM_SETTINGS.safetyThreshold}, CacheTTL=${PLATFORM_SETTINGS.cdnCacheTtl}s`,
    timestamp: new Date().toISOString(),
    type: "critical"
  });

  res.json({ success: true, settings: PLATFORM_SETTINGS });
});

// Cluster metrics endpoint
app.get("/api/admin/cluster-metrics", (req, res) => {
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }
  // Generate slightly fluctuating metrics for real-time graphs
  const cpuUsage = Array.from({ length: 15 }, () => Math.floor(Math.random() * 25) + 35);
  const memoryUsage = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10) + 65);
  
  res.json({
    cpuUsage,
    memoryUsage,
    activeConnections: 12450 + Math.floor(Math.random() * 400),
    activeEncoders: 12,
    ingressBandwidth: parseFloat((8.4 + Math.random() * 0.8).toFixed(2)),
    egressBandwidth: parseFloat((42.1 + Math.random() * 3.5).toFixed(2))
  });
});

// Accounts listing and suspension
app.get("/api/admin/accounts", (req, res) => {
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }
  res.json(DEMO_ACCOUNTS);
});

app.post("/api/admin/accounts/:id/update", (req, res) => {
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }
  const { status, role } = req.body;
  const account = DEMO_ACCOUNTS.find(a => a.id === req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found." });

  if (status !== undefined) account.status = status;
  if (role !== undefined) account.role = role;

  AUDIT_LOGS.unshift({
    id: "log_" + Date.now(),
    userId: currentUser.id,
    username: currentUser.displayName,
    action: "ACCOUNT_MODIFIED",
    details: `Updated account @${account.username}: Status=${account.status}, Role=${account.role}`,
    timestamp: new Date().toISOString(),
    type: "warning"
  });

  res.json({ success: true, account });
});

// Create Platform Category
app.post("/api/admin/categories", (req, res) => {
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }
  const { name, icon, description, tags } = req.body;
  if (!name || !description) return res.status(400).json({ error: "Category name and description are required." });

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  // check if already exists
  if (CATEGORIES.some(c => c.id === id)) {
    return res.status(400).json({ error: "Category already exists." });
  }

  const newCat = {
    id,
    name,
    icon: icon || "Tv",
    description,
    tags: tags || []
  };

  CATEGORIES.push(newCat);

  AUDIT_LOGS.unshift({
    id: "log_" + Date.now(),
    userId: currentUser.id,
    username: currentUser.displayName,
    action: "CATEGORY_CREATED",
    details: `Created new category: "${name}" (${id})`,
    timestamp: new Date().toISOString(),
    type: "info"
  });

  res.status(201).json(newCat);
});

// Submit a new creator channel application (Viewer feature)
app.post("/api/creator-applications/submit", (req, res) => {
  const { channelName, description } = req.body;
  if (!channelName || !description) {
    return res.status(400).json({ error: "Channel Name and description are required." });
  }

  const newApp = {
    id: "app_" + Date.now(),
    channelName,
    ownerId: currentUser.id,
    ownerUsername: currentUser.username,
    description,
    logoUrl: currentUser.avatarUrl,
    submissionDate: new Date().toISOString(),
    status: "pending"
  };

  CREATOR_APPLICATIONS.push(newApp);

  AUDIT_LOGS.unshift({
    id: "log_" + Date.now(),
    userId: currentUser.id,
    username: currentUser.displayName,
    action: "CREATOR_APP_SUBMITTED",
    details: `User submitted creator application for channel: "${channelName}"`,
    timestamp: new Date().toISOString(),
    type: "info"
  });

  res.status(201).json(newApp);
});

// ==========================================
// VITE DEV SERVER / PRODUCTION STATIC ASSETS
// ==========================================

async function startServer() {
  // Initialize database if configuration is present
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    // Dev Mode (Vite integration middleware)
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode (Serve compiled bundle files)
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = createServer(app);

  // Set up WebSocket server upgrade handling
  server.on('upgrade', (request, socket, head) => {
    try {
      const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const pathname = urlObj.pathname;
      const match = pathname.match(/^\/api\/livestreams\/([^/]+)\/ws$/);
      if (match) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, match[1]);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      console.error("Upgrade handling failed:", err);
      socket.destroy();
    }
  });

  // Handle WebSocket Server Connection events
  wss.on('connection', (ws: WebSocket, request, streamId: string) => {
    if (!rooms.has(streamId)) {
      rooms.set(streamId, new Set());
    }
    rooms.get(streamId)!.add(ws);

    console.log(`WebSocket client connected to stream room: ${streamId}. Connection count: ${rooms.get(streamId)!.size}`);

    // Immediately send the current viewer count over WS to the newly connected client
    ws.send(JSON.stringify({
      type: 'viewer_count',
      count: rooms.get(streamId)!.size
    }));

    // Broadcast the new viewer count to all clients in the room
    broadcastToRoom(streamId, {
      type: 'viewer_count',
      count: rooms.get(streamId)!.size
    });

    ws.on('message', async (message: string) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'chat') {
          const { content, username, userAvatar, role, userId } = parsed;
          if (!content || content.trim() === "") return;

          // Moderate content
          const analysis = await moderateText(content);
          const isBlocked = analysis.classification === "toxic" || analysis.classification === "flagged";

          const newMessage = {
            id: "msg_" + Date.now(),
            streamId,
            userId: userId || currentUser.id,
            username: username || currentUser.displayName,
            userAvatar: userAvatar || currentUser.avatarUrl,
            content: isBlocked ? "[Blocked by Automated AI Content Safety]" : content,
            timestamp: new Date().toISOString(),
            role: role || currentUser.role,
            classification: analysis.classification
          };

          CHAT_MESSAGES.push(newMessage);

          if (isBlocked) {
            AUDIT_LOGS.unshift({
              id: "log_" + Date.now(),
              userId: userId || currentUser.id,
              username: username || currentUser.displayName,
              action: "TOXIC_CHAT_BLOCKED",
              details: `Blocked toxic comment attempt by ${username || currentUser.displayName}. Analysis: ${analysis.reason}`,
              timestamp: new Date().toISOString(),
              type: "warning"
            });
          }

          // Broadcast to all clients
          broadcastToRoom(streamId, {
            type: 'chat',
            message: newMessage
          });

          // Trigger simulated reply if not blocked
          if (!isBlocked) {
            setTimeout(() => {
              simulateViewerChatResponse(streamId, content);
            }, 1200);
          }
        } else if (parsed.type === 'like') {
          // Broadcast likes
          broadcastToRoom(streamId, {
            type: 'like',
            likes: parsed.likes
          });
        }
      } catch (err) {
        console.error("Error processing websocket message:", err);
      }
    });

    ws.on('close', () => {
      const clients = rooms.get(streamId);
      if (clients) {
        clients.delete(ws);
        console.log(`WebSocket client disconnected from stream room: ${streamId}. Remaining count: ${clients.size}`);
        if (clients.size === 0) {
          rooms.delete(streamId);
        } else {
          broadcastToRoom(streamId, {
            type: 'viewer_count',
            count: clients.size
          });
        }
      }
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error in room ${streamId}:`, err);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Malia Live server is running at http://localhost:${PORT}`);
  });
}

startServer();
