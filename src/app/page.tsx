"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import Core3D from "@/components/Core3D";
import ParticleFlow from "@/components/ParticleFlow";
import HUDOverlay from "@/components/HUDOverlay";
import DashboardUI from "@/components/DashboardUI";

export default function Home() {
  const [viewMode, setViewMode] = useState<"aura3d" | "dashboard">("aura3d");
  const [camZ, setCamZ] = useState(10);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setCamZ(14); // Push camera back on mobile phones for optimal framing
      } else {
        setCamZ(10);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (viewMode === "dashboard") {
    return (
      <main className="w-screen h-screen overflow-hidden bg-[#07090e] relative">
        <div className="absolute top-3 right-5 z-50">
          <button 
            onClick={() => setViewMode("aura3d")}
            className="px-3 py-1 text-xs font-mono font-semibold bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 rounded-full hover:bg-[#00e5ff] hover:text-black transition-all shadow-[0_0_10px_rgba(0,229,255,0.3)] flex items-center gap-1.5"
          >
            ✦ Launch RIYA 3D HUD
          </button>
        </div>
        <DashboardUI />
      </main>
    );
  }

  return (
    <main className="w-screen h-screen relative bg-[#03070d] overflow-hidden font-mono select-none">
      
      {/* 3D WebGL Background Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, camZ], fov: 60 }}>
          {/* Ambient Lighting */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#00e5ff" />
          
          {/* Central 3D Iron Man Arc Reactor Core */}
          <Core3D />
          
          {/* 20k Inward Particle Energy Streams */}
          <ParticleFlow />

          {/* Cinematic Bloom & Post-Processing */}
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

      {/* 2D HUD Sci-Fi React Overlay */}
      <HUDOverlay onToggleView={() => setViewMode("dashboard")} />

    </main>
  );
}
