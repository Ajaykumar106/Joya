"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Mic, Send, Menu, Sparkles, Radio, Globe, Search, Copy, Check, Volume2 } from "lucide-react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

/* ════════════════════════════════════════════════════════════════
   3D ROTATING GLOBE — heartbeat pulse when Joya is speaking
   ════════════════════════════════════════════════════════════════ */
function RotatingGlobe({ isActive, isLiveMode }: { isActive: boolean; isLiveMode?: boolean }) {
  const wireRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_s, dt) => {
    if (wireRef.current) {
      wireRef.current.rotation.y += dt * 0.35;
      wireRef.current.rotation.x += dt * 0.15;
    }
    if (ring1.current) {
      ring1.current.rotation.x += dt * (isActive ? 1.4 : 0.7);
      ring1.current.rotation.z += dt * 0.3;
    }
    if (ring2.current) {
      ring2.current.rotation.y -= dt * (isActive ? 1.0 : 0.5);
      ring2.current.rotation.x += dt * 0.4;
    }
    if (ring3.current) {
      ring3.current.rotation.z += dt * (isActive ? 1.2 : 0.6);
      ring3.current.rotation.y += dt * 0.2;
    }
    if (innerRef.current) {
      if (isActive) {
        const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.15;
        innerRef.current.scale.set(pulse, pulse, pulse);
      } else {
        innerRef.current.scale.set(1, 1, 1);
      }
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isActive ? 0.12 + Math.sin(Date.now() * 0.006) * 0.08 : 0.05;
    }
  });

  return (
    <group position={isLiveMode ? [0, 0, 0] : [-2, 0.6, 0]} scale={isLiveMode ? [1.5, 1.5, 1.5] : [1, 1, 1]}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial color="#88c0ff" transparent opacity={0.05} />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#c0dfff" transparent opacity={0.1} />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[1.3, 28, 28]} />
        <meshBasicMaterial color="#88c0ff" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={ring1} rotation={[0.3, 0.5, 0]}>
        <ringGeometry args={[1.65, 1.67, 80]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>
      <mesh ref={ring2} rotation={[1.2, 0.8, 0.4]}>
        <ringGeometry args={[1.85, 1.87, 80]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.45} />
      </mesh>
      <mesh ref={ring3} rotation={[0.7, 1.5, 0.9]}>
        <ringGeometry args={[2.05, 2.07, 80]} />
        <meshBasicMaterial color="#88c0ff" side={THREE.DoubleSide} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ════════════════════════════════════════
   COPY BUTTON for code blocks
   ════════════════════════════════════════ */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all text-xs flex items-center gap-1"
    >
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
}

/* ════════════════════════════════════════
   MARKDOWN RENDERER — beautiful output
   ════════════════════════════════════════ */
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeStr = String(children).replace(/\n$/, "");
          if (match) {
            return (
              <div className="relative my-3 rounded-xl overflow-hidden border border-white/10">
                <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] text-[10px] font-mono text-white/50 border-b border-white/10">
                  <span>{match[1]}</span>
                  <CopyButton text={codeStr} />
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "16px",
                    background: "#0d1117",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    borderRadius: 0,
                  }}
                >
                  {codeStr}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-[#7dd3fc] font-mono text-[13px]" {...props}>
              {children}
            </code>
          );
        },
        h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2 border-b border-white/10 pb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-3 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-white/90 mt-2 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#7dd3fc] underline underline-offset-2 hover:text-white transition-colors">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#88c0ff]/40 pl-4 my-2 text-white/70 italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-white/5 text-white/80">{children}</thead>,
        th: ({ children }) => <th className="px-4 py-2 text-left font-semibold border-b border-white/10">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 border-b border-white/5">{children}</td>,
        hr: () => <hr className="border-white/10 my-4" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ════════════════════════════════════════
   MESSAGE TYPES
   ════════════════════════════════════════ */
interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  isStreaming?: boolean;
  searchResults?: { title: string; url: string; content: string }[];
}

/* ════════════════════════════════════════════════════════════════
   MAIN JOYA CHAT UI
   ════════════════════════════════════════════════════════════════ */
export default function HermesUI({
  onToggleView,
  onOpenSidebar,
}: {
  onToggleView?: () => void;
  onOpenSidebar?: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "24px";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  };

  // ── Web Search ──
  const doWebSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch("https://riya-backend-ujz7.onrender.com/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      return data.results || [];
    } catch {
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // ── Send Message ──
  const sendMessage = async (text: string) => {
    if (!text.trim() || isResponding) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = { id: "u-" + Date.now(), role: "user", content: text.trim(), time };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsResponding(true);
    if (inputRef.current) inputRef.current.style.height = "24px";
    window.dispatchEvent(new CustomEvent("core-status", { detail: "speaking" }));

    // Check if user wants a web search
    const searchTriggers = /search|google|look up|find out|latest|current|what.?is.?happening|news about|who is|weather/i;
    let searchContext = "";
    let searchResults: { title: string; url: string; content: string }[] = [];

    if (searchTriggers.test(text)) {
      searchResults = await doWebSearch(text);
      if (searchResults.length > 0) {
        searchContext = "\n\n[WEB SEARCH RESULTS]:\n" +
          searchResults.map((r: { title: string; url: string; content: string }, i: number) =>
            `${i + 1}. ${r.title}\nURL: ${r.url}\n${r.content}`
          ).join("\n\n");
      }
    }

    const aiMsgId = "a-" + Date.now();
    const aiTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { id: aiMsgId, role: "ai", content: "", time: aiTime, isStreaming: true, searchResults },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text.trim() + searchContext }],
          userName: "Boss",
          stream: true,
        }),
      });

      if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content || parsed.token || "";
                if (token) {
                  fullText += token;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === aiMsgId ? { ...m, content: fullText } : m))
                  );
                }
              } catch { /* skip */ }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false, content: fullText || "Protocol active." } : m
          )
        );
      } else {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: data.reply || "Protocol complete.", isStreaming: false } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: "Connection lost. Neural link severed.", isStreaming: false } : m
        )
      );
    } finally {
      setIsResponding(false);
      window.dispatchEvent(new CustomEvent("core-status", { detail: "idle" }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // ── Voice ──
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => sendMessage(e.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const prevIsResponding = useRef(isResponding);
  useEffect(() => {
    if (isLiveMode && prevIsResponding.current === true && isResponding === false) {
      setTimeout(() => {
        if (!isListening) toggleVoice();
      }, 300);
    }
    prevIsResponding.current = isResponding;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResponding, isLiveMode]);

  const handleFileUpload = () => fileInputRef.current?.click();
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const preview = content.length > 2000 ? content.slice(0, 2000) + "\n...(truncated)" : content;
      sendMessage(`📎 **File: ${file.name}**\n\nAnalyze this file:\n\`\`\`\n${preview}\n\`\`\``);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[#*`_~\[\]()>|]/g, "").slice(0, 500));
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((v) => v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Zira")) || voices[0];
      if (v) u.voice = v;
      u.rate = 1.05; u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex h-full w-full overflow-hidden bg-[#020b1c]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/joya_bg.jpg" alt="Joya AI" fill style={{ objectFit: "cover" }} className="pointer-events-none opacity-50" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020b1c] via-[#020b1c]/20 to-[#020b1c]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020b1c]/40 via-transparent to-[#020b1c]/40" />
      </div>

      {/* 3D Globe */}
      <div className="absolute inset-0 z-[5] pointer-events-none">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={1} />
          <RotatingGlobe isActive={isResponding} isLiveMode={isLiveMode} />
        </Canvas>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} accept="*/*" />

      {/* Main Layout */}
      <div className="absolute inset-0 z-20 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <button onClick={onOpenSidebar} className="p-2 rounded-lg text-[#88c0ff]/60 hover:text-[#88c0ff] hover:bg-white/5 transition-all">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[#88c0ff] font-mono font-bold tracking-widest text-sm">JOYA</span>
            <AnimatePresence>
              {(isResponding || isSearching) && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                  {isSearching ? (
                    <><Globe className="w-3 h-3 text-emerald-400 animate-spin" /><span className="text-emerald-400 text-[10px] font-mono font-bold tracking-wider">SEARCHING</span></>
                  ) : (
                    <><Radio className="w-3 h-3 text-emerald-400 animate-pulse" /><span className="text-emerald-400 text-[10px] font-mono font-bold tracking-wider">LIVE</span></>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-9" />
        </div>

        {/* Chat Messages */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto no-scrollbar px-4 md:px-0 ${isLiveMode ? 'opacity-0 pointer-events-none hidden' : ''}`}>
          <div className="max-w-2xl mx-auto flex flex-col gap-5 py-4 pb-6">
            {/* Welcome */}
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="flex flex-col items-center justify-center pt-[20vh]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#88c0ff]/30 to-[#88c0ff]/10 border border-[#88c0ff]/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(136,192,255,0.15)]">
                  <Sparkles className="w-7 h-7 text-[#88c0ff]" />
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold text-white/90 mb-2 font-sans">How can I help you, Boss?</h1>
                <p className="text-[#88c0ff]/50 text-sm font-mono">JOYA PROTOCOL ONLINE</p>
                <div className="flex flex-wrap gap-2 mt-8 justify-center max-w-md">
                  {["Write me a Python script", "Search latest AI news", "Explain quantum computing", "Debug my code"].map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="px-3 py-2 rounded-xl text-xs font-mono text-[#88c0ff]/70 border border-[#88c0ff]/15 bg-[#88c0ff]/5 hover:bg-[#88c0ff]/10 hover:border-[#88c0ff]/30 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={
                    msg.role === "user"
                      ? "max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl rounded-br-md text-sm md:text-[15px] leading-relaxed bg-[#88c0ff]/15 border border-[#88c0ff]/25 text-white/90 backdrop-blur-xl shadow-lg"
                      : "max-w-[90%] md:max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md text-sm md:text-[15px] leading-relaxed bg-[#0a1628]/70 border border-[#88c0ff]/15 text-[#d0e8ff] backdrop-blur-xl shadow-lg"
                  }>
                    <div className={`text-[10px] font-mono mb-1.5 ${msg.role === "user" ? "text-[#88c0ff]/50 text-right" : "text-[#88c0ff]/50"}`}>
                      {msg.time}
                    </div>

                    {/* Search Results Badge */}
                    {msg.searchResults && msg.searchResults.length > 0 && (
                      <div className="mb-3 p-2 rounded-lg bg-[#88c0ff]/5 border border-[#88c0ff]/10 text-[11px]">
                        <div className="flex items-center gap-1.5 text-[#88c0ff]/60 mb-1.5 font-mono">
                          <Search className="w-3 h-3" /> Searched {msg.searchResults.length} sources
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.searchResults.map((r, i) => (
                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded-full bg-[#88c0ff]/10 text-[#7dd3fc] hover:bg-[#88c0ff]/20 transition-colors truncate max-w-[200px]">
                              {r.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="prose-sm">
                      {msg.role === "ai" ? (
                        msg.isStreaming ? (
                          <>{msg.content}<span className="animate-pulse text-[#88c0ff]">▊</span></>
                        ) : (
                          <MarkdownContent content={msg.content} />
                        )
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      )}
                    </div>

                    {/* Action buttons for AI */}
                    {msg.role === "ai" && !msg.isStreaming && msg.content && (
                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
                        <button onClick={() => speakText(msg.content)} className="text-[10px] font-mono text-[#88c0ff]/40 hover:text-[#88c0ff] transition-colors flex items-center gap-1">
                          <Volume2 className="w-3 h-3" /> Listen
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(msg.content); }} className="text-[10px] font-mono text-[#88c0ff]/40 hover:text-[#88c0ff] transition-colors flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Input */}
        <div className="w-full px-3 md:px-0 pb-4 md:pb-6 pt-2">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-end gap-2 bg-[#0a1628]/80 backdrop-blur-2xl rounded-2xl border border-[#88c0ff]/20 p-2 shadow-[0_-4px_30px_rgba(0,0,0,0.4),0_0_20px_rgba(136,192,255,0.05)] focus-within:border-[#88c0ff]/40 transition-all">
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#88c0ff]/20 to-transparent" />
              <button onClick={handleFileUpload} className="p-2.5 rounded-xl text-[#88c0ff]/50 hover:text-[#88c0ff] hover:bg-[#88c0ff]/10 transition-all shrink-0" title="Upload file">
                <Plus className="w-5 h-5" />
              </button>
              <textarea ref={inputRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                placeholder="Message Joya..." rows={1}
                className="flex-1 bg-transparent border-none outline-none text-white/90 text-sm md:text-base resize-none max-h-[150px] min-h-[24px] py-2.5 px-1 placeholder:text-white/25 font-sans leading-relaxed"
                style={{ scrollbarWidth: "none" }} />
              <button onClick={toggleVoice}
                className={`p-2.5 rounded-xl transition-all shrink-0 ${isListening ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.3)]" : "text-[#88c0ff]/50 hover:text-[#88c0ff] hover:bg-[#88c0ff]/10"}`}
                title="Voice input">
                <Mic className="w-5 h-5" />
              </button>
              <button onClick={() => setIsLiveMode(!isLiveMode)}
                className={`p-2.5 rounded-xl transition-all shrink-0 ${isLiveMode ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "text-[#88c0ff]/50 hover:text-[#88c0ff] hover:bg-[#88c0ff]/10"}`}
                title="Live mode">
                <Radio className="w-5 h-5" />
              </button>
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || isResponding}
                className="p-2.5 rounded-xl bg-[#88c0ff] text-[#020b1c] hover:bg-[#a0d0ff] disabled:bg-[#88c0ff]/20 disabled:text-[#88c0ff]/30 transition-all shrink-0 shadow-[0_0_15px_rgba(136,192,255,0.2)]"
                title="Send">
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-[10px] font-mono text-white/20 mt-2 tracking-wider">
              Joya can search the web • Upload files • Voice commands
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
