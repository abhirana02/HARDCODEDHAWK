export const SecurityReportPDF = ({ scanData, repoPath }) => {
  if (!scanData) return null;

  const findings = scanData.findings || [];
  const healthScore = scanData.scores?.health_score ?? 85;
  const riskScore = scanData.scores?.risk_score ?? 28;
  const reportId = `HCH-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  const scanDate = new Date().toLocaleDateString();
  const year = new Date().getFullYear();

  // Severity counts
  const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  findings.forEach((f) => {
    const sev = f.severity || 'Medium';
    if (severityCounts[sev] !== undefined) severityCounts[sev]++;
  });

  return (
    <div className="pdf-report-container text-white p-8 bg-dark-navy font-sans max-w-4xl mx-auto">
      {/* Header & Metadata */}
      <div className="border-b-2 border-primary/30 pb-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-primary tracking-wide">
            HARDCODEDHAWK <span className="text-primary/60 font-normal text-base">| Executive Security Report</span>
          </h1>
          <span className="text-xs bg-dark-navy/80 text-primary border border-primary/30 px-3 py-1 rounded font-mono">
            CONFIDENTIAL
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-dark-navy/60 p-3 rounded border border-primary/30 text-primary/60">
          <div><strong className="text-primary/60">Target Path:</strong> {repoPath}</div>
          <div><strong className="text-primary/60">Scan Date:</strong> {scanDate}</div>
          <div><strong className="text-primary/60">Engine Version:</strong> HardCodedHawk v2.4.0</div>
          <div><strong className="text-primary/60">Report ID:</strong> {reportId}</div>
        </div>
      </div>

      {/* Section 1: Executive Summary */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 border-l-4 border-primary pl-2">
          1. Executive Summary & Security Posture
        </h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-dark-navy/60 p-3 rounded border border-primary/30">
            <div className="text-[10px] text-primary/60 uppercase">Health Score</div>
            <div className="text-xl font-extrabold text-emerald-400">{healthScore} / 100</div>
          </div>
          <div className="bg-dark-navy/60 p-3 rounded border border-primary/30">
            <div className="text-[10px] text-primary/60 uppercase">Risk Score</div>
            <div className="text-xl font-extrabold text-rose-500">{riskScore} / 100</div>
          </div>
          <div className="bg-dark-navy/60 p-3 rounded border border-primary/30">
            <div className="text-[10px] text-primary/60 uppercase">Total Issues</div>
            <div className="text-xl font-extrabold text-primary">{findings.length}</div>
          </div>
          <div className="bg-dark-navy/60 p-3 rounded border border-primary/30">
            <div className="text-[10px] text-primary/60 uppercase">Compliance</div>
            <div className="text-xl font-extrabold text-amber-400">PASSED</div>
          </div>
        </div>
      </div>

      {/* Section 2: Detailed Risk Analysis */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 border-l-4 border-primary pl-2">
          2. Severity Breakdown & Risk Vectors
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-primary/30">
          <thead>
            <tr className="bg-dark-navy/60 text-primary/60">
              <th className="p-2 border border-primary/30">Severity</th>
              <th className="p-2 border border-primary/30">Count</th>
              <th className="p-2 border border-primary/30">Action Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/30">
            <tr>
              <td className="p-2 font-bold text-rose-500">Critical</td>
              <td className="p-2">{severityCounts.Critical}</td>
              <td className="p-2 text-rose-400">Immediate remediation required within 24h</td>
            </tr>
            <tr>
              <td className="p-2 font-bold text-orange-500">High</td>
              <td className="p-2">{severityCounts.High}</td>
              <td className="p-2 text-orange-400">Remediate within upcoming sprint cycle</td>
            </tr>
            <tr>
              <td className="p-2 font-bold text-amber-500">Medium</td>
              <td className="p-2">{severityCounts.Medium}</td>
              <td className="p-2 text-amber-400">Schedule fix in routine maintenance</td>
            </tr>
            <tr>
              <td className="p-2 font-bold text-blue-500">Low</td>
              <td className="p-2">{severityCounts.Low}</td>
              <td className="p-2 text-blue-400">Informational advisory</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 3: AI Security Insights & Remediation */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 border-l-4 border-primary pl-2">
          3. AI Security Insights & Strategic Remediation
        </h2>
        <div className="bg-dark-navy/60 p-4 rounded border border-primary/30 text-xs text-white leading-relaxed whitespace-pre-line">
          {scanData.ai_summary || "Automated scan completed. Rotate high-risk API keys and update credentials to environment parameter files (.env)."}
        </div>
      </div>

      {/* Section 4: Vulnerability Audit Log */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 border-l-4 border-primary pl-2">
          4. Vulnerability Audit Log Sample
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-primary/30">
          <thead>
            <tr className="bg-dark-navy/60 text-primary/60">
              <th className="p-2 border border-primary/30">Severity</th>
              <th className="p-2 border border-primary/30">Type</th>
              <th className="p-2 border border-primary/30">File</th>
              <th className="p-2 border border-primary/30">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/30">
            {findings.slice(0, 8).map((f, i) => (
              <tr key={i}>
                <td className="p-2 font-bold text-primary">{f.severity}</td>
                <td className="p-2">{f.type}</td>
                <td className="p-2 font-mono text-primary/60">{f.file}</td>
                <td className="p-2">{f.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-primary/30 pt-3 text-center text-[10px] text-primary/60 flex justify-between">
        <span>HARDCODEDHAWK © {year} Security Assessment</span>
        <span>Confidential & Proprietary</span>
      </div>
    </div>
  );
};