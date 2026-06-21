import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
  CircleGeometry,
} = THREE;

// ─── SKIN TONES ──────────────────────────────────────────────
const SKIN_COLORS = {
  light:          "#FDEBD3",
  "medium-light": "#F3C9A1",
  medium:         "#D4A373",
  "medium-dark":  "#B07D5A",
  dark:           "#7B4A3A",
  deep:           "#4A2C2A",
};

// ─── BODY PRESETS ────────────────────────────────────────────
const BODY_PRESETS = {
  masculine:  [0.54, 0.36, 0.58, 0.52, 1.00, 1.20],
  feminine:   [0.46, 0.38, 0.53, 0.48, 0.95, 1.15],
  nonbinary:  [0.50, 0.37, 0.55, 0.50, 0.97, 1.17],
  neutral:    [0.50, 0.37, 0.55, 0.50, 0.97, 1.17],
};

// ─── CLOTHING ────────────────────────────────────────────────
const CLOTHING = {
  masculine: { shirt: "#141416", pants: "#1A1A1E", shoe: "#121214", neonPrimary: "#00E5FF", neonSecondary: "#E040FB" },
  feminine:  { shirt: "#141416", pants: "#18181C", shoe: "#121214", neonPrimary: "#E040FB", neonSecondary: "#00E5FF" },
  nonbinary: { shirt: "#141416", pants: "#1A1A1E", shoe: "#121214", neonPrimary: "#A078FF", neonSecondary: "#00E5FF" },
  neutral:   { shirt: "#141416", pants: "#18181C", shoe: "#121214", neonPrimary: "#00D4F0", neonSecondary: "#00D4F0" },
};

function mat(hex, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hex);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; }
  return m;
}

function neon(hex, opacity = 0.55) {
  return new MeshBasicMaterial({ color: new Color(hex), transparent: true, opacity, depthWrite: false });
}

// ═══════════════════════════════════════════════════════════════
// LOCAL AVATAR — player's own character
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone   = opts.skinTone  || "medium";
  const skinHex    = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body       = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale] = body;
  const cloth      = CLOTHING[avatarType] || CLOTHING.neutral;

  const avatar = new Group();
  avatar.name  = "avatar";

  const skinM  = () => mat(skinHex, { roughness: 0.45 });
  const shirtM = () => mat(cloth.shirt, { roughness: 0.22, metalness: 0.10 });
  const pantsM = () => mat(cloth.pants, { roughness: 0.26, metalness: 0.06 });
  const shoeM  = () => mat(cloth.shoe,  { roughness: 0.28, metalness: 0.10 });

  function add(group, geo, matFn, pos, casts = true) {
    const m = new Mesh(geo, typeof matFn === "function" ? matFn() : matFn);
    m.position.copy(pos);
    m.castShadow = casts;
    m.receiveShadow = casts;
    group.add(m);
    return m;
  }

  // ─── HEAD ──────────────────────────────────────────────────
  function buildHead() {
    const h = new Group(); h.name = "head";
    const hs = headScale;

    // Cranium
    const cranium = add(h, new SphereGeometry(0.17 * hs, 20, 16), skinM, new Vector3(0, 0.12 * hs, 0));
    cranium.scale.set(0.85, 1.05, 0.80);

    // Jaw
    const jaw = add(h, new SphereGeometry(0.09 * hs, 16, 12), skinM, new Vector3(0, 0.02 * hs, 0.04 * hs));
    jaw.scale.set(0.82, 0.45, 0.62);

    // Eyes — simple white spheres with dark pupils
    for (const s of [-1, 1]) {
      const ex = s * 0.046 * hs;
      const eyeW = add(h, new SphereGeometry(0.030 * hs, 10, 8),
        new MeshBasicMaterial({ color: 0xFFFFFF }),
        new Vector3(ex, 0.11 * hs, 0.065 * hs));
      eyeW.scale.set(0.55, 0.72, 0.30);

      add(h, new SphereGeometry(0.013 * hs, 8, 6),
        new MeshBasicMaterial({ color: 0x222222 }),
        new Vector3(ex, 0.11 * hs, 0.073 * hs));

      // Eyebrow
      const brow = add(h, new BoxGeometry(0.055 * hs, 0.012 * hs, 0.010 * hs),
        new MeshBasicMaterial({ color: 0x3A2018 }),
        new Vector3(ex, 0.14 * hs, 0.068 * hs));
      brow.rotation.z = s * 0.06;
    }

    // Nose
    const nose = add(h, new SphereGeometry(0.022 * hs, 10, 8), skinM,
      new Vector3(0, 0.08 * hs, 0.082 * hs));
    nose.scale.set(0.65, 0.55, 0.52);

    // Mouth
    add(h, new BoxGeometry(0.052 * hs, 0.012 * hs, 0.008 * hs),
      new MeshBasicMaterial({ color: 0xC07060 }),
      new Vector3(0, 0.045 * hs, 0.082 * hs));

    // Ears
    for (const s of [-1, 1]) {
      const ear = add(h, new SphereGeometry(0.034 * hs, 10, 8), skinM,
        new Vector3(s * 0.088 * hs, 0.10 * hs, 0));
      ear.scale.set(0.26, 0.55, 0.40);
    }

    // Hair — simple dome
    const hair = add(h, new SphereGeometry(0.185 * hs, 18, 14),
      mat("#1C110A", { roughness: 0.5 }),
      new Vector3(0, 0.16 * hs, -0.01));
    hair.scale.set(1.08, 0.52, 0.94);

    const bangs = add(h, new BoxGeometry(0.09 * hs, 0.04 * hs, 0.07 * hs),
      mat("#2E1B10", { roughness: 0.45 }),
      new Vector3(0, 0.20 * hs, 0.047 * hs));
    bangs.rotation.x = -0.22;

    return h;
  }

  // ─── FOOT — simple sneaker ─────────────────────────────────
  function buildFoot() {
    const f = new Group(); f.name = "foot";
    add(f, new BoxGeometry(0.13, 0.065, 0.19), shoeM, new Vector3(0, 0.02, 0.055));
    add(f, new BoxGeometry(0.14, 0.025, 0.20), mat("#1A1A1A", { roughness: 0.30 }), new Vector3(0, -0.015, 0.055));
    add(f, new BoxGeometry(0.13, 0.010, 0.19), neon(cloth.neonPrimary, 0.45), new Vector3(0, -0.006, 0.055));
    const toe = add(f, new SphereGeometry(0.042, 10, 8), shoeM, new Vector3(0, 0.012, 0.148));
    toe.scale.set(0.84, 0.58, 0.48);
    return f;
  }

  // ─── LOWER LEG ─────────────────────────────────────────────
  function buildLowerLeg() {
    const g = new Group(); g.name = "lowerLeg";
    const len = legLen * 0.48;
    add(g, new CylinderGeometry(0.058, 0.064, len, 16), pantsM, new Vector3(0, -len * 0.5, 0));
    const f = buildFoot();
    f.position.set(0, -len, 0.025);
    g.add(f);
    g.userData.foot = f;
    return g;
  }

  // ─── UPPER LEG ─────────────────────────────────────────────
  function buildUpperLeg() {
    const g = new Group(); g.name = "upperLeg";
    const len = legLen * 0.52;
    add(g, new CylinderGeometry(0.072, 0.080, len, 16), pantsM, new Vector3(0, -len * 0.5, 0));
    const ll = buildLowerLeg();
    ll.position.set(0, -len, 0);
    g.add(ll);
    g.userData.lowerLeg = ll;
    return g;
  }

  // ─── FOREARM ───────────────────────────────────────────────
  function buildForearm() {
    const g = new Group(); g.name = "forearm";
    const len = armLen * 0.48;
    add(g, new CylinderGeometry(0.034, 0.040, len, 12), skinM, new Vector3(0, -len * 0.5, 0));
    // Wristband
    add(g, new CylinderGeometry(0.036, 0.036, 0.016, 12), neon(cloth.neonPrimary, 0.5), new Vector3(0, -len, 0));
    // Hand
    const hand = add(g, new BoxGeometry(0.062, 0.035, 0.068), skinM, new Vector3(0, -len - 0.022, 0.005));
    hand.name = "hand";
    g.userData.hand = hand;
    return g;
  }

  // ─── UPPER ARM ─────────────────────────────────────────────
  function buildUpperArm() {
    const g = new Group(); g.name = "upperArm";
    const len = armLen * 0.52;
    add(g, new CylinderGeometry(0.044, 0.050, len, 12), shirtM, new Vector3(0, -len * 0.5, 0));
    const fa = buildForearm();
    fa.position.set(0, -len, 0);
    g.add(fa);
    g.userData.forearm = fa;
    return g;
  }

  // ─── TORSO ─────────────────────────────────────────────────
  const torsoGroup = new Group(); torsoGroup.name = "torso";

  const torsoMesh = new Mesh(
    new CylinderGeometry(shoulderW * 0.44, hipW * 0.36, torsoH, 20),
    shirtM()
  );
  torsoMesh.position.y = torsoH * 0.50;
  torsoMesh.castShadow = true; torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);

  // Belt
  const belt = new Mesh(new TorusGeometry(hipW * 0.35, 0.015, 8, 20), mat("#222224", { roughness: 0.18, metalness: 0.20 }));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = torsoH * 0.14;
  torsoGroup.add(belt);
  const beltNeon = new Mesh(new TorusGeometry(hipW * 0.352, 0.005, 6, 20), neon(cloth.neonPrimary, 0.4));
  beltNeon.rotation.x = Math.PI / 2;
  beltNeon.position.y = torsoH * 0.16;
  torsoGroup.add(beltNeon);

  // Chest stripe
  const chestStripe = new Mesh(new BoxGeometry(0.008, torsoH * 0.38, 0.07), neon(cloth.neonPrimary, 0.5));
  chestStripe.position.set(0, torsoH * 0.60, 0.065);
  torsoGroup.add(chestStripe);

  // ─── NECK + HEAD ──────────────────────────────────────────
  const neckGroup = new Group(); neckGroup.name = "neck";
  neckGroup.position.set(0, torsoH + 0.02, 0);
  add(neckGroup, new CylinderGeometry(0.036, 0.040, 0.11, 12), skinM, new Vector3(0, 0.03, 0));
  const headGroup = buildHead();
  headGroup.position.y = 0.07;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── ARMS ─────────────────────────────────────────────────
  const shoulderY = torsoH * 0.68;

  const leftShoulder = new Group(); leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-shoulderW * 0.50, shoulderY, -0.03);
  const leftArm = buildUpperArm();
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group(); rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(shoulderW * 0.50, shoulderY, -0.03);
  const rightArm = buildUpperArm();
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS + LEGS ──────────────────────────────────────────
  const hipY = 0.05;

  const leftHip = new Group(); leftHip.name = "leftHip";
  leftHip.position.set(-hipW * 0.42, hipY, -0.03);
  const leftLeg = buildUpperLeg();
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group(); rightHip.name = "rightHip";
  rightHip.position.set(hipW * 0.42, hipY, -0.03);
  const rightLeg = buildUpperLeg();
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // Shadow
  const shadow = new Mesh(
    new CircleGeometry(0.20, 14),
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.08;
  shadow.name = "shadow";
  torsoGroup.add(shadow);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — other players
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body    = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, , legLen] = body;
  const cloth   = CLOTHING[avatarType] || CLOTHING.neutral;

  const group = new Group();
  group.name  = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0, speed: 0 };

  const sMat  = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.42 });
  const bMat  = () => new MeshStandardMaterial({ color: new Color(cloth.shirt), roughness: 0.24, metalness: 0.08 });
  const pMat  = () => new MeshStandardMaterial({ color: new Color(cloth.pants), roughness: 0.28 });
  const shMat = () => new MeshStandardMaterial({ color: new Color(cloth.shoe),  roughness: 0.28 });
  const nMat  = () => new MeshBasicMaterial({ color: new Color(cloth.neonPrimary), transparent: true, opacity: 0.40, depthWrite: false });
  const hMat  = () => new MeshStandardMaterial({ color: new Color("#1C110A"), roughness: 0.44 });

  const thighLen = legLen * 0.52;
  const calfLen  = legLen * 0.48;
  const armSeg   = (body[3] || 0.52) * 0.52;
  const faSeg    = (body[3] || 0.52) * 0.48;

  // Torso
  const torso = new Mesh(new CylinderGeometry(shoulderW * 0.44, hipW * 0.36, torsoH, 16), bMat());
  torso.position.y = torsoH * 0.50; torso.castShadow = true;
  group.add(torso);

  // Chest stripe
  const cStripe = new Mesh(new BoxGeometry(0.007, torsoH * 0.38, 0.06), nMat());
  cStripe.position.set(0, torsoH * 0.60, 0.06);
  group.add(cStripe);

  // Neck
  const neck = new Mesh(new CylinderGeometry(0.033, 0.038, 0.10, 10), sMat());
  neck.position.y = torsoH + 0.05; neck.castShadow = true;
  group.add(neck);

  // Head
  const headGroup = new Group();
  headGroup.position.y = torsoH * 0.68 + 0.38;

  const cranium = new Mesh(new SphereGeometry(0.155, 18, 14), sMat());
  cranium.scale.set(0.85, 1.05, 0.80); cranium.position.y = 0.10; cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new Mesh(new SphereGeometry(0.082, 14, 10), sMat());
  jaw.scale.set(0.82, 0.45, 0.62); jaw.position.set(0, 0.02, 0.04);
  headGroup.add(jaw);

  // Eyes
  for (const s of [-1, 1]) {
    const ex = s * 0.042;
    const eyeW = new Mesh(new SphereGeometry(0.028, 9, 7), new MeshBasicMaterial({ color: 0xFFFFFF }));
    eyeW.scale.set(0.55, 0.72, 0.30); eyeW.position.set(ex, 0.105, 0.062);
    headGroup.add(eyeW);
    const pupil = new Mesh(new SphereGeometry(0.012, 7, 5), new MeshBasicMaterial({ color: 0x222222 }));
    pupil.position.set(ex, 0.105, 0.069);
    headGroup.add(pupil);
    const brow = new Mesh(new BoxGeometry(0.048, 0.010, 0.009), new MeshBasicMaterial({ color: 0x3A2018 }));
    brow.position.set(ex, 0.136, 0.065); brow.rotation.z = s * 0.06;
    headGroup.add(brow);
  }

  // Nose
  const nose = new Mesh(new SphereGeometry(0.020, 9, 7), sMat());
  nose.scale.set(0.65, 0.55, 0.52); nose.position.set(0, 0.076, 0.078);
  headGroup.add(nose);

  // Mouth
  const mouth = new Mesh(new BoxGeometry(0.048, 0.011, 0.007), new MeshBasicMaterial({ color: 0xC07060 }));
  mouth.position.set(0, 0.044, 0.078);
  headGroup.add(mouth);

  // Hair
  const hair = new Mesh(new SphereGeometry(0.170, 16, 12), hMat());
  hair.scale.set(1.08, 0.52, 0.94); hair.position.set(0, 0.155, -0.01); hair.castShadow = true;
  headGroup.add(hair);
  const bangs = new Mesh(new BoxGeometry(0.082, 0.036, 0.065), hMat());
  bangs.position.set(0, 0.195, 0.045); bangs.rotation.x = -0.22;
  headGroup.add(bangs);

  group.add(headGroup);

  // ─── ARMS ───────────────────────────────────────────────
  for (const s of [-1, 1]) {
    const sx = s * shoulderW * 0.50;
    const sign = s > 0 ? "right" : "left";

    const shoulderPivot = new Group(); shoulderPivot.name = `${sign}Shoulder`;
    shoulderPivot.position.set(sx, torsoH * 0.64, -0.04);
    group.add(shoulderPivot);

    const ua = new Mesh(new CylinderGeometry(0.038, 0.046, armSeg, 12), sMat());
    ua.position.set(0, -armSeg / 2, 0); ua.castShadow = true; ua.name = `${sign}UpperArm`;
    shoulderPivot.add(ua);

    const elbowPivot = new Group(); elbowPivot.name = `${sign}Elbow`;
    elbowPivot.position.set(0, -armSeg, 0);
    shoulderPivot.add(elbowPivot);

    const fa = new Mesh(new CylinderGeometry(0.030, 0.038, faSeg, 12), sMat());
    fa.position.set(0, -faSeg / 2, 0); fa.castShadow = true; fa.name = `${sign}Forearm`;
    elbowPivot.add(fa);

    const wristPivot = new Group(); wristPivot.name = `${sign}Wrist`;
    wristPivot.position.set(0, -faSeg, 0);
    elbowPivot.add(wristPivot);

    const hand = new Mesh(new BoxGeometry(0.056, 0.032, 0.064), sMat());
    hand.position.set(0, -0.022, 0); hand.castShadow = true; hand.name = `${sign}Hand`;
    wristPivot.add(hand);

    shoulderPivot.userData = { elbowPivot, wristPivot };
  }

  // ─── LEGS ───────────────────────────────────────────────
  for (const s of [-1, 1]) {
    const legX = s * hipW * 0.42;
    const sign  = s > 0 ? "right" : "left";

    const hipPivot = new Group(); hipPivot.name = `${sign}Hip`;
    hipPivot.position.set(legX, thighLen, -0.03);
    group.add(hipPivot);

    const thigh = new Mesh(new CylinderGeometry(0.058, 0.068, thighLen, 12), pMat());
    thigh.position.set(0, -thighLen / 2, 0); thigh.castShadow = true; thigh.name = `${sign}Thigh`;
    hipPivot.add(thigh);

    const kneePivot = new Group(); kneePivot.name = `${sign}Knee`;
    kneePivot.position.set(0, -thighLen, 0);
    hipPivot.add(kneePivot);

    const calf = new Mesh(new CylinderGeometry(0.042, 0.054, calfLen, 12), pMat());
    calf.position.set(0, -calfLen / 2, 0); calf.castShadow = true; calf.name = `${sign}Calf`;
    kneePivot.add(calf);

    const anklePivot = new Group(); anklePivot.name = `${sign}Ankle`;
    anklePivot.position.set(0, -calfLen, 0.02);
    kneePivot.add(anklePivot);

    // Foot
    const footGroup = new Group(); footGroup.name = `${sign}Foot`;
    const shoe = new Mesh(new BoxGeometry(0.114, 0.058, 0.172), shMat());
    shoe.position.set(0, 0.010, 0.036); shoe.castShadow = true;
    footGroup.add(shoe);
    const sole = new Mesh(new BoxGeometry(0.122, 0.022, 0.180), new MeshStandardMaterial({ color: new Color("#1A1A1A"), roughness: 0.32 }));
    sole.position.set(0, -0.014, 0.036);
    footGroup.add(sole);
    const soleNeon = new Mesh(new BoxGeometry(0.114, 0.009, 0.172), nMat());
    soleNeon.position.set(0, -0.005, 0.036);
    footGroup.add(soleNeon);
    const toeMesh = new Mesh(new SphereGeometry(0.038, 9, 7), shMat());
    toeMesh.scale.set(0.84, 0.55, 0.46); toeMesh.position.set(0, 0.010, 0.122);
    footGroup.add(toeMesh);

    anklePivot.add(footGroup);
    hipPivot.userData = { kneePivot, anklePivot, footGroup };
  }

  // ─── USERNAME LABEL ─────────────────────────────────────
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 64;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText((username || "User").substring(0, 16), 128, 32);
  const nt = new CanvasTexture(nc); nt.minFilter = LinearFilter; nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new Sprite(new SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.4, 0.35, 1); ns.position.y = torsoH * 0.68 + 0.60; ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}