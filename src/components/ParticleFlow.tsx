"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function ParticleFlow() {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 15000;

  // Initialize particles in a smooth fluid water stream passing through the center
  const { positions, initialData, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const data = new Float32Array(count * 4); // [yPos, phase, radius, speed]
    const col = new Float32Array(count * 3);

    const cCyan = new THREE.Color("#00e5ff");
    const cBlue = new THREE.Color("#38bdf8");
    const cWater = new THREE.Color("#0088ff");
    const cWhite = new THREE.Color("#ffffff");

    for (let i = 0; i < count; i++) {
      const y = (Math.random() - 0.5) * 18; // Flow vertically from top to bottom through the core
      const phase = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.2; // Constrained around the center column like a water pipe/river
      const speed = 0.4 + Math.random() * 0.6;

      data[i * 4] = y;
      data[i * 4 + 1] = phase;
      data[i * 4 + 2] = radius;
      data[i * 4 + 3] = speed;

      pos[i * 3] = Math.sin(y * 0.5 + phase) * radius;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.cos(y * 0.5 + phase) * (radius * 0.6);

      const rand = Math.random();
      const chosenColor = rand > 0.8 ? cWhite : rand > 0.45 ? cCyan : rand > 0.2 ? cBlue : cWater;
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;
    }

    return { positions: pos, initialData: data, colors: col };
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const posArr = posAttr.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      let y = initialData[i * 4];
      const phase = initialData[i * 4 + 1];
      const radius = initialData[i * 4 + 2];
      const speed = initialData[i * 4 + 3];

      // Smooth liquid water flow downwards through the center core
      y -= delta * speed * 3.5;
      if (y < -9) {
        y = 9; // Reset to top
      }
      initialData[i * 4] = y;

      // Gentle fluid wave equation (smooth water ripple effect)
      const waveX = Math.sin(y * 0.6 + time * 1.5 + phase) * (radius * 0.8);
      const waveZ = Math.cos(y * 0.6 + time * 1.5 + phase) * (radius * 0.5);

      // Pinch slightly at the central core (y = 0) like fluid funneling into the reactor
      const funnel = 1.0 - Math.exp(-y * y * 0.15) * 0.45;

      posArr[i * 3] = waveX * funnel;
      posArr[i * 3 + 1] = y;
      posArr[i * 3 + 2] = waveZ * funnel;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
