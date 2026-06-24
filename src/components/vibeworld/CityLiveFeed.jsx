/**
 * CityLiveFeed — Lightweight aerial live-render of Upper Vibe City.
 * Spins up a minimal Three.js scene (no avatar, no input, no presence sync)
 * with a fixed cinematic overhead camera. Renders to a canvas element.
 * Designed to be safe to mount on the Home/Start page without slowing the site.
 */
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

// Cinematic waypoint tour — camera moves between key zones
// Each shot: { pos: [x,y,z], look: [x,y,z], duration: seconds }
const SHOTS = [
  // Wide overview — whole city from south
  { pos: [0,  38, 28],   look: [0,  0, -8],   duration: 5 },
  // Music Stage close-up — from the front
  { pos: [0,  14, -18],  look: [0,  3, -34],  duration: 5 },
  // Vibe Lounge — swooping left side
  { pos: [-30, 16, -18], look: [-22, 1, -26], duration: 5 },
  // Music Library cylinder — right side
  { pos: [35,  14, -12], look: [22,  2, -20], duration: 5 },
  // Ferris Wheel + beach — from south-east
  { pos: [38,  20, 32],  look: [22,  8,  22], duration: 5 },
  // Visualizer Dome — low angle from plaza
  { pos: [-8,  8,  12],  look: [-13, 2,   3], duration: 4 },
  // Wide north — stage skyline reveal
  { pos: [20,  22, 10],  look: [0,   4, -30], duration: 5 },
  // Beach aerial — ocean view
  { pos: [0,   22, 48],  look: [0,   0,  20], duration: 4 },
];

export default function CityLiveFeed({ width = "100%", height = "100%", className = "" }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId;
    let disposed = false;

    try {
      // ── Renderer ─────────────────────────────────────────────
      const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false, // skip antialiasing for perf — it's a preview
        powerPreference: "low-power",
        alpha: false,
      });
      renderer.setClearColor(0x060614);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMob ? 1 : 1.5));

      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 360;
      renderer.setSize(w, Math.max(h, 1));

      // ── Scene ─────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x060614, 40, 85);

      // ── Camera ───────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(48, w / Math.max(h, 1), 0.1, 100);

      // ── Lighting ─────────────────────────────────────────────
      const ambLight = new THREE.AmbientLight(0x4850A0, 1.1);
      scene.add(ambLight);

      const hemi = new THREE.HemisphereLight(0x6B5CAA, 0x1A2040, 0.8);
      scene.add(hemi);

      const moon = new THREE.DirectionalLight(0x8899CC, 0.7);
      moon.position.set(15, 22, 10);
      scene.add(moon);

      // Stage front wash
      const stageWash = new THREE.PointLight(0x9B4FFF, 4, 22);
      stageWash.position.set(0, 5, -30);
      scene.add(stageWash);

      const loungeLight = new THREE.PointLight(0xE040FB, 3, 14);
      loungeLight.position.set(-22, 3, -26);
      scene.add(loungeLight);

      const libLight = new THREE.PointLight(0x00E5FF, 3, 14);
      libLight.position.set(22, 3, -20);
      scene.add(libLight);

      const domeLight = new THREE.PointLight(0xFF00FF, 3, 14);
      domeLight.position.set(-13, 3, 3);
      scene.add(domeLight);

      const plazaFill = new THREE.PointLight(0x8888DD, 2, 18);
      plazaFill.position.set(0, 2, -13);
      scene.add(plazaFill);

      // ── Ground ────────────────────────────────────────────────
      const groundGeo = new THREE.PlaneGeometry(84, 64);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x0B1020, roughness: 0.55, metalness: 0.15 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -0.01, -10);
      scene.add(ground);

      // Beach
      const beach = new THREE.Mesh(
        new THREE.PlaneGeometry(84, 28),
        new THREE.MeshStandardMaterial({ color: 0xD4AA70, roughness: 0.55 })
      );
      beach.rotation.x = -Math.PI / 2;
      beach.position.set(0, 0.001, 24);
      scene.add(beach);

      // Ocean
      const ocean = new THREE.Mesh(
        new THREE.PlaneGeometry(84, 40),
        new THREE.MeshBasicMaterial({ color: 0x30B0DC })
      );
      ocean.rotation.x = -Math.PI / 2;
      ocean.position.set(0, 0.002, 52);
      scene.add(ocean);

      // ── Plaza disc ────────────────────────────────────────────
      const plaza = new THREE.Mesh(
        new THREE.CircleGeometry(10.5, 48),
        new THREE.MeshStandardMaterial({ color: 0x141B2D, roughness: 0.35, metalness: 0.3 })
      );
      plaza.rotation.x = -Math.PI / 2;
      plaza.position.set(0, 0.002, -13);
      scene.add(plaza);

      const plazaRing = new THREE.Mesh(
        new THREE.RingGeometry(10.0, 10.3, 48),
        new THREE.MeshBasicMaterial({ color: 0xA078FF, side: THREE.DoubleSide })
      );
      plazaRing.rotation.x = -Math.PI / 2;
      plazaRing.position.set(0, 0.005, -13);
      scene.add(plazaRing);

      // ── Music Stage ───────────────────────────────────────────
      function box(w, h, d, color, x, y, z) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 })
        );
        m.position.set(x, y, z);
        scene.add(m);
        return m;
      }
      function glowBox(w, h, d, color, x, y, z, opacity = 0.8) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
        );
        m.position.set(x, y, z);
        scene.add(m);
        return m;
      }

      box(10, 1.0, 5.5, 0x111830, 0, 0.5, -32);
      box(10, 0.25, 5.5, 0x1A2050, 0, 1.12, -32);
      glowBox(10.1, 0.08, 0.1, 0x00D4F0, 0, 1.27, -29.2);

      // Screen
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(14, 7, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x001A40 })
      );
      screen.position.set(0, 3.5, -34.4);
      scene.add(screen);

      // Screen glow
      glowBox(14.3, 7.3, 0.05, 0x00E5FF, 0, 3.5, -34.4, 0.55);

      // Arch
      for (let a = 0; a < 10; a++) {
        const ang = -Math.PI / 2 + (a / 9) * Math.PI;
        const ax = Math.cos(ang) * 7.2;
        const ay = 3.5 + Math.sin(ang) * 7.2;
        glowBox(0.09, 0.09, 0.15, 0xC43BFF, ax, ay, -34.3, 0.85);
      }

      // ── Vibe Lounge ───────────────────────────────────────────
      const loungePlat = new THREE.Mesh(
        new THREE.CircleGeometry(4.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x181032, roughness: 0.3, metalness: 0.55 })
      );
      loungePlat.rotation.x = -Math.PI / 2;
      loungePlat.position.set(-22, 0.003, -26);
      scene.add(loungePlat);

      const loungeRing = new THREE.Mesh(
        new THREE.RingGeometry(4.2, 4.5, 48),
        new THREE.MeshBasicMaterial({ color: 0xC43BFF, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      );
      loungeRing.rotation.x = -Math.PI / 2;
      loungeRing.position.set(-22, 0.006, -26);
      scene.add(loungeRing);

      // Lounge pillars
      for (let p = 0; p < 4; p++) {
        const ang = Math.PI + (p / 3) * Math.PI * 0.65;
        const px2 = -22 + Math.cos(ang) * 3.0;
        const pz2 = -26 + Math.sin(ang) * 3.0;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6),
          new THREE.MeshBasicMaterial({ color: p % 2 === 0 ? 0x00D4F0 : 0xA078FF, transparent: true, opacity: 0.5 })
        );
        pillar.position.set(px2, 1.1, pz2);
        scene.add(pillar);
      }

      // ── Music Library ─────────────────────────────────────────
      const libPlat = new THREE.Mesh(
        new THREE.CircleGeometry(4, 24),
        new THREE.MeshStandardMaterial({ color: 0x162040, roughness: 0.35, metalness: 0.35 })
      );
      libPlat.rotation.x = -Math.PI / 2;
      libPlat.position.set(22, 0.002, -20);
      scene.add(libPlat);

      const libBldg = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 3, 3.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x1E2E4A, roughness: 0.3, metalness: 0.35 })
      );
      libBldg.position.set(22, 1.6, -20);
      scene.add(libBldg);

      for (const ry of [0.3, 1.8, 3.0]) {
        const libRing = new THREE.Mesh(
          new THREE.RingGeometry(2.85, 3.05, 24),
          new THREE.MeshBasicMaterial({ color: 0x00D4F0, side: THREE.DoubleSide })
        );
        libRing.rotation.x = -Math.PI / 2;
        libRing.position.set(22, ry, -20);
        scene.add(libRing);
      }

      // ── Visualizer Dome ───────────────────────────────────────
      const domeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x1A2540, roughness: 0.2, metalness: 0.65, transparent: true, opacity: 0.75 })
      );
      domeMesh.position.set(-13, 0.05, 3);
      scene.add(domeMesh);

      // ── Ferris Wheel (simplified) ─────────────────────────────
      const WHEEL_X = 22, WHEEL_Z = 22, WHEEL_R = 7;
      const wheelHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.4, 8),
        new THREE.MeshBasicMaterial({ color: 0x00D4F0 })
      );
      wheelHub.position.set(WHEEL_X, WHEEL_R + 1, WHEEL_Z);
      scene.add(wheelHub);

      const wheelRim = new THREE.Mesh(
        new THREE.TorusGeometry(WHEEL_R, 0.12, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0x00E5FF, transparent: true, opacity: 0.8 })
      );
      wheelRim.position.set(WHEEL_X, WHEEL_R + 1, WHEEL_Z);
      wheelRim.rotation.y = Math.PI / 2;
      scene.add(wheelRim);

      // Support columns
      for (const side of [-1, 1]) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, WHEEL_R + 1, 6),
          new THREE.MeshStandardMaterial({ color: 0x1E2A4A, roughness: 0.4, metalness: 0.5 })
        );
        col.position.set(WHEEL_X + side * 1.2, (WHEEL_R + 1) / 2, WHEEL_Z);
        scene.add(col);
      }

      // ── Skyline buildings (simplified) ────────────────────────
      const bldgDefs = [
        // North wall
        { x: -30, z: -35, w: 5, h: 14, d: 4, color: 0x0E1428 },
        { x: -20, z: -36, w: 6, h: 18, d: 4, color: 0x101830 },
        { x: -10, z: -36, w: 5, h: 20, d: 4, color: 0x0C1428 },
        { x:   0, z: -36, w: 6, h: 15, d: 4, color: 0x101830 },
        { x:  10, z: -36, w: 5, h: 22, d: 4, color: 0x0C1428 },
        { x:  20, z: -36, w: 6, h: 17, d: 4, color: 0x101830 },
        { x:  30, z: -35, w: 5, h: 13, d: 4, color: 0x0E1428 },
        // East wall
        { x:  36, z: -26, w: 4, h: 16, d: 6, color: 0x0C1428 },
        { x:  36, z: -14, w: 4, h: 12, d: 6, color: 0x0E1830 },
        { x:  36, z:  -2, w: 4, h: 10, d: 6, color: 0x0C1428 },
        // West wall
        { x: -36, z: -26, w: 4, h: 16, d: 6, color: 0x0C1428 },
        { x: -36, z: -14, w: 4, h: 12, d: 6, color: 0x0E1830 },
        { x: -36, z:  -2, w: 4, h: 10, d: 6, color: 0x0C1428 },
      ];

      const neonColors = [0x00D4F0, 0xC43BFF, 0xA078FF, 0x00E5FF];
      bldgDefs.forEach((b, i) => {
        const bldg = new THREE.Mesh(
          new THREE.BoxGeometry(b.w, b.h, b.d),
          new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.35, metalness: 0.4 })
        );
        bldg.position.set(b.x, b.h / 2, b.z);
        scene.add(bldg);

        // Neon top edge glow
        const topGlow = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.1, 0.06, 0.06),
          new THREE.MeshBasicMaterial({ color: neonColors[i % neonColors.length], transparent: true, opacity: 0.7 })
        );
        topGlow.position.set(b.x, b.h + 0.03, b.z);
        scene.add(topGlow);
      });

      // ── Stars (points) ────────────────────────────────────────
      const starCount = isMob ? 200 : 400;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 70 + Math.random() * 10;
        starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi));
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true }));
      scene.add(stars);

      // ── Neon glow planes for zones (ground decals) ────────────
      const decals = [
        { x: 0,   z: -13, r: 0x141B2D, ring: 0xA078FF  },
        { x: -22, z: -26, r: 0x181032, ring: 0xC43BFF   },
        { x:  22, z: -20, r: 0x162040, ring: 0x00D4F0   },
        { x: -13, z:   3, r: 0x1A2540, ring: 0xC43BFF   },
      ];

      // ── Cinematic neon accent — floating orbs ─────────────────
      const glowOrbs = [
        { x:  -5, y: 4, z: -20, color: 0xC43BFF },
        { x:   5, y: 4, z: -20, color: 0x00D4F0 },
        { x: -22, y: 3, z: -26, color: 0xE040FB },
        { x:  22, y: 3, z: -20, color: 0x00E5FF },
      ];
      const orbMeshes = glowOrbs.map(({ x, y, z, color }) => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 6),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
        );
        m.position.set(x, y, z);
        scene.add(m);
        return m;
      });

      // ── Handle resize ─────────────────────────────────────────
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

      // ── Animate ────────────────────────────────────────────────
      let frame = 0;
      // Shot tour state
      let shotIdx = 0;
      let shotElapsed = 0;
      // Smooth camera interpolation targets
      const camTarget = new THREE.Vector3(...SHOTS[0].pos);
      const lookTarget = new THREE.Vector3(...SHOTS[0].look);
      const camSmooth = new THREE.Vector3(...SHOTS[0].pos);
      const lookSmooth = new THREE.Vector3(...SHOTS[0].look);
      let lastT = performance.now() * 0.001;

      const animate = () => {
        if (disposed) return;
        animId = requestAnimationFrame(animate);

        const t = performance.now() * 0.001;
        const dt = Math.min(t - lastT, 0.1);
        lastT = t;

        // Advance shot timer
        shotElapsed += dt;
        const shot = SHOTS[shotIdx];
        if (shotElapsed >= shot.duration) {
          shotElapsed -= shot.duration;
          shotIdx = (shotIdx + 1) % SHOTS.length;
          const next = SHOTS[shotIdx];
          camTarget.set(...next.pos);
          lookTarget.set(...next.look);
        }

        // Smooth lerp camera toward current shot target (speed 1.2 = gentle ~1s blend)
        const lerpSpeed = 1.2;
        camSmooth.lerp(camTarget, Math.min(1, lerpSpeed * dt));
        lookSmooth.lerp(lookTarget, Math.min(1, lerpSpeed * dt));

        camera.position.copy(camSmooth);
        camera.lookAt(lookSmooth);

        // Stars follow camera
        stars.position.copy(camera.position);

        // Orb float animation
        orbMeshes.forEach((m, i) => {
          m.position.y = glowOrbs[i].y + Math.sin(t * 1.2 + i * 1.5) * 0.4;
          m.material.opacity = 0.65 + Math.sin(t * 1.8 + i) * 0.2;
        });

        // Stage screen glow pulse
        const screenGlow = scene.children.find(c => c.material?.color?.r === 0 && c.material?.transparent && c.position.z === -34.4);
        // Gentle ambient pulses
        stageWash.intensity = 3.5 + Math.sin(t * 2.1) * 0.8;
        loungeLight.intensity = 2.5 + Math.sin(t * 1.7 + 1.0) * 0.6;
        plazaFill.intensity = 1.8 + Math.sin(t * 1.3 + 2.0) * 0.4;

        // Wheel rotation
        if (wheelRim) wheelRim.rotation.z = t * 0.25;

        frame++;
        if (frame === 2) setReady(true);

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        disposed = true;
        cancelAnimationFrame(animId);
        ro.disconnect();
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      };
    } catch (e) {
      console.warn("[CityLiveFeed] error:", e);
      setError(true);
    }
  }, []);

  if (error) return null; // fallback: parent shows CSS preview

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: "block" }}
      />
      {/* Loading shimmer */}
      {!ready && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "linear-gradient(160deg,#060614,#0a0a22)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: "rgba(0,212,240,0.5)" }}>
              Loading City
            </p>
          </div>
        </div>
      )}
    </div>
  );
}