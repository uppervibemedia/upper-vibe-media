/**
 * NeonSurfBeach — Free-ride hoverboard beach zone.
 * Collectible energy orbs · Speed Boost Pads · Launch Pads (air launch)
 */
import * as THREE from "three";

const {
  CircleGeometry, RingGeometry, SphereGeometry, BoxGeometry, CylinderGeometry,
  TorusGeometry, PlaneGeometry, ConeGeometry,
  Color, Mesh, Group, PointLight,
  MeshBasicMaterial, MeshStandardMaterial,
  BufferGeometry, BufferAttribute, PointsMaterial, Points,
  SpriteMaterial, Sprite, CanvasTexture, LinearFilter,
} = THREE;

export const HOVERBOARD_START = { x: 28, z: 23 };
export const HOVERBOARD_INTERACT_RADIUS = 6.0;

// Legacy (unused but kept for import compat)
export const HOVERBOARD_RINGS = [];

// ── ENERGY ORBS ─────────────────────────────────────────────────────────────
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

// ── SPEED BOOST PADS — green, speed arrow icons, temporary speed burst ────
export const BOOST_PADS = [
  { x:  12, z: 27, rot: 0.0 },
  { x: -14, z: 26, rot:-0.2 },
];

// ── LAUNCH PADS — orange/red, rocket icons, launch rider into the air ─────
export const LAUNCH_PADS = [
  { x: -5,  z: 30, rot: 0.3 },
  { x:  20, z: 24, rot: 0.1 },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
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

// ─── BUILD ZONE ─────────────────────────────────────────────────────────────
export function createHoverboardZone(scene) {
  const { x: SX, z: SZ } = HOVERBOARD_START;

  // ── START PAD ───────────────────────────────────────────────────────────
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

  for (const [gx, gz] of [[-1,-1],[1,1],[-1,1],[1,-1]]) {
    const sq = new Mesh(new BoxGeometry(0.8, 0.025, 0.8), bmat(gx === gz ? "#00E5FF" : "#C43BFF", 0.45));
    sq.position.set(SX + gx * 0.6, 0.17, SZ + gz * 0.6);
    scene.add(sq);
  }

  // ── FLOATING HOVERBOARD PROP ─────────────────────────────────────────────
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

  // ── ENTRY ARCH ──────────────────────────────────────────────────────────
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

  const titleLabel = makeLabel("NEON  SURF  BEACH", "#00E5FF", [5.5, 1.0]);
  titleLabel.position.set(SX, 5.5, SZ);
  scene.add(titleLabel);
  const subLabel = makeLabel("COLLECT ORBS · BOOST · LAUNCH!", "#C43BFF", [5.5, 0.7]);
  subLabel.position.set(SX, 4.3, SZ);
  scene.add(subLabel);

  // ── ENERGY ORBS ─────────────────────────────────────────────────────────
  const orbMeshes = [];
  for (const orb of BEACH_ORBS) {
    const g = new Group();
    g.name = `hbOrb_${orb.id}`;

    const coreMat = bmat(orb.color, 0.92);
    const core = new Mesh(new SphereGeometry(0.28, 12, 8), coreMat);
    g.add(core);

    const haloMat = bmat(orb.color, 0.22, { side: THREE.DoubleSide });
    const halo = new Mesh(new SphereGeometry(0.46, 10, 6), haloMat);
    g.add(halo);

    const sparkMat = bmat("#ffffff", 0.55);
    const spark = new Mesh(new SphereGeometry(0.10, 6, 4), sparkMat);
    spark.position.y = 0.08;
    g.add(spark);

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

  // ── SPEED BOOST PADS — green glow, forward arrows ───────────────────────
  const boostPadMats = [];
  for (const pad of BOOST_PADS) {
    const g = new Group();
    g.name = `hbBoost_${pad.x}_${pad.z}`;

    const base = new Mesh(new CylinderGeometry(1.2, 1.35, 0.1, 32), smat("#0A1A0A", { r: 0.15, m: 0.9 }));
    base.receiveShadow = true;
    g.add(base);

    // Bright green glow ring
    const glowMat = bmat("#00FF88", 0.7);
    const glowRing = new Mesh(new RingGeometry(0.85, 1.2, 64), glowMat);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.06;
    glowRing.renderOrder = 1;
    g.add(glowRing);
    boostPadMats.push(glowMat);

    // Double-chevron arrows (green)
    for (const oz of [0, -0.28]) {
      const arrow = new Mesh(new BoxGeometry(0.10, 0.04, 0.52), bmat("#00FF88", 0.85));
      arrow.position.set(0, 0.08, oz);
      g.add(arrow);
      const arrowL = new Mesh(new BoxGeometry(0.10, 0.04, 0.30), bmat("#00FF88", 0.7));
      arrowL.position.set(-0.18, 0.08, oz + 0.15); arrowL.rotation.y = 0.5;
      g.add(arrowL);
      const arrowR = new Mesh(new BoxGeometry(0.10, 0.04, 0.30), bmat("#00FF88", 0.7));
      arrowR.position.set(0.18, 0.08, oz + 0.15); arrowR.rotation.y = -0.5;
      g.add(arrowR);
    }

    // Inner green disc
    const innerDisc = new Mesh(new CircleGeometry(0.6, 32), bmat("#00FF88", 0.18));
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.07;
    innerDisc.renderOrder = 1;
    g.add(innerDisc);

    const lbl = makeLabel("BOOST", "#00FF88", [2.0, 0.55]);
    lbl.position.y = 1.5;
    g.add(lbl);

    g.position.set(pad.x, 0.05, pad.z);
    g.rotation.y = pad.rot;
    scene.add(g);
  }
  scene.userData.hbBoostPadMats = boostPadMats;

  // ── LAUNCH PADS — orange/amber, rocket cone icon, launches rider up ──────
  const launchPadMats = [];
  for (const pad of LAUNCH_PADS) {
    const g = new Group();
    g.name = `hbLaunch_${pad.x}_${pad.z}`;

    // Dark base with orange stripe ring
    const base = new Mesh(new CylinderGeometry(1.3, 1.45, 0.12, 32), smat("#1A0A00", { r: 0.15, m: 0.9 }));
    base.receiveShadow = true;
    g.add(base);

    const outerRingMat = bmat("#FF6600", 0.8);
    const outerRing = new Mesh(new RingGeometry(1.05, 1.3, 64), outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.07;
    outerRing.renderOrder = 1;
    g.add(outerRing);
    launchPadMats.push(outerRingMat);

    // Inner bright amber disc (distinct from green boost)
    const innerMat = bmat("#FF9900", 0.22);
    const innerDisc = new Mesh(new CircleGeometry(0.7, 32), innerMat);
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.075;
    innerDisc.renderOrder = 1;
    g.add(innerDisc);

    // Rocket cone sitting on pad
    const rocket = new Mesh(new ConeGeometry(0.22, 0.55, 8), bmat("#FF6600", 0.9));
    rocket.position.y = 0.45;
    g.add(rocket);
    const rocketBody = new Mesh(new CylinderGeometry(0.14, 0.18, 0.25, 8), smat("#FF4400", { r: 0.2, m: 0.7 }));
    rocketBody.position.y = 0.18;
    g.add(rocketBody);
    // Exhaust glow
    const exhaustMat = bmat("#FFAA00", 0.55);
    const exhaust = new Mesh(new ConeGeometry(0.12, 0.35, 8), exhaustMat);
    exhaust.rotation.z = Math.PI;
    exhaust.position.y = 0.01;
    g.add(exhaust);
    g.userData.exhaustMat = exhaustMat;
    g.userData.rocketGroup = g;

    // Upward arrows (orange)
    for (const ox of [-0.35, 0.35]) {
      const upArr = new Mesh(new BoxGeometry(0.07, 0.35, 0.07), bmat("#FF9900", 0.75));
      upArr.position.set(ox, 0.22, 0);
      g.add(upArr);
      const tip = new Mesh(new ConeGeometry(0.1, 0.18, 6), bmat("#FF9900", 0.9));
      tip.position.set(ox, 0.44, 0);
      g.add(tip);
    }

    const lbl = makeLabel("LAUNCH", "#FF9900", [2.2, 0.6]);
    lbl.position.y = 1.6;
    g.add(lbl);

    g.position.set(pad.x, 0.05, pad.z);
    g.rotation.y = pad.rot;
    scene.add(g);
  }
  scene.userData.hbLaunchPadMats = launchPadMats;
  scene.userData.hbLaunchPadGroups = launchPadMats.map((_, i) => scene.getObjectByName(`hbLaunch_${LAUNCH_PADS[i].x}_${LAUNCH_PADS[i].z}`));

  // ── AMBIENT BEACH LIGHTS ─────────────────────────────────────────────────
  const hbLight = new PointLight();
  hbLight.color = new Color("#00C8FF");
  hbLight.intensity = 3.5; hbLight.distance = 22;
  hbLight.position.set(SX, 4, SZ);
  hbLight.name = "hbLight";
  scene.add(hbLight);
  scene.userData.hbLight = hbLight;

  for (const [lx, lz, col] of [
    [0,  29, "#C43BFF"],
    [-15, 27, "#00FF88"],
    [15,  25, "#FF6600"],
  ]) {
    const lgt = new PointLight();
    lgt.color = new Color(col);
    lgt.intensity = 2.5; lgt.distance = 18;
    lgt.position.set(lx, 4, lz);
    scene.add(lgt);
  }

  // ── ATMOSPHERE — shimmer particles ──────────────────────────────────────
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

// ─── ANIMATION ───────────────────────────────────────────────────────────────
export function animateHoverboardZone(scene, t, beat) {
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

  // Orbs
  const orbs = scene.userData.hbOrbMeshes;
  if (orbs) {
    for (const orb of orbs) {
      if (orb.collected) { orb.group.visible = false; continue; }
      orb.group.visible = true;
      orb.group.position.y = 1.4 + Math.sin(t * 1.6 + orb.id * 0.9) * 0.25;
      orb.group.rotation.y += 0.018;
      const pulse = 0.65 + beat * 0.32 + Math.sin(t * 2.2 + orb.id * 0.7) * 0.18;
      if (orb.coreMat) orb.coreMat.opacity = pulse;
      if (orb.haloMat) orb.haloMat.opacity = 0.12 + beat * 0.18 + Math.sin(t * 1.4 + orb.id) * 0.08;
      const ring = orb.group.children.find(c => c.geometry?.type === "TorusGeometry");
      if (ring) { ring.rotation.y += 0.03; ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.8 + orb.id) * 0.4; }
    }
  }

  // Boost pad — green pulse
  const boostMats = scene.userData.hbBoostPadMats;
  if (boostMats) {
    for (const m of boostMats) {
      if (m) m.opacity = 0.5 + beat * 0.5 + Math.sin(t * 3.5) * 0.18;
    }
  }

  // Launch pad — orange pulse + exhaust flicker
  const launchMats = scene.userData.hbLaunchPadMats;
  if (launchMats) {
    for (const m of launchMats) {
      if (m) m.opacity = 0.55 + beat * 0.4 + Math.sin(t * 2.2) * 0.2;
    }
  }
  // Exhaust glow flicker on launch pad rockets
  for (const pad of LAUNCH_PADS) {
    const g = scene.getObjectByName(`hbLaunch_${pad.x}_${pad.z}`);
    if (g?.userData?.exhaustMat) {
      g.userData.exhaustMat.opacity = 0.3 + Math.sin(t * 6.0) * 0.25 + beat * 0.2;
    }
  }

  // Particles
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

// ─── COLLECT / RESET ─────────────────────────────────────────────────────────
export function collectOrb(scene, orbId) {
  const orbs = scene.userData.hbOrbMeshes;
  if (!orbs) return;
  const orb = orbs.find(o => o.id === orbId);
  if (orb) orb.collected = true;
}

export function resetOrbs(scene) {
  const orbs = scene.userData.hbOrbMeshes;
  if (!orbs) return;
  for (const orb of orbs) { orb.collected = false; orb.group.visible = true; }
}

// Legacy no-ops
export function flashRing() {}
export function resetRings(scene) { resetOrbs(scene); }