import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
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

// ─── FORTNITE-STYLE BODY PROPORTIONS ─────────────────────────
// Scale: ~1.8 total height. Head = ~0.28, Torso = ~0.55, Legs = ~0.85
// [shoulderW, hipW, torsoH, armLen, legLen, headScale, waistRatio]
const BODY_PRESETS = {
  masculine:  [0.52, 0.36, 0.55, 0.48, 0.88, 1.0, 0.65],
  feminine:   [0.42, 0.38, 0.50, 0.44, 0.86, 0.95, 0.78],
  nonbinary:  [0.48, 0.37, 0.52, 0.46, 0.87, 0.98, 0.72],
  neutral:    [0.48, 0.37, 0.52, 0.46, 0.87, 0.98, 0.72],
};

// ─── CLOTHING COLORS ─────────────────────────────────────────
const SHIRT_COLORS = { masculine: "#1A5276", feminine: "#8E44AD", nonbinary: "#2E86C1", neutral: "#2E86C1" };
const PANTS_COLORS = { masculine: "#212F3D", feminine: "#1B2631", nonbinary: "#2C3E50", neutral: "#2C3E50" };
const BELT_COLORS  = { masculine: "#3A3A3A", feminine: "#4A3040", nonbinary: "#3A3A4A", neutral: "#3A3A4A" };

// ─── HAIR COLORS ─────────────────────────────────────────────
const HAIR_BASE = "#2C1B0E";
const HAIR_LIGHT = "#3E2723";

const SEG = 16;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = opts.depthWrite ?? true; }
  return m;
}

// ═══════════════════════════════════════════════════════════════
// FORTNITE-STYLE AVATAR — heroic proportions, detailed human
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone = opts.skinTone || "medium";
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale, waistR] = body;
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const pantsColor = PANTS_COLORS[avatarType] || PANTS_COLORS.neutral;
  const beltColor = BELT_COLORS[avatarType] || BELT_COLORS.neutral;

  const avatar = new Group();
  avatar.name = "avatar";

  // Materials
  const skinM = () => mat(skinHex, { roughness: 0.42 });
  const skinS = () => mat(skinHex, { roughness: 0.32 });
  const shirtM = () => mat(shirtColor, { roughness: 0.24, metalness: 0.06 });
  const pantsM = () => mat(pantsColor, { roughness: 0.28, metalness: 0.04 });
  const beltM = () => mat(beltColor, { roughness: 0.20, metalness: 0.15 });
  const shoeM = () => mat("#1A1A1A", { roughness: 0.28, metalness: 0.08 });
  const soleM = () => mat("#2C2C2C", { roughness: 0.30, metalness: 0.10 });
  const laceM = () => mat("#DDDDDD", { roughness: 0.35 });
  const hairM = () => mat(HAIR_BASE, { roughness: 0.44 });
  const hairL = () => mat(HAIR_LIGHT, { roughness: 0.38 });
  const eyeW = () => mat("#FFFFFF", { roughness: 0.06 });
  const irisM = () => mat("#5B8C5A", { roughness: 0.05 });
  const pupilM = () => mat("#080808", { roughness: 0.02 });
  const browM = () => mat("#3E2723", { roughness: 0.44 });
  const mouthM = () => mat("#C07060", { roughness: 0.32 });
  const mouthL = () => mat("#B06050", { roughness: 0.30 });

  function addObj(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos); m.castShadow = casts; m.receiveShadow = casts;
    group.add(m); return m;
  }

  // ─── HEAD — human face with all features ──────────────────
  function buildHead() {
    const h = new Group(); h.name = "head"; const hs = headScale;
    const eyeY = 0.14 * hs, eyeZ = 0.072 * hs, eyeGap = 0.034 * hs;

    // Main cranium — slightly taller oval
    const cranium = addObj(h, new SphereGeometry(0.10 * hs, 20, 18), skinM, new Vector3(0, 0.12 * hs, 0));
    cranium.scale.set(0.84, 1.06, 0.78);

    // Jaw — squared, masculine
    const jaw = addObj(h, new SphereGeometry(0.06 * hs, 16, 12), skinM, new Vector3(0, 0.045 * hs, 0.052 * hs));
    jaw.scale.set(0.82, 0.48, 0.64);

    // Chin
    const chin = addObj(h, new SphereGeometry(0.02 * hs, 8, 6), skinS, new Vector3(0, 0.008 * hs, 0.082 * hs));
    chin.scale.set(0.7, 0.5, 0.5);

    // Jawline edges
    for (const s of [-1, 1]) {
      const edge = addObj(h, new SphereGeometry(0.016 * hs, 6, 5), skinS, new Vector3(s * 0.05 * hs, 0.04 * hs, 0.06 * hs));
      edge.scale.set(0.6, 0.4, 0.5);
    }

    // ── CHEEKS ────────────────────────────────────────
    for (const s of [-1, 1]) {
      const cheek = addObj(h, new SphereGeometry(0.028 * hs, 8, 6), skinS, new Vector3(s * 0.06 * hs, 0.10 * hs, 0.055 * hs));
      cheek.scale.set(0.7, 0.55, 0.45);
    }

    // ── EYES — white + iris + pupil + highlight ──────
    for (const s of [-1, 1]) {
      const ex = s * eyeGap;

      const white = addObj(h, new SphereGeometry(0.019 * hs, 8, 6), eyeW, new Vector3(ex, eyeY, eyeZ));
      white.scale.set(0.58, 0.82, 0.36);

      addObj(h, new SphereGeometry(0.01 * hs, 6, 5), irisM, new Vector3(ex, eyeY, eyeZ + 0.007 * hs));
      addObj(h, new SphereGeometry(0.005 * hs, 4, 3), pupilM, new Vector3(ex, eyeY, eyeZ + 0.01 * hs));

      const hl = new Mesh(new SphereGeometry(0.0025 * hs, 3, 2), new MeshBasicMaterial({ color: 0xFFFFFF }));
      hl.position.set(ex + 0.004 * hs, eyeY + 0.005 * hs, eyeZ + 0.012 * hs);
      h.add(hl);

      // Eyebrow
      const brow = addObj(h, new BoxGeometry(0.036 * hs, 0.008 * hs, 0.006 * hs), browM, new Vector3(ex, eyeY + 0.026 * hs, eyeZ + 0.014 * hs));
      brow.rotation.z = s * 0.06;

      // Eyelid fold
      const lid = addObj(h, new BoxGeometry(0.024 * hs, 0.004 * hs, 0.008 * hs), skinS, new Vector3(ex, eyeY + 0.015 * hs, eyeZ + 0.005 * hs));
      lid.rotation.x = -0.12;
    }

    // ── NOSE — bridge + tip ───────────────────────────
    const noseBridge = addObj(h, new BoxGeometry(0.014 * hs, 0.024 * hs, 0.016 * hs), skinS, new Vector3(0, 0.115 * hs, 0.08 * hs));
    const noseTip = addObj(h, new SphereGeometry(0.014 * hs, 8, 6), skinS, new Vector3(0, 0.10 * hs, 0.088 * hs));
    noseTip.scale.set(0.65, 0.52, 0.52);

    for (const s of [-1, 1]) {
      addObj(h, new SphereGeometry(0.005 * hs, 4, 3), mat("#5A3A2A", { roughness: 0.38 }), new Vector3(s * 0.008 * hs, 0.098 * hs, 0.092 * hs));
    }

    // ── MOUTH — upper + lower lip ─────────────────────
    const upperLip = addObj(h, new BoxGeometry(0.04 * hs, 0.008 * hs, 0.006 * hs), mouthM, new Vector3(0, 0.064 * hs, 0.084 * hs));
    const lowerLip = addObj(h, new BoxGeometry(0.036 * hs, 0.01 * hs, 0.005 * hs), mouthL, new Vector3(0, 0.06 * hs, 0.085 * hs));
    lowerLip.rotation.x = 0.12;

    // ── EARS ──────────────────────────────────────────
    for (const s of [-1, 1]) {
      const ear = addObj(h, new SphereGeometry(0.02 * hs, 8, 6), skinM, new Vector3(s * 0.088 * hs, 0.12 * hs, 0));
      ear.scale.set(0.26, 0.58, 0.38);
    }

    // ── HAIR — layered modern style ───────────────────
    const mainHair = addObj(h, new SphereGeometry(0.108 * hs, 18, 16), hairM, new Vector3(0, 0.18 * hs, -0.01));
    mainHair.scale.set(1.05, 0.56, 0.94);

    for (const s of [-1, 1]) {
      addObj(h, new SphereGeometry(0.046 * hs, 8, 7), hairL, new Vector3(s * 0.072 * hs, 0.15 * hs, 0.014));
      addObj(h, new SphereGeometry(0.04 * hs, 6, 5), hairM, new Vector3(s * 0.06 * hs, 0.19 * hs, -0.006));
    }

    const bang = addObj(h, new BoxGeometry(0.062 * hs, 0.028 * hs, 0.07 * hs), hairL, new Vector3(0, 0.20 * hs, 0.052 * hs));
    bang.rotation.x = -0.22;

    addObj(h, new SphereGeometry(0.074 * hs, 10, 8), hairM, new Vector3(0, 0.11 * hs, -0.06 * hs));

    return h;
  }

  // ─── HAND — 5 fingers, palm, thumb ───────────────────────
  function buildHand() {
    const hd = new Group(); hd.name = "hand";

    // Palm
    addObj(hd, new BoxGeometry(0.07, 0.04, 0.08), skinS, new Vector3(0, -0.01, 0));

    // 4 fingers
    for (let f = -1; f <= 2; f++) {
      const fx = f * 0.022;
      addObj(hd, new CylinderGeometry(0.0075, 0.009, 0.035, 8), skinS, new Vector3(fx, -0.038, 0.028));
      addObj(hd, new SphereGeometry(0.0075, 4, 3), skinS, new Vector3(fx, -0.056, 0.033));
    }

    // Thumb
    const thumb = addObj(hd, new CylinderGeometry(0.0075, 0.009, 0.038, 8), skinS, new Vector3(0.04, -0.008, 0.006));
    thumb.rotation.z = -0.65;
    addObj(hd, new SphereGeometry(0.008, 4, 3), skinS, new Vector3(0.06, -0.03, 0.005));

    // Knuckle bumps
    for (let f = -1; f <= 2; f++) {
      addObj(hd, new SphereGeometry(0.01, 4, 3), skinS, new Vector3(f * 0.022, -0.015, 0.02));
    }

    return hd;
  }

  // ─── FOOT — detailed sneaker ──────────────────────────────
  function buildFoot() {
    const f = new Group(); f.name = "foot";

    // Main shoe body
    addObj(f, new BoxGeometry(0.14, 0.07, 0.20), shoeM, new Vector3(0, 0.018, 0.06));

    // Sole
    addObj(f, new BoxGeometry(0.15, 0.028, 0.21), soleM, new Vector3(0, -0.034, 0.06));

    // Toe cap
    const toe = addObj(f, new SphereGeometry(0.045, 8, 6), shoeM, new Vector3(0, 0.01, 0.15));
    toe.scale.set(0.85, 0.58, 0.48);

    // Heel
    addObj(f, new BoxGeometry(0.12, 0.045, 0.06), soleM, new Vector3(0, -0.008, -0.04));

    // Tongue piece
    addObj(f, new BoxGeometry(0.08, 0.025, 0.04), shoeM, new Vector3(0, 0.06, 0.04));

    // Lace stripe
    const lace = addObj(f, new BoxGeometry(0.09, 0.01, 0.06), laceM, new Vector3(0, 0.052, 0.05));
    lace.rotation.x = 0.25;

    // Ankle collar
    addObj(f, new CylinderGeometry(0.06, 0.07, 0.06, 12), shoeM, new Vector3(0, 0.065, -0.02));

    return f;
  }

  // ─── LOWER LEG ─────────────────────────────────────────────
  function buildLowerLeg() {
    const g = new Group(); g.name = "lowerLeg";
    const len = legLen * 0.48;
    // Calf shape: wider at top, narrow at ankle
    addObj(g, new CylinderGeometry(0.055, 0.065, len, SEG), pantsM, new Vector3(0, -len / 2, 0));
    const f = buildFoot();
    f.position.set(0, -len - 0.01, 0.03);
    g.add(f);
    g.userData.foot = f;
    return g;
  }

  // ─── UPPER LEG ─────────────────────────────────────────────
  function buildUpperLeg() {
    const g = new Group(); g.name = "upperLeg";
    const len = legLen * 0.52;
    // Thigh: wider at hip
    addObj(g, new CylinderGeometry(0.075, 0.082, len, SEG), pantsM, new Vector3(0, -len / 2, 0));
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
    addObj(g, new CylinderGeometry(0.036, 0.046, len, SEG), skinM, new Vector3(0, -len / 2, 0));
    const hd = buildHand();
    hd.position.set(0, -len, 0.005);
    g.add(hd);
    g.userData.hand = hd;
    return g;
  }

  // ─── UPPER ARM ─────────────────────────────────────────────
  function buildUpperArm() {
    const g = new Group(); g.name = "upperArm";
    const len = armLen * 0.52;
    addObj(g, new CylinderGeometry(0.044, 0.055, len, SEG), skinM, new Vector3(0, -len / 2, 0));
    const fa = buildForearm();
    fa.position.set(0, -len, 0);
    g.add(fa);
    g.userData.forearm = fa;
    return g;
  }

  // ─── TORSO — broad chest, defined waist ───────────────────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  const chestBase = torsoH * 0.60;
  const waistBase = torsoH * 0.16;

  // Hips
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.28 * waistR, hipW * 0.34, torsoH * 0.28, SEG), pantsM, new Vector3(0, waistBase, 0));

  // Waist/belt area
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.32, shoulderW * 0.30, torsoH * 0.12, SEG), shirtM, new Vector3(0, waistBase + torsoH * 0.16, 0));

  // Belt strip
  const belt = addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.33, shoulderW * 0.32, 0.03, SEG), beltM, new Vector3(0, waistBase + torsoH * 0.20, 0));

  // Mid torso
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.38, shoulderW * 0.34, torsoH * 0.24, SEG), shirtM, new Vector3(0, waistBase + torsoH * 0.26, 0));

  // Upper chest
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.42, shoulderW * 0.40, torsoH * 0.18, SEG), shirtM, new Vector3(0, chestBase - 0.02, 0));

  // Collarbone top
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.44, shoulderW * 0.43, 0.08, SEG), shirtM, new Vector3(0, chestBase + 0.06, 0));

  // ─── NECK ──────────────────────────────────────────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, chestBase + 0.10, 0);
  addObj(neckGroup, new CylinderGeometry(0.035, 0.04, 0.11, SEG), skinM, new Vector3(0, 0.02, 0));
  addObj(neckGroup, new CylinderGeometry(0.065, 0.05, 0.03, SEG), skinS, new Vector3(0, -0.03, 0));

  const headGroup = buildHead();
  headGroup.position.y = 0.07;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS ─────────────────────────────────────────────
  const shoulderY = chestBase + 0.01;
  const shoulderZ = -0.05;

  addObj(torsoGroup, new SphereGeometry(0.055, SEG, 10), shirtM, new Vector3(-shoulderW * 0.48, shoulderY, shoulderZ + 0.02));
  addObj(torsoGroup, new SphereGeometry(0.055, SEG, 10), shirtM, new Vector3(shoulderW * 0.48, shoulderY, shoulderZ + 0.02));

  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-shoulderW * 0.54, shoulderY - 0.03, shoulderZ);
  const leftArm = buildUpperArm();
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(shoulderW * 0.54, shoulderY - 0.03, shoulderZ);
  const rightArm = buildUpperArm();
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ──────────────────────────────────────────────────
  const pelvisY = waistBase - 0.03;
  const hipZ = -0.04;

  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-hipW * 0.46, pelvisY, hipZ);
  const leftLeg = buildUpperLeg();
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(hipW * 0.46, pelvisY, hipZ);
  const rightLeg = buildUpperLeg();
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // ─── SHADOW ────────────────────────────────────────────────
  const sd = new Mesh(new CircleGeometry(0.22, 16), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  sd.rotation.x = -Math.PI / 2; sd.position.y = -1.10; sd.name = "shadow";
  torsoGroup.add(sd);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — optimized LOD matching the Fortnite-style model
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, , legLen] = body;
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const pantsColor = PANTS_COLORS[avatarType] || PANTS_COLORS.neutral;
  const RS = 12;

  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0 };

  const sMat = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.42 });
  const bMat = () => new MeshStandardMaterial({ color: new Color(shirtColor), roughness: 0.26, metalness: 0.15 });
  const pMat = () => new MeshStandardMaterial({ color: new Color(pantsColor), roughness: 0.28, metalness: 0.05 });
  const eMat = () => new MeshStandardMaterial({ color: new Color("#080808"), roughness: 0.05 });
  const moMat = () => new MeshStandardMaterial({ color: new Color("#C07060"), roughness: 0.32 });
  const hMat = () => new MeshStandardMaterial({ color: new Color(HAIR_BASE), roughness: 0.44 });

  // ─── TORSO ─────────────────────────────────────────────────
  const bodyY = torsoH * 0.45 + 0.12;
  const torsoGeo = new CylinderGeometry(shoulderW * 0.40, hipW * 0.40, torsoH, RS);
  const torso = new Mesh(torsoGeo, bMat());
  torso.position.y = bodyY; torso.castShadow = true; torso.receiveShadow = true;
  group.add(torso);

  // ─── HEAD ──────────────────────────────────────────────────
  const headGroup = new Group();
  headGroup.position.y = torsoH * 0.7 + 0.30;

  const cranium = new Mesh(new SphereGeometry(0.096, 16, 14), sMat());
  cranium.scale.set(0.84, 1.06, 0.78); cranium.position.y = 0.09; cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new Mesh(new SphereGeometry(0.054, 12, 10), sMat());
  jaw.scale.set(0.82, 0.48, 0.64); jaw.position.set(0, 0.035, 0.048);
  headGroup.add(jaw);

  for (const s of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.010, 5, 4), eMat());
    eye.position.set(s * 0.03, 0.11, 0.065);
    headGroup.add(eye);
  }

  headGroup.add(new Mesh(new BoxGeometry(0.032, 0.009, 0.004), moMat()));
  headGroup.children[headGroup.children.length - 1].position.set(0, 0.055, 0.078);

  // Hair
  const rHair = new Mesh(new SphereGeometry(0.096, 14, 12), hMat());
  rHair.scale.set(1.04, 0.55, 0.94); rHair.position.set(0, 0.14, -0.01); rHair.castShadow = true;
  headGroup.add(rHair);

  group.add(headGroup);

  // ─── NECK RING ─────────────────────────────────────────────
  const ring = new Mesh(new TorusGeometry(0.08, 0.012, 8, 16), new MeshBasicMaterial({ color: new Color("#42A5F5"), transparent: true, opacity: 0.40, depthWrite: false }));
  ring.position.y = torsoH * 0.7 + 0.07; ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // ─── LEGS ──────────────────────────────────────────────────
  const totalLegLen = legLen || 0.88;
  const thighLen = totalLegLen * 0.52;
  const calfLen = totalLegLen * 0.48;

  for (const s of [-1, 1]) {
    const legX = s * hipW * 0.40;
    const thigh = new Mesh(new CylinderGeometry(0.054, 0.060, thighLen, 8), pMat());
    thigh.position.set(legX, thighLen / 2, -0.03); thigh.castShadow = true;
    thigh.name = s > 0 ? "rightLeg" : "leftLeg";
    group.add(thigh);

    const calf = new Mesh(new CylinderGeometry(0.040, 0.048, calfLen, 8), pMat());
    calf.position.set(legX, -calfLen / 2, -0.03); calf.castShadow = true;
    group.add(calf);

    // Shoe
    const shoe = new Mesh(new BoxGeometry(0.10, 0.05, 0.15), new MeshStandardMaterial({ color: "#1A1A1A", roughness: 0.28 }));
    shoe.position.set(legX, -calfLen - 0.04, 0); shoe.castShadow = true;
    group.add(shoe);
  }

  // ─── USERNAME ─────────────────────────────────────────────
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 64;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillText((username || "User").substring(0, 16), 128, 32);
  const nt = new CanvasTexture(nc); nt.minFilter = LinearFilter; nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new Sprite(new SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.3, 0.32, 1); ns.position.y = torsoH * 0.7 + 0.55; ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}