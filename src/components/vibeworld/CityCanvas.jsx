import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";

// Destructure immediately after namespace import to ensure full module load
const {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  Fog,
  PlaneGeometry,
  RingGeometry,
  CircleGeometry,
  CylinderGeometry,
  SphereGeometry,
  BoxGeometry,
  Vector3,
  Mesh,
  Group,
  DirectionalLight,
  AmbientLight,
  HemisphereLight,
  PCFSoftShadowMap,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points,
} = THREE;

// ─── CONSTANTS ────────────────────────────────────────────────
const MOVE_SPEED = 3.0;
const ACCELERATION = 10.0;
const DECELERATION = 8.0;
const TURN_SPEED = 8.0;
const ROTATION_SMOOTH = 6.0;
const WALK_CYCLE_SPEED = 7.0;

// Tree collisions — radius 0.6 per tree
const TREE_R = 0.5;
const COLLISION_BOXES = TREE_POSITIONS.map(([tx, tz]) => [tx, tz, TREE_R, TREE_R]);

// ─── UTILITIES ────────────────────────────────────────────────
function circleVsCircle(x1, z1, r1, x2, z2, r2) {
  const dx = x1 - x2, dz = z1 - z2;
  return dx * dx + dz * dz < (r1 + r2) * (r1 + r2);
}

function resolveCollisions(px, pz, r, boxes) {
  let x = px, z = pz;
  for (const [bx, bz, br] of boxes) {
    if (!circleVsCircle(x, z, r, bx, bz, br)) continue;
    const dx = x - bx, dz = z - bz;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const overlap = r + br - dist;
    x += (dx / dist) * overlap;
    z += (dz / dist) * overlap;
  }
  // Park boundary
  const d = Math.sqrt(x * x + z * z);
  if (d > PARK_RADIUS - r) {
    x = (x / d) * (PARK_RADIUS - r);
    z = (z / d) * (PARK_RADIUS - r);
  }
  return [x, z];
}

// ─── COLORS ───────────────────────────────────────────────────
function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

// ═══════════════════════════════════════════════════════════════
// BUILD SCENE: Simple outdoor park
// ═══════════════════════════════════════════════════════════════
function buildPark(scene) {
  // ─── SKY ────────────────────────────────────────────────────
  createCosmicSky(scene);

  // ─── GRASS GROUND ───────────────────────────────────────────
  const groundGeo = new PlaneGeometry(80, 80);
  const groundMat = mat("#4CAF50", { roughness: 0.85 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Inner walking area
  const innerGeo = new PlaneGeometry(PARK_RADIUS * 2, PARK_RADIUS * 2);
  const innerMat = mat("#5CB860", { roughness: 0.75 });
  const inner = new Mesh(innerGeo, innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = -0.005;
  inner.receiveShadow = true;
  scene.add(inner);

  // Dirt path circle
  const pathRing = new RingGeometry(12, 12.6, 64);
  const pathMat = mat("#C8A96E", { roughness: 0.9 });
  const path = new Mesh(pathRing, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.001;
  path.receiveShadow = true;
  scene.add(path);

  // Central dirt patch
  const centerGeo = new CircleGeometry(3, 32);
  const centerMat = mat("#C8A96E", { roughness: 0.9 });
  const center = new Mesh(centerGeo, centerMat);
  center.rotation.x = -Math.PI / 2;
  center.position.y = 0.002;
  center.receiveShadow = true;
  scene.add(center);

  // ─── TREES ──────────────────────────────────────────────────
  TREE_POSITIONS.forEach(([tx, tz, scale]) => {
    const tree = new Group();

    const trunkGeo = new CylinderGeometry(0.08 * scale, 0.12 * scale, 2 * scale, 8);
    const trunkMat = mat("#6D4C41", { roughness: 0.7 });
    const trunk = new Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const canopyColors = ["#388E3C", "#43A047", "#2E7D32"];
    for (let i = 0; i < 3; i++) {
      const canopyGeo = new SphereGeometry(0.6 * scale - i * 0.08, 8, 6);
      const canopyMat = mat(canopyColors[i], { roughness: 0.6 });
      const canopy = new Mesh(canopyGeo, canopyMat);
      canopy.position.y = 1.6 * scale + i * 0.35 * scale;
      canopy.position.x = (i - 1) * 0.15 * scale;
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      tree.add(canopy);
    }

    tree.position.set(tx, 0, tz);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
  });

  // ─── BUSHES ─────────────────────────────────────────────────
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 10;
    const bx = Math.cos(angle) * radius;
    const bz = Math.sin(angle) * radius;
    const bushGeo = new SphereGeometry(0.2 + Math.random() * 0.25, 6, 5);
    const bushMat = mat("#388E3C", { roughness: 0.55 });
    const bush = new Mesh(bushGeo, bushMat);
    bush.position.set(bx, 0.15, bz);
    bush.scale.set(1, 0.7, 1);
    bush.castShadow = true;
    bush.receiveShadow = true;
    scene.add(bush);
  }

  // ─── SMALL FLOWERS ──────────────────────────────────────────
  const flowerColors = ["#FFEB3B", "#FF9800", "#E91E63", "#9C27B0", "#FFFFFF"];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 14;
    const fx = Math.cos(angle) * radius;
    const fz = Math.sin(angle) * radius;

    const stemGeo = new CylinderGeometry(0.01, 0.01, 0.25, 4);
    const stemMat = mat("#388E3C");
    const stem = new Mesh(stemGeo, stemMat);
    stem.position.set(fx, 0.12, fz);
    scene.add(stem);

    const petalGeo = new SphereGeometry(0.03, 4, 4);
    const petalMat = mat(flowerColors[i % flowerColors.length]);
    const petal = new Mesh(petalGeo, petalMat);
    petal.position.set(fx, 0.26, fz);
    scene.add(petal);
  }

  // ─── BENCHES ────────────────────────────────────────────────
  const benchPositions = [
    [0, 5.5, 0], [0, -5.5, Math.PI], [5.5, 0, Math.PI / 2], [-5.5, 0, -Math.PI / 2],
  ];
  benchPositions.forEach(([bx, bz, rot]) => {
    const bench = new Group();
    const seatGeo = new BoxGeometry(2, 0.06, 0.5);
    const seatMat = mat("#8D6E63", { roughness: 0.5 });
    const seat = new Mesh(seatGeo, seatMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    bench.add(seat);
    for (let lx = -0.8; lx <= 0.8; lx += 1.6) {
      for (let lz = -0.15; lz <= 0.15; lz += 0.3) {
        const legGeo = new BoxGeometry(0.06, 0.42, 0.06);
        const legMat = mat("#5D4037", { roughness: 0.4 });
        const leg = new Mesh(legGeo, legMat);
        leg.position.set(lx, 0.21, lz);
        leg.castShadow = true;
        bench.add(leg);
      }
    }
    const backGeo = new BoxGeometry(2, 0.35, 0.05);
    const backMat = mat("#8D6E63", { roughness: 0.5 });
    const back = new Mesh(backGeo, backMat);
    back.position.set(0, 0.65, -0.22);
    back.castShadow = true;
    bench.add(back);
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rot;
    scene.add(bench);
  });

  // ─── LIGHTING ───────────────────────────────────────────────
  const sun = new DirectionalLight();
  sun.color = new Color("#FFF8E1");
  sun.intensity = 1.0;
  sun.position.set(10, 18, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const ambLight = new AmbientLight();
  ambLight.color = new Color("#2a2a5a");
  ambLight.intensity = 0.45;
  scene.add(ambLight);

  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#3a3090");
  hemiLight.groundColor = new Color("#1a3020");
  hemiLight.intensity = 0.25;
  scene.add(hemiLight);
}

// ═══════════════════════════════════════════════════════════════
// NEBULA BLUEPRINT — shared data for drawing/redrawing
// ═══════════════════════════════════════════════════════════════
const SKY_CANVAS_W = 1024;
const SKY_CANVAS_H = 512;

// Shared mutable state for nebula animation
let _nebulaCanvas = null;
let _nebulaCtx = null;
let _nebulaTex = null;

// ─── Reference palette ────────────────────────────────────────
// #050510 — near black (void)
// #2A0545 — deep purple
// #8A2BE2 — vibrant violet
// #00CED1 — bright cyan/turquoise
// #0A0A15 — horizon silhouette

// Wispy gas "strokes" — each is a chain of overlapping radial-gradient blobs
// that together form an irregular, trailing gas shape.
// A stroke has: baseColor {r,g,b}, centre anchor (cx,cy), and a list of blobs
// where each blob = [relX, relY, radius, alphaWeight]
const NEBULA_STROKES = [
  // ── CYAN CORE — bright hot centre (upper-left to mid) ──
  {
    baseColor: { r: 0, g: 206, b: 209 }, // #00CED1
    cx: 280, cy: 140,
    blobs: [
      [0, 0, 42, 0.95], [-18, -8, 32, 0.80], [20, -5, 38, 0.75],
      [-30, 12, 28, 0.65], [35, -15, 22, 0.55], [-12, -22, 26, 0.60],
      [8, 18, 24, 0.50], [-42, -4, 18, 0.40], [45, 6, 16, 0.35],
    ],
  },
  // ── CYAN TAIL — wispy trail extending right/down ──
  {
    baseColor: { r: 0, g: 170, b: 180 },
    cx: 500, cy: 200,
    blobs: [
      [0, 0, 35, 0.70], [-15, -6, 28, 0.58], [15, 4, 30, 0.52],
      [-30, 10, 22, 0.45], [28, 15, 20, 0.38], [-40, -8, 16, 0.30],
      [10, -16, 18, 0.33],
    ],
  },
  // ── VIOLET WING — upper-left purple/violet sweep ──
  {
    baseColor: { r: 138, g: 43, b: 226 }, // #8A2BE2
    cx: 200, cy: 85,
    blobs: [
      [0, 0, 38, 0.72], [-22, -10, 30, 0.58], [18, -6, 34, 0.52],
      [-35, 8, 24, 0.42], [10, -22, 26, 0.48], [-15, 18, 20, 0.35],
      [28, 10, 18, 0.32], [-45, -14, 15, 0.28],
    ],
  },
  // ── DEEP INDIGO — dark purple fade at edges ──
  {
    baseColor: { r: 42, g: 5, b: 69 }, // #2A0545
    cx: 350, cy: 170,
    blobs: [
      [0, 0, 55, 0.60], [-25, -12, 42, 0.48], [22, 8, 48, 0.42],
      [-40, 15, 36, 0.35], [30, -20, 32, 0.30], [-15, 25, 28, 0.28],
      [48, -6, 24, 0.25], [-50, -18, 20, 0.22], [15, -30, 26, 0.26],
    ],
  },
  // ── UPPER CYAN WHISPER — secondary bright streak ──
  {
    baseColor: { r: 30, g: 160, b: 210 },
    cx: 420, cy: 110,
    blobs: [
      [0, 0, 28, 0.55], [-12, -6, 22, 0.42], [14, 4, 24, 0.38],
      [-25, 10, 16, 0.30], [20, -12, 18, 0.32],
    ],
  },
  // ── FAR PURPLE EDGE — top-right fade ──
  {
    baseColor: { r: 60, g: 10, b: 100 },
    cx: 650, cy: 150,
    blobs: [
      [0, 0, 34, 0.40], [-18, -8, 26, 0.32], [16, 6, 28, 0.28],
      [-30, 12, 20, 0.22], [28, -14, 18, 0.20],
    ],
  },
  // ── DEEP PURPLE TAIL — far right ──
  {
    baseColor: { r: 35, g: 5, b: 55 },
    cx: 780, cy: 200,
    blobs: [
      [0, 0, 30, 0.36], [-15, -6, 22, 0.28], [14, 5, 24, 0.24],
      [-28, 10, 16, 0.18], [22, -12, 14, 0.16],
    ],
  },
  // ── LEFT EDGE INDIGO FADE ──
  {
    baseColor: { r: 20, g: 3, b: 55 },
    cx: 80, cy: 180,
    blobs: [
      [0, 0, 32, 0.42], [-12, -8, 24, 0.32], [14, 6, 26, 0.28],
      [-24, 10, 18, 0.22], [10, -16, 16, 0.18],
    ],
  },
];

function drawNebulaCanvas(time) {
  if (!_nebulaCtx) return;
  const ctx = _nebulaCtx;
  const W = SKY_CANVAS_W, H = SKY_CANVAS_H;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // ── Base: deep space void (#050510 near-black) ──
  ctx.fillStyle = "#050510";
  ctx.fillRect(0, 0, W, H);

  // ── Vertical gradient — pitch black at top, subtly lighter mid-sky, dark horizon ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, "#030308");
  skyGrad.addColorStop(0.25, "#050510");
  skyGrad.addColorStop(0.5, "#060615");
  skyGrad.addColorStop(0.75, "#0a0a1a");
  skyGrad.addColorStop(0.95, "#0a0a15"); // horizon silhouette
  skyGrad.addColorStop(1, "#080810");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Draw each wispy gas stroke ──
  NEBULA_STROKES.forEach((stroke) => {
    const phase = (stroke.cx * 0.7 + stroke.cy * 1.3) * 0.01;
    const driftX = Math.sin(time * 0.06 + phase) * 10;
    const driftY = Math.cos(time * 0.05 + phase * 1.4) * 6;
    const breathe = 1 + Math.sin(time * 0.10 + phase) * 0.05;
    const { r, g, b } = stroke.baseColor;

    stroke.blobs.forEach(([offX, offY, radius, alphaWeight]) => {
      const a = Math.min(1, alphaWeight * breathe);
      const sx = stroke.cx + driftX + offX;
      const sy = stroke.cy + driftY + offY;

      // Offset focus for directional, asymmetric wisps
      const focusAngle = (offX * 0.4 + offY * 0.35) % (Math.PI * 2);
      const focusX = sx + Math.cos(focusAngle) * radius * 0.18;
      const focusY = sy + Math.sin(focusAngle) * radius * 0.18;

      const grad = ctx.createRadialGradient(focusX, focusY, radius * 0.04, sx, sy, radius);
      grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.82})`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},${a * 0.38})`);
      grad.addColorStop(0.82, `rgba(${r},${g},${b},${a * 0.08})`);
      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;
      ctx.beginPath();
      // Slightly oval shapes for irregularity
      const rX = radius * (0.82 + Math.sin(offX * 0.4 + offY * 0.3) * 0.18);
      const rY = radius * (0.82 + Math.cos(offX * 0.35 - offY * 0.45) * 0.18);
      ctx.ellipse(sx, sy, rX, rY, focusAngle, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  if (_nebulaTex) _nebulaTex.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════════
// COSMIC SKY — stars, aurora, moon (nebula canvas drawn separately)
// ═══════════════════════════════════════════════════════════════
function createCosmicSky(scene) {
  // ─── Nebula background texture ───────────────────────────────
  _nebulaCanvas = document.createElement("canvas");
  _nebulaCanvas.width = SKY_CANVAS_W;
  _nebulaCanvas.height = SKY_CANVAS_H;
  _nebulaCtx = _nebulaCanvas.getContext("2d");

  // Initial draw
  drawNebulaCanvas(0);

  _nebulaTex = new THREE.CanvasTexture(_nebulaCanvas);
  _nebulaTex.colorSpace = THREE.SRGBColorSpace;
  _nebulaTex.needsUpdate = true; // Force initial upload

  // No scene.background — let the nebula overlay canvas show through the transparent renderer
  scene.fog = new Fog("#07071a", 20, 50);

  // ─── Stars — upper hemisphere only, dense high, sparse at horizon ──
  const starCount = 1600;
  const starPositions = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    // Bias toward zenith: use phi in [0, π/2] weighted upward
    // Square root bias pushes more stars toward the top
    const u = Math.random();
    const phi = Math.asin(Math.sqrt(u)) * (Math.PI / 2); // 0 at horizon, π/2 at zenith

    const r = 32 + Math.random() * 1.5;

    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi); // cos(phi) > 0 always, since phi ∈ [0, π/2]
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    // Stars near zenith get slightly larger sizes
    const heightFactor = Math.cos(phi); // 0 at zenith, 1 at horizon
    starSizes[i] = 0.25 + Math.random() * 2.4 + (1 - heightFactor) * 0.8;
  }

  const starsGeo = new BufferGeometry();
  starsGeo.setAttribute("position", new BufferAttribute(starPositions, 3));
  starsGeo.setAttribute("size", new BufferAttribute(starSizes, 1));

  const starsMat = new PointsMaterial({
    color: "#ffffff",
    size: 0.085,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const stars = new Points(starsGeo, starsMat);
  stars.name = "stars";
  stars.position.y = -8; // Shift hemisphere higher so horizon is mostly dark
  scene.add(stars);

  // ─── Moon ────────────────────────────────────────────────────
  const moonGroup = new Group();
  moonGroup.name = "moonGroup";
  moonGroup.position.set(-8, 10, 18);

  const moonGeo = new SphereGeometry(1.5, 32, 32);
  const moonMat = new MeshBasicMaterial({ color: "#f5edd8" });
  const moon = new Mesh(moonGeo, moonMat);
  moon.name = "moon";
  moonGroup.add(moon);

  // Moon glow halo
  const glowGeo = new SphereGeometry(2.2, 32, 32);
  const glowMat = new MeshBasicMaterial({
    color: "#f5edd8",
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });
  const glow = new Mesh(glowGeo, glowMat);
  glow.name = "moonGlow";
  moonGroup.add(glow);

  scene.add(moonGroup);

  // ─── Aurora waves ────────────────────────────────────────────
  const auroraGroup = new Group();
  auroraGroup.name = "auroraGroup";

  const auroraColors = [
    { hex: "#30ff70", opacity: 0.02 },
    { hex: "#7030ff", opacity: 0.018 },
    { hex: "#30a0ff", opacity: 0.02 },
    { hex: "#ff40a0", opacity: 0.012 },
  ];

  auroraColors.forEach(({ hex, opacity }, i) => {
    const auroraGeo = new PlaneGeometry(24, 3, 40, 1);
    const auroraMat = new MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wave = new Mesh(auroraGeo, auroraMat);
    wave.rotation.x = Math.PI / 2;
    wave.position.set(0, 9 + i * 2.2, 0);
    wave.name = "aurora" + i;
    auroraGroup.add(wave);
  });

  scene.add(auroraGroup);

  // ─── Atmosphere rim glow ─────────────────────────────────────
  const atmoGeo = new SphereGeometry(30, 32, 16);
  const atmoMat = new MeshBasicMaterial({
    color: "#3040ff",
    transparent: true,
    opacity: 0.012,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const atmo = new Mesh(atmoGeo, atmoMat);
  atmo.name = "atmosphereGlow";
  scene.add(atmo);
}

// ═══════════════════════════════════════════════════════════════
// BUILD LOW-POLY HUMANOID AVATAR (spheres, capsules — no boxes)
// ═══════════════════════════════════════════════════════════════
function createAvatar(scene) {
  const avatar = new Group();
  avatar.name = "avatar";

  // Material helpers
  const skinMat = () => mat("#FFD5C2", { roughness: 0.45 });
  const shirtMat = () => mat("#1565C0", { roughness: 0.3 });
  const pantsMat = () => mat("#1B5E20", { roughness: 0.35 });
  const shoeMat = () => mat("#3E2723", { roughness: 0.4 });
  const hairMat = () => mat("#3E2723", { roughness: 0.55 });
  const eyeMat = () => mat("#111111", { roughness: 0.1 });
  const darkShoe = () => mat("#1A1A1A", { roughness: 0.35 });

  function addMesh(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos);
    m.castShadow = casts;
    m.receiveShadow = casts;
    group.add(m);
    return m;
  }

  // ─── FEET ────────────────────────────────────────────────────
  function createFoot() {
    const foot = new Group();
    foot.name = "foot";
    // Shoe body (rounded cylinder for shoe shape)
    addMesh(foot, new CylinderGeometry(0.04, 0.05, 0.12, 8), darkShoe, new Vector3(0, 0.03, 0.05));
    // Sole (flat box)
    const sole = new Mesh(new BoxGeometry(0.11, 0.025, 0.16), shoeMat());
    sole.position.set(0, -0.02, 0.05);
    sole.castShadow = true;
    sole.receiveShadow = true;
    foot.add(sole);
    return foot;
  }

  // ─── LOWER LEG (knee to ankle) ──────────────────────────────
  function createLowerLeg() {
    const leg = new Group();
    leg.name = "lowerLeg";
    const len = 0.36;
    addMesh(leg, new CylinderGeometry(0.055, 0.065, len, 8), pantsMat, new Vector3(0, -len / 2, 0));

    const foot = createFoot();
    foot.position.set(0, -len - 0.01, 0);
    leg.add(foot);
    leg.userData.foot = foot;
    return leg;
  }

  // ─── UPPER LEG (hip to knee) ────────────────────────────────
  function createUpperLeg() {
    const leg = new Group();
    leg.name = "upperLeg";
    const len = 0.4;
    addMesh(leg, new CylinderGeometry(0.065, 0.075, len, 8), pantsMat, new Vector3(0, -len / 2, 0));

    const lowerLeg = createLowerLeg();
    lowerLeg.position.set(0, -len, 0);
    leg.add(lowerLeg);
    leg.userData.lowerLeg = lowerLeg;
    return leg;
  }

  // ─── HAND ────────────────────────────────────────────────────
  function createHand() {
    const hand = new Group();
    hand.name = "hand";
    addMesh(hand, new SphereGeometry(0.045, 6, 4), skinMat, new Vector3(0, 0, 0));
    return hand;
  }

  // ─── FOREARM (elbow to wrist) ───────────────────────────────
  function createForearm() {
    const arm = new Group();
    arm.name = "forearm";
    const len = 0.26;
    addMesh(arm, new CylinderGeometry(0.04, 0.05, len, 8), skinMat, new Vector3(0, -len / 2, 0));

    const hand = createHand();
    hand.position.set(0, -len, 0);
    arm.add(hand);
    arm.userData.hand = hand;
    return arm;
  }

  // ─── UPPER ARM (shoulder to elbow) ──────────────────────────
  function createUpperArm() {
    const arm = new Group();
    arm.name = "upperArm";
    const len = 0.3;
    addMesh(arm, new CylinderGeometry(0.045, 0.055, len, 8), skinMat, new Vector3(0, -len / 2, 0));

    const forearm = createForearm();
    forearm.position.set(0, -len, 0);
    arm.add(forearm);
    arm.userData.forearm = forearm;
    return arm;
  }

  // ─── TORSO (pelvis to shoulders) ────────────────────────────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";
  // Use a tapered shape: wider at top, narrower at waist
  // Main torso (wider at top, narrower at waist)
  addMesh(torsoGroup, new CylinderGeometry(0.13, 0.16, 0.38, 8), shirtMat, new Vector3(0, 0.22, 0));
  // Slightly wider chest
  addMesh(torsoGroup, new CylinderGeometry(0.16, 0.17, 0.1, 8), shirtMat, new Vector3(0, 0.44, 0));

  // ─── NECK ───────────────────────────────────────────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, 0.5, 0);
  addMesh(neckGroup, new CylinderGeometry(0.04, 0.05, 0.1, 8), skinMat, new Vector3(0, 0.05, 0));

  // ─── HEAD (sphere, eyes, hair) ──────────────────────────────
  const headGroup = new Group();
  headGroup.name = "head";
  headGroup.position.y = 0.1;

  // Head sphere
  addMesh(headGroup, new SphereGeometry(0.1, 12, 10), skinMat, new Vector3(0, 0.1, 0), true);

  // Eyes (positioned at front = +Z)
  for (let ex = -0.04; ex <= 0.04; ex += 0.08) {
    const eyeGeo = new SphereGeometry(0.015, 6, 4);
    const eye = new Mesh(eyeGeo, eyeMat());
    eye.position.set(ex, 0.12, 0.088);
    headGroup.add(eye);
    // Pupil highlight
    const pupilGeo = new SphereGeometry(0.005, 4, 3);
    const pupilMat = new MeshStandardMaterial();
    pupilMat.color = new Color("#FFFFFF");
    pupilMat.roughness = 0.1;
    const pupil = new Mesh(pupilGeo, pupilMat);
    pupil.position.set(ex, 0.122, 0.098);
    headGroup.add(pupil);
  }

  // Nose (tiny bump)
  addMesh(headGroup, new SphereGeometry(0.012, 4, 3), mat("#FFC0A8", { roughness: 0.5 }), new Vector3(0, 0.11, 0.1), false);

  // Hair on top
  addMesh(headGroup, new SphereGeometry(0.105, 8, 6), hairMat, new Vector3(0, 0.135, 0), false);

  // Cap
  addMesh(headGroup, new CylinderGeometry(0.07, 0.09, 0.06, 8), darkShoe, new Vector3(0, 0.17, 0.02), false);
  addMesh(headGroup, new BoxGeometry(0.14, 0.015, 0.07), darkShoe, new Vector3(0, 0.17, 0.08), false);

  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS ──────────────────────────────────────────────
  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-0.19, 0.48, 0);
  const leftArm = createUpperArm();
  leftArm.position.set(0, 0, 0);
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(0.19, 0.48, 0);
  const rightArm = createUpperArm();
  rightArm.position.set(0, 0, 0);
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ───────────────────────────────────────────────────
  const PELVIS_Y = 0.0; // hips pivot at pelvis level

  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-0.08, PELVIS_Y, 0);
  const leftLeg = createUpperLeg();
  leftLeg.position.set(0, 0, 0);
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(0.08, PELVIS_Y, 0);
  const rightLeg = createUpperLeg();
  rightLeg.position.set(0, 0, 0);
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // ─── SHADOW DISC ────────────────────────────────────────────
  const shadowGeo = new CircleGeometry(0.18, 16);
  const shadowDiscMat = new MeshBasicMaterial();
  shadowDiscMat.color = new Color("#000000");
  shadowDiscMat.transparent = true;
  shadowDiscMat.opacity = 0.22;
  shadowDiscMat.depthWrite = false;
  const shadowDisc = new Mesh(shadowGeo, shadowDiscMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.88;
  shadowDisc.name = "shadow";
  torsoGroup.add(shadowDisc);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);

  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// MOBILE VIRTUAL JOYSTICK — visible dual-touch controls
// ═══════════════════════════════════════════════════════════════
function VirtualJoystick({ onMove, onCameraDelta }) {
  const MAX_R = 45;
  const JOY_BASE_X = 75;
  const JOY_BASE_Y_OFFSET = 200;

  const [thumbX, setThumbX] = useState(0);
  const [thumbY, setThumbY] = useState(0);
  const [joyActive, setJoyActive] = useState(false);

  const joyTouchId = useRef(null);
  const camTouchId = useRef(null);
  const camBaseRef = useRef({ x: 0, y: 0 });

  const findJoyY = useCallback(() => window.innerHeight - JOY_BASE_Y_OFFSET, []);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    for (const t of [...e.changedTouches]) {
      if (t.clientX < window.innerWidth / 2 && joyTouchId.current === null) {
        joyTouchId.current = t.identifier;
      } else if (t.clientX >= window.innerWidth / 2 && camTouchId.current === null) {
        camTouchId.current = t.identifier;
        camBaseRef.current = { x: t.clientX, y: t.clientY };
      }
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const baseY = findJoyY();
    for (const t of [...e.touches]) {
      if (t.identifier === joyTouchId.current) {
        let dx = t.clientX - JOY_BASE_X;
        let dy = baseY - t.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_R) { dx = (dx / dist) * MAX_R; dy = (dy / dist) * MAX_R; }
        setThumbX(dx);
        setThumbY(dy);
        setJoyActive(dist > 8);
        onMove?.(dx / MAX_R, dy / MAX_R);
      }
      if (t.identifier === camTouchId.current) {
        const dx = t.clientX - camBaseRef.current.x;
        onCameraDelta?.(dx);
        camBaseRef.current = { x: t.clientX, y: t.clientY };
      }
    }
  }, [onMove, onCameraDelta, findJoyY]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    for (const t of [...e.changedTouches]) {
      if (t.identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setJoyActive(false);
        setThumbX(0);
        setThumbY(0);
        onMove?.(0, 0);
      }
      if (t.identifier === camTouchId.current) {
        camTouchId.current = null;
      }
    }
  }, [onMove]);

  return (
    <>
      {/* Touch capture layer */}
      <div
        className="absolute inset-0 z-50"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {/* Joystick visual — bottom-left */}
      <div
        className="absolute z-40 rounded-full flex items-center justify-center pointer-events-none"
        style={{
          width: 100, height: 100,
          left: JOY_BASE_X - 50,
          top: findJoyY() - 50,
          background: joyActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
          border: `2px solid ${joyActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)"}`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: 52, height: 52,
            background: joyActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            transform: `translate(${thumbX}px, ${-thumbY}px)`,
          }}
        />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded }) {
  const canvasRef = useRef(null);
  const nebulaOverlayRef = useRef(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);
    isMobileRef.current = mobile;
    if (mobile) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, []);

  const sceneRef = useRef(null);
  const avatarRef = useRef(null);
  const avatarPosRef = useRef([...SPAWN, 0]); // [x, y, z, rotY]
  const velocityRef = useRef({ x: 0, z: 0 });
  const targetRotRef = useRef(0);
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0 });
  const animRef = useRef({
    walkTime: 0,
    isMoving: false,
    speed: 0,
    prevWalkTime: 0,
  });
  const isMobileRef = useRef(false);
  const mobileInputRef = useRef({ x: 0, y: 0, camDx: 0 });
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const initializedRef = useRef(false);

  // Init scene — runs once only
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Sanity-check that THREE loaded properly
      if (typeof MeshStandardMaterial !== "function") {
        throw new Error("Three.js MeshStandardMaterial unavailable — check your bundle");
      }

      const renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,        // Transparent so nebula canvas shows through
        premultipliedAlpha: false,
      });
      renderer.setClearColor(0x000000, 0); // Fully transparent clear
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      // Use window dimensions on mobile for reliable viewport sizing
      const rw = isMobileRef.current ? window.innerWidth : canvas.clientWidth;
      const rh = isMobileRef.current ? window.innerHeight : canvas.clientHeight;
      renderer.setSize(rw, Math.max(rh, 1));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;

      const scene = new Scene();
      sceneRef.current = scene;

      const asp = rw / Math.max(rh, 1);
      const camera = new PerspectiveCamera(55, asp, 0.1, 80);
      // Start camera behind avatar (same as animation loop will use)
      const initCamDist = 5;
      const initCamHeight = 2.5;
      const initLookY = 1.5;
      camera.position.set(SPAWN[0], SPAWN[1] + initCamHeight, SPAWN[2] - initCamDist);
      camera.lookAt(SPAWN[0], SPAWN[1] + initLookY, SPAWN[2]);

      buildPark(scene);
      const avatar = createAvatar(scene);
      avatarRef.current = avatar;

      let torso = null;
      let leftShoulder = null;
      let rightShoulder = null;
      let leftHip = null;
      let rightHip = null;
      avatar.traverse((child) => {
        if (child.name === "torso") torso = child;
        if (child.name === "leftShoulder") leftShoulder = child;
        if (child.name === "rightShoulder") rightShoulder = child;
        if (child.name === "leftHip") leftHip = child;
        if (child.name === "rightHip") rightHip = child;
      });

      const animParts = { torso, leftShoulder, rightShoulder, leftHip, rightHip };

      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);

        // Real delta time
        const now = performance.now() * 0.001;
        if (lastTimeRef.current === 0) lastTimeRef.current = now;
        let dt = now - lastTimeRef.current;
        lastTimeRef.current = now;
        if (dt > 0.1) dt = 0.1; // Clamp large gaps
        if (dt <= 0) dt = 0.016;

        const t = now;
        const keys = keysRef.current;
        const mouse = mouseRef.current;
        let [px, py, pz, rot] = avatarPosRef.current;
        const vel = velocityRef.current;

        // ─── INPUT ──────────────────────────────────────────────
        let inputX = 0, inputZ = 0;
        let turnInput = 0;

        if (isMobileRef.current) {
          const joy = mobileInputRef.current;
          // Joystick Y = forward/backward (up=forward, down=backward)
          if (Math.abs(joy.y) > 0.08) {
            inputX += Math.sin(rot) * joy.y;
            inputZ += Math.cos(rot) * joy.y;
          }
          // Joystick X = rotation (left=turn left, right=turn right)
          turnInput = -joy.x;
          // Camera swipe on right side
          if (Math.abs(joy.camDx) > 0.0005) {
            rot += joy.camDx;
            targetRotRef.current = rot;
            joy.camDx *= 0.85;
          }
        } else {
          // Forward / Backward — relative to facing direction
          if (keys.w || keys.arrowup) { inputX += Math.sin(rot); inputZ += Math.cos(rot); }
          if (keys.s || keys.arrowdown) { inputX -= Math.sin(rot); inputZ -= Math.cos(rot); }
          // Rotate left / right — affects rotation only, not position
          // Three.js Y-axis: positive = counterclockwise (left turn)
          if (keys.a || keys.arrowleft) turnInput = 1;
          if (keys.d || keys.arrowright) turnInput = -1;
        }

        const inputMag = Math.sqrt(inputX * inputX + inputZ * inputZ);
        const isMoving = inputMag > 0.1;
        const isTurning = Math.abs(turnInput) > 0.01;

        // ─── MOUSE LOOK ─────────────────────────────────────────
        if (mouse.down) {
          rot += mouse.dx * 0.004;
          targetRotRef.current = rot;
          mouse.dx = 0;
        }

        // ─── TURNING (A/D keys) ─────────────────────────────────
        if (isTurning) {
          rot += turnInput * TURN_SPEED * dt;
          targetRotRef.current = rot;
        }

        // ─── VELOCITY WITH SMOOTH ACCEL/DECEL ──────────────────
        if (isMoving) {
          inputX /= inputMag;
          inputZ /= inputMag;

          // Only auto-face toward movement when moving forward
          // (don't rotate when moving backward or while manually turning)
          const moveDot = inputX * Math.sin(rot) + inputZ * Math.cos(rot);
          if (!isTurning && moveDot > -0.3) {
            const moveAngle = Math.atan2(inputX, inputZ);
            targetRotRef.current = moveAngle;
          }

          // Accelerate
          vel.x += (inputX * MOVE_SPEED - vel.x) * Math.min(1, ACCELERATION * dt);
          vel.z += (inputZ * MOVE_SPEED - vel.z) * Math.min(1, ACCELERATION * dt);
        } else {
          // Decelerate
          vel.x += (0 - vel.x) * Math.min(1, DECELERATION * dt);
          vel.z += (0 - vel.z) * Math.min(1, DECELERATION * dt);
        }

        // Smoother rotation lerp
        let targetRot = targetRotRef.current;
        // Wrap angle difference
        let diff = targetRot - rot;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        rot += diff * Math.min(1, ROTATION_SMOOTH * dt);

        // Apply velocity
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        px += vel.x * dt;
        pz += vel.z * dt;

        // Collisions
        [px, pz] = resolveCollisions(px, pz, 0.3, COLLISION_BOXES);

        // Ground clamp
        py = SPAWN[1];

        avatarPosRef.current = [px, py, pz, rot];
        avatar.position.set(px, py, pz);
        avatar.rotation.y = rot;

        // ─── CAMERA (third-person, locked to avatar every frame) ──
        const camDist = 5;
        const camHeight = 2.5;
        const lookY = 1.5;
        // cameraPosition = avatar.position - avatar.forward * camDist + (0, camHeight, 0)
        camera.position.set(
          px - Math.sin(rot) * camDist,
          py + camHeight,
          pz - Math.cos(rot) * camDist,
        );
        camera.lookAt(px, py + lookY, pz);

        // ═════════════════════════════════════════════════════════
        // ANIMATION SYSTEM
        // ═════════════════════════════════════════════════════════
        const anim = animRef.current;
        anim.isMoving = speed > 0.1;

        // Detect backward movement for walk cycle direction reversal
        const facingDot = vel.x * Math.sin(rot) + vel.z * Math.cos(rot);
        const isBackward = facingDot < -0.15;
        const walkDir = isBackward ? -1 : 1;

        if (anim.isMoving) {
          anim.walkTime += speed * WALK_CYCLE_SPEED * walkDir * dt;
          anim.speed = Math.min(1, anim.speed + dt * 6);
        } else {
          anim.walkTime += anim.prevWalkTime * 0.3 * dt;
          anim.speed = Math.max(0, anim.speed - dt * 4);
        }
        anim.prevWalkTime = anim.isMoving ? speed * WALK_CYCLE_SPEED * walkDir : 0;

        const wt = anim.walkTime;
        const s = anim.speed;

        // ─── TORSO ──────────────────────────────────────────────
        if (animParts.torso) {
          const bob = Math.abs(Math.sin(wt * 2)) * 0.035 * s;
          const lean = vel.x * 0.015;
          const leanZ = vel.z * 0.015;
          animParts.torso.position.y = bob;
          animParts.torso.rotation.x = leanZ;
          animParts.torso.rotation.z = lean;
        }

        // ─── LEGS ───────────────────────────────────────────────
        // Hip rotation: smooth sine wave, opposing legs
        const hipAngle = Math.sin(wt) * 0.5 * s;

        if (animParts.leftHip) animParts.leftHip.rotation.x = hipAngle;
        if (animParts.rightHip) animParts.rightHip.rotation.x = -hipAngle;

        // Knee bend: bend when leg is forward (lifting foot), straight when planted
        // Left knee bends when left hip is forward (wt: π/2 → 3π/2, sin > 0 means forward)
        const lkneeAngle = Math.max(0, Math.sin(wt)) * 0.6 * s;
        const rkneeAngle = Math.max(0, -Math.sin(wt)) * 0.6 * s;

        const llLeg = animParts.leftHip?.userData?.leg?.userData?.lowerLeg;
        const rlLeg = animParts.rightHip?.userData?.leg?.userData?.lowerLeg;
        if (llLeg) llLeg.rotation.x = lkneeAngle;
        if (rlLeg) rlLeg.rotation.x = rkneeAngle;

        // ─── ARMS ───────────────────────────────────────────────
        // Shoulder swing: opposite to same-side leg (right arm with left leg)
        const shoulderAngle = Math.sin(wt) * 0.45 * s;

        if (animParts.leftShoulder) animParts.leftShoulder.rotation.x = -shoulderAngle;
        if (animParts.rightShoulder) animParts.rightShoulder.rotation.x = shoulderAngle;

        // Forearm bend: slight bend when arm swings back
        const larmForearm = animParts.leftShoulder?.userData?.arm?.userData?.forearm;
        const rarmForearm = animParts.rightShoulder?.userData?.arm?.userData?.forearm;
        const forearmBend = Math.max(0, Math.sin(wt)) * 0.35 * s;
        const forearmBendR = Math.max(0, -Math.sin(wt)) * 0.35 * s;
        if (larmForearm) larmForearm.rotation.x = forearmBendR;
        if (rarmForearm) rarmForearm.rotation.x = forearmBend;

        // Torso breathing when idle
        if (!anim.isMoving) {
          const breathe = Math.sin(t * 1.8) * 0.012;
          if (animParts.torso) animParts.torso.scale.y = 1 + breathe;
          // Gentle arm sway at rest
          const idleSway = Math.sin(t * 0.8) * 0.04;
          if (animParts.leftShoulder) {
            animParts.leftShoulder.rotation.x += (-0.12 - animParts.leftShoulder.rotation.x) * dt * 3;
            animParts.leftShoulder.rotation.z += (idleSway - animParts.leftShoulder.rotation.z) * dt * 3;
          }
          if (animParts.rightShoulder) {
            animParts.rightShoulder.rotation.x += (-0.12 - animParts.rightShoulder.rotation.x) * dt * 3;
            animParts.rightShoulder.rotation.z += (-idleSway - animParts.rightShoulder.rotation.z) * dt * 3;
          }
        } else {
          // Reset shoulder Z during walk
          if (animParts.leftShoulder) animParts.leftShoulder.rotation.z += (0 - animParts.leftShoulder.rotation.z) * dt * 5;
          if (animParts.rightShoulder) animParts.rightShoulder.rotation.z += (0 - animParts.rightShoulder.rotation.z) * dt * 5;
        }

        // ─── SKY ANIMATIONS ────────────────────────────────────

        // Redraw nebula canvas at ~2fps for smooth drift
        if (frameRef.current % 30 === 0) {
          drawNebulaCanvas(t);
        }

        // Copy nebula to overlay canvas every frame
        if (_nebulaCanvas && nebulaOverlayRef.current) {
          const ovCtx = nebulaOverlayRef.current.getContext("2d");
          if (ovCtx) {
            const dpr = Math.min(window.devicePixelRatio, 2);
            nebulaOverlayRef.current.width = nebulaOverlayRef.current.clientWidth * dpr;
            nebulaOverlayRef.current.height = nebulaOverlayRef.current.clientHeight * dpr;
            ovCtx.drawImage(_nebulaCanvas, 0, 0, nebulaOverlayRef.current.width, nebulaOverlayRef.current.height);
          }
        }

        // Aurora waves — gentle floating movement
        const auroraGroup = scene.getObjectByName("auroraGroup");
        if (auroraGroup) {
          auroraGroup.children.forEach((wave, i) => {
            const off = i * 2.5;
            wave.position.z = Math.sin(t * 0.22 + off) * 3.5;
            wave.material.opacity = 0.012 + Math.sin(t * 0.35 + off * 1.3) * 0.008;
          });
        }

        // Stars twinkle — soft opacity oscillation
        const starsObj = scene.getObjectByName("stars");
        if (starsObj && starsObj.material) {
          starsObj.material.opacity = 0.72 + Math.sin(t * 1.3) * 0.1 + Math.sin(t * 2.7 + 0.8) * 0.05;
        }

        // Subtle moon wobble
        const moonGrp = scene.getObjectByName("moonGroup");
        if (moonGrp) {
          moonGrp.position.y = 10 + Math.sin(t * 0.15) * 0.5;
          moonGrp.position.x = -8 + Math.cos(t * 0.12) * 0.8;
        }

        renderer.render(scene, camera);
        frameRef.current++;

        if (frameRef.current === 3) onLoadedRef.current?.();
      };

      animate();

      const onResize = () => {
        if (!canvas) return;
        const w = isMobileRef.current ? window.innerWidth : canvas.clientWidth;
        const h = isMobileRef.current ? window.innerHeight : canvas.clientHeight;
        renderer.setSize(w, Math.max(h, 1));
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();

        // Resize nebula overlay
        if (nebulaOverlayRef.current) {
          const dpr = Math.min(window.devicePixelRatio, 2);
          nebulaOverlayRef.current.width = nebulaOverlayRef.current.clientWidth * dpr;
          nebulaOverlayRef.current.height = nebulaOverlayRef.current.clientHeight * dpr;
          // Redraw nebula to fill the new size
          drawNebulaCanvas(performance.now() * 0.001);
          const ovCtx = nebulaOverlayRef.current.getContext("2d");
          if (ovCtx && _nebulaCanvas) {
            ovCtx.drawImage(_nebulaCanvas, 0, 0, nebulaOverlayRef.current.width, nebulaOverlayRef.current.height);
          }
        }
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        initializedRef.current = false; // Allow re-init on React Strict Mode remount
        lastTimeRef.current = 0;
        frameRef.current = 0;
        avatarRef.current = null;
        sceneRef.current = null;
        _nebulaCanvas = null;
        _nebulaCtx = null;
        _nebulaTex = null;
        // Clear nebula overlay canvas
        if (nebulaOverlayRef.current) {
          const oc = nebulaOverlayRef.current.getContext("2d");
          if (oc) oc.clearRect(0, 0, nebulaOverlayRef.current.width, nebulaOverlayRef.current.height);
        }
        // skyDome disposed by scene.traverse above
      };
    } catch (e) {
      console.error("[CityCanvas] init error:", e);
      setError(e.message || String(e));
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const onDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Mouse
  useEffect(() => {
    const onDown = (e) => {
      if (e.target === canvasRef.current) {
        mouseRef.current.down = true;
      }
    };
    const onUp = () => { mouseRef.current.down = false; };
    const onMove = (e) => {
      if (mouseRef.current.down) {
        mouseRef.current.dx += e.movementX;
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // Mobile joystick handlers — store analog values for the animation loop
  const handleJoystickMove = useCallback((jx, jy) => {
    mobileInputRef.current.x = jx;
    mobileInputRef.current.y = jy;
  }, []);

  const handleCameraDelta = useCallback((dx) => {
    mobileInputRef.current.camDx += dx * 0.005;
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-sky-200">
        <div className="text-center px-6">
          <p className="text-red-600 font-bold text-sm mb-2">3D Error</p>
          <p className="text-xs text-gray-500 mb-4 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: isMobile ? "100vw" : "100%",
        height: isMobile ? "100dvh" : "100%",
      }}
    >
      {/* Nebula background canvas — renders behind the 3D canvas */}
      <canvas
        ref={nebulaOverlayRef}
        className="absolute inset-0 w-full h-full block"
        style={{ pointerEvents: "none", zIndex: 0 }}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full block relative"
        style={{ touchAction: "none", zIndex: 1 }}
      />
      {isMobile && (
        <VirtualJoystick
          onMove={handleJoystickMove}
          onCameraDelta={handleCameraDelta}
        />
      )}
    </div>
  );
}