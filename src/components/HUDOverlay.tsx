"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Activity, Cpu, Network, Shield, AlertTriangle, LayoutGrid, Zap } from "lucide-react";

interface HUDOverlayProps {
  onToggleView?: () => void;
}

export default function HUDOverlay({ onToggleView }: HUDOverlayProps) {
  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState<{ role: string; content: string }[]>([
    { role: "riya", content: "RIYA AI CORE ONLINE. ENERGY STREAM ABSORPTION AT 99.8%. HOW MAY I ASSIST YOU, COMMANDER?" }
  ]);
  const [isThinking, setIsThinking] = useState(false);

  // Simulated Live Data
  const [cpuLoad, setCpuLoad] = useState(48);
  const [gpuLoad, setGpuLoad] = useState(64);
  const [memUsage, setMemUsage] = useState(74);
  const [temp, setTemp] = useState(41);
  const [netSpeed, setNetSpeed] = useState("14.2");
  const [packets, setPackets] = useState("98.4k");

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad(Math.floor(Math.random() * 25) + 38);
      setGpuLoad(Math.floor(Math.random() * 20) + 55);
      setMemUsage(Math.floor(Math.random() * 12) + 68);
      setTemp(Math.floor(Math.random() * 6) + 40);
      setNetSpeed((Math.random() * 4 + 12).toFixed(1));
      setPackets((Math.random() * 10 + 92).toFixed(1) + "k");
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = async (e: React.KeyboardEvent | React.FormEvent) => {
    if ('key' in e && e.key !== "Enter") return;
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setChatLog(prev => [...prev, { role: "user", content: userMessage }]);
    setIsThinking(true);

    try {
      const res = await fetch("https://riya-backend-ujz7.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatLog.concat({ role: "user", content: userMessage }), userName: "Commander" })
      });
      const data = await res.json();
      setChatLog(prev => [...prev, { role: "riya", content: data.reply || "COMMAND EXECUTION CONFIRMED." }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: "riya", content: `RIYA COMMAND CONFIRMED FOR "${userMessage}". ARC CORE OPERATIONAL.` }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-6 select-none font-mono overflow-hidden">
      
      {/* TOP BAR */}
      <motion.header 
        initial={{ opacity: 0, y: -40 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8 }}
        className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-3 pointer-events-auto"
      >
        {/* LEFT TOP SYSTEM PANEL */}
        <div className="bg-[rgba(3,10,22,0.8)] backdrop-blur-xl border border-[rgba(0,229,255,0.3)] p-3 sm:p-4 rounded-xl w-full sm:w-64 shadow-[0_0_25px_rgba(0,229,255,0.2)]">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="text-[#00e5ff] w-4 h-4 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-bold text-[#00e5ff] tracking-widest uppercase">SYSTEM STATUS</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#00e5ff] drop-shadow-[0_0_10px_rgba(0,229,255,0.9)] leading-tight">
            OPERATIONAL<br />ACTIVE
          </div>
          <div className="mt-2.5 pt-2 border-t border-[rgba(0,229,255,0.2)] flex justify-between text-[9px] sm:text-[10px] text-[rgba(0,229,255,0.8)]">
            <span>LATENCY: 12ms</span>
            <span>CPU: {cpuLoad}%</span>
            <span>GPU: {gpuLoad}%</span>
          </div>
        </div>

        {/* CENTER TITLE HEADER - RIYA ARC REACTOR */}
        <div className="text-center my-1 sm:my-0">
          <h1 className="text-3xl sm:text-5xl font-black tracking-[0.3em] text-[#00e5ff] drop-shadow-[0_0_30px_rgba(0,229,255,1)]">
            RIYA
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Zap className="w-3.5 h-3.5 text-[#00e5ff] animate-pulse" />
            <span className="text-[9px] sm:text-[10px] tracking-[0.2em] text-[#00e5ff] font-semibold">ARC REACTOR CORE ACTIVE</span>
          </div>
        </div>

        {/* RIGHT TOP PANEL */}
        <div className="bg-[rgba(3,10,22,0.8)] backdrop-blur-xl border border-[rgba(0,229,255,0.3)] p-3 sm:p-4 rounded-xl w-full sm:w-64 text-right shadow-[0_0_25px_rgba(0,229,255,0.2)] hidden sm:block">
          <div className="flex justify-between items-center mb-2 text-[#00e5ff]">
            {onToggleView && (
              <button 
                onClick={onToggleView}
                className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-[rgba(0,229,255,0.15)] border border-[rgba(0,229,255,0.3)] hover:bg-[#00e5ff] hover:text-black transition-colors"
              >
                <LayoutGrid className="w-3 h-3" /> Dashboard
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <Network className="w-3.5 h-3.5" />
              <Cpu className="w-3.5 h-3.5" />
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#00e5ff] tracking-widest block mb-1">NETWORK PROTOCOLS</span>
          <ul className="text-[10px] text-slate-200 space-y-0.5">
            <li>1. SECURE ARC REACTOR LINK</li>
            <li>2. ENERGY CONVERGENCE MATRIX</li>
            <li>3. ORBITAL TELEMETRY</li>
          </ul>
        </div>
      </motion.header>

      {/* MIDDLE SIDE PANELS */}
      <div className="flex flex-col sm:flex-row justify-between items-center flex-1 py-4 pointer-events-auto gap-3">
        
        {/* LEFT MIDDLE: TELEMETRY BARS */}
        <motion.div 
          initial={{ opacity: 0, x: -40 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-[rgba(3,10,22,0.8)] backdrop-blur-xl border border-[rgba(0,229,255,0.3)] p-3 sm:p-4 rounded-xl w-full sm:w-64 space-y-2.5 shadow-[0_0_25px_rgba(0,229,255,0.2)]"
        >
          <div>
            <span className="text-[10px] font-bold text-[#00e5ff] tracking-wider block">NEURAL PROCESSOR 14-X</span>
            <div className="flex items-end h-8 sm:h-10 gap-1 mt-1.5 border-b border-[rgba(0,229,255,0.2)] pb-1">
              {Array.from({ length: 16 }).map((_, i) => (
                <motion.div 
                  key={i}
                  className="flex-1 bg-[#00e5ff] shadow-[0_0_6px_#00e5ff] rounded-t-xs"
                  animate={{ height: [`${Math.random() * 30 + 10}%`, `${Math.random() * 90 + 10}%`, `${Math.random() * 30 + 10}%`] }}
                  transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.6, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-300">
              <span>MEMORY USAGE</span>
              <span className="text-[#00e5ff]">{memUsage}%</span>
            </div>
            <div className="h-2 w-full bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.3)] mt-1 rounded-full overflow-hidden p-0.5">
              <motion.div 
                className="h-full bg-[#00e5ff] shadow-[0_0_10px_#00e5ff] rounded-full" 
                animate={{ width: `${memUsage}%` }}
                transition={{ type: "spring" }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[rgba(0,229,255,0.2)] flex justify-between text-[9px] sm:text-[10px] text-slate-300">
            <span>TEMP: <strong className="text-[#00e5ff]">{temp}°C</strong></span>
            <span>POWER: <strong className="text-[#00e5ff]">98.4W</strong></span>
          </div>
        </motion.div>

        {/* RIGHT MIDDLE: TRAFFIC GRAPH */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-[rgba(3,10,22,0.8)] backdrop-blur-xl border border-[rgba(0,229,255,0.3)] p-3 sm:p-4 rounded-xl w-full sm:w-64 space-y-2.5 shadow-[0_0_25px_rgba(0,229,255,0.2)] hidden sm:block"
        >
          <div>
            <span className="text-[10px] font-bold text-[#00e5ff] tracking-wider block">NETWORK TRAFFIC</span>
            <div className="text-right text-sm sm:text-base font-bold text-white font-mono mt-0.5">{netSpeed} TB/s</div>
            <div className="h-8 sm:h-10 w-full mt-1.5 border-b border-[rgba(0,229,255,0.2)] overflow-hidden relative">
              <svg viewBox="0 0 100 30" className="w-[200%] h-full" preserveAspectRatio="none">
                <motion.polyline 
                  points="0,20 10,25 20,10 30,15 40,5 50,20 60,10 70,25 80,5 90,15 100,20 110,25 120,10"
                  fill="none" 
                  stroke="#00e5ff" 
                  strokeWidth="1.5"
                  className="drop-shadow-[0_0_4px_#00e5ff]"
                  animate={{ x: [-10, -50] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
              </svg>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#00e5ff] tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-[#00e5ff]" /> ALERT STATUS
            </span>
            <div className="text-base sm:text-lg font-bold text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.9)] mt-0.5">NOMINAL</div>
          </div>

          <div className="pt-2 border-t border-[rgba(0,229,255,0.2)] flex justify-between text-[9px] sm:text-[10px] text-slate-300">
            <span>PACKETS: <strong className="text-[#00e5ff]">{packets}</strong></span>
            <span>SECURE: <strong className="text-[#00e5ff]">LVL 4</strong></span>
          </div>
        </motion.div>

      </div>

      {/* BOTTOM CHAT PANEL - AI ASSISTANT RIYA */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full flex justify-center pointer-events-auto"
      >
        <div className="bg-[rgba(3,10,22,0.9)] backdrop-blur-xl border border-[rgba(0,229,255,0.35)] rounded-xl w-full max-w-2xl p-3 sm:p-4 flex flex-col h-36 sm:h-44 shadow-[0_0_35px_rgba(0,229,255,0.25)]">
          <div className="flex items-center justify-between mb-1.5 border-b border-[rgba(0,229,255,0.2)] pb-1.5 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00e5ff]" />
              <span className="font-bold text-[#00e5ff] tracking-wider text-[11px] sm:text-xs">AI ASSISTANT: RIYA</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400">COMMAND MATRIX V4.2</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 mb-1.5 flex flex-col justify-end text-[11px] sm:text-xs">
            {chatLog.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'text-[#00e5ff]' : 'text-slate-100'}>
                <span className="opacity-50 text-[9px] mr-1">{msg.role === 'user' ? 'COMMAND:' : 'RIYA:'}</span>
                {msg.content}
              </div>
            ))}
            {isThinking && (
              <div className="text-[#00e5ff] text-[11px]">
                <span className="opacity-50 text-[9px] mr-1">RIYA:</span>PROCESSING PARAMETERS<span className="animate-pulse">...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleCommand} className="flex items-center gap-2 sm:gap-3 border-t border-[rgba(0,229,255,0.2)] pt-1.5">
            <span className="text-[#00e5ff] font-bold text-xs sm:text-sm">&gt;&gt;</span>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="How can I assist you, Commander?"
              className="flex-1 bg-transparent border-none outline-none text-[#00e5ff] font-mono text-[11px] sm:text-xs placeholder:text-[rgba(0,229,255,0.4)]"
            />
            <button type="submit" className="border border-[rgba(0,229,255,0.4)] p-1 sm:p-1.5 rounded hover:bg-[#00e5ff] hover:text-black transition-colors text-[#00e5ff]">
              <Mic className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </motion.div>

    </div>
  );
}
