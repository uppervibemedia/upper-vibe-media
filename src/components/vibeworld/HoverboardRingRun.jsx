/**
 * HoverboardRingRun — 3D scene geometry + animation for the ring-run mini-game.
 * Placed at RIGHT side of beach (x=20, z=22), opposite Zen Beach (x=-20).
 *
 * Exports:
 *   createHoverboardZone(scene)  — builds all static geometry + ring path
 *   animateHoverboardZone(scene, t, beat)  — called from render loop
 *   HOVERBOARD_START = { x, z }
 *   HOVERBOARD_RINGS  — array of ring world positions for collision
 */
import * as THREE from "three";

const {
  CircleGeometry, RingGeometry, SphereGeometry, BoxGeometry, CylinderGeometry,
  TorusGeometry, PlaneGeometry,
  Color, Mesh, Group, PointLight,
  MeshBasicMaterial, MeshStandardMaterial,
  BufferGeometry, BufferAttribute, PointsMaterial, Points,
  SpriteMaterial, Sprite, CanvasTexture, LinearFilter, AdditiveBlending,
} = THREE;

export const HOVERBOARD_START = { x: 20, z: 22 };
export const HOVERBOARD_INTERACT_RADIUS = 4.0;

// Ring path — 8 rings spread in a loose figure-8 over the beach/ocean edge
// Each ring: { x, y, z, rotY }
export const HOVERBOARD_RINGS = [
  { id: 0, x: 20,   y: 1.2, z: 18,   rotY: 0 },
  { id: 1, x: 24,   y: 1.5, z: 14,   rotY: 0.4 },
  { id: 2, x: 26,   y: 1.8, z: 10,   rotY: 0.6 },
  { id: 3, x: 22,   y: 1.4, z: 6,    rotY: -0.3 },
  { id: 4, x: 16,   y: 1.6, z: 9,    rotY: -0.5 },
  { id: 5, x: 18,   y: 1.3, z: 14,   rotY: 0.2 },
  { id: 6, x: 22,   y: 1.7, z: 18,   rotY: 0.1 },
  { id: 7, x: 20,   y: 1.0, z: 22,   rotY: 0 },
];

function mat(hex, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hex);
  m.roughness = opts.roughness ?? 0.4;
  m.metalness = opts.metalness ?? 0.6;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = opts.depthWrite ?? true; }
  return m;
}

function bmat(hex, opacity = 1) {
  const m = new MeshBasicMaterial({ color: new Color(hex), depthWrite: false });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}

export function createHoverboardZone(scene) {
  const { x: SX, z: SZ } = HOVERBOARD_START;

  // ── Start pad ──────────────────────────────────────────────
  const padGroup = new Group();
  padGroup.name = "hoverboardPad";

  const pad = new Mesh(new CylinderGeometry(1.8, 2.0, 0.12, 24), mat("#1A1040", { roughness: 0.2, metalness: 0.8 }));
  pad.position.set(SX, 0.06, SZ);
  pad.receiveShadow = true;
  scene.add(pad);

  // Glowing outer ring
  const padRingMat = bmat("#00E5FF", 0.7);
  const padRing = new Mesh(new RingGeometry(1.6, 1.85, 48), padRingMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(SX, 0.14, SZ);
  padRing.renderOrder = 1;
  padRing.name = "hbPadRing";
  scene.add(padRing);
  scene.userData.hbPadRingMat = padRingMat;

  // Inner checkered neon grid (4 small squares)
  for (let gx = -1; gx <= 1; gx += 2) {
    for (let gz = -1; gz <= 1; gz += 2) {
      const sq = new Mesh(new BoxGeometry(0.6, 0.02, 0.6), bmat(gx === gz ? "#00E5FF" : "#C43BFF", 0.5));
      sq.position.set(SX + gx * 0.45, 0.13, SZ + gz * 0.45);
      scene.add(sq);
    }
  }

  // ── Hoverboard display prop — floating board ────────────────
  const board = new Group();
  board.name = "hbBoardProp";
  const boardBody = new Mesh(new BoxGeometry(1.0, 0.08, 0.35), mat("#0A0A20", { roughness: 0.15, metalness: 0.9 }));
  boardBody.position.set(SX, 0.45, SZ);
  boardBody.castShadow = true;
  scene.add(boardBody);
  scene.userData.hbBoardProp = boardBody;

  const boardGlow = new Mesh(new BoxGeometry(1.0, 0.03, 0.35), bmat("#00E5FF", 0.65));
  boardGlow.position.set(SX, 0.42, SZ);
  scene.add(boardGlow);
  scene.userData.hbBoardGlowMat = boardGlow.material;

  // Board thrusters
  for (const bx of [-0.35, 0.35]) {
    const thruster = new Mesh(new CylinderGeometry(0.05, 0.07, 0.04, 8), bmat("#00E5FF", 0.9));
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(SX + bx, 0.43, SZ + 0.19);
    scene.add(thruster);
  }

  // Start arch — two pylons + top bar
  for (const bx of [-2.2, 2.2]) {
    const pylon = new Mesh(new CylinderGeometry(0.1, 0.12, 3.0, 10), mat("#111130", { roughness: 0.3, metalness: 0.7 }));
    pylon.position.set(SX + bx, 1.5, SZ - 2.0);
    pylon.castShadow = true;
    scene.add(pylon);

    const pylonGlow = new Mesh(new CylinderGeometry(0.04, 0.04, 2.9, 8), bmat(bx < 0 ? "#C43BFF" : "#00E5FF", 0.65));
    pylonGlow.position.set(SX + bx, 1.5, SZ - 2.0);
    scene.add(pylonGlow);
  }
  const archBar = new Mesh(new BoxGeometry(4.6, 0.1, 0.1), bmat("#00E5FF", 0.85));
  archBar.position.set(SX, 3.02, SZ - 2.0);
  scene.add(archBar);
  scene.userData.hbArchBarMat = archBar.material;

  // START label on arch
  const lblCanvas = document.createElement("canvas");
  lblCanvas.width = 256; lblCanvas.height = 64;
  const lCtx = lblCanvas.getContext("2d");
  lCtx.shadowColor = "#00E5FF"; lCtx.shadowBlur = 18;
  lCtx.font = "bold 28px 'Syne','Inter',sans-serif";
  lCtx.textAlign = "center"; lCtx.textBaseline = "middle";
  lCtx.fillStyle = "#ffffff";
  lCtx.fillText("START", 128, 32);
  const lblTex = new CanvasTexture(lblCanvas);
  lblTex.minFilter = LinearFilter;
  lblTex.colorSpace = THREE.SRGBColorSpace;
  const lblSprite = new Sprite(new SpriteMaterial({ map: lblTex, transparent: true, depthWrite: false, depthTest: false }));
  lblSprite.scale.set(3.2, 0.8, 1);
  lblSprite.position.set(SX, 3.55, SZ - 2.0);
  lblSprite.renderOrder = 999;
  scene.add(lblSprite);

  // ── Ring path ────────────────────────────────────────────────
  const ringMeshes = [];
  const ringGlowMats = [];

  HOVERBOARD_RINGS.forEach((r, i) => {
    const ringGroup = new Group();
    ringGroup.name = `hbRing_${i}`;
    ringGroup.rotation.y = r.rotY;

    // Main torus ring
    const ringMat = bmat(i % 2 === 0 ? "#00E5FF" : "#C43BFF", 0.85);
    const ring = new Mesh(new TorusGeometry(1.6, 0.12, 12, 48), ringMat);
    ring.name = `hbRingMesh_${i}`;
    ringGroup.add(ring);
    ringGlowMats.push(ringMat);

    // Inner glow ring (translucent fill)
    const innerFill = new Mesh(
      new CircleGeometry(1.45, 32),
      bmat(i % 2 === 0 ? "#00E5FF" : "#C43BFF", 0.07)
    );
    innerFill.side = THREE.DoubleSide;
    ringGroup.add(innerFill);

    // Checkpoint number
    const numCanvas = document.createElement("canvas");
    numCanvas.width = 64; numCanvas.height = 64;
    const nCtx = numCanvas.getContext("2d");
    nCtx.shadowColor = "#ffffff"; nCtx.shadowBlur = 12;
    nCtx.font = "bold 32px sans-serif"; nCtx.textAlign = "center"; nCtx.textBaseline = "middle";
    nCtx.fillStyle = "#ffffff";
    nCtx.fillText(String(i + 1), 32, 32);
    const numTex = new CanvasTexture(numCanvas);
    numTex.minFilter = LinearFilter;
    numTex.colorSpace = THREE.SRGBColorSpace;
    const numSprite = new Sprite(new SpriteMaterial({ map: numTex, transparent: true, depthWrite: false, depthTest: false }));
    numSprite.scale.set(0.8, 0.8, 1);
    numSprite.position.set(0, 1.9, 0);
    numSprite.renderOrder = 998;
    ringGroup.add(numSprite);

    ringGroup.position.set(r.x, r.y, r.z);
    scene.add(ringGroup);
    ringMeshes.push({ group: ringGroup, mat: ringMat, idx: i });
  });

  scene.userData.hbRingMeshes = ringMeshes;
  scene.userData.hbRingGlowMats = ringGlowMats;

  // ── Zone ambient light ──────────────────────────────────────
  const hbLight = new PointLight();
  hbLight.color = new Color("#00C8FF");
  hbLight.intensity = 3.0;
  hbLight.distance = 18;
  hbLight.position.set(SX, 3, SZ);
  hbLight.name = "hbLight";
  scene.add(hbLight);
  scene.userData.hbLight = hbLight;

  // ── Neon sign ───────────────────────────────────────────────
  _createHbSign(scene, SX, 4.2, SZ, "HOVERBOARD  RING  RUN", "#00E5FF");

  return { padRingMat, ringMeshes };
}

function _createHbSign(scene, x, y, z, text, colorHex) {
  const group = new Group();
  group.name = "neonSign_" + text.replace(/\s+/g, "");
  const backMat = new MeshBasicMaterial({ color: new Color(colorHex), transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
  group.add(new Mesh(new PlaneGeometry(7, 1.7), backMat));
  backMat.name = "neonBack";
  const borderMat = new MeshBasicMaterial({ color: new Color(colorHex), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
  const border = new Mesh(new PlaneGeometry(7.1, 1.8), borderMat);
  border.renderOrder = 1;
  group.add(border);

  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex; ctx.shadowBlur = 12;
  ctx.font = "bold 18px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff"; ctx.fillText(text, 128, 32); ctx.fillText(text, 128, 32);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(6, 1.5, 1); sprite.renderOrder = 2;
  group.add(sprite);

  group.position.set(x, y, z);
  group.userData = { isNeonSign: true, baseOpacity: 0.45, colorHex };
  scene.add(group);
}

/**
 * animateHoverboardZone — call from render loop every frame.
 * t = elapsed seconds, beat = audio beat intensity 0..1
 */
export function animateHoverboardZone(scene, t, beat) {
  // Float + spin the display board
  const board = scene.userData.hbBoardProp;
  if (board) {
    board.position.y = 0.42 + Math.sin(t * 1.8) * 0.06;
    board.rotation.y += 0.008;
  }

  // Pulse board glow
  const bgMat = scene.userData.hbBoardGlowMat;
  if (bgMat) bgMat.opacity = 0.5 + beat * 0.45 + Math.sin(t * 2.2) * 0.12;

  // Pad ring pulse
  const prMat = scene.userData.hbPadRingMat;
  if (prMat) prMat.opacity = 0.5 + beat * 0.5 + Math.sin(t * 1.6) * 0.15;

  // Arch bar color shift
  const archMat = scene.userData.hbArchBarMat;
  if (archMat) {
    const shift = Math.sin(t * 0.9) * 0.5 + 0.5;
    archMat.color.copy(new Color("#00E5FF")).lerp(new Color("#C43BFF"), shift);
    archMat.opacity = 0.7 + beat * 0.25;
  }

  // Zone light pulse
  const hbLight = scene.userData.hbLight;
  if (hbLight) hbLight.intensity = 2.0 + beat * 3.0 + Math.sin(t * 1.4) * 0.5;

  // Ring spin + glow
  const rings = scene.userData.hbRingMeshes;
  if (rings) {
    for (const r of rings) {
      r.group.rotation.y = r.group.userData._baseRotY !== undefined
        ? r.group.userData._baseRotY
        : (r.group.userData._baseRotY = HOVERBOARD_RINGS[r.idx]?.rotY || 0);
      // Gentle tilt oscillation
      r.group.rotation.z = Math.sin(t * 0.6 + r.idx * 0.8) * 0.06;
      r.mat.opacity = 0.6 + beat * 0.38 + Math.sin(t * 2.0 + r.idx * 0.5) * 0.18;
    }
  }
}

/**
 * flashRing — called when player passes through a ring (visual burst)
 */
export function flashRing(scene, ringIdx) {
  const rings = scene.userData.hbRingMeshes;
  if (!rings) return;
  const r = rings[ringIdx];
  if (!r) return;
  // Snap to full brightness; will decay via animation loop naturally
  r.mat.opacity = 1.0;
  // Temporarily boost zone light
  const hbLight = scene.userData.hbLight;
  if (hbLight) hbLight.intensity = 12;
}