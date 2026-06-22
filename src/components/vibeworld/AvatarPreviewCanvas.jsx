/**
 * AvatarPreviewCanvas — full-body Vibe Suit preview with Front/Side/Back view controls.
 */
import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OUTFIT_COLORS } from "./AvatarSetup";

const GLB_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";

let _gltfCache = null;
let _gltfPromise = null;

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
      const isSkinLike = r > 0.35 && r > b * 1.3 && g > b * 0.8 && r < 0.95 && b < 0.6;
      if (isSkinLike) { m.color.copy(orig); return; }
      m.color.copy(targetColor);
    });
  });
}

// Preset yaw angles for each view
const VIEW_ANGLES = { front: 0, side: Math.PI / 2, back: Math.PI };

export default function AvatarPreviewCanvas({ outfitColorKey, width = 300, height = 460 }) {
  const canvasRef = useRef(null);
  const s = useRef({});
  const outfitRef = useRef(outfitColorKey);
  outfitRef.current = outfitColorKey;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = s.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    // Camera: full-body framing. Soldier is ~1.8m, feet y=0, head y~1.75.
    // Look at mid-body (y=0.875). Distance 3.6 + FOV 36 fits head-to-toe.
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 0.875, 3.6);
    camera.lookAt(0, 0.875, 0);

    // Lighting — strong and clean so suit colors read accurately
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(2, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 1.2);
    fill.position.set(-3, 3, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xaaaaff, 0.8);
    rim.position.set(0, 5, -5);
    scene.add(rim);

    // Floor glow disc
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.18, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.002;
    scene.add(glow);
    state.glowMat = glowMat;

    // yaw = avatar Y rotation offset from "facing camera" (Math.PI)
    state.yaw = 0;
    state.autoRotate = true;
    state.model = null;
    state.mixer = null;

    loadGLTF().then((gltf) => {
      const model = gltf.scene.clone(true);
      model.name = "previewModel";
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      // Start facing camera
      model.rotation.y = Math.PI;

      model.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m?.color && !m.userData._origColor) m.userData._origColor = m.color.clone();
        });
      });

      scene.add(model);
      state.model = model;
      applyOutfitTint(model, outfitRef.current);

      if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        const idleClip = gltf.animations.find(a => a.name.toLowerCase().includes("idle")) || gltf.animations[0];
        const action = mixer.clipAction(idleClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.setEffectiveTimeScale(0.75);
        action.setEffectiveWeight(1);
        action.play();
        state.mixer = mixer;
      }
    }).catch(() => {
      const cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.2, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4466aa })
      );
      cap.position.y = 0.85;
      scene.add(cap);
      state.model = cap;
    });

    state.lastTime = performance.now() * 0.001;
    const animate = () => {
      state.animId = requestAnimationFrame(animate);
      const now = performance.now() * 0.001;
      const dt = Math.min(now - state.lastTime, 0.1);
      state.lastTime = now;
      if (state.mixer) state.mixer.update(dt);

      // Auto-rotate slowly when not locked to a view
      if (state.autoRotate && state.model) {
        state.yaw += dt * 0.25;
        state.model.rotation.y = Math.PI + state.yaw;
      }

      // Pulse glow to match suit color
      if (state.glowMat) {
        const outfit = OUTFIT_COLORS.find(c => c.key === outfitRef.current);
        const glowColor = outfit?.hex === "#080A0F" ? "#00D4F0" : (outfit?.hex || "#4488ff");
        state.glowMat.color.set(glowColor);
        state.glowMat.opacity = 0.12 + Math.sin(now * 1.4) * 0.05;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(state.animId);
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-tint on color change
  useEffect(() => {
    if (s.current.model) applyOutfitTint(s.current.model, outfitColorKey);
  }, [outfitColorKey]);

  const setView = useCallback((viewName) => {
    const state = s.current;
    if (!state.model) return;
    state.autoRotate = false;
    state.yaw = VIEW_ANGLES[viewName] ?? 0;
    state.model.rotation.y = Math.PI + state.yaw;
    // Resume auto-rotate after 8s of no interaction
    clearTimeout(state.viewTimer);
    state.viewTimer = setTimeout(() => { state.autoRotate = true; }, 8000);
  }, []);

  const btnStyle = (active) => ({
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.12em",
    cursor: "pointer",
    transition: "all 0.15s",
    background: active ? "rgba(155,126,255,0.25)" : "rgba(255,255,255,0.05)",
    border: active ? "1px solid rgba(155,126,255,0.7)" : "1px solid rgba(255,255,255,0.1)",
    color: active ? "#c4aaff" : "rgba(255,255,255,0.4)",
  });

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        style={{
          width: "100%",
          maxWidth: width,
          height,
          borderRadius: 20,
          overflow: "hidden",
          background: "linear-gradient(180deg, #0d0a1e 0%, #060610 100%)",
          border: "1px solid rgba(155,126,255,0.18)",
          boxShadow: "0 0 40px rgba(155,126,255,0.07), inset 0 0 30px rgba(0,0,0,0.5)",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      {/* View controls */}
      <div className="flex items-center gap-2">
        <button style={btnStyle(false)} onClick={() => setView("front")}>FRONT</button>
        <button style={btnStyle(false)} onClick={() => setView("side")}>SIDE</button>
        <button style={btnStyle(false)} onClick={() => setView("back")}>BACK</button>
      </div>
    </div>
  );
}