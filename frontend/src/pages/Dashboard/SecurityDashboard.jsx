import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  ShieldAlert, Download, Search, Activity, Key, Code,
  Cpu, ShieldCheck, Play, CheckCircle2, Sun, Moon,
  Flame, AlertTriangle, AlertCircle, Info, AlertOctagon, HelpCircle
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";

// Import isolated custom stylesheet
import "./SecurityDashboard.css";

// Import components and services from UI folder
import * as ComponentImports from "../../components/ui/SecurityReportPDF";
import * as ChatImports from "../../components/ui/HawkAIChat";
import * as ServiceImports from "../../services/client";

const SecurityReportPDF = ComponentImports.SecurityReportPDF || ComponentImports.default;
const HawkAIChat = ChatImports.HawkAIChat || ChatImports.default;
const scanRepository = ServiceImports.scanRepository || ServiceImports.default;

const SEVERITY_CONFIG = {
  Critical: { color: '#ef4444', textColor: '#ffffff', Icon: Flame },
  High: { color: '#f97316', textColor: '#ffffff', Icon: AlertTriangle },
  Medium: { color: '#eab308', textColor: '#ffffff', Icon: AlertCircle },
  Low: { color: '#3b82f6', textColor: '#ffffff', Icon: Info },
  Info: { color: '#64748b', textColor: '#ffffff', Icon: HelpCircle },
};

export const SecurityDashboard = () => {
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
    <div className="security-dashboard-container">
      {/* Background Hero Canvas Effect */}
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

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">HardCodedHawk <span className="text-xs font-mono font-normal text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 ml-2">SOC V2.4</span></h1>
              <p className="text-xs text-slate-400">Automated Secret Detection & Code Hygiene Audit</p>
            </div>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </header>

        {/* Scan Target Input Box */}
        <div className="glass-panel p-4 rounded-2xl mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="Enter GitHub URL or Local Folder Path..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono outline-none border bg-slate-950/80 border-slate-800 text-slate-100 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => handleScan(repoPath)}
              disabled={loading}
              className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20 ${loading ? 'scan-active-glow' : ''}`}
            >
              {loading ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{loading ? "Scanning..." : "Start Security Scan"}</span>
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Main Dashboard Content Area */}
        {!scanData && !loading ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">Ready to Audit Your Codebase</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto mb-6">
              HardCodedHawk utilizes high-entropy mathematical analysis and regex pattern matching to uncover exposed secrets, API keys, and code hygiene issues.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl">
                <div className="text-xs text-slate-400 mb-1">Health Score</div>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {scanData?.scores?.health_score ?? scanData?.healthScore ?? 95}/100
                </div>
              </div>
              <div className="glass-panel p-4 rounded-2xl">
                <div className="text-xs text-slate-400 mb-1">Exposed Secrets</div>
                <div className="text-2xl font-extrabold text-rose-500">{findings.length}</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl">
                <div className="text-xs text-slate-400 mb-1">Hygiene Flags</div>
                <div className="text-2xl font-extrabold text-amber-400">{hygieneIssues.length}</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl">
                <div className="text-xs text-slate-400 mb-1">Files Scanned</div>
                <div className="text-2xl font-extrabold text-blue-400">{scanData?.scanned_files_count ?? 12}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Assistant Widget */}
      {HawkAIChat && (
        <div className="fixed bottom-16 right-6 z-[9999]">
          <HawkAIChat
            scanData={scanData}
            loading={loading}
            repoPath={repoPath}
            error={error}
            currentPage="Dashboard"
            isDark={isDark}
          />
        </div>
      )}

      {/* Footer Bar */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 px-6 border-t border-slate-800/80 bg-slate-950/90 text-slate-400 text-[11px] font-mono flex justify-between items-center z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>HAWK ENGINE: ONLINE</span>
        </div>
        <div>
          <span>RULES ENGINE: v2.4 (ACTIVE)</span>
        </div>
      </footer>
    </div>
  );
};

export default SecurityDashboard;