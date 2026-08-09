'use client';

import React from 'react';

export default function AuraLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      
      {/* Outer Glow Ring */}
      <div 
        className="absolute inset-0 rounded-full bg-[#00e5ff] opacity-10 blur-xl"
        style={{ animation: 'pulse-glow 3s infinite alternate' }}
      />

      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full text-[#00e5ff] drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>
          {`
            @keyframes spin-slow { 100% { transform: rotate(360deg); } }
            @keyframes spin-reverse { 100% { transform: rotate(-360deg); } }
            @keyframes pulse-op { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
            .aura-ring-1 { transform-origin: center; animation: spin-slow 12s linear infinite; }
            .aura-ring-2 { transform-origin: center; animation: spin-reverse 8s linear infinite; }
            .aura-ring-3 { transform-origin: center; animation: spin-slow 20s linear infinite; }
            .aura-core { animation: pulse-op 2s ease-in-out infinite; }
          `}
        </style>

        {/* Outer Ring Dashed (AURA-RING-3) */}
        <circle 
          cx="100" cy="100" r="90" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeDasharray="4 8"
          className="aura-ring-3 opacity-40"
        />

        {/* Middle Ring with Geometric Cuts (AURA-RING-2) */}
        <g className="aura-ring-2">
          <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="2" strokeDasharray="60 20 20 20" className="opacity-60" />
          <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="1" strokeDasharray="5 15" className="opacity-50" />
        </g>

        {/* Inner Tech Ring (AURA-RING-1) */}
        <g className="aura-ring-1">
          <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="3" strokeDasharray="30 10 10 10 20 10" className="opacity-80" />
          {/* Inner nodes */}
          <circle cx="100" cy="45" r="3" fill="currentColor" />
          <circle cx="100" cy="155" r="3" fill="currentColor" />
          <circle cx="45" cy="100" r="3" fill="currentColor" />
          <circle cx="155" cy="100" r="3" fill="currentColor" />
        </g>

        {/* The Core (Static Hexagon & Triangle Combo) */}
        <g className="aura-core">
          <polygon 
            points="100,55 139,77.5 139,122.5 100,145 61,122.5 61,77.5" 
            stroke="currentColor" 
            strokeWidth="2" 
            fill="rgba(0,229,255,0.1)"
          />
          <polygon 
            points="100,65 125,115 75,115" 
            stroke="currentColor" 
            strokeWidth="1.5"
            fill="none"
          />
          <polygon 
            points="100,135 125,85 75,85" 
            stroke="currentColor" 
            strokeWidth="1.5"
            fill="none"
          />
          {/* Absolute Center Glowing Dot */}
          <circle cx="100" cy="100" r="8" fill="currentColor" filter="drop-shadow(0 0 5px #00e5ff)" />
        </g>
      </svg>
      
      {/* Brand Text overlay for large versions */}
      <div className="absolute -bottom-8 whitespace-nowrap text-center opacity-80 animate-pulse">
        <span className="font-mono text-[#00e5ff] text-[10px] md:text-[12px] tracking-[0.4em] font-bold">AURA 7</span>
      </div>
    </div>
  );
}
