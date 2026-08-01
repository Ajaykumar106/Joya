"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Shield, Command, Menu, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function HUDOverlay({ onToggleView }: { onToggleView?: () => void }) {
  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "SYSTEMS ONLINE. HOW CAN I HELP YOU, BOSS?" }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isThinking]);

  const handleCommand = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      const userMessage = input.trim();
      setInput("");
      
      const newLog = [...chatLog, { role: "user", content: userMessage }];
      setChatLog(newLog);
      setIsThinking(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newLog, userName: "Boss" })
        });
        const data = await res.json();
        setChatLog(prev => [...prev, { role: "assistant", content: data.reply || "ERROR." }]);
      } catch (err) {
        setChatLog(prev => [...prev, { role: "assistant", content: "NETWORK INTERFERENCE DETECTED." }]);
      } finally {
        setIsThinking(false);
      }
    }
  };

  const handleNewDirective = () => {
    setChatLog([{ role: "assistant", content: "MEMORY CLEARED. AWAITING NEW DIRECTIVE, BOSS." }]);
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex h-full w-full overflow-hidden">
      
      {/* TOGGLE BUTTON (When sidebar is closed) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setSidebarOpen(true)}
            className="absolute top-6 left-6 pointer-events-auto p-2 rounded-lg bg-[rgba(0,10,30,0.6)] border border-[rgba(0,136,255,0.2)] text-[rgba(0,136,255,0.8)] hover:text-[#0088ff] hover:bg-[rgba(0,136,255,0.1)] transition-all backdrop-blur-md"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR - TOGGLEABLE */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-[85vw] sm:w-72 h-full pointer-events-auto flex flex-col border-r border-[rgba(0,136,255,0.15)] absolute left-0 top-0 bottom-0 z-50"
            style={{
              background: "linear-gradient(90deg, rgba(0, 5, 15, 0.9) 0%, rgba(0, 10, 30, 0.5) 100%)",
              backdropFilter: "blur(25px)",
            }}
          >
            <div className="p-6 flex items-center justify-between border-b border-[rgba(0,136,255,0.1)]">
              <div className="flex items-center gap-3">
                <Shield className="text-[#0088ff] w-5 h-5" />
                <div className="text-[#0088ff] font-bold tracking-widest text-sm glow-text">RIYA CORE</div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-[rgba(0,136,255,0.6)] hover:text-[#0088ff] transition-colors"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <button 
                onClick={handleNewDirective}
                className="w-full flex items-center justify-center gap-2 bg-[rgba(0,136,255,0.1)] hover:bg-[rgba(0,136,255,0.2)] border border-[rgba(0,136,255,0.3)] text-[#0088ff] py-3 px-4 rounded-lg transition-all font-mono text-xs tracking-wider"
              >
                <Plus className="w-4 h-4" /> NEW DIRECTIVE
              </button>
            </div>
            
            {/* Removed non-working elements as requested to keep UI clean and functional */}
            <div className="flex-1 p-6 flex items-end opacity-30">
              <div className="text-[10px] font-mono text-[#0088ff]">SECURE CONNECTION ESTABLISHED.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA (CLAUDE STYLE - CENTERED, INPUT AT BOTTOM) */}
      <div className={`flex-1 flex flex-col h-full pointer-events-none transition-all duration-500 ${sidebarOpen ? 'md:ml-72' : 'ml-0'}`}>
        
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 flex flex-col w-full max-w-3xl mx-auto pointer-events-auto">
          <div className="flex-1" /> {/* Pushes chat to bottom */}
          <div className="space-y-6 pb-4">
            <AnimatePresence initial={false}>
              {chatLog.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'user' ? (
                      <span className="text-[rgba(255,255,255,0.4)] font-mono text-[10px] tracking-widest uppercase">Boss</span>
                    ) : (
                      <span className="text-[#0088ff] font-mono text-[10px] tracking-widest uppercase glow-text">Riya</span>
                    )}
                  </div>
                  <div 
                    className={`text-[15px] tracking-wide leading-relaxed px-5 py-3 rounded-2xl max-w-[85%] ${
                      msg.role === 'user' 
                        ? 'bg-[rgba(0,136,255,0.15)] border border-[rgba(0,136,255,0.3)] text-white rounded-tr-sm shadow-[0_4px_15px_rgba(0,136,255,0.1)] backdrop-blur-md' 
                        : 'bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] text-[#e0f2fe] rounded-tl-sm backdrop-blur-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isThinking && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-start w-full"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#0088ff] font-mono text-[10px] tracking-widest uppercase glow-text">Riya</span>
                  </div>
                  <div className="text-[15px] tracking-wide leading-relaxed px-5 py-3 rounded-2xl rounded-tl-sm bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] text-[#0088ff] flex items-center gap-2 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 bg-[#0088ff] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-[#0088ff] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-[#0088ff] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area Fixed at Bottom Center */}
        <div className="w-full max-w-3xl mx-auto p-4 pb-8 pointer-events-auto">
          <div className="relative flex items-center bg-[rgba(0,10,30,0.6)] backdrop-blur-xl rounded-2xl border border-[rgba(0,136,255,0.2)] focus-within:border-[#0088ff] focus-within:shadow-[0_0_20px_rgba(0,136,255,0.2)] transition-all overflow-hidden p-2 shadow-2xl">
            {/* Subtle inner top highlight */}
            <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-[#00aaff] to-transparent opacity-30"></div>
            
            <div className="pl-3">
              <Command className="w-5 h-5 text-[#0088ff] opacity-80" />
            </div>
            
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleCommand}
              placeholder="Message Riya..."
              className="flex-1 bg-transparent border-none outline-none text-white font-sans text-base px-4 py-3 placeholder:text-[rgba(255,255,255,0.3)]"
            />
            
            <button className="mr-1 text-[rgba(0,136,255,0.8)] hover:scale-110 transition-transform p-3 rounded-xl bg-[rgba(0,136,255,0.1)] hover:bg-[#0088ff] hover:text-black shadow-[0_0_10px_rgba(0,136,255,0.2)]">
              <Mic className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center mt-3">
             <p className="text-[rgba(255,255,255,0.3)] text-[11px] font-mono tracking-widest">AURA-7 CORE SECURE UPLINK</p>
          </div>
        </div>

      </div>
    </div>
  );
}
