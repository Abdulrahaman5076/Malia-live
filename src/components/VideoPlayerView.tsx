import React, { useState, useEffect, useRef } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, CornerDownRight, Sparkles, AlertTriangle, Play, Pause, Volume2, VolumeX, ShieldAlert, Layers, Subtitles, Maximize, Minimize, Tv, MonitorPlay } from "lucide-react";
import { Video, Comment } from "../types";

interface VideoPlayerViewProps {
  video: Video;
  onSelectVideo: (video: Video) => void;
}

export default function VideoPlayerView({ video, onSelectVideo }: VideoPlayerViewProps) {
  const [likes, setLikes] = useState(video.likes);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [related, setRelated] = useState<Video[]>([]);
  const [subbed, setSubbed] = useState(false);
  const [errorNotif, setErrorNotif] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  // Custom Video Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [captionsActive, setCaptionsActive] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initial Load
  useEffect(() => {
    // Reset states
    setLikes(video.likes);
    setLiked(false);
    setSubbed(false);
    setErrorNotif(null);
    setIsPlaying(false);

    // Fetch comments
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/videos/${video.id}/comments`);
        const data = await res.json();
        setComments(data);
      } catch (err) {
        console.error("Failed fetching comments:", err);
      } finally {
        setLoadingComments(false);
      }
    };

    // Fetch related
    const fetchRelated = async () => {
      try {
        const res = await fetch("/api/videos?shorts=false");
        const data = await res.json();
        setRelated(data.filter((v: Video) => v.id !== video.id));
      } catch (err) {
        console.error("Failed fetching related:", err);
      }
    };

    fetchComments();
    fetchRelated();
  }, [video]);

  // Handle Liking Video
  const handleLike = async () => {
    try {
      const res = await fetch(`/api/videos/${video.id}/like`, { method: "POST" });
      const data = await res.json();
      setLikes(data.likes);
      setLiked(data.liked);
    } catch (err) {
      console.error("Like failed:", err);
    }
  };

  // Seek video to specific chapter timestamp
  const seekToChapter = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Video Controls togglers
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const changeVolume = (val: number) => {
    if (videoRef.current) {
      videoRef.current.volume = val;
      setVolume(val);
      if (val > 0) {
        setIsMuted(false);
        videoRef.current.muted = false;
      } else {
        setIsMuted(true);
        videoRef.current.muted = true;
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch((err) => console.warn("Fullscreen permission error:", err));
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const togglePip = async () => {
    try {
      if (videoRef.current) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      }
    } catch (err) {
      console.warn("PIP API failure:", err);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeekChange = (val: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration || 1000, videoRef.current.currentTime + 5);
          }
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) {
            const nextV = Math.min(1, videoRef.current.volume + 0.1);
            changeVolume(nextV);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) {
            const nextV = Math.max(0, videoRef.current.volume - 0.1);
            changeVolume(nextV);
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          setIsTheaterMode(p => !p);
          break;
        case 'p':
          e.preventDefault();
          togglePip();
          break;
        case 'c':
          e.preventDefault();
          setCaptionsActive(p => !p);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isPlaying, isMuted, volume]);

  // Submit dynamic comment with AI toxicity check
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setErrorNotif(null);
    try {
      const res = await fetch(`/api/videos/${video.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment })
      });

      const data = await res.json();

      if (!res.ok) {
        // Toxic comments caught by server-side Gemini are rejected with error code 400
        setErrorNotif(data.error || "Blocked by Content Moderator.");
        return;
      }

      setComments(prev => [data, ...prev]);
      setNewComment("");
    } catch (err) {
      console.error("Failed posting comment:", err);
      setErrorNotif("Network transaction failure, please retry.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 lg:grid lg:grid-cols-12 lg:gap-8" id="video-playback-screen">
      
      {/* Left Column: Custom Player, Details, Comments */}
      <div className={`${isTheaterMode ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col`} id="player-and-content-column">
        
        {/* Custom video frame container */}
        <div 
          ref={containerRef}
          className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-[#2A2A2A] shadow-lg" 
          id="video-canvas-wrapper"
        >
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="h-full w-full object-contain cursor-pointer"
            autoPlay={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
            id="main-video-node"
          />

          {/* Captions Overlay */}
          {captionsActive && (
            <div className="absolute bottom-20 inset-x-0 flex justify-center px-4 pointer-events-none z-25">
              <div className="rounded-xl bg-black/85 px-4 py-2 text-center text-xs md:text-sm font-sans font-medium text-white max-w-[80%] shadow-xl border border-white/10 backdrop-blur-xs leading-relaxed">
                {currentTime < 8 && "[Ambient synth intro playing]"}
                {currentTime >= 8 && currentTime < 18 && `Welcome to ${video.channelName} on Malia Live.`}
                {currentTime >= 18 && currentTime < 30 && `Today we are exploring beautiful full-stack visualizers and modular layout designs.`}
                {currentTime >= 30 && currentTime < 45 && `You can press standard keyboard shortcuts like Space/K for Play, Arrow Keys, F for Fullscreen, and T for Theater Mode.`}
                {currentTime >= 45 && `Thanks for watching! Feel free to leave a comment or subscribe to the channel.`}
              </div>
            </div>
          )}

          {/* Custom Overlay Player Bar Controls */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4 pt-10 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            
            {/* Seek progress bar slider */}
            <div className="flex items-center gap-3 w-full">
              <span className="font-mono text-[10px] text-white">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeekChange(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500 cursor-pointer h-1 rounded bg-white/25 hover:h-1.5 transition-all"
                id="player-seek-slider"
              />
              <span className="font-mono text-[10px] text-gray-300">
                {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button 
                  onClick={togglePlay} 
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-indigo-600 hover:scale-105 transition-all active:scale-95"
                  id="player-play-pause-btn"
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 fill-white text-white translate-x-0.5" />}
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-2 text-white">
                  <button 
                    onClick={toggleMute}
                    className="p-1 hover:text-indigo-400 transition-colors"
                    title="Mute/Unmute (M)"
                    id="player-mute-btn"
                  >
                    {isMuted ? <VolumeX className="h-4.5 w-4.5 text-red-400" /> : <Volume2 className="h-4.5 w-4.5 text-white" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-16 accent-indigo-500 cursor-pointer h-1 rounded-lg bg-white/20"
                    id="player-volume-slider"
                  />
                </div>

                {/* Captions Toggle */}
                <button
                  onClick={() => setCaptionsActive(!captionsActive)}
                  className={`p-1.5 rounded-lg transition-all ${captionsActive ? "text-indigo-400 bg-indigo-950/40 border border-indigo-900/40" : "text-white hover:text-indigo-400"}`}
                  title="Toggle Captions (C)"
                  id="player-captions-btn"
                >
                  <Subtitles className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Playback speed toggle widget */}
                <div className="flex items-center gap-1" id="playback-speed-widget">
                  <span className="font-mono text-[9px] text-gray-400 font-bold uppercase mr-1">Speed</span>
                  {[1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold transition-all ${
                        playbackSpeed === speed 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40" 
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                      id={`speed-btn-${speed}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Picture in Picture */}
                <button
                  onClick={togglePip}
                  className="p-1.5 rounded-lg text-white hover:text-indigo-400 transition-all"
                  title="Picture-in-Picture (P)"
                  id="player-pip-btn"
                >
                  <MonitorPlay className="h-4.5 w-4.5" />
                </button>

                {/* Theater Mode */}
                <button
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className={`p-1.5 rounded-lg transition-all ${isTheaterMode ? "text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 animate-pulse" : "text-white hover:text-indigo-400"}`}
                  title="Theater Mode (T)"
                  id="player-theater-btn"
                >
                  <Tv className="h-4.5 w-4.5" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg text-white hover:text-indigo-400 transition-all"
                  title="Fullscreen (F)"
                  id="player-fullscreen-btn"
                >
                  {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Metadata Panel */}
        <div className="mt-5" id="video-metadata-card">
          <h1 className="font-sans font-extrabold text-[#F1F1F1] text-xl md:text-2xl leading-snug">
            {video.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5">
            {/* Creator Channel branding */}
            <div className="flex items-center gap-3">
              <img
                src={video.channelLogo}
                alt={video.channelName}
                className="h-10 w-10 rounded-full object-cover border border-[#2A2A2A]"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-sans font-extrabold text-[#F1F1F1] text-sm">{video.channelName}</p>
                <p className="text-xs text-[#AAAAAA]">142K subscribers</p>
              </div>
              <button
                onClick={() => setSubbed(!subbed)}
                className={`ml-4 rounded-full px-5 py-2 text-xs font-bold tracking-tight transition-all active:scale-95 ${
                  subbed
                    ? "bg-[#2A2A2A] text-[#AAAAAA] hover:bg-[#3A3A3A] hover:text-white border border-[#3A3A3A]"
                    : "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50 hover:bg-indigo-700"
                }`}
                id="channel-subscribe-btn"
              >
                {subbed ? "Subscribed" : "Subscribe"}
              </button>
            </div>

            {/* Action Interactions */}
            <div className="flex items-center gap-3" id="video-actions-toolbar">
              <div className="flex items-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] p-1">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    liked 
                      ? "bg-indigo-950/50 text-indigo-400 font-bold" 
                      : "text-[#AAAAAA] hover:text-[#F1F1F1]"
                  }`}
                  id="like-video-btn"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{likes.toLocaleString()}</span>
                </button>
                <div className="h-4 w-px bg-[#2A2A2A] mx-1" />
                <button className="flex items-center justify-center rounded-full p-2 text-[#AAAAAA] hover:text-[#F1F1F1]" id="dislike-video-btn">
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Chapters Navigation Shelf */}
          {video.chapters && video.chapters.length > 0 && (
            <div className="mt-5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 p-4" id="video-chapters-container">
              <div className="mb-2.5 flex items-center gap-2 text-indigo-400">
                <Layers className="h-4 w-4" />
                <span className="font-sans font-bold text-xs uppercase tracking-wider">Video Chapters</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {video.chapters.map((chapter, i) => (
                  <button
                    key={i}
                    onClick={() => seekToChapter(chapter.time)}
                    className="flex items-center justify-between rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] p-2 text-left hover:border-indigo-500/50 hover:shadow-xs transition-all duration-200"
                    id={`chapter-link-${i}`}
                  >
                    <span className="font-sans font-semibold text-[#F1F1F1] text-[11px] truncate">{chapter.title}</span>
                    <span className="font-mono text-[10px] font-bold text-indigo-400 shrink-0 ml-1">
                      {Math.floor(chapter.time / 60)}:{(chapter.time % 60).toString().padStart(2, '0')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description details Card */}
          <div className="mt-5 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-4" id="video-description-card">
            <p className="font-sans font-bold text-[#F1F1F1] text-xs">
              {video.views.toLocaleString()} views • {new Date(video.uploadDate).toLocaleDateString()} • {video.category.toUpperCase()}
            </p>
            <p className="mt-2 font-sans text-xs text-[#AAAAAA] whitespace-pre-line leading-relaxed">
              {video.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {video.tags.map((tag, i) => (
                <span key={i} className="rounded-md bg-[#252525] border border-[#2A2A2A] px-2 py-0.5 font-mono text-[9px] font-semibold text-[#AAAAAA]">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Comments Forum Interface */}
        <div className="mt-8 border-t border-[#2A2A2A] pt-8" id="comments-forum-container">
          <div className="mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#AAAAAA]" />
            <h2 className="font-sans font-extrabold text-[#F1F1F1] text-base">
              Comments Forum ({comments.length})
            </h2>
          </div>

          {/* Comment input form */}
          <form onSubmit={handleSubmitComment} className="mb-6" id="add-comment-form">
            <div className="flex gap-3">
              <img
                src="https://picsum.photos/seed/user_viewer/100/100"
                alt="Your Avatar"
                className="h-9 w-9 rounded-full object-cover border border-[#2A2A2A]"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  placeholder="Join the discussion... (Server AI scans for toxicity & spam)"
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-xs text-[#F1F1F1] outline-none transition-all placeholder:text-[#777777] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-950"
                  id="new-comment-textarea"
                />
                
                {/* Submit row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-semibold">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    <span>Real-time AI Guard Mode Active</span>
                  </div>
                  <button
                    type="submit"
                    className="rounded-full bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-950/50 hover:bg-indigo-700 transition-colors"
                    id="submit-comment-btn"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* AI Toxicity Alert Banner */}
          {errorNotif && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-red-900/50 bg-red-950/20 p-4 text-xs text-red-400 animate-in fade-in zoom-in-95" id="toxic-comment-alert">
              <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="font-sans font-bold">Message Blocked by AI Content Moderator</p>
                <p className="mt-1 text-red-400 leading-relaxed font-semibold">Reason: {errorNotif}</p>
                <p className="mt-1.5 text-[10px] text-red-500/80 italic">Malia Live enforces respectful global interactions. Content violating standard community guidelines is blocked automatically.</p>
              </div>
            </div>
          )}

          {/* Comments Feed List */}
          <div className="flex flex-col gap-5 max-h-120 overflow-y-auto pr-2" id="comments-feed-list">
            {loadingComments ? (
              <p className="py-6 text-center font-mono text-xs text-[#777777] animate-pulse">Retrieving comment logs...</p>
            ) : comments.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#777777] italic">No comments yet. Be the first to start the conversation!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 border-b border-[#2A2A2A] pb-4" id={`comment-node-${comment.id}`}>
                  <img
                    src={comment.userAvatar}
                    alt={comment.username}
                    className="h-8.5 w-8.5 rounded-full object-cover border border-[#2A2A2A] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-[#F1F1F1] text-xs">{comment.username}</span>
                      <span className="font-mono text-[9px] text-[#777777]">{new Date(comment.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 font-sans text-xs text-[#AAAAAA] leading-relaxed">{comment.content}</p>
                    
                    {/* Comment Likes */}
                    <div className="mt-2.5 flex items-center gap-4">
                      <button className="flex items-center gap-1 font-mono text-[10px] font-bold text-[#777777] hover:text-indigo-400 transition-colors">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{comment.likes}</span>
                      </button>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.map((reply) => (
                      <div key={reply.id} className="mt-3.5 flex gap-2.5 border-l-2 border-[#2A2A2A] pl-4">
                        <CornerDownRight className="h-3.5 w-3.5 text-[#777777] mt-1 shrink-0" />
                        <img
                          src={reply.userAvatar}
                          alt={reply.username}
                          className="h-6.5 w-6.5 rounded-full object-cover border border-[#2A2A2A] shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-[#F1F1F1] text-xs">{reply.username}</span>
                            <span className="font-mono text-[9px] text-[#777777]">{new Date(reply.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="mt-0.5 font-sans text-xs text-[#AAAAAA] leading-relaxed">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Related Videos catalog list */}
      <div className={`${isTheaterMode ? "lg:col-span-12 mt-8" : "lg:col-span-4 mt-8 lg:mt-0"}`} id="related-videos-column">
        <h2 className="mb-4 font-sans font-extrabold text-[#F1F1F1] text-sm">Up Next</h2>
        <div className={`grid gap-4 ${isTheaterMode ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "flex flex-col"}`} id="related-videos-feed">
          {related.map((v) => (
            <div
              key={v.id}
              onClick={() => onSelectVideo(v)}
              className="group flex gap-3 cursor-pointer rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-2 hover:border-indigo-500/30 hover:shadow-xs transition-all duration-250"
              id={`related-card-${v.id}`}
            >
              <div className="relative aspect-video w-28 md:w-32 overflow-hidden rounded-lg bg-gray-900 shrink-0">
                <img
                  src={v.thumbnailUrl}
                  alt={v.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 font-mono text-[9px] text-white">
                  {v.duration}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="font-sans font-semibold text-[#F1F1F1] text-xs leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">
                  {v.title}
                </h3>
                <p className="mt-1 text-[10px] text-[#AAAAAA] font-medium truncate">{v.channelName}</p>
                <p className="text-[9px] text-[#777777] mt-0.5">{v.views.toLocaleString()} views</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
