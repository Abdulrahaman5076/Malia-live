import { useState, useEffect } from "react";
import { Play, Flame, Tv, Radio, Sparkles, AlertCircle, Compass, Gamepad2, Cpu, Music, Utensils, Palette, ExternalLink, Search, X } from "lucide-react";
import { Video, Livestream, Category } from "../types";

interface HomeViewProps {
  searchQuery: string;
  onSearch?: (query: string) => void;
  onSelectVideo: (video: Video) => void;
  onSelectStream: (stream: Livestream) => void;
}

export default function HomeView({
  searchQuery,
  onSearch,
  onSelectVideo,
  onSelectStream
}: HomeViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync with parent search query
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiRecs, setAiRecs] = useState<{ id: string; score: number; reason: string }[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Map Category Icons
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Gamepad2": return <Gamepad2 className="h-4 w-4" />;
      case "Cpu": return <Cpu className="h-4 w-4" />;
      case "Music": return <Music className="h-4 w-4" />;
      case "Utensils": return <Utensils className="h-4 w-4" />;
      case "Compass": return <Compass className="h-4 w-4" />;
      case "Palette": return <Palette className="h-4 w-4" />;
      default: return <Tv className="h-4 w-4" />;
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const catRes = await fetch("/api/categories");
        const cats = await catRes.json();
        setCategories(cats);

        const streamsRes = await fetch("/api/livestreams");
        const streamsData = await streamsRes.json();
        setStreams(streamsData.filter((s: Livestream) => s.isLive));

        const vidsUrl = `/api/videos?shorts=false${selectedCategory ? `&category=${selectedCategory}` : ""}${searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ""}`;
        const vidsRes = await fetch(vidsUrl);
        const vids = await vidsRes.json();
        setVideos(vids);
      } catch (error) {
        console.error("Failed fetching home data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory, searchQuery]);

  // Query AI Smart recommendations
  useEffect(() => {
    const fetchAiRecommendations = async () => {
      setLoadingRecs(true);
      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            searchContext: searchQuery || "react audio development synthesizer",
            watchHistory: "tech, coding, modular beats, rain lofi"
          })
        });
        const data = await res.json();
        if (data.recommendations) {
          setAiRecs(data.recommendations);
        }
      } catch (error) {
        console.error("AI recommendation retrieval failed:", error);
      } finally {
        setLoadingRecs(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchAiRecommendations();
    }, 600);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Featured Hero stream (default first live stream)
  const heroStream = streams.length > 0 ? streams[0] : null;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10" id="home-view-container">
      
      {/* Search Bar & Category Header Group */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" id="search-category-header">
        
        {/* Prominent Search Bar */}
        <div className="relative w-full lg:max-w-md" id="feed-search-container">
          <input
            type="text"
            placeholder="Search videos, creators, or tags..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            className="w-full rounded-full border border-[#2A2A2A] bg-[#161616] py-2.5 pl-11 pr-10 text-xs text-[#F1F1F1] outline-none transition-all placeholder:text-[#666666] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-950"
            id="feed-search-input"
          />
          <Search className="absolute left-4 top-3 h-4 w-4 text-[#777777]" />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                if (onSearch) onSearch("");
              }}
              className="absolute right-4 top-3 text-[#777777] hover:text-white transition-colors"
              id="feed-search-clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none" id="category-pills-row">
          <button
            onClick={() => setSelectedCategory("")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 shrink-0 ${
              selectedCategory === ""
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50"
                : "bg-[#1A1A1A] text-[#AAAAAA] hover:bg-[#252525] hover:text-white border border-[#2A2A2A]"
            }`}
            id="cat-pill-all"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>All Content</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50"
                  : "bg-[#1A1A1A] text-[#AAAAAA] hover:bg-[#252525] hover:text-white border border-[#2A2A2A]"
              }`}
              id={`cat-pill-${cat.id}`}
            >
              {getCategoryIcon(cat.icon)}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero Live Banner */}
      {heroStream && !selectedCategory && !searchQuery && (
        <div 
          onClick={() => onSelectStream(heroStream)}
          className="group relative mb-8 overflow-hidden rounded-3xl bg-gray-900 shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-950/50"
          id="featured-hero-banner"
        >
          {/* Blurred Background ambient glow */}
          <div className="absolute inset-0 scale-105 bg-cover bg-center opacity-30 blur-2xl filter group-hover:scale-110 transition-transform duration-700" style={{ backgroundImage: `url(${heroStream.thumbnailUrl})` }} />
          
          <div className="relative flex flex-col justify-between p-6 md:p-10 lg:flex-row lg:items-center gap-8 z-10">
            <div className="max-w-2xl">
              <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md animate-pulse">
                <Radio className="h-3.5 w-3.5" />
                <span>Featured Live Broadcaster</span>
              </div>
              <h1 className="font-sans font-extrabold text-white text-2xl md:text-4.5xl leading-tight tracking-tight group-hover:text-indigo-200 transition-colors">
                {heroStream.title}
              </h1>
              <p className="mt-3.5 text-sm text-gray-300 leading-relaxed max-w-xl">
                {heroStream.description.length > 150 ? `${heroStream.description.substring(0, 150)}...` : heroStream.description}
              </p>
              
              {/* Creator details */}
              <div className="mt-6 flex items-center gap-3">
                <img
                  src={heroStream.channelLogo}
                  alt={heroStream.channelName}
                  className="h-10 w-10 rounded-full border-2 border-indigo-500 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-sans font-bold text-white text-sm">{heroStream.channelName}</p>
                  <p className="text-xs text-gray-400 font-mono">{heroStream.viewersCount.toLocaleString()} watching now</p>
                </div>
              </div>
            </div>

            {/* Simulated Live Broadcast video/graphics widget */}
            <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-2xl bg-black border border-white/10 shadow-lg group-hover:scale-102 transition-transform duration-300">
              <img
                src={heroStream.thumbnailUrl}
                alt="Broadcast preview"
                className="h-full w-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/65 px-3 py-1.5 backdrop-blur-md">
                <Play className="h-4 w-4 fill-indigo-500 text-indigo-500 animate-pulse" />
                <span className="font-sans font-bold text-white text-xs">Tune in Live</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Smart Recommendations Shelf */}
      {aiRecs.length > 0 && !selectedCategory && (
        <div className="mb-8 rounded-3xl border border-[#2A2A2A] bg-gradient-to-r from-indigo-950/20 via-[#151515] to-purple-950/15 p-6 shadow-sm" id="ai-recs-shelf">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
                <Sparkles className="h-4.5 w-4.5 animate-bounce" />
              </div>
              <div>
                <h2 className="font-sans font-extrabold text-[#F1F1F1] text-lg leading-tight">Gemini Smart Suggestions</h2>
                <p className="text-[11px] text-[#AAAAAA]">Intelligently optimized matching results</p>
              </div>
            </div>
            {loadingRecs && <span className="font-mono text-xs text-indigo-400 animate-pulse">Analyzing catalog...</span>}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {aiRecs.map((rec) => {
              const matchedVideo = videos.find(v => v.id === rec.id);
              if (!matchedVideo) return null;
              return (
                <div 
                  key={rec.id}
                  onClick={() => onSelectVideo(matchedVideo)}
                  className="group flex flex-col md:flex-row gap-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-3.5 shadow-xs cursor-pointer hover:border-indigo-500/50 hover:shadow-md transition-all duration-300"
                >
                  <div className="relative aspect-video w-full md:w-36 shrink-0 overflow-hidden rounded-xl bg-gray-900">
                    <img
                      src={matchedVideo.thumbnailUrl}
                      alt={matchedVideo.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 right-1 rounded-sm bg-black/60 px-1 font-mono text-[10px] text-white">
                      {matchedVideo.duration}
                    </span>
                  </div>
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                          {Math.round(rec.score * 100)}% Match
                        </span>
                      </div>
                      <h3 className="mt-1 font-sans font-semibold text-[#F1F1F1] text-xs leading-tight line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {matchedVideo.title}
                      </h3>
                      <p className="mt-1.5 font-sans text-[11px] text-[#AAAAAA] leading-relaxed italic line-clamp-2">
                        " {rec.reason} "
                      </p>
                    </div>
                    <p className="mt-2 text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                      <span>ByteCraft Studio</span> • <span>{matchedVideo.views.toLocaleString()} views</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Live Streams Shelf */}
      {streams.length > 0 && !selectedCategory && !searchQuery && (
        <div className="mb-8" id="active-streams-shelf">
          <div className="mb-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <h2 className="font-sans font-extrabold text-[#F1F1F1] text-lg">Active Live Broadcasts</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {streams.map((stream) => (
              <div 
                key={stream.id}
                onClick={() => onSelectStream(stream)}
                className="group flex flex-col rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-2.5 shadow-xs cursor-pointer hover:shadow-md hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-900">
                  <img
                    src={stream.thumbnailUrl}
                    alt={stream.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    LIVE
                  </span>
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-xs">
                    {stream.viewersCount.toLocaleString()} Watching
                  </span>
                </div>
                <div className="mt-3.5 flex gap-3 px-1">
                  <img
                    src={stream.channelLogo}
                    alt={stream.channelName}
                    className="h-9 w-9 rounded-full object-cover border border-[#2A2A2A]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <h3 className="font-sans font-bold text-[#F1F1F1] text-sm leading-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {stream.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#AAAAAA] font-medium">{stream.channelName}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-md bg-[#252525] px-1.5 py-0.5 text-[9px] font-bold text-[#AAAAAA]">
                        {stream.category.toUpperCase()}
                      </span>
                      {stream.tags.slice(0, 2).map((t, i) => (
                        <span key={i} className="rounded-md bg-indigo-950/50 border border-indigo-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Video Catalog Grid */}
      <div id="general-catalog-shelf">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans font-extrabold text-[#F1F1F1] text-lg">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Explore Catalog"}
          </h2>
          <span className="font-sans text-xs text-[#777777] font-medium">{videos.length} videos found</span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <span className="font-mono text-sm text-[#777777] animate-pulse">Loading catalog content...</span>
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2A2A2A] py-16 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[#777777]" />
            <p className="mt-3 font-sans font-semibold text-[#F1F1F1] text-sm">No videos found</p>
            <p className="mt-1 text-xs text-[#AAAAAA]">Try checking other keywords or clear category filters.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <div 
                key={video.id}
                onClick={() => onSelectVideo(video)}
                className="group flex flex-col cursor-pointer rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-2 shadow-xs hover:shadow-md hover:border-indigo-500/30 transition-all duration-300"
                id={`video-card-${video.id}`}
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-900">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover transition-all duration-500 group-hover:scale-102"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white">
                    {video.duration}
                  </span>
                </div>
                <div className="mt-3 flex gap-3 px-1.5 pb-1">
                  <img
                    src={video.channelLogo}
                    alt={video.channelName}
                    className="h-8.5 w-8.5 rounded-full object-cover border border-[#2A2A2A] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-sans font-semibold text-[#F1F1F1] text-xs leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">
                      {video.title}
                    </h3>
                    <p className="mt-1.5 font-sans text-[11px] text-[#AAAAAA] font-medium truncate">
                      {video.channelName}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] text-[#777777]">
                      {video.views.toLocaleString()} views • {new Date(video.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
