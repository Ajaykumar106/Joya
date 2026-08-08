"use client";

import { useState, useRef, useEffect } from "react";
import { User, Plus, Mic, Activity } from "lucide-react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ReactMarkdown from "react-markdown";

/* ───────────────────────── TYPEWRITER COMPONENT ───────────────────────── */
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
    }, 15); // Faster, smoother typing
    return () => clearInterval(interval);
  }, [content]);

  return (
    <div className="markdown-prose space-y-3">
      <ReactMarkdown>{displayed}</ReactMarkdown>
    </div>
  );
};

/* ───────────────────────── 3D ROTATING GLOBE ───────────────────────── */
function RotatingGlobe({ isLive }: { isLive: boolean }) {
  const wireRef = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((_state, dt) => {
    if (wireRef.current) {
      wireRef.current.rotation.y += dt * 0.35;
      wireRef.current.rotation.x += dt * 0.15;
    }
    if (ring1.current) {
      ring1.current.rotation.x += dt * 0.7;
      ring1.current.rotation.z += dt * 0.3;
    }
    if (ring2.current) {
      ring2.current.rotation.y -= dt * 0.5;
      ring2.current.rotation.x += dt * 0.4;
    }
    if (ring3.current) {
      ring3.current.rotation.z += dt * 0.6;
      ring3.current.rotation.y += dt * 0.2;
    }
    
    // Live animation: Come forward and glow steadily (no heartbeat)
    if (innerRef.current && wireRef.current) {
      if (isLive) {
        innerRef.current.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.05);
        wireRef.current.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.05);
        (innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35;
      } else {
        innerRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
        wireRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
        (innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={innerRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.08} />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[1.6, 28, 28]} />
        <meshBasicMaterial color="#88c0ff" wireframe transparent opacity={0.4} />
      </mesh>
      <mesh ref={ring1} rotation={[0.3, 0.5, 0]}>
        <ringGeometry args={[1.9, 1.92, 80]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>
      <mesh ref={ring2} rotation={[1.2, 0.8, 0.4]}>
        <ringGeometry args={[2.1, 2.12, 80]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.4} />
      </mesh>
      <mesh ref={ring3} rotation={[0.7, 1.5, 0.9]}>
        <ringGeometry args={[2.3, 2.32, 80]} />
        <meshBasicMaterial color="#88c0ff" side={THREE.DoubleSide} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── MAIN UI ───────────────────────── */
export default function HermesUI({ onToggleView }: { onToggleView?: () => void }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ role: string; content: string; time: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isThinking]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setHistory((prev) => [...prev, { role: "user", content: text, time }]);
    setIsThinking(true);

    try {
      // Prepare full conversation history for the Agent context
      const apiMessages = [...history, { role: "user", content: text }].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, userName: "User" }),
      });
      const data = await res.json();
      const reply = data.reply || "Protocol complete.";
      setHistory((prev) => [
        ...prev,
        { role: "ai", content: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { role: "ai", content: "NETWORK INTERFERENCE DETECTED.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col h-full w-full overflow-hidden bg-[#010612] font-mono text-[#88c0ff]">
      
      {/* Dynamic Markdown Styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .markdown-prose p { margin-bottom: 0.75rem; }
        .markdown-prose p:last-child { margin-bottom: 0; }
        .markdown-prose strong { color: #ffffff; font-weight: 600; }
        .markdown-prose h1, .markdown-prose h2, .markdown-prose h3 { color: #ffffff; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; }
        .markdown-prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-prose li { margin-bottom: 0.25rem; }
        .markdown-prose code { background: rgba(136, 192, 255, 0.15); padding: 0.1rem 0.3rem; border-radius: 0.25rem; color: #00e5ff; font-family: monospace; font-size: 0.9em; }
        .markdown-prose pre { background: rgba(0, 10, 30, 0.8); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 0.75rem; border: 1px solid rgba(136, 192, 255, 0.2); }
        .markdown-prose pre code { background: transparent; padding: 0; color: #e0f2fe; }
      `}} />

      {/* ── Background Image ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/joya_bg.jpg"
          alt="Joya AI"
          fill
          style={{ objectFit: "cover" }}
          className="pointer-events-none opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#010612] via-[#010612]/40 to-transparent" />
      </div>

      {/* ── 3D Centered Globe ── */}
      <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={1} />
          <RotatingGlobe isLive={isLive} />
        </Canvas>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" />

      {/* ── Chat UI Layer ── */}
      <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
        
        {/* Chat Messages Area (Starts from top naturally) */}
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-8 flex flex-col pointer-events-auto overflow-hidden mt-16">
          <div
            ref={scrollRef}
            className="flex flex-col gap-6 overflow-y-auto pb-4 pr-2 w-full"
            style={{
              maxHeight: "100%",
              scrollbarWidth: "none",        
              msOverflowStyle: "none",       
            }}
          >
            <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>

            {history.length === 0 && !isThinking && (
              <div className="text-center mt-12 py-8 text-[#88c0ff]/40 text-sm tracking-widest uppercase">
                AWAITING QUERY.
              </div>
            )}

            {history.map((msg, i) => {
              const isLastAIMessage = i === history.length - 1 && msg.role === 'ai';
              
              return (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === "user" ? "ml-auto text-right items-end" : "mr-auto text-left items-start"}`}
                  style={{ maxWidth: "85%" }}
                >
                  <div className={`text-[10px] text-[#88c0ff]/50 mb-1.5 font-bold uppercase tracking-wider flex items-center gap-2`}>
                    {msg.role === "ai" && (
                      <div className="w-5 h-5 rounded-full border border-[#88c0ff]/40 flex items-center justify-center shrink-0 bg-[#000a1e]/60">
                        <User className="w-3 h-3 text-[#88c0ff]" />
                      </div>
                    )}
                    <span>{msg.role === "ai" ? `JOYA • ${msg.time}` : `USER • ${msg.time}`}</span>
                  </div>
                  
                  {/* Professional Frosted Glass Container for readable text */}
                  <div className={`break-words leading-relaxed text-[#e0f2fe] text-sm md:text-base px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,5,15,0.6)] backdrop-blur-xl border ${msg.role === 'user' ? 'bg-[#003366]/40 border-[#88c0ff]/20' : 'bg-[#000a1a]/70 border-[#88c0ff]/10'}`}>
                    {isLastAIMessage 
                      ? <TypewriterMessage content={msg.content} /> 
                      : (
                        <div className="markdown-prose space-y-3">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )
                    }
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex flex-col mr-auto text-left items-start" style={{ maxWidth: "85%" }}>
                <div className={`text-[10px] text-[#88c0ff]/50 mb-1.5 font-bold uppercase tracking-wider flex items-center gap-2`}>
                  <div className="w-5 h-5 rounded-full border border-[#88c0ff]/40 flex items-center justify-center shrink-0 bg-[#000a1e]/60">
                    <User className="w-3 h-3 text-[#88c0ff]" />
                  </div>
                  <span>JOYA • THINKING</span>
                </div>
                <div className="break-words leading-relaxed text-[#88c0ff]/60 text-sm md:text-base px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,5,15,0.6)] backdrop-blur-xl bg-[#000a1a]/70 border border-[#88c0ff]/10 animate-pulse">
                  Processing data stream...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Bar Area (Bottom docked) */}
        <div className="w-full max-w-3xl mx-auto px-4 md:px-8 pb-8 pt-4 pointer-events-auto shrink-0">
          <div className={`transition-all duration-500 bg-[#000511]/80 backdrop-blur-3xl rounded-[24px] p-2 flex flex-col gap-2 border shadow-[0_10px_40px_rgba(0,0,0,0.8)] ${isLive ? 'border-[#00e5ff]/50 shadow-[0_0_30px_rgba(0,229,255,0.15)]' : 'border-[#88c0ff]/20'}`}>
            
            <div className="flex items-center gap-2 px-3 py-2">
              <button 
                onClick={handleUploadClick}
                className="p-2 rounded-full hover:bg-[#88c0ff]/10 text-[#88c0ff]/80 transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isLive ? "Joya is listening..." : "Message Joya..."}
                className="flex-1 bg-transparent border-none outline-none text-[#c0dfff] placeholder:text-[#88c0ff]/40 text-sm md:text-base px-2"
              />
              
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => setIsLive(!isLive)}
                  className={`p-2 rounded-full transition-all flex items-center justify-center ${isLive ? 'bg-[#00e5ff]/20 text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'hover:bg-[#88c0ff]/10 text-[#88c0ff]/80'}`}
                >
                  <Activity className={`w-5 h-5 ${isLive ? 'animate-pulse' : ''}`} />
                </button>

                <button className="p-2 rounded-full hover:bg-[#88c0ff]/10 text-[#88c0ff]/80 transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>
            
          </div>
          
          <div className="text-center mt-3 text-[#88c0ff]/30 text-[10px] tracking-widest font-mono">
            JOYA PROTOCOL ONLINE
          </div>
        </div>

      </div>
    </div>
  );
}
