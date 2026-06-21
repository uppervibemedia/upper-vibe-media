/**
 * AvatarPreviewCanvas — full-body avatar preview with Front / Back / Side view buttons.
 * No rotation button — replaced with instant camera angle presets.
 */
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OUTFIT_COLORS, SKIN_TONES } from "./AvatarSetup";

const GLB_URLS = {
  male:   "https://threejs.org/examples/models/gltf/Soldier.glb",
  female: "https://threejs.org/examples/models/gltf/Xbot.glb",
};

const _gltfCache = {};
const _gltfPromise = {};

function loadGLTF(gender = "male") {
  const url = GLB_URLS[gender] || GLB_URLS.male;
  if (_gltfCache[gender]) return Promise.resolve(_gltfCache[gender]);
  if (_gltfPromise[gender]) return _gltfPromise[gender];
  const loader = new GLTFLoader();
  _gltfPromise[gender] = new Promise((resolve, reject) => {
    loader.load(url, (g) => { _gltfCache[gender] = g; resolve(g); }, undefined, (e) => { delete _gltfPromise[gender]; reject(e); });
  });
  return _gltfPromise[gender];
}

// ─── Material classification (mirrors AvatarModel.jsx exactly) ────────
function classifyMaterial(meshName, matName, origColor) {
  const combined = ((meshName || "") + " " + (matName || "")).toLowerCase();

  if (/hair|eyebrow|brow|beard|facial_hair|eyelash|lash|bun|ponytail/i.test(combined)) return "hair";
  if (/\bskin\b|face|neck|hand|finger|wrist|forearm|upperarm|calf|shin|thigh|foot|toe|ear|nose|lip|mouth|chin|cheek|forehead|flesh|body_skin/i.test(combined)) return "skin";
  if (/shirt|top|jacket|pant|trouser|boot|shoe|armor|armour|cloth|outfit|suit|sleeve|collar|vest|coat|glove|belt|strap|trim|neon|accessory|accesso|pad|knee|chest|shoulder|visor|helmet|mask|cape|skirt|sock|sneaker|hoodie|shorts|uniform/i.test(combined)) return "outfit";

  const { r, g, b } = origColor;
  const brightness = (r + g + b) / 3;
  const isSkinLike = r > 0.25 && r > b * 1.20 && g > b * 0.70 && r < 0.97 && b < 0.70 && g < 0.92 && brightness > 0.22 && brightness < 0.88;
  if (isSkinLike) return "skin";

  const isNearNeutral = Math.abs(r - g) < 0.07 && Math.abs(g - b) < 0.07;
  if (brightness < 0.18 && isNearNeutral) return "hair";
  const isDarkBrown = r > g && r > b && (r - b) < 0.22 && brightness < 0.25 && r < 0.45;
  if (isDarkBrown) return "hair";

  return "outfit";
}

function applyTints(model, outfitColorKey, skinToneKey) {
  if (!model) return;
  const outfit = OUTFIT_COLORS.find(c => c.key === outfitColorKey);
  if (!outfit) return;
  const outfitColor = new THREE.Color(outfit.hex);
  const skinEntry = SKIN_TONES.find(s => s.key === skinToneKey);
  // Always provide a skin color — fall back to original if not found
  const skinColor = skinEntry ? new THREE.Color(skinEntry.hex) : null;

  model.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m?.color) return;
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      const orig = m.userData._origColor;
      const matName = m.name || "";
      const kind = classifyMaterial(child.name, matName, orig);

      if (kind === "skin") {
        m.color.copy(skinColor || orig);
      } else if (kind === "hair") {
        m.color.copy(orig); // never change hair
      } else {
        m.color.copy(outfitColor);
      }
    });
  });
}

// Camera presets: position and lookAt for each view
// Model faces +Z (rotation.y = Math.PI means chest toward +Z in world space)
const VIEWS = {
  front: { pos: [0, 0.87, 3.6],  look: [0, 0.87, 0] },
  back:  { pos: [0, 0.87, -3.6], look: [0, 0.87, 0] },
  side:  { pos: [3.6, 0.87, 0],  look: [0, 0.87, 0] },
};

export default function AvatarPreviewCanvas({ outfitColorKey, skinToneKey = "medium", gender = "male", width = 260, height = 420 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({});
  const outfitRef = useRef(outfitColorKey);
  outfitRef.current = outfitColorKey;
  const skinRef = useRef(skinToneKey);
  skinRef.current = skinToneKey;
  const genderRef = useRef(gender);
  genderRef.current = gender;
  const [activeView, setActiveView] = useState("front");

  // Apply camera view instantly when button is clicked
  const setView = (viewKey) => {
    setActiveView(viewKey);
    const s = stateRef.current;
    if (!s.camera) return;
    const v = VIEWS[viewKey];
    s.camera.position.set(...v.pos);
    s.camera.lookAt(...v.look);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    // Camera starts at front view
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
    // Back light for back view readability
    const backLight = new THREE.DirectionalLight(0xccddff, 2.0);
    backLight.position.set(0, 3, -5);
    scene.add(backLight);

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
    s.model = null;
    s.mixer = null;

    loadGLTF(genderRef.current).then((gltf) => {
      const model = gltf.scene.clone(true);
      model.name = "previewModel";
      model.rotation.y = Math.PI;
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      model.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => { if (m?.color && !m.userData._origColor) m.userData._origColor = m.color.clone(); });
      });

      scene.add(model);
      s.model = model;
      applyTints(model, outfitRef.current, skinRef.current);

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
  }, [gender]); // re-mount when gender changes

  // Live re-tint on outfit or skin change
  useEffect(() => {
    const s = stateRef.current;
    if (s.model) applyTints(s.model, outfitColorKey, skinToneKey);
  }, [outfitColorKey, skinToneKey]);

  const viewButtons = [
    { key: "front", label: "Front" },
    { key: "back",  label: "Back"  },
    { key: "side",  label: "Side"  },
  ];

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

      {/* View buttons — instant camera preset, no rotation logic */}
      <div className="flex items-center gap-1.5">
        {viewButtons.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all active:scale-95"
            style={{
              background: activeView === v.key ? "rgba(155,126,255,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${activeView === v.key ? "rgba(155,126,255,0.5)" : "rgba(255,255,255,0.1)"}`,
              color: activeView === v.key ? "#A078FF" : "rgba(255,255,255,0.45)",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}