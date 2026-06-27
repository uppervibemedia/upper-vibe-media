/**
 * CityLiveFeed — Lightweight cinematic live-render of Upper Vibe City.
 *
 * Uses the SAME scene builders as the in-game Vibe World (buildPark from CityCanvas,
 * CitySkyline, FerrisWheel, CosmicSkySystem, zone animators) so the preview is
 * a true representation of the real city — not a hand-built approximation.
 *
 * Adds floating neon zone labels and flying rings on top for the cinematic tour.
 * Safe to mount on Home/Start without impacting site performance.
 */
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { buildPark } from "@/components/vibeworld/CityCanvas";
import { animateFerrisWheel } from "@/components/vibeworld/FerrisWheel";
import { animateCosmicSky } from "@/components/vibeworld/CosmicSkySystem";

const { Color, Vector3, SpriteMaterial, Sprite, CanvasTexture, SRGBColorSpace,
        Mesh, MeshBasicMaterial, PointsMaterial, Points,
        BufferGeometry, BufferAttribute,
        RingGeometry, ConeGeometry, SphereGeometry,
        Fog, LinearFilter } = THREE;

// ── Cinematic neon floating labels ────────────────────────────────────────
function neonLabel(text, hex, x, y, z, scale = 6, hScale = 1) {
  const c = document.createElement("canvas");
  const fontSize = Math.floor(scale * 6.5);
  c.width = Math.max(256, fontSize * text.length * 0.65);
  c.height = Math.max(64, fontSize);
  const ctx = c.getContext("2d");
  ctx.font = `900 ${fontSize}px 'Syne','Inter',sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = hex; ctx.shadowBlur = 35;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  ctx.shadowBlur = 14;
  ctx.fillStyle = hex;
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter; tex.colorSpace = SRGBColorSpace;
  const sp = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  sp.scale.set(scale * (c.width / c.height) * 0.25, scale * 0.25, 1);
  sp.position.set(x, y, z); sp.renderOrder = 999;
  return sp;
}

// ── Polished wide-city camera tour ──────────────────────────────────────
const SHOTS = [
  { pos: [0,  22, 36],  look: [0,   2, -16],  duration: 5 },
  { pos: [-14, 20, 26], look: [-8,  2, -10],  duration: 5 },
  { pos: [30, 19, 28],  look: [12,  2, -13],  duration: 5 },
  { pos: [-36, 18, 18], look: [-18, 2, -16],  duration: 5 },
  { pos: [0,  28, 10],  look: [0,  2, -14],   duration: 5 },
  { pos: [16, 20, 38],  look: [0,   2, -14],  duration: 5 },
];

// WHEEL_X / Z constants matching the live Ferris wheel position on blacktop
const WHEEL_X = 22, WHEEL_Z = -12;

export default function CityLiveFeed({ width = "100%", height = "100%", className = "" }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId, disposed = false;

    try {
      const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMob, powerPreference: "low-power", alpha: false });
      renderer.setClearColor(0x0A1020);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMob ? 1.2 : 1.8));
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 1.5;
      renderer.outputColorSpace = SRGBColorSpace;
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 360;
      renderer.setSize(w, Math.max(h, 1));

      const scene = new THREE.Scene();
      scene.fog = new Fog(0x060614, 50, 100);

      const camera = new THREE.PerspectiveCamera(60, w / Math.max(h, 1), 0.1, 200);
      camera.position.set(0, 22, 36);
      camera.lookAt(0, 2, -16);

      // ── BUILD THE REAL CITY ────────────────────────────────────────────
      // Uses ALL the same zone builders as Vibe World: CitySkyline, CosmicSkySystem,
      // MusicStageZone, VibeLoungeZone, MusicLibraryZone, VisualizerDomeZone,
      // DailyVibeCheckZone, VibeAcademyZone, CrystalZone, FerrisWheel,
      // HoverboardRingRun, ZenBeach, DanceFloor, Jukebox
      buildPark(scene);

      // ── Cinematic neon zone labels ─────────────────────────────────────
      const labels = [
        neonLabel("MUSIC STAGE", "#00D4F0", 0, 7.8, -34.0, 7, 1.1),
        neonLabel("VIBE LOUNGE", "#C43BFF", -22, 4.2, -26),
        neonLabel("MUSIC LIBRARY", "#00D4F0", 22, 4.0, -20),
        neonLabel("VISUALIZER DOME", "#C43BFF", -13, 4.2, 3),
        neonLabel("VIBE CHECK", "#00E5FF", -16, 4.2, -13),
        neonLabel("VIBE ACADEMY", "#9B7EFF", -28, 5.0, 5),
        neonLabel("UPPER VIBE SHOP", "#00E5FF", 0, 4.6, 10, 6, 1.0),
        neonLabel("NEON SURF BEACH", "#F5A800", 28, 3.5, 23, 6, 0.95),
        neonLabel("NEON VIBE WHEEL", "#F5A800", WHEEL_X, 14.5, WHEEL_Z),
        neonLabel("CRYSTAL ZONE", "#C43BFF", -26, 5.2, -14),
      ];
      labels.forEach((l) => scene.add(l));

      // ── Pulsing glow orbs at landmark centers ──────────────────────────
      const glowOrbs = [
        { x: -5, y: 4, z: -20, color: "#C43BFF" },
        { x: 5, y: 4, z: -20, color: "#00D4F0" },
        { x: -22, y: 3, z: -26, color: "#E040FB" },
        { x: 22, y: 3, z: -20, color: "#00E5FF" },
        { x: 0, y: 4, z: 10, color: "#00E5FF" },
        { x: 28, y: 3, z: 23, color: "#F5A800" },
        { x: -26, y: 3, z: -14, color: "#C43BFF" },
        { x: -28, y: 3, z: 5, color: "#9B7EFF" },
      ];
      const orbMeshes = glowOrbs.map(({ x, y, z, color }) => {
        const m = new Mesh(new SphereGeometry(0.32, 10, 7), new THREE.MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.85 }));
        m.position.set(x, y, z); scene.add(m);
        return m;
      });

      // ── Flying decorative rings ────────────────────────────────────────
      const ringData = [
        [0, 0.15, -13, 4.5, "#C43BFF", 0.5],
        [0, 0.18, -13, 2.5, "#00D4F0", 0.7],
        [-22, 0.18, -26, 4.7, "#C43BFF", 0.55],
        [-22, 0.19, -26, 3.2, "#A078FF", 0.35],
        [22, 0.15, -20, 4.3, "#00D4F0", 0.55],
        [-13, 0.15, 3, 4.0, "#C43BFF", 0.55],
        [-16, 0.17, -13, 3.3, "#00E5FF", 0.55],
        [0, 0.2, 10, 5.5, "#00E5FF", 0.55],
        [-26, 0.17, -14, 2.3, "#C43BFF", 0.55],
        [28, 0.1, 23, 3.5, "#F5A800", 0.45],
        [22, 0.2, 22, 8.5, "#A078FF", 0.45],
        [-28, 0.16, 5, 5.0, "#9B7EFF", 0.55],
      ];
      ringData.forEach((data) => {
        const ring = new Mesh(new RingGeometry(data[3] - 0.1, data[3] + 0.08, 48), new THREE.MeshBasicMaterial({ color: new Color(data[4]), transparent: true, opacity: data[5], depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(data[0], data[1], data[2]);
        scene.add(ring);
      });
      ringData.forEach((data) => {
        const cGrad = new THREE.RingGeometry(data[3] - 0.08, data[3] + 0.06, 48);
        const rGrad = new Mesh(cGrad, new THREE.MeshBasicMaterial({ color: new Color(data[4]), transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
        rGrad.rotation.x = -Math.PI / 2; rGrad.position.set(data[0], data[1] + 0.01, data[2]);
        scene.add(rGrad);
      });

      // ── Cinematic foreground neon dots ─────────────────────────────────
      for (let i = 0; i < 16; i++) {
        const dot = new Mesh(new SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: new Color([0x00D4F0, 0xC43BFF, 0xA078FF][i % 3]), transparent: true, opacity: 0.4 + (i % 4) * 0.12 }));
        dot.position.set(-46 + i * 6, 0.6 + (i % 3) * 0.8, -40 + (i % 4) * 2);
        scene.add(dot);
      }

      // ── Resize observer ───────────────────────────────────────────────────
      const onResize = () => {
        if (!canvas || disposed) return;
        const w = canvas.clientWidth || 640;
        const h = canvas.clientHeight || 360;
        renderer.setSize(w, Math.max(h, 1));
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(canvas.parentElement || canvas);

      // ── Animate ───────────────────────────────────────────────────────────
      let shotIdx = 0, shotElapsed = 0, frame = 0;
      const camPos = new Vector3(), lookAt = new Vector3(),
            camSmooth = new Vector3(), lookSmooth = new Vector3();
      const initShot = (idx) => {
        const s = SHOTS[idx];
        camPos.set(...s.pos); lookAt.set(...s.look);
        camSmooth.copy(camPos); lookSmooth.copy(lookAt);
        shotElapsed = 0;
      };
      initShot(0);

      const animate = (time) => {
        if (disposed) return;
        animId = requestAnimationFrame(animate);
        const t = time * 0.001;

        // Shot tour
        const dt2 = 0.016;
        shotElapsed += dt2;
        const shot = SHOTS[shotIdx];
        if (shotElapsed >= shot.duration) {
          shotElapsed -= shot.duration;
          shotIdx = (shotIdx + 1) % SHOTS.length;
          const next = SHOTS[shotIdx];
          camPos.set(...next.pos); lookAt.set(...next.look);
        }
        const lerpSpd = 1.4;
        camSmooth.lerp(camPos, Math.min(1, lerpSpd * dt2));
        lookSmooth.lerp(lookAt, Math.min(1, lerpSpd * dt2));
        camera.position.copy(camSmooth);
        camera.lookAt(lookSmooth);

        // ── Animate the real Ferris Wheel (same rotation as in-game) ──
        animateFerrisWheel(scene, t, 0);

        // ── Animate the real cosmic sky (skybox drift, shooting stars, etc.) ──
        scene.userData._hidePlanets = false;
        scene.userData._playerZ = -99; // always in beach zone → planets visible
        scene.userData._camPitch = 0;
        scene.userData._camYaw = 0;
        animateCosmicSky(scene, camera, t, dt2);

        // ── Pulse animatable zone elements ──────────────────────────────
        const pulsating = scene.userData.neonMats || [];
        for (const m of pulsating) {
          if (m) m.opacity = 0.65 + Math.sin(t * 1.8 + pulsating.indexOf(m) * 1.2) * 0.25;
        }

        // Pulse plaza fill
        const pf = scene.userData.plazaFill;
        if (pf) pf.intensity = 2.0 + Math.sin(t * 1.2) * 0.3;

        // Orb float
        for (const [i, m] of orbMeshes.entries()) {
          const go = glowOrbs[i];
          if (go) {
            m.position.y = go.y + Math.sin(t * 1.2 + i * 1.5) * 0.5;
            m.material.opacity = 0.65 + Math.sin(t * 1.8 + i) * 0.2;
          }
        }

        // Zone-animator pulse calls — muted audio beat preserves scenery motion
        const audioBeat = 0;
        scene.userData._beachStrobe = 0;

        frame++;
        if (frame === 2) setReady(true);
        renderer.render(scene, camera);
      };
      animId = requestAnimationFrame(animate);

      return () => {
        disposed = true;
        cancelAnimationFrame(animId);
        ro.disconnect();
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) { (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose()); }
        });
      };
    } catch (e) {
      console.warn("[CityLiveFeed] error:", e);
      setError(true);
    }
  }, []);

  if (error) return null;
  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" style={{ display: "block" }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(160deg,#060614,#0a0a22)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: "rgba(0,212,240,0.5)" }}>Loading City</p>
          </div>
        </div>
      )}
    </div>
  );
}