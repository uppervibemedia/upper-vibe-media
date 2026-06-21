/**
 * AvatarTestPlatform — DEV ONLY clean isolated stage for avatar inspection.
 * Full-suit avatar + color customizer panel.
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { createAvatar } from "./AvatarModel";

// ── Dev flag — set to false to return to normal world ────────────────────────
export const DEV_AVATAR_TEST_MODE = true;

const PLATFORM_Y = 0;

const SKIN_OPTIONS = [
  { label: "Light",        value: "light" },
  { label: "Med-Light",    value: "medium-light" },
  { label: "Medium",       value: "medium" },
  { label: "Med-Dark",     value: "medium-dark" },
  { label: "Dark",         value: "dark" },
  { label: "Deep",         value: "deep" },
];

const DEFAULT_COLORS = {
  shirt:  "#1e3a7a",
  pants:  "#121220",
  accent: "#00d4f0",
  shoes:  "#0e0e1a",
};

export default function AvatarTestPlatform({ avatarConfig = {} }) {
  const mountRef      = useRef(null);
  const sceneRef      = useRef(null);
  const avatarRef     = useRef(null);
  const rendererRef   = useRef(null);
  const animIdRef     = useRef(null);

  // ── Color state ──────────────────────────────────────────────────────────
  const [colors, setColors]     = useState(DEFAULT_COLORS);
  const [skinTone, setSkinTone] = useState(avatarConfig.skinTone || "medium");
  const [style, setStyle]       = useState(avatarConfig.avatarStyle || "streetwear");

  // ── Rebuild avatar when config changes ───────────────────────────────────
  const rebuildAvatar = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (avatarRef.current) {
      scene.remove(avatarRef.current);
      avatarRef.current = null;
    }
    const tmpScene = new THREE.Scene();
    const av = createAvatar(tmpScene, {
      avatarType:     avatarConfig.avatarType || "neutral",
      skinTone,
      avatarStyle:    style,
      colorOverrides: colors,
    });
    tmpScene.remove(av);
    av.position.set(0, PLATFORM_Y, 0);
    scene.add(av);
    avatarRef.current = av;
  }, [colors, skinTone, style, avatarConfig.avatarType]);

  // ── Three.js scene setup (once) ──────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a14);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a14, 18, 32);
    sceneRef.current = scene;

    // Platform
    const platGeo = new THREE.CylinderGeometry(5, 5, 0.08, 48);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x181830, roughness: 0.4, metalness: 0.5 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.y = -0.04;
    platform.receiveShadow = true;
    scene.add(platform);

    const gridMat = new THREE.MeshBasicMaterial({ color: 0x2a2a60, transparent: true, opacity: 0.5 });
    for (let i = -4; i <= 4; i++) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(9, 0.004, 0.02), gridMat);
      h.position.set(0, 0.002, i); scene.add(h);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 9), gridMat);
      v.position.set(i, 0.002, 0); scene.add(v);
    }
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4f0, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.9, 5.1, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);

    // Lighting
    const key = new THREE.DirectionalLight(0xffeedd, 2.8);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
    key.shadow.camera.left = -4; key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;   key.shadow.camera.bottom = -1;
    scene.add(key);
    scene.add(new THREE.DirectionalLight(0xaaccff, 1.6).position.set(-4, 4, 3) && (() => { const l = new THREE.DirectionalLight(0xaaccff, 1.6); l.position.set(-4, 4, 3); return l; })());
    const rim = new THREE.DirectionalLight(0x9966ff, 1.2); rim.position.set(0, 3, -6); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x6688aa, 1.4));
    const under = new THREE.PointLight(0x4466cc, 0.8, 8); under.position.set(0, -0.5, 1.5); scene.add(under);

    // Camera
    const TARGET = new THREE.Vector3(0, 0.85, 0);
    const CAM_DIST = 3.2;
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 40);
    let orbitAngle = 0;
    let camHeight = 1.1;
    let camDist = CAM_DIST;

    // Mouse/touch orbit
    let isDragging = false, lastX = 0, lastY = 0;
    const onMouseDown = (e) => {
      isDragging = true;
      lastX = e.clientX ?? e.touches?.[0]?.clientX;
      lastY = e.clientY ?? e.touches?.[0]?.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      if (x === undefined) return;
      orbitAngle -= (x - lastX) * 0.012;
      camHeight = Math.min(2.8, Math.max(0.1, camHeight - (y - lastY) * 0.008));
      lastX = x; lastY = y;
    };
    const onMouseUp  = () => { isDragging = false; };
    const onWheel    = (e) => { camDist = Math.min(5.5, Math.max(1.4, camDist + e.deltaY * 0.005)); };
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("touchstart", onMouseDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchend", onMouseUp);

    // Initial avatar
    const tmpScene = new THREE.Scene();
    const av = createAvatar(tmpScene, {
      avatarType:     avatarConfig.avatarType || "neutral",
      skinTone:       avatarConfig.skinTone   || "medium",
      avatarStyle:    avatarConfig.avatarStyle || "streetwear",
      colorOverrides: DEFAULT_COLORS,
    });
    tmpScene.remove(av);
    av.position.set(0, PLATFORM_Y, 0);
    scene.add(av);
    avatarRef.current = av;

    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      if (!isDragging) orbitAngle += 0.004;
      camera.position.set(Math.sin(orbitAngle) * camDist, camHeight, Math.cos(orbitAngle) * camDist);
      TARGET.y = Math.max(0.3, camHeight * 0.75);
      camera.lookAt(TARGET);

      const av = avatarRef.current;
      if (av) {
        const t = performance.now() * 0.001;
        const torso = av.getObjectByName("torso");
        if (torso) { torso.scale.y = 1 + Math.sin(t * 1.8) * 0.012; torso.rotation.z = Math.sin(t * 0.5) * 0.018; }
        const ls = av.getObjectByName("leftShoulder");
        const rs = av.getObjectByName("rightShoulder");
        if (ls) ls.rotation.z = 0.12 + Math.sin(t * 0.8) * 0.03;
        if (rs) rs.rotation.z = -0.12 - Math.sin(t * 0.8) * 0.03;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []); // only runs once

  // Rebuild avatar whenever colors/skin/style change
  useEffect(() => {
    rebuildAvatar();
  }, [rebuildAvatar]);

  const setColor = (key, val) => setColors(c => ({ ...c, [key]: val }));

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#0a0a14" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: "rgba(0,212,240,0.08)", borderBottom: "1px solid rgba(0,212,240,0.2)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 text-xs font-mono font-bold tracking-widest">DEV · AVATAR TEST PLATFORM</span>
        </div>
        <span className="text-white/30 text-[10px] font-mono">drag to rotate/tilt · scroll to zoom</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div ref={mountRef} className="flex-1" style={{ cursor: "grab" }} />

        {/* Color Picker Panel */}
        <div className="w-56 shrink-0 overflow-y-auto flex flex-col gap-3 p-3"
          style={{ background: "rgba(10,10,28,0.95)", borderLeft: "1px solid rgba(0,212,240,0.15)" }}>
          <p className="text-[10px] font-mono font-bold text-cyan-400/70 tracking-widest uppercase">Customize</p>

          {/* Suit Colors */}
          {[
            { key: "shirt",  label: "Jacket / Sleeves" },
            { key: "pants",  label: "Pants" },
            { key: "shoes",  label: "Shoes" },
            { key: "accent", label: "Neon Accent" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-mono text-white/50 flex-1">{label}</label>
              <div className="relative w-8 h-6 rounded overflow-hidden cursor-pointer"
                style={{ border: "1px solid rgba(255,255,255,0.2)", background: colors[key] }}>
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>
          ))}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px" }}>
            <p className="text-[10px] font-mono text-white/40 mb-1.5 uppercase tracking-wider">Skin Tone</p>
            <div className="grid grid-cols-3 gap-1">
              {SKIN_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setSkinTone(o.value)}
                  className="text-[8px] font-mono py-1 rounded transition-all"
                  style={{
                    background: skinTone === o.value ? "rgba(0,212,240,0.25)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${skinTone === o.value ? "rgba(0,212,240,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: skinTone === o.value ? "#00d4f0" : "rgba(255,255,255,0.45)",
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px" }}>
            <p className="text-[10px] font-mono text-white/40 mb-1.5 uppercase tracking-wider">Style</p>
            <div className="flex gap-1">
              {["streetwear", "cosmic"].map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  className="flex-1 text-[9px] font-mono py-1 rounded capitalize transition-all"
                  style={{
                    background: style === s ? "rgba(0,212,240,0.25)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${style === s ? "rgba(0,212,240,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: style === s ? "#00d4f0" : "rgba(255,255,255,0.45)",
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button onClick={() => { setColors(DEFAULT_COLORS); setSkinTone("medium"); setStyle("streetwear"); }}
            className="text-[9px] font-mono py-1.5 rounded transition-all hover:brightness-110"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", marginTop: "auto" }}>
            Reset to Default
          </button>

          {/* Checklist */}
          <div className="text-[9px] font-mono space-y-0.5 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(0,212,240,0.5)" }}>
            <div>✓ full suit — no exposed skin</div>
            <div>✓ separate jacket + pants</div>
            <div>✓ gloved hands</div>
            <div>✓ neon accent wrist cuffs</div>
            <div>✓ human proportions</div>
          </div>
        </div>
      </div>
    </div>
  );
}