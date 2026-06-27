import React, { useState, useEffect } from "react";
import { Search, Bell, Shield, Radio, Video, LogOut, Sparkles, UserCheck, Sun, Moon } from "lucide-react";
import { User } from "../types";

interface NavigationProps {
  currentUser: User;
  onSearch: (query: string) => void;
  activeView: string;
  onChangeView: (view: string) => void;
  onRoleSwitch: (role: 'viewer' | 'creator' | 'admin' | 'super_admin') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function Navigation({
  currentUser,
  onSearch,
  activeView,
  onChangeView,
  onRoleSwitch,
  theme = 'dark',
  onToggleTheme
}: NavigationProps) {
  const [searchVal, setSearchVal] = useState("");
  const [notifications, setNotifications] = useState<string[]>([
    "Welcome to Malia Live! Enjoy global high-fidelity streams.",
    "ByteCraft Studio uploaded: How I Built a Real-Time Audio Synthesizer in React 19!",
    "Your creator application is active."
  ]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    // Add real-time simulated alerts based on user role
    const interval = setInterval(() => {
      if (currentUser.role === "admin") {
        setNotifications(prev => [
          `[Admin Alert] New creator application submitted by AstroVlogs!`,
          ...prev
        ]);
      } else if (currentUser.role === "creator") {
        setNotifications(prev => [
          `[Studio Alert] You gained 5 new subscribers in the last hour!`,
          ...prev
        ]);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [currentUser.role]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#2A2A2A] bg-[#0F0F0F]/95 px-6 py-3.5 backdrop-blur-md" id="app-header">
      {/* Brand Logo */}
      <div 
        className="flex cursor-pointer items-center gap-2.5 transition-transform active:scale-95"
        onClick={() => {
          setSearchVal("");
          onSearch("");
          onChangeView("home");
        }}
        id="header-brand-logo"
      >
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 shadow-md">
          <Radio className="h-5.5 w-5.5 text-white animate-pulse" />
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-extrabold tracking-tight text-[#F1F1F1] text-xl leading-none">
            MALIA
          </span>
          <span className="font-mono text-[9px] tracking-widest text-indigo-400 uppercase font-semibold">
            live platform
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden max-w-md flex-1 items-center gap-2 md:flex mx-8" id="header-search-form">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search creators, tags, live games..."
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              onSearch(e.target.value);
            }}
            className="w-full rounded-full border border-[#3A3A3A] bg-[#1A1A1A] py-2 pl-4 pr-11 text-sm text-[#F1F1F1] outline-none transition-all placeholder:text-[#777777] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-950"
            id="search-input-field"
          />
          <button 
            type="submit" 
            className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2A2A] text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
            id="search-submit-btn"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Interactive Controls & Role Switcher */}
      <div className="flex items-center gap-4" id="header-interactive-menu">
        
        {/* Role Switch Tabs */}
        <div className="flex items-center gap-1.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] p-1 text-xs font-medium" id="role-switcher-group">
          <button
            onClick={() => onRoleSwitch("viewer")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-all ${
              currentUser.role === "viewer"
                ? "bg-[#2A2A2A] text-indigo-400 font-semibold"
                : "text-[#AAAAAA] hover:text-white"
            }`}
            id="switch-role-viewer"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Viewer</span>
          </button>
          
          <button
            onClick={() => onRoleSwitch("creator")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-all ${
              currentUser.role === "creator"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-[#AAAAAA] hover:text-white"
            }`}
            id="switch-role-creator"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Studio</span>
          </button>
          
          <button
            onClick={() => onRoleSwitch("admin")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-all ${
              currentUser.role === "admin"
                ? "bg-[#2A2A2A] text-emerald-400 font-semibold"
                : "text-[#AAAAAA] hover:text-white"
            }`}
            id="switch-role-admin"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin</span>
          </button>

          <button
            onClick={() => onRoleSwitch("super_admin")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-all ${
              currentUser.role === "super_admin"
                ? "bg-indigo-950/50 text-indigo-400 font-semibold border border-indigo-900/40"
                : "text-[#AAAAAA] hover:text-white"
            }`}
            id="switch-role-superadmin"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Super Admin</span>
          </button>
        </div>

        {/* Short Shorts Trigger */}
        <button
          onClick={() => onChangeView("shorts")}
          className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-medium transition-colors ${
            activeView === "shorts" 
              ? "bg-pink-950/45 text-pink-400 border border-pink-900/50" 
              : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#AAAAAA] hover:bg-[#252525] hover:text-white"
          }`}
          id="trigger-shorts-btn"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
          <span>Shorts</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#AAAAAA] hover:bg-[#2A2A2A] hover:text-white transition-colors"
            id="notification-bell-btn"
          >
            <Bell className="h-4.5 w-4.5" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white leading-none">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2" id="notification-dropdown">
              <div className="mb-2.5 flex items-center justify-between border-b border-[#2A2A2A] pb-2">
                <span className="font-sans font-semibold text-[#F1F1F1] text-sm">Notifications</span>
                <button 
                  onClick={() => setNotifications([])} 
                  className="font-mono text-[10px] text-[#AAAAAA] hover:text-indigo-400"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center font-sans text-xs text-[#777777]">All caught up!</p>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="rounded-lg bg-[#252525] p-2.5 text-xs text-[#AAAAAA] hover:bg-[#2A2A2A] transition-colors leading-relaxed">
                      {n}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher Toggle */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#AAAAAA] hover:bg-[#2A2A2A] hover:text-white transition-colors"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            id="theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-400" />}
          </button>
        )}

        {/* Profile Card */}
        <div className="flex items-center gap-2 border-l border-[#2A2A2A] pl-4" id="navigation-profile-badge">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.displayName}
            className="h-8 w-8 rounded-full border border-[#2A2A2A] object-cover shadow-xs"
            referrerPolicy="no-referrer"
            id="nav-profile-img"
          />
          <div className="hidden flex-col items-start xl:flex">
            <span className="font-sans font-semibold text-[#F1F1F1] text-xs leading-tight">
              {currentUser.displayName}
            </span>
            <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-semibold font-mono uppercase tracking-wider leading-none">
              <UserCheck className="h-2.5 w-2.5 text-indigo-400" />
              {currentUser.role}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
