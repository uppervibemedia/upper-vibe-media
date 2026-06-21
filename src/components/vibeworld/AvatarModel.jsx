import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3,
  CircleGeometry, CanvasTexture, LinearFilter, Sprite, SpriteMaterial,
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

const BODY_PRESETS = {
  masculine:  [0.56, 0.38, 0.60, 0.54, 1.00, 1.20],
  feminine:   [0.48, 0.40, 0.55, 0.50, 0.96, 1.16],
  nonbinary:  [0.52, 0.39, 0.57, 0.52, 0.98, 1.18],
  neutral:    [0.52, 0.39, 0.57, 0.52, 0.98, 1.18],
};

const CLOTHING = {
  masculine: { shirt: "#1A3A8A", pants: "#1A1A2E", shoe: "#111118", neonPrimary: "#00E5FF" },
  feminine:  { shirt: "#2A1A6A", pants: "#1A1A2E", shoe: "#111118", neonPrimary: "#E040FB" },
  nonbinary: { shirt: "#1A2A6A", pants: "#1A1A2E", shoe: "#111118", neonPrimary: "#A078FF" },
  neutral:   { shirt: "#1A3A7A", pants: "#1A2A1A", shoe: "#111118", neonPrimary: "#00D4F0" },
};

const HAIR_COLORS = {
  masculine:  "#1A0F06",
  feminine:   "#180C06",
  nonbinary:  "#251510",
  neutral:    "#1A0F06",
};

const S = 20; // base segment count — smooth but lightweight

function smat(hex, rough = 0.55, metal = 0.05) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hex);
  m.roughness = rough;
  m.metalness = metal;
  return m;
}

function bmat(hex) {
  return new MeshBasicMaterial({ color: new Color(hex) });
}

function add(g, geo, mat, px = 0, py = 0, pz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new Mesh(geo, mat);
  m.position.set(px, py, pz);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

// ── BUILD HEAD with proper face features ──────────────────────
function buildHead(skinHex, avatarType) {
  const g = new Group(); g.name = "head";
  const hairHex = HAIR_COLORS[avatarType] || HAIR_COLORS.neutral;
  const skin = smat(skinHex, 0.48);
  const skinD = smat(skinHex, 0.55); // slightly darker for jaw/chin

  // Cranium — rounded, not boxy
  const cranium = add(g, new SphereGeometry(0.155, S, S), skin, 0, 0.08, 0);
  cranium.scale.set(0.88, 1.0, 0.82);

  // Jaw / lower face — slightly forward and wider
  const jaw = add(g, new SphereGeometry(0.115, S, S - 4), skinD, 0, -0.02, 0.01);
  jaw.scale.set(0.82, 0.52, 0.74);

  // Chin
  const chin = add(g, new SphereGeometry(0.045, 10, 8), skinD, 0, -0.085, 0.055);
  chin.scale.set(0.62, 0.50, 0.60);

  // Cheekbones
  for (const s of [-1, 1]) {
    const cheek = add(g, new SphereGeometry(0.048, 10, 8), skin, s * 0.075, 0.01, 0.055);
    cheek.scale.set(0.60, 0.52, 0.44);
  }

  // ── EYES ──
  for (const s of [-1, 1]) {
    const ex = s * 0.052;
    // White
    const white = add(g, new SphereGeometry(0.030, 10, 8), new MeshBasicMaterial({ color: 0xFFFFFF }), ex, 0.038, 0.112);
    white.scale.set(0.55, 0.68, 0.30);
    // Iris
    add(g, new SphereGeometry(0.014, 8, 6), bmat("#3A6A4A"), ex, 0.038, 0.118);
    // Pupil
    add(g, new SphereGeometry(0.008, 6, 5), bmat("#080808"), ex, 0.038, 0.122);
    // Eyelid upper line
    const lid = add(g, new CylinderGeometry(0.032, 0.032, 0.006, 10), bmat("#2A1A10"), ex, 0.053, 0.110);
    lid.rotation.x = Math.PI / 2;
    // Eyebrow
    const brow = add(g, new BoxGeometry(0.052, 0.012, 0.010), bmat("#2A180E"), ex, 0.072, 0.108);
    brow.rotation.z = s * 0.08;
  }

  // ── NOSE ──
  const noseBridge = add(g, new BoxGeometry(0.018, 0.032, 0.016), skin, 0, 0.015, 0.118);
  const noseTip = add(g, new SphereGeometry(0.022, 10, 8), skinD, 0, -0.002, 0.128);
  noseTip.scale.set(0.70, 0.58, 0.58);
  for (const s of [-1, 1]) {
    const nostril = add(g, new SphereGeometry(0.010, 7, 6), smat(skinHex, 0.6), s * 0.018, -0.008, 0.128);
    nostril.scale.set(0.55, 0.50, 0.45);
  }

  // ── MOUTH ──
  const upperLip = add(g, new SphereGeometry(0.015, 9, 7), bmat("#C07060"), 0, -0.042, 0.122);
  upperLip.scale.set(0.60, 0.48, 0.38);
  const lowerLip = add(g, new SphereGeometry(0.018, 9, 7), bmat("#B06050"), 0, -0.056, 0.124);
  lowerLip.scale.set(0.78, 0.38, 0.40);

  // ── EARS ──
  for (const s of [-1, 1]) {
    const ear = add(g, new SphereGeometry(0.036, 10, 8), skin, s * 0.118, 0.010, 0);
    ear.scale.set(0.28, 0.58, 0.42);
  }

  // ── HAIR based on type ──
  buildHair(g, avatarType, hairHex);

  return g;
}

function buildHair(g, avatarType, hairHex) {
  const hm = smat(hairHex, 0.65);
  const hm2 = smat(hairHex, 0.70);

  if (avatarType === "masculine" || avatarType === "neutral") {
    // Short tapered fade — dome on top, tight sides
    // Top volume
    const top = add(g, new SphereGeometry(0.148, S, S - 4), hm, 0, 0.135, -0.005);
    top.scale.set(0.94, 0.42, 0.90);
    // Front hairline — slight forward sweep
    const front = add(g, new SphereGeometry(0.10, 14, 10), hm, 0, 0.115, 0.062);
    front.scale.set(0.85, 0.30, 0.50);
    // Left/right side — tight, close to head
    for (const s of [-1, 1]) {
      const side = add(g, new SphereGeometry(0.075, 12, 10), hm2, s * 0.095, 0.065, 0.005);
      side.scale.set(0.28, 0.55, 0.72);
    }
    // Back
    const back = add(g, new SphereGeometry(0.105, 14, 10), hm, 0, 0.085, -0.085);
    back.scale.set(0.88, 0.50, 0.40);
  } else if (avatarType === "feminine") {
    // Longer flowing style — wider, rounder
    const main = add(g, new SphereGeometry(0.165, S, S - 4), hm, 0, 0.105, -0.015);
    main.scale.set(1.08, 0.58, 0.96);
    // Side volume
    for (const s of [-1, 1]) {
      const side = add(g, new SphereGeometry(0.10, 12, 10), hm, s * 0.098, 0.020, 0.005);
      side.scale.set(0.38, 0.82, 0.72);
    }
    // Bangs
    const bang = add(g, new BoxGeometry(0.115, 0.042, 0.068), hm2, 0, 0.155, 0.062);
    bang.rotation.x = -0.22;
    // Back length
    const backL = add(g, new SphereGeometry(0.095, 12, 10), hm, 0, -0.045, -0.095);
    backL.scale.set(0.82, 0.90, 0.42);
  } else {
    // Nonbinary — mid-length natural
    const main = add(g, new SphereGeometry(0.158, S, S - 4), hm, 0, 0.115, -0.008);
    main.scale.set(1.02, 0.52, 0.94);
    for (const s of [-1, 1]) {
      const side = add(g, new SphereGeometry(0.082, 11, 9), hm2, s * 0.092, 0.040, 0.005);
      side.scale.set(0.34, 0.70, 0.70);
    }
    const bang = add(g, new BoxGeometry(0.095, 0.038, 0.060), hm2, 0, 0.148, 0.055);
    bang.rotation.x = -0.20;
  }
}

// ─── BUILD HAND — simple but shaped ───────────────────────────
function buildHand(skinHex) {
  const g = new Group(); g.name = "hand";
  const skin = smat(skinHex, 0.50);
  // Palm
  const palm = add(g, new BoxGeometry(0.068, 0.038, 0.072), skin, 0, -0.012, 0);
  // Four fingers grouped
  for (let i = 0; i < 4; i++) {
    const fx = (i - 1.5) * 0.018;
    const flen = i === 0 || i === 3 ? 0.042 : 0.052;
    const fing = add(g, new CylinderGeometry(0.0065, 0.0065, flen, 7), skin, fx, -0.012 - flen / 2, 0.042);
    const tip = add(g, new SphereGeometry(0.0065, 6, 5), skin, fx, -0.012 - flen, 0.042);
  }
  // Thumb
  const thumb = add(g, new CylinderGeometry(0.007, 0.007, 0.038, 7), skin, 0.038, -0.012, 0.010);
  thumb.rotation.z = -0.55;
  return g;
}

// ─── BUILD FOOT — shaped shoe ─────────────────────────────────
function buildFoot(shoeHex) {
  const g = new Group(); g.name = "foot";
  const shoe = smat(shoeHex, 0.55, 0.05);
  const sole = smat("#1A1A1A", 0.60);
  // Main shoe body
  const body = add(g, new BoxGeometry(0.108, 0.062, 0.188), shoe, 0, 0.010, 0.040);
  // Toe box — rounded
  const toe = add(g, new SphereGeometry(0.044, 10, 8), shoe, 0, 0.010, 0.148);
  toe.scale.set(0.82, 0.58, 0.48);
  // Sole
  add(g, new BoxGeometry(0.114, 0.022, 0.196), sole, 0, -0.018, 0.040);
  // Heel
  add(g, new BoxGeometry(0.105, 0.030, 0.058), sole, 0, -0.010, -0.042);
  return g;
}

// ═══════════════════════════════════════════════════════════════
// LOCAL AVATAR
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone   = opts.skinTone  || "medium";
  const skinHex    = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body       = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale] = body;
  const cloth      = CLOTHING[avatarType] || CLOTHING.neutral;

  const avatar = new Group();
  avatar.name = "avatar";

  const skin  = () => smat(skinHex, 0.50);
  const shirt = () => smat(cloth.shirt, 0.55, 0.06);
  const pants = () => smat(cloth.pants, 0.60);

  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  // ── TORSO — tapered cylinder, not a box ────────────────────
  const torsoMesh = new Mesh(
    new CylinderGeometry(shoulderW * 0.42, hipW * 0.34, torsoH, S),
    shirt()
  );
  torsoMesh.position.y = torsoH * 0.50;
  torsoMesh.castShadow = true; torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);

  // Collar / neck base
  const collar = add(torsoGroup, new CylinderGeometry(0.068, 0.075, 0.055, S), shirt(), 0, torsoH + 0.020, 0);

  // ── NECK ───────────────────────────────────────────────────
  const neckGroup = new Group(); neckGroup.name = "neck";
  neckGroup.position.set(0, torsoH + 0.055, 0);
  add(neckGroup, new CylinderGeometry(0.048, 0.058, 0.115, S), skin(), 0, 0.055, 0);

  // ── HEAD ───────────────────────────────────────────────────
  const headGroup = buildHead(skinHex, avatarType);
  headGroup.position.y = 0.115;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ── SHOULDERS — rounded caps ──────────────────────────────
  for (const s of [-1, 1]) {
    const cap = add(torsoGroup, new SphereGeometry(0.068, S, 12), shirt(), s * shoulderW * 0.44, torsoH * 0.80, 0);
    cap.scale.set(1.0, 0.75, 0.88);
  }

  // ── ARMS ───────────────────────────────────────────────────
  const uaLen = armLen * 0.52;
  const faLen = armLen * 0.48;

  for (const s of [-1, 1]) {
    const sign = s > 0 ? "rightShoulder" : "leftShoulder";
    const pivot = new Group(); pivot.name = sign;
    pivot.position.set(s * shoulderW * 0.48, torsoH * 0.78, 0);
    torsoGroup.add(pivot);

    // Upper arm — tapered cylinder
    const ua = add(pivot, new CylinderGeometry(0.052, 0.044, uaLen, S), skin(), 0, -uaLen / 2, 0);

    const elbowPivot = new Group(); elbowPivot.name = s > 0 ? "rightElbow" : "leftElbow";
    elbowPivot.position.set(0, -uaLen, 0);
    pivot.add(elbowPivot);

    // Forearm
    add(elbowPivot, new CylinderGeometry(0.042, 0.034, faLen, S), skin(), 0, -faLen / 2, 0);

    // Wrist pivot
    const wristPivot = new Group(); wristPivot.name = s > 0 ? "rightWrist" : "leftWrist";
    wristPivot.position.set(0, -faLen, 0);
    elbowPivot.add(wristPivot);

    const hand = buildHand(skinHex);
    hand.position.set(0, -0.012, 0);
    wristPivot.add(hand);

    pivot.userData = { elbowPivot, wristPivot, hand };
  }

  // ── HIPS / LEGS ────────────────────────────────────────────
  const thighLen = legLen * 0.52;
  const calfLen  = legLen * 0.48;

  for (const s of [-1, 1]) {
    const sign = s > 0 ? "rightHip" : "leftHip";
    const hipPivot = new Group(); hipPivot.name = sign;
    hipPivot.position.set(s * hipW * 0.38, thighLen, -0.015);
    torsoGroup.add(hipPivot);

    // Thigh — slightly tapered
    add(hipPivot, new CylinderGeometry(0.072, 0.062, thighLen, S), pants(), 0, -thighLen / 2, 0);

    const kneePivot = new Group(); kneePivot.name = s > 0 ? "rightKnee" : "leftKnee";
    kneePivot.position.set(0, -thighLen, 0);
    hipPivot.add(kneePivot);

    // Calf — more tapered
    add(kneePivot, new CylinderGeometry(0.058, 0.044, calfLen, S), pants(), 0, -calfLen / 2, 0);

    // Ankle pivot
    const anklePivot = new Group(); anklePivot.name = s > 0 ? "rightAnkle" : "leftAnkle";
    anklePivot.position.set(0, -calfLen, 0.015);
    kneePivot.add(anklePivot);

    const foot = buildFoot(cloth.shoe);
    anklePivot.add(foot);

    hipPivot.userData = { kneePivot, anklePivot, footGroup: foot };
  }

  // Shadow
  const shadow = new Mesh(
    new CircleGeometry(0.22, 14),
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.20, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -(thighLen + calfLen + 0.05);
  shadow.name = "shadow";
  torsoGroup.add(shadow);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — same style, optimized
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body    = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale] = body;
  const cloth   = CLOTHING[avatarType] || CLOTHING.neutral;
  const hairHex = HAIR_COLORS[avatarType] || HAIR_COLORS.neutral;

  const group = new Group();
  group.name  = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0, speed: 0 };

  const sMat = () => smat(skinHex, 0.50);
  const bMat = () => smat(cloth.shirt, 0.55, 0.06);
  const pMat = () => smat(cloth.pants, 0.60);
  const shMat= () => smat(cloth.shoe,  0.55);
  const hMat = () => smat(hairHex, 0.65);

  const uaLen = armLen * 0.52, faLen = armLen * 0.48;
  const thighLen = legLen * 0.52, calfLen = legLen * 0.48;

  // Torso
  const torso = new Mesh(new CylinderGeometry(shoulderW * 0.42, hipW * 0.34, torsoH, 16), bMat());
  torso.position.y = torsoH * 0.50; torso.castShadow = true;
  group.add(torso);

  // Neck
  const neck = new Mesh(new CylinderGeometry(0.045, 0.055, 0.110, 12), sMat());
  neck.position.y = torsoH + 0.065; neck.castShadow = true;
  group.add(neck);

  // Head (simplified remote version)
  const headY = torsoH + 0.165;
  const skull = new Mesh(new SphereGeometry(0.148, 16, 14), sMat());
  skull.scale.set(0.88, 1.0, 0.82); skull.position.y = headY + 0.08; skull.castShadow = true;
  group.add(skull);

  const jaw = new Mesh(new SphereGeometry(0.108, 14, 10), sMat());
  jaw.scale.set(0.82, 0.52, 0.74); jaw.position.set(0, headY - 0.015, 0.01);
  group.add(jaw);

  // Eyes
  for (const s of [-1, 1]) {
    const white = new Mesh(new SphereGeometry(0.028, 8, 7), new MeshBasicMaterial({ color: 0xFFFFFF }));
    white.scale.set(0.55, 0.68, 0.30); white.position.set(s * 0.048, headY + 0.042, 0.104);
    group.add(white);
    const pupil = new Mesh(new SphereGeometry(0.012, 7, 5), new MeshBasicMaterial({ color: 0x080808 }));
    pupil.position.set(s * 0.048, headY + 0.042, 0.112);
    group.add(pupil);
    const brow = new Mesh(new BoxGeometry(0.046, 0.010, 0.008), new MeshBasicMaterial({ color: 0x2A180E }));
    brow.position.set(s * 0.048, headY + 0.068, 0.106); brow.rotation.z = s * 0.08;
    group.add(brow);
  }

  // Nose
  const nose = new Mesh(new SphereGeometry(0.020, 9, 7), sMat());
  nose.scale.set(0.70, 0.58, 0.58); nose.position.set(0, headY + 0.004, 0.122);
  group.add(nose);

  // Mouth
  const mouth = new Mesh(new SphereGeometry(0.016, 8, 6), new MeshBasicMaterial({ color: 0xB06050 }));
  mouth.scale.set(0.78, 0.38, 0.40); mouth.position.set(0, headY - 0.040, 0.120);
  group.add(mouth);

  // Hair
  const hairMain = new Mesh(new SphereGeometry(0.150, 14, 12), hMat());
  hairMain.scale.set(0.94, 0.44, 0.90); hairMain.position.set(0, headY + 0.130, -0.005);
  group.add(hairMain);
  if (avatarType === "masculine" || avatarType === "neutral") {
    const hairFront = new Mesh(new SphereGeometry(0.095, 11, 9), hMat());
    hairFront.scale.set(0.85, 0.30, 0.50); hairFront.position.set(0, headY + 0.112, 0.060);
    group.add(hairFront);
  } else {
    const hairSide1 = new Mesh(new SphereGeometry(0.088, 10, 8), hMat());
    hairSide1.scale.set(0.34, 0.75, 0.70); hairSide1.position.set(-0.090, headY + 0.040, 0.005);
    group.add(hairSide1);
    const hairSide2 = hairSide1.clone();
    hairSide2.position.set(0.090, headY + 0.040, 0.005);
    group.add(hairSide2);
  }

  // Shoulder caps
  for (const s of [-1, 1]) {
    const cap = new Mesh(new SphereGeometry(0.065, 12, 10), bMat());
    cap.scale.set(1.0, 0.75, 0.88); cap.position.set(s * shoulderW * 0.44, torsoH * 0.80, 0);
    group.add(cap);
  }

  // Arms
  for (const s of [-1, 1]) {
    const sign = s > 0 ? "right" : "left";
    const shoulderPivot = new Group(); shoulderPivot.name = `${sign}Shoulder`;
    shoulderPivot.position.set(s * shoulderW * 0.48, torsoH * 0.78, 0);
    group.add(shoulderPivot);

    const ua = new Mesh(new CylinderGeometry(0.050, 0.042, uaLen, 12), sMat());
    ua.position.set(0, -uaLen / 2, 0); ua.castShadow = true;
    shoulderPivot.add(ua);

    const elbowPivot = new Group(); elbowPivot.name = `${sign}Elbow`;
    elbowPivot.position.set(0, -uaLen, 0);
    shoulderPivot.add(elbowPivot);

    const fa = new Mesh(new CylinderGeometry(0.040, 0.032, faLen, 12), sMat());
    fa.position.set(0, -faLen / 2, 0); fa.castShadow = true;
    elbowPivot.add(fa);

    const wristPivot = new Group(); wristPivot.name = `${sign}Wrist`;
    wristPivot.position.set(0, -faLen, 0);
    elbowPivot.add(wristPivot);

    const hand = new Mesh(new BoxGeometry(0.065, 0.035, 0.068), sMat());
    hand.position.set(0, -0.012, 0); hand.name = `${sign}Hand`;
    wristPivot.add(hand);

    shoulderPivot.userData = { elbowPivot, wristPivot, hand };
  }

  // Legs
  for (const s of [-1, 1]) {
    const sign = s > 0 ? "right" : "left";
    const hipPivot = new Group(); hipPivot.name = `${sign}Hip`;
    hipPivot.position.set(s * hipW * 0.38, thighLen, -0.015);
    group.add(hipPivot);

    const thigh = new Mesh(new CylinderGeometry(0.070, 0.060, thighLen, 12), pMat());
    thigh.position.set(0, -thighLen / 2, 0); thigh.castShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new Group(); kneePivot.name = `${sign}Knee`;
    kneePivot.position.set(0, -thighLen, 0);
    hipPivot.add(kneePivot);

    const calf = new Mesh(new CylinderGeometry(0.056, 0.042, calfLen, 12), pMat());
    calf.position.set(0, -calfLen / 2, 0); calf.castShadow = true;
    kneePivot.add(calf);

    const anklePivot = new Group(); anklePivot.name = `${sign}Ankle`;
    anklePivot.position.set(0, -calfLen, 0.015);
    kneePivot.add(anklePivot);

    // Foot
    const footGroup = new Group(); footGroup.name = `${sign}Foot`;
    const shoe = new Mesh(new BoxGeometry(0.106, 0.060, 0.184), shMat());
    shoe.position.set(0, 0.010, 0.038); shoe.castShadow = true;
    footGroup.add(shoe);
    const sole = new Mesh(new BoxGeometry(0.112, 0.020, 0.190), smat("#1A1A1A", 0.60));
    sole.position.set(0, -0.018, 0.038);
    footGroup.add(sole);
    const toeMesh = new Mesh(new SphereGeometry(0.042, 9, 7), shMat());
    toeMesh.scale.set(0.82, 0.55, 0.46); toeMesh.position.set(0, 0.010, 0.140);
    footGroup.add(toeMesh);

    anklePivot.add(footGroup);
    hipPivot.userData = { kneePivot, anklePivot, footGroup };
  }

  // Username label
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 64;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText((username || "User").substring(0, 16), 128, 32);
  const nt = new CanvasTexture(nc); nt.minFilter = LinearFilter; nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new Sprite(new SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.4, 0.35, 1);
  ns.position.y = torsoH + 0.72; ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}