"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function ParticleFlow() {
  const count = 25000; 
  const pointsRef = useRef<THREE.Points>(null);

  // Pre-compute particle properties
  const [positions, speeds, types, rungOffsets, spawnSides] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    const type = new Float32Array(count); 
    const rungOffsets = new Float32Array(count);
    const spawnSides = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      if (rand < 0.45) {
        type[i] = 0; // Strand A
      } else if (rand < 0.9) {
        type[i] = 1; // Strand B
      } else {
        type[i] = 2; // Base Pair (Rung)
      }
      
      // 0 for left side, 1 for right side
      const side = i % 2 === 0 ? -1 : 1;
      spawnSides[i] = side;

      const startX = side * (25 + Math.random() * 20);
      pos[i * 3 + 0] = startX;
      
      // Spread them slightly initially so they don't look perfectly flat before forming
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8; 
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8; 

      speed[i] = 2.0 + Math.random() * 3; // Fast inward speed
      
      // Where on the rung this particle sits (0.0 to 1.0)
      rungOffsets[i] = Math.random(); 
    }

    return [pos, speed, type, rungOffsets, spawnSides];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const positionsArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      let x = positionsArray[i * 3 + 0];
      let y = positionsArray[i * 3 + 1];
      let z = positionsArray[i * 3 + 2];

      const side = spawnSides[i];
      const distanceX = Math.abs(x);
      
      if (distanceX > 1.2) {
        // Accelerate horizontally towards center
        const moveSpeed = speeds[i] * delta * (1 + 8 / (distanceX + 1));
        x -= side * moveSpeed; // Move opposite to spawn side (towards center)

        // TRUE DNA Double Helix Math based purely on X position
        const freq = x * 0.4 - time * 3; 
        const radius = Math.min(3.5, distanceX * 0.25); // Taper heavily into the core

        // Strand A
        const ya = Math.sin(freq) * radius;
        const za = Math.cos(freq) * radius;

        // Strand B (offset by PI)
        const yb = Math.sin(freq + Math.PI) * radius;
        const zb = Math.cos(freq + Math.PI) * radius;

        let targetY = 0;
        let targetZ = 0;

        if (types[i] === 0) {
          // Backbone A
          targetY = ya + (Math.random() - 0.5) * 0.4;
          targetZ = za + (Math.random() - 0.5) * 0.4;
        } else if (types[i] === 1) {
          // Backbone B
          targetY = yb + (Math.random() - 0.5) * 0.4;
          targetZ = zb + (Math.random() - 0.5) * 0.4;
        } else {
          // Base Pair (Rung connecting A and B)
          // We don't want continuous rungs, they should be discrete steps
          // Quantize the frequency to group rung particles together
          const rungStep = Math.floor(freq * 1.5) / 1.5;
          const r_ya = Math.sin(rungStep) * radius;
          const r_za = Math.cos(rungStep) * radius;
          const r_yb = Math.sin(rungStep + Math.PI) * radius;
          const r_zb = Math.cos(rungStep + Math.PI) * radius;

          // Interpolate between Strand A and Strand B
          const t = rungOffsets[i];
          targetY = r_ya + (r_yb - r_ya) * t + (Math.random() - 0.5) * 0.2;
          targetZ = r_za + (r_zb - r_za) * t + (Math.random() - 0.5) * 0.2;
        }

        // Snap quickly to the formation so it looks structured
        y += (targetY - y) * 0.2;
        z += (targetZ - z) * 0.2;

      } else {
        // Data has entered the core. Respawn exactly at the edges.
        const startX = side * (30 + Math.random() * 10);
        x = startX;
        y = (Math.random() - 0.5) * 8;
        z = (Math.random() - 0.5) * 8;
      }

      positionsArray[i * 3 + 0] = x;
      positionsArray[i * 3 + 1] = y;
      positionsArray[i * 3 + 2] = z;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#00e5ff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
