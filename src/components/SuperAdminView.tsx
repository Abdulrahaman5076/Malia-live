import React, { useState, useEffect } from "react";
import { 
  Cpu, ShieldAlert, Settings, FolderPlus, Users, Activity, 
  CheckCircle2, XCircle, RefreshCw, PlusCircle, Save, Search, 
  AlertTriangle, Play, HelpCircle, HardDrive, Network, Shield
} from "lucide-react";
import { PlatformSettings, ClusterMetrics } from "../types";

interface SuperAdminViewProps {
  onBackToHome: () => void;
}

interface Account {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function SuperAdminView({ onBackToHome }: SuperAdminViewProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'categories' | 'accounts' | 'telemetry'>('config');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Platform Settings State
  const [settings, setSettings] = useState<PlatformSettings>({
    globalChatSlowMode: 2,
    maxVideoDuration: 60,
    cdnCacheTtl: 3600,
    safetyThreshold: 'high',
    rateLimiterEnabled: true,
    jwtExpiration: 24
  });

  // Category State
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catIcon, setCatIcon] = useState("Gamepad2");
  const [catTags, setCatTags] = useState("");

  // Accounts State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Telemetry State
  const [metrics, setMetrics] = useState<ClusterMetrics>({
    cpuUsage: [42, 45, 38, 41, 55, 60, 48, 52, 45, 49, 58, 62, 51, 47, 50],
    memoryUsage: [72, 73, 72, 74, 75, 78, 77, 76, 75, 76, 77, 78, 77, 76, 77],
    activeConnections: 12450,
    activeEncoders: 12,
    ingressBandwidth: 8.5,
    egressBandwidth: 42.1
  });

  // Fetch Admin Configuration & Accounts
  const fetchData = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // 1. Config settings
      const configRes = await fetch("/api/admin/config");
      if (configRes.ok) {
        const configData = await configRes.json();
        setSettings(configData);
      }

      // 2. Accounts
      const accountsRes = await fetch("/api/admin/accounts");
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData);
      }

      // 3. Telemetry
      const metricsRes = await fetch("/api/admin/cluster-metrics");
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error("Failed fetching Super Admin payload:", err);
      setErrorMsg("Network latency or authorization timeout on Malia Live cluster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-update telemetry in background every 5s if tab is telemetry
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/cluster-metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (e) {
        // quiet failure
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSuccessMsg("Platform settings updated successfully and applied to edge CDNs.");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg("Failed to update config options.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Cluster update rejected.");
    }
  };

  // Handle Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    if (!catName || !catDesc) {
      setErrorMsg("Please fill out name and description.");
      return;
    }

    const tagsArr = catTags.split(",").map(t => t.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName,
          description: catDesc,
          icon: catIcon,
          tags: tagsArr
        })
      });

      if (res.ok) {
        setSuccessMsg(`Category "${catName}" created and published to Homepage navigation successfully!`);
        setCatName("");
        setCatDesc("");
        setCatTags("");
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || "Failed to publish category.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not serialize category registration.");
    }
  };

  // Handle Account Update (Suspension toggle or Role change)
  const handleAccountUpdate = async (id: string, updates: { status?: string; role?: string }) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/accounts/${id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        setSuccessMsg("User account configuration updated live in production index.");
        fetchData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg("Failed to apply profile changes.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Account database write conflict.");
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => 
    acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 bg-[#0F0F0F] h-full" id="super-admin-screen">
      
      {/* Upper Brand / Info header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5" id="super-admin-header">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-950/40 text-indigo-400 shadow-md border border-indigo-900/30">
            <Shield className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-extrabold text-[#F1F1F1] text-xl md:text-2xl leading-none">
                Malia Live Core Control
              </h1>
              <span className="rounded-full bg-red-950/40 border border-red-900/40 px-2 py-0.5 text-[9px] font-mono font-bold uppercase text-red-400 tracking-widest">
                Super Admin Access
              </span>
            </div>
            <p className="text-xs text-[#AAAAAA] mt-1.5">Platform configuration, security authorization & live node telemetry panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#F1F1F1] hover:bg-[#252525] hover:border-[#3A3A3A] transition-colors"
            id="super-refresh-btn"
            title="Refresh Server Metrics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button 
            onClick={onBackToHome}
            className="rounded-full bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-md"
            id="super-exit-btn"
          >
            Exit Core Control
          </button>
        </div>
      </div>

      {/* Global Toast Alerts */}
      {successMsg && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-emerald-950/40 border border-emerald-900/30 p-4 text-xs font-semibold text-emerald-400 animate-fadeIn" id="success-toast">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-red-950/40 border border-red-900/30 p-4 text-xs font-semibold text-red-400 animate-fadeIn" id="error-toast">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[#2A2A2A]" id="super-tabs">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'config' 
              ? "border-indigo-500 text-indigo-400 font-extrabold" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="tab-btn-config"
        >
          <Settings className="h-4 w-4" />
          <span>Platform Config</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'categories' 
              ? "border-pink-500 text-pink-400 font-extrabold" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="tab-btn-categories"
        >
          <FolderPlus className="h-4 w-4" />
          <span>Category Management</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'accounts' 
              ? "border-amber-500 text-amber-400 font-extrabold" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="tab-btn-accounts"
        >
          <Users className="h-4 w-4" />
          <span>Security & Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'telemetry' 
              ? "border-emerald-500 text-emerald-400 font-extrabold" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="tab-btn-telemetry"
        >
          <Activity className="h-4 w-4 animate-pulse text-emerald-400" />
          <span>System Telemetry</span>
        </button>
      </div>

      {/* Main Panel views */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-[#777777] animate-pulse">
          Querying secure server index registry...
        </div>
      ) : (
        <>
          {/* TAB 1: PLATFORM CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="grid gap-6 lg:grid-cols-3" id="config-panel">
              {/* Settings Form */}
              <div className="lg:col-span-2 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="font-sans font-extrabold text-[#F1F1F1] text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4 text-indigo-400" />
                    <span>Global CDN & Stream Parameters</span>
                  </h2>
                  <p className="text-xs text-[#AAAAAA] mt-1">Configure real-time delays, asset cache lifetimes, and safety validation thresholds.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Global Chat Slow Mode (Seconds)</label>
                      <input 
                        type="number"
                        min="0"
                        max="60"
                        value={settings.globalChatSlowMode}
                        onChange={(e) => setSettings({ ...settings, globalChatSlowMode: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Max Video Duration (Minutes)</label>
                      <input 
                        type="number"
                        min="5"
                        max="240"
                        value={settings.maxVideoDuration}
                        onChange={(e) => setSettings({ ...settings, maxVideoDuration: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Edge CDN Cache TTL (Seconds)</label>
                      <input 
                        type="number"
                        min="60"
                        max="86400"
                        value={settings.cdnCacheTtl}
                        onChange={(e) => setSettings({ ...settings, cdnCacheTtl: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Content Safety Filter Level</label>
                      <select 
                        value={settings.safetyThreshold}
                        onChange={(e) => setSettings({ ...settings, safetyThreshold: e.target.value as 'low' | 'medium' | 'high' })}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                      >
                        <option value="low">Low Filter (Developer Sandbox)</option>
                        <option value="medium">Medium Filter (Standard Communities)</option>
                        <option value="high">High Filter (Restricted / Public Moderated)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    <div className="flex items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                      <div>
                        <p className="text-xs font-bold text-[#F1F1F1]">Global IP Rate Limiter</p>
                        <p className="text-[10px] text-[#AAAAAA] mt-0.5">Prevent high frequency stream spam.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.rateLimiterEnabled}
                        onChange={(e) => setSettings({ ...settings, rateLimiterEnabled: e.target.checked })}
                        className="h-4 w-4 rounded-md bg-[#1A1A1A] text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Session Token Lifespan (Hours)</label>
                      <input 
                        type="number"
                        min="1"
                        max="168"
                        value={settings.jwtExpiration}
                        onChange={(e) => setSettings({ ...settings, jwtExpiration: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#2A2A2A] flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white px-6 py-3 transition-all cursor-pointer shadow-lg"
                    >
                      <Save className="h-4 w-4" />
                      <span>Commit Platform Configurations</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Side Info Cards */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-indigo-950/20 to-purple-950/15 p-5 shadow-xs">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white mb-3 shadow-md">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-sm font-sans font-extrabold text-[#F1F1F1]">Audit isolated actions</h3>
                  <p className="text-xs text-[#AAAAAA] mt-2 leading-relaxed">
                    Any updates to global platform configuration are immediately locked into the system audit trail logs with critical priority alerts.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-xs">
                  <h4 className="text-[10px] text-[#AAAAAA] uppercase font-mono font-bold tracking-wider mb-3">Edge CDN nodes</h4>
                  <div className="space-y-2.5 text-xs text-[#AAAAAA]">
                    <div className="flex justify-between border-b border-[#2A2A2A]/40 pb-2">
                      <span>US West Ingress Node</span>
                      <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> ONLINE
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#2A2A2A]/40 pb-2">
                      <span>EU Frankfurt Node</span>
                      <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> ONLINE
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>APAC Tokyo Node</span>
                      <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> ONLINE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORY MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="grid gap-6 lg:grid-cols-3" id="categories-panel">
              <div className="lg:col-span-2 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="font-sans font-extrabold text-[#F1F1F1] text-sm flex items-center gap-2">
                    <FolderPlus className="h-4.5 w-4.5 text-pink-400" />
                    <span>Create Live Content Category</span>
                  </h2>
                  <p className="text-xs text-[#AAAAAA] mt-1">Publish new focus pillars to the Homepage categories bar instantly.</p>
                </div>

                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Category Display Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Design & Creative"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Icon Representation</label>
                    <select 
                      value={catIcon}
                      onChange={(e) => setCatIcon(e.target.value)}
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                    >
                      <option value="Gamepad2">Gamepad2 (Gaming, esports)</option>
                      <option value="Cpu">Cpu (Tech, coding, artificial intelligence)</option>
                      <option value="Music">Music (Live synthesis, instrument covers, audio tech)</option>
                      <option value="Utensils">Utensils (Culinary baking, dinner recipes)</option>
                      <option value="Palette">Palette (Art, UIUX design, sketching)</option>
                      <option value="Compass">Compass (Travel exploration, vlogs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Focus Description</label>
                    <textarea 
                      placeholder="e.g. Speed painting, graphic design, vectors, and digital painting sessions."
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#AAAAAA] font-mono uppercase tracking-wider font-bold mb-2">Recommended Sub-Tags (Comma Separated)</label>
                    <input 
                      type="text"
                      placeholder="Design, Illustrator, Figma, UIUX"
                      value={catTags}
                      onChange={(e) => setCatTags(e.target.value)}
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                    />
                    <p className="text-[10px] text-[#AAAAAA] mt-1.5 font-sans leading-relaxed">Viewers can use these suggested tags to search and sort content within this category.</p>
                  </div>

                  <div className="pt-4 border-t border-[#2A2A2A] flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-xs font-bold text-white px-6 py-3 transition-all cursor-pointer shadow-lg"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Publish New Category</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Side helper / Preview of dynamic navigation additions */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-pink-950/20 to-indigo-950/15 p-5 shadow-xs">
                  <h3 className="text-sm font-sans font-extrabold text-[#F1F1F1] mb-2">Instant synchronization</h3>
                  <p className="text-xs text-[#AAAAAA] leading-relaxed">
                    Adding a category creates the ID slug instantly on the Express server. The category pill list on the Homepage updates dynamically with correct icon bindings.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-xs">
                  <h4 className="text-[10px] text-[#AAAAAA] uppercase font-mono font-bold mb-3 tracking-wider">Example icon layouts</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#AAAAAA]">
                    <div className="flex items-center gap-2 rounded-lg bg-[#0F0F0F] p-3 border border-[#2A2A2A]">
                      <Cpu className="h-4 w-4 text-[#AAAAAA]" />
                      <span>Tech & AI</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-[#0F0F0F] p-3 border border-[#2A2A2A]">
                      <PlusCircle className="h-4 w-4 text-[#AAAAAA]" />
                      <span>Custom Icon</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & ACCOUNTS */}
          {activeTab === 'accounts' && (
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm overflow-hidden" id="accounts-panel">
              <div className="p-5 border-b border-[#2A2A2A] bg-[#0F0F0F] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-sans font-extrabold text-[#F1F1F1] text-sm">Security Profile Directory</h2>
                  <p className="text-xs text-[#AAAAAA] mt-0.5">Authorize channel permissions, execute account suspensions, and manage global credentials.</p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#777777]" />
                  <input 
                    type="text"
                    placeholder="Search accounts by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] pl-10 pr-4 py-2.5 text-xs text-[#F1F1F1] focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-[#AAAAAA] font-mono text-[10px] uppercase bg-[#0F0F0F]">
                      <th className="p-4">Profile</th>
                      <th className="p-4">Authentication Account</th>
                      <th className="p-4">System Access Role</th>
                      <th className="p-4">Operational Status</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-right">Emergency Directives</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="border-b border-[#2A2A2A] hover:bg-[#252525]/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                              {acc.displayName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-sans font-extrabold text-[#F1F1F1]">{acc.displayName}</p>
                              <p className="text-[10px] text-[#777777] font-mono">@{acc.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-[#AAAAAA]">{acc.email}</td>
                        <td className="p-4">
                          <select
                            value={acc.role}
                            onChange={(e) => handleAccountUpdate(acc.id, { role: e.target.value })}
                            className="rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] px-2.5 py-1.5 font-mono text-[10px] font-bold text-indigo-400 focus:border-indigo-500 focus:outline-hidden"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="creator">Creator</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                            acc.status === "active" 
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" 
                              : "bg-red-950/40 text-red-400 border border-red-900/30"
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-[#AAAAAA]">{new Date(acc.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {acc.status === "active" ? (
                            <button
                              onClick={() => handleAccountUpdate(acc.id, { status: "suspended" })}
                              className="rounded-lg bg-red-950/40 border border-red-900/30 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-xs cursor-pointer"
                            >
                              Emergency Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAccountUpdate(acc.id, { status: "active" })}
                              className="rounded-lg bg-emerald-950/40 border border-emerald-900/30 px-3 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-xs cursor-pointer"
                            >
                              Activate Account
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-[#AAAAAA] italic">No security records match filter parameters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6 animate-fadeIn" id="telemetry-panel">
              {/* Top Operational Status Rows */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950/40 text-indigo-400 border border-indigo-900/30">
                    <Activity className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold tracking-wider">Active connections</span>
                    <span className="text-base font-extrabold text-[#F1F1F1] font-mono">{metrics.activeConnections.toLocaleString()}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-950/40 text-pink-400 border border-pink-900/30">
                    <Play className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold tracking-wider">Media Encoders</span>
                    <span className="text-base font-extrabold text-[#F1F1F1] font-mono">{metrics.activeEncoders} Core Nodes</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">
                    <Network className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold tracking-wider">Ingress Bandwidth</span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">{metrics.ingressBandwidth} Gbps</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/40 text-purple-400 border border-purple-900/30">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#AAAAAA] uppercase font-mono font-bold tracking-wider">Egress CDN Bandwidth</span>
                    <span className="text-base font-extrabold text-purple-400 font-mono">{metrics.egressBandwidth} Gbps</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Charts container */}
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* CPU Utilization Area Chart */}
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-xs">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#F1F1F1] flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-indigo-400" />
                        <span>CPU Cluster Load (%)</span>
                      </h3>
                      <p className="text-[10px] text-[#AAAAAA] mt-0.5">Real-time usage across encoder pools</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-900/30 px-2 py-0.5 rounded-md">
                      {metrics.cpuUsage[metrics.cpuUsage.length - 1]}%
                    </span>
                  </div>

                  {/* Render beautiful custom SVG Area Line chart */}
                  <div className="h-44 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="300" y2="25" stroke="#2A2A2A" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="#2A2A2A" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="0" y1="75" x2="300" y2="75" stroke="#2A2A2A" strokeWidth="0.5" strokeDasharray="3 3" />

                      {/* Area Path */}
                      <path
                        d={`M 0 100 ${metrics.cpuUsage.map((val, idx) => `L ${(idx / 14) * 300} ${100 - val}`).join(" ")} L 300 100 Z`}
                        fill="url(#cpuGrad)"
                      />
                      {/* Stroke Line */}
                      <path
                        d={metrics.cpuUsage.map((val, idx) => `${idx === 0 ? "M" : "L"} ${(idx / 14) * 300} ${100 - val}`).join(" ")}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-between px-1 text-[8px] font-mono text-[#777777] pointer-events-none">
                      <span className="self-start mt-1">100%</span>
                      <span className="self-end mb-1">0%</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between font-mono text-[9px] text-[#777777]">
                    <span>60s ago</span>
                    <span>30s ago</span>
                    <span>Live Now</span>
                  </div>
                </div>

                {/* RAM Allocation Area Chart */}
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-xs">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#F1F1F1] flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-pink-400" />
                        <span>Memory Buffer Index (%)</span>
                      </h3>
                      <p className="text-[10px] text-[#AAAAAA] mt-0.5">Assigned database cluster threads memory</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-pink-400 bg-pink-950/50 border border-pink-900/30 px-2 py-0.5 rounded-md">
                      {metrics.memoryUsage[metrics.memoryUsage.length - 1]}%
                    </span>
                  </div>

                  {/* Render beautiful custom SVG Area Line chart */}
                  <div className="h-44 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="300" y2="25" stroke="#2A2A2A" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="#2A2A2A" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="0" y1="75" x2="300" y2="75" stroke="#2A2A2A" strokeWidth="0.5" strokeDasharray="3 3" />

                      {/* Area Path */}
                      <path
                        d={`M 0 100 ${metrics.memoryUsage.map((val, idx) => `L ${(idx / 14) * 300} ${100 - val}`).join(" ")} L 300 100 Z`}
                        fill="url(#memGrad)"
                      />
                      {/* Stroke Line */}
                      <path
                        d={metrics.memoryUsage.map((val, idx) => `${idx === 0 ? "M" : "L"} ${(idx / 14) * 300} ${100 - val}`).join(" ")}
                        fill="none"
                        stroke="#ec4899"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-between px-1 text-[8px] font-mono text-[#777777] pointer-events-none">
                      <span className="self-start mt-1">100%</span>
                      <span className="self-end mb-1">0%</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between font-mono text-[9px] text-[#777777]">
                    <span>60s ago</span>
                    <span>30s ago</span>
                    <span>Live Now</span>
                  </div>
                </div>

              </div>

              {/* Disaster recovery, DB clusters checks */}
              <div className="rounded-2xl border border-amber-950/40 bg-amber-950/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F1F1F1]">Malia Live Disaster Recovery Protocols</h4>
                    <p className="text-[11px] text-[#AAAAAA] mt-1 leading-relaxed">
                      All cluster memory pools reside on geographically isolated replicas. Redundant storage configurations operate with failover automation.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => alert("Simulated database cluster snapshot saved successfully.")}
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 text-[10px] font-bold text-black px-4 py-2 transition-all shrink-0 cursor-pointer"
                >
                  Create Live State Snapshot
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
