'use client';

import React, { useState, useEffect } from 'react';
import AuraLogo from './AuraLogo';

interface BootSequenceProps {
  onComplete: () => void;
}

const bootLines = [
  'AURA 7 NEURAL CORE v8.0',
  'INITIALIZING QUANTUM BRIDGE...',
  'LOADING MEMORY BANKS... OK',
  'SPEECH ENGINE... ONLINE',
  'DEFENSE PROTOCOLS... ARMED',
  'WEB RESEARCH MODULE... CONNECTED',
  'TERMINAL ACCESS... GRANTED',
  'FILE SYSTEM... MOUNTED',
  'THREAT DETECTION... ACTIVE',
  'ALL SYSTEMS NOMINAL.',
  '',
  'WELCOME BACK, BOSS.'
];

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (visibleLines < bootLines.length) {
      timeout = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
      }, 150);
    } else if (!isFadingOut) {
      timeout = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          onComplete();
        }, 800); // Wait for fade out animation
      }, 1000); // Wait 1 second before fading out
    }

    return () => clearTimeout(timeout);
  }, [visibleLines, isFadingOut, onComplete]);

  const progress = Math.min(100, (visibleLines / bootLines.length) * 100);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#010612] bg-opacity-95 text-[#00e5ff] font-mono p-6 overflow-hidden transition-opacity duration-800 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: '800ms' }}
    >
      {/* Scanline effect */}
      <div 
        className="pointer-events-none absolute inset-0 z-50 opacity-10"
        style={{
          background: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px',
          animation: 'scanlines 1s linear infinite'
        }}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(0,229,255,0.5)); }
          50% { filter: drop-shadow(0 0 25px rgba(0,229,255,0.8)); }
        }
      `}} />

      {/* Center Content */}
      <div className="z-10 flex flex-col items-center justify-center w-full max-w-2xl relative">
        
        {/* Holographic Logo / Icon */}
        <div className="mb-14 mt-4 text-[#00e5ff] w-32 h-32 md:w-48 md:h-48 mx-auto">
          <AuraLogo />
        </div>

        {/* Text Container */}
        <div className="h-64 flex flex-col justify-end items-center text-center w-full mb-12">
          {bootLines.slice(0, visibleLines).map((line, index) => (
            <div
              key={index}
              className={`text-[12px] leading-[1.8] sm:text-[14px] md:text-[16px] tracking-[0.2em] animate-fade-in ${
                index === bootLines.length - 1 ? 'mt-4 font-bold text-white drop-shadow-[0_0_10px_#00e5ff]' : 'text-[#00e5ff]/80'
              }`}
              style={{ animation: 'fadeIn 0.2s ease-in' }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Cinematic Progress Bar */}
        <div className="w-64 md:w-96 relative">
          <div className="text-[10px] tracking-widest text-[#00e5ff]/50 mb-2 text-center uppercase">
            SYSTEM BOOT... {Math.round(progress)}%
          </div>
          <div className="h-[2px] w-full bg-[#00e5ff]/10 relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-[#00e5ff] shadow-[0_0_15px_#00e5ff] transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Decorative brackets */}
          <div className="absolute top-6 left-0 w-2 h-2 border-l border-t border-[#00e5ff]/40"></div>
          <div className="absolute top-6 right-0 w-2 h-2 border-r border-t border-[#00e5ff]/40"></div>
          <div className="absolute -bottom-2 left-0 w-2 h-2 border-l border-b border-[#00e5ff]/40"></div>
          <div className="absolute -bottom-2 right-0 w-2 h-2 border-r border-b border-[#00e5ff]/40"></div>
        </div>
        
      </div>
    </div>
  );
}
