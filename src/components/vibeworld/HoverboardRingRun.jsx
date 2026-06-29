/**
 * NeonSurfBeach — Free-ride hoverboard beach zone.
 * Collectible Vibe Coins · Speed Boost Pads · Launch Pads (air launch)
 */
import * as THREE from "three";
import { MOVEMENT_BRIDGE } from "./city-engine/LaunchRide";

const {
  CircleGeometry, RingGeometry, SphereGeometry, BoxGeometry, CylinderGeometry,
  TorusGeometry, PlaneGeometry, ConeGeometry,
  Color, Mesh, Group, PointLight,
  MeshBasicMaterial, MeshStandardMaterial,
  SpriteMaterial, Sprite, CanvasTexture, LinearFilter,
} = THREE;

export const HOVERBOARD_START = { x: 28, z: 23 };
export const HOVERBOARD_INTERACT_RADIUS = 6.0;

// Legacy (unused but kept for import compat)
export const HOVERBOARD_RINGS = [];

// ── SURF VIBE COINS ──────────────────────────────────────────────────────────
// 70% easy (clear ride lines), 20% medium (light steering), 10% bonus (+5)
// All placed at y=1.0 (easy reach height), close to ride path
export const BEACH_ORBS = [
  // Easy lane — straight line across beach (70%)
  { id: 0,  x: 22,  z: 27, color: "#00E5FF", value: 1 },
  { id: 1,  x: 16,  z: 29, color: "#00E5FF", value: 1 },
  { id: 2,  x:  8,  z: 28, color: "#00E5FF", value: 1 },
  { id: 3,  x:  0,  z: 30, color: "#FFD700", value: 1 },
  { id: 4,  x: -8,  z: 29, color: "#00E5FF", value: 1 },
  { id: 5,  x:-16,  z: 27, color: "#00E5FF", value: 1 },
  { id: 6,  x:-22,  z: 29, color: "#00E5FF", value: 1 },
  // Medium — slight curve off main path (20%)
  { id: 7,  x: 20,  z: 23, color: "#C43BFF", value: 1 },
  { id: 8,  x:  5,  z: 25, color: "#C43BFF", value: 1 },
  { id: 9,  x:-12,  z: 24, color: "#C43BFF", value: 1 },
  // Bonus coins +5 (10%) — near boost pads or turns
  { id: 10, x: 12,  z: 27, color: "#FFD700", value: 5 },
  { id: 11, x:-14,  z: 26, color: "#FFD700", value: 5 },
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

// ── Vibe Coin face texture (cached) ──────────────────────────────────────────
let _coinFaceTex = null;
function getCoinFaceTex() {
  if (_coinFaceTex) return _coinFaceTex;
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, "#ffe066");
  grad.addColorStop(0.5, "#c47d00");
  grad.addColorStop(1, "#7a4a00");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 26px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("V", 32, 33);
  _coinFaceTex = new CanvasTexture(c);
  _coinFaceTex.minFilter = LinearFilter;
  _coinFaceTex.colorSpace = THREE.SRGBColorSpace;
  return _coinFaceTex;
}

// Build a surf Vibe Coin mesh at given position
function buildSurfCoin(scene, orb) {
  const g = new Group();
  g.name = `hbOrb_${orb.id}`;

  const isBonus = orb.value >= 5;
  const coinR = isBonus ? 0.34 : 0.26;

  // Gold disc face
  const faceMat = new MeshBasicMaterial({
    map: getCoinFaceTex(),
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const face = new Mesh(new CircleGeometry(coinR * 0.95, 20), faceMat);
  face.position.y = 0.03;
  g.add(face);
  const face2 = face.clone();
  face2.position.y = -0.03;
  g.add(face2);

  // Thin cylinder rim
  const rimMat = new MeshStandardMaterial({ color: new Color("#ffd700"), roughness: 0.2, metalness: 0.75 });
  const rim = new Mesh(new CylinderGeometry(coinR, coinR, 0.06, 20, 1, true), rimMat);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);

  // Neon edge — cyan or gold for bonus
  const edgeColor = isBonus ? "#FFD700" : "#00E5FF";
  const edgeMat = new MeshBasicMaterial({
    color: new Color(edgeColor),
    depthWrite: false, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const edge = new Mesh(new TorusGeometry(coinR, 0.022, 6, 28), edgeMat);
  g.add(edge);
  g.userData.edgeMat = edgeMat;

  // Aura glow disc below coin
  const auraMat = new MeshBasicMaterial({
    color: new Color(isBonus ? "#FFD700" : "#00D4F0"),
    depthWrite: false, transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const aura = new Mesh(new RingGeometry(coinR * 0.9, coinR * 1.8, 24), auraMat);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = -0.04;
  g.add(aura);
  g.userData.auraMat = auraMat;

  // Small point light
  const glow = new PointLight(new Color(isBonus ? "#ffd700" : "#00E5FF"), isBonus ? 0.5 : 0.3, isBonus ? 4 : 3);
  g.add(glow);

  // Bonus coin: add "+5" label sprite
  if (isBonus) {
    const lbl = makeLabel("+5", "#FFD700", [1.6, 0.5]);
    lbl.position.y = 0.65;
    g.add(lbl);
  }

  g.position.set(orb.x, 1.0, orb.z);
  g.userData.coinValue = orb.value || 1;
  g.userData.isBonus = isBonus;
  scene.add(g);
  return { group: g, edgeMat, auraMat, id: orb.id, collected: false, value: orb.value || 1 };
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

  // ── SURF VIBE COINS ──────────────────────────────────────────────────────
  const orbMeshes = [];
  for (const orb of BEACH_ORBS) {
    const entry = buildSurfCoin(scene, orb);
    orbMeshes.push(entry);
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

    const glowMat = bmat("#00FF88", 0.7);
    const glowRing = new Mesh(new RingGeometry(0.85, 1.2, 64), glowMat);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.06;
    glowRing.renderOrder = 1;
    g.add(glowRing);
    boostPadMats.push(glowMat);

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

    const innerDisc = new Mesh(new CircleGeometry(0.6, 32), bmat("#00FF88", 0.18));
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.07;
    innerDisc.renderOrder = 1;
    g.add(innerDisc);

    const lbl = makeLabel("SPEED", "#00FF88", [2.0, 0.55]);
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

    const innerMat = bmat("#FF9900", 0.22);
    const innerDisc = new Mesh(new CircleGeometry(0.7, 32), innerMat);
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.075;
    innerDisc.renderOrder = 1;
    g.add(innerDisc);

    const rocket = new Mesh(new ConeGeometry(0.22, 0.55, 8), bmat("#FF6600", 0.9));
    rocket.position.y = 0.45;
    g.add(rocket);
    const rocketBody = new Mesh(new CylinderGeometry(0.14, 0.18, 0.25, 8), smat("#FF4400", { r: 0.2, m: 0.7 }));
    rocketBody.position.y = 0.18;
    g.add(rocketBody);
    const exhaustMat = bmat("#FFAA00", 0.55);
    const exhaust = new Mesh(new ConeGeometry(0.12, 0.35, 8), exhaustMat);
    exhaust.rotation.z = Math.PI;
    exhaust.position.y = 0.01;
    g.add(exhaust);
    g.userData.exhaustMat = exhaustMat;
    g.userData.rocketGroup = g;

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

  // Surf Vibe Coins animation
  const orbs = scene.userData.hbOrbMeshes;
  if (orbs) {
    for (const coin of orbs) {
      if (coin.collected) { coin.group.visible = false; continue; }
      coin.group.visible = true;
      // Gentle bob at y=1.0 base — easy collect height
      coin.group.position.y = 1.0 + Math.sin(t * 1.6 + coin.id * 0.9) * 0.12;
      // Spin like a VibeCoin
      coin.group.rotation.y += 0.022;
      // Gentle tilt
      coin.group.rotation.x = Math.sin(t * 1.1 + coin.id * 0.5) * 0.06;
      // Pulse edge glow
      if (coin.edgeMat) coin.edgeMat.opacity = 0.6 + beat * 0.3 + Math.sin(t * 2.2 + coin.id * 0.7) * 0.18;
      if (coin.auraMat) coin.auraMat.opacity = 0.10 + beat * 0.15 + Math.sin(t * 1.4 + coin.id) * 0.06;
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
  for (const pad of LAUNCH_PADS) {
    const g = scene.getObjectByName(`hbLaunch_${pad.x}_${pad.z}`);
    if (g?.userData?.exhaustMat) {
      g.userData.exhaustMat.opacity = 0.3 + Math.sin(t * 6.0) * 0.25 + beat * 0.2;
    }
  }

}

// ─── COLLECT / RESET ─────────────────────────────────────────────────────────
export function collectOrb(scene, orbId) {
  const orbs = scene.userData.hbOrbMeshes;
  if (!orbs) return;
  const coin = orbs.find(o => o.id === orbId);
  if (coin) coin.collected = true;
}

export function resetOrbs(scene) {
  const orbs = scene.userData.hbOrbMeshes;
  if (!orbs) return;
  for (const coin of orbs) { coin.collected = false; coin.group.visible = true; }
}

// ─── BEACH LAUNCH PAD SYSTEM (self-contained, no VibeLaunchZone dep) ──
// Launches ANY rider on a beach pad (walking, personal hoverboard, or Neon Surf).
// Returns the launch state to integrate into CityCanvas/LaunchRide height pipeline.
const LAUNCH_RISE = 0.55;      // seconds to rise
const LAUNCH_FALL= 0.80;       // seconds to glide down
const LAUNCH_PEAK = 10;        // peak height
const LAUNCH_DIRS = [{fx: -2, fz: -10}, {fx: 8, fz: -6}];
const LAUNCH_SPEED = 3.0;

export function tickBeachLaunch(scene, dt, prevLift, onTrigger) {
  if (!scene.userData._beachLaunch) scene.userData._beachLaunch = { active: false, phase: "idle", timer: 0, startY: 0, cooldownMs: 0, dirIdx: 0 };
  const ls = scene.userData._beachLaunch;

  if (!ls.active) {
    // Detect step-on
    const now = performance.now();
    if (now < ls.cooldownMs + 2500 && ls.cooldownMs > 0) return 0;
    for (let i = 0; i < LAUNCH_PADS.length; i++) {
      const pad = LAUNCH_PADS[i];
      const dx = MOVEMENT_BRIDGE.px - pad.x;
      const dz = MOVEMENT_BRIDGE.pz - pad.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.6) {
        ls.active = true; ls.phase = "rise"; ls.timer = 0; ls.startY = prevLift; ls.cooldownMs = now; ls.dirIdx = i;
        onTrigger?.();
        break;
      }
    }
    return 0;
  }

  ls.timer += dt;
  if (ls.phase === "rise") {
    const progress = Math.min(ls.timer / LAUNCH_RISE, 1);
    const eased = 1 - (1 - progress) * (1 - progress);
    if (progress >= 1) { ls.phase = "fall"; ls.timer = 0; }
    return ls.startY + LAUNCH_PEAK * eased;
  }
  if (ls.phase === "fall") {
    const progress = Math.min(ls.timer / LAUNCH_FALL, 1);
    const eased = progress * progress;
    if (progress >= 1) { ls.active = false; ls.phase = "idle"; return ls.startY; }
    return ls.startY + LAUNCH_PEAK * (1 - eased);
  }
  return 0;
}

export function isBeachLaunchActive(scene) {
  return scene.userData._beachLaunch?.active ?? false;
}

export function applyBeachLaunchDrift(velRef, dt) {
  const ls = window.__hbScene?.userData?._beachLaunch;
  if (!ls?.active) return;
  const dir = LAUNCH_DIRS[ls.dirIdx];
  velRef.x += dir.fx * LAUNCH_SPEED * dt;
  velRef.z += dir.fz * LAUNCH_SPEED * dt;
}

// Legacy no-ops
export function flashRing() {}
export function resetRings(scene) { resetOrbs(scene); }