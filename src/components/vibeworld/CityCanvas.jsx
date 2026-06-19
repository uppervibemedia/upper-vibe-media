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
  PointLight,
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

  // Beach shoreline boundary — stop at water's edge
  const SHORELINE_Z = -8;
  const BEACH_MAX_X = 17;
  if (z < -5) {
    if (z < SHORELINE_Z) z = SHORELINE_Z;
    if (x < -BEACH_MAX_X) x = -BEACH_MAX_X;
    if (x > BEACH_MAX_X) x = BEACH_MAX_X;
  }

  // Circular boundary for rest of the park
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

  // ─── BEACH & OCEAN (South side — cosmic shoreline lookout) ─────
  const SHORELINE_Z = -8;
  const OCEAN_DEPTH = 38;

  // ─── SAND ZONES (warm natural tones, cosmic-tinted) ─────────

  // Dry sand — warm golden, catches moonlight
  const drySandGeo = new PlaneGeometry(38, 6);
  const drySandMat = mat("#D4B896", { roughness: 0.62 });
  const drySand = new Mesh(drySandGeo, drySandMat);
  drySand.rotation.x = -Math.PI / 2;
  drySand.position.set(0, 0.002, -2);
  drySand.receiveShadow = true;
  drySand.name = "drySand";
  scene.add(drySand);

  // Mid sand — slightly deeper tone for depth variation
  const midSandGeo = new PlaneGeometry(38, 3);
  const midSandMat = mat("#C4A882", { roughness: 0.55 });
  const midSand = new Mesh(midSandGeo, midSandMat);
  midSand.rotation.x = -Math.PI / 2;
  midSand.position.set(0, 0.003, -5.5);
  midSand.receiveShadow = true;
  scene.add(midSand);

  // Wet sand — darker, slightly metallic to catch cosmic shimmer
  const wetSandGeo = new PlaneGeometry(40, 3.5);
  const wetSandMat = mat("#A89078", { roughness: 0.32, metalness: 0.12 });
  const wetSand = new Mesh(wetSandGeo, wetSandMat);
  wetSand.rotation.x = -Math.PI / 2;
  wetSand.position.set(0, 0.004, SHORELINE_Z + 0.8);
  wetSand.receiveShadow = true;
  wetSand.name = "wetSand";
  scene.add(wetSand);

  // Scattered sand patches — natural grass-to-sand transition near player
  for (let i = 0; i < 12; i++) {
    const px = (Math.random() - 0.5) * 34;
    const pz = 0.5 + Math.random() * 3.5;
    const r = 0.3 + Math.random() * 1.1;
    const patchGeo = new CircleGeometry(r, 12);
    const shade = Math.random() > 0.5 ? "#DEC8A8" : "#C8B090";
    const patchMat = mat(shade, { roughness: 0.66 });
    const patch = new Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(px, 0.006, pz);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  // ─── SHALLOW WATER — lighter cosmic blue, semi-transparent ──
  const shallowGeo = new PlaneGeometry(42, 4, 28, 8);
  const shallowMat = new MeshStandardMaterial();
  shallowMat.color = new Color("#1A3058");
  shallowMat.roughness = 0.06;
  shallowMat.metalness = 0.5;
  shallowMat.transparent = true;
  shallowMat.opacity = 0.72;
  shallowMat.depthWrite = true;
  const shallow = new Mesh(shallowGeo, shallowMat);
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.set(0, -0.07, SHORELINE_Z - 2);
  shallow.receiveShadow = true;
  shallow.name = "shallow";
  scene.add(shallow);
  scene.userData.shallow = shallow;

  // ─── DEEP OCEAN — rich dark blue-violet with subtle cyan tint ─
  const oceanGeo = new PlaneGeometry(52, OCEAN_DEPTH, 42, 18);
  const oceanMat = new MeshStandardMaterial();
  oceanMat.color = new Color("#081C36");
  oceanMat.roughness = 0.05;
  oceanMat.metalness = 0.84;
  oceanMat.transparent = true;
  oceanMat.opacity = 0.92;
  oceanMat.depthWrite = true;
  const ocean = new Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.13, SHORELINE_Z - 2 - OCEAN_DEPTH / 2);
  ocean.receiveShadow = true;
  ocean.name = "ocean";
  scene.add(ocean);
  scene.userData.ocean = ocean;

  // Foam edge — soft pale cosmic blue at shoreline
  const foamGeo = new PlaneGeometry(42, 1.2);
  const foamMat = new MeshBasicMaterial();
  foamMat.color = new Color("#7EA8CC");
  foamMat.transparent = true;
  foamMat.opacity = 0.32;
  foamMat.depthWrite = false;
  const foam = new Mesh(foamGeo, foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.006, SHORELINE_Z);
  foam.name = "foam";
  scene.add(foam);
  scene.userData.foam = foam;

  // ─── LIGHTING (cosmic night — nebula purple/blue mood) ─────────
  const moon = new DirectionalLight();
  moon.color = new Color("#7B9EC7"); // Cool pale blue moonlight
  moon.intensity = 0.55;
  moon.position.set(15, 22, -8);
  moon.castShadow = true;
  moon.shadow.mapSize.width = 2048;
  moon.shadow.mapSize.height = 2048;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 60;
  moon.shadow.camera.left = -20;
  moon.shadow.camera.right = 20;
  moon.shadow.camera.top = 20;
  moon.shadow.camera.bottom = -20;
  moon.shadow.bias = -0.0003;
  scene.add(moon);

  const ambLight = new AmbientLight();
  ambLight.color = new Color("#3D2E6E"); // Deep nebula purple
  ambLight.intensity = 0.55;
  scene.add(ambLight);

  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#6B5CAA");     // Vivid purple-blue nebula sky
  hemiLight.groundColor = new Color("#1A2430"); // Cool dark blue ground bounce
  hemiLight.intensity = 0.35;
  scene.add(hemiLight);

  // ─── BEACH SHIMMER — subtle purple-blue point light near shoreline ──
  const beachLight = new PointLight();
  beachLight.color = new Color("#5A5088");
  beachLight.intensity = 1.8;
  beachLight.distance = 18;
  beachLight.position.set(0, 2.5, -7);
  scene.add(beachLight);

  // ─── TWINKLING STARS ─────────────────────────────────────
  createStarField(scene);
}

// ═══════════════════════════════════════════════════════════════
// TWINKLING STAR FIELD — small lights over the sky
// ═══════════════════════════════════════════════════════════════
function createStarField(scene) {
  const starCanvas = document.createElement("canvas");
  starCanvas.width = 32;
  starCanvas.height = 32;
  const ctx = starCanvas.getContext("2d");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.08, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.3, "rgba(200,215,255,0.35)");
  gradient.addColorStop(0.6, "rgba(140,160,255,0.06)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const starTex = new THREE.CanvasTexture(starCanvas);

  const starCount = 180;
  const starGeo = new BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const phases = new Float32Array(starCount); // per-star twinkle phase
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 14 + Math.random() * 24;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 7 + Math.random() * 18;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    phases[i] = Math.random() * Math.PI * 2;
  }
  starGeo.setAttribute("position", new BufferAttribute(positions, 3));
  starGeo.userData = { phases };

  const starMat = new PointsMaterial();
  starMat.map = starTex;
  starMat.color = new Color("#DDE4FF");
  starMat.size = 0.35;
  starMat.transparent = true;
  starMat.opacity = 0.55;
  starMat.depthWrite = false;
  starMat.blending = THREE.AdditiveBlending;

  const stars = new Points(starGeo, starMat);
  stars.name = "stars";
  stars.renderOrder = 0;
  scene.add(stars);
  scene.userData.stars = stars;
}

// ═══════════════════════════════════════════════════════════════
// DIRECTIONAL SKY IMAGES — four unique deep-space cosmic views
// ═══════════════════════════════════════════════════════════════
const BASE = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154";
const SKY_FORWARD = `${BASE}/12edd43a9_ChatGPTImageJun19202611_55_16AM.png`;   // No planet — North/Forward
const SKY_RIGHT   = `${BASE}/df9a0847f_ChatGPTImageJun19202612_41_21PM.png`;   // Full planet (centered) — East/Right
const SKY_BACK    = `${BASE}/5b01fc961_ChatGPTImageJun19202611_55_39AM.png`;   // No planet — South/Back
const SKY_LEFT    = `${BASE}/e7caceb54_ChatGPTImageJun19202612_41_07PM.png`;   // Ringed planet + moon — West/Left

// ═══════════════════════════════════════════════════════════════
// COSMIC SKYBOX — camera-centered cube, BackSide textures
// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
//
// Direction order (planets separated by non-planet views):
//   Forward (+Z) = no planet  →  Right (+X) = planet
//   Back    (-Z) = no planet  →  Left  (-X) = planet
// ═══════════════════════════════════════════════════════════════
function createCosmicSky(scene) {
  const loader = new THREE.TextureLoader();
  const SKYBOX_SIZE = 55;

  const loadTex = (url) => {
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  };

  // Four directional textures — planets only on East (+X) and West (-X)
  const texForward = loadTex(SKY_FORWARD);  // +Z = North / Forward — no planet
  const texRight   = loadTex(SKY_RIGHT);    // +X = East  / Right   — planet
  const texBack    = loadTex(SKY_BACK);     // -Z = South / Back    — no planet
  const texLeft    = loadTex(SKY_LEFT);     // -X = West  / Left    — planet

  // Top face: dark void (no image — keeps it clean)
  const topMat = new MeshBasicMaterial();
  topMat.color = new Color("#0a0a1e");
  topMat.side = THREE.BackSide;
  topMat.depthWrite = false;

  // Bottom face: deep void (underground, rarely visible)
  const bottomMat = new MeshBasicMaterial();
  bottomMat.color = new Color("#050510");
  bottomMat.side = THREE.BackSide;
  bottomMat.depthWrite = false;

  // Materials array in BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  const materials = [
    new MeshBasicMaterial({ map: texRight,   side: THREE.BackSide, depthWrite: false }), // +X = Right/East  (planet)
    new MeshBasicMaterial({ map: texLeft,    side: THREE.BackSide, depthWrite: false }), // -X = Left/West   (planet)
    topMat,                                                                             // +Y = Top
    bottomMat,                                                                          // -Y = Bottom
    new MeshBasicMaterial({ map: texForward, side: THREE.BackSide, depthWrite: false }), // +Z = Forward/North (no planet)
    new MeshBasicMaterial({ map: texBack,    side: THREE.BackSide, depthWrite: false }), // -Z = Back/South    (no planet)
  ];

  const skybox = new Mesh(new BoxGeometry(SKYBOX_SIZE, SKYBOX_SIZE, SKYBOX_SIZE), materials);
  skybox.name = "skybox";
  skybox.renderOrder = -1; // Always render behind everything
  scene.add(skybox);

  scene.fog = new Fog("#0A1525", 18, 48);
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
      });
      renderer.setClearColor(0x050510); // Deep void — matches sky reference
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

      // Skybox — must follow camera so sky always feels infinitely far away
      const skybox = scene.getObjectByName("skybox");

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

        // ─── OCEAN WAVES — gentle ripple animation ──────────────────
        const oceanMesh = scene.userData.ocean;
        if (oceanMesh && oceanMesh.geometry) {
          const pos = oceanMesh.geometry.attributes.position;
          if (pos) {
            const arr = pos.array;
            for (let i = 0; i < arr.length; i += 3) {
              const gx = arr[i];      // world X
              const gz = arr[i + 1];  // world Z (geometry Y, rotated)
              arr[i + 2] = Math.sin(gx * 0.3 + t * 0.9) * 0.07
                         + Math.cos(gz * 0.35 + t * 0.65) * 0.05
                         + Math.sin((gx + gz) * 0.22 + t * 1.2) * 0.04;
            }
            pos.needsUpdate = true;
          }
        }

        // Shallow water — softer, quicker ripples
        const shallowMesh = scene.userData.shallow;
        if (shallowMesh && shallowMesh.geometry) {
          const pos = shallowMesh.geometry.attributes.position;
          if (pos) {
            const arr = pos.array;
            for (let i = 0; i < arr.length; i += 3) {
              const gx = arr[i];
              const gz = arr[i + 1];
              arr[i + 2] = Math.sin(gx * 0.45 + t * 1.1) * 0.04
                         + Math.cos(gz * 0.5 + t * 0.8) * 0.03;
            }
            pos.needsUpdate = true;
          }
        }

        // Foam edge pulse
        const foamMesh = scene.userData.foam;
        if (foamMesh && foamMesh.material) {
          foamMesh.material.opacity = 0.28 + Math.sin(t * 0.7) * 0.1;
        }

        // ─── STARS TWINKLE ─────────────────────────────────────
        const starsMesh = scene.userData.stars;
        if (starsMesh && starsMesh.material) {
          starsMesh.material.opacity = 0.45 + Math.sin(t * 0.9) * 0.08 + Math.cos(t * 0.6) * 0.07;
          // Vary star size slightly too
          starsMesh.material.size = 0.32 + Math.sin(t * 1.2) * 0.04;
        }

        // ─── SKYBOX — follows camera + slow drift rotation ─────────
        if (skybox) {
          skybox.position.copy(camera.position);
          skybox.rotation.y += dt * 0.015; // Very slow Y-axis drift
          skybox.rotation.x += dt * 0.003; // Tiny tilt for depth
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
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
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