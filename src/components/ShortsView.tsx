import React, { useState, useEffect, useRef } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp, Share2, Sparkles } from "lucide-react";
import { Video } from "../types";

interface ShortsViewProps {
  onBackToHome: () => void;
}

export default function ShortsView({ onBackToHome }: ShortsViewProps) {
  const [shorts, setShorts] = useState<Video[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [shortsComments, setShortsComments] = useState<string[]>([
    "This is absolutely genius! 🚀",
    "Wow, definitely trying this trick tonight.",
    "Which editor did you use for the overlay graphics?"
  ]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch vertical short videos on load
  useEffect(() => {
    const fetchShorts = async () => {
      try {
        const res = await fetch("/api/videos?shorts=true");
        const data = await res.json();
        setShorts(data);
        if (data.length > 0) {
          setLikesCount(data[0].likes);
        }
      } catch (err) {
        console.error("Shorts retrieval failed:", err);
      }
    };
    fetchShorts();
  }, []);

  // Update loop player and likes when active slide changes
  useEffect(() => {
    if (shorts.length > 0) {
      setLikesCount(shorts[activeIndex].likes);
      setLiked(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [activeIndex, shorts]);

  const handleNext = () => {
    if (activeIndex < shorts.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      setActiveIndex(0); // wrap around
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleLike = () => {
    if (liked) {
      setLikesCount(prev => prev - 1);
    } else {
      setLikesCount(prev => prev + 1);
    }
    setLiked(!liked);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setShortsComments(prev => [...prev, commentInput]);
    setCommentInput("");
  };

  const activeShort = shorts.length > 0 ? shorts[activeIndex] : null;

  return (
    <div className="flex-1 flex justify-center items-center bg-[#0F0F0F] py-4 md:py-8 overflow-hidden h-full relative" id="shorts-player-canvas">
      
      {/* Top Controls Header */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-3">
        <button 
          onClick={onBackToHome}
          className="rounded-full bg-[#1A1A1A] border border-[#2A2A2A] px-5 py-2 text-xs font-bold text-[#F1F1F1] hover:bg-[#252525] hover:border-[#3A3A3A] transition-all"
          id="shorts-exit-btn"
        >
          Back to Home
        </button>
        <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold animate-pulse font-mono uppercase">
          <Sparkles className="h-4 w-4" />
          <span>Active Feed</span>
        </div>
      </div>

      {activeShort ? (
        <div className="relative aspect-[9/16] h-full max-h-[750px] w-full max-w-[420px] rounded-3xl bg-[#000000] overflow-hidden shadow-2xl border border-[#2A2A2A] flex items-center justify-center" id="vertical-short-viewport">
          
          {/* Loop Video node */}
          <video
            ref={videoRef}
            src={activeShort.videoUrl}
            autoPlay
            loop
            muted={false}
            className="h-full w-full object-cover"
            id="shorts-media-node"
          />

          {/* Scrolling sliders overlay */}
          <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-20" id="shorts-sidebar-interactions">
            {/* Creator Logo avatar */}
            <div className="relative group cursor-pointer">
              <img
                src={activeShort.channelLogo}
                alt={activeShort.channelName}
                className="h-10 w-10 rounded-full object-cover border-2 border-pink-500 shadow-md group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1 left-3 rounded-full bg-pink-500 text-white font-bold text-[9px] px-1 shadow-sm leading-tight">+</span>
            </div>

            {/* Like */}
            <button 
              onClick={handleLike}
              className={`flex flex-col items-center gap-1 h-11 w-11 justify-center rounded-full transition-all active:scale-90 ${
                liked ? "bg-pink-500 text-white" : "bg-black/55 text-white hover:bg-black/75"
              }`}
              id="short-like-btn"
            >
              <ThumbsUp className="h-4.5 w-4.5" />
              <span className="text-[10px] font-bold font-mono">{likesCount}</span>
            </button>

            {/* Comments toggle button */}
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex flex-col items-center gap-1 h-11 w-11 justify-center rounded-full bg-black/55 text-white hover:bg-black/75 transition-all"
              id="short-comment-toggle-btn"
            >
              <MessageSquare className="h-4.5 w-4.5" />
              <span className="text-[10px] font-bold font-mono">{shortsComments.length}</span>
            </button>

            {/* Share */}
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 transition-all" id="short-share-btn">
              <Share2 className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Bottom video labels metadata overlay */}
          <div className="absolute bottom-4 left-4 right-16 z-20 p-4 rounded-2xl bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col" id="shorts-metadata-card">
            <h3 className="font-sans font-bold text-white text-sm line-clamp-1">@{activeShort.channelName}</h3>
            <p className="mt-1 font-sans text-gray-250 text-xs leading-normal line-clamp-2">{activeShort.title}</p>
            <div className="mt-2.5 flex gap-1.5 flex-wrap">
              {activeShort.tags.map((tag, i) => (
                <span key={i} className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[9px] text-gray-300 font-semibold">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Comments sidebar panel overlays */}
          {showComments && (
            <div className="absolute inset-x-0 bottom-0 max-h-[50%] bg-[#121212]/95 backdrop-blur-md rounded-t-3xl p-4 z-30 flex flex-col justify-between border-t border-[#2A2A2A] animate-in slide-in-from-bottom-5" id="shorts-comments-tray">
              <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-2 mb-2">
                <span className="font-sans font-extrabold text-[#F1F1F1] text-xs uppercase tracking-wider">Shorts Comments</span>
                <button 
                  onClick={() => setShowComments(false)}
                  className="font-mono text-xs text-[#AAAAAA] hover:text-indigo-400 font-bold"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 max-h-36 pr-1" id="shorts-comments-list">
                {shortsComments.map((com, idx) => (
                  <div key={idx} className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-2 text-[11px] text-[#AAAAAA] leading-normal">
                    <p className="font-sans font-bold text-[#F1F1F1] mb-0.5">@anonymous</p>
                    <p>{com}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="mt-3 flex gap-2" id="add-short-comment-form">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 rounded-full border border-[#2A2A2A] bg-[#0F0F0F] py-1.5 px-3 text-xs outline-none focus:bg-[#1A1A1A] focus:border-indigo-500 text-white"
                  id="shorts-comment-input"
                />
                <button
                  type="submit"
                  className="rounded-full bg-indigo-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-indigo-700"
                >
                  Send
                </button>
              </form>
            </div>
          )}

        </div>
      ) : (
        <span className="font-mono text-sm text-white animate-pulse">Initializing vertical short feeds...</span>
      )}

      {/* Vertical Slider Navigation Button pillars */}
      <div className="absolute right-6 flex flex-col gap-3 z-30" id="shorts-vertical-nav-stack">
        <button 
          onClick={handlePrev} 
          disabled={activeIndex === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          id="shorts-prev-slide-btn"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button 
          onClick={handleNext}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          id="shorts-next-slide-btn"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

    </div>
  );
}
