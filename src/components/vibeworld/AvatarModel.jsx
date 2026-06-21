/**
 * AvatarModel — Fully procedural stylized humanoid avatar.
 * Single connected body — no gaps between parts.
 */

import * as THREE from "three";
import { SPAWN } from "./cityData";

// ─── SKIN & HAIR PALETTES ────────────────────────────────────────────────────
const SKIN_TONES = {
  "light":        0xfde8c8,
  "medium-light": 0xf0c490,
  "medium":       0xc8864a,
  "medium-dark":  0x9a6038,
  "dark":         0x6b3a22,
  "deep":         0x3e2018,
};

const HAIR_COLORS = {
  "light":        0xc8a060,
  "medium-light": 0x7a4820,
  "medium":       0x3a1e0a,
  "medium-dark":  0x1a0a04,
  "dark":         0x100804,
  "deep":         0x080402,
};

const OUTFIT = {
  streetwear: { top: 0x1a2a5e, pants: 0x0d0d1a, shoes: 0x0a0a14, neon: 0x00d4f0 },
  cosmic:     { top: 0x0d1038, pants: 0x08080e, shoes: 0x060608, neon: 0xa040ff },
};

// ─── MATERIAL HELPERS ────────────────────────────────────────────────────────
function stdMat(hex, rough = 0.6, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
}
function basicMat(hex) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
}
function glowMat(hex, opacity = 0.8) {
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
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.20, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  return shadow;
}

// ─── FACE ────────────────────────────────────────────────────────────────────
function makeFace(skinHex, avatarType) {
  const g = new THREE.Group();
  g.name = "face";
  const skin = basicMat(skinHex);
  const eyeWhite = basicMat(0xf0f0f0);
  const iris = basicMat(avatarType === "feminine" ? 0x5577ee : 0x336688);
  const pupil = basicMat(0x080808);
  const brow = basicMat(0x1a0e08);
  const lipColor = new THREE.Color(skinHex).multiplyScalar(0.70);
  const lip = new THREE.MeshBasicMaterial({ color: lipColor });

  // Head sphere
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), skin));

  for (const sx of [0.044, -0.044]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyeWhite);
    w.position.set(sx, 0.016, 0.097); g.add(w);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), iris);
    ir.position.set(sx, 0.016, 0.109); g.add(ir);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 4), pupil);
    pu.position.set(sx, 0.016, 0.116); g.add(pu);
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.007, 0.005), brow);
    br.position.set(sx, 0.054, 0.100);
    br.rotation.z = sx > 0 ? -0.18 : 0.18;
    g.add(br);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 5), skin);
  nose.scale.set(1, 0.7, 1.3);
  nose.position.set(0, -0.010, 0.114); g.add(nose);

  const uLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.022, 4, 6), lip);
  uLip.rotation.z = Math.PI / 2; uLip.position.set(0, -0.042, 0.107); g.add(uLip);
  const lLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.028, 4, 6), lip);
  lLip.rotation.z = Math.PI / 2; lLip.position.set(0, -0.056, 0.105); g.add(lLip);

  for (const sx of [0.116, -0.116]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), skin);
    ear.scale.set(0.5, 0.8, 0.5); ear.position.set(sx, 0.004, 0); g.add(ear);
  }
  return g;
}

// ─── HAIR ────────────────────────────────────────────────────────────────────
function makeHair(hairHex, avatarType) {
  const g = new THREE.Group();
  g.name = "hair";
  const mat = stdMat(hairHex, 0.85, 0.0);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.126, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mat
  );
  cap.position.set(0, 0.004, -0.004); g.add(cap);

  if (avatarType === "feminine") {
    for (const sx of [0.112, -0.112]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat);
      side.scale.set(0.5, 1.4, 0.6); side.position.set(sx, -0.06, 0.01); g.add(side);
    }
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat);
    back.scale.set(0.75, 1.6, 0.7); back.position.set(0, -0.08, -0.07); g.add(back);
  } else if (avatarType === "masculine") {
    const front = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 5), mat);
    front.scale.set(1.1, 0.52, 0.68); front.position.set(0, 0.062, 0.084); g.add(front);
  } else {
    for (const sx of [0.108, -0.108]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.068, 6, 5), mat);
      side.scale.set(0.45, 1.0, 0.55); side.position.set(sx, -0.022, 0.0); g.add(side);
    }
  }
  return g;
}

// ─── BUILD FULL AVATAR BODY ──────────────────────────────────────────────────
/*
  HEIGHT LAYOUT (y=0 is ground):
    Shoes top:  ~0.07
    Knee pivot: 0.42
    Hip pivot:  0.82
    Torso ctr:  0.82 (same y as hip, torso mesh extends up from there)
    Neck:       1.18
    Head ctr:   1.36
    Top of head:~1.50
*/
function buildAvatarBody(opts = {}) {
  const { avatarType = "neutral", skinTone = "medium", avatarStyle = "streetwear" } = opts;
  const skinHex = SKIN_TONES[skinTone] || SKIN_TONES.medium;
  const hairHex = HAIR_COLORS[skinTone] || HAIR_COLORS.medium;
  const pal = OUTFIT[avatarStyle === "cosmic" ? "cosmic" : "streetwear"];

  const root = new THREE.Group();
  root.name = "avatar";

  const skinMat = basicMat(skinHex);
  const topMat  = stdMat(pal.top,   0.55, 0.1);
  const pantMat = stdMat(pal.pants, 0.65, 0.05);
  const shoeMat = stdMat(pal.shoes, 0.5,  0.3);
  const neonM   = glowMat(pal.neon, 0.8);

  // ── LEGS ─────────────────────────────────────────────────────────────────
  // Hip pivots at y=0.72 — legs start from here downward
  for (const { name, sx } of [{ name: "leftHip", sx: 0.095 }, { name: "rightHip", sx: -0.095 }]) {
    const hipG = new THREE.Group();
    hipG.name = name;
    hipG.position.set(sx, 0.72, 0);

    // Upper leg (thigh) — hangs downward from hip pivot
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 4, 8), pantMat);
    thigh.position.y = -0.20;  // center of thigh below pivot
    thigh.castShadow = true;
    hipG.add(thigh);

    // Waistband overlap box — fills any gap between torso bottom and thigh top
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.12, 8), pantMat);
    waist.position.y = 0.04; // sits at top of leg, overlapping torso bottom
    waist.castShadow = true;
    hipG.add(waist);

    // Knee pivot — at bottom of thigh
    const kneeG = new THREE.Group();
    kneeG.name = name.replace("Hip", "Knee");
    kneeG.position.y = -0.40;  // from hip down to knee

    // Shin
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.24, 4, 8), pantMat);
    shin.position.y = -0.15;
    shin.castShadow = true;
    kneeG.add(shin);

    // Foot/ankle pivot
    const footG = new THREE.Group();
    footG.name = name.replace("Hip", "Foot");
    footG.position.y = -0.30;

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.21), shoeMat);
    shoe.position.set(0, -0.015, 0.025);
    shoe.castShadow = true;
    footG.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.21), neonM);
    sole.position.set(0, -0.053, 0.025);
    footG.add(sole);

    kneeG.add(footG);
    kneeG.userData.foot = footG;

    hipG.add(kneeG);
    hipG.userData.leg = { userData: { lowerLeg: kneeG } };

    root.add(hipG);
  }

  // ── HIP BRIDGE — solid block connecting both legs to torso bottom ─────────
  // Placed at y=0.76 (between leg tops at 0.72 and torso bottom at ~0.60)
  const hipBridge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.30, 0.24), pantMat);
  hipBridge.position.set(0, 0.76, 0);
  hipBridge.castShadow = true;
  root.add(hipBridge);

  // ── TORSO ─────────────────────────────────────────────────────────────────
  // Torso pivot at y=0.95 — bottom of capsule = 0.95 - 0.21 - 0.155 = 0.585
  // Hip bridge top = 0.76 + 0.15 = 0.91 → fully overlaps, no gap
  const torsoG = new THREE.Group();
  torsoG.name = "torso";
  torsoG.position.y = 0.95;

  // Main shirt — capsule bridging from hips up to shoulders
  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.52, 4, 10), topMat);
  torsoMesh.castShadow = true;
  torsoG.add(torsoMesh);

  // Collar — snug funnel from shirt top up to neck base
  // torsoG at y=0.95, collar center at 0.95+0.42=1.37 world, top=1.42+0.13=1.455
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.145, 0.26, 10), topMat);
  collar.position.y = 0.42;
  collar.castShadow = true;
  torsoG.add(collar);

  // Neon chest stripe
  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.28, 0.012), neonM);
  chestStripe.position.set(0, 0.05, 0.158);
  torsoG.add(chestStripe);

  // Neon shoulder pips
  for (const sx of [0.17, -0.17]) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), neonM);
    pip.position.set(sx, 0.17, 0.13);
    torsoG.add(pip);
  }

  // ── ARMS (parented to torso) ─────────────────────────────────────────────
  for (const { name, sx } of [{ name: "leftShoulder", sx: 0.20 }, { name: "rightShoulder", sx: -0.20 }]) {
    const shG = new THREE.Group();
    shG.name = name;
    shG.position.set(sx, 0.20, 0);
    // Natural rest: arms hang slightly forward and out
    shG.rotation.x = -0.10;
    shG.rotation.z = sx > 0 ? 0.12 : -0.12;

    // Upper arm sleeve
    const uArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.050, 0.22, 4, 6), topMat);
    uArm.position.y = -0.14;
    uArm.castShadow = true;
    shG.add(uArm);

    // Elbow pivot
    const elbG = new THREE.Group();
    elbG.name = name.replace("Shoulder", "Elbow");
    elbG.position.y = -0.29;

    // Forearm (skin)
    const fArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.040, 0.20, 4, 6), skinMat);
    fArm.position.y = -0.13;
    fArm.castShadow = true;
    elbG.add(fArm);

    // Hand pivot
    const handG = new THREE.Group();
    handG.name = name.replace("Shoulder", "Hand");
    handG.position.y = -0.24;
    handG.add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), skinMat));
    elbG.add(handG);
    elbG.userData.hand = handG;

    shG.add(elbG);
    shG.userData.arm = { userData: { forearm: elbG } };
    torsoG.add(shG);
  }

  root.add(torsoG);

  // ── NECK + HEAD ───────────────────────────────────────────────────────────
  // Collar top = 0.95 + 0.36 + 0.11 = 1.42
  // Neck: small cylinder sitting mostly inside collar, just barely peeking above it
  // Neck center at 1.41 (height 0.18) → bottom=1.32 (inside collar), top=1.50
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.070, 0.18, 10), skinMat);
  neck.position.set(0, 1.41, 0);
  root.add(neck);

  const headAnchor = new THREE.Group();
  headAnchor.name = "headAnchor";
  headAnchor.position.set(0, 1.56, 0);
  headAnchor.add(makeFace(skinHex, avatarType));
  headAnchor.add(makeHair(hairHex, avatarType));
  root.add(headAnchor);

  return root;
}

// ─── PUBLIC: createAvatar ────────────────────────────────────────────────────
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
  nameSprite.position.y = 1.70;
  root.add(nameSprite);
  root.add(makeShadow());
  scene.add(root);
  return root;
}