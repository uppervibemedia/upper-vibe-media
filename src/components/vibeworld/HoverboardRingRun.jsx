/**
 * HoverboardRingRun — Compact coastal hoverboard course.
 * 10 rings: 5 heading toward the water edge, 5 looping back to start/finish.
 * All rings are reasonably sized (md/lg only), well-spaced, no overlap.
 * Course stays on the right side of the beach (x: 22 → 5 → back).
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

// Start pad: right side of beach, player runs westward along the shoreline
export const HOVERBOARD_START = { x: 28, z: 23 };
export const HOVERBOARD_INTERACT_RADIUS = 6.0;

// ─── RING DEFINITIONS — U-TURN OUT-AND-BACK COURSE ─────────────────────────
//
// OUT LEG (rings 1–5): Player rides from start westward along the WATER EDGE (high Z ~30).
//   x goes 24 → 4, z stays near 30 (water side).
//
// RETURN LEG (rings 6–10): Player turns around at ring 5, rides east along the
//   BLACKTOP/PATH side (low Z ~22). x goes 4 → 24, z stays near 22.
//
// This creates a clear U-shaped loop: out near water, back near path.
// rotY = 0 so rings face along the Z-axis (perpendicular to the player's east-west path).
export const HOVERBOARD_RINGS = [
  // ── OUT LEG — heading west along the water edge (high Z ~30) ─────────────
  { id: 0, x: 22, y: 1.5, z: 30, rotY: 0, size: "md", color: "#00E5FF" }, // Ring 1
  { id: 1, x: 16, y: 2.0, z: 31, rotY: 0, size: "lg", color: "#00C8FF" }, // Ring 2
  { id: 2, x: 10, y: 1.5, z: 31, rotY: 0, size: "md", color: "#00E5FF" }, // Ring 3
  { id: 3, x:  5, y: 2.2, z: 30, rotY: 0, size: "lg", color: "#00AAFF" }, // Ring 4
  { id: 4, x:  2, y: 1.5, z: 29, rotY: 0, size: "lg", color: "#00E5FF" }, // Ring 5 — TURNAROUND
  // ── RETURN LEG — riding east along the blacktop/path side (low Z ~22) ────
  { id: 5, x:  5, y: 1.5, z: 22, rotY: 0, size: "lg", color: "#C43BFF" }, // Ring 6
  { id: 6, x: 10, y: 2.0, z: 21, rotY: 0, size: "md", color: "#A020F0" }, // Ring 7
  { id: 7, x: 16, y: 1.5, z: 22, rotY: 0, size: "lg", color: "#C43BFF" }, // Ring 8
  { id: 8, x: 21, y: 2.2, z: 21, rotY: 0, size: "md", color: "#A020F0" }, // Ring 9
  { id: 9, x: 25, y: 1.5, z: 22, rotY: 0, size: "lg", color: "#FFD700" }, // Ring 10 — FINISH
];

const RING_RADIUS = { md: 2.0, lg: 2.8 };
const RING_TUBE   = { md: 0.13, lg: 0.18 };
const RING_SEGMENTS = 64;

// Finish portal position — near start pad, on the blacktop return side
const FINISH_POS = { x: 28, y: 1.2, z: 22 };

// Turnaround position — the far west end where the U-turn happens
const TURNAROUND_POS = { x: 2, y: 0, z: 26 };

function bmat(hex, opacity = 1, extra = {}) {
  const m = new MeshBasicMaterial({ color: new Color(hex), depthWrite: false, ...extra });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}

function smat(hex, opts = {}) {
  const m = new MeshStandardMaterial({ color: new Color(hex), roughness: opts.r ?? 0.35, metalness: opts.m ?? 0.7 });
  if (opts.opacity != null) { m.transparent = true; m.opacity = opts.opacity; m.depthWrite = true; }
  return m;
}

function makeLabel(text, colorHex, scale = [3.5, 0.75]) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.shadowColor = colorHex; ctx.shadowBlur = 16;
  ctx.font = "bold 24px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff"; ctx.fillText(text, 128, 32); ctx.fillText(text, 128, 32);
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(...scale, 1); sp.renderOrder = 999;
  return sp;
}

export function createHoverboardZone(scene) {
  const { x: SX, z: SZ } = HOVERBOARD_START;

  // ── START PAD ────────────────────────────────────────────────────────────
  const startPad = new Mesh(new CylinderGeometry(2.5, 2.8, 0.15, 32), smat("#1A1040", { r: 0.15, m: 0.9 }));
  startPad.position.set(SX, 0.07, SZ);
  startPad.receiveShadow = true;
  scene.add(startPad);

  // Outer glow ring
  const padRingMat = bmat("#00E5FF", 0.75);
  const padRing = new Mesh(new RingGeometry(2.2, 2.5, 64), padRingMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(SX, 0.18, SZ);
  padRing.renderOrder = 1; padRing.name = "hbPadRing";
  scene.add(padRing);
  scene.userData.hbPadRingMat = padRingMat;

  // Inner checkerboard squares
  for (let gx = -1; gx <= 1; gx += 2) {
    for (let gz = -1; gz <= 1; gz += 2) {
      const sq = new Mesh(new BoxGeometry(0.8, 0.025, 0.8), bmat(gx === gz ? "#00E5FF" : "#C43BFF", 0.45));
      sq.position.set(SX + gx * 0.6, 0.17, SZ + gz * 0.6);
      scene.add(sq);
    }
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

  // Board thrusters — two per side
  for (const bx of [-0.55, 0.55]) {
    for (const bz of [-0.2, 0.2]) {
      const thruster = new Mesh(new CylinderGeometry(0.06, 0.08, 0.05, 8), bmat("#00E5FF", 0.9));
      thruster.rotation.x = Math.PI / 2;
      thruster.position.set(SX + bx, 0.52, SZ + bz);
      scene.add(thruster);
    }
  }

  // ── START ARCH — straddles the x-axis (player runs west/left) ───────────
  for (const bz of [-3.0, 3.0]) {
    const pylon = new Mesh(new CylinderGeometry(0.12, 0.15, 4.5, 12), smat("#111130", { r: 0.25, m: 0.8 }));
    pylon.position.set(SX + 3, 2.25, SZ + bz);
    pylon.castShadow = true;
    scene.add(pylon);
    const pylonGlow = new Mesh(new CylinderGeometry(0.05, 0.05, 4.4, 8), bmat(bz < 0 ? "#C43BFF" : "#00E5FF", 0.6));
    pylonGlow.position.set(SX + 3, 2.25, SZ + bz);
    scene.add(pylonGlow);
  }
  const archBar = new Mesh(new BoxGeometry(0.12, 0.12, 6.3), bmat("#00E5FF", 0.9));
  archBar.position.set(SX + 3, 4.52, SZ);
  scene.add(archBar);
  scene.userData.hbArchBarMat = archBar.material;

  // Arch label
  const startLabel = makeLabel("HOVERBOARD  RING  RUN", "#00E5FF", [5.5, 1.0]);
  startLabel.position.set(SX, 5.3, SZ);
  scene.add(startLabel);

  // Sub-label: ring count
  const subLabel = makeLabel("OUT & BACK · U-TURN COURSE", "#C43BFF", [4.5, 0.75]);
  subLabel.position.set(SX, 4.2, SZ);
  scene.add(subLabel);

  // ── RING PATH ────────────────────────────────────────────────────────────
  const ringMeshes = [];
  const ringGlowMats = [];

  HOVERBOARD_RINGS.forEach((r, i) => {
    const radius = RING_RADIUS[r.size];
    const tube   = RING_TUBE[r.size];
    const ringGroup = new Group();
    ringGroup.name = `hbRing_${i}`;

    // Main torus
    const ringMat = bmat(r.color, 0.88);
    const torus = new Mesh(new TorusGeometry(radius, tube, 14, RING_SEGMENTS), ringMat);
    torus.name = `hbRingMesh_${i}`;
    ringGroup.add(torus);
    ringGlowMats.push(ringMat);

    // Inner translucent fill — larger rings get more visible fill
    const fillOpacity = r.size === "xl" ? 0.09 : r.size === "lg" ? 0.06 : 0.04;
    const innerFill = new Mesh(
      new CircleGeometry(radius - tube * 0.5, 48),
      bmat(r.color, fillOpacity, { side: THREE.DoubleSide })
    );
    ringGroup.add(innerFill);

    // Outer halo glow (slightly bigger translucent torus)
    const haloPct = r.size === "xl" ? 0.04 : 0.055;
    const haloMat = bmat(r.color, 0.22);
    const halo = new Mesh(new TorusGeometry(radius + 0.18, haloPct * radius * 2, 8, 32), haloMat);
    ringGroup.add(halo);

    // Checkpoint number sprite above ring
    const numC = document.createElement("canvas");
    numC.width = 80; numC.height = 80;
    const nCtx = numC.getContext("2d");
    nCtx.shadowColor = r.color; nCtx.shadowBlur = 18;
    nCtx.font = `bold ${r.size === "xl" ? 44 : 36}px 'Syne',sans-serif`;
    nCtx.textAlign = "center"; nCtx.textBaseline = "middle";
    nCtx.fillStyle = "#fff"; nCtx.fillText(String(i + 1), 40, 40);
    const numTex = new CanvasTexture(numC);
    numTex.minFilter = LinearFilter; numTex.colorSpace = THREE.SRGBColorSpace;
    const numSprite = new Sprite(new SpriteMaterial({ map: numTex, transparent: true, depthWrite: false, depthTest: false }));
    const numScale = radius * 0.65;
    numSprite.scale.set(numScale, numScale, 1);
    numSprite.position.set(0, radius + 0.5, 0);
    numSprite.renderOrder = 998;
    ringGroup.add(numSprite);

    // Height-indicator pole for rings above y=2 (helps player navigate vertically)
    if (r.y > 2.0) {
      const poleH = r.y;
      const pole = new Mesh(new CylinderGeometry(0.03, 0.03, poleH, 6), bmat(r.color, 0.35));
      pole.position.set(0, -poleH / 2, 0); // hangs from ring center down to ground
      ringGroup.add(pole);
    }

    ringGroup.position.set(r.x, r.y, r.z);
    ringGroup.rotation.y = r.rotY;
    // Tilt rings to face along the course direction (perpendicular to path)
    ringGroup.rotation.z = Math.sin(r.rotY * 0.5) * 0.12; // subtle banking
    scene.add(ringGroup);
    ringMeshes.push({ group: ringGroup, mat: ringMat, haloMat, idx: i, collected: false });
  });

  scene.userData.hbRingMeshes = ringMeshes;
  scene.userData.hbRingGlowMats = ringGlowMats;

  // ── FINISH PORTAL ────────────────────────────────────────────────────────
  const finishGroup = new Group();
  finishGroup.name = "hbFinishPortal";

  // Outer frame — two giant stacked tori
  const outerPortalMat = bmat("#FFD700", 0.9);
  const outerPortal = new Mesh(new TorusGeometry(5.0, 0.22, 16, 64), outerPortalMat);
  finishGroup.add(outerPortal);
  scene.userData.hbPortalOuterMat = outerPortalMat;

  const innerPortalMat = bmat("#00E5FF", 0.75);
  const innerPortal = new Mesh(new TorusGeometry(4.0, 0.14, 12, 64), innerPortalMat);
  finishGroup.add(innerPortal);
  scene.userData.hbPortalInnerMat = innerPortalMat;

  // Portal fill — shimmering energy disc
  const portalFillMat = bmat("#00E5FF", 0.12, { side: THREE.DoubleSide });
  const portalFill = new Mesh(new CircleGeometry(4.0, 64), portalFillMat);
  finishGroup.add(portalFill);
  scene.userData.hbPortalFillMat = portalFillMat;

  // Portal columns — left & right
  for (const bx of [-5.6, 5.6]) {
    const col = new Mesh(new CylinderGeometry(0.15, 0.18, 6.5, 12), smat("#1A0A30", { r: 0.2, m: 0.85 }));
    col.position.set(bx, 3.25, 0);
    finishGroup.add(col);
    const colGlow = new Mesh(new CylinderGeometry(0.06, 0.06, 6.4, 8), bmat("#FFD700", 0.5));
    colGlow.position.set(bx, 3.25, 0);
    finishGroup.add(colGlow);
  }

  // FINISH label above portal
  const finishLabel = makeLabel("FINISH", "#FFD700", [5.0, 1.1]);
  finishLabel.position.set(0, 6.5, 0);
  finishGroup.add(finishLabel);

  finishGroup.position.set(FINISH_POS.x, FINISH_POS.y + 3.5, FINISH_POS.z);
  finishGroup.rotation.y = Math.PI / 2; // face along the Z-axis (player rides east past it)
  scene.add(finishGroup);
  scene.userData.hbFinishGroup = finishGroup;

  // Finish portal point light
  const finishLight = new PointLight();
  finishLight.color = new Color("#FFD700");
  finishLight.intensity = 6.0; finishLight.distance = 20;
  finishLight.position.set(FINISH_POS.x, FINISH_POS.y + 4.0, FINISH_POS.z);
  finishLight.name = "hbFinishLight";
  scene.add(finishLight);
  scene.userData.hbFinishLight = finishLight;

  // ── GUIDE LINES — blue for out leg (water side), purple for return leg ───
  // Draw glowing ground-level dots forming two clear guide paths.

  // OUT LEG guide (rings 1-5): blue dots near z~30 (water edge)
  // Go from start pad → ring 5, spaced every ~2 units along X
  const outPoints = [
    { x: 28, z: 29.5 }, { x: 25, z: 30 }, { x: 22, z: 30.5 },
    { x: 19, z: 30.8 }, { x: 16, z: 31 }, { x: 13, z: 31 },
    { x: 10, z: 31 }, { x: 7, z: 30.5 }, { x: 4, z: 30 }, { x: 2, z: 29 },
  ];
  outPoints.forEach((p, i) => {
    const dot = new Mesh(new SphereGeometry(0.18, 6, 4), bmat("#00C8FF", 0.55));
    dot.position.set(p.x, 0.12, p.z);
    dot.name = `hbGuideDot_out_${i}`;
    scene.add(dot);
  });

  // Glowing arrow chevrons on out leg — pointing west (toward ring 5)
  for (let ax = 25; ax >= 4; ax -= 6) {
    const arr = new Group();
    arr.name = `hbArrowOut_${ax}`;
    // V-shape: two angled bars
    for (const side of [-1, 1]) {
      const bar = new Mesh(new BoxGeometry(0.08, 0.08, 1.1), bmat("#00E5FF", 0.7));
      bar.rotation.y = side * 0.5;
      bar.position.set(side * 0.35, 0.15, 0);
      arr.add(bar);
    }
    arr.position.set(ax, 0.15, 30.5);
    arr.rotation.y = Math.PI; // point west
    scene.add(arr);
  }

  // RETURN LEG guide (rings 6-10): purple dots near z~22 (blacktop side)
  const returnPoints = [
    { x: 2, z: 24 }, { x: 5, z: 22.5 }, { x: 8, z: 22 },
    { x: 11, z: 21.5 }, { x: 14, z: 21.5 }, { x: 17, z: 22 },
    { x: 20, z: 21.5 }, { x: 22, z: 22 }, { x: 25, z: 22 }, { x: 28, z: 22.5 },
  ];
  returnPoints.forEach((p, i) => {
    const dot = new Mesh(new SphereGeometry(0.18, 6, 4), bmat("#C43BFF", 0.55));
    dot.position.set(p.x, 0.12, p.z);
    dot.name = `hbGuideDot_ret_${i}`;
    scene.add(dot);
  });

  // Glowing arrow chevrons on return leg — pointing east (toward finish)
  for (let ax = 4; ax <= 26; ax += 6) {
    const arr = new Group();
    arr.name = `hbArrowRet_${ax}`;
    for (const side of [-1, 1]) {
      const bar = new Mesh(new BoxGeometry(0.08, 0.08, 1.1), bmat("#C43BFF", 0.7));
      bar.rotation.y = side * 0.5;
      bar.position.set(side * 0.35, 0.15, 0);
      arr.add(bar);
    }
    arr.position.set(ax, 0.15, 21.5);
    arr.rotation.y = 0; // point east
    scene.add(arr);
  }

  // ── TURNAROUND MARKER — glowing U-turn indicator at the far west end ──────
  const turnGroup = new Group();
  turnGroup.name = "hbTurnaround";

  const turnPad = new Mesh(new CylinderGeometry(2.2, 2.5, 0.12, 32), smat("#200830", { r: 0.15, m: 0.9 }));
  turnPad.position.y = 0.06;
  turnGroup.add(turnPad);

  const turnRingMat = bmat("#FFD700", 0.8);
  const turnRing = new Mesh(new RingGeometry(1.8, 2.2, 64), turnRingMat);
  turnRing.rotation.x = -Math.PI / 2;
  turnRing.position.y = 0.14;
  turnRing.renderOrder = 1;
  turnGroup.add(turnRing);
  scene.userData.hbTurnRingMat = turnRingMat;

  const turnLabel = makeLabel("U-TURN", "#FFD700", [3.5, 0.8]);
  turnLabel.position.y = 3.2;
  turnGroup.add(turnLabel);

  // Arrow pointing right (east) to indicate direction change
  const arrowLabel = makeLabel("➜", "#FFD700", [2.0, 2.0]);
  arrowLabel.position.set(1.5, 2.2, 0);
  turnGroup.add(arrowLabel);

  // Twin pylons
  for (const bz of [-2.5, 2.5]) {
    const tp = new Mesh(new CylinderGeometry(0.1, 0.12, 4.0, 10), smat("#111030", { r: 0.2, m: 0.85 }));
    tp.position.set(0, 2.0, bz);
    turnGroup.add(tp);
    const tpg = new Mesh(new CylinderGeometry(0.04, 0.04, 3.9, 8), bmat("#FFD700", 0.55));
    tpg.position.set(0, 2.0, bz);
    turnGroup.add(tpg);
  }

  turnGroup.position.set(TURNAROUND_POS.x, TURNAROUND_POS.y, TURNAROUND_POS.z);
  scene.add(turnGroup);
  scene.userData.hbTurnGroup = turnGroup;

  // ── ZONE AMBIENT LIGHTS ─────────────────────────────────────────────────
  const hbLight = new PointLight();
  hbLight.color = new Color("#00C8FF");
  hbLight.intensity = 3.5; hbLight.distance = 22;
  hbLight.position.set(SX, 4, SZ);
  hbLight.name = "hbLight";
  scene.add(hbLight);
  scene.userData.hbLight = hbLight;

  // Mid-course light (water side, midway out)
  const midLight = new PointLight();
  midLight.color = new Color("#00C8FF");
  midLight.intensity = 3.0; midLight.distance = 22;
  midLight.position.set(12, 5, 31);
  scene.add(midLight);
  scene.userData.hbMidLight = midLight;

  // Turnaround light
  const turnLight = new PointLight();
  turnLight.color = new Color("#FFD700");
  turnLight.intensity = 4.0; turnLight.distance = 18;
  turnLight.position.set(TURNAROUND_POS.x, 4, TURNAROUND_POS.z);
  scene.add(turnLight);
  scene.userData.hbTurnLight = turnLight;

  // Return leg light (blacktop side)
  const retLight = new PointLight();
  retLight.color = new Color("#C43BFF");
  retLight.intensity = 3.0; retLight.distance = 22;
  retLight.position.set(12, 5, 21);
  scene.add(retLight);
  scene.userData.hbRetLight = retLight;

  return { padRingMat, ringMeshes };
}

/**
 * animateHoverboardZone — call from render loop every frame.
 */
export function animateHoverboardZone(scene, t, beat) {
  // Float the display board
  const board = scene.userData.hbBoardProp;
  if (board) {
    board.position.y = 0.52 + Math.sin(t * 1.8) * 0.08;
    board.rotation.y += 0.006;
  }

  const bgMat = scene.userData.hbBoardGlowMat;
  if (bgMat) bgMat.opacity = 0.5 + beat * 0.45 + Math.sin(t * 2.2) * 0.12;

  const prMat = scene.userData.hbPadRingMat;
  if (prMat) prMat.opacity = 0.55 + beat * 0.45 + Math.sin(t * 1.5) * 0.12;

  const archMat = scene.userData.hbArchBarMat;
  if (archMat) {
    const shift = Math.sin(t * 0.85) * 0.5 + 0.5;
    archMat.color.copy(new Color("#00E5FF")).lerp(new Color("#C43BFF"), shift);
    archMat.opacity = 0.75 + beat * 0.22;
  }

  const hbLight = scene.userData.hbLight;
  if (hbLight) hbLight.intensity = 2.5 + beat * 3.5 + Math.sin(t * 1.3) * 0.6;

  const midLight = scene.userData.hbMidLight;
  if (midLight) midLight.intensity = 2.0 + beat * 2.5 + Math.sin(t * 1.7 + 1.2) * 0.5;

  // ── Ring spin + glow ───────────────────────────────────────────────────
  const rings = scene.userData.hbRingMeshes;
  if (rings) {
    for (const r of rings) {
      // Gentle tilt oscillation only (no Y spin — keeps rings aligned to course)
      r.group.rotation.z = Math.sin(t * 0.5 + r.idx * 0.9) * 0.07;
      if (r.collected) {
        // Fade collected rings out
        r.mat.opacity = Math.max(0.08, r.mat.opacity - 0.03);
        if (r.haloMat) r.haloMat.opacity = Math.max(0.02, r.haloMat.opacity - 0.02);
      } else {
        r.mat.opacity = 0.65 + beat * 0.32 + Math.sin(t * 1.8 + r.idx * 0.6) * 0.16;
        if (r.haloMat) r.haloMat.opacity = 0.12 + beat * 0.18 + Math.sin(t * 1.2 + r.idx * 0.5) * 0.08;
      }
    }
  }

  // ── Finish portal ──────────────────────────────────────────────────────
  const fg = scene.userData.hbFinishGroup;
  if (fg) {
    fg.rotation.y += 0.005;
    fg.rotation.z = Math.sin(t * 0.4) * 0.04;
  }
  const outerM = scene.userData.hbPortalOuterMat;
  if (outerM) outerM.opacity = 0.75 + beat * 0.22 + Math.sin(t * 1.1) * 0.1;
  const innerM = scene.userData.hbPortalInnerMat;
  if (innerM) innerM.opacity = 0.6 + beat * 0.3 + Math.sin(t * 1.5) * 0.12;
  const fillM = scene.userData.hbPortalFillMat;
  if (fillM) {
    fillM.opacity = 0.08 + beat * 0.15 + Math.sin(t * 2.0) * 0.04;
    fillM.color.copy(new Color("#00E5FF")).lerp(new Color("#C43BFF"), Math.sin(t * 0.6) * 0.5 + 0.5);
  }
  const fl = scene.userData.hbFinishLight;
  if (fl) {
    fl.intensity = 4.0 + beat * 5.0 + Math.sin(t * 1.8) * 1.2;
    fl.color.copy(new Color("#FFD700")).lerp(new Color("#00E5FF"), Math.sin(t * 0.5) * 0.5 + 0.5);
  }

  // ── Guide dot + arrow pulse ────────────────────────────────────────────
  scene.children.forEach((c) => {
    if (c.name?.startsWith("hbGuideDot_out_") && c.material) {
      // Blue out-leg dots pulse brighter
      c.material.opacity = 0.35 + beat * 0.35 + Math.sin(t * 2.8 + c.position.x * 0.4) * 0.18;
    } else if (c.name?.startsWith("hbGuideDot_ret_") && c.material) {
      // Purple return-leg dots pulse offset
      c.material.opacity = 0.35 + beat * 0.35 + Math.sin(t * 2.8 + c.position.x * 0.4 + Math.PI) * 0.18;
    } else if (c.name?.startsWith("hbArrowOut_") || c.name?.startsWith("hbArrowRet_")) {
      // Arrow chevrons flash with beat
      c.children?.forEach((bar) => {
        if (bar.material) bar.material.opacity = 0.45 + beat * 0.5 + Math.sin(t * 3.0 + c.position.x * 0.3) * 0.2;
      });
    }
  });

  // Turnaround marker pulse
  const turnRingM = scene.userData.hbTurnRingMat;
  if (turnRingM) turnRingM.opacity = 0.55 + beat * 0.42 + Math.sin(t * 1.8) * 0.15;
  const tl = scene.userData.hbTurnLight;
  if (tl) tl.intensity = 3.0 + beat * 3.5 + Math.sin(t * 1.4) * 0.8;
  const rl = scene.userData.hbRetLight;
  if (rl) rl.intensity = 2.0 + beat * 2.5 + Math.sin(t * 1.6 + 1.5) * 0.5;
}

/**
 * flashRing — visual burst when player passes through a ring
 */
export function flashRing(scene, ringIdx) {
  const rings = scene.userData.hbRingMeshes;
  if (!rings) return;
  const r = rings[ringIdx];
  if (!r) return;
  r.mat.opacity = 1.0;
  r.collected = true;
  if (r.haloMat) r.haloMat.opacity = 0.6;
  const hbLight = scene.userData.hbLight;
  if (hbLight) hbLight.intensity = 15;
}

/**
 * resetRings — called when player starts a new run
 */
export function resetRings(scene) {
  const rings = scene.userData.hbRingMeshes;
  if (!rings) return;
  for (const r of rings) {
    r.collected = false;
    r.mat.opacity = 0.88;
    if (r.haloMat) r.haloMat.opacity = 0.22;
  }
}