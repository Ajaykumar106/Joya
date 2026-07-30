"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function ParticleFlow() {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 20000;

  // 16 radial energy channels converging straight into the Arc Reactor core
  const energyChannels = useMemo(() => {
    const channels = [];
    const num = 16;
    for (let i = 0; i < num; i++) {
      const angle = (i / num) * Math.PI * 2;
      const dist = 16 + Math.random() * 8;
      const startX = Math.cos(angle) * dist;
      const startY = Math.sin(angle) * dist;
      const startZ = (Math.random() - 0.5) * 8;

      // Curved spiral control point feeding energy into center
      const ctrlAngle = angle + 0.4;
      const ctrlDist = dist * 0.5;
      const ctrlX = Math.cos(ctrlAngle) * ctrlDist;
      const ctrlY = Math.sin(ctrlAngle) * ctrlDist;
      const ctrlZ = (Math.random() - 0.5) * 4;

      channels.push({ startX, startY, startZ, ctrlX, ctrlY, ctrlZ });
    }
    return channels;
  }, []);

  const { positions, particleMeta, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const meta = new Float32Array(count * 4); // [channel, progress(1->0), speed, offsetR]
    const col = new Float32Array(count * 3);

    const cCyan = new THREE.Color("#00e5ff");  // Electric Cyan
    const cBlue = new THREE.Color("#0088ff");  // Arc Blue
    const cSky = new THREE.Color("#38bdf8");   // Sky Blue
    const cWhite = new THREE.Color("#ffffff"); // Energy Flash White

    for (let i = 0; i < count; i++) {
      const chIdx = i % energyChannels.length;
      const progress = Math.random(); // 1.0 = outer edge, 0.0 = Arc Core center
      const speed = 0.35 + Math.random() * 0.55;
      const offsetR = Math.random() * 0.4;

      meta[i * 4] = chIdx;
      meta[i * 4 + 1] = progress;
      meta[i * 4 + 2] = speed;
      meta[i * 4 + 3] = offsetR;

      const rand = Math.random();
      const colorChoice = rand > 0.75 ? cWhite : rand > 0.45 ? cCyan : rand > 0.2 ? cBlue : cSky;
      col[i * 3] = colorChoice.r;
      col[i * 3 + 1] = colorChoice.g;
      col[i * 3 + 2] = colorChoice.b;
    }

    return { positions: pos, particleMeta: meta, colors: col };
  }, [count, energyChannels]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const chIdx = Math.floor(particleMeta[i * 4]);
      let progress = particleMeta[i * 4 + 1];
      const speed = particleMeta[i * 4 + 2];
      const offsetR = particleMeta[i * 4 + 3];

      const ch = energyChannels[chIdx];

      // Acceleration as particles plunge into the Arc Core to give it energy
      const accel = 0.3 + (1.0 - progress) * 2.2;
      progress -= delta * speed * accel;

      // Re-spawn at outer bounds when absorbed into the core
      if (progress <= 0.02) {
        progress = 1.0;
      }
      particleMeta[i * 4 + 1] = progress;

      // Quadratic Bezier interpolation into (0,0,0)
      const t = progress;
      const mt = 1 - t;

      const px = t * t * ch.startX + 2 * t * mt * ch.ctrlX;
      const py = t * t * ch.startY + 2 * t * mt * ch.ctrlY;
      const pz = t * t * ch.startZ + 2 * t * mt * ch.ctrlZ;

      // Spiral swirl effect as particles feed into the core
      const swirl = progress * 12 + i;
      const jx = Math.cos(swirl) * offsetR * progress;
      const jy = Math.sin(swirl) * offsetR * progress;

      posArr[i * 3] = px + jx;
      posArr[i * 3 + 1] = py + jy;
      posArr[i * 3 + 2] = pz;
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
        opacity={0.92}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
