const fs = require('fs');

let content = fs.readFileSync('src/components/HermesUI.tsx', 'utf8');

// 1. Add isDesktopMode state
if (!content.includes('const [isDesktopMode, setIsDesktopMode]')) {
  content = content.replace(
    'const [booting, setBooting] = useState(true);',
    'const [booting, setBooting] = useState(true);\n  const [isDesktopMode, setIsDesktopMode] = useState(false);'
  );
}

// 2. Add IPC listener for toggle-mode inside HermesUI (in an effect)
const ipcEffect = `
  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.on('toggle-mode', () => {
          setIsDesktopMode(prev => !prev);
        });
      } catch (e) {}
    }
  }, []);
`;
if (!content.includes("ipcRenderer.on('toggle-mode'")) {
  content = content.replace(
    '// Boot completion handler',
    ipcEffect + '\n  // Boot completion handler'
  );
}

// 3. Restore RotatingGlobe function
const newRotatingGlobe = `
function RotatingGlobe({ isLive, alertState }: { isLive: boolean, alertState: AlertState }) {
  const wireRef = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  const colors = {
    BLUE:   { inner: 0x0066ff, wire: 0x00aaff, ring1: 0x0044ff, ring2: 0x0088ff, ring3: 0x00aaff, speed: 1, scale: 1 },
    RED:    { inner: 0xff0000, wire: 0xff4444, ring1: 0xaa0000, ring2: 0xff0000, ring3: 0xff4444, speed: 2.5, scale: 1.1 },
    YELLOW: { inner: 0xffaa00, wire: 0xffff00, ring1: 0xaa8800, ring2: 0xffcc00, ring3: 0xffff00, speed: 1.5, scale: 1 },
    BLACK:  { inner: 0x050505, wire: 0x5500ff, ring1: 0x220088, ring2: 0x4400cc, ring3: 0x6600ff, speed: 0.5, scale: 1.2 },
  };

  useFrame((state, dt) => {
    const config = colors[alertState] || colors.BLUE;
    const s = config.speed;
    if (wireRef.current) {
      wireRef.current.rotation.y += dt * 0.35 * s;
      wireRef.current.rotation.x += dt * 0.15 * s;
      (wireRef.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.wire), 0.05);
    }
    if (ring1.current) { ring1.current.rotation.x += dt * 0.7 * s; ring1.current.rotation.z += dt * 0.3 * s; (ring1.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.ring1), 0.05); }
    if (ring2.current) { ring2.current.rotation.y -= dt * 0.5 * s; ring2.current.rotation.x += dt * 0.4 * s; (ring2.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.ring2), 0.05); }
    if (ring3.current) { ring3.current.rotation.z += dt * 0.6 * s; ring3.current.rotation.y += dt * 0.2 * s; (ring3.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.ring3), 0.05); }
    
    if (innerRef.current && wireRef.current) {
      (innerRef.current.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(config.inner), 0.05);
      let ps = config.scale;
      if (alertState === "YELLOW") ps = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      if (isLive) {
        innerRef.current.scale.lerp(new THREE.Vector3(1.2*ps, 1.2*ps, 1.2*ps), 0.05);
        wireRef.current.scale.lerp(new THREE.Vector3(1.2*ps, 1.2*ps, 1.2*ps), 0.05);
        (innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8;
      } else {
        innerRef.current.scale.lerp(new THREE.Vector3(ps, ps, ps), 0.05);
        wireRef.current.scale.lerp(new THREE.Vector3(ps, ps, ps), 0.05);
        (innerRef.current.material as THREE.MeshBasicMaterial).opacity = alertState === "BLACK" ? 0.3 : 0.15;
      }
    }
  });

  return (
    <group>
      <mesh ref={innerRef}><sphereGeometry args={[1.5, 32, 32]} /><meshBasicMaterial transparent opacity={0.15} /></mesh>
      <mesh ref={wireRef}><sphereGeometry args={[1.6, 28, 28]} /><meshBasicMaterial wireframe transparent opacity={0.5} /></mesh>
      <mesh ref={ring1} rotation={[0.3, 0.5, 0]}><ringGeometry args={[1.9, 1.92, 80]} /><meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.7} /></mesh>
      <mesh ref={ring2} rotation={[1.2, 0.8, 0.4]}><ringGeometry args={[2.1, 2.12, 80]} /><meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.5} /></mesh>
      <mesh ref={ring3} rotation={[0.7, 1.5, 0.9]}><ringGeometry args={[2.3, 2.32, 80]} /><meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.3} /></mesh>
    </group>
  );
}
`;

// Replace the Avatar return in RotatingGlobe
content = content.replace(
  /function RotatingGlobe\([^)]+\) {\s*return <Avatar[^>]+>;\s*}/m,
  newRotatingGlobe
);

// 4. Update the Canvas render logic to switch based on isDesktopMode
content = content.replace(
  /\{isTacticalMode \? <TacticalGlobe launchTarget=\{launchTarget\} \/> : <RotatingGlobe isLive=\{isLive\} alertState=\{alertState\} \/>\}/,
  `{isTacticalMode ? <TacticalGlobe launchTarget={launchTarget} /> : isDesktopMode ? <Avatar alertState={alertState} isLive={isLive} /> : <RotatingGlobe isLive={isLive} alertState={alertState} />}`
);

// 5. Hide the background layer when in desktop mode
content = content.replace(
  /\{\!isTacticalMode && \(\s*<div className="absolute inset-0 z-0 transition-colors duration-1000">/,
  `{!isTacticalMode && !isDesktopMode && (
        <div className="absolute inset-0 z-0 transition-colors duration-1000">`
);

// 6. Hide the chat UI when in desktop mode
content = content.replace(
  /<div className="absolute inset-0 z-20 flex flex-col pointer-events-none">/,
  `<div className={\`absolute inset-0 z-20 flex flex-col pointer-events-none transition-opacity duration-500 \${isDesktopMode ? 'opacity-0' : 'opacity-100'}\`}>`
);

// 7. Make the outer container transparent if isDesktopMode
content = content.replace(
  /className=\{\`absolute inset-0 z-10 flex flex-col h-full w-full overflow-hidden \$\{isTacticalMode \? 'bg-black' : 'bg-\\[#010612\\]'\} font-mono text-\\[#88c0ff\\]\`\}/,
  `className={\`absolute inset-0 z-10 flex flex-col h-full w-full overflow-hidden \${isDesktopMode ? 'bg-transparent' : isTacticalMode ? 'bg-black' : 'bg-[#010612]'} font-mono text-[#88c0ff]\`}`
);

fs.writeFileSync('src/components/HermesUI.tsx', content);
console.log('Done!');
