"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Float, MeshTransmissionMaterial } from "@react-three/drei";

export default function Core3D() {
  const outerRingRef = useRef<THREE.Group>(null);
  const midRingRef = useRef<THREE.Group>(null);
  const innerGroupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const statusRef = useRef<'idle' | 'listening' | 'speaking'>('idle');

  useEffect(() => {
    const handleStatus = (e: any) => {
      statusRef.current = e.detail;
    };
    window.addEventListener('core-status', handleStatus);
    return () => window.removeEventListener('core-status', handleStatus);
  }, []);

  useFrame((state, delta) => {
    const status = statusRef.current;
    
    // Adjust speeds based on status
    const speedMult = status === 'listening' ? 1.5 : status === 'speaking' ? 2.5 : 1;

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z -= delta * 0.15 * speedMult;
    }
    if (midRingRef.current) {
      midRingRef.current.rotation.z += delta * 0.3 * speedMult;
      midRingRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
    if (innerGroupRef.current) {
      innerGroupRef.current.rotation.z -= delta * 1.2 * speedMult;
      innerGroupRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.8) * 0.3;
    }
    
    if (coreRef.current) {
      const material = coreRef.current.material as THREE.MeshStandardMaterial;
      const t = state.clock.elapsedTime;
      
      let targetIntensity = 2;
      let targetColor = 0x0044ff; // Deep blue base

      if (status === 'idle') {
        // Heartbeat rhythm
        const ht = t % 1.5;
        let pulse = 0;
        if (ht < 0.15) {
          pulse = Math.sin((ht / 0.15) * Math.PI);
        } else if (ht > 0.25 && ht < 0.4) {
          pulse = Math.sin(((ht - 0.25) / 0.15) * Math.PI);
        }
        targetIntensity = 2 + pulse * 10;
        targetColor = 0x0044ff; // Blue
      } else if (status === 'listening') {
        // Steady intense glow
        targetIntensity = 10 + Math.sin(t * 5) * 3;
        targetColor = 0x00aaff; // Bright Cyan while listening
      } else if (status === 'speaking') {
        // Chaotic waveform pulse
        const voicePulse = Math.sin(t * 18) * 0.5 + Math.sin(t * 30) * 0.5;
        targetIntensity = 6 + Math.abs(voicePulse) * 12;
        targetColor = 0x0022ff; // Very deep intense blue
      }

      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetIntensity, 0.1);
      material.emissive.lerp(new THREE.Color(targetColor), 0.1);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Deep Glowing Center Core */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
        <mesh ref={coreRef}>
          <sphereGeometry args={[1.2, 64, 64]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#0044ff"
            emissiveIntensity={8}
            toneMapped={false}
          />
        </mesh>
        
        {/* Glass protective sphere around the core */}
        <mesh>
          <sphereGeometry args={[1.4, 64, 64]} />
          <MeshTransmissionMaterial 
            backside
            thickness={0.5}
            roughness={0.1}
            transmission={1}
            ior={1.5}
            chromaticAberration={0.4}
            color="#0066ff"
          />
        </mesh>
      </Float>

      {/* Complex Inner Structure */}
      <group ref={innerGroupRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.1, 16, 64]} />
          <meshStandardMaterial
            color="#001133"
            emissive="#0033ee"
            emissiveIntensity={2}
            toneMapped={false}
            wireframe
          />
        </mesh>
        {/* Reactor spokes */}
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 3.6, 8]} />
            <meshStandardMaterial color="#0088ff" emissive="#0055ff" emissiveIntensity={1} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* Mid Ring - Heavy Tech Ring */}
      <group ref={midRingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.8, 0.15, 32, 100]} />
          <meshStandardMaterial
            color="#001133"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Glowing embedded track */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.8, 0.16, 8, 64]} />
          <meshStandardMaterial
            color="#0088ff"
            emissive="#0044ff"
            emissiveIntensity={2}
            toneMapped={false}
            wireframe
          />
        </mesh>
      </group>

      {/* Outer Ring - Deep holographic UI ring */}
      <group ref={outerRingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.5, 0.02, 16, 128]} />
          <meshStandardMaterial
            color="#0011ff"
            emissive="#0000aa"
            emissiveIntensity={1.5}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>
        {/* Outer dashed segments */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.8, 0.01, 8, 200]} />
          <meshStandardMaterial
            color="#0066ff"
            emissive="#0088ff"
            emissiveIntensity={1}
            wireframe
            transparent
            opacity={0.4}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
