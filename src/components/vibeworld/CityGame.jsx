import React, { useRef, useMemo, useCallback, useEffect, useState, Component } from "react";
// Note: useMemo kept for FollowCamera
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, COLLISION_BOXES, SPAWN, PATHS } from "./cityData";
import MobileControls from "./MobileControls";
import InteractionPrompt from "./InteractionPrompt";

// Local error boundary for Canvas
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error: error?.message || String(error) }; }
  componentDidCatch(error) { this.props.onError?.(error?.message || String(error)); }
  render() { return this.state.error ? null : this.props.children; }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Circle vs AABB collision
// ═══════════════════════════════════════════════════════════════
function circleVsAABB(cx, cz, r, bx, bz, hw, hd) {
  const closestX = Math.max(bx - hw, Math.min(cx, bx + hw));
  const closestZ = Math.max(bz - hd, Math.min(cz, bz + hd));
  const dx = cx - closestX;
  const dz = cz - closestZ;
  return (dx * dx + dz * dz) < (r * r);
}

function resolveCollisions(x, z, r, boxes) {
  let px = x, pz = z;
  for (const [bx, bz, hw, hd] of boxes) {
    if (!circleVsAABB(px, pz, r, bx, bz, hw, hd)) continue;
    const centerX = bx;
    const centerZ = bz;
    const dx = px - centerX;
    const dz = pz - centerZ;
    const overlapX = hw + r - Math.abs(dx);
    const overlapZ = hd + r - Math.abs(dz);
    if (overlapX < overlapZ) {
      px = dx > 0 ? centerX + hw + r : centerX - hw - r;
    } else {
      pz = dz > 0 ? centerZ + hd + r : centerZ - hd - r;
    }
  }
  return [px, pz];
}

// ═══════════════════════════════════════════════════════════════
// PLAYER RADIUS
// ═══════════════════════════════════════════════════════════════
const PLAYER_R = 0.4;

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS (must be inside Canvas)
// ═══════════════════════════════════════════════════════════════

// ─── Ground + Roads ───
function Ground() {
  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.95} />
      </mesh>

      {/* Plaza floor (lighter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#141428" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Paths to districts */}
      {PATHS.map((p, i) => {
        const [fx, fz] = p.from;
        const [tx, tz] = p.to;
        const dx = tx - fx, dz = tz - fz;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, angle]} position={[(fx + tx) / 2, 0.01, (fz + tz) / 2]}>
            <planeGeometry args={[1.2, len]} />
            <meshBasicMaterial color={p.color} transparent opacity={0.15} />
          </mesh>
        );
      })}
    </>
  );
}

// ─── Central Plaza Fountain ───
function PlazaFountain() {
  const ringRef = useRef();
  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.y += delta * 0.4;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Base pool */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[1.6, 1.8, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a3a" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Water surface */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.55, 1.55, 0.05, 32]} />
        <meshStandardMaterial color="#00A0DC" roughness={0.1} metalness={0.8} emissive="#003366" emissiveIntensity={0.5} transparent opacity={0.7} />
      </mesh>
      {/* Center pillar */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.8, 16]} />
        <meshStandardMaterial color="#00A0DC" roughness={0.3} metalness={0.9} emissive="#005599" emissiveIntensity={0.4} />
      </mesh>
      {/* Floating ring */}
      <mesh ref={ringRef} position={[0, 1.1, 0]}>
        <torusGeometry args={[0.35, 0.03, 16, 32]} />
        <meshStandardMaterial color="#00E5FF" roughness={0.1} metalness={1} emissive="#00C0DD" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// ─── Particle system ───
function Particles({ count = 200 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      arr[i] = (Math.random() - 0.5) * 40;
      arr[i + 1] = Math.random() * 8 + 0.5;
      arr[i + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, [count]);

  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#00A0DC" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// ─── Hologram Billboard in Plaza ───
function PlazaBillboard() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.y = 2.5 + Math.sin(Date.now() * 0.002) * 0.1;
    }
  });

  return (
    <group position={[0, 2.5, 4]} ref={ref}>
      {/* Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 1.5, 0.05]} />
        <meshStandardMaterial color="#001122" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Glow edge */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[2.8, 1.3, 0.01]} />
        <meshBasicMaterial color="#00A0DC" transparent opacity={0.3} />
      </mesh>
      {/* Pillars */}
      <mesh position={[-1.55, -0.85, 0]}><cylinderGeometry args={[0.08, 0.08, 2.8, 8]} /><meshStandardMaterial color="#0088BB" metalness={0.9} emissive="#004466" emissiveIntensity={0.5} /></mesh>
      <mesh position={[1.55, -0.85, 0]}><cylinderGeometry args={[0.08, 0.08, 2.8, 8]} /><meshStandardMaterial color="#0088BB" metalness={0.9} emissive="#004466" emissiveIntensity={0.5} /></mesh>
    </group>
  );
}

// ─── District Building: Music District ───
function MusicDistrictBuilding() {
  const pos = DISTRICTS.music.position;
  return (
    <group position={[pos[0], 0, pos[2]]}>
      {/* Main building */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 3]} />
        <meshStandardMaterial color="#0d0d2a" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Neon trim */}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[4.1, 0.1, 3.1]} />
        <meshBasicMaterial color="#00A0DC" />
      </mesh>
      {/* Door glow */}
      <mesh position={[0, 0.8, 1.55]}>
        <boxGeometry args={[1.2, 1.6, 0.02]} />
        <meshBasicMaterial color="#00A0DC" transparent opacity={0.6} />
      </mesh>
      {/* Sign */}
      <mesh position={[0, 3.5, 1.55]}>
        <boxGeometry args={[2.5, 0.4, 0.05]} />
        <meshBasicMaterial color="#00E5FF" />
      </mesh>
    </group>
  );
}

// ─── Radio Tower ───
function RadioTower() {
  const pos = DISTRICTS.radio.position;
  const h = DISTRICTS.radio.towerHeight;
  const glowRef = useRef();

  useFrame((_, delta) => {
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.4 + Math.sin(Date.now() * 0.003) * 0.2;
    }
  });

  const segments = [];
  for (let i = 0; i < 5; i++) {
    const y = 1 + i * (h / 5);
    const s = 1 - i * 0.12;
    segments.push(
      <mesh key={i} position={[pos[0], y, pos[2] - 0.5]}>
        <boxGeometry args={[s * 2, 0.15, s * 2]} />
        <meshStandardMaterial color="#9B7EFF" roughness={0.3} metalness={0.9} emissive="#6D28D9" emissiveIntensity={0.4} />
      </mesh>
    );
  }

  return (
    <group>
      {/* Base */}
      <mesh position={[pos[0], 0.5, pos[2]]} castShadow>
        <cylinderGeometry args={[1.5, 1.8, 1, 16]} />
        <meshStandardMaterial color="#1a1035" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Core column */}
      <mesh position={[pos[0], h / 2 + 1, pos[2]]}>
        <cylinderGeometry args={[0.2, 0.3, h, 8]} />
        <meshStandardMaterial color="#2a1a55" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Platform segments */}
      {segments}
      {/* Tower top glow */}
      <mesh ref={glowRef} position={[pos[0], h + 1.3, pos[2]]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#9B7EFF" transparent opacity={0.6} />
      </mesh>
      {/* Pulsing beacon */}
      <pointLight position={[pos[0], h + 1.3, pos[2]]} color="#9B7EFF" intensity={3} distance={15} />
    </group>
  );
}

// ─── Manifestation Gardens ───
function Gardens() {
  const pos = DISTRICTS.gardens.position;
  const trees = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 3 + Math.random() * 3;
    const tx = pos[0] + Math.cos(angle) * r;
    const tz = pos[2] + Math.sin(angle) * r;
    const th = 1.5 + Math.random() * 1.5;
    trees.push(
      <group key={i} position={[tx, 0, tz]}>
        <mesh position={[0, th / 2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, th, 8]} />
          <meshStandardMaterial color="#0d3322" roughness={0.6} />
        </mesh>
        <mesh position={[0, th + 0.4, 0]}>
          <coneGeometry args={[0.6, 1.2, 8]} />
          <meshStandardMaterial color="#34D399" roughness={0.4} emissive="#1a6644" emissiveIntensity={0.25} />
        </mesh>
        {/* Leaf glow */}
        <pointLight position={[0, th + 0.5, 0]} color="#34D399" intensity={0.3} distance={2} />
      </group>
    );
  }

  return (
    <group>
      {trees}
      {/* Pond */}
      <mesh position={[pos[0], 0.05, pos[2]]}>
        <cylinderGeometry args={[1.5, 1.5, 0.05, 24]} />
        <meshStandardMaterial color="#0d4d3a" roughness={0.1} metalness={0.6} emissive="#0a2a1a" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ─── Hall of Frequencies ───
function HallOfFrequencies() {
  const pos = DISTRICTS.frequencies.position;
  const size = DISTRICTS.frequencies.buildingSize;

  return (
    <group position={[pos[0], 0, pos[2]]}>
      {/* Building body */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#1a0a20" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Roof glow */}
      <mesh position={[0, size[1] + 0.05, 0]}>
        <boxGeometry args={[size[0] + 0.1, 0.05, size[2] + 0.1]} />
        <meshBasicMaterial color="#EC4899" />
      </mesh>
      {/* Front doors */}
      {[-1.5, -0.5, 0.5, 1.5].map((ox, i) => (
        <mesh key={i} position={[ox, 0.8, size[2] / 2 + 0.02]}>
          <boxGeometry args={[0.5, 1.6, 0.02]} />
          <meshBasicMaterial color={["#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"][i]} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Ambient lighting ───
function CityLighting() {
  return (
    <>
      <ambientLight intensity={0.2} color="#1a1a3a" />
      <directionalLight position={[10, 20, 5]} intensity={0.4} color="#334466" castShadow />
      <pointLight position={[0, 3, 3]} intensity={2} color="#00A0DC" distance={12} />
      <pointLight position={[-15, 2, -15]} intensity={1.5} color="#34D399" distance={10} />
      <pointLight position={[15, 2, 15]} intensity={1.5} color="#EC4899" distance={10} />
      <pointLight position={[0, 6, -15]} intensity={3} color="#9B7EFF" distance={15} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// PLAYER CONTROLLER
// ═══════════════════════════════════════════════════════════════
function PlayerController({ position, setPosition, setRotation, input, interactionLocked, setCurrentZone }) {
  const groupRef = useRef();
  const speed = 4;

  useFrame((_, delta) => {
    const inp = input?.current;
    if (!inp) return;
    const dt = Math.min(delta, 0.1);
    let [x, , z] = position.current || SPAWN;
    let rot = position.current ? Math.atan2(
      Math.sin(position.current[3] || 0),
      Math.cos(position.current[3] || 0)
    ) : 0;

    // Rotation from mouse/touch look
    if (inp.lookX) rot += inp.lookX * 3 * dt;
    if (inp.lookY) rot += inp.lookY * 3 * dt;

    // Movement direction: forward = where camera looks
    let moveX = 0, moveZ = 0;
    if (inp.forward) { moveX += Math.sin(rot); moveZ += Math.cos(rot); }
    if (inp.backward) { moveX -= Math.sin(rot); moveZ -= Math.cos(rot); }
    if (inp.left) { moveX -= Math.cos(rot); moveZ += Math.sin(rot); }
    if (inp.right) { moveX += Math.cos(rot); moveZ -= Math.sin(rot); }

    // Normalize diagonal
    const mag = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (mag > 0) {
      moveX = (moveX / mag) * speed * dt;
      moveZ = (moveZ / mag) * speed * dt;
    }

    x += moveX;
    z += moveZ;

    // Collision
    if (!interactionLocked) {
      [x, z] = resolveCollisions(x, z, PLAYER_R, COLLISION_BOXES);
    }

    position.current = [x, position.current ? position.current[1] : SPAWN[1], z, rot];
    setPosition([x, position.current ? position.current[1] : SPAWN[1], z]);
    if (setRotation) setRotation(rot);

    // Update group transform
    if (groupRef.current) {
      groupRef.current.position.set(x, position.current?.[1] ?? SPAWN[1], z);
      groupRef.current.rotation.y = rot + Math.PI;
    }

    // Zone detection
    let nearest = null;
    let nearestDist = Infinity;
    for (const d of Object.values(DISTRICTS)) {
      const dx = x - d.position[0];
      const dz = z - d.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < d.zoneRadius && dist < nearestDist) {
        nearest = d.id;
        nearestDist = dist;
      }
    }
    setCurrentZone?.(nearest);
  });

  return (
    <group ref={groupRef} position={SPAWN}>
      {/* Simple character body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.6, 8]} />
        <meshStandardMaterial color="#00A0DC" roughness={0.4} metalness={0.6} emissive="#004466" emissiveIntensity={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#0088CC" roughness={0.3} metalness={0.5} emissive="#003355" emissiveIntensity={0.2} />
      </mesh>
      {/* Glow ring under feet */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.35, 32]} />
        <meshBasicMaterial color="#00A0DC" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAMERA (third-person follow)
// ═══════════════════════════════════════════════════════════════
function FollowCamera({ target }) {
  const { camera } = useThree();
  const offset = useMemo(() => new THREE.Vector3(0, 4, 6), []);

  useFrame(() => {
    if (!target.current) return;
    const [tx, ty, tz, rot] = target.current;
    const behindX = tx - Math.sin(rot) * offset.z;
    const behindZ = tz - Math.cos(rot) * offset.z;
    camera.position.lerp(new THREE.Vector3(behindX, ty + offset.y, behindZ), 0.08);
    camera.lookAt(tx, ty + 0.8, tz);
  });

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN CITY GAME (inside Canvas)
// ═══════════════════════════════════════════════════════════════
function CityScene({ onLoaded }) {
  // Call onLoaded via requestAnimationFrame to signal scene is ready
  useFrame(() => {
    onLoaded?.();
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#00A0DC" />
      </mesh>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTED GAME WRAPPER (handles input state outside Canvas)
// ═══════════════════════════════════════════════════════════════
export default function CityGame({ onLoaded, interactionLocked, onZoneChange, onEnterCurrentZone }) {
  const inputRef = useRef({ forward: false, backward: false, left: false, right: false, lookX: 0, lookY: 0 });
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [zoneState, setZoneState] = useState(null);
  const [canvasError, setCanvasError] = useState(null);

  if (canvasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#05050f]">
        <div className="text-center px-6">
          <p className="text-red-400 font-bold mb-2">3D Render Error</p>
          <p className="text-xs text-white/50 mb-4 max-w-md">{canvasError}</p>
          <button onClick={() => { setCanvasError(null); onLoaded?.(); }}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-bold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setShowMobileControls("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // Keyboard input
  useEffect(() => {
    const keys = {};
    const onDown = (e) => {
      keys[e.key.toLowerCase()] = true;
      update();
    };
    const onUp = (e) => {
      keys[e.key.toLowerCase()] = false;
      update();
    };
    function update() {
      inputRef.current.forward = keys["w"] || keys["arrowup"];
      inputRef.current.backward = keys["s"] || keys["arrowdown"];
      inputRef.current.left = keys["a"] || keys["arrowleft"];
      inputRef.current.right = keys["d"] || keys["arrowright"];
    }

    let mouseDown = false;
    const onMouseDown = () => { mouseDown = true; };
    const onMouseUp = () => { mouseDown = false; };
    const onMouseMove = (e) => {
      if (!mouseDown || interactionLocked) return;
      inputRef.current.lookX += e.movementX * 0.003;
      inputRef.current.lookY += e.movementY * 0.003;
    };

    const onEnterKey = (e) => {
      if (e.key === "e" || e.key === "E") {
        const z = zoneState;
        if (z) onEnterCurrentZone?.(z);
      }
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("keydown", onEnterKey);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("keydown", onEnterKey);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [interactionLocked, zoneState, onEnterCurrentZone]);

  const setCurrentZone = useCallback((id) => {
    setZoneState(id);
    onZoneChange?.(id);
  }, [onZoneChange]);

  const handleMobileInput = useCallback((data) => {
    inputRef.current.forward = data.forward;
    inputRef.current.backward = data.backward;
    inputRef.current.left = data.left;
    inputRef.current.right = data.right;
    if (!interactionLocked) {
      inputRef.current.lookX += data.lookX * 0.005;
      inputRef.current.lookY += data.lookY * 0.005;
    }
  }, [interactionLocked]);

  return (
    <>
      <ErrorBoundary onError={(msg) => setCanvasError(msg)}>
        <Canvas
          shadows
          camera={{ position: [0, 5, 8], fov: 55, near: 0.1, far: 80 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#05050f" }}
          onCreated={() => onLoaded?.()}
        >
          <CityScene onLoaded={onLoaded} />
        </Canvas>
      </ErrorBoundary>

      {showMobileControls && (
        <MobileControls onInput={handleMobileInput} interactionLocked={interactionLocked} />
      )}

      <InteractionPrompt zoneId={zoneState} onEnter={() => onEnterCurrentZone?.(zoneState)} />
    </>
  );
}