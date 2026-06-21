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

function mat(hex, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hex);
  m.roughness = opts.roughness ?? 0.55;
  m.metalness = opts.metalness ?? 0.05;
  return m;
}

// ═══════════════════════════════════════════════════════════════
// LOCAL AVATAR — matches the live screenshot style
// Simple blocky humanoid: sphere head, box torso, cylinder limbs
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

  const skinM  = () => mat(skinHex, { roughness: 0.50 });
  const shirtM = () => mat(cloth.shirt, { roughness: 0.55, metalness: 0.05 });
  const pantsM = () => mat(cloth.pants, { roughness: 0.60 });
  const shoeM  = () => mat(cloth.shoe,  { roughness: 0.55 });
  const hairM  = () => mat("#1A1008", { roughness: 0.6 });

  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  // ── HEAD ────────────────────────────────────────────────────
  const headGroup = new Group(); headGroup.name = "head";

  // Skull
  const skull = new Mesh(new SphereGeometry(0.16 * headScale, 16, 14), skinM());
  skull.scale.set(0.88, 1.02, 0.84);
  skull.position.set(0, 0.10 * headScale, 0);
  skull.castShadow = true;
  headGroup.add(skull);

  // Hair cap — sits on top, slightly larger
  const hairCap = new Mesh(new SphereGeometry(0.165 * headScale, 14, 12), hairM());
  hairCap.scale.set(0.92, 0.58, 0.90);
  hairCap.position.set(0, 0.155 * headScale, -0.01);
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  // Simple eyes — dark spheres
  for (const s of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.022 * headScale, 8, 6),
      new MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(s * 0.055 * headScale, 0.10 * headScale, 0.115 * headScale);
    headGroup.add(eye);
  }

  // Neck
  const neck = new Mesh(new CylinderGeometry(0.055, 0.060, 0.12, 10), skinM());
  neck.position.set(0, -0.04, 0);
  neck.castShadow = true;
  headGroup.add(neck);

  headGroup.position.set(0, torsoH + 0.14, 0);
  torsoGroup.add(headGroup);

  // ── TORSO — simple box, sleeveless look ─────────────────────
  const torsoBox = new Mesh(
    new BoxGeometry(shoulderW * 0.74, torsoH, 0.28),
    shirtM()
  );
  torsoBox.position.y = torsoH * 0.50;
  torsoBox.castShadow = true; torsoBox.receiveShadow = true;
  torsoGroup.add(torsoBox);

  // Slight V-taper — shoulder wider than waist
  torsoBox.scale.set(1, 1, 1);

  // ── ARMS — cylinders, skin color, separate from torso ───────
  const armThick = 0.062;
  const upperArmLen = armLen * 0.50;
  const foreArmLen  = armLen * 0.50;

  for (const s of [-1, 1]) {
    const armX = s * (shoulderW * 0.44);

    // Shoulder pivot
    const shoulderPivot = new Group();
    shoulderPivot.name = s > 0 ? "rightShoulder" : "leftShoulder";
    shoulderPivot.position.set(armX, torsoH * 0.78, 0);
    torsoGroup.add(shoulderPivot);

    const upperArm = new Mesh(
      new CylinderGeometry(armThick, armThick * 0.90, upperArmLen, 10),
      skinM()
    );
    upperArm.position.set(0, -upperArmLen / 2, 0);
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    // Elbow pivot
    const elbowPivot = new Group();
    elbowPivot.name = s > 0 ? "rightElbow" : "leftElbow";
    elbowPivot.position.set(0, -upperArmLen, 0);
    shoulderPivot.add(elbowPivot);

    const foreArm = new Mesh(
      new CylinderGeometry(armThick * 0.85, armThick * 0.75, foreArmLen, 10),
      skinM()
    );
    foreArm.position.set(0, -foreArmLen / 2, 0);
    foreArm.castShadow = true;
    elbowPivot.add(foreArm);

    // Hand — simple box
    const hand = new Mesh(new BoxGeometry(0.075, 0.055, 0.055), skinM());
    hand.name = s > 0 ? "rightHand" : "leftHand";
    hand.position.set(0, -foreArmLen - 0.03, 0);
    hand.castShadow = true;
    elbowPivot.add(hand);

    shoulderPivot.userData = { elbowPivot, hand };
  }

  // ── HIPS + LEGS — matching screenshot ───────────────────────
  const thighLen = legLen * 0.50;
  const calfLen  = legLen * 0.50;
  const legThick = 0.072;

  for (const s of [-1, 1]) {
    const legX = s * hipW * 0.28;

    const hipPivot = new Group();
    hipPivot.name = s > 0 ? "rightHip" : "leftHip";
    hipPivot.position.set(legX, thighLen, 0);
    torsoGroup.add(hipPivot);

    const thigh = new Mesh(
      new CylinderGeometry(legThick, legThick * 0.88, thighLen, 12),
      pantsM()
    );
    thigh.position.set(0, -thighLen / 2, 0);
    thigh.castShadow = true; thigh.receiveShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new Group();
    kneePivot.name = s > 0 ? "rightKnee" : "leftKnee";
    kneePivot.position.set(0, -thighLen, 0);
    hipPivot.add(kneePivot);

    const calf = new Mesh(
      new CylinderGeometry(legThick * 0.82, legThick * 0.72, calfLen, 12),
      pantsM()
    );
    calf.position.set(0, -calfLen / 2, 0);
    calf.castShadow = true; calf.receiveShadow = true;
    kneePivot.add(calf);

    // Foot — simple low box
    const anklePivot = new Group();
    anklePivot.name = s > 0 ? "rightAnkle" : "leftAnkle";
    anklePivot.position.set(0, -calfLen, 0);
    kneePivot.add(anklePivot);

    const foot = new Mesh(new BoxGeometry(0.10, 0.055, 0.18), shoeM());
    foot.name = s > 0 ? "rightFoot" : "leftFoot";
    foot.position.set(0, -0.028, 0.04);
    foot.castShadow = true;
    anklePivot.add(foot);

    hipPivot.userData = { kneePivot, anklePivot };
  }

  // Shadow blob
  const shadow = new Mesh(
    new CircleGeometry(0.22, 14),
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.20, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -(thighLen + calfLen + 0.06);
  shadow.name = "shadow";
  torsoGroup.add(shadow);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — same simple style
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body    = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale] = body;
  const cloth   = CLOTHING[avatarType] || CLOTHING.neutral;

  const group = new Group();
  group.name  = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0, speed: 0 };

  const sMat  = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.50 });
  const bMat  = () => new MeshStandardMaterial({ color: new Color(cloth.shirt), roughness: 0.55 });
  const pMat  = () => new MeshStandardMaterial({ color: new Color(cloth.pants), roughness: 0.60 });
  const shMat = () => new MeshStandardMaterial({ color: new Color(cloth.shoe),  roughness: 0.55 });
  const hMat  = () => new MeshStandardMaterial({ color: new Color("#1A1008"), roughness: 0.6 });

  const upperArmLen = armLen * 0.50, foreArmLen = armLen * 0.50;
  const thighLen = legLen * 0.50, calfLen = legLen * 0.50;
  const armThick = 0.062, legThick = 0.072;

  // Torso
  const torso = new Mesh(new BoxGeometry(shoulderW * 0.74, torsoH, 0.28), bMat());
  torso.position.y = torsoH * 0.50; torso.castShadow = true; torso.receiveShadow = true;
  group.add(torso);

  // Head
  const skull = new Mesh(new SphereGeometry(0.16 * headScale, 14, 12), sMat());
  skull.scale.set(0.88, 1.02, 0.84);
  skull.position.y = torsoH + 0.28 * headScale; skull.castShadow = true;
  group.add(skull);

  const hairCap = new Mesh(new SphereGeometry(0.165 * headScale, 12, 10), hMat());
  hairCap.scale.set(0.92, 0.58, 0.90);
  hairCap.position.y = torsoH + 0.325 * headScale;
  group.add(hairCap);

  for (const s of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.020 * headScale, 7, 5),
      new MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(s * 0.052 * headScale, torsoH + 0.28 * headScale, 0.13 * headScale);
    group.add(eye);
  }

  // Neck
  const neck = new Mesh(new CylinderGeometry(0.050, 0.056, 0.11, 9), sMat());
  neck.position.y = torsoH + 0.10; neck.castShadow = true;
  group.add(neck);

  // Arms
  for (const s of [-1, 1]) {
    const sign = s > 0 ? "right" : "left";
    const armX = s * (shoulderW * 0.44);

    const shoulderPivot = new Group();
    shoulderPivot.name = `${sign}Shoulder`;
    shoulderPivot.position.set(armX, torsoH * 0.78, 0);
    group.add(shoulderPivot);

    const ua = new Mesh(new CylinderGeometry(armThick, armThick * 0.90, upperArmLen, 9), sMat());
    ua.position.set(0, -upperArmLen / 2, 0); ua.castShadow = true;
    shoulderPivot.add(ua);

    const elbowPivot = new Group();
    elbowPivot.name = `${sign}Elbow`;
    elbowPivot.position.set(0, -upperArmLen, 0);
    shoulderPivot.add(elbowPivot);

    const fa = new Mesh(new CylinderGeometry(armThick * 0.85, armThick * 0.75, foreArmLen, 9), sMat());
    fa.position.set(0, -foreArmLen / 2, 0); fa.castShadow = true;
    elbowPivot.add(fa);

    const hand = new Mesh(new BoxGeometry(0.070, 0.052, 0.052), sMat());
    hand.position.set(0, -foreArmLen - 0.028, 0); hand.castShadow = true;
    hand.name = `${sign}Hand`;
    elbowPivot.add(hand);

    shoulderPivot.userData = { elbowPivot, hand };
  }

  // Legs
  for (const s of [-1, 1]) {
    const sign = s > 0 ? "right" : "left";
    const legX = s * hipW * 0.28;

    const hipPivot = new Group();
    hipPivot.name = `${sign}Hip`;
    hipPivot.position.set(legX, thighLen, 0);
    group.add(hipPivot);

    const thigh = new Mesh(new CylinderGeometry(legThick, legThick * 0.88, thighLen, 11), pMat());
    thigh.position.set(0, -thighLen / 2, 0); thigh.castShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new Group();
    kneePivot.name = `${sign}Knee`;
    kneePivot.position.set(0, -thighLen, 0);
    hipPivot.add(kneePivot);

    const calf = new Mesh(new CylinderGeometry(legThick * 0.82, legThick * 0.72, calfLen, 11), pMat());
    calf.position.set(0, -calfLen / 2, 0); calf.castShadow = true;
    kneePivot.add(calf);

    const anklePivot = new Group();
    anklePivot.name = `${sign}Ankle`;
    anklePivot.position.set(0, -calfLen, 0);
    kneePivot.add(anklePivot);

    const foot = new Mesh(new BoxGeometry(0.10, 0.055, 0.18), shMat());
    foot.position.set(0, -0.028, 0.04); foot.castShadow = true;
    anklePivot.add(foot);

    hipPivot.userData = { kneePivot, anklePivot, footGroup: foot };
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
  ns.position.y = torsoH + 0.70; ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}