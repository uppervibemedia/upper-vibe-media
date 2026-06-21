/**
 * AvatarPreviewCanvas — renders the actual Soldier.glb in an isolated Three.js scene.
 * Fixes: idle pose (no T-pose), correct hex-based tinting, larger framing, live updates.
 */
import React, { useRef, useEffect } from "react";
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

// Apply outfit color using the hex value directly — not accent (which caused wrong colors)
// Only tints meshes that are NOT skin/face (identified by their original base color lightness)
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
      // Restore original color first
      if (!m.userData._origColor) {
        m.userData._origColor = m.color.clone();
      }
      const orig = m.userData._origColor;
      // Skip skin-toned materials (warm mid-range colors — face/hands/neck)
      // Skin colors have R > B and R > 0.4 and not very dark
      const r = orig.r, g = orig.g, b = orig.b;
      const isSkinLike = (r > 0.35) && (r > b * 1.3) && (g > b * 0.8) && (r < 0.95) && (b < 0.6);
      if (isSkinLike) {
        m.color.copy(orig); // restore, don't tint
        return;
      }
      // Apply outfit color directly
      m.color.copy(targetColor);
    });
  });
}

export default function AvatarPreviewCanvas({ outfitColorKey, width = 260, height = 400 }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const outfitRef = useRef(outfitColorKey);
  outfitRef.current = outfitColorKey;

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

    // Camera framing: Soldier.glb is ~1.8m tall, feet at y=0, head at ~1.75
    // FOV 38 + distance 3.2 frames the full body with head room
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0.88, 3.2);
    camera.lookAt(0, 0.88, 0);
    s.camera = camera;

    // Strong studio lighting so outfit colors read clearly
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(2, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbbccff, 1.1);
    fill.position.set(-3, 3, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xaaaaff, 0.7);
    rim.position.set(0, 4, -4);
    scene.add(rim);

    // Floor glow disc
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.2, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.002;
    scene.add(glow);
    s.glowMat = glowMat;

    s.yaw = 0;
    s.yawLocked = false;
    s.model = null;
    s.mixer = null;
    s.loaded = false;

    loadGLTF().then((gltf) => {
      const model = gltf.scene.clone(true);
      model.name = "previewModel";
      model.rotation.y = Math.PI; // face camera
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      // Cache original material colors before any tinting
      model.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m?.color && !m.userData._origColor) {
            m.userData._origColor = m.color.clone();
          }
        });
      });

      scene.add(model);
      s.model = model;

      // Apply current outfit immediately (no waiting for idle animation)
      applyOutfitTint(model, outfitRef.current);

      // Play idle animation so model is NOT in T-pose
      if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        // Prefer "idle", fall back to first animation
        const idleClip = gltf.animations.find(a => a.name.toLowerCase().includes("idle"))
          || gltf.animations[0];
        const action = mixer.clipAction(idleClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.setEffectiveTimeScale(0.8); // slightly slower for a calm pose
        action.setEffectiveWeight(1);
        action.play();
        s.mixer = mixer;
      }

      s.loaded = true;
    }).catch(() => {
      // Capsule fallback
      const cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.2, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4466aa })
      );
      cap.position.y = 0.85;
      scene.add(cap);
      s.model = cap;
      s.loaded = true;
    });

    s.lastTime = performance.now() * 0.001;
    const animate = () => {
      s.animId = requestAnimationFrame(animate);
      const now = performance.now() * 0.001;
      const dt = Math.min(now - s.lastTime, 0.1);
      s.lastTime = now;

      if (s.mixer) s.mixer.update(dt);

      // Gentle slow auto-rotate when not manually rotated
      if (!s.yawLocked && s.model) {
        s.yaw += dt * 0.28;
        s.model.rotation.y = Math.PI + s.yaw;
      }

      // Pulse glow color to match current outfit
      if (s.glowMat) {
        const outfit = OUTFIT_COLORS.find(c => c.key === outfitRef.current);
        if (outfit) s.glowMat.color.set(outfit.hex === "#05070D" || outfit.hex === "#080A12" ? "#00D4F0" : outfit.hex);
        s.glowMat.opacity = 0.14 + Math.sin(now * 1.4) * 0.05;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(s.animId);
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live re-tint on every outfit change
  useEffect(() => {
    const s = sceneRef.current;
    if (s.model) applyOutfitTint(s.model, outfitColorKey);
  }, [outfitColorKey]);

  const handleRotate = (delta) => {
    const s = sceneRef.current;
    s.yaw = (s.yaw || 0) + delta;
    s.yawLocked = true;
    if (s.model) s.model.rotation.y = Math.PI + s.yaw;
    clearTimeout(s.lockTimer);
    s.lockTimer = setTimeout(() => { s.yawLocked = false; }, 5000);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          width, height,
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(180deg, #0e0a1e 0%, #07060f 100%)",
          border: "1px solid rgba(155,126,255,0.2)",
          boxShadow: "0 0 50px rgba(155,126,255,0.08), inset 0 0 30px rgba(0,0,0,0.5)",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      {/* Rotate controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleRotate(-0.55)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <RotateCcw className="w-3.5 h-3.5 text-white/50" />
        </button>
        <span className="text-[9px] text-white/20 font-medium tracking-wider">ROTATE</span>
        <button
          onClick={() => handleRotate(0.55)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <RotateCw className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>
    </div>
  );
}