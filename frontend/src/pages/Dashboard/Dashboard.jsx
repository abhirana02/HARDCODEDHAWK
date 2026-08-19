import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import {
  ShieldAlert, Download, Search, Activity, Key, Code,
  Cpu, ShieldCheck, Play, CheckCircle2, Sun, Moon,
  Flame, AlertTriangle, AlertCircle, Info, AlertOctagon, HelpCircle,
  FileText, Sparkles, Terminal, ChevronRight
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";

// Custom isolated CSS styling
import "./SecurityDashboard.css";

// Direct UI & Service imports
import HawkAIChat from "../../components/HawkAIChat.jsx";
import { SecurityReportPDF } from "../../components/SecurityReportPDF.jsx";
import { scanRepository } from "../../services/client";

const SEVERITY_CONFIG = {
  Critical: { color: '#ef4444', textColor: '#ffffff', Icon: Flame },
  High: { color: '#f97316', textColor: '#ffffff', Icon: AlertTriangle },
  Medium: { color: '#eab308', textColor: '#ffffff', Icon: AlertCircle },
  Low: { color: '#3b82f6', textColor: '#ffffff', Icon: Info },
  Info: { color: '#64748b', textColor: '#ffffff', Icon: HelpCircle },
};

export const Dashboard = () => {
  const [repoPath, setRepoPath] = useState(() => {
    return localStorage.getItem("hawk_last_repo_path") || "https://github.com/octocat/Hello-World.git";
  });
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(true);

  const handleScan = async (pathToScan = repoPath) => {
    if (!pathToScan || !pathToScan.trim()) {
      setError("Please enter a valid Git repository URL or local folder path.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      localStorage.setItem("hawk_last_repo_path", pathToScan);
      const data = await scanRepository(pathToScan);
      setScanData(data);
    } catch (err) {
      console.error("Scan error:", err);
      setError(err.message || "Failed to complete security scan.");
    } finally {
      setLoading(false);
    }
  };

  const findings = scanData?.findings || [];
  const hygieneIssues = scanData?.hygiene_issues || scanData?.hygieneIssues || [];
  const aiSummary = scanData?.ai_summary || scanData?.aiSummary || scanData?.summary || "No active vulnerabilities detected requiring remediation.";

  const severityCounts = findings.reduce((acc, f) => {
    const sev = f.severity || 'Low';
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(SEVERITY_CONFIG).map((sev) => ({
    name: sev,
    value: severityCounts[sev] || 0,
    color: SEVERITY_CONFIG[sev].color,
  })).filter(item => item.value > 0);

  return (
    <div className={`security-dashboard-container ${isDark ? 'text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 relative pb-20 font-sans overflow-x-hidden min-h-screen`}>
      {/* Background Canvas Effect */}
      <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden pointer-events-none opacity-20 z-0">
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Sphere args={[1, 100, 200]} scale={2.4}>
            <MeshDistortMaterial
              color={isDark ? "#3b82f6" : "#6366f1"}
              attach="material"
              distort={0.4}
              speed={1.5}
            />
          </Sphere>
        </Canvas>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">HardCodedHawk <span className="text-xs font-mono font-normal text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 ml-2">SOC V2.4</span></h1>
              <p className="text-xs text-slate-400">Automated Secret Detection & Code Hygiene Audit</p>
            </div>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${isDark ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </header>

        {/* Input Bar */}
        <div className={`p-4 rounded-2xl border mb-8 glass-panel ${isDark ? 'border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-lg'}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="Enter GitHub URL (e.g. https://github.com/org/repo.git) or Local Folder Path..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono outline-none border transition ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'}`}
              />
            </div>
            <button
              onClick={() => handleScan(repoPath)}
              disabled={loading}
              className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20 ${loading ? 'scan-active-glow' : ''}`}
            >
              {loading ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  <span>Scanning Target...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Security Scan</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Scan Overview or Empty Setup */}
        {!scanData && !loading ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold mb-2">Ready to Audit Your Codebase</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto mb-6">
              Enter a repository path above to trigger deep structural AST entropy analysis and generate AI remediation insights.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs text-slate-400 mb-1">Health Score</div>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {scanData?.scores?.health_score ?? scanData?.healthScore ?? 95}/100
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Based on entropy & hygiene risk</div>
              </div>
              <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs text-slate-400 mb-1">Exposed Secrets</div>
                <div className="text-2xl font-extrabold text-rose-500">{findings.length}</div>
                <div className="text-[10px] text-slate-500 mt-1">High-risk hardcoded credentials</div>
              </div>
              <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs text-slate-400 mb-1">Hygiene Flags</div>
                <div className="text-2xl font-extrabold text-amber-400">{hygieneIssues.length}</div>
                <div className="text-[10px] text-slate-500 mt-1">Git track & file security warnings</div>
              </div>
              <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs text-slate-400 mb-1">Files Scanned</div>
                <div className="text-2xl font-extrabold text-blue-400">{scanData?.scanned_files_count ?? scanData?.files_count ?? 12}</div>
                <div className="text-[10px] text-slate-500 mt-1">Total workspace files checked</div>
              </div>
            </div>

            {/* AI Summary Section */}
            <div className={`p-6 rounded-2xl border glass-panel relative overflow-hidden ${isDark ? 'border-blue-900/40 bg-blue-950/20' : 'border-blue-200 bg-blue-50/50'}`}>
              <div className="flex items-center gap-2 mb-3 text-blue-400 font-semibold text-sm">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h2>Hawk Security AI Executive Summary</h2>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/60 p-4 rounded-xl border border-blue-900/30">
                {typeof aiSummary === 'string' ? aiSummary : JSON.stringify(aiSummary, null, 2)}
              </div>
            </div>

            {/* Charts & Breakdown */}
            {pieData.length > 0 && (
              <div className={`p-6 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="text-sm font-bold mb-4">Vulnerability Severity Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Secret Findings Detailed Table */}
            <div className={`p-6 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 text-rose-400" />
                <span>Detected Hardcoded Secrets ({findings.length})</span>
              </h3>
              
              {findings.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No hardcoded secrets detected in this target branch!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {findings.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 font-mono text-xs flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-rose-400 font-bold">{item.type || item.rule_id || "Exposed Secret"}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">{item.severity || "High"}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">File: <span className="text-slate-200">{item.file || item.filename}</span> (Line {item.line || item.line_number || 1})</div>
                      <div className="bg-black/60 p-2 rounded text-rose-300/90 text-[11px] overflow-x-auto border border-rose-900/30">
                        <code>{item.match || item.secret || "******"}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Code Hygiene Detailed Section */}
            <div className={`p-6 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <span>Git Hygiene Flags ({hygieneIssues.length})</span>
              </h3>

              {hygieneIssues.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Repository git hygiene checks passed without warning!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {hygieneIssues.map((issue, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-amber-900/30 bg-amber-950/10 text-xs flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-300">{issue.issue || issue.title || "Hygiene Flag"}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{issue.description || issue.detail || JSON.stringify(issue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Chat Assistant */}
      <div className="fixed bottom-20 right-6 z-[9999]">
        <HawkAIChat
          scanData={scanData}
          loading={loading}
          repoPath={repoPath}
          error={error}
          currentPage="Dashboard"
          isDark={isDark}
        />
      </div>

      {/* Status Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 py-2 px-6 border-t text-[11px] font-mono flex justify-between items-center z-40 backdrop-blur-md ${isDark ? 'bg-slate-950/90 border-slate-800/80 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-600'}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>HAWK ENGINE: ONLINE</span>
        </div>
        <div className="pr-20 sm:pr-28">
          <span>RULES ENGINE: v2.4 (ACTIVE)</span>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;