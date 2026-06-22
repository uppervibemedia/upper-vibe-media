/**
 * HoverboardBeachZone — Free-ride hoverboard beach cruising zone.
 * Features: glowing energy orbs, speed boost pads, chill ambient lights.
 * No rings, no strict course — just beach vibes.
 */
import * as THREE from "three";

const {
  CircleGeometry, RingGeometry, SphereGeometry, BoxGeometry, CylinderGeometry,
  TorusGeometry, PlaneGeometry,
  Color, Mesh, Group, PointLight,
  MeshBasicMaterial, MeshStandardMaterial,
  BufferGeometry, BufferAttribute, PointsMaterial, Points,
  SpriteMaterial, Sprite, CanvasTexture, LinearFilter,
} = THREE;

// Start pad — right side of beach
export const HOVERBOARD_START = { x: 28, z: 23 };
export const HOVERBOARD_INTERACT_RADIUS = 6.0;

// Kept for backwards-compat (CityCanvas imports this)
export const HOVERBOARD_RINGS = [];

// ── ENERGY ORBS — scattered along the beach for collection ─────────────────
export const BEACH_ORBS = [
  { id: 0,  x: 22,  z: 28, color: "#00E5FF" },
  { id: 1,  x: 15,  z: 31, color: "#C43BFF" },
  { id: 2,  x:  8,  z: 29, color: "#00E5FF" },
  { id: 3,  x:  0,  z: 32, color: "#FFD700" },
  { id: 4,  x: -8,  z: 30, color: "#C43BFF" },
  { id: 5,  x:-16,  z: 28, color: "#00E5FF" },
  { id: 6,  x:-22,  z: 31, color: "#FFD700" },
  { id: 7,  x: 18,  z: 22, color: "#C43BFF" },
  { id: 8,  x:  5,  z: 24, color: "#00E5FF" },
  { id: 9,  x:-10,  z: 25, color: "#FFD700" },
  { id: 10, x: 25,  z: 20, color: "#C43BFF" },
  { id: 11, x:-18,  z: 22, color: "#00E5FF" },
];

// ── SPEED BOOST PADS — glow pads that give a visual thrill ─────────────────
export const BOOST_PADS = [
  { x:  12, z: 27, rot: 0.0 },
  { x: -5,  z: 30, rot: 0.3 },
  { x:-14,  z: 26, rot:-0.2 },
  { x:  20, z: 24, rot: 0.1 },
];

function bmat(hex, opacity = 1, extra = {}) {
  const m = new MeshBasicMaterial({ color: new Color(hex), depthWrite: false, ...extra });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}

function smat(hex, opts = {}) {
  return new MeshStandardMaterial({
    color: new Color(hex),
    roughness: opts.r ?? 0.35,
    metalness: opts.m ?? 0.7,
    ...(opts.opacity != null ? { transparent: true, opacity: opts.opacity, depthWrite: true } : {}),
  });
}

function makeLabel(text, colorHex, scale = [4, 0.8]) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.shadowColor = colorHex; ctx.shadowBlur = 16;
  ctx.font = "bold 22px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 128, 32); ctx.fillText(text, 128, 32);
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(...scale, 1); sp.renderOrder = 999;
  return sp;
}

export function createHoverboardZone(scene) {
  const { x: SX, z: SZ } = HOVERBOARD_START;

  // ── START PAD ─────────────────────────────────────────────────────────────
  const startPad = new Mesh(new CylinderGeometry(2.5, 2.8, 0.15, 32), smat("#1A1040", { r: 0.15, m: 0.9 }));
  startPad.position.set(SX, 0.07, SZ);
  startPad.receiveShadow = true;
  scene.add(startPad);

  const padRingMat = bmat("#00E5FF", 0.75);
  const padRing = new Mesh(new RingGeometry(2.2, 2.5, 64), padRingMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(SX, 0.18, SZ);
  padRing.renderOrder = 1; padRing.name = "hbPadRing";
  scene.add(padRing);
  scene.userData.hbPadRingMat = padRingMat;

  // Checkerboard accents
  for (const [gx, gz] of [[-1,-1],[1,1],[-1,1],[1,-1]]) {
    const sq = new Mesh(new BoxGeometry(0.8, 0.025, 0.8), bmat(gx === gz ? "#00E5FF" : "#C43BFF", 0.45));
    sq.position.set(SX + gx * 0.6, 0.17, SZ + gz * 0.6);
    scene.add(sq);
  }

  // ── FLOATING HOVERBOARD PROP ──────────────────────────────────────────────
  const boardBody = new Mesh(new BoxGeometry(1.5, 0.1, 0.5), smat("#0A0A20", { r: 0.1, m: 0.95 }));
  boardBody.position.set(SX, 0.55, SZ);
  boardBody.castShadow = true;
  scene.add(boardBody);
  scene.userData.hbBoardProp = boardBody;

  const boardGlowMat = bmat("#00E5FF", 0.7);
  const boardGlow = new Mesh(new BoxGeometry(1.5, 0.04, 0.5), boardGlowMat);
  boardGlow.position.set(SX, 0.51, SZ);
  scene.add(boardGlow);
  scene.userData.hbBoardGlowMat = boardGlowMat;

  for (const bx of [-0.55, 0.55]) for (const bz of [-0.2, 0.2]) {
    const thruster = new Mesh(new CylinderGeometry(0.06, 0.08, 0.05, 8), bmat("#00E5FF", 0.9));
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(SX + bx, 0.52, SZ + bz);
    scene.add(thruster);
  }

  // ── ENTRY ARCH ────────────────────────────────────────────────────────────
  for (const bz of [-3.0, 3.0]) {
    const pylon = new Mesh(new CylinderGeometry(0.12, 0.15, 4.5, 12), smat("#111130", { r: 0.25, m: 0.8 }));
    pylon.position.set(SX + 3, 2.25, SZ + bz);
    scene.add(pylon);
    const pylonGlow = new Mesh(new CylinderGeometry(0.05, 0.05, 4.4, 8), bmat(bz < 0 ? "#C43BFF" : "#00E5FF", 0.6));
    pylonGlow.position.set(SX + 3, 2.25, SZ + bz);
    scene.add(pylonGlow);
  }
  const archBarMat = bmat("#00E5FF", 0.9);
  const archBar = new Mesh(new BoxGeometry(0.12, 0.12, 6.3), archBarMat);
  archBar.position.set(SX + 3, 4.52, SZ);
  scene.add(archBar);
  scene.userData.hbArchBarMat = archBar.material;

  const titleLabel = makeLabel("HOVERBOARD  BEACH  ZONE", "#00E5FF", [5.5, 1.0]);
  titleLabel.position.set(SX, 5.5, SZ);
  scene.add(titleLabel);
  const subLabel = makeLabel("FREE RIDE · COLLECT ORBS · HIT BOOST PADS", "#C43BFF", [5.5, 0.7]);
  subLabel.position.set(SX, 4.3, SZ);
  scene.add(subLabel);

  // ── ENERGY ORBS ───────────────────────────────────────────────────────────
  const orbMeshes = [];
  for (const orb of BEACH_ORBS) {
    const g = new Group();
    g.name = `hbOrb_${orb.id}`;

    // Core sphere
    const coreMat = bmat(orb.color, 0.92);
    const core = new Mesh(new SphereGeometry(0.28, 12, 8), coreMat);
    g.add(core);

    // Outer glow halo
    const haloMat = bmat(orb.color, 0.22, { side: THREE.DoubleSide });
    const halo = new Mesh(new SphereGeometry(0.46, 10, 6), haloMat);
    g.add(halo);

    // Inner sparkle
    const sparkMat = bmat("#ffffff", 0.55);
    const spark = new Mesh(new SphereGeometry(0.10, 6, 4), sparkMat);
    spark.position.y = 0.08;
    g.add(spark);

    // Orbit ring
    const ringMat = bmat(orb.color, 0.45);
    const ring = new Mesh(new TorusGeometry(0.38, 0.025, 6, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.userData.ringMat = ringMat;

    g.position.set(orb.x, 1.4, orb.z);
    scene.add(g);
    orbMeshes.push({ group: g, coreMat, haloMat, ringMat, id: orb.id, collected: false, color: orb.color });
  }
  scene.userData.hbOrbMeshes = orbMeshes;

  // ── SPEED BOOST PADS ──────────────────────────────────────────────────────
  const boostPadMats = [];
  for (const pad of BOOST_PADS) {
    const g = new Group();
    g.name = `hbBoost_${pad.x}_${pad.z}`;

    const baseMat = smat("#0A0A28", { r: 0.15, m: 0.9 });
    const base = new Mesh(new CylinderGeometry(1.2, 1.35, 0.1, 32), baseMat);
    base.receiveShadow = true;
    g.add(base);

    const glowMat = bmat("#FFD700", 0.7);
    const glowRing = new Mesh(new RingGeometry(0.95, 1.2, 64), glowMat);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.06;
    glowRing.renderOrder = 1;
    g.add(glowRing);
    boostPadMats.push(glowMat);

    // Arrow chevron pointing forward
    const arrow = new Mesh(new BoxGeometry(0.12, 0.04, 0.7), bmat("#FFD700", 0.85));
    arrow.position.set(0, 0.08, 0);
    g.add(arrow);
    const arrowL = new Mesh(new BoxGeometry(0.12, 0.04, 0.4), bmat("#FFD700", 0.75));
    arrowL.position.set(-0.22, 0.08, 0.2); arrowL.rotation.y = 0.5;
    g.add(arrowL);
    const arrowR = new Mesh(new BoxGeometry(0.12, 0.04, 0.4), bmat("#FFD700", 0.75));
    arrowR.position.set(0.22, 0.08, 0.2); arrowR.rotation.y = -0.5;
    g.add(arrowR);

    // "BOOST" label above
    const boostLabel = makeLabel("BOOST", "#FFD700", [2.0, 0.55]);
    boostLabel.position.y = 1.4;
    g.add(boostLabel);

    g.position.set(pad.x, 0.05, pad.z);
    g.rotation.y = pad.rot;
    scene.add(g);
  }
  scene.userData.hbBoostPadMats = boostPadMats;

  // ── AMBIENT BEACH LIGHTS ──────────────────────────────────────────────────
  const hbLight = new PointLight();
  hbLight.color = new Color("#00C8FF");
  hbLight.intensity = 3.5; hbLight.distance = 22;
  hbLight.position.set(SX, 4, SZ);
  hbLight.name = "hbLight";
  scene.add(hbLight);
  scene.userData.hbLight = hbLight;

  // Mid-beach lights
  for (const [lx, lz, col] of [
    [0,  29, "#C43BFF"],
    [-15, 27, "#00C8FF"],
    [15,  25, "#FFD700"],
  ]) {
    const lgt = new PointLight();
    lgt.color = new Color(col);
    lgt.intensity = 2.5; lgt.distance = 18;
    lgt.position.set(lx, 4, lz);
    scene.add(lgt);
  }

  // ── ATMOSPHERE — floating shimmer particles along the beach ──────────────
  const particleCount = 60;
  const pGeo = new BufferGeometry();
  const pPos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    pPos[i * 3]     = (Math.random() - 0.5) * 56;
    pPos[i * 3 + 1] = 0.8 + Math.random() * 2.5;
    pPos[i * 3 + 2] = 18 + Math.random() * 16;
  }
  pGeo.setAttribute("position", new BufferAttribute(pPos, 3));
  const pMat = new PointsMaterial({
    color: new Color("#00D4F0"),
    size: 0.12,
    transparent: true, opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new Points(pGeo, pMat);
  particles.name = "hbParticles";
  scene.add(particles);
  scene.userData.hbParticles = particles;
  scene.userData.hbParticlePositions = pPos;

  return { padRingMat, orbMeshes };
}

/**
 * animateHoverboardZone — call from render loop every frame.
 */
export function animateHoverboardZone(scene, t, beat) {
  // Board prop float
  const board = scene.userData.hbBoardProp;
  if (board) { board.position.y = 0.52 + Math.sin(t * 1.8) * 0.08; board.rotation.y += 0.006; }

  const bgMat = scene.userData.hbBoardGlowMat;
  if (bgMat) bgMat.opacity = 0.5 + beat * 0.45 + Math.sin(t * 2.2) * 0.12;

  const prMat = scene.userData.hbPadRingMat;
  if (prMat) prMat.opacity = 0.55 + beat * 0.45 + Math.sin(t * 1.5) * 0.12;

  const archMat = scene.userData.hbArchBarMat;
  if (archMat) {
    archMat.color.copy(new Color("#00E5FF")).lerp(new Color("#C43BFF"), Math.sin(t * 0.85) * 0.5 + 0.5);
    archMat.opacity = 0.75 + beat * 0.22;
  }

  const hbLight = scene.userData.hbLight;
  if (hbLight) hbLight.intensity = 2.5 + beat * 3.5 + Math.sin(t * 1.3) * 0.6;

  // ── Animate energy orbs ───────────────────────────────────────────────────
  const orbs = scene.userData.hbOrbMeshes;
  if (orbs) {
    for (const orb of orbs) {
      if (orb.collected) {
        orb.group.visible = false;
        continue;
      }
      orb.group.visible = true;
      // Float up and down
      orb.group.position.y = 1.4 + Math.sin(t * 1.6 + orb.id * 0.9) * 0.25;
      // Spin
      orb.group.rotation.y += 0.018;
      // Pulse glow
      const pulse = 0.65 + beat * 0.32 + Math.sin(t * 2.2 + orb.id * 0.7) * 0.18;
      if (orb.coreMat) orb.coreMat.opacity = pulse;
      if (orb.haloMat) orb.haloMat.opacity = 0.12 + beat * 0.18 + Math.sin(t * 1.4 + orb.id) * 0.08;
      // Orbit ring spins on X
      const ring = orb.group.children.find(c => c.geometry?.type === "TorusGeometry");
      if (ring) { ring.rotation.y += 0.03; ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.8 + orb.id) * 0.4; }
    }
  }

  // ── Boost pad glow ────────────────────────────────────────────────────────
  const boostMats = scene.userData.hbBoostPadMats;
  if (boostMats) {
    for (const m of boostMats) {
      if (m) m.opacity = 0.5 + beat * 0.45 + Math.sin(t * 3.0) * 0.15;
    }
  }

  // ── Particle shimmer ──────────────────────────────────────────────────────
  const particles = scene.userData.hbParticles;
  const pPos = scene.userData.hbParticlePositions;
  if (particles && pPos) {
    const pos = particles.geometry.attributes.position;
    for (let i = 0; i < pPos.length / 3; i++) {
      pos.array[i * 3 + 1] = pPos[i * 3 + 1] + Math.sin(t * 1.1 + i * 0.8) * 0.15;
    }
    pos.needsUpdate = true;
    particles.material.opacity = 0.25 + beat * 0.22 + Math.sin(t * 0.9) * 0.08;
  }
}

/**
 * collectOrb — visual burst when player rides over an orb
 */
export function collectOrb(scene, orbId) {
  const orbs = scene.userData.hbOrbMeshes;
  if (!orbs) return;
  const orb = orbs.find(o => o.id === orbId);
  if (orb) { orb.collected = true; }
}

/**
 * resetOrbs — called when player starts a new ride session
 */
export function resetOrbs(scene) {
  const orbs = scene.userData.hbOrbMeshes;
  if (!orbs) return;
  for (const orb of orbs) { orb.collected = false; orb.group.visible = true; }
}

// Legacy no-op exports so CityCanvas still compiles cleanly
export function flashRing() {}
export function resetRings(scene) { resetOrbs(scene); }