import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { 
  ShieldAlert, Download, Search, Activity, Key, Code, 
  Cpu, ShieldCheck, Play, CheckCircle2, Sun, Moon 
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import { SecurityReportPDF } from "../../components/SecurityReportPDF";
import { HawkAIChat } from "../../components/HawkAIChat";
import { scanRepository } from "../../services/client";

// Severity configuration — color + icon in one source of truth
const SEVERITY_CONFIG = {
  Critical: {
    color: '#ef4444',
    textColor: '#ffffff',
    icon: 'ti-flame',
  },
  High: {
    color: '#f97316',
    textColor: '#ffffff',
    icon: 'ti-alert-triangle',
  },
  Medium: {
    color: '#eab308',
    textColor: '#422006', // dark text required for accessible contrast on yellow
    icon: 'ti-alert-circle',
  },
  Low: {
    color: '#3b82f6',
    textColor: '#ffffff',
    icon: 'ti-info-circle',
  },
  Warning: {
    color: '#64748b',
    textColor: '#ffffff',
    icon: 'ti-alert-square',
  },
};

// Fallback for any unmatched/unexpected severity string
const DEFAULT_SEVERITY_CONFIG = {
  color: '#64748b',
  textColor: '#ffffff',
  icon: 'ti-help-circle',
};

function getSeverityConfig(formattedSev) {
  return SEVERITY_CONFIG[formattedSev] || DEFAULT_SEVERITY_CONFIG;
}

const LOCAL_PRESET = "C:\\Mini_project\\HAWKproject\\HARDCODEDHAWK";
const GIT_PRESET = "https://github.com/octocat/Hello-World.git";

// 3D Animated Background Sphere
const Background3D = ({ isDark }) => {
  return (
    <div className="absolute inset-0 -z-10 opacity-15 pointer-events-none overflow-hidden">
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} />
        <Sphere args={[1, 100, 200]} scale={2.4}>
          <MeshDistortMaterial
            color={isDark ? "#7030EF" : "#9d4edd"}
            attach="material"
            distort={0.4}
            speed={1.5}
            wireframe
          />
        </Sphere>
      </Canvas>
    </div>
  );
};

export const Dashboard = () => {
  // LocalStorage state management for Repo Path & Theme Mode
  const [repoPath, setRepoPath] = useState(() => {
    return localStorage.getItem("hawk_last_repo_path") || "";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("hawk_theme") || "dark";
  });

  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [isTargeting, setIsTargeting] = useState(false);

  const isDark = theme === "dark";

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("hawk_theme", nextTheme);
  };

  const handleSelectPreset = (path) => {
    setRepoPath(path);
    localStorage.setItem("hawk_last_repo_path", path);
    setIsTargeting(true);
    setTimeout(() => setIsTargeting(false), 800);
  };

  const handleStartScan = async (e, customPath = null) => {
    if (e) e.preventDefault();
    const targetPath = customPath || repoPath;

    if (!targetPath.trim()) {
      setError("Please provide a valid repository path or public Git URL.");
      return;
    }

    localStorage.setItem("hawk_last_repo_path", targetPath);
    setLoading(true);
    setError("");

    try {
      const data = await scanRepository(targetPath);
      setScanData(data);
    } catch (err) {
      console.error("Scan error details:", err);
      const serverMessage = err.response?.data?.message || err.response?.data?.error;
      setError(
        serverMessage
          ? `Server Error: ${serverMessage}`
          : "Failed to execute scan. Ensure Flask backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    setExportOpen(false);
    if (!scanData) return;

    if (format === 'json') {
      const jsonStr = JSON.stringify(scanData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HardCodedHawk_Report_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    else if (format === 'csv') {
      const findings = scanData.findings || [];
      const headers = ["Severity", "Type", "File", "Line", "Description"];
      const rows = findings.map(f => [
        `"${f.severity || ''}"`,
        `"${f.type || ''}"`,
        `"${(f.file || '').replace(/"/g, '""')}"`,
        `"${f.line || ''}"`,
        `"${(f.description || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HardCodedHawk_Report_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    else if (format === 'pdf') {
      window.print();
    }
  };

  const allIssues = [
    ...(scanData?.findings || []),
    ...(scanData?.hygiene_issues || []).map(item => ({
      severity: item.severity || 'Low',
      type: item.issue_type || item.type || 'Code Hygiene',
      file: item.file || item.path || '.gitignore',
      line: item.line || '-',
      description: item.description || item.message || 'Hygiene issue detected'
    }))
  ];

  const getSeverityData = () => {
    if (!scanData) return [];
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Warning: 0 };
    allIssues.forEach((f) => {
      const rawSev = f.severity || 'Medium';
      const sev = rawSev.charAt(0).toUpperCase() + rawSev.slice(1).toLowerCase();
      if (counts[sev] !== undefined) {
        counts[sev] += 1;
      } else {
        counts['Warning'] += 1;
      }
    });
    return Object.keys(counts)
      .map((key) => ({ name: key, value: counts[key] }))
      .filter((d) => d.value > 0);
  };

  const getCategoryData = () => {
    if (!scanData) return [];
    const counts = {};
    allIssues.forEach((f) => {
      const cat = f.type || f.category || 'General Secret';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key.length > 20 ? key.substring(0, 20) + "..." : key,
      fullName: key,
      value: counts[key]
    }));
  };

  const severityData = getSeverityData();
  const categoryData = getCategoryData();

  const healthScore = scanData?.scores?.health_score ?? scanData?.healthScore ?? scanData?.scores?.health ?? 0;
  const riskScore = scanData?.scores?.risk_score ?? scanData?.riskScore ?? scanData?.scores?.risk ?? 0;
  const totalFindings = allIssues.length;

  // Dynamic Tailwind Theme Classes
  const bgClass = isDark ? "bg-[#090820] text-white" : "bg-white text-slate-900";
  const cardBgClass = isDark ? "bg-slate-900/95 border-primary/80 shadow-lg" : "bg-slate-50 border-slate-300 shadow-sm";
  const inputBgClass = isDark ? "bg-slate-800/90 border-primary/70" : "bg-white border-slate-400 shadow-sm";
  const textSubtleClass = isDark ? "text-slate-100" : "text-slate-600";
  const borderClass = isDark ? "border-primary/70" : "border-slate-300";

  return (
    <div className={`relative min-h-screen ${bgClass} p-6 font-sans flex flex-col justify-between transition-colors duration-300`}>
      <Background3D isDark={isDark} />

      <div>
        {/* Navigation & Header */}
        <header className={`flex justify-between items-center mb-6 pb-4 border-b ${borderClass}`}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-secondary" />
            <h1 className={`text-xl font-bold tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
              HardCodedHawk <span className={isDark ? "text-slate-200" : "text-slate-600"}>| Security Operations Center</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition cursor-pointer flex items-center gap-2 text-xs font-bold ${
                isDark 
                  ? "bg-slate-800/80 border-primary/60 text-amber-300 hover:bg-slate-700" 
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm"
              }`}
              title="Toggle Light / Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Export Dropdown */}
            {scanData && (
              <div className="relative">
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition cursor-pointer text-xs font-semibold ${
                    isDark ? "bg-dark-navy/60 border-primary/30 hover:bg-dark-navy/80 text-white" : "bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-sm"
                  }`}
                >
                  <Download className="w-4 h-4" /> Export Report ▾
                </button>
                <AnimatePresence>
                  {exportOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`absolute right-0 mt-2 w-48 rounded-lg shadow-xl z-50 overflow-hidden border ${
                        isDark ? "bg-dark-navy/80 border-primary/30 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    >
                      <button onClick={() => handleExport('pdf')} className={`w-full text-left px-4 py-2.5 text-xs hover:${isDark ? "bg-dark-navy/80" : "bg-slate-100"} border-b ${borderClass} cursor-pointer`}>📄 PDF Document</button>
                      <button onClick={() => handleExport('csv')} className={`w-full text-left px-4 py-2.5 text-xs hover:${isDark ? "bg-dark-navy/80" : "bg-slate-100"} border-b ${borderClass} cursor-pointer`}>📊 CSV Spreadsheet</button>
                      <button onClick={() => handleExport('json')} className={`w-full text-left px-4 py-2.5 text-xs hover:${isDark ? "bg-dark-navy/80" : "bg-slate-100"} cursor-pointer`}>⚙️ Raw JSON Data</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        {/* Target Path Control Bar */}
        <form onSubmit={(e) => handleStartScan(e)} className="flex gap-3 mb-6">
          <div className={`flex items-center gap-3 border rounded-lg px-4 py-2.5 flex-1 backdrop-blur-sm ${inputBgClass}`}>
            <Search className={`w-5 h-5 ${isDark ? "text-slate-200" : "text-slate-600"}`} />
            <input
              type="text"
              value={repoPath}
              onChange={(e) => {
                setRepoPath(e.target.value);
                localStorage.setItem("hawk_last_repo_path", e.target.value);
              }}
              placeholder="Target Local Folder Path or Public Git URL..."
              className={`bg-transparent text-sm w-full outline-none text-current ${isDark ? "placeholder-slate-400" : "placeholder-slate-500"}`}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`font-bold px-6 py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm border ${
              isDark 
                ? "bg-secondary hover:bg-secondary/90 text-dark-navy border-secondary" 
                : "bg-slate-900 hover:bg-slate-800 text-white border-slate-700"
            }`}
          >
            {loading ? (
              <>
                <Activity className="w-4 h-4 animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Start Security Scan
              </>
            )}
          </button>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-rose-600/20 border-2 border-rose-500 text-rose-300 text-sm rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* PRE-SCAN HERO STATE */}
        {!scanData && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-14 mb-10 flex flex-col items-center justify-center text-center px-4"
          >
            <div className="relative mb-8 flex items-center justify-center">
              <motion.div 
                animate={isTargeting ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.4] } : {}}
                transition={{ duration: 0.7 }}
                className="absolute w-40 h-40 rounded-full border border-primary/80 animate-ping"
              ></motion.div>

              <motion.div
                animate={isTargeting ? { rotate: 360, scale: 1.15, borderColor: "#7030EF" } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute w-28 h-28 rounded-full border-2 border-dashed border-primary/90"
              ></motion.div>

              <motion.div
                animate={isTargeting ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.5 }}
                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center shadow-xl backdrop-blur-md transition-colors ${
                  isDark ? "bg-slate-900/95 border-primary/90" : "bg-white border-primary"
                }`}
              >
                <ShieldCheck className="w-10 h-10 text-primary" />
              </motion.div>
            </div>

            <h2 className={`text-3xl font-extrabold tracking-wide mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
              Ready to Audit Your Codebase
            </h2>
            <p className={`text-sm ${isDark ? "text-slate-100" : textSubtleClass} max-w-xl mb-10 leading-relaxed`}>
              HardCodedHawk utilizes high-entropy mathematical analysis and regex pattern matching to uncover exposed secrets, API keys, and code hygiene issues.
            </p>

            <div className="grid grid-cols-3 gap-6 max-w-4xl w-full mb-10">
              <div className={`border p-6 rounded-xl text-left hover:border-secondary/80 transition ${cardBgClass}`}>
                <Key className="w-7 h-7 text-secondary mb-3.5" />
                <h3 className={`text-sm font-bold mb-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>Secret Detection</h3>
                <p className={`text-xs ${isDark ? "text-slate-100" : textSubtleClass} leading-relaxed`}>
                  Scans for hardcoded AWS keys, JWT tokens, private keys, and high-entropy strings.
                </p>
              </div>

              <div className={`border p-6 rounded-xl text-left hover:border-secondary/80 transition ${cardBgClass}`}>
                <Code className="w-7 h-7 text-secondary mb-3.5" />
                <h3 className={`text-sm font-bold mb-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>Code Hygiene</h3>
                <p className={`text-xs ${isDark ? "text-slate-100" : textSubtleClass} leading-relaxed`}>
                  Identifies tracked sensitive files (`.env`), missing gitignores, and dangerous configurations.
                </p>
              </div>

              <div className={`border p-6 rounded-xl text-left hover:border-secondary/80 transition ${cardBgClass}`}>
                <Cpu className="w-7 h-7 text-secondary mb-3.5" />
                <h3 className={`text-sm font-bold mb-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>AI Remediation</h3>
                <p className={`text-xs ${isDark ? "text-slate-100" : textSubtleClass} leading-relaxed`}>
                  Generates automated offline risk evaluation summaries and step-by-step fix recommendations.
                </p>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className={`flex items-center gap-3 text-xs ${textSubtleClass}`}>
              <span>Quick Test Targets:</span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSelectPreset(LOCAL_PRESET)}
                className={`px-3.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  repoPath === LOCAL_PRESET
                    ? "bg-primary/20 border-primary text-primary font-bold shadow-sm"
                    : `${cardBgClass} text-current`
                }`}
              >
                {repoPath === LOCAL_PRESET && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                Local Repo
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSelectPreset(GIT_PRESET)}
                className={`px-3.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  repoPath === GIT_PRESET
                    ? "bg-primary/20 border-primary text-primary font-bold shadow-sm"
                    : `${cardBgClass} text-current`
                }`}
              >
                {repoPath === GIT_PRESET && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                Public GitHub Repo
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className={`my-16 flex flex-col items-center justify-center ${textSubtleClass}`}>
            <Activity className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-mono">Analyzing repository secrets and code hygiene...</p>
          </div>
        )}

        {/* SCAN RESULTS DASHBOARD */}
        {scanData && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-4 gap-4"
          >
            {/* Health Score Tile */}
            <div className={`border p-4 rounded-xl backdrop-blur-sm flex flex-col justify-center items-center ${cardBgClass}`}>
              <h3 className={`text-xs font-bold ${isDark ? "text-slate-100" : textSubtleClass} uppercase tracking-wider mb-1`}>Health Score</h3>
              <span className="text-3xl font-extrabold text-emerald-500">{healthScore}%</span>
            </div>

            {/* Risk Score Tile */}
            <div className={`border p-4 rounded-xl backdrop-blur-sm flex flex-col justify-center items-center ${cardBgClass}`}>
              <h3 className={`text-xs font-bold ${isDark ? "text-slate-100" : textSubtleClass} uppercase tracking-wider mb-1`}>Risk Score</h3>
              <span className="text-3xl font-extrabold text-amber-500">{riskScore}%</span>
            </div>

            {/* Total Findings Tile */}
            <div className={`border p-4 rounded-xl backdrop-blur-sm col-span-2 flex flex-col justify-center ${cardBgClass}`}>
              <h3 className={`text-xs font-bold ${isDark ? "text-slate-100" : textSubtleClass} uppercase tracking-wider mb-1`}>Total Issue Findings</h3>
              <span className="text-3xl font-extrabold text-primary">{totalFindings}</span>
            </div>

            {/* Recharts Donut: Severity */}
            <div className={`border p-4 rounded-xl col-span-2 backdrop-blur-sm ${cardBgClass}`}>
              <h3 className={`text-xs font-bold ${isDark ? "text-slate-100" : textSubtleClass} uppercase tracking-wider mb-4`}>Findings Severity Breakdown</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                      {severityData.map((entry, index) => {
                        const conf = getSeverityConfig(entry.name);
                        return <Cell key={`cell-${index}`} fill={conf.color} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#f5f5f5', 
                      borderColor: isDark ? '#7030EF' : '#d1d5db', 
                      color: isDark ? '#fff' : '#000',
                      borderRadius: '8px' 
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recharts Bar: Categories */}
            <div className={`border p-4 rounded-xl col-span-2 backdrop-blur-sm ${cardBgClass}`}>
              <h3 className={`text-xs font-bold ${isDark ? "text-slate-100" : textSubtleClass} uppercase tracking-wider mb-4`}>Top Secret Categories</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                    <XAxis dataKey="name" stroke={isDark ? "#cbd5e1" : "#94a3b8"} fontSize={10} />
                    <YAxis stroke={isDark ? "#cbd5e1" : "#94a3b8"} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: isDark ? '#0f172a' : '#f5f5f5', 
                        borderColor: isDark ? '#7030EF' : '#d1d5db', 
                        color: isDark ? '#fff' : '#000',
                        borderRadius: '8px' 
                      }}
                      formatter={(value, name, item) => [value, item.payload.fullName || name]}
                    />
                    <Bar dataKey="value" fill="#7030EF" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Security Summary Card */}
            <div className={`border p-5 rounded-xl col-span-4 backdrop-blur-sm ${cardBgClass}`}>
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> AI Security Insights & Remediation
              </h3>
              <p className={`text-sm ${isDark ? "text-slate-100" : "text-slate-700"} leading-relaxed whitespace-pre-line`}>{scanData.ai_summary}</p>
            </div>

            {/* Detailed Findings Table */}
            <div className={`border p-5 rounded-xl col-span-4 backdrop-blur-sm ${cardBgClass}`}>
              <h3 className={`text-xs font-bold ${isDark ? "text-slate-100" : textSubtleClass} uppercase tracking-wider mb-4`}>
                Detailed Findings ({allIssues.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b-2 ${borderClass} ${isDark ? "text-slate-100 bg-slate-800/60" : "text-slate-600 bg-slate-100"} uppercase tracking-wider font-bold`}>
                      <th className="pb-3 px-4 font-bold">Severity</th>
                      <th className="pb-3 px-4 font-bold">Type</th>
                      <th className="pb-3 px-4 font-bold">Location (Folder / File)</th>
                      <th className="pb-3 px-4 font-bold text-center">Line</th>
                      <th className="pb-3 px-4 font-bold">Description</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-slate-700/80" : "divide-slate-200"}`}>
                    {allIssues.map((f, index) => {
                      const formattedSev = f.severity
                        ? f.severity.charAt(0).toUpperCase() + f.severity.slice(1).toLowerCase()
                        : 'Medium';

                      const { color, textColor, icon } = getSeverityConfig(formattedSev);

                      const fullPath = f.file || f.path || "-";
                      const pathParts = fullPath.split(/[/\\]/);
                      const fileName = pathParts.pop();
                      const folderPath = pathParts.join("/") || ".";

                      return (
                        <tr key={index} className={`transition font-medium ${isDark ? "hover:bg-slate-700/80 text-slate-100" : "hover:bg-slate-100 text-slate-900"}`}>
                          {/* Config-Driven Severity Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: color,
                                color: textColor,
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              <i className={`ti ${icon}`} style={{ fontSize: '12px' }} aria-hidden="true" />
                              {formattedSev}
                            </span>
                          </td>

                          {/* Issue Type */}
                          <td className="py-3.5 px-4 font-medium whitespace-nowrap">{f.type}</td>

                          {/* Clean Location Path */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="text-primary font-semibold font-mono text-xs">{fileName}</span>
                              <span className={`text-[10px] ${textSubtleClass} font-mono truncate max-w-xs`}>{folderPath}</span>
                            </div>
                          </td>

                          {/* Line Number Column */}
                          <td className="py-3.5 px-4 text-center font-mono text-primary font-bold whitespace-nowrap">
                            {f.line && f.line !== '-' ? `L${f.line}` : '-'}
                          </td>

                          {/* Description Column */}
                          <td className={`py-3.5 px-4 leading-relaxed ${isDark ? "text-slate-100" : "text-slate-700"}`}>{f.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Live System Status Bar Footer */}
      <footer className={`mt-8 pt-4 border-t-2 ${borderClass} flex justify-between items-center text-[11px] ${isDark ? "text-slate-200 font-bold" : textSubtleClass} font-mono`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>HAWK ENGINE: ONLINE</span>
        </div>
        <div>RULES ENGINE: v2.4 (ACTIVE)</div>
      </footer>

      {/* Executive Report Rendered Only For Printing */}
      {scanData && (
        <div className="hidden print:block">
          <SecurityReportPDF scanData={scanData} repoPath={repoPath} />
        </div>
      )}

      {/* Floating HawkAI Chat Widget */}
      <HawkAIChat 
        scanData={scanData} 
        loading={loading} 
        repoPath={repoPath} 
        error={error}
        isDark={isDark}
      />
    </div>
  );
};

export default Dashboard;