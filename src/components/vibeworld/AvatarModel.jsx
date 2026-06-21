/**
 * AvatarModel — Procedural stylized humanoid avatar.
 * Human proportions: ~1.75m tall, feet at y=0, head at y≈1.72
 * Separate shirt + pants + shoes. Natural relaxed arm pose.
 */

import * as THREE from "three";
import { SPAWN } from "./cityData";

// ─── SKIN & HAIR PALETTES ────────────────────────────────────────────────────
const SKIN_TONES = {
  "light":        0xffe0c0,
  "medium-light": 0xf0b880,
  "medium":       0xc87840,
  "medium-dark":  0x9a5828,
  "dark":         0x6b3418,
  "deep":         0x3e200e,
};

const HAIR_COLORS = {
  "light":        0xc8a060,
  "medium-light": 0x7a4820,
  "medium":       0x1a0a04,
  "medium-dark":  0x100804,
  "dark":         0x080402,
  "deep":         0x050201,
};

const OUTFIT = {
  streetwear: { shirt: 0x1e3a7a, pants: 0x121220, shoes: 0x0e0e1a, accent: 0x00d4f0, shoeSole: 0xffffff },
  cosmic:     { shirt: 0x1a1060, pants: 0x0a0818, shoes: 0x08060e, accent: 0xa040ff, shoeSole: 0xa040ff },
};

// Override palette from custom hex strings (used by AvatarTestPlatform color picker)
function buildPalette(base, overrides = {}) {
  const p = { ...base };
  if (overrides.shirt)  p.shirt  = parseInt(overrides.shirt.replace("#", ""), 16);
  if (overrides.pants)  p.pants  = parseInt(overrides.pants.replace("#", ""), 16);
  if (overrides.accent) p.accent = parseInt(overrides.accent.replace("#", ""), 16);
  if (overrides.shoes)  p.shoes  = parseInt(overrides.shoes.replace("#", ""), 16);
  return p;
}

// ─── MATERIAL HELPERS ────────────────────────────────────────────────────────
function stdMat(hex, rough = 0.6, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
}
function basicMat(hex) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
}
function glowMat(hex, opacity = 0.85) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity, depthWrite: false });
}

// ─── NAME LABEL ──────────────────────────────────────────────────────────────
function makeNameSprite(name) {
  const nc = document.createElement("canvas");
  nc.width = 256; nc.height = 52;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 17px 'Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 5;
  ctx.fillStyle = "rgba(255,255,255,0.93)";
  ctx.fillText((name || "User").substring(0, 16), 128, 26);
  const tex = new THREE.CanvasTexture(nc);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(1.4, 0.34, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function makeShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  return shadow;
}

// ─── FACE ─────────────────────────────────────────────────────────────────────
/*
  Head radius = 0.115. Face features placed on +Z hemisphere.
  Total head unit centered at headAnchor. Eyes, nose, mouth, brows, ears.
*/
function makeFace(skinHex, avatarType) {
  const g = new THREE.Group();
  g.name = "face";

  const skin = basicMat(skinHex);
  const eyeWhite = basicMat(0xf5f5f5);
  const iris = basicMat(avatarType === "feminine" ? 0x5577ee : 0x2a5060);
  const pupil = basicMat(0x060606);
  const brow = new THREE.MeshBasicMaterial({ color: new THREE.Color(skinHex).multiplyScalar(0.3) });
  const lipColor = new THREE.Color(skinHex).multiplyScalar(0.72);
  const lip = new THREE.MeshBasicMaterial({ color: lipColor });
  const R = 0.115; // head radius

  // Head sphere
  g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 22, 16), skin));

  // Eyes
  for (const sx of [0.042, -0.042]) {
    // Slightly recessed eye socket
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.030, 10, 8), skin);
    socket.position.set(sx, 0.018, R * 0.88); g.add(socket);

    const white = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), eyeWhite);
    white.position.set(sx, 0.018, R * 0.94); g.add(white);

    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), iris);
    ir.position.set(sx, 0.018, R * 0.99); g.add(ir);

    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 4), pupil);
    pu.position.set(sx, 0.018, R * 1.01); g.add(pu);

    // Eyebrow — slightly arched
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.008, 0.006), brow);
    br.position.set(sx, 0.058, R * 0.90);
    br.rotation.z = sx > 0 ? -0.15 : 0.15;
    g.add(br);
  }

  // Nose — small rounded bump
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), skin);
  nose.scale.set(0.9, 0.65, 1.2);
  nose.position.set(0, -0.008, R * 1.00); g.add(nose);

  // Nostrils (very subtle)
  for (const nx of [0.012, -0.012]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.006, 5, 4), skin);
    n.position.set(nx, -0.022, R * 0.97); g.add(n);
  }

  // Upper lip
  const uLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.020, 0.018, 3, 6), lip);
  uLip.rotation.z = Math.PI / 2;
  uLip.position.set(0, -0.040, R * 0.95); g.add(uLip);

  // Lower lip (slightly fuller)
  const lLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.024, 3, 6), lip);
  lLip.rotation.z = Math.PI / 2;
  lLip.position.set(0, -0.054, R * 0.94); g.add(lLip);

  // Ears
  for (const sx of [R * 1.0, -R * 1.0]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 7, 5), skin);
    ear.scale.set(0.42, 0.72, 0.42);
    ear.position.set(sx, 0.004, 0); g.add(ear);
  }

  return g;
}

// ─── HAIR ─────────────────────────────────────────────────────────────────────
/*
  Masculine: clean low fade — tight on sides, textured on top
  Feminine:  flowing medium length
  Neutral:   medium-length natural
*/
function makeHair(hairHex, avatarType) {
  const g = new THREE.Group();
  g.name = "hair";
  const mat = stdMat(hairHex, 0.88, 0.0);
  const R = 0.115;

  if (avatarType === "feminine") {
    // Top cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
    cap.position.set(0, 0.004, -0.002); g.add(cap);
    // Side curtains
    for (const sx of [R * 0.95, -R * 0.95]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.082, 8, 6), mat);
      side.scale.set(0.48, 1.55, 0.58);
      side.position.set(sx, -0.062, 0.008); g.add(side);
    }
    // Back flowing
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), mat);
    back.scale.set(0.72, 1.75, 0.68);
    back.position.set(0, -0.088, -0.065); g.add(back);

  } else if (avatarType === "masculine") {
    // Short tight fade — thin sides, top detail
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), mat);
    cap.position.set(0, 0.008, 0); g.add(cap);
    // Top texture bumps (waves / coils)
    for (let i = 0; i < 5; i++) {
      const bx = (i - 2) * 0.022;
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), mat);
      bump.scale.set(1.0, 0.45, 0.85);
      bump.position.set(bx, R * 0.85, R * 0.3); g.add(bump);
    }
    // Back ridge
    const ridge = new THREE.Mesh(new THREE.SphereGeometry(0.048, 6, 5), mat);
    ridge.scale.set(1.2, 0.38, 0.7);
    ridge.position.set(0, R * 0.7, -R * 0.38); g.add(ridge);

  } else {
    // Neutral: medium natural puff
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.50), mat);
    cap.position.set(0, 0.005, -0.002); g.add(cap);
    for (const sx of [R * 0.9, -R * 0.9]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.060, 7, 5), mat);
      side.scale.set(0.46, 0.95, 0.52);
      side.position.set(sx, -0.018, 0); g.add(side);
    }
  }

  return g;
}

// ─── BUILD FULL AVATAR BODY ───────────────────────────────────────────────────
/*
  HEIGHT LAYOUT (y=0 is ground, avatar stands straight):
    Shoe sole:   y = 0
    Ankle:       y = 0.10
    Knee pivot:  y = 0.48
    Hip pivot:   y = 0.90
    Waist:       y = 0.92
    Torso ctr:   y = 1.05
    Shoulder:    y = 1.30
    Neck base:   y = 1.46
    Head ctr:    y = 1.60
    Top of head: y ≈ 1.72
*/
function buildAvatarBody(opts = {}) {
  const { avatarType = "neutral", skinTone = "medium", avatarStyle = "streetwear", colorOverrides = {} } = opts;
  const skinHex = SKIN_TONES[skinTone] || SKIN_TONES.medium;
  const hairHex = HAIR_COLORS[skinTone] || HAIR_COLORS.medium;
  const basePal = OUTFIT[avatarStyle === "cosmic" ? "cosmic" : "streetwear"];
  const pal = buildPalette(basePal, colorOverrides);

  const root = new THREE.Group();
  root.name = "avatar";

  const skinMat  = basicMat(skinHex);
  const shirtMat = stdMat(pal.shirt, 0.55, 0.08);
  const pantMat  = stdMat(pal.pants, 0.65, 0.04);
  const shoeMat  = stdMat(pal.shoes, 0.45, 0.35);
  const soleM    = glowMat(pal.shoeSole, 0.6);
  const neonM    = glowMat(pal.accent, 0.85);

  // ── LEGS ───────────────────────────────────────────────────────────────────
  //  Hip pivot at y=0.90. Thigh hangs to y≈0.52. Knee at y=0.48. Shin to y≈0.10.
  for (const { name, sx } of [{ name: "leftHip", sx: 0.10 }, { name: "rightHip", sx: -0.10 }]) {
    const hipG = new THREE.Group();
    hipG.name = name;
    hipG.position.set(sx, 0.90, 0);

    // Thigh — upper leg
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.26, 4, 8), pantMat);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    hipG.add(thigh);

    // Knee pivot
    const kneeG = new THREE.Group();
    kneeG.name = name.replace("Hip", "Knee");
    kneeG.position.y = -0.44; // from hip down to knee

    // Shin
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), pantMat);
    shin.position.y = -0.15;
    shin.castShadow = true;
    kneeG.add(shin);

    // Foot/ankle group
    const footG = new THREE.Group();
    footG.name = name.replace("Hip", "Foot");
    footG.position.y = -0.32; // from knee down to ankle

    // Shoe — slightly pointed, futuristic sneaker shape
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.072, 0.22), shoeMat);
    shoe.position.set(0, -0.018, 0.022);
    shoe.castShadow = true;
    footG.add(shoe);

    // Shoe toe cap
    const toecap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), shoeMat);
    toecap.scale.set(0.95, 0.55, 1.1);
    toecap.position.set(0, -0.002, 0.115);
    footG.add(toecap);

    // Sole stripe (neon accent)
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.107, 0.010, 0.22), soleM);
    sole.position.set(0, -0.057, 0.022);
    footG.add(sole);

    kneeG.add(footG);
    kneeG.userData.foot = footG;
    hipG.add(kneeG);
    hipG.userData.leg = { userData: { lowerLeg: kneeG } };
    root.add(hipG);
  }

  // ── PELVIS / WAISTBAND ─────────────────────────────────────────────────────
  // Bridges the two leg hip pivots and the torso base. Prevents any visible gap.
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.145, 0.22, 10), pantMat);
  pelvis.position.set(0, 0.88, 0);
  pelvis.castShadow = true;
  root.add(pelvis);

  // ── TORSO ─────────────────────────────────────────────────────────────────
  // Torso GROUP pivot at y=1.05 (chest center)
  const torsoG = new THREE.Group();
  torsoG.name = "torso";
  torsoG.position.y = 1.05;

  // Main shirt body — tapered capsule (wider shoulders, slight waist)
  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.148, 0.38, 4, 10), shirtMat);
  torsoMesh.castShadow = true;
  torsoG.add(torsoMesh);

  // Waistband detail — separate belt line
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.148, 0.040, 10), stdMat(pal.pants, 0.5, 0.15));
  belt.position.y = -0.21;
  torsoG.add(belt);

  // Belt buckle accent
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.028, 0.010), neonM);
  buckle.position.set(0, -0.21, 0.152);
  torsoG.add(buckle);

  // Collar — crew neck
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.120, 0.10, 10), shirtMat);
  collar.position.y = 0.24;
  torsoG.add(collar);

  // Chest neon stripe — vertical centerline
  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.22, 0.010), neonM);
  chestStripe.position.set(0, 0.06, 0.150);
  torsoG.add(chestStripe);

  // Shoulder accent pips
  for (const sx of [0.158, -0.158]) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), neonM);
    pip.position.set(sx, 0.19, 0.118);
    torsoG.add(pip);
  }

  // ── ARMS (children of torso, so they move with torso) ─────────────────────
  //  Shoulder pivot at torso local (±0.185, 0.20, 0) — just outside capsule edge
  //  Natural idle: arms hang slightly forward and slightly outward
  for (const { name, sx } of [{ name: "leftShoulder", sx: 0.185 }, { name: "rightShoulder", sx: -0.185 }]) {
    const shG = new THREE.Group();
    shG.name = name;
    shG.position.set(sx, 0.20, 0);
    // Natural relaxed hang: very slightly forward
    shG.rotation.x = -0.06;
    shG.rotation.z = sx > 0 ? 0.08 : -0.08;

    // Shoulder cap — connects torso capsule edge to upper arm
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.056, 8, 6), shirtMat);
    cap.scale.set(1.0, 0.85, 0.9);
    cap.position.y = -0.02;
    shG.add(cap);

    // Upper arm (sleeve) — shirt material
    const uArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.17, 4, 6), shirtMat);
    uArm.position.y = -0.115;
    uArm.castShadow = true;
    shG.add(uArm);

    // Elbow pivot — at bottom of upper arm
    const elbG = new THREE.Group();
    elbG.name = name.replace("Shoulder", "Elbow");
    elbG.position.y = -0.23;

    // Forearm — full suit sleeve (no exposed skin)
    const fArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.16, 4, 6), shirtMat);
    fArm.position.y = -0.10;
    fArm.castShadow = true;
    elbG.add(fArm);

    // Wrist cuff — accent trim
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.038, 0.032, 8), neonM);
    cuff.position.y = -0.192;
    elbG.add(cuff);

    // Hand — gloved (suit color)
    const handG = new THREE.Group();
    handG.name = name.replace("Shoulder", "Hand");
    handG.position.y = -0.22;

    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.038, 9, 7), shirtMat);
    palm.scale.set(0.92, 0.75, 0.68);
    handG.add(palm);

    // Thumb stub — gloved
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.020, 3, 5), shirtMat);
    thumb.position.set(sx > 0 ? 0.026 : -0.026, 0.007, 0.010);
    thumb.rotation.z = sx > 0 ? -0.5 : 0.5;
    handG.add(thumb);

    elbG.add(handG);
    elbG.userData.hand = handG;
    shG.add(elbG);
    shG.userData.arm = { userData: { forearm: elbG } };
    torsoG.add(shG);
  }

  root.add(torsoG);

  // ── NECK ──────────────────────────────────────────────────────────────────
  // Suit collar/turtleneck — same material as shirt so no skin gap visible
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.24, 10), shirtMat);
  neck.position.set(0, 1.43, 0);
  neck.castShadow = true;
  root.add(neck);

  // ── HEAD ──────────────────────────────────────────────────────────────────
  const headAnchor = new THREE.Group();
  headAnchor.name = "headAnchor";
  headAnchor.position.set(0, 1.56, 0);
  headAnchor.add(makeFace(skinHex, avatarType));
  headAnchor.add(makeHair(hairHex, avatarType));
  root.add(headAnchor);

  return root;
}

// ─── PUBLIC: createAvatar ────────────────────────────────────────────────────
// opts may include colorOverrides: { shirt, pants, accent, shoes } as "#rrggbb" hex strings
export function createAvatar(scene, opts = {}) {
  const root = buildAvatarBody(opts);
  root.add(makeShadow());
  root.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(root);
  return root;
}

// ─── PUBLIC: createRemoteAvatar ──────────────────────────────────────────────
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle) {
  const root = buildAvatarBody({ avatarType, skinTone, avatarStyle });
  root.name = `remote_${userId}`;
  root.userData = { userId, walkTime: 0, speed: 0 };
  const nameSprite = makeNameSprite(username);
  nameSprite.position.y = 1.88;
  root.add(nameSprite);
  root.add(makeShadow());
  scene.add(root);
  return root;
}