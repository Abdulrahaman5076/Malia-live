import { useState, useEffect } from "react";
import { Shield, Users, Radio, AlertCircle, CheckCircle, XCircle, RefreshCw, Layers } from "lucide-react";
import { AuditLog } from "../types";

interface CreatorApp {
  id: string;
  channelName: string;
  ownerUsername: string;
  description: string;
  submissionDate: string;
  status: string;
}

interface FlaggedChat {
  id: string;
  username: string;
  content: string;
  classification: string;
  timestamp: string;
}

interface AdminPortalViewProps {
  onBackToHome: () => void;
}

export default function AdminPortalView({ onBackToHome }: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<'applications' | 'toxicity' | 'audit'>('applications');
  const [apps, setApps] = useState<CreatorApp[]>([]);
  const [flagged, setFlagged] = useState<FlaggedChat[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const appsRes = await fetch("/api/admin/creator-applications");
      const appsData = await appsRes.json();
      setApps(appsData);

      const toxRes = await fetch("/api/admin/moderation/flagged-chats");
      const toxData = await toxRes.json();
      setFlagged(toxData);

      const logsRes = await fetch("/api/admin/audit-logs");
      const logsData = await logsRes.json();
      setLogs(logsData);
    } catch (err) {
      console.error("Failed fetching admin portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Approve/reject creator app
  const handleCreatorAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/creator-applications/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Restore/clear flagged chat violation
  const handleRestoreChat = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/moderation/flagged-chats/${id}/clear`, {
        method: "POST"
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 bg-[#0F0F0F] h-full" id="admin-hub-screen">
      
      {/* Admin header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5" id="admin-header">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A1A1A] text-emerald-400 shadow-md border border-[#2A2A2A]">
            <Shield className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="font-sans font-extrabold text-[#F1F1F1] text-xl md:text-2xl leading-none">
              Platform Administration Hub
            </h1>
            <p className="text-xs text-[#AAAAAA] mt-1">Super Administrator, Customer Support & Content Moderation Console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchAdminData}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#F1F1F1] hover:bg-[#252525] hover:border-[#3A3A3A] transition-colors"
            id="refresh-admin-btn"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button 
            onClick={onBackToHome}
            className="rounded-full bg-[#1A1A1A] border border-[#2A2A2A] px-5 py-2 text-xs font-bold text-[#F1F1F1] hover:bg-[#252525] hover:border-[#3A3A3A] transition-all"
            id="exit-admin-btn"
          >
            Exit Hub
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[#2A2A2A]" id="admin-tabs">
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'applications' 
              ? "border-indigo-500 text-indigo-400 font-extrabold" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="admin-tab-apps"
        >
          <Users className="h-4 w-4" />
          <span>Creator Verification ({apps.filter(a => a.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('toxicity')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'toxicity' 
              ? "border-red-500 text-red-400 font-extrabold" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="admin-tab-tox"
        >
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>Violations Logs ({flagged.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'audit' 
              ? "border-emerald-500 text-emerald-400 font-extrabold" 
              : "border-transparent text-[#AAAAAA] hover:text-[#F1F1F1]"
          }`}
          id="admin-tab-audit"
        >
          <Layers className="h-4 w-4" />
          <span>System Audit Trails</span>
        </button>
      </div>

      {/* Content Panels */}
      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-gray-400 animate-pulse">Syncing platform parameters...</div>
      ) : (
        <>
          {/* Applications list */}
          {activeTab === 'applications' && (
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm overflow-hidden" id="admin-apps-table">
              <div className="p-5 border-b border-[#2A2A2A] bg-[#0F0F0F]">
                <h2 className="font-sans font-extrabold text-[#F1F1F1] text-sm">Channel Authorization Queue</h2>
                <p className="text-xs text-[#AAAAAA]">Review submitted application notes to unlock live streaming broadcasting parameters.</p>
              </div>

              {apps.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#AAAAAA] italic">No creator applications pending review.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-[#AAAAAA] font-mono text-[10px] uppercase bg-[#0F0F0F]">
                        <th className="p-4">Requested Channel</th>
                        <th className="p-4">Owner Account</th>
                        <th className="p-4">Proposed Content description</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apps.map((app) => (
                        <tr key={app.id} className="border-b border-[#2A2A2A] hover:bg-[#252525]/30 transition-colors">
                          <td className="p-4 font-sans font-extrabold text-[#F1F1F1] text-xs">{app.channelName}</td>
                          <td className="p-4 font-mono text-[11px] text-[#AAAAAA]">@{app.ownerUsername}</td>
                          <td className="p-4 font-sans text-[#AAAAAA] max-w-sm leading-relaxed truncate">{app.description}</td>
                          <td className="p-4">
                            <span className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                              app.status === "pending" ? "bg-amber-950/40 text-amber-400 border border-amber-900/30" :
                              app.status === "approved" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" :
                              "bg-[#0F0F0F] text-[#AAAAAA] border border-[#2A2A2A]"
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            {app.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleCreatorAction(app.id, 'approve')}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
                                  id={`approve-btn-${app.id}`}
                                >
                                  <CheckCircle className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  onClick={() => handleCreatorAction(app.id, 'reject')}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/40 border border-red-900/30 text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-xs"
                                  id={`reject-btn-${app.id}`}
                                >
                                  <XCircle className="h-4.5 w-4.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Toxicity violation flags list */}
          {activeTab === 'toxicity' && (
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm overflow-hidden" id="admin-tox-panel">
              <div className="p-5 border-b border-[#2A2A2A] bg-[#0F0F0F]">
                <h2 className="font-sans font-extrabold text-[#F1F1F1] text-sm">Automated safety Violation Dashboard</h2>
                <p className="text-xs text-[#AAAAAA]">Scanned and filtered using server-side Google Gemini content safety modules.</p>
              </div>

              {flagged.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#AAAAAA] italic">
                  <CheckCircle className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                  <span>No active safety violations flagged. Chat channels are perfectly clean!</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-[#AAAAAA] font-mono text-[10px] uppercase bg-[#0F0F0F]">
                        <th className="p-4">Sender Account</th>
                        <th className="p-4">Violating Content message</th>
                        <th className="p-4">AI Scan Flag Classification</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4 text-right">Moderator overrides</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flagged.map((flag) => (
                        <tr key={flag.id} className="border-b border-[#2A2A2A] hover:bg-[#252525]/30 transition-colors">
                          <td className="p-4 font-sans font-extrabold text-[#F1F1F1]">@{flag.username}</td>
                          <td className="p-4 font-sans text-red-400 font-semibold max-w-sm leading-relaxed">{flag.content}</td>
                          <td className="p-4">
                            <span className="rounded-md bg-red-950/40 border border-red-900/30 px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase text-red-400 tracking-wider">
                              {flag.classification}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[11px] text-[#AAAAAA]">{new Date(flag.timestamp).toLocaleTimeString()}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleRestoreChat(flag.id)}
                              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                              id={`restore-chat-btn-${flag.id}`}
                            >
                              Clear Override
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Audit logs panel */}
          {activeTab === 'audit' && (
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm overflow-hidden" id="admin-audit-logs">
              <div className="p-5 border-b border-[#2A2A2A] bg-[#0F0F0F]">
                <h2 className="font-sans font-extrabold text-[#F1F1F1] text-sm">System Operations Audit Trail</h2>
                <p className="text-xs text-[#AAAAAA]">Cryptographically isolated and logged events on Malia Live cluster.</p>
              </div>

              <div className="p-4 max-h-110 overflow-y-auto flex flex-col gap-2 font-mono text-[11px]" id="audit-logs-scroller">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 leading-relaxed ${
                      log.type === "critical" ? "bg-red-950/20 border-red-900/30 text-red-400" :
                      log.type === "warning" ? "bg-amber-950/20 border-amber-900/30 text-amber-400" :
                      "bg-[#0F0F0F] border-[#2A2A2A] text-[#AAAAAA]"
                    }`}
                  >
                    <div className="flex-1">
                      <span className="font-bold uppercase inline-block mr-2 text-[10px] tracking-wider font-mono">
                        [{log.action}]
                      </span>
                      <span>{log.details}</span>
                    </div>
                    <div className="text-right text-[#888888] text-[10px] shrink-0 font-medium font-mono">
                      <span>By {log.username}</span> • <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
