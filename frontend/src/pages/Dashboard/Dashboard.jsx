import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import {
  ShieldAlert, Search, Key, Code, Cpu, ShieldCheck, Play, 
  CheckCircle2, Sun, Moon, Flame, AlertTriangle, AlertCircle, 
  Info, AlertOctagon, HelpCircle, Sparkles, Terminal, ArrowRight,
  Zap, Lock, FileCode2, GitBranch, Layers, UploadCloud, FileArchive, X
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";

// Custom isolated CSS styling
import "./SecurityDashboard.css";

// Direct UI & Service imports
import HawkAIChat from "../../components/HawkAIChat.jsx";
import { scanRepository } from "../../services/client";

const SEVERITY_CONFIG = {
  Critical: { color: '#ef4444', textColor: '#ffffff', Icon: Flame },
  High: { color: '#f97316', textColor: '#ffffff', Icon: AlertTriangle },
  Medium: { color: '#eab308', textColor: '#ffffff', Icon: AlertCircle },
  Low: { color: '#3b82f6', textColor: '#ffffff', Icon: Info },
  Info: { color: '#64748b', textColor: '#ffffff', Icon: HelpCircle },
};

// Preset Repositories for Quick One-Click Audit
const PRESET_REPOS = [
  { name: "DVWA", url: "https://github.com/digininja/DVWA.git", desc: "Damn Vulnerable Web Application", tag: "PHP / Secrets" },
  { name: "OWASP Juice Shop", url: "https://github.com/juice-shop/juice-shop.git", desc: "Modern Insecure Web App", tag: "Node.js / Secrets" },
  { name: "NodeGoat", url: "https://github.com/OWASP/NodeGoat.git", desc: "OWASP Top 10 Node.js App", tag: "JS / Hardcoded Keys" },
];

export const Dashboard = () => {
  const [scanMode, setScanMode] = useState("git"); // 'git' | 'upload'
  const [repoPath, setRepoPath] = useState(() => {
    return localStorage.getItem("hawk_last_repo_path") || "https://github.com/digininja/DVWA.git";
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(true);

  // Trigger Scan for Git URL or Zip Upload
  const handleScan = async (target = repoPath) => {
    if (scanMode === "git" && (!target || !target.trim())) {
      setError("Please enter a valid Git repository URL or local folder path.");
      return;
    }

    if (scanMode === "upload" && !uploadedFile) {
      setError("Please upload a .zip archive before launching the scan.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let data;
      if (scanMode === "git") {
        localStorage.setItem("hawk_last_repo_path", target);
        data = await scanRepository(target);
      } else {
        // Zip File Upload Scan Payload
        const formData = new FormData();
        formData.append("file", uploadedFile);
        data = await scanRepository(formData);
      }
      setScanData(data);
    } catch (err) {
      console.error("Scan error:", err);
      setError(err.message || "Failed to complete security scan.");
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip') || file.name.endsWith('.tar') || file.name.endsWith('.gz')) {
        setUploadedFile(file);
        setError(null);
      } else {
        setError("Invalid file type. Please upload a .zip, .tar, or .gz archive.");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setError(null);
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

        {/* Input Bar & Mode Selector */}
        <div className={`p-5 rounded-2xl border mb-8 glass-panel ${isDark ? 'border-slate-800 shadow-2xl bg-slate-950/60' : 'bg-white border-slate-200 shadow-lg'}`}>
          
          {/* Mode Toggle Tabs */}
          <div className="flex gap-2 mb-4 border-b border-slate-800/60 pb-3">
            <button
              onClick={() => { setScanMode("git"); setError(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
                scanMode === "git" 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                  : "bg-slate-900/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Public Git Repository</span>
            </button>

            <button
              onClick={() => { setScanMode("upload"); setError(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
                scanMode === "upload" 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                  : "bg-slate-900/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              <FolderUpload className="w-3.5 h-3.5" />
              <span>Local Zip Upload</span>
            </button>
          </div>

          {/* Mode 1: Public Git URL Input */}
          {scanMode === "git" ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder="Enter GitHub URL (e.g. https://github.com/org/repo.git)..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono outline-none border transition ${
                    isDark ? 'bg-slate-950/80 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>
              <button
                onClick={() => handleScan(repoPath)}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {loading ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{loading ? "Scanning Target..." : "Start Security Scan"}</span>
              </button>
            </div>
          ) : (
            /* Mode 2: Drag & Drop Zip File Upload */
            <div className="space-y-3">
              {!uploadedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer relative ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : isDark ? 'border-slate-800 bg-slate-900/40 hover:border-blue-500/50' : 'border-slate-300 bg-slate-50 hover:border-blue-500/50'
                  }`}
                >
                  <input
                    type="file"
                    accept=".zip,.tar,.gz"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <div className="text-xs font-bold text-slate-200">Drag & drop project archive here, or <span className="text-blue-400 underline">browse</span></div>
                  <div className="text-[10px] text-slate-500 mt-1">Supports .zip, .tar, .gz (Max 50MB)</div>
                </div>
              ) : (
                /* Selected File Preview Box */
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <FileArchive className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-200">{uploadedFile.name}</div>
                      <div className="text-[10px] text-slate-400">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleScan()}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {loading ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{loading ? "Scanning..." : "Scan Upload"}</span>
                    </button>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* PRE-SCAN LANDING VIEW */}
        {!scanData && !loading ? (
          <div className="space-y-8 py-4">
            
            {/* Quick Demo Target Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-xs font-mono text-slate-400 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Quick Test Bench (One-Click Audit)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRESET_REPOS.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setScanMode("git");
                      setRepoPath(preset.url);
                      handleScan(preset.url);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 group hover:border-blue-500/50 ${
                      isDark 
                        ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-900' 
                        : 'bg-white border-slate-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-sm text-slate-200 group-hover:text-blue-400 transition">
                        {preset.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{preset.desc}</p>
                    <div className="flex items-center text-[11px] font-mono text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                      <span>Launch Scan</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Security Scanner Capabilities Grid */}
            <div className={`p-6 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-950/40' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">HardCodedHawk Detection Engine Specs</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 text-center">
                  <Lock className="w-5 h-5 mx-auto mb-1 text-rose-400" />
                  <div className="text-xs font-bold mb-0.5">Cloud API Keys</div>
                  <div className="text-[10px] text-slate-500">AWS, GCP, Azure, Stripe</div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 text-center">
                  <Key className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <div className="text-xs font-bold mb-0.5">Private Secrets</div>
                  <div className="text-[10px] text-slate-500">SSH, RSA Keys, Tokens</div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 text-center">
                  <GitBranch className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <div className="text-xs font-bold mb-0.5">Git Track Hygiene</div>
                  <div className="text-[10px] text-slate-500">.env files, loose track</div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 text-center">
                  <Sparkles className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                  <div className="text-xs font-bold mb-0.5">AI AST Remediation</div>
                  <div className="text-[10px] text-slate-500">Auto fix suggestions</div>
                </div>

              </div>
            </div>

          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top Stat Cards Grid (5 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              
              {/* 1. Health Score Card (Higher = Better) */}
              {(() => {
                const healthScore = scanData?.scores?.health_score ?? scanData?.healthScore ?? 95;
                
                let healthLabel = "EXCELLENT";
                let healthColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";

                if (healthScore < 30) {
                  healthLabel = "CRITICAL";
                  healthColor = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                } else if (healthScore < 60) {
                  healthLabel = "POOR";
                  healthColor = "text-orange-400 border-orange-500/30 bg-orange-500/10";
                } else if (healthScore < 80) {
                  healthLabel = "GOOD";
                  healthColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";
                }

                return (
                  <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400">Health Score</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border font-bold ${healthColor}`}>
                        {healthLabel}
                      </span>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-400">
                      {healthScore}/100
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Codebase security index</div>
                  </div>
                );
              })()}

              {/* 2. Risk Score Card (Higher = Worse) */}
              {(() => {
                const health = scanData?.scores?.health_score ?? scanData?.healthScore ?? 95;
                const riskScore = 100 - health; // Inverted Risk Calculation
                
                let riskLabel = "LOW";
                let riskColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                let scoreColor = "text-emerald-400";

                if (riskScore >= 80) {
                  riskLabel = "CRITICAL";
                  riskColor = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                  scoreColor = "text-rose-500";
                } else if (riskScore >= 60) {
                  riskLabel = "HIGH";
                  riskColor = "text-orange-400 border-orange-500/30 bg-orange-500/10";
                  scoreColor = "text-orange-400";
                } else if (riskScore >= 30) {
                  riskLabel = "MODERATE";
                  riskColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";
                  scoreColor = "text-amber-400";
                }

                return (
                  <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400">Risk Score</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border font-bold ${riskColor}`}>
                        {riskLabel}
                      </span>
                    </div>
                    <div className={`text-2xl font-extrabold ${scoreColor}`}>
                      {riskScore}/100
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Total exposure severity</div>
                  </div>
                );
              })()}

              {/* 3. Exposed Secrets Card */}
              <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs text-slate-400 mb-1">Exposed Secrets</div>
                <div className="text-2xl font-extrabold text-rose-500">{findings.length}</div>
                <div className="text-[10px] text-slate-500 mt-1">Hardcoded credentials</div>
              </div>

              {/* 4. Hygiene Flags Card */}
              <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs text-slate-400 mb-1">Hygiene Flags</div>
                <div className="text-2xl font-extrabold text-amber-400">{hygieneIssues.length}</div>
                <div className="text-[10px] text-slate-500 mt-1">Git track warnings</div>
              </div>

              {/* 5. Files Scanned Card */}
              <div className={`p-4 rounded-2xl border glass-panel ${isDark ? 'border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-xs text-slate-400 mb-1">Files Scanned</div>
                <div className="text-2xl font-extrabold text-blue-400">
                  {scanData?.scanned_files_count ?? scanData?.files_count ?? 12}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Workspace files audited</div>
              </div>

            </div>

            {/* AI Executive Summary Box */}
            <div className={`p-6 rounded-2xl border glass-panel relative overflow-hidden ${isDark ? 'border-blue-900/40 bg-blue-950/20' : 'border-blue-200 bg-blue-50/50'}`}>
              <div className="flex items-center gap-2 mb-3 text-blue-400 font-semibold text-sm">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h2>Hawk Security AI Executive Summary</h2>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/60 p-4 rounded-xl border border-blue-900/30">
                {typeof aiSummary === 'string' ? aiSummary : JSON.stringify(aiSummary, null, 2)}
              </div>
            </div>

            {/* Severity Distribution Chart */}
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

            {/* Secret Findings Table */}
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
                      <div className="text-slate-400 text-[11px]">
                        Target File: <span className="text-slate-200 font-bold">{item.file || item.filename || "Unknown Path"}</span> (Line {item.line || item.line_number || 1})
                      </div>
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
                <div className="space-y-3">
                  {hygieneIssues.map((issue, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-amber-900/30 bg-amber-950/10 text-xs flex flex-col gap-1.5 font-mono">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-300">{issue.issue || issue.title || "Hygiene Finding"}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {issue.severity || "Medium"}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Target Location: <span className="text-slate-200 font-bold">{issue.file || issue.filename || issue.path || "Repository Root (./)"}</span>
                      </div>
                      <div className="text-slate-300 text-[11px] bg-black/40 p-2.5 rounded border border-amber-900/20 mt-1">
                        {issue.description || issue.detail || (typeof issue === 'string' ? issue : JSON.stringify(issue))}
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