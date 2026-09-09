import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const HawkAIChat = ({ scanData, loading, repoPath, error, currentPage = 'Dashboard', isDark = true }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am **HawkAI**, your Hardcoded Hawk assistant. Ask me anything about scanning, dashboard metrics, or security remediation!'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Derive dynamic context state from props
  const scanStatus = loading 
    ? 'Scanning...' 
    : scanData 
      ? 'Scan Completed' 
      : 'Idle';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Handle message dispatch with Live Context injection
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to UI
    const updatedMessages = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Safely aggregate security findings and code hygiene issues
      const rawFindings = scanData?.findings || [];
      const rawHygiene = scanData?.hygiene_issues || scanData?.hygieneIssues || [];
      const combinedIssues = [...rawFindings, ...rawHygiene];

      // Build Live Context Snapshot
      const liveContextSnapshot = {
        SCAN_STATUS: scanStatus,
        CURRENT_INPUT: repoPath || scanData?.repo_path || scanData?.path || 'None',
        ERROR_LOGS: error || 'None',
        CURRENT_PAGE: currentPage,
        
        TOTAL_FINDINGS: combinedIssues.length,
        FINDINGS: combinedIssues,
        HYGIENE_ISSUES: rawHygiene,
        findings: combinedIssues,
        hygiene_issues: rawHygiene,

        HEALTH_SCORE: scanData?.scores?.health_score ?? scanData?.healthScore ?? scanData?.health_score ?? 95,
        RISK_SCORE: scanData?.scores?.risk_score ?? scanData?.riskScore ?? scanData?.risk_score ?? 5,
        health_score: scanData?.scores?.health_score ?? scanData?.healthScore ?? scanData?.health_score ?? 95,
        risk_score: scanData?.scores?.risk_score ?? scanData?.riskScore ?? scanData?.risk_score ?? 5
      };

      // Call Backend API Endpoint
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
      const apiUrl = `${apiBase || ''}/api/hawk-ai`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          live_context: liveContextSnapshot,
          liveContext: liveContextSnapshot,
          history: updatedMessages.slice(-6)
        })
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || data.response || "I'm having trouble processing your request right now. Please try again."
        }
      ]);
    } catch (err) {
      console.error('HawkAI Chat Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I couldn't connect to the HawkAI server. Please check your backend connection."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-16 right-6 z-[9999] font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`relative group p-4 rounded-full shadow-2xl transition flex items-center justify-center cursor-pointer border-2 ${
            isDark 
              ? "bg-primary/90 hover:bg-secondary border-primary/50 text-white" 
              : "bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-blue-500/30"
          }`}
        >
          {error && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full animate-bounce flex items-center justify-center text-[10px] text-white font-bold">!</span>
          )}
          <Bot className="w-6 h-6" />
          <span className="absolute right-16 bg-slate-800/90 text-secondary text-xs py-1 px-3 rounded-md border border-secondary/40 opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-md pointer-events-none font-bold">
            Ask HawkAI
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`w-80 sm:w-[420px] h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl border-2 ${
          isDark 
            ? "bg-slate-900/98 border-primary/70" 
            : "bg-white border-blue-200 shadow-[0_20px_50px_rgba(37,99,235,0.18)]"
        }`}>
          {/* Header */}
          <div className={`p-4 flex justify-between items-center border-b-2 ${
            isDark 
              ? "bg-slate-800/90 border-primary/60" 
              : "bg-blue-50 border-blue-200"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 border-2 rounded-lg ${
                isDark 
                  ? "bg-primary/20 border-primary/60 text-secondary" 
                  : "bg-blue-100 border-blue-300 text-blue-700"
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>HawkAI Assistant</h3>
                <span className={`text-[10px] font-mono font-semibold ${isDark ? "text-secondary" : "text-slate-500"}`}>
                  Context: {scanStatus}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isDark 
                  ? "text-primary/60 hover:text-primary" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Error Context Banner */}
          {error && (
            <div className="px-3 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Scan issue: {error}</span>
            </div>
          )}

          {/* Messages Area */}
          <div className={`flex-1 p-4 overflow-y-auto space-y-3.5 text-xs ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? isDark 
                        ? 'bg-primary/85 text-white font-medium rounded-br-none shadow-md' 
                        : 'bg-blue-600 text-white font-medium rounded-br-none shadow-md shadow-blue-200'
                      : isDark 
                        ? 'bg-slate-700/80 text-slate-100 border-2 border-primary/50 rounded-bl-none' 
                        : 'bg-white text-slate-900 border border-blue-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h3: ({ ...props }) => (
                        <h3 className={`text-sm font-bold mt-3 mb-1 border-b pb-1 flex items-center gap-1 ${
                          isDark 
                            ? "text-secondary border-secondary/40" 
                            : "text-slate-900 border-slate-300"
                        }`} {...props} />
                      ),
                      p: ({ ...props }) => <p className={`mb-2 last:mb-0 leading-normal ${isDark ? "text-slate-100" : "text-slate-900"}`} {...props} />,
                      ul: ({ ...props }) => <ul className={`list-disc list-inside space-y-1 my-2 ${isDark ? "text-slate-100" : "text-slate-800"}`} {...props} />,
                      ol: ({ ...props }) => <ol className={`list-decimal list-inside space-y-1 my-2 ${isDark ? "text-slate-100" : "text-slate-800"}`} {...props} />,
                      li: ({ ...props }) => <li className="my-0.5 leading-normal" {...props} />,
                      strong: ({ ...props }) => <strong className={`font-semibold ${isDark ? "text-secondary" : "text-slate-900"}`} {...props} />,
                      code: ({ inline, ...props }) => 
                        inline ? (
                          <code className={`px-1.5 py-0.5 rounded font-mono text-[11px] border font-semibold ${
                            isDark 
                              ? "bg-slate-900 text-secondary border-secondary/50" 
                              : "bg-slate-200 text-slate-900 border-slate-300"
                          }`} {...props} />
                        ) : (
                          <code className={`block p-2.5 rounded-lg font-mono text-[11px] my-2 overflow-x-auto border leading-normal ${
                            isDark 
                              ? "bg-slate-900 text-secondary border-secondary/40" 
                              : "bg-slate-200 text-slate-900 border-slate-300"
                          }`} {...props} />
                        )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`p-3 rounded-xl border text-xs font-mono animate-pulse flex items-center gap-2 font-semibold ${
                  isDark 
                    ? "bg-slate-700/80 text-slate-200 border-primary/50" 
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  <Sparkles className={`w-3.5 h-3.5 animate-spin ${isDark ? "text-secondary" : "text-blue-600"}`} />
                  HawkAI is analyzing...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className={`p-3 border-t-2 flex gap-2 ${
            isDark 
              ? "bg-slate-800/80 border-primary/60" 
              : "bg-blue-50 border-blue-200"
          }`}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about scans, metrics, or exporting..."
              className={`flex-1 rounded-lg px-3 py-2 text-xs outline-none transition ${
                isDark 
                  ? "bg-slate-700/70 border-2 border-primary/50 text-white placeholder-slate-300 focus:border-primary" 
                  : "bg-white border border-blue-300 text-slate-900 placeholder-slate-500 focus:border-blue-500 shadow-inner"
              }`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className={`p-2 rounded-lg transition cursor-pointer disabled:opacity-50 border ${
                isDark 
                  ? "bg-primary/85 border-primary/60 hover:bg-primary text-white"
                  : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-white"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default HawkAIChat;