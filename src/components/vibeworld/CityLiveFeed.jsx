/**
 * CityLiveFeed — Single-pose cinematic live-render of Upper Vibe City.
 *
 * Uses the SAME scene builders as the in-game Vibe World (buildPark from CityCanvas,
 * CitySkyline, FerrisWheel, CosmicSkySystem, zone animators) so the preview is
 * a true representation of the real city — not a hand-built approximation.
 *
 * Fixed preview camera: wide elevated angle showing plaza/dance floor center,
 * Music Stage in background, full skyline, and neon zones — no rotating shots
 * that risk cropping zone text. Safe to mount on Home/Start.
 */
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { buildPark } from "@/components/vibeworld/CityCanvas";
import { animateFerrisWheel } from "@/components/vibeworld/FerrisWheel";
import { animateCosmicSky } from "@/components/vibeworld/CosmicSkySystem";
import createUpperVibeShop, { animateShop } from "@/components/vibeworld/UpperVibeShop";

const { Color, Vector3, SpriteMaterial, Sprite, CanvasTexture, SRGBColorSpace,
        Mesh, MeshBasicMaterial, PointsMaterial, Points,
        BufferGeometry, BufferAttribute,
        RingGeometry, ConeGeometry, SphereGeometry,
        BoxGeometry, MeshStandardMaterial,
        Fog, LinearFilter } = THREE;

// ── Cinematic neon floating labels ────────────────────────────────────────
function neonLabel(text, hex, x, y, z, scale = 6, spriteMult = 1.8) {
  const c = document.createElement("canvas");
  const fontSize = Math.floor(scale * 5.5);
  const extra = text.length > 12 ? 0.8 : 0.7;
  c.width = Math.max(320, Math.ceil(fontSize * text.length * extra + 48));
  c.height = Math.max(80, Math.ceil(fontSize * 2));
  const ctx = c.getContext("2d");
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // White glow base
  ctx.shadowColor = hex; ctx.shadowBlur = 40;
  ctx.font = `900 ${fontSize}px 'Syne','Inter',sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, c.width / 2, c.height / 2);
  // Color fill on top
  ctx.shadowBlur = 16;
  ctx.fillStyle = hex;
  ctx.fillText(text, c.width / 2, c.height / 2);
  ctx.shadowBlur = 0;
  // Bottom stroke for neon readability
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = hex;
  ctx.strokeText(text, c.width / 2, c.height / 2);
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter; tex.colorSpace = SRGBColorSpace;
  const sp = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  const ratio = c.width / c.height;
  sp.scale.set(scale * 0.08 * ratio * spriteMult, scale * 0.08 * spriteMult, 1);
  sp.position.set(x, y, z); sp.renderOrder = 999;
  return sp;
}

// ── Cinematic preview camera ──────────────────────────────────────────
// Wide elevated angle with gentle orbiting. Shots are kept deep so ALL zone
// name labels stay fully within the vertical frame — no cropping.
const SHOTS = [
  { pos: [0,  20, 32], look: [0, 0, -16] },  // central — full plaza + stage
  { pos: [8,  20, 28], look: [3, 0, -16] },   // pan right — library + academy
  { pos: [-11, 20, 32], look: [-6, 0, -14] }, // pan left — lounge + dome
  { pos: [12, 18, 34], look: [8, 0, -14] },   // far right — beach + wheel
];
const FIXED_CAM = SHOTS[0];
const SHOT_DURATION = 5; // seconds per shot
const SHOT_LERP = 1.2;   // smoothness between shots

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
      camera.position.set(...FIXED_CAM.pos);
      camera.lookAt(...FIXED_CAM.look);

      // ── BUILD THE REAL CITY ────────────────────────────────────────────
      // Uses ALL the same zone builders as Vibe World: CitySkyline, CosmicSkySystem,
      // MusicStageZone, VibeLoungeZone, MusicLibraryZone, VisualizerDomeZone,
      // DailyVibeCheckZone, VibeAcademyZone, CrystalZone, FerrisWheel,
      // HoverboardRingRun, ZenBeach, DanceFloor, Jukebox
      buildPark(scene);

      // ── UPPER VIBE SHOP — storefront building in the plaza center ──
      const shopGroup = createUpperVibeShop(scene, [0, 0, 10]);
      if (shopGroup) shopGroup.rotation.y = 0;

      // ── Cinematic neon zone labels — tight so full names always fit ──
      const labels = [
        neonLabel("MUSIC STAGE",       "#00D4F0", 0,   3.6, -34.0, 3.4),
        neonLabel("VIBE LOUNGE",       "#C43BFF", -22, 2.4, -26,   3.4),
        neonLabel("MUSIC LIBRARY",     "#00D4F0", 22,  2.4, -20,   3.4),
        neonLabel("VISUALIZER DOME",   "#C43BFF", -13, 2.4, 3,     3.2),
        neonLabel("VIBE CHECK",        "#00E5FF", -16, 2.5, -13,   3.4),
        neonLabel("VIBE ACADEMY",      "#9B7EFF", -28, 2.6, 5,     3.4),
        neonLabel("UPPER VIBE SHOP",   "#00E5FF", 0,   2.6, 10,    3.2),
        neonLabel("NEON SURF BEACH",   "#F5A800", 28,  2.2, 23,    3.2),
        neonLabel("VIBE WHEEL",        "#F5A800", WHEEL_X, 5.5, WHEEL_Z, 3.2),
        neonLabel("CRYSTAL ZONE",      "#C43BFF", -26, 2.5, -14,   3.4),
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
        { x: -13, y: 2.5, z: 3, color: "#C43BFF" },
        { x: -28, y: 2.5, z: 5, color: "#9B7EFF" },
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
        [-13, 0.1, 3, 4.0, "#C43BFF", 0.55],
        [-13, 0.12, 3, 2.5, "#E040FB", 0.35],
        [-28, 0.1, 5, 5.0, "#9B7EFF", 0.55],
        [-28, 0.12, 5, 3.2, "#C43BFF", 0.35],
        [28, 0.1, 23, 3.5, "#F5A800", 0.45],
        [22, 0.2, 22, 8.5, "#A078FF", 0.45],
        [0, 0.2, 10, 5.5, "#00E5FF", 0.55],
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
      let frame = 0, shotIdx = 0, shotElapsed = SHOT_DURATION, camShotPos = new Vector3(...SHOTS[0].pos), camShotLook = new Vector3(...SHOTS[0].look);
      const camPos0 = new Vector3(), camLook0 = new Vector3(...SHOTS[0].look);

      const advanceShot = () => {
        shotIdx = (shotIdx + 1) % SHOTS.length;
        camShotPos.set(...SHOTS[shotIdx].pos);
        camShotLook.set(...SHOTS[shotIdx].look);
        shotElapsed = 0;
      };

      const animate = (time) => {
        if (disposed) return;
        animId = requestAnimationFrame(animate);
        const t = time * 0.001;
        const dt2 = 0.016;

        // ── Gentle city tour — no hard snaps, all labels stay in frame ──
        shotElapsed += dt2;
        if (shotElapsed >= SHOT_DURATION) advanceShot();
        camPos0.copy(camera.position);
        camLook0.lerp(camShotLook, Math.min(1, SHOT_LERP * dt2));
        camera.position.lerp(camShotPos, Math.min(1, SHOT_LERP * dt2));
        camera.lookAt(camLook0);

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

        // Upper Vibe Shop — animate lights
        if (shopGroup) animateShop(shopGroup, t, 0);

        // ── Put a track on the Music Stage screen ─────────────────────
        // Render cover art into a canvas, then apply it to the stage screen.
        // Re-renders every 4 frames to keep in sync, falling back to the
        // existing visualizer/dark screen if the screen was already textured.
        if (frame % 4 === 0) {
          const ss = scene.userData.stageScreen;
          if (ss && ss.material && !scene.userData._stageSongPainted) {
            const sgw = 12.444, sgh = 7;
            const sq = document.createElement("canvas");
            sq.width = 128; sq.height = 72;
            const sctx = sq.getContext("2d");
            // Deep purple glow background
            const grd = sctx.createLinearGradient(0, 0, 128, 72);
            grd.addColorStop(0, "#1a1040"); grd.addColorStop(0.5, "#2d1560"); grd.addColorStop(1, "#1a1040");
            sctx.fillStyle = grd; sctx.fillRect(0, 0, 128, 72);
            // Glow halo
            sctx.shadowColor = "#00E5FF"; sctx.shadowBlur = 8;
            sctx.beginPath(); sctx.arc(22, 36, 12, 0, Math.PI * 2); sctx.fillStyle = "rgba(0,229,255,0.4)"; sctx.fill();
            sctx.shadowBlur = 0; sctx.shadowColor = "transparent";
            // Neon Strobes vocalist fig
            sctx.fillStyle = "#ffffff"; sctx.font = "22px 'Syne',sans-serif"; sctx.textAlign = "center"; sctx.textBaseline = "middle";
            sctx.shadowColor = "#C43BFF"; sctx.shadowBlur = 10;
            sctx.fillText("🎤", 20, 38); sctx.shadowBlur = 0;
            sctx.shadowColor = "#00E5FF"; sctx.shadowBlur = 6;
            sctx.fillText("ON", 60, 28); sctx.fillText("STAGE", 60, 48);
            sctx.shadowBlur = 0;
            sctx.fillStyle = "#9B7EFF"; sctx.font = "18px 'Syne',sans-serif";
            sctx.fillText("Now Playing", 60, 5);
            sctx.fillStyle = "rgba(255,255,255,0.4)"; sctx.font = "14px 'Inter',sans-serif"; sctx.textAlign = "left";
            sctx.fillText("★ 528Hz Remix", 86, 58);
            // Music bars
            for (let b = 0; b < 6; b++) {
              const bh = 4 + Math.sin(b * 1.5 + t * 2.3) * 5;
              sctx.fillStyle = ["#00E5FF", "#C43BFF", "#9B7EFF", "#00E5FF", "#C43BFF", "#9B7EFF"][b];
              sctx.fillRect(92 + b * 6, 66 - bh, 4, bh);
            }
            const stex = new THREE.CanvasTexture(sq);
            stex.colorSpace = THREE.SRGBColorSpace;
            stex.minFilter = THREE.LinearFilter;
            ss.material = new MeshBasicMaterial({ map: stex, depthWrite: true });
          }
        }

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