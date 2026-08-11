"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { User, Plus, Mic, Activity, ShieldAlert, Zap, Cpu, HardDrive, Clock, Wifi, X, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ReactMarkdown from "react-markdown";
import BootSequence from "./BootSequence";
import Avatar from "./Avatar";

/* ───────────────────────── TYPEWRITER ───────────────────────── */
const TypewriterMessage = ({ content }: { content: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      if (i <= content.length) { setDisplayed(content.slice(0, i)); i++; } 
      else clearInterval(interval);
    }, 5);
    return () => clearInterval(interval);
  }, [content]);
  return <div className="markdown-prose space-y-3"><ReactMarkdown>{displayed}</ReactMarkdown></div>;
};

/* ───────────────────────── AMBIENT SOUND ENGINE ───────────────────────── */
class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private currentState: string = "";
  public muted: boolean = false;

  init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 0.03;
    this.gainNode.connect(this.audioCtx.destination);
  }

  setState(state: string) {
    if (!this.audioCtx || !this.gainNode || state === this.currentState) return;
    this.currentState = state;
    
    // Kill old oscillators
    this.oscillators.forEach(o => { try { o.stop(); } catch(e) {} });
    this.oscillators = [];

    const configs: Record<string, {freqs: number[], type: OscillatorType, gain: number}> = {
      BLUE:   { freqs: [55, 82.5, 110], type: "sine", gain: 0.025 },
      RED:    { freqs: [73.4, 110, 146.8], type: "sawtooth", gain: 0.015 },
      YELLOW: { freqs: [65.4, 98, 130.8], type: "triangle", gain: 0.02 },
      BLACK:  { freqs: [41.2, 55, 82.5], type: "sine", gain: 0.03 },
    };

    const config = configs[state] || configs.BLUE;
    this.gainNode.gain.setTargetAtTime(this.muted ? 0 : config.gain, this.audioCtx.currentTime, 0.5);

    config.freqs.forEach(freq => {
      const osc = this.audioCtx!.createOscillator();
      osc.type = config.type;
      osc.frequency.value = freq;
      osc.connect(this.gainNode!);
      osc.start();
      this.oscillators.push(osc);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(this.muted ? 0 : 0.025, this.audioCtx.currentTime, 0.3);
    }
    return this.muted;
  }

  destroy() {
    this.oscillators.forEach(o => { try { o.stop(); } catch(e) {} });
    if (this.audioCtx) this.audioCtx.close();
  }
}

/* ───────────────────────── 3D ROTATING GLOBE ───────────────────────── */
type AlertState = "BLUE" | "RED" | "YELLOW" | "BLACK";


function RotatingGlobe({ isLive, alertState }: { isLive: boolean, alertState: AlertState }) {
  const wireRef = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  const colors = {
    BLUE:   { inner: 0x0066ff, wire: 0x00aaff, ring1: 0x0044ff, ring2: 0x0088ff, ring3: 0x00aaff, speed: 1, scale: 1 },
    RED:    { inner: 0xff0000, wire: 0xff4444, ring1: 0xaa0000, ring2: 0xff0000, ring3: 0xff4444, speed: 2.5, scale: 1.1 },
    YELLOW: { inner: 0xffaa00, wire: 0xffff00, ring1: 0xaa8800, ring2: 0xffcc00, ring3: 0xffff00, speed: 1.5, scale: 1 },
    BLACK:  { inner: 0x050505, wire: 0x5500ff, ring1: 0x220088, ring2: 0x4400cc, ring3: 0x6600ff, speed: 0.5, scale: 1.2 },
  };

  useFrame((state, dt) => {
    const config = colors[alertState] || colors.BLUE;
    const s = config.speed;
    if (wireRef.current) {
      wireRef.current.rotation.y += dt * 0.35 * s;
      wireRef.current.rotation.x += dt * 0.15 * s;
      (wireRef.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.wire), 0.05);
    }
    if (ring1.current) { ring1.current.rotation.x += dt * 0.7 * s; ring1.current.rotation.z += dt * 0.3 * s; (ring1.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.ring1), 0.05); }
    if (ring2.current) { ring2.current.rotation.y -= dt * 0.5 * s; ring2.current.rotation.x += dt * 0.4 * s; (ring2.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.ring2), 0.05); }
    if (ring3.current) { ring3.current.rotation.z += dt * 0.6 * s; ring3.current.rotation.y += dt * 0.2 * s; (ring3.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.ring3), 0.05); }
    
    if (innerRef.current && wireRef.current) {
      (innerRef.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.inner), 0.05);
      let ps = config.scale;
      if (alertState === "YELLOW") ps = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      if (isLive) {
        innerRef.current.scale.lerp(new THREE.Vector3(1.2*ps, 1.2*ps, 1.2*ps), 0.05);
        wireRef.current.scale.lerp(new THREE.Vector3(1.2*ps, 1.2*ps, 1.2*ps), 0.05);
        (innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8;
      } else {
        innerRef.current.scale.lerp(new THREE.Vector3(ps, ps, ps), 0.05);
        wireRef.current.scale.lerp(new THREE.Vector3(ps, ps, ps), 0.05);
        (innerRef.current.material as THREE.MeshBasicMaterial).opacity = alertState === "BLACK" ? 0.3 : 0.15;
      }
    }
  });

  return (
    <group>
      <mesh ref={innerRef}><sphereGeometry args={[1.5, 32, 32]} /><meshBasicMaterial transparent opacity={0.15} /></mesh>
      <mesh ref={wireRef}><sphereGeometry args={[1.6, 28, 28]} /><meshBasicMaterial wireframe transparent opacity={0.5} /></mesh>
      <mesh ref={ring1} rotation={[0.3, 0.5, 0]}><ringGeometry args={[1.9, 1.92, 80]} /><meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.7} /></mesh>
      <mesh ref={ring2} rotation={[1.2, 0.8, 0.4]}><ringGeometry args={[2.1, 2.12, 80]} /><meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.5} /></mesh>
      <mesh ref={ring3} rotation={[0.7, 1.5, 0.9]}><ringGeometry args={[2.3, 2.32, 80]} /><meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.3} /></mesh>
    </group>
  );
}


/* ───────────────────────── TACTICAL GLOBE ───────────────────────── */
function TacticalGlobe({ launchTarget }: { launchTarget: string | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const [arcs, setArcs] = useState<{curve: THREE.QuadraticBezierCurve3, progress: number, active: boolean}[]>([]);

  useEffect(() => {
    if (launchTarget) {
      const r = 2.5;
      const start = new THREE.Vector3().setFromSphericalCoords(r, Math.random() * Math.PI, Math.random() * Math.PI * 2);
      const end = new THREE.Vector3().setFromSphericalCoords(r, Math.random() * Math.PI, Math.random() * Math.PI * 2);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(r * 1.5);
      setArcs(prev => [...prev, { curve: new THREE.QuadraticBezierCurve3(start, mid, end), progress: 0, active: true }]);
    }
  }, [launchTarget]);

  useFrame((state, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.1;
    setArcs(prev => prev.map(arc => arc.active && arc.progress < 1 ? { ...arc, progress: arc.progress + dt * 0.5 } : arc));
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <mesh><sphereGeometry args={[2.45, 64, 64]} /><meshBasicMaterial color="#020815" /></mesh>
      <mesh><sphereGeometry args={[2.5, 32, 32]} /><meshBasicMaterial color="#ff2222" wireframe transparent opacity={0.15} /></mesh>
      <mesh scale={1.05}><sphereGeometry args={[2.5, 64, 64]} /><meshBasicMaterial color="#ff0000" transparent opacity={0.05} side={THREE.BackSide} /></mesh>
      {arcs.map((arc, i) => {
        if (!arc.active || arc.progress === 0) return null;
        // Build a partial curve for animation
        const partialPoints = arc.curve.getPoints(50).slice(0, Math.max(2, Math.floor(arc.progress * 50)));
        const partialCurve = new THREE.CatmullRomCurve3(partialPoints);
        return (
          <group key={i}>
            <mesh>
              <tubeGeometry args={[partialCurve, 50, 0.015, 4, false]} />
              <meshBasicMaterial color="#ff0000" />
            </mesh>
            {arc.progress >= 1 && <mesh position={arc.curve.getPoint(1)}><sphereGeometry args={[0.08, 16, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>}
            {arc.progress < 1 && <mesh position={arc.curve.getPoint(arc.progress)}><sphereGeometry args={[0.05, 16, 16]} /><meshBasicMaterial color="#ff5555" /></mesh>}
          </group>
        );
      })}
    </group>
  );
}

/* ───────────────────────── SYSTEM HUD STRIP ───────────────────────── */
function SystemHUD({ alertState }: { alertState: AlertState }) {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, uptime: "0h 0m", platform: "win32" });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/system");
        if (res.ok) setStats(await res.json());
      } catch(e) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const color = alertState === "RED" ? "text-red-400" : alertState === "YELLOW" ? "text-yellow-400" : alertState === "BLACK" ? "text-purple-400" : "text-[#00e5ff]";
  const barColor = alertState === "RED" ? "bg-red-500" : alertState === "YELLOW" ? "bg-yellow-500" : alertState === "BLACK" ? "bg-purple-500" : "bg-[#00e5ff]";

  return (
    <div className={`flex items-center gap-4 md:gap-6 px-4 py-1.5 text-[9px] md:text-[10px] font-mono tracking-wider ${color} opacity-70`}>
      <div className="flex items-center gap-1.5">
        <Cpu className="w-3 h-3" />
        <span>CPU</span>
        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all duration-500 rounded-full`} style={{width: `${stats.cpu}%`}} />
        </div>
        <span>{stats.cpu}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <HardDrive className="w-3 h-3" />
        <span>RAM</span>
        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all duration-500 rounded-full`} style={{width: `${stats.ram}%`}} />
        </div>
        <span>{stats.ram}%</span>
      </div>
      <div className="hidden md:flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        <span>{stats.uptime}</span>
      </div>
      <div className="hidden md:flex items-center gap-1.5">
        <Wifi className="w-3 h-3" />
        <span>ONLINE</span>
      </div>
    </div>
  );
}

/* ───────────────────────── DATA PANEL (RIGHT SIDE) ───────────────────────── */
function DataPanel({ data, alertState, onClose }: { data: string[], alertState: AlertState, onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [data]);

  const borderColor = alertState === "RED" ? "border-red-500/30" : alertState === "BLACK" ? "border-purple-500/30" : "border-[#00e5ff]/20";
  const headerColor = alertState === "RED" ? "text-red-400" : alertState === "BLACK" ? "text-purple-400" : "text-[#00e5ff]";

  if (data.length === 0) return null;

  return (
    <div className={`w-full md:w-[400px] lg:w-[450px] h-full flex flex-col border-l ${borderColor} bg-[#000511]/90 backdrop-blur-xl shrink-0`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${borderColor}`}>
        <div className={`text-[10px] font-mono font-bold tracking-[0.2em] ${headerColor}`}>
          DATA STREAM
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "none" }}>
        {data.map((entry, i) => (
          <div key={i} className={`text-[11px] md:text-[12px] font-mono leading-relaxed text-[#a0d0ff] whitespace-pre-wrap p-3 rounded-lg bg-[#000a1e]/80 border ${borderColor}`}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── MAIN UI ───────────────────────── */
export default function HermesUI({ onToggleView }: { onToggleView?: () => void }) {
  const [booting, setBooting] = useState(true);
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ role: string; content: string; time: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const isLiveRef = useRef(false); 
  const recognitionRef = useRef<any>(null);
  const [alertState, setAlertState] = useState<AlertState>("BLUE");
  const [isTacticalMode, setIsTacticalMode] = useState(false);
  const [launchTarget, setLaunchTarget] = useState<string | null>(null);
  const [dataPanel, setDataPanel] = useState<string[]>([]);
  const [audioMuted, setAudioMuted] = useState(true);
  const ambientRef = useRef<AmbientSoundEngine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.on('toggle-mode', () => {
          setIsDesktopMode(prev => !prev);
        });
      } catch (e) {}
    }
  }, []);

  // Boot completion handler
  const handleBootComplete = useCallback(() => {
    setBooting(false);
    // Greet with voice after boot
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance("All systems nominal. Welcome back, boss.");
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Hazel") || v.name.includes("Zira") || v.name.includes("Samantha"));
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.pitch = 1.1; utterance.rate = 1.3;
        window.speechSynthesis.speak(utterance);
      }
    }, 500);
  }, []);

  // Ambient sound
  useEffect(() => {
    if (!booting) {
      ambientRef.current = new AmbientSoundEngine();
    }
    return () => { ambientRef.current?.destroy(); };
  }, [booting]);

  useEffect(() => {
    if (ambientRef.current && !booting) {
      ambientRef.current.setState(alertState);
    }
  }, [alertState, booting]);

  const toggleAudio = () => {
    if (!ambientRef.current) {
      ambientRef.current = new AmbientSoundEngine();
    }
    ambientRef.current.init();
    ambientRef.current.setState(alertState);
    const isMuted = ambientRef.current.toggleMute();
    setAudioMuted(isMuted);
  };

  useEffect(() => { isLiveRef.current = isLive; if (!isLive && recognitionRef.current) { recognitionRef.current.stop(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } }, [isLive]);
  useEffect(() => { if ('speechSynthesis' in window) window.speechSynthesis.getVoices(); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history, isThinking]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isLiveRef.current && recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e) {} }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/[\*\_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Hazel") || v.name.includes("Zira") || v.name.includes("Samantha"));
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.1; utterance.rate = 1.3;
    utterance.onend = () => { if (isLiveRef.current && recognitionRef.current) { try { recognitionRef.current.start(); } catch(e) {} } };
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setHistory(prev => [...prev, { role: "user", content: text, time }]);
    setIsThinking(true);

    try {
      const apiMessages = [...history, { role: "user", content: text }].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages, userName: "User" }) });
      const data = await res.json();
      let reply = data.reply || "Systems online and ready.";
      
      // Parse ALERT
      const alertMatch = reply.match(/<ALERT>(.*?)<\/ALERT>/i);
      if (alertMatch) { const s = alertMatch[1].trim().toUpperCase(); if (["BLUE","RED","YELLOW","BLACK"].includes(s)) setAlertState(s as AlertState); reply = reply.replace(/<ALERT>.*?<\/ALERT>/gi, "").trim(); }
      
      // Parse SWITCH_MODE
      if (reply.includes("<SWITCH_MODE>AURA3D</SWITCH_MODE>")) { setIsTacticalMode(true); reply = reply.replace(/<SWITCH_MODE>AURA3D<\/SWITCH_MODE>/gi, "").trim(); }
      
      // Parse LAUNCH
      const launchMatch = reply.match(/<LAUNCH>(.*?)<\/LAUNCH>/i);
      if (launchMatch) { setLaunchTarget(launchMatch[1].trim()); setTimeout(() => setLaunchTarget(null), 100); reply = reply.replace(/<LAUNCH>.*?<\/LAUNCH>/gi, "").trim(); }
      
      // Parse DATA_PANEL
      const dataPanelMatch = reply.match(/<DATA_PANEL>([\s\S]*?)<\/DATA_PANEL>/i);
      if (dataPanelMatch) { setDataPanel(prev => [...prev, dataPanelMatch[1].trim()]); reply = reply.replace(/<DATA_PANEL>[\s\S]*?<\/DATA_PANEL>/gi, "").trim(); }

      setHistory(prev => [...prev, { role: "ai", content: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      if (isLiveRef.current) speak(reply);
    } catch {
      setHistory(prev => [...prev, { role: "ai", content: "Network interference detected.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      if (isLiveRef.current) speak("Network interference detected.");
    } finally { setIsThinking(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && input.trim()) { sendMessage(input); setInput(""); } };
  const handleUploadClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const toggleLive = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert("Speech not supported. Use Chrome or Edge."); return; }
    if (isLive) { setIsLive(false); return; }
    setIsLive(true);
    if (!recognitionRef.current) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
      recognition.onresult = (event: any) => { const t = event.results[0][0].transcript; if (t.trim()) { setInput(t); sendMessage(t); } };
      recognition.onerror = () => {};
      recognition.onend = () => { if (isLiveRef.current && !window.speechSynthesis.speaking) { try { recognition.start(); } catch(e) {} } };
      recognitionRef.current = recognition;
    }
    try { recognitionRef.current.start(); } catch(e) {}
  };

  // Show boot sequence
  if (booting) return <BootSequence onComplete={handleBootComplete} />;

  const bgOverlay = alertState === "RED" ? "from-[#220000]/80" : alertState === "YELLOW" ? "from-[#222200]/80" : alertState === "BLACK" ? "from-[#000000]" : "from-[#010612]";
  const textColor = alertState === "RED" ? "text-[#ff6666]" : alertState === "YELLOW" ? "text-[#ffff66]" : alertState === "BLACK" ? "text-[#aa66ff]" : "text-[#88c0ff]";
  const borderColor = alertState === "RED" ? "border-[#ff4444]" : alertState === "YELLOW" ? "border-[#ffff00]" : alertState === "BLACK" ? "border-[#aa00ff]" : "border-[#00e5ff]";

  return (
    <div className={`absolute inset-0 z-10 flex flex-col h-full w-full overflow-hidden ${isTacticalMode ? 'bg-black' : 'bg-[#010612]'} font-mono text-[#88c0ff]`}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .markdown-prose { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        .markdown-prose p { margin-bottom: 0.75rem; line-height: 1.6; }
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

      {/* Background */}
      {!isTacticalMode && !isDesktopMode && (
        <div className="absolute inset-0 z-0 transition-colors duration-1000">
          <Image src="/joya_bg.jpg" alt="Joya AI" fill style={{ objectFit: "cover" }} className={`pointer-events-none transition-opacity duration-1000 ${alertState === "BLACK" ? "opacity-20" : "opacity-70"}`} priority />
          <div className={`absolute inset-0 bg-gradient-to-t ${bgOverlay} via-transparent to-transparent transition-colors duration-1000`} />
        </div>
      )}

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={1} />
          <Suspense fallback={null}>
            {isTacticalMode ? <TacticalGlobe launchTarget={launchTarget} /> : isDesktopMode ? <Avatar alertState={alertState} isLive={isLive} /> : <RotatingGlobe isLive={isLive} alertState={alertState} />}
          </Suspense>
        </Canvas>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" />

      {/* UI Layer */}
      <div className={`absolute inset-0 z-20 flex flex-col pointer-events-none transition-opacity duration-500 ${isDesktopMode ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Top Bar Controls */}
        <div className="w-full pointer-events-auto flex items-center justify-end p-4">
          <div className="flex items-center gap-2">
            {/* Volume Icon Removed */}
            {isTacticalMode && (
              <button onClick={() => setIsTacticalMode(false)} className="text-red-400 hover:text-white text-[10px] font-bold border border-red-500/50 px-2 py-0.5 rounded font-mono">EXIT CORE</button>
            )}
          </div>
        </div>

        {alertState !== "BLUE" && !isTacticalMode && (
          <div className={`w-full py-1 text-center text-[10px] font-bold tracking-[0.3em] bg-black/50 backdrop-blur-md ${textColor} animate-pulse`}>
            {alertState} ALERT PROTOCOL ACTIVE
          </div>
        )}
        {isTacticalMode && (
          <div className="w-full py-1 text-center text-[10px] font-bold tracking-[0.3em] bg-red-900/40 backdrop-blur-md text-red-400 animate-pulse">
            GLOBAL DEFENSE CORE ONLINE
          </div>
        )}

        {/* Main Content: Chat + Data Panel */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Chat Area */}
          <div className="flex-1 flex flex-col pointer-events-auto overflow-hidden">
            <div className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-8 flex flex-col overflow-hidden mt-2">
              <div ref={scrollRef} className="flex flex-col gap-6 overflow-y-auto pb-4 pr-2 w-full" style={{ maxHeight: "100%", scrollbarWidth: "none" }}>
                
                {history.length === 0 && !isThinking && (
                  <div className={`text-center mt-12 py-8 text-sm tracking-widest uppercase font-mono drop-shadow-md ${textColor} opacity-60`}>AWAITING DIRECTIVE.</div>
                )}

                {history.map((msg, i) => {
                  const isLastAI = i === history.length - 1 && msg.role === 'ai';
                  return (
                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "ml-auto text-right items-end" : "mr-auto text-left items-start"}`} style={{ maxWidth: "90%" }}>
                      <div className={`text-[10px] ${isTacticalMode ? 'text-red-400' : textColor} opacity-70 mb-1.5 font-bold uppercase tracking-wider flex items-center gap-2 font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`}>
                        {msg.role === "ai" && (
                          <div className={`w-5 h-5 rounded-full border ${isTacticalMode ? 'border-red-500' : borderColor} border-opacity-40 flex items-center justify-center shrink-0 bg-black/60`}>
                            {isTacticalMode || alertState === "RED" ? <ShieldAlert className="w-3 h-3" /> : alertState === "YELLOW" ? <Zap className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          </div>
                        )}
                        <span>{msg.role === "ai" ? `JOYA • ${msg.time}` : `USER • ${msg.time}`}</span>
                      </div>
                      <div className="break-words text-[#f0f9ff] text-[15px] md:text-[16px] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                        {isLastAI ? <TypewriterMessage content={msg.content} /> : <div className="markdown-prose space-y-3"><ReactMarkdown>{msg.content}</ReactMarkdown></div>}
                      </div>
                    </div>
                  );
                })}

                {isThinking && (
                  <div className="flex flex-col mr-auto text-left items-start" style={{ maxWidth: "85%" }}>
                    <div className={`text-[10px] ${isTacticalMode ? 'text-red-400' : textColor} opacity-70 mb-1.5 font-bold uppercase tracking-wider flex items-center gap-2 font-mono`}>
                      <div className={`w-5 h-5 rounded-full border ${isTacticalMode ? 'border-red-500' : borderColor} border-opacity-40 flex items-center justify-center shrink-0 bg-black/60 animate-spin`}>
                        <Activity className="w-3 h-3" />
                      </div>
                      <span>JOYA • PROCESSING</span>
                    </div>
                    <div className={`${isTacticalMode ? 'text-red-400' : textColor} text-[15px] animate-pulse font-sans`}>Analyzing data stream...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Bar */}
            <div className="w-full max-w-3xl mx-auto px-4 md:px-8 pb-6 pt-3 shrink-0">
              <div className={`bg-[#000511]/80 backdrop-blur-3xl rounded-[24px] p-2 flex items-center gap-2 border shadow-[0_10px_40px_rgba(0,0,0,0.8)] ${isLive ? `${isTacticalMode ? 'border-red-500' : borderColor}` : (isTacticalMode ? 'border-red-900/50' : 'border-white/10')}`}>
                <button onClick={handleUploadClick} className={`p-2 rounded-full hover:bg-white/10 ${isTacticalMode ? 'text-red-400' : textColor} transition-colors shrink-0`}><Plus className="w-5 h-5" /></button>
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder={isLive ? "FRIDAY is listening..." : "Message Joya..."} className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/40 text-[15px] px-2 font-mono" />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={toggleLive} className={`p-2 rounded-full transition-all ${isLive ? `bg-white/20 ${isTacticalMode ? 'text-red-400' : textColor} animate-pulse` : `hover:bg-white/10 ${isTacticalMode ? 'text-red-400' : textColor}`}`}><Activity className="w-5 h-5" /></button>
                  <button onClick={toggleLive} className={`p-2 rounded-full transition-all ${isLive ? (isTacticalMode ? 'text-red-400' : textColor) : `hover:bg-white/10 ${isTacticalMode ? 'text-red-400' : textColor}`}`}><Mic className="w-5 h-5" /></button>
                </div>
              </div>
              <div className={`text-center mt-2 ${isTacticalMode ? 'text-red-500' : textColor} opacity-40 text-[10px] tracking-widest font-mono`}>
                JOYA {isTacticalMode ? 'TACTICAL' : alertState} PROTOCOL ONLINE
              </div>
            </div>
          </div>

          {/* Right: Data Panel */}
          {dataPanel.length > 0 && (
            <DataPanel data={dataPanel} alertState={alertState} onClose={() => setDataPanel([])} />
          )}
        </div>
      </div>
    </div>
  );
}

