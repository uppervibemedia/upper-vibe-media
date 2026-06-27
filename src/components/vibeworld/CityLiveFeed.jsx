/**
 * CityLiveFeed — Lightweight cinematic live-render of Upper Vibe City.
 * Uses the real CitySkyline module for the skyline, adds the Shop,
 * and renders a flying neon camera tour. Safe to mount on Home/Start
 * without impacting site performance.
 */
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import createCitySkyline from "@/components/vibeworld/CitySkyline";

const { Color, Vector3, SpriteMaterial, Sprite, CanvasTexture, SRGBColorSpace,
        Mesh, MeshStandardMaterial, MeshBasicMaterial, PointsMaterial, Points,
        BufferGeometry, BufferAttribute,
        PlaneGeometry, BoxGeometry, SphereGeometry, RingGeometry, CircleGeometry,
        CylinderGeometry, ConeGeometry, TorusGeometry,
        Fog, LinearFilter } = THREE;

// ── Cinematic neon labels ────────────────────────────────────────────────
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
// All shots frame the full city center with skyline — no zone closeups.
// Elevated 16:9 angles looking toward the central plaza/stage.
// All duration=6 for gentle pacing and clean transitions.
const SHOTS = [
  // 1) Premium grand-angle from south — plaza + stage + full skyline
  { pos: [0,  22, 36],  look: [0,   2, -16],  duration: 5 },
  // 2) Crank right — Shop + Dome + skyline buildings
  { pos: [-14, 20, 26], look: [-8,  2, -10],  duration: 5 },
  // 3) Right-side — Library + Ferris Wheel + east skyline
  { pos: [30, 19, 28],  look: [12,  2, -13],  duration: 5 },
  // 4) Angled from west — Crystal + Academy + skyline
  { pos: [-36, 18, 18], look: [-18, 2, -16],  duration: 5 },
  // 5) High overhead — plaza/Lounge rings clearly visible
  { pos: [0,  28, 10],  look: [0,  2, -14],   duration: 5 },
  // 6) Grand diagonal from beach side — whole city + stage distant
  { pos: [16, 20, 38],  look: [0,   2, -14],  duration: 5 },
];

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
      renderer.setClearColor(0x060614);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMob ? 1.2 : 1.8));
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 1.5;
      renderer.outputColorSpace = SRGBColorSpace;
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 360;
      renderer.setSize(w, Math.max(h, 1));

      const scene = new THREE.Scene();
      scene.fog = new Fog(0x060614, 50, 100);

      const camera = new THREE.PerspectiveCamera(52, w / Math.max(h, 1), 0.1, 120);

      // ── Lighting — rich purple-blue nocturnal with neon washes ─────────────
      scene.add(new THREE.AmbientLight(new Color("#283068"), 0.85));
      scene.add(new THREE.HemisphereLight(new Color("#9B7EFF"), new Color("#1A2040"), 0.55));

      const moon = new THREE.DirectionalLight(new Color("#8888CC"), 1.0);
      moon.position.set(-12, 28, 18); scene.add(moon);

      scene.background = new Color("#050510");

      // Tracking arrays for per-frame cabin animation
      const wheelCabinMeshes = [];

      // Neon zone wash lights — named so we can pulse them in the animation loop
      const stageWash = new THREE.PointLight(new Color("#C43BFF"), 5, 22);  stageWash.position.set(0, 5, -30);   scene.add(stageWash);
      const plazaFill = new THREE.PointLight(new Color("#00D4F0"), 3.5, 22); plazaFill.position.set(0, 4, -13); scene.add(plazaFill);
      const loungeLight = new THREE.PointLight(new Color("#E040FB"), 3, 22); loungeLight.position.set(-22, 3, -26); scene.add(loungeLight);
      const libLight = new THREE.PointLight(new Color("#00E5FF"), 3, 22);    libLight.position.set(22, 3, -20);   scene.add(libLight);
      const domeLight = new THREE.PointLight(new Color("#FF00FF"), 3, 22);   domeLight.position.set(-13, 3, 3);    scene.add(domeLight);

      // ── GROUND ──────────────────────────────────────────────────────────
      const ground = new Mesh(new PlaneGeometry(90, 78), new MeshStandardMaterial({ color: 0x070914, roughness: 0.5, metalness: 0.12 }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.01, -6);
      scene.add(ground);
      // Glow decals under key zones
      ["#9B7EFF","#C43BFF","#00D4F0","#C43BFF","#00E5FF","#9B7EFF"].forEach((hex, i) => {
        const xa = [-18, -13];
        const ring = new Mesh(new RingGeometry(2.8 + i * 0.1, 3.2 + i * 0.1, 48),
          new MeshBasicMaterial({ color: new Color(hex), transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(xa[0], 0.002, xa[1]);
        scene.add(ring);
      });

      // Beach + Ocean
      const beach = new Mesh(new PlaneGeometry(86, 28), new MeshStandardMaterial({ color: 0xCCAA70, roughness: 0.6 }));
      beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.001, 24);
      scene.add(beach);
      const ocean = new Mesh(new PlaneGeometry(86, 40), new MeshBasicMaterial({ color: new Color("#2A90C0") }));
      ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, 0.002, 52);
      scene.add(ocean);

      // ── ZONES ───────────────────────────────────────────────────────────
      // Plaza / Dance Floor
      const plaza = new Mesh(new CircleGeometry(10.5, 48), new MeshStandardMaterial({ color: 0x141B2D, roughness: 0.35, metalness: 0.3 }));
      plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.002, -13);
      scene.add(plaza);
      const pRing = new Mesh(new RingGeometry(10.0, 10.3, 48), new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      pRing.rotation.x = -Math.PI / 2; pRing.position.set(0, 0.004, -13);
      scene.add(pRing);
      // Dance floor tiles
      const TILES = [0x00D4F0, 0xC43BFF, 0xA078FF, 0x00E5FF, 0xFF00FF, 0x0088FF];
      for (let tx = -4; tx <= 4; tx += 2) {
        for (let tz = -17; tz <= -9; tz += 2) {
          const tile = new Mesh(new PlaneGeometry(1.85, 1.85), new MeshBasicMaterial({ color: TILES[Math.abs(tx + tz) % TILES.length], transparent: true, opacity: 0.12, depthWrite: false }));
          tile.rotation.x = -Math.PI / 2; tile.position.set(tx, 0.003, tz);
          scene.add(tile);
        }
      }
      const center = new Mesh(new RingGeometry(1.7, 2.1, 48), new MeshBasicMaterial({ color: new Color("#00D4F0"), transparent: true, opacity: 0.55 }));
      center.rotation.x = -Math.PI / 2; center.position.set(0, 0.005, -13);
      scene.add(center);

      // Music video on stage screen — loading a video texture (embedded element for three.js)
      const stageVideoEl = document.createElement("video");
      stageVideoEl.loop = true;
      stageVideoEl.muted = true;
      stageVideoEl.playsInline = true;
      stageVideoEl.crossOrigin = "anonymous";
      stageVideoEl.src = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      stageVideoEl.load();
      // Play attempt is best-effort; silently handle autoplay blocks
      const tryStagePlay = () => { stageVideoEl.play().catch(() => {}); };
      stageVideoEl.addEventListener('canplay', tryStagePlay, { once: true });

      // ── MUSIC STAGE ────────────────────────────────────────────────────
      const stage = new Mesh(new BoxGeometry(10, 1.0, 5.5), new MeshStandardMaterial({ color: 0x111830, roughness: 0.35 })); // Adjusted for typos
      stage.position.set(0, 0.5, -32); scene.add(stage);
      const stageTop = new Mesh(new BoxGeometry(10, 0.25, 5.5), new MeshStandardMaterial({ color: 0x1A2050, roughness: 0.4 }));
      stageTop.position.set(0, 1.12, -32); scene.add(stageTop);
      const stageEdge = new Mesh(new BoxGeometry(10.1, 0.08, 0.1), new MeshBasicMaterial({ color: new Color("#00D4F0") }));
      stageEdge.position.set(0, 1.27, -29.2); scene.add(stageEdge);
      const sideLeft = new Mesh(new BoxGeometry(0.06, 1.0, 0.06), new MeshBasicMaterial({ color: new Color("#C43BFF"), transparent: true, opacity: 0.7 }));
      sideLeft.position.set(-5.05, 0.5, -32); scene.add(sideLeft);
      const sideRight = new Mesh(new BoxGeometry(0.06, 1.0, 0.06), new MeshBasicMaterial({ color: new Color("#00D4F0"), transparent: true, opacity: 0.7 }));
      sideRight.position.set(5.05, 0.5, -32); scene.add(sideRight);
      const stageVideoTex = new THREE.VideoTexture(stageVideoEl);
      stageVideoTex.minFilter = THREE.LinearFilter;
      stageVideoTex.colorSpace = THREE.SRGBColorSpace;
      const screen = new Mesh(new BoxGeometry(14, 7, 0.2), new THREE.MeshBasicMaterial({ map: stageVideoTex }));
      screen.position.set(0, 3.5, -34.4); scene.add(screen);
      const glowBorder = new Mesh(new BoxGeometry(14.3, 7.3, 0.05), new MeshBasicMaterial({ color: new Color("#00E5FF"), transparent: true, opacity: 0.5 }));
      glowBorder.position.set(0, 3.5, -34.4); scene.add(glowBorder);
      scene.add(neonLabel("MUSIC STAGE", "#00D4F0", 0, 7.8, -34.0, 7, 1.1));
      for (let a = 0; a < 12; a++) {
        const ang = -Math.PI / 2 + (a / 11) * Math.PI;
        const light = new Mesh(new SphereGeometry(0.12, 8, 6), new MeshBasicMaterial({ color: new Color(a % 2 === 0 ? "#C43BFF" : "#00D4F0"), transparent: true, opacity: 0.9 }));
        light.position.set(Math.cos(ang) * 7.2, 3.5 + Math.sin(ang) * 7.2, -34.3);
        scene.add(light);
      }

      // ── VIBE LOUNGE ──────────────────────────────────────────────────
      const loungePlat = new Mesh(new CircleGeometry(4.5, 32), new MeshStandardMaterial({ color: 0x181032, roughness: 0.3, metalness: 0.55 }));
      loungePlat.rotation.x = -Math.PI / 2; loungePlat.position.set(-22, 0.003, -26);
      scene.add(loungePlat);
      const loungeRings = [new THREE.RingGeometry(4.2, 4.5, 48), new THREE.RingGeometry(2.8, 3.0, 48)];
      const loungeColors = [0xC43BFF, 0xA078FF];
      loungeColors.forEach((color, i) => {
        const ring = new Mesh(loungeRings[i], new MeshBasicMaterial({ color: new Color(color), side: THREE.DoubleSide, transparent: true, opacity: i === 0 ? 0.5 : 0.25 }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(-22, 0.005 + i * 0.001, -26);
        scene.add(ring);
      });
      ["#C43BFF", "#00D4F0", "#A078FF", "#00E5FF"].forEach((hex, index) => {
        const seats = new Mesh(new PlaneGeometry(0.75, 0.55), new MeshStandardMaterial({ color: new Color(hex) }));
        seats.rotation.x = -Math.PI/2; scene.add(seats);
      });
      scene.add(neonLabel("VIBE LOUNGE", "#C43BFF", -22, 4.2, -26));

      // ── MUSIC LIBRARY ────────────────────────────────────────────────
      const libPlat = new Mesh(new CircleGeometry(4, 24), new MeshStandardMaterial({ color: 0x162040, roughness: 0.35, metalness: 0.35 }));
      libPlat.rotation.x = -Math.PI / 2; libPlat.position.set(22, 0.002, -20);
      scene.add(libPlat);
      const libTower = new Mesh(new CylinderGeometry(2.8, 3.0, 3.8, 12), new MeshStandardMaterial({ color: 0x1E2E4A, roughness: 0.3, metalness: 0.35 }));
      libTower.position.set(22, 1.9, -20); scene.add(libTower);
      [-Math.PI/2, 0, Math.PI/2].forEach(rot => {
        const ringMesh = new Mesh(new RingGeometry(2.85, 3.05, 24), new MeshBasicMaterial({ color: new Color("#00D4F0"), side: THREE.DoubleSide }));
        ringMesh.rotation.x = -Math.PI / 2; ringMesh.position.set(22, 1.5 + rot, -20);
        scene.add(ringMesh);
      });
      scene.add(neonLabel("MUSIC LIBRARY", "#00D4F0", 22, 4.0, -20));

      // ── VISUALIZER DOME ───────────────────────────────────────────────
      const domeMat = new MeshStandardMaterial({ color: 0x1A2540 });
      domeMat.roughness = 0.2; domeMat.metalness = 0.65; domeMat.transparent = true; domeMat.opacity = 0.75;
      const domeMesh = new Mesh(new SphereGeometry(3.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      domeMesh.position.set(-13, 0.05, 3); scene.add(domeMesh);
      for (let d = 0; d < 18; d++) {
        const ang = (d / 18) * Math.PI * 2;
        const dot = new Mesh(new SphereGeometry(0.09, 6, 4), new MeshBasicMaterial({ color: new Color([0xC43BFF, 0x00D4F0, 0xFF00FF][d % 3]) }));
        dot.position.set(-13 + Math.cos(ang) * 3.3, 1.5 + (d % 3) * 0.5, 3 + Math.sin(ang) * 3.3);
        scene.add(dot);
      }
      scene.add(neonLabel("VISUALIZER DOME", "#C43BFF", -13, 4.2, 3));

      // ── VIBE CHECK ────────────────────────────────────────────────────
      const vcPlat = new Mesh(new CircleGeometry(3, 32), new MeshStandardMaterial({ color: 0x142540 }));
      vcPlat.rotation.x = -Math.PI / 2; vcPlat.position.set(-16, 0.003, -13);
      scene.add(vcPlat);
      const vcDecal = new Mesh(new RingGeometry(2.85, 3.0, 48), new THREE.MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide }));
      vcDecal.rotation.x = -Math.PI / 2; vcDecal.position.set(-16, 0.005, -13);
      scene.add(vcDecal);
      scene.add(neonLabel("VIBE CHECK", "#00E5FF", -16, 4.2, -13));

      // ── VIBE ACADEMY ──────────────────────────────────────────────────
      const acad = new Mesh(new BoxGeometry(6, 3.5, 4.5), new MeshStandardMaterial({ color: 0x1A1030, roughness: 0.3, metalness: 0.4 }));
      acad.position.set(-28, 1.75, 5); scene.add(acad);
      const acadRoof = new Mesh(new SphereGeometry(0.6, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0x2A1A5A, roughness: 0.25, metalness: 0.6 }));
      acadRoof.position.set(-28, 3.95, 5); scene.add(acadRoof);
      const acadNeon = new Mesh(new BoxGeometry(6.6, 0.2, 1.2), new THREE.MeshBasicMaterial({ color: new Color("#7C3AED") }));
      acadNeon.position.set(-28, 3.7, 5 + 2.0); scene.add(acadNeon);
      scene.add(neonLabel("VIBE ACADEMY", "#9B7EFF", -28, 5.0, 5));

      // ── UPPER VIBE SHOP ──────────────────────────────────────────────────
      const shop = new Mesh(new BoxGeometry(5, 3.0, 4.0), new MeshStandardMaterial({ color: 0x1A1850, roughness: 0.2, metalness: 0.65 }));
      shop.position.set(0, 1.5, 10); scene.add(shop);
      const shopAccent = new Mesh(new BoxGeometry(5.2, 0.08, 4.2), new THREE.MeshBasicMaterial({ color: new Color("#00D4F0") }));
      shopAccent.position.set(0, 3.06, 10); scene.add(shopAccent);
      const shopSign = new Mesh(new BoxGeometry(3.5, 0.7, 0.08), new THREE.MeshBasicMaterial({ color: new Color("#00E5FF") }));
      shopSign.position.set(0, 3.5, 10.8); scene.add(shopSign);
      scene.add(neonLabel("UPPER VIBE SHOP", "#00E5FF", 0, 4.6, 10, 6, 1.0));

      // ── NEON SURF BEACH ─────────────────────────────────────────────────
      const hbSign = new Mesh(new BoxGeometry(1.5, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x1A1030, roughness: 0.3, metalness: 0.4 }));
      hbSign.position.set(28, 0.1, 23); scene.add(hbSign);
      const hbGlow = new Mesh(new BoxGeometry(1.55, 0.05, 6.1), new THREE.MeshBasicMaterial({ color: new Color("#F5A800"), transparent: true, opacity: 0.4 }));
      hbGlow.position.set(28, 0.17, 23); scene.add(hbGlow);
      scene.add(neonLabel("NEON SURF BEACH", "#F5A800", 28, 3.5, 23, 6, 0.95));

      // ── FERRIS WHEEL — on blacktop near Music Library ──────────────────────
      const WHEEL_X = 22, WHEEL_Z = -12, WHEEL_R = 7;
      const wheelHub = new Mesh(new CylinderGeometry(0.5, 0.5, 0.5, 8), new THREE.MeshBasicMaterial({ color: new Color("#00D4F0") }));
      wheelHub.position.set(WHEEL_X, WHEEL_R + 1.2, WHEEL_Z); scene.add(wheelHub);
      const wheelRim = new Mesh(new TorusGeometry(WHEEL_R, 0.15, 6, 32), new THREE.MeshBasicMaterial({ color: new Color("#00E5FF"), transparent: true, opacity: 0.85 }));
      wheelRim.position.set(WHEEL_X, WHEEL_R + 1.2, WHEEL_Z); wheelRim.rotation.y = Math.PI / 2; scene.add(wheelRim);
      const wheelRim2 = new Mesh(new TorusGeometry(WHEEL_R * 0.6, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: new Color("#C43BFF"), transparent: true, opacity: 0.6 }));
      wheelRim2.position.set(WHEEL_X, WHEEL_R + 1.2, WHEEL_Z); wheelRim2.rotation.y = Math.PI / 2; scene.add(wheelRim2);
      const cabinColors = [0x00D4F0, 0xC43BFF, 0xA078FF, 0x00E5FF, 0xF5A800, 0xFF00FF, 0x00FF88, 0x00B8FF];
      for (let ci = 0; ci < 8; ci++) {
        const ang = (ci / 8) * Math.PI * 2;
        const cabin = new Mesh(new BoxGeometry(0.7, 0.55, 0.7), new THREE.MeshBasicMaterial({ color: cabinColors[ci], transparent: true, opacity: 0.85 }));
        cabin.position.set(WHEEL_X + Math.sin(ang) * WHEEL_R, (WHEEL_R + 1.2) + Math.cos(ang) * WHEEL_R, WHEEL_Z);
        scene.add(cabin);
        wheelCabinMeshes.push(cabin);
      }
      const sides = [];
      for (const side of [-1, 1]) {
        const col = new Mesh(new CylinderGeometry(0.15, 0.2, WHEEL_R + 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x1E2A4A, roughness: 0.4, metalness: 0.5 }));
        col.position.set(WHEEL_X + side * 1.3, (WHEEL_R + 1.2) / 2, WHEEL_Z); scene.add(col);
        sides.push(col);
      }
      scene.add(neonLabel("NEON VIBE WHEEL", "#F5A800", WHEEL_X, WHEEL_R + 9.5, WHEEL_Z));

      // ── CRYSTAL ZONE ──────────────────────────────────────────────────
      for (let ci = 0; ci < 7; ci++) {
        const ang = (ci / 7) * Math.PI * 2;
        const ch = ci === 0 ? 4.2 : 1.5 + (ci % 4) * 0.5;
        const crystal = new Mesh(new ConeGeometry(0.05, ch, 8), new THREE.MeshStandardMaterial({ color: new Color(ci === 0 ? "#C43BFF" : "#9B4FFF"), roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 }));
        crystal.position.set(-26 + Math.cos(ang) * 1.4, ch / 2, -14 + Math.sin(ang) * 1.4);
        scene.add(crystal);
      }
      scene.add(neonLabel("CRYSTAL ZONE", "#C43BFF", -26, 5.2, -14));

      // ── PREVIEW FLYING RINGS ─────────────────────────────────────────────
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
        [-38, 0.18, -26, 0.5, "#C43BFF", 0.65],
        [38, 0.16, -20, 0.5, "#00D4F0", 0.65],
        [0, 0.2, -32, 5.5, "#9B4FFF", 0.55],
        [0, 0.2, -32, 6.5, "#1E2460", 0.4],
        [-38, 0.18, -26, 2.2, "#C43BFF", 0.55],
        [38, 0.18, -20, 2.2, "#00D4F0", 0.55],
        [-38, 0.14, 5, 2.4, "#9B7EFF", 0.5],
      ];
      ringData.forEach((data) => {
        const ring = new Mesh(new THREE.RingGeometry(data[3] - 0.1, data[3] + 0.08, 48), new THREE.MeshBasicMaterial({ color: new Color(data[4]), transparent: true, opacity: data[5], depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(data[0], data[1], data[2]);
        scene.add(ring);
      });

      // ── Pulsing glow orbs ────────────────────────────────────────────────
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

      // ── CINEMATIC NEON DOTS (foreground depth) ─────────────────────────────
      for (let i = 0; i < 16; i++) {
        const dot = new Mesh(new SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: new Color([0x00D4F0, 0xC43BFF, 0xA078FF][i % 3]), transparent: true, opacity: 0.4 + (i % 4) * 0.12 }));
        dot.position.set(-46 + i * 6, 0.6 + (i % 3) * 0.8, -40 + (i % 4) * 2);
        scene.add(dot);
      }

      // ── STARS IN THE SKY ──────────────────────────────────────────────────
      const starCount = 600;
      const starGeo = new BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      const starSizes = new Float32Array(starCount);
      for (let i = 0; i < starCount; i++) {
        // Spread across the night sky — centred above the city
        const rad = 6 + Math.random() * 14;
        const ang2 = Math.random() * Math.PI * 2;
        starPos[i * 3] = Math.cos(ang2) * rad + (Math.random() - 0.5) * 8;
        starPos[i * 3 + 1] = 10 + Math.random() * 18;
        starPos[i * 3 + 2] = -(30 + Math.random() * 20);
        starSizes[i] = 0.06 + Math.random() * 0.12;
      }
      starGeo.setAttribute("position", new BufferAttribute(starPos, 3));
      starGeo.setAttribute("size", new BufferAttribute(starSizes, 1));
      const starMat = new PointsMaterial({
        color: new Color("#ddeeff"),
        size: 0.18,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const stars = new Points(starGeo, starMat);
      scene.add(stars);
      const starMat2 = new PointsMaterial({
        color: new Color("#8899cc"),
        size: 0.10,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const stars2 = new Points(starGeo, starMat2);
      stars2.position.set(0, 0.15, 0);
      scene.add(stars2);

      // ── SKYLINE (real CitySkyline module) ─────────────────────────────────
      let skylineCleanup = null;
      try {
        skylineCleanup = createCitySkyline(scene);
      } catch (e) {
        // CitySkyline self-clears on import errors within itself; fallback visible from the
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
      camera.fov = 60;

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

        // Animate wheel
        if (wheelRim) wheelRim.rotation.z = t * 0.3;
        if (wheelRim2) wheelRim2.rotation.z = -t * 0.22;
        for (const cabin of wheelCabinMeshes) {
          const ang = (wheelCabinMeshes.indexOf(cabin) / 8) * Math.PI * 2 + t * 0.3;
          cabin.position.set(WHEEL_X + Math.sin(ang) * WHEEL_R, (WHEEL_R + 1.2) + Math.cos(ang) * WHEEL_R, WHEEL_Z);
          cabin.position.set(WHEEL_X + Math.sin(ang) * WHEEL_R, (WHEEL_R + 1.2) + Math.cos(ang) * WHEEL_R, WHEEL_Z);
        }

        // Pulse neon materials
        const pulsating = scene.userData.neonMats || [];
        for (const m of pulsating) {
          if (m) m.opacity = 0.65 + Math.sin(t * 1.8 + pulsating.indexOf(m) * 1.2) * 0.25;
        }

        // Pulse lights
        const pulseLights = [stageWash, loungeLight, plazaFill, domeLight].filter(Boolean);
        const offsets = [2.1, 1.7, 1.3, 1.9];
        for (const [i, light] of pulseLights.entries()) {
          if (light) light.intensity = (light === stageWash ? 5 : light === plazaFill ? 5 : 3) + Math.sin(t * offsets[i]) * 1.2;
        }
        // Orb float
        for (const [i, m] of orbMeshes.entries()) {
          const go = glowOrbs[i];
          if (go) {
            m.position.y = go.y + Math.sin(t * 1.2 + i * 1.5) * 0.5;
            m.material.opacity = 0.65 + Math.sin(t * 1.8 + i) * 0.2;
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
        stageVideoEl.pause();
        stageVideoEl.removeAttribute("src");
        stageVideoEl.load();
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