"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Shield, Command, Menu, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const TypewriterMessage = ({ content }: { content: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      if (i <= content.length) {
        setDisplayed(content.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15); // Fast but visible typing speed
    return () => clearInterval(interval);
  }, [content]);
  return <>{displayed}</>;
};

export default function HUDOverlay({ onToggleView }: { onToggleView?: () => void }) {
  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "SYSTEMS ONLINE. HOW CAN I HELP YOU, BOSS?" }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isThinking]);

  // Dispatch events to Core3D whenever listening state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('core-status', { detail: isListening ? 'listening' : 'idle' }));
  }, [isListening]);

  // Read response out loud
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes("Google UK English Female") || v.name.includes("Samantha") || v.name.includes("Zira")) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      
      utterance.onstart = () => window.dispatchEvent(new CustomEvent('core-status', { detail: 'speaking' }));
      utterance.onend = () => window.dispatchEvent(new CustomEvent('core-status', { detail: 'idle' }));
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMessage = text.trim();
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
      const reply = data.reply || "ERROR.";
      setChatLog(prev => [...prev, { role: "assistant", content: reply }]);
      speakResponse(reply);
    } catch (err) {
      const errorMsg = "NETWORK INTERFERENCE DETECTED.";
      setChatLog(prev => [...prev, { role: "assistant", content: errorMsg }]);
      speakResponse(errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice control not supported in this browser.");
      return;
    }
    if (isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleNewDirective = () => {
    const msg = "MEMORY CLEARED. AWAITING NEW DIRECTIVE, BOSS.";
    setChatLog([{ role: "assistant", content: msg }]);
    speakResponse(msg);
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex h-full w-full overflow-hidden">
      
      {/* TOGGLE BUTTON */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 md:top-6 md:left-6 pointer-events-auto p-2 rounded-lg bg-[rgba(0,10,30,0.6)] border border-[rgba(0,136,255,0.2)] text-[rgba(0,136,255,0.8)] hover:text-[#0088ff] hover:bg-[rgba(0,136,255,0.1)] transition-all backdrop-blur-md"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-[85vw] sm:w-72 h-full pointer-events-auto flex flex-col border-r border-[rgba(0,136,255,0.15)] absolute left-0 top-0 bottom-0 z-50"
            style={{
              background: "linear-gradient(90deg, rgba(0, 5, 15, 0.95) 0%, rgba(0, 10, 30, 0.8) 100%)",
              backdropFilter: "blur(25px)",
            }}
          >
            <div className="p-4 md:p-6 flex items-center justify-between border-b border-[rgba(0,136,255,0.1)]">
              <div className="flex items-center gap-3">
                <Shield className="text-[#0088ff] w-4 h-4 md:w-5 md:h-5" />
                <div className="text-[#0088ff] font-bold tracking-widest text-xs md:text-sm glow-text">RIYA CORE</div>
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
                className="w-full flex items-center justify-center gap-2 bg-[rgba(0,136,255,0.1)] hover:bg-[rgba(0,136,255,0.2)] border border-[rgba(0,136,255,0.3)] text-[#0088ff] py-2 md:py-3 px-4 rounded-lg transition-all font-mono text-[10px] md:text-xs tracking-wider"
              >
                <Plus className="w-4 h-4" /> NEW DIRECTIVE
              </button>
            </div>
            
            <div className="flex-1 p-6 flex items-end opacity-30">
              <div className="text-[9px] md:text-[10px] font-mono text-[#0088ff]">SECURE CONNECTION ESTABLISHED.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <div className={`flex-1 flex flex-col h-full pointer-events-none transition-all duration-500 ${sidebarOpen ? 'md:ml-72' : 'ml-0'}`}>
        
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 md:p-8 flex flex-col w-full max-w-3xl mx-auto pointer-events-auto">
          <div className="flex-1" />
          <div className="space-y-4 md:space-y-6 pb-2 md:pb-4">
            <AnimatePresence initial={false}>
              {chatLog.map((msg, i) => {
                const isLastAssistantMessage = i === chatLog.length - 1 && msg.role === 'assistant' && i !== 0;
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === 'user' ? (
                        <span className="text-[rgba(255,255,255,0.4)] font-mono text-[9px] md:text-[10px] tracking-widest uppercase">Boss</span>
                      ) : (
                        <span className="text-[#0088ff] font-mono text-[9px] md:text-[10px] tracking-widest uppercase glow-text">Riya</span>
                      )}
                    </div>
                    <div 
                      className={`text-[13px] md:text-[15px] tracking-wide leading-relaxed px-4 py-2.5 md:px-5 md:py-3 rounded-2xl max-w-[90%] md:max-w-[85%] ${
                        msg.role === 'user' 
                          ? 'bg-[rgba(0,136,255,0.15)] border border-[rgba(0,136,255,0.3)] text-white rounded-tr-sm shadow-[0_4px_15px_rgba(0,136,255,0.1)] backdrop-blur-md' 
                          : 'bg-[rgba(0,10,30,0.6)] border border-[rgba(0,136,255,0.2)] text-[#e0f2fe] rounded-tl-sm backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.3)]'
                      }`}
                    >
                      {isLastAssistantMessage ? <TypewriterMessage content={msg.content} /> : msg.content}
                    </div>
                  </motion.div>
                );
              })}
              {isThinking && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-start w-full"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#0088ff] font-mono text-[9px] md:text-[10px] tracking-widest uppercase glow-text">Riya</span>
                  </div>
                  <div className="text-[13px] md:text-[15px] tracking-wide leading-relaxed px-4 py-2.5 md:px-5 md:py-3 rounded-2xl rounded-tl-sm bg-[rgba(0,10,30,0.6)] border border-[rgba(0,136,255,0.2)] text-[#0088ff] flex items-center gap-2 backdrop-blur-md">
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
        <div className="w-full max-w-3xl mx-auto p-2 md:p-4 pb-6 md:pb-8 pointer-events-auto">
          <div className="relative flex items-center bg-[rgba(0,10,30,0.7)] backdrop-blur-xl rounded-xl md:rounded-2xl border border-[rgba(0,136,255,0.2)] focus-within:border-[#0088ff] focus-within:shadow-[0_0_20px_rgba(0,136,255,0.2)] transition-all overflow-hidden p-1.5 md:p-2 shadow-2xl">
            {/* Subtle inner top highlight */}
            <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-[#00aaff] to-transparent opacity-30"></div>
            
            <div className="pl-2 md:pl-3">
              <Command className="w-4 h-4 md:w-5 md:h-5 text-[#0088ff] opacity-80" />
            </div>
            
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleCommand}
              placeholder="Message Riya..."
              className="flex-1 bg-transparent border-none outline-none text-white font-sans text-sm md:text-base px-3 py-2 md:px-4 md:py-3 placeholder:text-[rgba(255,255,255,0.3)]"
            />
            
            <button 
              onClick={toggleListening}
              className={`mr-1 p-2.5 md:p-3 rounded-lg md:rounded-xl transition-all ${
                isListening 
                  ? "bg-[#0088ff]/20 text-[#00e5ff] border border-[#00e5ff] animate-pulse shadow-[0_0_15px_rgba(0,229,255,0.5)]" 
                  : "bg-[rgba(0,136,255,0.1)] text-[rgba(0,136,255,0.8)] hover:bg-[#0088ff] hover:text-black shadow-[0_0_10px_rgba(0,136,255,0.2)]"
              }`}
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          <div className="text-center mt-2 md:mt-3">
             <p className="text-[rgba(255,255,255,0.3)] text-[9px] md:text-[11px] font-mono tracking-widest">AURA-7 CORE SECURE UPLINK</p>
          </div>
        </div>

      </div>
    </div>
  );
}
