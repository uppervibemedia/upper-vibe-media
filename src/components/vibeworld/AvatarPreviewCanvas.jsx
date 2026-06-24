/**
 * AvatarPreviewCanvas — full-body preview with Front/Side/Back view controls.
 * Renders the correct avatar based on avatarTypeKey:
 *   "current"              → Soldier GLB
 *   "test-mixamo"          → Male Casual (procedural)
 *   "test-mixamo-female"   → Female Casual (procedural)
 *
 * For procedural avatars:
 *  - outfitColorKey changes ONLY clothes (shirt, pants, shoes)
 *  - skinColorKey changes skin, neck, hands, head
 *  - hair/accent colors remain fixed per gender
 */
import React, { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OUTFIT_COLORS } from "./AvatarSetup";

// ── Skin tone palette ──────────────────────────────────────────────────────────
export const SKIN_TONES = [
  { key: "brown",       hex: 0xC68642, label: "Brown" },
  { key: "light",       hex: 0xF5CBA7, label: "Light" },
  { key: "tan",         hex: 0xD4956A, label: "Tan" },
  { key: "deep-brown",  hex: 0x8D5524, label: "Deep Brown" },
  { key: "dark",        hex: 0x5C3317, label: "Dark" },
];

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

// Soldier: apply outfit tint (skin-skip heuristic)
function applyOutfitTintSoldier(model, outfitColorKey) {
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

// ── Shared mat helpers ─────────────────────────────────────────────────────────
function mstd(hex, rough = 0.65, metal = 0.04) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });
}
function mbasic(hex, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, depthWrite: false });
}

// Tags a mesh so we can find it later for re-tinting
function tagMesh(mesh, tag) {
  mesh.userData.customTag = tag;
  return mesh;
}

// ── Build Male Casual procedural model ────────────────────────────────────────
// Same hip-pivot architecture as female to prevent leg/hip clipping.
function buildMale(skinHex, outfitHex) {
  const root = new THREE.Group();
  const HAIR = 0x1A0800;
  const ACCENT = 0xE63946;

  const clothesMat = mstd(outfitHex, 0.75);
  const pantsMat   = mstd(0x2B2D42);
  const skinMat    = mstd(skinHex);

  // Hip block
  const hipBlock = tagMesh(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.20, 0.22), pantsMat), "pants");
  hipBlock.position.set(0, 0.66, 0); root.add(hipBlock);

  // Legs — pivot groups
  const legGeo = new THREE.CapsuleGeometry(0.088, 0.46, 4, 8);
  const legL = new THREE.Group(); legL.position.set(0.108, 0.66, 0); root.add(legL);
  const legLMesh = tagMesh(new THREE.Mesh(legGeo, pantsMat), "pants"); legLMesh.position.y = -0.30; legL.add(legLMesh);
  const legR = new THREE.Group(); legR.position.set(-0.108, 0.66, 0); root.add(legR);
  const legRMesh = tagMesh(new THREE.Mesh(legGeo, pantsMat), "pants"); legRMesh.position.y = -0.30; legR.add(legRMesh);

  // Shoes — parented to leg pivots
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.10, 0.20);
  const bootL = tagMesh(new THREE.Mesh(shoeGeo, clothesMat), "suit"); bootL.position.set(0, -0.62, 0.018); legL.add(bootL);
  const bootR = tagMesh(new THREE.Mesh(shoeGeo, clothesMat), "suit"); bootR.position.set(0, -0.62, 0.018); legR.add(bootR);
  for (const lg of [legL, legR]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.014, 0.14), mbasic(ACCENT, 0.55));
    s.position.set(0, -0.668, 0.012); lg.add(s);
  }

  // Torso
  const torsoG = new THREE.Group(); torsoG.position.set(0, 0.82, 0); root.add(torsoG);
  torsoG.add(tagMesh(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.24), clothesMat), "suit"));
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.012), mbasic(ACCENT, 0.45));
  pocket.position.set(0, -0.14, 0.122); torsoG.add(pocket);

  // Arms — pivot at shoulder, straight down
  const armGeo = new THREE.CapsuleGeometry(0.068, 0.40, 4, 8);
  const armL = new THREE.Group(); armL.position.set(0.245, -0.02, 0); torsoG.add(armL);
  const armLMesh = tagMesh(new THREE.Mesh(armGeo, clothesMat), "suit"); armLMesh.rotation.z = 0.10; armL.add(armLMesh);
  const armR = new THREE.Group(); armR.position.set(-0.245, -0.02, 0); torsoG.add(armR);
  const armRMesh = tagMesh(new THREE.Mesh(armGeo, clothesMat), "suit"); armRMesh.rotation.z = -0.10; armR.add(armRMesh);

  // Hands — straight down, no lateral offset
  const hG = new THREE.SphereGeometry(0.068, 8, 6);
  const hL = tagMesh(new THREE.Mesh(hG, skinMat), "skin"); hL.position.set(0, -0.26, 0); armL.add(hL);
  const hR = tagMesh(new THREE.Mesh(hG, skinMat), "skin"); hR.position.set(0, -0.26, 0); armR.add(hR);

  // Neck
  const neckM = tagMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.086, 0.13, 8), skinMat), "skin");
  neckM.position.set(0, 0.30, 0); torsoG.add(neckM);

  // Head
  const headG = new THREE.Group(); headG.position.set(0, 0.44, 0); torsoG.add(headG);
  headG.add(tagMesh(new THREE.Mesh(new THREE.SphereGeometry(0.160, 12, 10), skinMat), "skin"));
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.44), mstd(HAIR, 0.88));
  hair.position.y = 0.055; headG.add(hair);
  // Sclera + pupil eyes — properly placed mid-face
  for (const ex of [0.040, -0.040]) {
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 6), mbasic(0xF2EDE4));
    sc.position.set(ex, -0.008, 0.148); headG.add(sc);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mbasic(0x111111));
    pu.position.set(ex, -0.008, 0.168); headG.add(pu);
  }
  const mouthM = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.012, 0.010), mbasic(0x5C2A1A));
  mouthM.position.set(0, -0.072, 0.152); headG.add(mouthM);

  root.position.y = -0.28;
  return { root, clothesMat, skinMat };
}

// ── Build Female Casual procedural model ──────────────────────────────────────
function buildFemale(skinHex, outfitHex) {
  const root = new THREE.Group();
  const skin = skinHex;
  const clothes = outfitHex;
  const HAIR = 0x3D0C02;
  const ACCENT = 0xF72585;

  const clothesMat = mstd(clothes, 0.65);
  const skinMat    = mstd(skin);

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.072, 0.46, 4, 8);
  const legL = tagMesh(new THREE.Mesh(legGeo, clothesMat), "suit"); legL.position.set(0.090, 0.62, 0); root.add(legL);
  const legR = legL.clone(); legR.position.set(-0.090, 0.62, 0); root.add(legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.10, 0.10, 0.185);
  const bootL = tagMesh(new THREE.Mesh(shoeGeo, clothesMat), "suit"); bootL.position.set(0.090, 0.325, 0.015); root.add(bootL);
  const bootR = bootL.clone(); bootR.position.set(-0.090, 0.325, 0.015); root.add(bootR);
  for (const bx of [0.090, -0.090]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.012, 0.13), mbasic(0xFF9EF5, 0.60));
    s.position.set(bx, 0.278, 0.010); root.add(s);
  }

  // Torso
  const torsoG = new THREE.Group(); torsoG.position.set(0, 1.13, 0); root.add(torsoG);
  torsoG.add(tagMesh(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.40, 0.20), clothesMat), "suit"));
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.025, 0.21), mbasic(ACCENT, 0.70));
  belt.position.set(0, -0.13, 0); torsoG.add(belt);
  for (const [vx, vz] of [[0.038, 0.28], [-0.038, -0.28]]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.20, 0.011), mbasic(ACCENT, 0.70));
    v.position.set(vx, 0.08, 0.102); v.rotation.z = vz; torsoG.add(v);
  }

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.056, 0.37, 4, 8);
  const armL = new THREE.Group(); armL.position.set(0.200, -0.06, 0); torsoG.add(armL);
  const armLMeshF = tagMesh(new THREE.Mesh(armGeo, clothesMat), "suit"); armLMeshF.rotation.z = 0.10; armL.add(armLMeshF);
  const armR = new THREE.Group(); armR.position.set(-0.200, -0.06, 0); torsoG.add(armR);
  const armRMeshF = tagMesh(new THREE.Mesh(armGeo, clothesMat), "suit"); armRMeshF.rotation.z = -0.10; armR.add(armRMeshF);

  // Hands (skin)
  const hG = new THREE.SphereGeometry(0.058, 8, 6);
  const hL = tagMesh(new THREE.Mesh(hG, skinMat), "skin"); hL.position.set(0.04, -0.24, 0); armL.add(hL);
  const hR = hL.clone(); armR.add(hR);

  // Neck
  const neckF = tagMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.070, 0.11, 8), skinMat), "skin");
  neckF.position.set(0, 0.28, 0); torsoG.add(neckF);

  // Head
  const headG = new THREE.Group(); headG.position.set(0, 0.42, 0); torsoG.add(headG);
  headG.add(tagMesh(new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 10), skinMat), "skin"));
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), mstd(HAIR, 0.80));
  hairTop.position.y = 0.045; headG.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.30, 4, 6), mstd(HAIR, 0.80));
  hairBack.position.set(0, -0.12, -0.10); headG.add(hairBack);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), mbasic(ACCENT, 0.85));
  band.position.set(0, -0.18, -0.10); band.rotation.x = Math.PI / 2; headG.add(band);
  // Sclera + pupil eyes — properly placed mid-face
  for (const ex of [0.038, -0.038]) {
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mbasic(0xF2EDE4));
    sc.position.set(ex, -0.006, 0.134); headG.add(sc);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), mbasic(0x111111));
    pu.position.set(ex, -0.006, 0.152); headG.add(pu);
  }
  const fMouthPrev = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.011, 0.009), mbasic(0x7A3020));
  fMouthPrev.position.set(0, -0.068, 0.140); headG.add(fMouthPrev);

  root.position.y = -0.28;
  return { root, clothesMat, skinMat };
}

// ── Re-tint helpers ────────────────────────────────────────────────────────────
function retintClothes(model, outfitHex) {
  if (!model) return;
  model.traverse((child) => {
    if (child.isMesh && child.userData.customTag === "suit") {
      child.material.color.setHex(outfitHex);
    }
  });
}
function retintSkin(model, skinHex) {
  if (!model) return;
  model.traverse((child) => {
    if (child.isMesh && child.userData.customTag === "skin") {
      child.material.color.setHex(skinHex);
    }
  });
}

// View rotations
// Procedural models face +Z by default (eyes at +Z), so front = 0 (no rotation needed)
const VIEW_ROT = { front: 0, side: Math.PI * 0.5, back: Math.PI };
// Soldier GLB faces -Z by default, so front = PI to flip it toward camera
const VIEW_ROT_SOLDIER = { front: Math.PI, side: Math.PI * 1.5, back: 0 };

export default function AvatarPreviewCanvas({
  outfitColorKey,
  skinColorKey = "brown",
  avatarTypeKey = "current",
  width = 300,
  height = 460,
}) {
  const canvasRef = useRef(null);
  const s = useRef({});
  const outfitRef = useRef(outfitColorKey);
  const skinRef   = useRef(skinColorKey);
  outfitRef.current = outfitColorKey;
  skinRef.current   = skinColorKey;
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
    // Soldier faces -Z so needs PI offset; procedural faces +Z so starts at 0
    state.baseRot = state.isSoldier ? Math.PI : 0;
    // Reset view when avatar type changes
    setActiveView("auto");

    const skinTone = SKIN_TONES.find(t => t.key === skinColorKey) || SKIN_TONES[0];
    const outfit   = OUTFIT_COLORS.find(c => c.key === outfitColorKey);
    const outfitHex = outfit ? parseInt(outfit.hex.replace("#", ""), 16) : 0x1D3557;

    if (avatarTypeKey === "test-mixamo-female") {
      const { root } = buildFemale(skinTone.hex, outfitHex);
      root.scale.set(1.16, 1.16, 1.16);
      scene.add(root);
      state.model = root;
    } else if (avatarTypeKey === "test-mixamo") {
      const { root } = buildMale(skinTone.hex, outfitHex);
      root.scale.set(1.16, 1.16, 1.16);
      scene.add(root);
      state.model = root;
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
        applyOutfitTintSoldier(model, outfitRef.current);
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
          const curr = state.model.rotation.y;
          const diff = state.targetRot - curr;
          // Snap when close enough
          if (Math.abs(diff) < 0.002) {
            state.model.rotation.y = state.targetRot;
          } else {
            state.model.rotation.y += diff * Math.min(1, dt * 8);
          }
        }
      }

      if (state.glowMat) {
        const outfit2 = OUTFIT_COLORS.find(c => c.key === outfitRef.current);
        const col = outfit2?.hex === "#080A0F" ? "#00D4F0" : (outfit2?.hex || "#4488ff");
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
  }, [avatarTypeKey, width, height]);

  // Re-tint clothes on outfit color change (procedural only)
  useEffect(() => {
    const state = s.current;
    if (!state.model) return;
    if (state.isSoldier) {
      applyOutfitTintSoldier(state.model, outfitColorKey);
    } else {
      const outfit = OUTFIT_COLORS.find(c => c.key === outfitColorKey);
      if (outfit) retintClothes(state.model, parseInt(outfit.hex.replace("#", ""), 16));
    }
  }, [outfitColorKey]);

  // Re-tint skin on skin color change (procedural only)
  useEffect(() => {
    const state = s.current;
    if (!state.model || state.isSoldier) return;
    const tone = SKIN_TONES.find(t => t.key === skinColorKey);
    if (tone) retintSkin(state.model, tone.hex);
  }, [skinColorKey]);

  const setView = useCallback((viewName) => {
    const state = s.current;
    clearTimeout(state.viewTimer);
    setActiveView(viewName);
    // Snap current rotation to a clean base before setting target,
    // so the lerp always starts from a predictable position
    if (state.autoRotate && state.model) {
      // Freeze yaw accumulation at the current rendered rotation
      state.yaw = state.model.rotation.y - state.baseRot;
    }
    state.autoRotate = false;
    const rots = state.viewRots || VIEW_ROT_SOLDIER;
    state.targetRot = rots[viewName] ?? state.baseRot ?? Math.PI;
    state.viewTimer = setTimeout(() => {
      state.autoRotate = true;
      // Re-sync yaw so auto-rotate resumes smoothly from current angle
      if (state.model) state.yaw = state.model.rotation.y - state.baseRot;
      setActiveView("auto");
    }, 10000);
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