import React, { useState } from "react";
import { Sparkles, Radio, UploadCloud, Users, Eye, BarChart3, Clock, AlertCircle, PlusCircle, CheckCircle } from "lucide-react";
import { Category, Video } from "../types";

interface CreatorStudioViewProps {
  onBackToHome: () => void;
}

export default function CreatorStudioView({ onBackToHome }: CreatorStudioViewProps) {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'upload' | 'analytics'>('broadcast');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stream Form State
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDesc, setStreamDesc] = useState("");
  const [streamCategory, setStreamCategory] = useState("gaming");
  const [streamTags, setStreamTags] = useState("");
  const [subOnly, setSubOnly] = useState(false);
  const [slowMode, setSlowMode] = useState(0);

  // Video Upload State
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [videoCategory, setVideoCategory] = useState("tech");
  const [videoTags, setVideoTags] = useState("");
  const [isShort, setIsShort] = useState(false);
  const [duration, setDuration] = useState("4:30");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // Handle stream initialization
  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    const tagsArr = streamTags.split(",").map(t => t.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/livestreams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: streamTitle,
          description: streamDesc,
          category: streamCategory,
          tags: tagsArr,
          chatSettings: { subscriberOnly: subOnly, slowModeDelay: slowMode }
        })
      });

      if (!res.ok) {
        throw new Error("Stream scheduling failed");
      }

      setSuccessMsg("Broadcast is successfully LIVE! Viewers can now join from the Homepage.");
      // Clear
      setStreamTitle("");
      setStreamDesc("");
      setStreamTags("");
    } catch (err) {
      console.error(err);
    }
  };

  // Handle video publish
  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    const tagsArr = videoTags.split(",").map(t => t.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/videos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: videoTitle,
          description: videoDesc,
          category: videoCategory,
          tags: tagsArr,
          duration,
          isShort,
          videoUrl,
          thumbnailUrl
        })
      });

      if (!res.ok) {
        throw new Error("Video publish failed");
      }

      setSuccessMsg(`Successfully published your ${isShort ? 'vertical Short' : 'video'}! It is now active in the explore library.`);
      // Clear
      setVideoTitle("");
      setVideoDesc("");
      setVideoTags("");
      setVideoUrl("");
      setThumbnailUrl("");
      setIsShort(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10" id="creator-studio-screen">
      
      {/* Studio Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5" id="studio-header">
        <div>
          <h1 className="font-sans font-extrabold text-[#F1F1F1] text-xl md:text-2xl leading-snug">
            ByteCraft Studio Room
          </h1>
          <p className="text-xs text-[#AAAAAA]">Analyze performance, go live, and upload video media</p>
        </div>
        <button 
          onClick={onBackToHome}
          className="rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-2 text-xs font-bold text-[#F1F1F1] hover:bg-[#252525] hover:border-[#3A3A3A] transition-colors"
          id="exit-studio-btn"
        >
          Exit Studio
        </button>
      </div>

      {/* Metrics Row */}
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4" id="studio-metrics-panel">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950/40 text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold">Subscribers</span>
            <span className="text-lg font-extrabold text-[#F1F1F1] leading-tight">14,205</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-950/40 text-pink-400">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold">Total Views</span>
            <span className="text-lg font-extrabold text-[#F1F1F1] leading-tight">342,108</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold">Studio Score</span>
            <span className="text-lg font-extrabold text-[#F1F1F1] leading-tight">A+ Excellent</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/40 text-purple-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold">Watch Time</span>
            <span className="text-lg font-extrabold text-[#F1F1F1] leading-tight">14.8K hrs</span>
          </div>
        </div>
      </div>

      {/* Action Tabs Bar */}
      <div className="mb-6 flex gap-2 border-b border-[#2A2A2A]" id="studio-view-tabs">
        <button
          onClick={() => { setActiveTab('broadcast'); setSuccessMsg(null); }}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'broadcast' 
              ? "border-indigo-500 text-indigo-400" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="studio-tab-broadcast"
        >
          <Radio className="h-4 w-4" />
          <span>Launch Broadcast</span>
        </button>

        <button
          onClick={() => { setActiveTab('upload'); setSuccessMsg(null); }}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'upload' 
              ? "border-indigo-500 text-indigo-400" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="studio-tab-upload"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Video / Shorts</span>
        </button>

        <button
          onClick={() => { setActiveTab('analytics'); setSuccessMsg(null); }}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'analytics' 
              ? "border-indigo-500 text-indigo-400" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="studio-tab-analytics"
        >
          <BarChart3 className="h-4 w-4" />
          <span>Audience Insights</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-emerald-150 bg-emerald-50 p-4 text-xs text-emerald-800 animate-in fade-in zoom-in-95" id="success-alert-studio">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-sans font-extrabold">Studio Process Completed</p>
            <p className="mt-1 leading-relaxed font-semibold">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Broadcast Config Tab screen */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-sm" id="form-screen-broadcast">
          <h2 className="mb-5 font-sans font-extrabold text-[#F1F1F1] text-sm flex items-center gap-2">
            <Radio className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span>Go Live Control Desk</span>
          </h2>

          <form onSubmit={handleStartStream} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Stream Title</label>
              <input
                type="text"
                placeholder="e.g. Speedrunning React 19 builds [100% GLITCHLESS]"
                required
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500"
                id="stream-title-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Description</label>
              <textarea
                placeholder="Describe your livestream topic and parameters..."
                rows={3}
                value={streamDesc}
                onChange={(e) => setStreamDesc(e.target.value)}
                className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500"
                id="stream-desc-textarea"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Category</label>
                <select
                  value={streamCategory}
                  onChange={(e) => setStreamCategory(e.target.value)}
                  className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                  id="stream-category-select"
                >
                  <option value="gaming">Gaming</option>
                  <option value="tech">Tech & AI</option>
                  <option value="music">Music & Chill</option>
                  <option value="cooking">Cooking & Food</option>
                  <option value="documentary">Science & Travel</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. speedrun, retrogaming, live"
                  value={streamTags}
                  onChange={(e) => setStreamTags(e.target.value)}
                  className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-indigo-500"
                  id="stream-tags-input"
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#0F0F0F] p-4 border border-[#2A2A2A] flex flex-col gap-3.5 mt-2">
              <span className="block font-mono text-[9px] uppercase font-bold tracking-wider text-[#AAAAAA]">Moderation / chat Settings</span>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans font-bold text-[#F1F1F1] text-xs">Subscriber-Only Chat</p>
                  <p className="text-[10px] text-[#AAAAAA]">Only verified subscribers can type in stream chat.</p>
                </div>
                <input
                  type="checkbox"
                  checked={subOnly}
                  onChange={(e) => setSubOnly(e.target.checked)}
                  className="h-4.5 w-4.5 text-indigo-500 rounded bg-[#1A1A1A] border-[#2A2A2A]"
                  id="sub-only-checkbox"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans font-bold text-[#F1F1F1] text-xs">Slow-Mode Delay</p>
                  <p className="text-[10px] text-[#AAAAAA]">Force delay between user messages in seconds.</p>
                </div>
                <select
                  value={slowMode}
                  onChange={(e) => setSlowMode(parseInt(e.target.value))}
                  className="rounded-md border border-[#2A2A2A] bg-[#1A1A1A] p-1 text-xs text-white"
                  id="slow-mode-select"
                >
                  <option value="0">Disabled</option>
                  <option value="2">2 Seconds</option>
                  <option value="5">5 Seconds</option>
                  <option value="10">10 Seconds</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg hover:opacity-90 active:scale-98 transition-all"
              id="start-broadcast-btn"
            >
              Initialize Broadcast Node
            </button>
          </form>
        </div>
      )}

      {/* Upload config tab screen */}
      {activeTab === 'upload' && (
        <div className="max-w-2xl rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-sm" id="form-screen-upload">
          <h2 className="mb-5 font-sans font-extrabold text-[#F1F1F1] text-sm flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-indigo-400" />
            <span>Publish Video Assets</span>
          </h2>

          <form onSubmit={handleUploadVideo} className="flex flex-col gap-4">
            
            <div className="rounded-xl bg-[#0F0F0F] border border-dashed border-[#2A2A2A] p-6 text-center mb-2">
              <UploadCloud className="h-8 w-8 text-indigo-400 mx-auto" />
              <p className="mt-2 font-sans font-bold text-[#F1F1F1] text-xs">Drag and drop MP4 files here</p>
              <p className="text-[10px] text-[#AAAAAA] mt-0.5">Videos will process automatically to standard 1080p outputs.</p>
            </div>

            <div className="flex items-center gap-6 rounded-xl bg-[#0F0F0F] p-4 border border-[#2A2A2A] mb-2">
              <div>
                <p className="font-sans font-bold text-[#F1F1F1] text-xs">Publish as vertical Short</p>
                <p className="text-[10px] text-[#AAAAAA]">Vertical format, less than 60 seconds (swipable row layout).</p>
              </div>
              <input
                type="checkbox"
                checked={isShort}
                onChange={(e) => setIsShort(e.target.checked)}
                className="h-4.5 w-4.5 text-indigo-500 rounded bg-[#1A1A1A] border-[#2A2A2A]"
                id="is-short-checkbox"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Video Title</label>
              <input
                type="text"
                placeholder="e.g. My Custom Sourdough hydrations secret"
                required
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                id="video-title-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Description</label>
              <textarea
                placeholder="Write full summary, affiliate links, or chapters..."
                rows={3}
                value={videoDesc}
                onChange={(e) => setVideoDesc(e.target.value)}
                className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                id="video-desc-textarea"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Video URL (Optional MP4 link)</label>
              <input
                type="text"
                placeholder="e.g. https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                id="video-url-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Thumbnail Cover Image URL (Optional)</label>
              <input
                type="text"
                placeholder="e.g. https://picsum.photos/seed/my_custom_thumb/640/360"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                id="video-thumbnail-input"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Category</label>
                <select
                  value={videoCategory}
                  onChange={(e) => setVideoCategory(e.target.value)}
                  className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                  id="video-category-select"
                >
                  <option value="gaming">Gaming</option>
                  <option value="tech">Tech & AI</option>
                  <option value="music">Music & Chill</option>
                  <option value="cooking">Cooking & Food</option>
                  <option value="documentary">Science & Travel</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Tags</label>
                <input
                  type="text"
                  placeholder="react, frontend, dev"
                  value={videoTags}
                  onChange={(e) => setVideoTags(e.target.value)}
                  className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                  id="video-tags-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#AAAAAA]">Duration</label>
                <input
                  type="text"
                  placeholder={isShort ? "0:30" : "12:15"}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-xs text-white outline-none focus:border-indigo-500"
                  id="video-duration-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-indigo-700 transition-colors"
              id="upload-video-btn"
            >
              Compile & Publish Asset
            </button>
          </form>
        </div>
      )}

      {/* Analytics insights screen */}
      {activeTab === 'analytics' && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-xs" id="screen-analytics">
          <h2 className="mb-4 font-sans font-extrabold text-[#F1F1F1] text-sm flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-indigo-400" />
            <span>Audience Insights & Demographics</span>
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-[#0F0F0F] p-4 border border-[#2A2A2A]">
              <p className="font-mono text-[9px] text-[#AAAAAA] font-bold uppercase tracking-wider mb-2">Subscriber Acquisition Sources</p>
              <ul className="flex flex-col gap-2 font-sans text-xs text-[#AAAAAA]">
                <li className="flex justify-between"><span>Homepage recommendations</span> <span className="font-bold text-indigo-400">62%</span></li>
                <li className="flex justify-between"><span>Shorts scroll views</span> <span className="font-bold text-pink-400">24%</span></li>
                <li className="flex justify-between"><span>Direct search queries</span> <span className="font-bold text-gray-400 font-semibold">14%</span></li>
              </ul>
            </div>

            <div className="rounded-xl bg-[#0F0F0F] p-4 border border-[#2A2A2A]">
              <p className="font-mono text-[9px] text-[#AAAAAA] font-bold uppercase tracking-wider mb-2">Audience Location Demographics</p>
              <ul className="flex flex-col gap-2 font-sans text-xs text-[#AAAAAA]">
                <li className="flex justify-between"><span>United States</span> <span className="font-bold">38%</span></li>
                <li className="flex justify-between"><span>United Kingdom</span> <span className="font-bold">21%</span></li>
                <li className="flex justify-between"><span>Germany</span> <span className="font-bold">14%</span></li>
                <li className="flex justify-between"><span>Others</span> <span className="font-bold">27%</span></li>
              </ul>
            </div>

            <div className="rounded-xl bg-indigo-950/20 p-4 border border-indigo-900/30">
              <p className="font-mono text-[9px] text-indigo-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3 animate-pulse" />
                <span>AI Automated Optimization</span>
              </p>
              <p className="text-xs text-[#AAAAAA] leading-relaxed font-semibold">
                Based on Gemini's scan of recent chat logs: Viewers show a strong interest in "React 19 Hooks" and "Web Audio".
              </p>
              <p className="mt-2 text-[10px] text-indigo-400 font-bold italic leading-relaxed">
                Tip: Scheduling a stream around "React 19 performance metrics" during peak study hours is estimated to draw up to 45% higher viewership!
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
