import { useState, useEffect } from "react";
import { User, Video, Livestream } from "./types";
import Navigation from "./components/Navigation";
import HomeView from "./components/HomeView";
import VideoPlayerView from "./components/VideoPlayerView";
import LiveStreamView from "./components/LiveStreamView";
import CreatorStudioView from "./components/CreatorStudioView";
import AdminPortalView from "./components/AdminPortalView";
import SuperAdminView from "./components/SuperAdminView";
import ShortsView from "./components/ShortsView";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<string>("home");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedStream, setSelectedStream] = useState<Livestream | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Theme support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem("malia-theme") as 'light' | 'dark') || 'dark';
  });

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem("malia-theme", nextTheme);
  };

  // Sync user session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setCurrentUser(data);
      } catch (err) {
        console.error("Failed fetching authentication session:", err);
      } finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
  }, []);

  // Handle switching active viewer sessions (Viewer -> Creator -> Admin -> Super Admin)
  const handleRoleSwitch = async (role: 'viewer' | 'creator' | 'admin' | 'super_admin') => {
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        // Automatically route to their primary portal
        if (role === "creator") {
          setActiveView("studio");
        } else if (role === "admin") {
          setActiveView("admin");
        } else if (role === "super_admin") {
          setActiveView("super_admin");
        } else {
          setActiveView("home");
        }
      }
    } catch (err) {
      console.error("Role switch transaction failed:", err);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (activeView !== "home") {
      setActiveView("home");
    }
  };

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setActiveView("video");
  };

  const handleSelectStream = (stream: Livestream) => {
    setSelectedStream(stream);
    setActiveView("stream");
  };

  if (loadingSession || !currentUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0F0F0F]" id="session-spinner">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-indigo-400">Malia Cluster Sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-screen flex-col bg-[#0F0F0F] text-[#F1F1F1] overflow-hidden ${theme === 'light' ? 'light-theme' : ''}`} id="app-viewport">
      
      {/* Dynamic Header */}
      <Navigation
        currentUser={currentUser}
        onSearch={handleSearch}
        activeView={activeView}
        onChangeView={setActiveView}
        onRoleSwitch={handleRoleSwitch}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main viewport area */}
      <main className="flex-1 flex overflow-hidden" id="app-main-view">
        {activeView === "home" && (
          <HomeView
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onSelectVideo={handleSelectVideo}
            onSelectStream={handleSelectStream}
          />
        )}

        {activeView === "video" && selectedVideo && (
          <VideoPlayerView
            video={selectedVideo}
            onSelectVideo={handleSelectVideo}
          />
        )}

        {activeView === "stream" && selectedStream && (
          <LiveStreamView
            stream={selectedStream}
          />
        )}

        {activeView === "shorts" && (
          <ShortsView
            onBackToHome={() => setActiveView("home")}
          />
        )}

        {activeView === "studio" && (
          <CreatorStudioView
            onBackToHome={() => setActiveView("home")}
          />
        )}

        {activeView === "admin" && (
          <AdminPortalView
            onBackToHome={() => setActiveView("home")}
          />
        )}

        {activeView === "super_admin" && (
          <SuperAdminView
            onBackToHome={() => setActiveView("home")}
          />
        )}
      </main>

    </div>
  );
}
