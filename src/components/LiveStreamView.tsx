import React, { useState, useEffect, useRef } from "react";
import { Send, Users, Sparkles, Heart, Radio, Activity, AlertCircle, HelpCircle, Terminal, RefreshCw, MessageSquare } from "lucide-react";
import { Livestream, ChatMessage } from "../types";

interface LiveStreamViewProps {
  stream: Livestream;
}

export default function LiveStreamView({ stream }: LiveStreamViewProps) {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [newChat, setNewChat] = useState("");
  const [likes, setLikes] = useState(140);
  const [viewerCount, setViewerCount] = useState(stream.viewersCount);
  const [activeTab, setActiveTab] = useState<'chat' | 'cohost'>('chat');

  // AI Co-host states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSentiment, setAiSentiment] = useState<{ summary: string; sentiment: string; toxicityIndex: string; topics: string[] } | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Manage WebSocket connection for real-time interaction
  useEffect(() => {
    // 1. Initial REST fetch for backlog
    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/livestreams/${stream.id}/chat`);
        const data = await res.json();
        setChats(data);
      } catch (err) {
        console.error("Failed fetching stream chats:", err);
      }
    };

    fetchChats();

    // 2. Establish WebSocket connection
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socketUrl = `${protocol}//${window.location.host}/api/livestreams/${stream.id}/ws`;
      
      console.log("Connecting to Live Chat WebSocket:", socketUrl);
      ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat') {
            setChats(prev => {
              if (prev.some(m => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          } else if (data.type === 'viewer_count') {
            setViewerCount(data.count);
          } else if (data.type === 'like') {
            setLikes(data.likes);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message on client:", err);
        }
      };

      ws.onclose = () => {
        console.log("Live Chat WebSocket closed. Attempting reconnect in 3s...");
        reconnectTimeout = setTimeout(() => {
          connectWS();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error("Live Chat WebSocket error:", err);
        ws?.close();
      };
    };

    connectWS();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        // Remove close listener first to prevent infinite reconnect loop on unmount
        ws.onclose = null;
        ws.close();
      }
    };
  }, [stream.id]);

  // Scroll to bottom on new chats
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chats]);

  // Submit chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChat.trim()) return;

    const msgContent = newChat;
    setNewChat("");

    // If WebSocket is open, send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'chat',
          content: msgContent
        }));
        return;
      } catch (err) {
        console.error("Failed to send chat over WebSocket, falling back to REST:", err);
      }
    }

    // Fallback: Send over standard HTTP REST
    try {
      const res = await fetch(`/api/livestreams/${stream.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgContent })
      });

      const data = await res.json();
      
      // Update chat feed locally in case we are offline/disconnected from WS
      setChats(prev => {
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    } catch (err) {
      console.error("Failed sending chat message:", err);
    }
  };

  // Submit query to Gemini AI Stream Assistant
  const handleQueryAiCoHost = async (overridePrompt?: string) => {
    const queryStr = overridePrompt || aiPrompt;
    if (!queryStr.trim()) return;

    setLoadingAi(true);
    setAiResponse("");
    try {
      const res = await fetch(`/api/livestreams/${stream.id}/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: queryStr })
      });
      const data = await res.json();
      setAiResponse(data.answer || "Co-host experienced a pipeline timeout.");
      if (!overridePrompt) setAiPrompt("");
    } catch (err) {
      console.error("Co-host query failed:", err);
      setAiResponse("Network failure querying Gemini API.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Ask Gemini for live sentiment/chat analytics
  const handleAnalyzeChatSentiment = async () => {
    setLoadingSentiment(true);
    setAiSentiment(null);
    try {
      const res = await fetch(`/api/livestreams/${stream.id}/analytics`, {
        method: "POST"
      });
      const data = await res.json();
      setAiSentiment(data);
    } catch (err) {
      console.error("Sentiment analysis failed:", err);
    } finally {
      setLoadingSentiment(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-[#0F0F0F]" id="live-broadcasting-studio">
      
      {/* Left Pane: Active stream capture canvas */}
      <div className="flex-1 flex flex-col p-4 md:p-6 justify-between overflow-y-auto" id="stage-panel">
        
        {/* Stream Canvas */}
        <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-[#2A2A2A] shadow-2xl" id="canvas-container">
          {/* Simulated HLS Stream */}
          <video
            src={stream.streamUrl}
            autoPlay
            loop
            muted
            className="h-full w-full object-cover opacity-80"
            id="stage-feed"
          />

          {/* Graphic overlays & stats */}
          <div className="absolute top-4 left-4 flex gap-2" id="canvas-badges">
            <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 font-sans text-xs font-extrabold uppercase text-white shadow-md animate-pulse">
              <Radio className="h-3.5 w-3.5" />
              <span>LIVE</span>
            </span>
            <span className="flex items-center gap-1 rounded-md bg-black/65 px-2.5 py-1 font-sans text-xs font-semibold text-gray-200 backdrop-blur-md">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              <span>{viewerCount.toLocaleString()} watching</span>
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10">
            <div className="rounded-xl bg-black/65 p-4 backdrop-blur-md border border-[#2A2A2A] max-w-xl">
              <h1 className="font-sans font-extrabold text-white text-base md:text-lg line-clamp-1">
                {stream.title}
              </h1>
              <p className="mt-1 text-xs text-gray-300 font-medium">{stream.channelName}</p>
            </div>
            
            <button 
              onClick={() => setLikes(prev => prev + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-lg active:scale-90 transition-transform"
              id="like-broadcaster-btn"
            >
              <Heart className="h-5 w-5 fill-white" />
            </button>
          </div>
        </div>

        {/* Detailed Stream Information Accordion */}
        <div className="mt-6 border border-[#2A2A2A] rounded-2xl bg-[#1A1A1A] p-5" id="stream-info-accordion">
          <h2 className="font-sans font-extrabold text-white text-sm">Session Information</h2>
          <p className="mt-2 text-xs text-gray-400 leading-relaxed">
            {stream.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {stream.tags.map((tag, i) => (
              <span key={i} className="rounded-md bg-[#252525] px-2.5 py-0.5 font-mono text-[10px] text-gray-300">
                #{tag}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Right Pane: Interactive Live Chat & AI Assistant Tab Group */}
      <div className="w-full xl:w-96 border-t xl:border-t-0 xl:border-l border-[#2A2A2A] bg-[#0F0F0F] flex flex-col h-110 xl:h-full shrink-0" id="interaction-sidebar">
        
        {/* Toggle tabs */}
        <div className="flex border-b border-[#2A2A2A]" id="sidebar-tab-selectors">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'chat' 
                ? "border-b-2 border-indigo-500 text-white" 
                : "text-gray-400 hover:text-white"
            }`}
            id="tab-chat-trigger"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Live Chat</span>
          </button>
          
          <button
            onClick={() => setActiveTab('cohost')}
            className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'cohost' 
                ? "border-b-2 border-indigo-500 text-white" 
                : "text-gray-400 hover:text-white"
            }`}
            id="tab-cohost-trigger"
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>AI Co-Host</span>
          </button>
        </div>

        {/* Live Chat Tab Screen */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden" id="tab-screen-chat">
            
            {/* Chats list */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrollbar-thin scrollbar-thumb-white/10"
              id="live-chat-messages-scroller"
            >
              {chats.map((chat) => {
                const isBlocked = chat.content.includes("Blocked by Automated");
                const isBot = chat.userId.startsWith("user_bot_");
                return (
                  <div key={chat.id} className="text-xs flex gap-2.5 items-start" id={`chat-msg-${chat.id}`}>
                    <img
                      src={chat.userAvatar}
                      alt={chat.username}
                      className="h-6.5 w-6.5 rounded-full object-cover shrink-0 border border-[#2A2A2A]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className={`font-sans font-bold ${
                          chat.role === "admin" 
                            ? "text-emerald-400" 
                            : chat.role === "creator"
                            ? "text-pink-400"
                            : isBot
                            ? "text-purple-400"
                            : "text-gray-300"
                        }`}>
                          {chat.username}
                        </span>
                        {chat.role && chat.role !== "viewer" && (
                          <span className="rounded bg-[#252525] px-1 py-0.2 text-[8px] font-mono text-gray-400 font-extrabold uppercase">
                            {chat.role}
                          </span>
                        )}
                      </div>
                      <p className={`font-sans leading-relaxed ${
                        isBlocked 
                          ? "text-red-400 font-semibold italic" 
                          : "text-gray-200"
                      }`}>
                        {chat.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input message form */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-[#2A2A2A] bg-[#1A1A1A] flex gap-2 items-center" id="live-chat-input-row">
              <input
                type="text"
                placeholder={stream.chatSettings.subscriberOnly ? "Subscribers only chat..." : "Send a message..."}
                value={newChat}
                onChange={(e) => setNewChat(e.target.value)}
                className="flex-1 rounded-full border border-[#2A2A2A] bg-[#0F0F0F] py-2 px-4 text-xs text-white outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500 focus:bg-[#1A1A1A]"
                id="live-chat-input"
              />
              <button 
                type="submit" 
                className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all"
                id="send-chat-submit-btn"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

          </div>
        )}

        {/* AI Co-Host Tab Screen */}
        {activeTab === 'cohost' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto p-4 gap-4" id="tab-screen-cohost">
            
            {/* Quick Actions Drawer */}
            <div className="flex flex-col gap-2.5" id="cohost-action-toolbox">
              <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-indigo-400">Co-Host Commands</p>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAnalyzeChatSentiment}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-white text-[11px] font-semibold text-left transition-colors border border-[#2A2A2A]"
                  id="cohost-sentiment-btn"
                >
                  <Activity className="h-3.5 w-3.5 text-pink-400" />
                  <span>Analyze Sentiment</span>
                </button>
                <button
                  onClick={() => handleQueryAiCoHost("Draft a welcoming announcement encouraging subscribers to ask coding questions.")}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-white text-[11px] font-semibold text-left transition-colors border border-[#2A2A2A]"
                  id="cohost-announce-btn"
                >
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  <span>Welcome Announcement</span>
                </button>
              </div>
            </div>

            {/* Sentiment Reports output */}
            {loadingSentiment ? (
              <div className="rounded-xl bg-[#1A1A1A] p-3.5 border border-[#2A2A2A] animate-pulse flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-pink-400 animate-spin mr-2" />
                <span className="font-mono text-xs text-gray-400">Synthesizing sentiment matrix...</span>
              </div>
            ) : aiSentiment ? (
              <div className="rounded-xl bg-indigo-950/20 border border-indigo-900/30 p-4" id="cohost-sentiment-report">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase font-mono tracking-wider mb-2">
                  <Activity className="h-4 w-4" />
                  <span>AI Chat Analytics Report</span>
                </div>
                <p className="text-xs text-gray-250 leading-relaxed font-semibold">" {aiSentiment.summary} "</p>
                
                <div className="mt-3.5 grid grid-cols-2 gap-3.5 border-t border-[#2A2A2A] pt-3">
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase font-mono">Chat Mood</span>
                    <span className="text-xs text-indigo-300 font-bold">{aiSentiment.sentiment}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase font-mono">Toxicity Rating</span>
                    <span className="text-xs text-emerald-400 font-bold">{aiSentiment.toxicityIndex}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="block text-[10px] text-gray-500 uppercase font-mono mb-1">Topics Discussed</span>
                  <div className="flex flex-wrap gap-1">
                    {aiSentiment.topics.map((topic, i) => (
                      <span key={i} className="rounded-md bg-[#252525] px-1.5 py-0.5 text-[9px] text-gray-300 font-semibold font-mono">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Conversation Area */}
            <div className="flex-1 flex flex-col justify-end gap-3.5 border-t border-[#2A2A2A] pt-4 overflow-hidden" id="cohost-dialog-terminal">
              
              <div className="flex-1 overflow-y-auto max-h-56 p-3 rounded-xl bg-[#151515] border border-[#2A2A2A] font-mono text-xs leading-relaxed text-emerald-400 scrollbar-none" id="terminal-screen">
                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] border-b border-[#2A2A2A] pb-1.5 mb-2 uppercase">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Interactive Co-Host Log</span>
                </div>
                {loadingAi ? (
                  <p className="text-indigo-400 animate-pulse font-semibold">&gt; Analyzing chat trends with Gemini 3.5 Flash...</p>
                ) : aiResponse ? (
                  <p className="text-gray-200 whitespace-pre-line leading-relaxed font-semibold">{aiResponse}</p>
                ) : (
                  <p className="text-gray-500 italic font-semibold">Co-host is offline. Ask anything about chat activities or stream summary updates.</p>
                )}
              </div>

              {/* Inquiry Prompt form */}
              <div className="flex gap-2" id="cohost-prompt-input-row">
                <input
                  type="text"
                  placeholder="Ask AI Assistant (e.g. Summarize chatter)"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] py-2 px-3 text-xs text-white outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500 focus:bg-[#1A1A1A]"
                  id="ai-cohost-query-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleQueryAiCoHost()}
                />
                <button
                  onClick={() => handleQueryAiCoHost()}
                  disabled={loadingAi || !aiPrompt.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
                  id="cohost-query-submit-btn"
                >
                  Ask
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
