"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import Core3D from "@/components/Core3D";
import ParticleFlow from "@/components/ParticleFlow";
import HUDOverlay from "@/components/HUDOverlay";
import DashboardUI from "@/components/DashboardUI";
import HermesUI from "@/components/HermesUI";
import { ChatSidebar, useChatHistory } from "@/components/ChatSidebar";

export default function Home() {
  const [viewMode, setViewMode] = useState<"aura3d" | "dashboard" | "hermes">("hermes");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [camZ, setCamZ] = useState(10);
  const chatHistory = useChatHistory();

  useEffect(() => {
    const handleResize = () => {
      setCamZ(window.innerWidth < 640 ? 14 : 10);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (viewMode === "hermes") {
    return (
      <main className="w-screen h-screen overflow-hidden bg-[#020b1c] relative">
        {/* View Switch Button */}
        <div className="absolute top-3 right-4 z-50 flex gap-2">
          <button
            onClick={() => setViewMode("aura3d")}
            className="px-3 py-1 text-[10px] font-mono font-semibold bg-white/5 text-[#88c0ff]/60 border border-[#88c0ff]/20 rounded-full hover:bg-[#88c0ff]/10 hover:text-[#88c0ff] transition-all backdrop-blur-md"
          >
            ✦ 3D Core
          </button>
        </div>

        {/* Chat Sidebar */}
        <ChatSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectChat={(id) => {
            chatHistory.setActiveId(id);
            setSidebarOpen(false);
          }}
          onNewChat={() => {
            chatHistory.createNew();
            setSidebarOpen(false);
          }}
          activeId={chatHistory.activeId}
          conversations={chatHistory.conversations}
          deleteChat={chatHistory.deleteConversation}
        />

        {/* Main Chat UI */}
        <HermesUI
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </main>
    );
  }

  if (viewMode === "dashboard") {
    return (
      <main className="w-screen h-screen overflow-hidden bg-[#07090e] relative">
        <div className="absolute top-3 right-5 z-50">
          <button
            onClick={() => setViewMode("aura3d")}
            className="px-3 py-1 text-xs font-mono font-semibold bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 rounded-full hover:bg-[#00e5ff] hover:text-black transition-all shadow-[0_0_10px_rgba(0,229,255,0.3)] flex items-center gap-1.5"
          >
            ✦ Launch 3D HUD
          </button>
        </div>
        <DashboardUI />
      </main>
    );
  }

  return (
    <main className="w-screen h-screen relative bg-[#03070d] overflow-hidden font-mono select-none">
      <div className="absolute top-3 right-5 z-50 flex gap-2">
        <button
          onClick={() => setViewMode("hermes")}
          className="px-3 py-1 text-xs font-mono font-semibold bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 rounded-full hover:bg-[#00e5ff] hover:text-black transition-all shadow-[0_0_10px_rgba(0,229,255,0.3)] flex items-center gap-1.5"
        >
          ✦ Switch to Joya
        </button>
      </div>

      {/* 3D WebGL Background Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, camZ], fov: 60 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#00e5ff" />
          <Core3D />
          <ParticleFlow />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.15}
              luminanceSmoothing={0.9}
              intensity={2.2}
              mipmapBlur
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={[0.0008, 0.0008] as any}
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* 2D HUD Overlay */}
      <HUDOverlay onToggleView={() => setViewMode("dashboard")} />
    </main>
  );
}
