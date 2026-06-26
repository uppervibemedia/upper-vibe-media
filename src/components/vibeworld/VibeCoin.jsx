import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// VibeCoin — visual-only 3D collectible coin
// Note: The inverse transform offset for three-axis rotation
// is applied to the "ill" mesh so it counter-rotates to
// keep facing upright while the parent coin spins.
// ⚠ No collection logic, no balance tracking.
// ─────────────────────────────────────────────────────────────

const {
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshPhongMaterial,
  Group,
  CylinderGeometry,
  TorusGeometry,
  SphereGeometry,
  CircleGeometry,
  RingGeometry,
  Vector3,
  Color,
  CanvasTexture,
  LinearFilter,
} = THREE;

// ── UVM emblem canvas (cached) ───────────────────────────────
let _faceTex = null;
function getFaceTex() {
  if (_faceTex) return _faceTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");

  // Radial gradient background
  const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
  grad.addColorStop(0, "#c47d00");
  grad.addColorStop(0.55, "#a46300");
  grad.addColorStop(1, "#000000");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // Gold border ring
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // UVM text
  ctx.fillStyle = "#ffd700";
  ctx.font = "700 48px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("UVM", 64, 64);

  ctx.font = "700 11px 'Syne','Inter',sans-serif";
  ctx.fillText("VIBE COINS", 64, 14);

  _faceTex = new CanvasTexture(c);
  _faceTex.minFilter = LinearFilter;
  _faceTex.colorSpace = THREE.SRGBColorSpace;
  return _faceTex;
}

// ── Build the coin assembly ──────────────────────────────────
function buildCoin(group) {
  const rimMat = new MeshStandardMaterial({
    color: new Color("#ffd700"),
    roughness: 0.25,
    metalness: 0.55,
  });

  // Rim ring (coin body)
  const rim = new Mesh(new CylinderGeometry(1.0, 1.0, 0.18, 20, 1, true), rimMat);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  // Bevel rings
  const bevel = new Mesh(new TorusGeometry(1.0, 0.03, 8, 20), rimMat);
  bevel.position.y = 0.09;
  group.add(bevel);
  const bevel2 = bevel.clone();
  bevel2.position.y = -0.09;
  group.add(bevel2);

  // Face disc (UVM emblem)
  const faceMat = new MeshBasicMaterial({
    map: getFaceTex(),
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const face = new Mesh(new CircleGeometry(0.85, 24), faceMat);
  face.position.y = 0.09;
  group.add(face);

  const face2 = face.clone();
  face2.position.y = -0.09;
  group.add(face2);

  // Edge neon glow (transparent double ring)
  const edgeGlowMat = new MeshBasicMaterial({
    color: new Color("#ffd700"),
    depthWrite: false,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const edgeGlow = new Mesh(new TorusGeometry(1.0, 0.08, 12, 40), edgeGlowMat);
  group.add(edgeGlow);

  // Sparkle center
  const sparkleMat = new MeshBasicMaterial({
    color: new Color("#00D4F0"),
    depthWrite: false,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
  });
  const sparkle = new Mesh(new SphereGeometry(0.035, 8, 6), sparkleMat);
  sparkle.position.y = 0.1;
  group.add(sparkle);

  const sparkle2 = sparkle.clone();
  sparkle2.position.y = -0.1;
  group.add(sparkle2);

  // Cyan aura ring under the coin
  const auraMat = new MeshBasicMaterial({
    color: new Color("#00D4F0"),
    depthWrite: false,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const aura = new Mesh(new RingGeometry(0.7, 1.3, 36), auraMat);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = -0.07;
  group.add(aura);

  // Point light for emissive glow
  const glow = new THREE.PointLight(new Color("#ffd700"), 0.6, 6);
  glow.position.y = 0.5;
  group.add(glow);

  group.userData = {
    ...group.userData,
    _isVibeCoin: true,
    _glowLight: glow,
    _auraMat: auraMat,
    _glowMat: edgeGlowMat,
  };
}

// ── Animation (visual loop only, no collection) ──────────────
let _loopT = 0;
export function animateVibeCoin(group, t = performance.now() * 0.001, audioBeat = 0) {
  if (!group || group.type !== "Group") return;

  _loopT += 0.016;
  const T = _loopT;

  // Float bob
  group.position.y = 0.45 + Math.sin(T * 2.2) * 0.1;

  // Spin
  group.rotation.y += 0.01 * (1 + audioBeat * 2);
  group.rotation.x = Math.sin(T * 1.1) * 0.08;
  group.rotation.z = Math.sin(T * 0.8) * 0.06;

  // Glow + aura pulse
  const g = group.userData?._glowLight;
  if (g) g.intensity = 0.4 + Math.sin(T * 2.5) * 0.2 + audioBeat * 0.3;

  const a = group.userData?._auraMat;
  if (a) a.opacity = 0.3 + Math.sin(T * 2.2) * 0.12 + audioBeat * 0.12;

  const eg = group.userData?._glowMat;
  if (eg) eg.opacity = 0.55 + Math.sin(T * 1.8) * 0.15 + audioBeat * 0.12;
}

// ── Factory ──────────────────────────────────────────────────
let _msgShown = false;
if (!_msgShown) {
  console.log("[VibeCoin] Visual-only component created. Still inactive — not placed in city.");
  _msgShown = true;
}

export default function createVibeCoin(scene, pos, value = 5, id = null) {
  if (!scene) {
    console.warn("[VibeCoin] No scene provided — skipping.");
    return null;
  }
  const isArray = Array.isArray(pos);
  const fx = isArray ? pos[0] : (pos?.x ?? 0);
  const fz = isArray ? pos[2] : (pos?.z ?? 0);

  const group = new Group();
  group.name = "vibeCoin";
  group.position.set(fx, 0.5, fz);
  group.userData.coinValue = value;
  group.userData.coinId = id;
  buildCoin(group);
  scene.add(group);
  return group;
}