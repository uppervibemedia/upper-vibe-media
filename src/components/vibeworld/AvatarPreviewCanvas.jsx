/**
 * AvatarPreviewCanvas — full-body preview with Front/Side/Back view controls.
 * Renders the correct avatar based on avatarTypeKey:
 *   "current"              → Soldier GLB
 *   "test-mixamo"          → Male Casual (procedural)
 *   "test-mixamo-female"   → Female Casual (procedural)
 */
import React, { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OUTFIT_COLORS } from "./AvatarSetup";

// ── GLB loader (soldier) ───────────────────────────────────────────────────────
const GLB_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";
let _gltfCache = null, _gltfPromise = null;
function loadGLTF() {
  if (_gltfCache) return Promise.resolve(_gltfCache);
  if (_gltfPromise) return _gltfPromise;
  const loader = new GLTFLoader();
  _gltfPromise = new Promise((resolve, reject) => {
    loader.load(GLB_URL, (g) => { _gltfCache = g; resolve(g); }, undefined, (e) => { _gltfPromise = null; reject(e); });
  });
  return _gltfPromise;
}

function applyOutfitTint(model, outfitColorKey) {
  if (!model) return;
  const outfit = OUTFIT_COLORS.find(c => c.key === outfitColorKey);
  if (!outfit) return;
  const targetColor = new THREE.Color(outfit.hex);
  model.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m?.color) return;
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      const orig = m.userData._origColor;
      const { r, g, b } = orig;
      const isSkin = r > 0.35 && r > b * 1.3 && g > b * 0.8 && r < 0.95 && b < 0.6;
      if (isSkin) { m.color.copy(orig); return; }
      m.color.copy(targetColor);
    });
  });
}

// ── Shared mat helper ──────────────────────────────────────────────────────────
function mstd(hex, rough = 0.65, metal = 0.04) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });
}
function mbasic(hex, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, depthWrite: false });
}

// ── Build Male Casual procedural model ────────────────────────────────────────
function buildMale() {
  const root = new THREE.Group();
  const C = { skin: 0xC68642, hair: 0x1A0800, shirt: 0x1D3557, pants: 0x2B2D42, shoes: 0x1A1A1A, accent: 0xE63946 };

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.088, 0.44, 4, 8);
  const legL = new THREE.Mesh(legGeo, mstd(C.pants)); legL.position.set(0.108, 0.62, 0); root.add(legL);
  const legR = legL.clone(); legR.position.set(-0.108, 0.62, 0); root.add(legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.10, 0.20);
  const bootL = new THREE.Mesh(shoeGeo, mstd(C.shoes)); bootL.position.set(0.108, 0.33, 0.018); root.add(bootL);
  const bootR = bootL.clone(); bootR.position.set(-0.108, 0.33, 0.018); root.add(bootR);
  // Sole accent
  for (const bx of [0.108, -0.108]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.014, 0.14), mbasic(C.accent, 0.55));
    s.position.set(bx, 0.282, 0.012); root.add(s);
  }

  // Torso
  const torsoG = new THREE.Group(); torsoG.position.set(0, 1.12, 0); root.add(torsoG);
  torsoG.add(new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.46, 0.24), mstd(C.shirt, 0.75)));
  // Pocket
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.012), mbasic(C.accent, 0.45));
  pocket.position.set(0, -0.14, 0.122); torsoG.add(pocket);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.068, 0.40, 4, 8);
  const armL = new THREE.Group(); armL.position.set(0.235, -0.05, 0); torsoG.add(armL);
  const armLMesh = new THREE.Mesh(armGeo, mstd(C.shirt, 0.75)); armLMesh.rotation.z = 0.12; armL.add(armLMesh);
  const armR = new THREE.Group(); armR.position.set(-0.235, -0.05, 0); torsoG.add(armR);
  const armRMesh = new THREE.Mesh(armGeo, mstd(C.shirt, 0.75)); armRMesh.rotation.z = -0.12; armR.add(armRMesh);

  // Hands
  const hG = new THREE.SphereGeometry(0.068, 8, 6);
  const hL = new THREE.Mesh(hG, mstd(C.skin)); hL.position.set(0.05, -0.28, 0); armL.add(hL);
  const hR = hL.clone(); hR.position.set(-0.05, -0.28, 0); armR.add(hR);

  // Neck
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.13, 8), mstd(C.skin));
  neckM.position.set(0, 0.30, 0); torsoG.add(neckM);

  // Head
  const headG = new THREE.Group(); headG.position.set(0, 0.44, 0); torsoG.add(headG);
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.158, 12, 10), mstd(C.skin)));
  // Hair
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.163, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), mstd(C.hair, 0.88));
  hair.position.y = 0.02; headG.add(hair);
  // Eyes
  const eM = mbasic(0x111111);
  for (const [ex, ez] of [[0.055, 0.148], [-0.055, 0.148]]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eM);
    e.position.set(ex, 0.032, ez); headG.add(e);
  }

  root.position.y = 0; // feet at y=0.28, we'll shift to ground
  // Shift so feet are at y=0
  root.position.y = -0.28;
  return root;
}

// ── Build Female Casual procedural model ──────────────────────────────────────
function buildFemale() {
  const root = new THREE.Group();
  const C = { skin: 0xD4956A, hair: 0x3D0C02, shirt: 0x6A0572, pants: 0x1B1B2F, shoes: 0xF72585, accent: 0xF72585 };

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.072, 0.46, 4, 8);
  const legL = new THREE.Mesh(legGeo, mstd(C.pants)); legL.position.set(0.090, 0.62, 0); root.add(legL);
  const legR = legL.clone(); legR.position.set(-0.090, 0.62, 0); root.add(legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.10, 0.10, 0.185);
  const bootL = new THREE.Mesh(shoeGeo, mstd(C.shoes)); bootL.position.set(0.090, 0.325, 0.015); root.add(bootL);
  const bootR = bootL.clone(); bootR.position.set(-0.090, 0.325, 0.015); root.add(bootR);
  // Glow
  for (const bx of [0.090, -0.090]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.012, 0.13), mbasic(0xFF9EF5, 0.60));
    s.position.set(bx, 0.278, 0.010); root.add(s);
  }

  // Torso
  const torsoG = new THREE.Group(); torsoG.position.set(0, 1.13, 0); root.add(torsoG);
  torsoG.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.40, 0.20), mstd(C.shirt, 0.65)));
  // Belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.025, 0.21), mbasic(C.accent, 0.70));
  belt.position.set(0, -0.13, 0); torsoG.add(belt);
  // V-neck
  for (const [vx, vz] of [[0.038, 0.28], [-0.038, -0.28]]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.20, 0.011), mbasic(C.accent, 0.70));
    v.position.set(vx, 0.08, 0.102); v.rotation.z = vz; torsoG.add(v);
  }

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.056, 0.37, 4, 8);
  const armL = new THREE.Group(); armL.position.set(0.200, -0.06, 0); torsoG.add(armL);
  const armLMeshF = new THREE.Mesh(armGeo, mstd(C.shirt, 0.65)); armLMeshF.rotation.z = 0.10; armL.add(armLMeshF);
  const armR = new THREE.Group(); armR.position.set(-0.200, -0.06, 0); torsoG.add(armR);
  const armRMeshF = new THREE.Mesh(armGeo, mstd(C.shirt, 0.65)); armRMeshF.rotation.z = -0.10; armR.add(armRMeshF);

  // Hands
  const hG = new THREE.SphereGeometry(0.058, 8, 6);
  const hL = new THREE.Mesh(hG, mstd(C.skin)); hL.position.set(0.04, -0.24, 0); armL.add(hL);
  const hR = hL.clone(); hR.position.set(-0.04, -0.24, 0); armR.add(hR);

  // Neck
  const neckF = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.070, 0.11, 8), mstd(C.skin));
  neckF.position.set(0, 0.28, 0); torsoG.add(neckF);

  // Head
  const headG = new THREE.Group(); headG.position.set(0, 0.42, 0); torsoG.add(headG);
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 10), mstd(C.skin)));
  // Hair
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), mstd(C.hair, 0.80));
  hairTop.position.y = 0.02; headG.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.30, 4, 6), mstd(C.hair, 0.80));
  hairBack.position.set(0, -0.12, -0.10); headG.add(hairBack);
  // Ponytail band
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), mbasic(C.accent, 0.85));
  band.position.set(0, -0.18, -0.10); band.rotation.x = Math.PI / 2; headG.add(band);
  // Eyes
  const eM = mbasic(0x111111);
  for (const [ex, ez] of [[0.048, 0.138], [-0.048, 0.138]]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.020, 6, 4), eM);
    e.position.set(ex, 0.028, ez); headG.add(e);
  }

  root.position.y = -0.28;
  return root;
}

// View rotations: model faces +Z, camera at +Z looking at origin → rotation.y=0 = front
// For these procedural models, rotation.y=0 means facing camera
const VIEW_ROT = { front: 0, side: Math.PI * 0.5, back: Math.PI };
// Soldier GLB needs rotation.y=PI to face camera
const VIEW_ROT_SOLDIER = { front: Math.PI, side: Math.PI * 1.5, back: 0 };

export default function AvatarPreviewCanvas({ outfitColorKey, avatarTypeKey = "current", width = 300, height = 460 }) {
  const canvasRef = useRef(null);
  const s = useRef({});
  const outfitRef = useRef(outfitColorKey);
  outfitRef.current = outfitColorKey;
  const [activeView, setActiveView] = useState("auto");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = s.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 0.875, 3.6);
    camera.lookAt(0, 0.875, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(2, 6, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 1.2);
    fill.position.set(-3, 3, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xaaaaff, 0.8);
    rim.position.set(0, 5, -5); scene.add(rim);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.18, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), glowMat);
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; scene.add(glow);
    state.glowMat = glowMat;

    state.yaw = 0;
    state.autoRotate = true;
    state.model = null;
    state.mixer = null;
    state.isSoldier = avatarTypeKey === "current";
    state.viewRots = state.isSoldier ? VIEW_ROT_SOLDIER : VIEW_ROT;
    state.baseRot = state.isSoldier ? Math.PI : 0;

    if (avatarTypeKey === "test-mixamo-female") {
      const model = buildFemale();
      scene.add(model);
      state.model = model;
    } else if (avatarTypeKey === "test-mixamo") {
      const model = buildMale();
      scene.add(model);
      state.model = model;
    } else {
      // Soldier GLB
      loadGLTF().then((gltf) => {
        const model = gltf.scene.clone(true);
        model.rotation.y = Math.PI;
        model.traverse((child) => {
          if (!child.isMesh) return;
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => { if (m?.color && !m.userData._origColor) m.userData._origColor = m.color.clone(); });
        });
        scene.add(model);
        state.model = model;
        applyOutfitTint(model, outfitRef.current);
        if (gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(model);
          const clip = gltf.animations.find(a => a.name.toLowerCase().includes("idle")) || gltf.animations[0];
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.setEffectiveTimeScale(0.75).setEffectiveWeight(1).play();
          state.mixer = mixer;
        }
      }).catch(() => {
        const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0x4466aa }));
        cap.position.y = 0.85; scene.add(cap); state.model = cap;
      });
    }

    state.lastTime = performance.now() * 0.001;
    const animate = () => {
      state.animId = requestAnimationFrame(animate);
      const now = performance.now() * 0.001;
      const dt = Math.min(now - state.lastTime, 0.1);
      state.lastTime = now;
      if (state.mixer) state.mixer.update(dt);

      if (state.model) {
        if (state.autoRotate) {
          state.yaw += dt * 0.25;
          state.model.rotation.y = state.baseRot + state.yaw;
        } else if (state.targetRot !== undefined) {
          // Smooth lerp to target
          const diff = state.targetRot - state.model.rotation.y;
          state.model.rotation.y += diff * Math.min(1, dt * 8);
        }
      }

      if (state.glowMat) {
        const outfit = OUTFIT_COLORS.find(c => c.key === outfitRef.current);
        const col = outfit?.hex === "#080A0F" ? "#00D4F0" : (outfit?.hex || "#4488ff");
        state.glowMat.color.set(col);
        state.glowMat.opacity = 0.12 + Math.sin(now * 1.4) * 0.05;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(state.animId);
      clearTimeout(state.viewTimer);
      renderer.dispose();
    };
  }, [avatarTypeKey, width, height]); // re-init when avatar type changes

  // Re-tint on color change (soldier only)
  useEffect(() => {
    if (s.current.model && s.current.isSoldier) applyOutfitTint(s.current.model, outfitColorKey);
  }, [outfitColorKey]);

  const setView = useCallback((viewName) => {
    const state = s.current;
    state.autoRotate = false;
    clearTimeout(state.viewTimer);
    setActiveView(viewName);
    state.targetRot = (state.viewRots || VIEW_ROT_SOLDIER)[viewName] ?? state.baseRot ?? Math.PI;
    state.viewTimer = setTimeout(() => { state.autoRotate = true; setActiveView("auto"); }, 10000);
  }, []);

  const btnBase = { padding: "5px 16px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.15s", userSelect: "none", border: "none" };
  const btnActive = { ...btnBase, background: "rgba(155,126,255,0.28)", border: "1px solid rgba(155,126,255,0.8)", color: "#c4aaff" };
  const btnIdle   = { ...btnBase, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div style={{ width: "100%", maxWidth: width, height, borderRadius: 20, overflow: "hidden", background: "linear-gradient(180deg, #0d0a1e 0%, #060610 100%)", border: "1px solid rgba(155,126,255,0.18)", boxShadow: "0 0 40px rgba(155,126,255,0.07)" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>
      <div className="flex items-center gap-2">
        {["front","side","back"].map(v => (
          <button key={v} style={activeView === v ? btnActive : btnIdle} onClick={() => setView(v)}>
            {v.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}