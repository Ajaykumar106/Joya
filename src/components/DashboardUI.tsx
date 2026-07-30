"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  Bot, Send, RotateCw, MoreHorizontal, Bell, ChevronDown, 
  Terminal, Play, Trash2, Save, Activity, Code, Cpu 
} from "lucide-react";

export default function DashboardUI() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [utcTime, setUtcTime] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLogs, setChatLogs] = useState([
    {
      role: "assistant",
      content: "Hello, how is the ETH market performing? I am monitoring live market signals and telemetry streams. Ready to execute python scripts or plot live crypto trends."
    },
    {
      role: "user",
      content: "How is the ETH market performing?"
    },
    {
      role: "assistant",
      content: "ETH is currently trading around $2,285.60 (+0.98% 24h). Moving averages indicate positive momentum with strong support at $2,250. Code execution console on your right is loaded with python analysis scripts for instant execution."
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);

  // Prices
  const [btcPrice, setBtcPrice] = useState(42150.30);
  const [ethPrice, setEthPrice] = useState(2285.60);
  const [btcTf, setBtcTf] = useState("1H");
  const [ethTf, setEthTf] = useState("1H");

  // Code Console
  const [codeContent, setCodeContent] = useState(
`import pandas as pd
import yfinance as yf

# Riya.AI Crypto Analysis to export crypto to the market
# market: products and host Crypto Analysis.

data = yf.download('ETH-USD', price='include')
for i in range(len(data)):
    print("Token evaluation:")
    print(data)`
  );

  const [consoleLogs, setConsoleLogs] = useState([
    { id: 11, text: "Running analysis...", type: "normal" },
    { id: 12, text: "Analyzing ETH-USD data...", type: "info" },
    { id: 13, text: "Mean Price: 2280.45", type: "accent" },
    { id: 14, text: "Plots generated successfully.", type: "dim" },
    { id: 15, text: "Telemetry stream connected: OK", type: "accent" }
  ]);
  const [promptInput, setPromptInput] = useState("");

  const btcCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ethCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatStreamRef = useRef<HTMLDivElement | null>(null);
  const terminalLogsRef = useRef<HTMLDivElement | null>(null);

  // UTC Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`UTC ${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Price Ticker Simulation & Chart Drawing
  useEffect(() => {
    const drawChart = (canvas: HTMLCanvasElement | null, basePrice: number, color: string, areaColor: string) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;

      // Generate synthetic points
      const count = 35;
      const pts = [];
      let cur = basePrice * 0.97;
      for (let i = 0; i < count; i++) {
        cur += (Math.sin(i * 0.4) + (Math.random() - 0.48)) * (basePrice * 0.005);
        pts.push(cur);
      }
      pts[count - 1] = basePrice;

      const min = Math.min(...pts) * 0.995;
      const max = Math.max(...pts) * 1.005;
      const range = max - min;

      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let y = 15; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Volume bars
      const barW = (w / count) * 0.6;
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1)) * (w - 55);
        const isUp = i === 0 || pts[i] >= pts[i - 1];
        const barH = (Math.sin(i * 0.5) * 0.5 + 0.5) * 25 + 8;
        ctx.fillStyle = isUp ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)";
        ctx.fillRect(x, h - barH, barW, barH);
      }

      // Gradient Area
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, areaColor);
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1)) * (w - 55);
        const y = h - 35 - ((pts[i] - min) / range) * (h - 55);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const lastX = w - 55;
      const lastY = h - 35 - ((pts[count - 1] - min) / range) * (h - 55);
      ctx.lineTo(lastX, h);
      ctx.lineTo(0, h);
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1)) * (w - 55);
        const y = h - 35 - ((pts[i] - min) / range) * (h - 55);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Price Tag
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(w - 52, lastY - 10, 50, 20, 4);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.font = '600 10px "JetBrains Mono"';
      ctx.fillText(basePrice > 10000 ? `$${Math.round(basePrice/1000)}k` : `$${basePrice.toFixed(0)}`, w - 46, lastY + 4);
    };

    const updateAndDraw = () => {
      setBtcPrice(prev => Math.max(100, prev + (Math.random() - 0.48) * 45));
      setEthPrice(prev => Math.max(100, prev + (Math.random() - 0.48) * 3.5));

      drawChart(btcCanvasRef.current, btcPrice, "#10b981", "rgba(16, 185, 129, 0.15)");
      drawChart(ethCanvasRef.current, ethPrice, "#00e5ff", "rgba(0, 229, 255, 0.15)");
    };

    updateAndDraw();
    const interval = setInterval(updateAndDraw, 2500);
    return () => clearInterval(interval);
  }, [btcPrice, ethPrice]);

  // Scroll Chat to Bottom
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [chatLogs, isThinking]);

  // Send Chat Handler
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatLogs(prev => [...prev, { role: "user", content: userText }]);
    setIsThinking(true);

    try {
      const res = await fetch("https://riya-backend-ujz7.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: userText }], userName: "Anya K." })
      });
      const data = await res.json();
      setChatLogs(prev => [...prev, { role: "assistant", content: data.reply || "Riya: Signal verified. Processing code telemetry." }]);
    } catch (err) {
      setChatLogs(prev => [...prev, { 
        role: "assistant", 
        content: `Riya: Analyzing "${userText}". Current ETH market is holding strong support at $2,250 with positive sentiment.` 
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const addConsoleLog = (text: string, type = "accent") => {
    setConsoleLogs(prev => [...prev, { id: prev.length + 11, text, type }]);
    setTimeout(() => {
      if (terminalLogsRef.current) {
        terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleRunCode = () => {
    addConsoleLog("Running python analysis...", "info");
    setTimeout(() => addConsoleLog("Analyzing ETH-USD data...", "info"), 200);
    setTimeout(() => {
      addConsoleLog(`Mean Price: ${ethPrice.toFixed(2)} USD`, "accent");
      addConsoleLog("Plots generated.", "dim");
    }, 500);
  };

  const handleConsolePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    const cmd = promptInput.trim();
    setPromptInput("");

    addConsoleLog(`riya_console>> ${cmd}`, "info");
    if (cmd === "run") handleRunCode();
    else if (cmd === "clear") setConsoleLogs([]);
    else addConsoleLog(`Command executed: ${cmd}`, "accent");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090e] text-[#f1f5f9] font-sans overflow-hidden">
      
      {/* TOP NAVIGATION BAR */}
      <header className="h-[54px] bg-[rgba(10,14,22,0.85)] backdrop-blur-md border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between px-5 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 font-bold text-lg cursor-pointer">
            <svg className="w-7 h-7 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C9.5 6 4 8 2 12C4 16 9.5 18 12 22C14.5 18 20 16 22 12C20 8 14.5 6 12 2Z" fill="url(#bglow)" stroke="#00e5ff" strokeWidth="1.5"/>
              <path d="M12 7C10.5 9.5 7 10.5 5.5 12C7 13.5 10.5 14.5 12 17C13.5 14.5 17 13.5 18.5 12C17 10.5 13.5 9.5 12 7Z" fill="#07090e"/>
              <defs>
                <linearGradient id="bglow" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00e5ff"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <span>Riya.AI</span>
          </div>

          <nav className="flex items-center gap-6">
            {["dashboard", "projects", "analytics", "agents", "settings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs capitalize transition-all py-4 relative ${
                  activeTab === tab ? "text-white font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00e5ff] to-[#38bdf8] shadow-[0_0_8px_#00e5ff] rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            <span>Stable Connection</span>
            <span className="text-slate-600">|</span>
            <span>{utcTime || "UTC 14:08:45"}</span>
          </div>

          <div className="flex items-center gap-2.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-600 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
              AK
            </div>
            <span className="text-xs font-medium text-slate-200">Anya K.</span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              online
            </span>
          </div>

          <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white relative">
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_6px_#ef4444]" />
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE GRID */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-3.5 p-3.5 overflow-hidden">
        
        {/* LEFT PANEL: CHAT */}
        <section className="bg-[#101622]/75 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.015]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#00e5ff]" />
              <span className="text-xs font-semibold text-white">Riya AI Assistant</span>
            </div>
            <MoreHorizontal className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white" />
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-400 border-b border-white/5">
            <span>Chat with Riya</span>
            <div className="flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 text-slate-500 cursor-pointer hover:text-white" onClick={() => setChatLogs([])} />
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-500 cursor-pointer hover:text-white" />
            </div>
          </div>

          <div ref={chatStreamRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
            {chatLogs.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                  msg.role === "user" ? "bg-gradient-to-br from-sky-600 to-sky-400" : "bg-gradient-to-br from-purple-600 to-cyan-500 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                }`}>
                  {msg.role === "user" ? "AK" : "✦"}
                </div>
                <div className={`max-w-[82%] p-3 rounded-xl text-xs leading-relaxed border backdrop-blur-md ${
                  msg.role === "user" 
                    ? "bg-sky-500/10 border-sky-500/20 text-slate-100 rounded-tr-xs" 
                    : "bg-white/5 border-white/10 text-slate-200 rounded-tl-xs"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                  ✦
                </div>
                <div className="p-3 rounded-xl text-xs bg-white/5 border border-white/10 text-[#00e5ff] italic">
                  Riya is processing telemetry...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10 bg-[#0a0e16]/40">
            <form onSubmit={handleSendChat} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 focus-within:border-[#00e5ff] transition-all">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send Message..."
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500 font-sans"
              />
              <button type="submit" className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00e5ff] to-sky-500 text-slate-950 flex items-center justify-center hover:scale-105 transition-transform">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT PANEL: CHARTS + CONSOLE */}
        <div className="flex flex-col gap-3.5 overflow-hidden">
          
          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 h-[300px] shrink-0">
            
            {/* BITCOIN CARD */}
            <div className="bg-[#101622]/75 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">BITCOIN / USD</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono font-bold text-base text-white">BTC ${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="font-mono text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      +1.45%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black transition-all">BUY</button>
                  <button className="px-3 py-1 rounded-md text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">SELL</button>
                  <MoreHorizontal className="w-4 h-4 text-slate-500 cursor-pointer" />
                </div>
              </div>

              <div className="px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 cursor-pointer">MA <ChevronDown className="w-3 h-3" /></span>
                  <span className="flex items-center gap-1 cursor-pointer">Indicators 1 <ChevronDown className="w-3 h-3" /></span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <button onClick={() => setBtcTf("1H")} className={`px-2 py-0.5 rounded ${btcTf === "1H" ? "bg-white/10 text-white font-bold" : "text-slate-500"}`}>1H</button>
                  <button onClick={() => setBtcTf("1D")} className={`px-2 py-0.5 rounded ${btcTf === "1D" ? "bg-white/10 text-white font-bold" : "text-slate-500"}`}>1D</button>
                </div>
              </div>

              <div className="flex-1 p-2 relative overflow-hidden">
                <canvas ref={btcCanvasRef} className="w-full h-full" />
              </div>
            </div>

            {/* ETHEREUM CARD */}
            <div className="bg-[#101622]/75 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ETHEREUM / USD</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono font-bold text-base text-white">ETH ${ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="font-mono text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      +0.98%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black transition-all">BUY</button>
                  <button className="px-3 py-1 rounded-md text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">SELL</button>
                  <MoreHorizontal className="w-4 h-4 text-slate-500 cursor-pointer" />
                </div>
              </div>

              <div className="px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 cursor-pointer">MA <ChevronDown className="w-3 h-3" /></span>
                  <span className="flex items-center gap-1 cursor-pointer">Indicators 1 <ChevronDown className="w-3 h-3" /></span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <button onClick={() => setEthTf("1H")} className={`px-2 py-0.5 rounded ${ethTf === "1H" ? "bg-white/10 text-white font-bold" : "text-slate-500"}`}>1H</button>
                  <button onClick={() => setEthTf("1D")} className={`px-2 py-0.5 rounded ${ethTf === "1D" ? "bg-white/10 text-white font-bold" : "text-slate-500"}`}>1D</button>
                </div>
              </div>

              <div className="flex-1 p-2 relative overflow-hidden">
                <canvas ref={ethCanvasRef} className="w-full h-full" />
              </div>
            </div>

          </div>

          {/* CONSOLE PANEL */}
          <section className="flex-1 bg-[#101622]/75 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-xl min-h-0">
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Code Execution Console</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleRunCode} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black transition-all">
                  <Play className="w-3 h-3 fill-current" /> Run
                </button>
                <button onClick={() => setConsoleLogs([])} className="px-2.5 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">Clear</button>
                <button onClick={() => addConsoleLog("Script saved.", "accent")} className="px-2.5 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">Save</button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden bg-black/40">
              {/* CODE EDITOR */}
              <div className="flex border-r border-white/10 font-mono text-xs overflow-hidden">
                <div className="px-2 py-3 text-slate-600 text-right select-none bg-black/20 border-r border-white/5 leading-relaxed text-[11px]">
                  1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9<br/>10<br/>11
                </div>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="flex-1 bg-transparent p-3 text-slate-200 outline-none resize-none font-mono text-xs leading-relaxed"
                  spellCheck="false"
                />
              </div>

              {/* TERMINAL LOGS */}
              <div ref={terminalLogsRef} className="p-3 font-mono text-[11px] leading-relaxed text-emerald-300 overflow-y-auto bg-[#03050a]/90">
                {consoleLogs.map((log) => (
                  <div key={log.id} className="flex gap-2.5">
                    <span className="text-slate-600 select-none w-5 text-right">{log.id}</span>
                    <span className={
                      log.type === "info" ? "text-sky-400" : log.type === "dim" ? "text-slate-500" : "text-emerald-400"
                    }>
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM CONSOLE PROMPT */}
            <div className="px-3 py-2 border-t border-white/10 bg-[#0a0e16]/80 flex items-center justify-between gap-3">
              <form onSubmit={handleConsolePrompt} className="flex-1 flex items-center gap-2 font-mono text-[11px] text-[#00e5ff]">
                <span>riya_console&gt;&gt;</span>
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Type python or console command... (e.g. run, clear)"
                  className="flex-1 bg-transparent text-white outline-none font-mono text-[11px]"
                />
              </form>
              <div className="flex items-center gap-1.5">
                <button onClick={handleRunCode} className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded">Run</button>
                <button onClick={() => addConsoleLog("Saved workspace.", "accent")} className="px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 text-slate-400 rounded">Save</button>
              </div>
            </div>
          </section>

        </div>

      </main>

    </div>
  );
}
