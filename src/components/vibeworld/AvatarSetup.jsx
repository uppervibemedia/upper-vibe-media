import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UserCircle, Palette } from "lucide-react";
import { base44 } from "@/api/base44Client";
import * as THREE from "three";
import { createAvatar } from "@/components/vibeworld/AvatarModel";

const AVATAR_TYPES = [
  { key: "masculine",  label: "Masculine",  emoji: "♂️", color: "#0080B8", desc: "Athletic build" },
  { key: "feminine",   label: "Feminine",   emoji: "♀️", color: "#E040FB", desc: "Styled curves" },
  { key: "nonbinary",  label: "Non-Binary", emoji: "⚧️", color: "#A078FF", desc: "Balanced style" },
  { key: "neutral",    label: "Neutral",    emoji: "😊", color: "#00D4F0", desc: "Clean & classic" },
];

const SKIN_TONES = [
  { key: "light",        label: "Light",      hex: "#FDEBD3" },
  { key: "medium-light", label: "Med-Light",  hex: "#F3C9A1" },
  { key: "medium",       label: "Medium",     hex: "#C8864A" },
  { key: "medium-dark",  label: "Med-Dark",   hex: "#B07D5A" },
  { key: "dark",         label: "Dark",       hex: "#7B4A3A" },
  { key: "deep",         label: "Deep",       hex: "#4A2C2A" },
];

// ── 3-D Avatar Preview using Three.js ─────────────────────────
function AvatarPreview3D({ avatarType, skinTone }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const avatarRef = useRef(null);
  const rafRef = useRef(null);
  const initRef = useRef(false);

  // Rebuild avatar whenever type/tone changes
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Dispose old renderer if re-running
    if (rendererRef.current) {
      cancelAnimationFrame(rafRef.current);
      rendererRef.current.dispose();
      if (sceneRef.current) {
        sceneRef.current.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      mount.innerHTML = "";
    }

    const W = 160, H = 280;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Lights
    const amb = new THREE.AmbientLight(0x7070CC, 1.2);
    scene.add(amb);

    const key = new THREE.DirectionalLight(0xCCDDFF, 1.8);
    key.position.set(2, 4, 3);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xC43BFF, 0.6);
    fill.position.set(-2, 2, -1);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x00D4F0, 0.8);
    rim.position.set(0, 1, -3);
    scene.add(rim);

    // Camera — framed on avatar from front-right slightly elevated
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 20);
    camera.position.set(0.4, 0.9, 2.1);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // Create avatar — spawns at SPAWN position, we'll re-center
    const avatar = createAvatar(scene, { avatarType, skinTone });
    // Re-center to origin for preview
    avatar.position.set(0, 0, 0);
    avatarRef.current = avatar;

    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.016;

      // Slow rotation for preview feel
      avatar.rotation.y = Math.sin(t * 0.4) * 0.5 - 0.3;

      // Gentle idle breathing
      const torso = avatar.getObjectByName("torso");
      if (torso) {
        torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
        torso.rotation.z = Math.sin(t * 0.5) * 0.018;
      }

      const lSh = avatar.getObjectByName("leftShoulder");
      const rSh = avatar.getObjectByName("rightShoulder");
      const sway = Math.sin(t * 0.8) * 0.04;
      if (lSh) lSh.rotation.x = -0.12 + sway;
      if (rSh) rSh.rotation.x = -0.12 - sway;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      mount.innerHTML = "";
    };
  }, [avatarType, skinTone]);

  return (
    <div
      ref={mountRef}
      style={{
        width: 160,
        height: 280,
        borderRadius: 16,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(155,126,255,0.08) 0%, rgba(0,212,240,0.05) 100%)",
        border: "1px solid rgba(155,126,255,0.20)",
        boxShadow: "0 0 40px rgba(155,126,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    />
  );
}

export default function AvatarSetup({ onComplete, existingType, existingTone }) {
  const [avatarType, setAvatarType] = useState(existingType || "neutral");
  const [skinTone, setSkinTone] = useState(existingTone || "medium");
  const [saving, setSaving] = useState(false);
  const [typeSelected, setTypeSelected] = useState(!!existingType);
  const [toneSelected, setToneSelected] = useState(!!existingTone);
  const hasSelection = !!(existingType && existingTone) || (typeSelected && toneSelected);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ avatar_type: avatarType, skin_tone: skinTone });
      onComplete({ avatarType, skinTone });
    } catch {
      onComplete({ avatarType, skinTone });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 overflow-y-auto"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-120px] left-[10%] w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle,#9B7EFF,transparent 70%)", opacity: 0.1 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-5 py-6"
      >
        {/* Step badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "#9B7EFF" }} />
          <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
            Customize Avatar
          </span>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white mb-1">
            Your Vibe World Avatar
          </h2>
          <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
            Choose your look. This is how others will see you in Upper Vibe City.
          </p>
        </div>

        {/* ── Live 3D Preview ─────────────────────────────── */}
        <AvatarPreview3D avatarType={avatarType} skinTone={skinTone} />

        {/* ── Body Type ──────────────────────────────────── */}
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2 px-1">
            <UserCircle className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Body Type</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AVATAR_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => { setAvatarType(type.key); setTypeSelected(true); }}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: avatarType === type.key ? `${type.color}14` : "rgba(255,255,255,0.04)",
                  border: avatarType === type.key ? `2px solid ${type.color}` : "1px solid rgba(255,255,255,0.08)",
                  minHeight: 58,
                }}
              >
                <span className="text-lg flex-shrink-0">{type.emoji}</span>
                <div className="min-w-0 text-left">
                  <span className="text-xs font-bold text-white block">{type.label}</span>
                  <span className="text-[9px] text-white/25 block">{type.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Skin Tone ──────────────────────────────────── */}
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Palette className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Skin Tone</span>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.key}
                onClick={() => { setSkinTone(tone.key); setToneSelected(true); }}
                className="w-12 h-12 rounded-full transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                style={{
                  background: tone.hex,
                  border: skinTone === tone.key ? "3px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                  boxShadow: skinTone === tone.key ? `0 0 16px ${tone.hex}66` : "none",
                }}
                title={tone.label}
              />
            ))}
          </div>
        </div>

        {!hasSelection && (
          <p className="text-[10px] text-amber-400/60 font-medium">Choose a body type and skin tone to continue</p>
        )}

        <button
          onClick={handleContinue}
          disabled={saving || !hasSelection}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
            color: "#fff",
            boxShadow: "0 0 30px rgba(155,126,255,0.35)",
            minHeight: 50,
            width: "100%",
            maxWidth: "280px",
          }}
        >
          {saving ? "Saving..." : "Continue"}
        </button>

        <p className="text-[10px] text-white/20 max-w-xs">
          More outfits, hairstyles, and accessories coming to the Vibe Shop.
        </p>
      </motion.div>
    </div>
  );
}