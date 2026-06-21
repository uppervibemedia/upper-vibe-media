/**
 * AvatarPreviewCanvas — full-body avatar preview with working rotate buttons.
 * Head-to-toe framing, idle animation, live outfit tinting.
 */
import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OUTFIT_COLORS } from "./AvatarSetup";
import { RotateCcw, RotateCw } from "lucide-react";

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
      // Skip skin-like materials (warm mid tones — face/hands)
      const isSkin = orig.r > 0.35 && orig.r > orig.b * 1.3 && orig.g > orig.b * 0.8 && orig.r < 0.95 && orig.b < 0.6;
      m.color.copy(isSkin ? orig : targetColor);
    });
  });
}

export default function AvatarPreviewCanvas({ outfitColorKey, width = 260, height = 420 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({});
  const outfitRef = useRef(outfitColorKey);
  outfitRef.current = outfitColorKey;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    // Camera: Soldier.glb feet at y=0, head ~1.75m.
    // FOV 32, position at y=0.87 (midpoint), z=3.6 — frames full body head-to-toe
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 50);
    camera.position.set(0, 0.87, 3.6);
    camera.lookAt(0, 0.87, 0);

    // Studio lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(2, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbbccff, 1.2);
    fill.position.set(-3, 3, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xaaaaff, 0.8);
    rim.position.set(0, 4, -4);
    scene.add(rim);

    // Floor glow disc
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.18, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.002;
    scene.add(glow);

    s.renderer = renderer;
    s.scene = scene;
    s.camera = camera;
    s.glowMat = glowMat;
    s.yaw = 0;
    s.autoRotate = true;
    s.model = null;
    s.mixer = null;

    loadGLTF().then((gltf) => {
      const model = gltf.scene.clone(true);
      model.name = "previewModel";
      model.rotation.y = Math.PI; // face camera
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      model.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => { if (m?.color && !m.userData._origColor) m.userData._origColor = m.color.clone(); });
      });

      scene.add(model);
      s.model = model;
      applyOutfitTint(model, outfitRef.current);

      if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        const idleClip = gltf.animations.find(a => a.name.toLowerCase().includes("idle")) || gltf.animations[0];
        const action = mixer.clipAction(idleClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.setEffectiveTimeScale(0.75);
        action.setEffectiveWeight(1);
        action.play();
        s.mixer = mixer;
      }
    }).catch(() => {
      const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0x4466aa }));
      cap.position.y = 0.85;
      scene.add(cap);
      s.model = cap;
    });

    s.lastTime = performance.now() * 0.001;
    const animate = () => {
      s.animId = requestAnimationFrame(animate);
      const now = performance.now() * 0.001;
      const dt = Math.min(now - s.lastTime, 0.1);
      s.lastTime = now;

      if (s.mixer) s.mixer.update(dt);

      if (s.autoRotate && s.model) {
        s.yaw += dt * 0.3;
        s.model.rotation.y = Math.PI + s.yaw;
      }

      if (s.glowMat) {
        const outfit = OUTFIT_COLORS.find(c => c.key === outfitRef.current);
        const glowColor = outfit?.hex === "#080A0F" ? "#00D4F0" : outfit?.hex || "#4488ff";
        s.glowMat.color.set(glowColor);
        s.glowMat.opacity = 0.12 + Math.sin(now * 1.2) * 0.06;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(s.animId);
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live re-tint
  useEffect(() => {
    const s = stateRef.current;
    if (s.model) applyOutfitTint(s.model, outfitColorKey);
  }, [outfitColorKey]);

  const handleRotate = useCallback((delta) => {
    const s = stateRef.current;
    s.yaw = (s.yaw || 0) + delta;
    s.autoRotate = false; // stop auto-rotate on manual interaction
    if (s.model) s.model.rotation.y = Math.PI + s.yaw;
    // Resume auto-rotate after 6 seconds of inactivity
    clearTimeout(s.lockTimer);
    s.lockTimer = setTimeout(() => { s.autoRotate = true; }, 6000);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          width, height,
          borderRadius: 16,
          overflow: "hidden",
          background: "linear-gradient(180deg, #0e0a1e 0%, #07060f 100%)",
          border: "1px solid rgba(155,126,255,0.2)",
          boxShadow: "0 0 40px rgba(155,126,255,0.08), inset 0 0 20px rgba(0,0,0,0.4)",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      {/* Rotate controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleRotate(-0.6)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <RotateCcw className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-[9px] text-white/25 font-medium tracking-widest uppercase">Rotate</span>
        <button
          onClick={() => handleRotate(0.6)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <RotateCw className="w-4 h-4 text-white/60" />
        </button>
      </div>
    </div>
  );
}