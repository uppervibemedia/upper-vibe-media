import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// VibeCoin — small premium collectible coin
// Thin spinning disc, gold face, cyan/purple neon edge glow,
// subtle sparkle ring. Designed to fly through in arcs.
// ─────────────────────────────────────────────────────────────

// ── UVM face texture (cached, single canvas) ─────────────────
let _faceTex = null;
function getFaceTex() {
  if (_faceTex) return _faceTex;
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");

  // Gold radial gradient face
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0,    "#ffe066");
  grad.addColorStop(0.5,  "#d4a800");
  grad.addColorStop(1,    "#7a5000");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  // Thin gold border
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffe566";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "V" icon center — clean, minimal
  ctx.fillStyle = "#fff8cc";
  ctx.font = "bold 26px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("V", 32, 33);

  _faceTex = new THREE.CanvasTexture(c);
  _faceTex.minFilter = THREE.LinearFilter;
  _faceTex.colorSpace = THREE.SRGBColorSpace;
  return _faceTex;
}

// ── Build coin geometry ───────────────────────────────────────
function buildCoin(group) {
  // Thin coin disc (radius 0.22, height 0.04 — very slim)
  const goldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d4a800"),
    roughness: 0.3,
    metalness: 0.8,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20, 1, true),
    goldMat
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Face disc (front only — UVM gold)
  const faceMat = new THREE.MeshBasicMaterial({
    map: getFaceTex(),
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.21, 20), faceMat);
  face.position.y = 0.021;
  group.add(face);
  const face2 = face.clone();
  face2.position.y = -0.021;
  group.add(face2);

  // Neon edge ring — cyan glow
  const edgeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00E5FF"),
    depthWrite: false,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.025, 8, 28),
    edgeMat
  );
  group.add(edge);

  // Outer soft halo ring — purple
  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#A078FF"),
    depthWrite: false,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.38, 28),
    haloMat
  );
  halo.rotation.x = -Math.PI / 2;
  group.add(halo);

  group.userData._edgeMat = edgeMat;
  group.userData._haloMat = haloMat;
  group.userData._isVibeCoin = true;
}

// ── Animation ─────────────────────────────────────────────────
export function animateVibeCoin(group, t = 0, audioBeat = 0) {
  if (!group || group.userData.collected) return;

  // Fast spin (Y axis) — feels like a real coin
  group.rotation.y += 0.055;
  // Gentle tilt wobble
  group.rotation.x = Math.sin(t * 1.4 + (group.userData._phaseOff || 0)) * 0.12;

  // Pulse edge glow
  const em = group.userData._edgeMat;
  if (em) em.opacity = 0.6 + Math.sin(t * 3.5 + (group.userData._phaseOff || 0)) * 0.2 + audioBeat * 0.15;
  const hm = group.userData._haloMat;
  if (hm) hm.opacity = 0.2 + Math.sin(t * 2.2 + (group.userData._phaseOff || 0)) * 0.1;
}

// ── Factory ───────────────────────────────────────────────────
export default function createVibeCoin(scene, pos, value = 1, id = null) {
  if (!scene) return null;
  const isArray = Array.isArray(pos);
  const fx = isArray ? pos[0] : (pos?.x ?? 0);
  const fz = isArray ? pos[2] : (pos?.z ?? 0);

  const group = new THREE.Group();
  group.name = "vibeCoin";
  group.position.set(fx, 0.5, fz);
  group.userData.coinValue = value;
  group.userData.coinId = id;
  group.userData.collected = false;
  group.userData._phaseOff = Math.random() * Math.PI * 2; // stagger animation phases
  buildCoin(group);
  scene.add(group);
  return group;
}