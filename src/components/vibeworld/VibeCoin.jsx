import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// VibeCoin — small premium collectible coin
// Thin spinning disc, gold face, cyan/purple neon edge glow.
// No collection logic or balance tracking here.
// ─────────────────────────────────────────────────────────────

const {
  Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Group, CylinderGeometry, TorusGeometry, CircleGeometry, RingGeometry,
  Color, CanvasTexture, LinearFilter,
} = THREE;

// Coin radius — smaller than before (~40% reduction from r=1.0)
const COIN_R = 0.28;
const COIN_T = 0.06; // thickness

// ── Face texture (cached) ────────────────────────────────────
let _faceTex = null;
function getFaceTex() {
  if (_faceTex) return _faceTex;
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");

  // Gold radial gradient face
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, "#ffe066");
  grad.addColorStop(0.5, "#c47d00");
  grad.addColorStop(1, "#7a4a00");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  // Thin gold border
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "V" icon — clean, simple, premium
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 26px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("V", 32, 33);

  _faceTex = new CanvasTexture(c);
  _faceTex.minFilter = LinearFilter;
  _faceTex.colorSpace = THREE.SRGBColorSpace;
  return _faceTex;
}

// ── Build the coin ───────────────────────────────────────────
function buildCoin(group) {
  const rimMat = new MeshStandardMaterial({
    color: new Color("#ffd700"),
    roughness: 0.2,
    metalness: 0.75,
  });

  // Thin cylindrical body
  const body = new Mesh(new CylinderGeometry(COIN_R, COIN_R, COIN_T, 24, 1, true), rimMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Face disc (front)
  const faceMat = new MeshBasicMaterial({
    map: getFaceTex(),
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const face = new Mesh(new CircleGeometry(COIN_R * 0.95, 24), faceMat);
  face.position.y = COIN_T * 0.5 + 0.001;
  group.add(face);
  const face2 = face.clone();
  face2.position.y = -(COIN_T * 0.5 + 0.001);
  group.add(face2);

  // Neon edge — cyan inner, purple outer
  const cyanEdgeMat = new MeshBasicMaterial({
    color: new Color("#00E5FF"),
    depthWrite: false,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const cyanEdge = new Mesh(new TorusGeometry(COIN_R, 0.022, 8, 32), cyanEdgeMat);
  group.add(cyanEdge);

  const purpleEdgeMat = new MeshBasicMaterial({
    color: new Color("#9B4FFF"),
    depthWrite: false,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const purpleEdge = new Mesh(new TorusGeometry(COIN_R + 0.032, 0.014, 6, 32), purpleEdgeMat);
  group.add(purpleEdge);

  // Subtle aura ring (flat, below coin)
  const auraMat = new MeshBasicMaterial({
    color: new Color("#00D4F0"),
    depthWrite: false,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const aura = new Mesh(new RingGeometry(COIN_R * 0.9, COIN_R * 1.6, 28), auraMat);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = -0.02;
  group.add(aura);

  // Small point light — close range only
  const glow = new THREE.PointLight(new Color("#ffd700"), 0.35, 3.5);
  group.add(glow);

  group.userData = {
    ...group.userData,
    _isVibeCoin: true,
    _glowLight: glow,
    _auraMat: auraMat,
    _cyanEdgeMat: cyanEdgeMat,
    _purpleEdgeMat: purpleEdgeMat,
  };
}

// ── Animation (visual loop only) ─────────────────────────────
export function animateVibeCoin(group, t = performance.now() * 0.001, audioBeat = 0) {
  if (!group || group.type !== "Group") return;

  // Gentle float bob using coin's base Y stored in userData
  const baseY = group.userData._baseY ?? group.position.y;
  group.userData._baseY = baseY;
  group.position.y = baseY + Math.sin(t * 2.2 + (group.userData._phase || 0)) * 0.06;

  // Spin — fast enough to feel arcade-y, slow enough to read the face
  group.rotation.y += 0.018;

  // Gentle tilt
  group.rotation.x = Math.sin(t * 1.1 + (group.userData._phase || 0)) * 0.06;

  // Glow pulse
  const g = group.userData._glowLight;
  if (g) g.intensity = 0.25 + Math.sin(t * 2.5) * 0.12 + audioBeat * 0.2;

  const a = group.userData._auraMat;
  if (a) a.opacity = 0.12 + Math.sin(t * 2.0) * 0.06 + audioBeat * 0.08;

  const ce = group.userData._cyanEdgeMat;
  if (ce) ce.opacity = 0.6 + Math.sin(t * 1.8) * 0.18 + audioBeat * 0.1;
}

// ── Factory ──────────────────────────────────────────────────
export default function createVibeCoin(scene, pos, value = 1, id = null, phase = 0) {
  if (!scene) return null;
  const isArray = Array.isArray(pos);
  const fx = isArray ? pos[0] : (pos?.x ?? 0);
  const fy = isArray ? (pos[1] ?? 0.5) : (pos?.y ?? 0.5);
  const fz = isArray ? pos[2] : (pos?.z ?? 0);

  const group = new Group();
  group.name = "vibeCoin";
  group.position.set(fx, fy, fz);
  group.userData.coinValue = value;
  group.userData.coinId = id;
  group.userData._baseY = fy;
  group.userData._phase = phase;
  buildCoin(group);
  scene.add(group);
  return group;
}