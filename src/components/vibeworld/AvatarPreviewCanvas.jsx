/**
 * AvatarPreviewCanvas — renders the actual Soldier.glb (same model used in-world)
 * inside an isolated Three.js scene for the customization UI.
 *
 * Usage:
 *   <AvatarPreviewCanvas outfitColorKey="electric-blue" width={200} height={300} />
 */
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OUTFIT_COLORS } from "./AvatarSetup";
import { RotateCcw, RotateCw, Loader2 } from "lucide-react";

const GLB_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";

// Shared cache — won't conflict with in-world model because we always .clone() for preview
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
  const outfit = OUTFIT_COLORS.find(c => c.key === outfitColorKey);
  if (!outfit || !model) return;
  const tint = new THREE.Color(outfit.accent);
  model.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m?.color) return;
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      m.color.copy(m.userData._origColor).multiply(tint);
    });
  });
}

export default function AvatarPreviewCanvas({ outfitColorKey, width = 200, height = 300 }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const outfitRef = useRef(outfitColorKey);
  outfitRef.current = outfitColorKey;

  // Init scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = sceneRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    s.scene = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    // Position camera to see full body: model is ~1.8m tall, feet at y=0, head at ~1.8
    camera.position.set(0, 0.9, 3.6);
    camera.lookAt(0, 0.9, 0);
    s.camera = camera;

    // Studio lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.9);
    fill.position.set(-3, 2, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xaa88ff, 0.6);
    rim.position.set(0, 3, -4);
    scene.add(rim);

    // Floor glow
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.22, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.005;
    scene.add(glow);
    s.glowMat = glowMat;

    s.yaw = 0;
    s.model = null;
    s.mixer = null;

    loadGLTF().then((gltf) => {
      // Clone so preview never interferes with in-world model
      const model = gltf.scene.clone(true);
      model.name = "previewModel";
      model.rotation.y = Math.PI; // face +Z = face camera
      model.position.set(0, 0, 0);

      // Cache original colors before tinting
      model.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => { if (m?.color) m.userData._origColor = m.color.clone(); });
      });

      scene.add(model);
      s.model = model;

      // Apply current outfit color
      applyOutfitTint(model, outfitRef.current);

      // Idle animation
      if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        const idleClip = gltf.animations.find(a => a.name.toLowerCase().includes("idle")) || gltf.animations[0];
        const action = mixer.clipAction(idleClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
        s.mixer = mixer;
      }

      s.loaded = true;
    }).catch(() => {
      // Fallback capsule if GLB fails
      const cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.2, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4466aa })
      );
      cap.position.y = 0.85;
      scene.add(cap);
      s.model = cap;
      s.loaded = true;
    });

    // Slow auto-rotate
    s.lastTime = performance.now() * 0.001;
    const animate = () => {
      s.animId = requestAnimationFrame(animate);
      const now = performance.now() * 0.001;
      const dt = Math.min(now - s.lastTime, 0.1);
      s.lastTime = now;

      if (s.mixer) s.mixer.update(dt);

      // Gentle auto-rotate (pause when manually rotated via buttons — managed by yawLocked)
      if (!s.yawLocked && s.model) {
        s.yaw += dt * 0.35;
        s.model.rotation.y = Math.PI + s.yaw;
      }

      // Update glow color each frame
      if (s.glowMat) {
        const outfit = OUTFIT_COLORS.find(c => c.key === outfitRef.current);
        if (outfit) s.glowMat.color.set(outfit.accent);
        s.glowMat.opacity = 0.18 + Math.sin(now * 1.5) * 0.06;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(s.animId);
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-tint whenever outfitColorKey changes
  useEffect(() => {
    const s = sceneRef.current;
    if (s.model) applyOutfitTint(s.model, outfitColorKey);
  }, [outfitColorKey]);

  const handleRotate = (delta) => {
    const s = sceneRef.current;
    s.yaw = (s.yaw || 0) + delta;
    s.yawLocked = true;
    if (s.model) s.model.rotation.y = Math.PI + s.yaw;
    // Resume auto-rotate after 4s of no interaction
    clearTimeout(s.lockTimer);
    s.lockTimer = setTimeout(() => { s.yawLocked = false; }, 4000);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Canvas box */}
      <div
        style={{
          width, height,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(180deg, #0d0820 0%, #050510 100%)",
          border: "1px solid rgba(155,126,255,0.22)",
          boxShadow: "0 0 40px rgba(155,126,255,0.1)",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        {/* Loading overlay — hidden once WebGL renders (canvas will show content) */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none"
          style={{ background: "rgba(5,5,16,0.7)", opacity: 0, transition: "opacity 0.5s" }}
          ref={(el) => {
            // Fade out after 1.5s
            if (el) setTimeout(() => { if (el) el.style.opacity = "0"; }, 1500);
          }}
        >
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#9B7EFF" }} />
          <span className="text-[9px] text-white/40 font-medium tracking-wider">Loading avatar...</span>
        </div>
      </div>

      {/* Rotate buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleRotate(-0.5)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <RotateCcw className="w-3.5 h-3.5 text-white/50" />
        </button>
        <span className="text-[9px] text-white/20 font-medium tracking-wider">ROTATE</span>
        <button
          onClick={() => handleRotate(0.5)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <RotateCw className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>
      <p className="text-[9px] text-white/20 text-center">Preview updates instantly as you choose.</p>
    </div>
  );
}