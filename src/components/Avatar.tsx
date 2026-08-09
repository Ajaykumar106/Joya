import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface AvatarProps {
  alertState: string;
  isLive: boolean;
  scaleOffset?: number;
}

export default function Avatar({ alertState, isLive, scaleOffset = 1.0 }: AvatarProps) {
  const group = useRef<THREE.Group>(null);
  
  // Load the new Watame model
  const { scene } = useGLTF('/watame/scene.gltf');

  // Basic hovering animation and scaling
  useFrame((state) => {
    if (!group.current) return;
    
    // Gentle floating effect
    group.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1 - 2.5;

    // Rotate her to face the camera (Math.PI / 180 degrees)
    // Plus a slight side-to-side idle animation
    group.current.rotation.y = Math.PI + (Math.sin(state.clock.elapsedTime * 0.5) * 0.1);

    // Scale pulsing based on state
    const baseScale = 3.0; 
    let targetScale = baseScale * scaleOffset;
    
    if (isLive) {
      targetScale = (baseScale + 0.1) * scaleOffset + Math.sin(state.clock.elapsedTime * 10) * 0.05; // Quick pulse when talking
    } else if (alertState === 'YELLOW') {
      targetScale = baseScale * scaleOffset + Math.sin(state.clock.elapsedTime * 4) * 0.02; // Slow pulse for alert
    }
    
    group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group ref={group} position={[0, -2.5, 0]}>
      <primitive object={scene} />
      {/* Dynamic lighting based on alert state */}
      <ambientLight intensity={alertState === 'RED' ? 0.3 : 1.2} />
      <directionalLight 
        position={[0, 5, 5]} 
        intensity={alertState === 'RED' ? 2 : 2.5} 
        color={alertState === 'RED' ? '#ff0000' : alertState === 'YELLOW' ? '#ffcc00' : '#ffffff'} 
      />
      <pointLight 
        position={[0, 1, 2]} 
        intensity={isLive ? 3 : 0} 
        color="#00e5ff" 
        distance={5}
      />
    </group>
  );
}

// Preload the model
useGLTF.preload('/watame/scene.gltf');
