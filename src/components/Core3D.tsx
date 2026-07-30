"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Float } from "@react-three/drei";

export default function Core3D() {
  const outerRingRef = useRef<THREE.Mesh>(null!);
  const midRingRef = useRef<THREE.Mesh>(null!);
  const arcReactorRef = useRef<THREE.Group>(null!);
  const innerRingRef = useRef<THREE.Mesh>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const shockwaveRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Iron Man Arc Reactor Rotations
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z -= delta * 0.4;
      outerRingRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
    if (midRingRef.current) {
      midRingRef.current.rotation.z += delta * 0.8;
    }
    if (arcReactorRef.current) {
      arcReactorRef.current.rotation.z -= delta * 0.6;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z += delta * 1.2;
    }

    // Arc Core Pulsing (Giving Energy)
    if (coreRef.current) {
      const scale = 1.25 + Math.sin(t * 4) * 0.08;
      coreRef.current.scale.set(scale, scale, scale);
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 3.0 + Math.sin(t * 6) * 1.2;
      }
    }

    // Energy shockwave expansion
    if (shockwaveRef.current) {
      const swScale = (t * 2.5) % 4 + 1.2;
      shockwaveRef.current.scale.set(swScale, swScale, swScale);
      const swMat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      if (swMat) {
        swMat.opacity = Math.max(0, 0.8 - (swScale - 1.2) / 2.8);
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      
      {/* Central Blue Arc Energy Core */}
      <Float speed={2} rotationIntensity={0.15} floatIntensity={0.3}>
        <mesh ref={coreRef}>
          <sphereGeometry args={[1.3, 64, 64]} />
          <meshStandardMaterial
            color="#0088ff"
            emissive="#00e5ff"
            emissiveIntensity={3.5}
            roughness={0.1}
            metalness={0.95}
            toneMapped={false}
          />
        </mesh>
      </Float>

      {/* Pulsating Shockwave Ring */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.45, 64]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Iron Man Arc Reactor 10-Segment Node Ring */}
      <group ref={arcReactorRef}>
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const r = 2.1;
          return (
            <mesh key={i} position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}>
              <boxGeometry args={[0.3, 0.15, 0.15]} />
              <meshStandardMaterial color="#00e5ff" emissive="#00bfff" emissiveIntensity={2.5} toneMapped={false} />
            </mesh>
          );
        })}
      </group>

      {/* Inner Wireframe Torus Ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.04, 16, 90]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00bfff"
          emissiveIntensity={2.0}
          toneMapped={false}
          wireframe
        />
      </mesh>

      {/* Mid Concentric Tech Ring */}
      <mesh ref={midRingRef} rotation={[Math.PI / 2.1, 0.1, 0]}>
        <torusGeometry args={[3.4, 0.025, 16, 72]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#00e5ff"
          emissiveIntensity={1.5}
          toneMapped={false}
          wireframe
        />
      </mesh>

      {/* Outer Cyan Halo Ring */}
      <mesh ref={outerRingRef} rotation={[Math.PI / 1.9, -0.1, 0]}>
        <torusGeometry args={[4.4, 0.015, 12, 120]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={1.0}
          transparent
          opacity={0.65}
          wireframe
        />
      </mesh>

    </group>
  );
}
