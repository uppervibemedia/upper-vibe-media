import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { DISTRICTS, COLLISION_BOXES, SPAWN, PATHS } from "./cityData";

const PLAYER_R = 0.4;
const PLAYER_SPEED = 4;

// ─── Helpers ─────────────────────────────────────────────────
function circleVsAABB(cx, cz, r, bx, bz, hw, hd) {
  const closestX = Math.max(bx - hw, Math.min(cx, bx + hw));
  const closestZ = Math.max(bz - hd, Math.min(cz, bz + hd));
  const dx = cx - closestX, dz = cz - closestZ;
  return (dx * dx + dz * dz) < (r * r);
}

function resolveCollisions(x, z, r, boxes) {
  let px = x, pz = z;
  for (const [bx, bz, hw, hd] of boxes) {
    if (!circleVsAABB(px, pz, r, bx, bz, hw, hd)) continue;
    const dx = px - bx, dz = pz - bz;
    const ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz);
    if (ox < oz) px = dx > 0 ? bx + hw + r : bx - hw - r;
    else pz = dz > 0 ? bz + hd + r : bz - hd - r;
  }
  return [px, pz];
}

// ═══════════════════════════════════════════════════════════════
// BUILD CITY OBJECTS
// ═══════════════════════════════════════════════════════════════
function buildCity(scene) {
  // ─── Ground ───
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({ color: "#0a0a1a", roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // Plaza floor
  const plazaGeo = new THREE.CircleGeometry(7, 48);
  const plazaMat = new THREE.MeshStandardMaterial({ color: "#141428", roughness: 0.7, metalness: 0.2 });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Paths
  PATHS.forEach((p) => {
    const [fx, fz] = p.from, [tx, tz] = p.to;
    const dx = tx - fx, dz = tz - fz;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const pathGeo = new THREE.PlaneGeometry(1.2, len);
    const pathMat = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.15 });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.rotation.z = angle;
    pathMesh.position.set((fx + tx) / 2, 0.01, (fz + tz) / 2);
    scene.add(pathMesh);
  });

  // ─── Plaza Fountain ───
  const fountain = new THREE.Group();
  fountain.name = "fountain";
  // Base pool
  const poolGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.3, 32);
  const pool = new THREE.Mesh(poolGeo, new THREE.MeshStandardMaterial({ color: "#1a1a3a", roughness: 0.3, metalness: 0.6 }));
  pool.position.y = 0.1;
  fountain.add(pool);
  // Water
  const waterGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.05, 32);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: "#00A0DC", roughness: 0.1, metalness: 0.8, emissive: "#003366", emissiveIntensity: 0.5, transparent: true, opacity: 0.7 }));
  water.position.y = 0.25;
  fountain.add(water);
  // Pillar
  const pillarGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 16);
  const pillar = new THREE.Mesh(pillarGeo, new THREE.MeshStandardMaterial({ color: "#00A0DC", roughness: 0.3, metalness: 0.9, emissive: "#005599", emissiveIntensity: 0.4 }));
  pillar.position.y = 0.7;
  fountain.add(pillar);
  // Floating ring
  const ringGeo = new THREE.TorusGeometry(0.35, 0.03, 16, 32);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: "#00E5FF", roughness: 0.1, metalness: 1, emissive: "#00C0DD", emissiveIntensity: 0.8 }));
  ring.position.y = 1.1;
  ring.name = "fountainRing";
  fountain.add(ring);
  scene.add(fountain);

  // ─── Plaza Billboard ───
  const billboard = new THREE.Group();
  billboard.position.set(0, 2.5, 4);
  const frameGeo = new THREE.BoxGeometry(3, 1.5, 0.05);
  const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: "#001122", roughness: 0.2, metalness: 0.9 }));
  billboard.add(frame);
  const glowEdgeGeo = new THREE.BoxGeometry(2.8, 1.3, 0.01);
  const glowEdge = new THREE.Mesh(glowEdgeGeo, new THREE.MeshBasicMaterial({ color: "#00A0DC", transparent: true, opacity: 0.3 }));
  glowEdge.position.z = 0.03;
  billboard.add(glowEdge);
  const pGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8);
  const pMat = new THREE.MeshStandardMaterial({ color: "#0088BB", metalness: 0.9, emissive: "#004466", emissiveIntensity: 0.5 });
  const leftP = new THREE.Mesh(pGeo, pMat); leftP.position.set(-1.55, -0.85, 0); billboard.add(leftP);
  const rightP = new THREE.Mesh(pGeo, pMat); rightP.position.set(1.55, -0.85, 0); billboard.add(rightP);
  billboard.name = "billboard";
  scene.add(billboard);

  // ─── Music District Building ───
  const musicBld = new THREE.Group();
  const mdPos = DISTRICTS.music.position;
  const bodyGeo = new THREE.BoxGeometry(4, 3, 3);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: "#0d0d2a", roughness: 0.4, metalness: 0.7 }));
  body.position.y = 1.5; body.castShadow = true;
  musicBld.add(body);
  const trimGeo = new THREE.BoxGeometry(4.1, 0.1, 3.1);
  const trim = new THREE.Mesh(trimGeo, new THREE.MeshBasicMaterial({ color: "#00A0DC" }));
  trim.position.y = 3.05;
  musicBld.add(trim);
  const doorGeo = new THREE.BoxGeometry(1.2, 1.6, 0.02);
  const door = new THREE.Mesh(doorGeo, new THREE.MeshBasicMaterial({ color: "#00A0DC", transparent: true, opacity: 0.6 }));
  door.position.set(0, 0.8, 1.55);
  musicBld.add(door);
  const signGeo = new THREE.BoxGeometry(2.5, 0.4, 0.05);
  const sign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ color: "#00E5FF" }));
  sign.position.set(0, 3.5, 1.55);
  musicBld.add(sign);
  musicBld.position.set(mdPos[0], 0, mdPos[2]);
  scene.add(musicBld);

  // ─── Radio Tower ───
  const radioTower = new THREE.Group();
  const rtPos = DISTRICTS.radio.position;
  const towerH = DISTRICTS.radio.towerHeight;
  const baseGeo = new THREE.CylinderGeometry(1.5, 1.8, 1, 16);
  const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: "#1a1035", roughness: 0.3, metalness: 0.7 }));
  base.position.y = 0.5; base.castShadow = true;
  radioTower.add(base);
  const coreGeo = new THREE.CylinderGeometry(0.2, 0.3, towerH, 8);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({ color: "#2a1a55", roughness: 0.3, metalness: 0.8 }));
  core.position.y = towerH / 2 + 1;
  radioTower.add(core);
  for (let i = 0; i < 5; i++) {
    const y = 1 + i * (towerH / 5);
    const s = 1 - i * 0.12;
    const platGeo = new THREE.BoxGeometry(s * 2, 0.15, s * 2);
    const plat = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ color: "#9B7EFF", roughness: 0.3, metalness: 0.9, emissive: "#6D28D9", emissiveIntensity: 0.4 }));
    plat.position.set(0, y, -0.5);
    radioTower.add(plat);
  }
  const beaconGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: "#9B7EFF", transparent: true, opacity: 0.6 }));
  beacon.position.y = towerH + 1.3;
  beacon.name = "beacon";
  radioTower.add(beacon);
  const beaconLight = new THREE.PointLight("#9B7EFF", 3, 15);
  beaconLight.position.y = towerH + 1.3;
  radioTower.add(beaconLight);
  radioTower.position.set(rtPos[0], 0, rtPos[2]);
  scene.add(radioTower);

  // ─── Gardens ───
  const gardens = new THREE.Group();
  const gPos = DISTRICTS.gardens.position;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 3 + Math.random() * 3;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    const th = 1.5 + Math.random() * 1.5;
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, th, 8);
    const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: "#0d3322", roughness: 0.6 }));
    trunk.position.set(tx, th / 2, tz);
    trunk.castShadow = true;
    gardens.add(trunk);
    const leafGeo = new THREE.ConeGeometry(0.6, 1.2, 8);
    const leaf = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: "#34D399", roughness: 0.4, emissive: "#1a6644", emissiveIntensity: 0.25 }));
    leaf.position.set(tx, th + 0.4, tz);
    gardens.add(leaf);
    const leafLight = new THREE.PointLight("#34D399", 0.3, 2);
    leafLight.position.set(tx, th + 0.5, tz);
    gardens.add(leafLight);
  }
  const pondGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.05, 24);
  const pond = new THREE.Mesh(pondGeo, new THREE.MeshStandardMaterial({ color: "#0d4d3a", roughness: 0.1, metalness: 0.6, emissive: "#0a2a1a", emissiveIntensity: 0.3 }));
  pond.position.y = 0.05;
  gardens.add(pond);
  gardens.position.set(gPos[0], 0, gPos[2]);
  scene.add(gardens);

  // ─── Hall of Frequencies ───
  const hall = new THREE.Group();
  const fPos = DISTRICTS.frequencies.position;
  const fSize = DISTRICTS.frequencies.buildingSize;
  const hallBodyGeo = new THREE.BoxGeometry(fSize[0], fSize[1], fSize[2]);
  const hallBody = new THREE.Mesh(hallBodyGeo, new THREE.MeshStandardMaterial({ color: "#1a0a20", roughness: 0.3, metalness: 0.6 }));
  hallBody.position.y = fSize[1] / 2;
  hallBody.castShadow = true;
  hall.add(hallBody);
  const roofGeo = new THREE.BoxGeometry(fSize[0] + 0.1, 0.05, fSize[2] + 0.1);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshBasicMaterial({ color: "#EC4899" }));
  roof.position.y = fSize[1] + 0.05;
  hall.add(roof);
  const doorColors = ["#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];
  [-1.5, -0.5, 0.5, 1.5].forEach((ox, i) => {
    const dGeo = new THREE.BoxGeometry(0.5, 1.6, 0.02);
    const d = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color: doorColors[i], transparent: true, opacity: 0.6 }));
    d.position.set(ox, 0.8, fSize[2] / 2 + 0.02);
    hall.add(d);
  });
  hall.position.set(fPos[0], 0, fPos[2]);
  scene.add(hall);

  // ─── Particles ───
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 40;
    positions[i + 1] = Math.random() * 8 + 0.5;
    positions[i + 2] = (Math.random() - 0.5) * 40;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ size: 0.04, color: "#00A0DC", transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const particleSystem = new THREE.Points(particleGeo, particleMat);
  particleSystem.name = "particles";
  scene.add(particleSystem);

  // ─── Lighting ───
  scene.add(new THREE.AmbientLight("#1a1a3a", 0.2));
  const dirLight = new THREE.DirectionalLight("#334466", 0.4);
  dirLight.position.set(10, 20, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);
  scene.add(new THREE.PointLight("#00A0DC", 2, 12).translateY(3).translateZ(3));
  const gl = new THREE.PointLight("#34D399", 1.5, 10); gl.position.set(-15, 2, -15); scene.add(gl);
  const rl = new THREE.PointLight("#EC4899", 1.5, 10); rl.position.set(15, 2, 15); scene.add(rl);
  const pl = new THREE.PointLight("#9B7EFF", 3, 15); pl.position.set(0, 6, -15); scene.add(pl);
}

// ═══════════════════════════════════════════════════════════════
// PLAYER CHARACTER
// ═══════════════════════════════════════════════════════════════
function createPlayer(scene) {
  const player = new THREE.Group();
  player.name = "player";

  const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: "#00A0DC", roughness: 0.4, metalness: 0.6, emissive: "#004466", emissiveIntensity: 0.3 }));
  body.position.y = 0.5;
  body.castShadow = true;
  player.add(body);

  const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: "#0088CC", roughness: 0.3, metalness: 0.5, emissive: "#003355", emissiveIntensity: 0.2 }));
  head.position.y = 1.05;
  player.add(head);

  const ringGeo = new THREE.RingGeometry(0.25, 0.35, 32);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: "#00A0DC", transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  player.add(ring);

  player.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(player);
  return player;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded, onZoneChange, onEnterCurrentZone }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const sceneRef = useRef(null);
  const playerRef = useRef(null);
  const playerPosRef = useRef([...SPAWN, 0]); // x, y, z, rot
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0 });
  const frameRef = useRef(0);
  const zoneRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Scene + Camera
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#05050f");
      scene.fog = new THREE.Fog("#05050f", 15, 60);
      const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 80);
      camera.position.set(0, 5, 8);
      sceneRef.current = scene;

      // Build city
      buildCity(scene);

      // Player
      const player = createPlayer(scene);
      playerRef.current = player;

      // ─── Animation Loop ───
      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const dt = 0.016; // ~60fps

        const keys = keysRef.current;
        const mouse = mouseRef.current;
        const [px, py, pz, prot] = playerPosRef.current;
        let x = px, y = py, z = pz, rot = prot;

        // Mouse look
        if (mouse.down) {
          rot += mouse.dx * 0.01;
          // Clamp vertical look
          // rot vertical not tracked for simplicity
          mouse.dx = 0;
          mouse.dy = 0;
        }

        // Movement
        let mx = 0, mz = 0;
        if (keys.w || keys.arrowup) { mx += Math.sin(rot); mz += Math.cos(rot); }
        if (keys.s || keys.arrowdown) { mx -= Math.sin(rot); mz -= Math.cos(rot); }
        if (keys.a || keys.arrowleft) { mx -= Math.cos(rot); mz += Math.sin(rot); }
        if (keys.d || keys.arrowright) { mx += Math.cos(rot); mz -= Math.sin(rot); }

        const mag = Math.sqrt(mx * mx + mz * mz);
        if (mag > 0) {
          mx = (mx / mag) * PLAYER_SPEED * dt;
          mz = (mz / mag) * PLAYER_SPEED * dt;
        }

        x += mx; z += mz;
        [x, z] = resolveCollisions(x, z, PLAYER_R, COLLISION_BOXES);

        playerPosRef.current = [x, y, z, rot];
        player.position.set(x, y, z);
        player.rotation.y = rot + Math.PI;

        // Camera follow
        const camDist = 6;
        const camHeight = 4;
        const behindX = x - Math.sin(rot) * camDist;
        const behindZ = z - Math.cos(rot) * camDist;
        camera.position.lerp(new THREE.Vector3(behindX, y + camHeight, behindZ), 0.08);
        camera.lookAt(x, y + 0.8, z);

        // Zone detection
        let nearest = null, nearestDist = Infinity;
        for (const d of Object.values(DISTRICTS)) {
          const dx = x - d.position[0];
          const dz = z - d.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < d.zoneRadius && dist < nearestDist) { nearest = d.id; nearestDist = dist; }
        }
        if (nearest !== zoneRef.current) {
          zoneRef.current = nearest;
          onZoneChange?.(nearest);
        }

        // Animate fountain ring
        const fountainRing = scene.getObjectByName("fountainRing");
        if (fountainRing) fountainRing.rotation.y += dt * 0.4;

        // Animate particles
        const particles = scene.getObjectByName("particles");
        if (particles) particles.rotation.y += dt * 0.05;

        // Billboard bob
        const billboard = scene.getObjectByName("billboard");
        if (billboard) billboard.position.y = 2.5 + Math.sin(Date.now() * 0.002) * 0.1;

        // Beacon pulse
        const beacon = scene.getObjectByName("beacon");
        if (beacon) beacon.material.opacity = 0.4 + Math.sin(Date.now() * 0.003) * 0.2;

        renderer.render(scene, camera);
        frameRef.current++;

        // Signal loaded after first frame
        if (frameRef.current === 2) onLoaded?.();
      };

      animate();

      // ─── Resize ───
      const onResize = () => {
        if (!canvas) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      };
    } catch (e) {
      setError(e.message || String(e));
    }
  }, []);

  // ─── Keyboard input ───
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "e" || e.key === "E") {
        const z = zoneRef.current;
        if (z) onEnterCurrentZone?.(z);
      }
    };
    const onUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    const onMouseDown = (e) => { mouseRef.current.down = true; };
    const onMouseUp = () => { mouseRef.current.down = false; };
    const onMouseMove = (e) => {
      if (!mouseRef.current.down) return;
      mouseRef.current.dx += e.movementX;
      mouseRef.current.dy += e.movementY;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [onEnterCurrentZone]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#05050f]">
        <div className="text-center px-6">
          <p className="text-red-400 font-bold text-sm mb-2">3D Error</p>
          <p className="text-xs text-white/40 mb-4 max-w-md">{error}</p>
          <button onClick={() => { setError(null); window.location.reload(); }}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-bold">
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: "none" }}
    />
  );
}