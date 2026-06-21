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

// ─── BODY PROPORTIONS PER TYPE ───────────────────────────────
// [shoulderW, hipW, torsoH, armLen, legLen, headScale, waistRatio]
const BODY_PRESETS = {
  masculine:  [0.44, 0.30, 0.44, 0.36, 0.80, 1.08, 0.68],
  feminine:   [0.34, 0.34, 0.40, 0.34, 0.80, 1.00, 0.85],
  nonbinary:  [0.39, 0.33, 0.42, 0.35, 0.80, 1.04, 0.76],
  neutral:    [0.39, 0.33, 0.42, 0.35, 0.80, 1.04, 0.76],
};

// ─── TYPE-SPECIFIC CLOTHING ──────────────────────────────────
const SHIRT_COLORS = { masculine: "#1A5276", feminine: "#8E44AD", nonbinary: "#2E86C1", neutral: "#2E86C1" };
const PANTS_COLORS = { masculine: "#212F3D", feminine: "#1B2631", nonbinary: "#2C3E50", neutral: "#2C3E50" };

// ─── HAIR COLORS ─────────────────────────────────────────────
const HAIR_BASE = "#2C1B0E";
const HAIR_LIGHT = "#3E2723";

// ─── Geometry quality: SEG = 12 for smooth human curves ─────
const SEG = 12;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = opts.depthWrite ?? true; }
  return m;
}

// ═══════════════════════════════════════════════════════════════
// MODERN STYLIZED HUMANOID AVATAR — full-body, smooth, human
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone = opts.skinTone || "medium";
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale, waistR] = body;
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const pantsColor = PANTS_COLORS[avatarType] || PANTS_COLORS.neutral;

  const avatar = new Group();
  avatar.name = "avatar";

  // Materials
  const skinM = () => mat(skinHex, { roughness: 0.44 });
  const skinS = () => mat(skinHex, { roughness: 0.34 });
  const shirtM = () => mat(shirtColor, { roughness: 0.22, metalness: 0.06 });
  const pantsM = () => mat(pantsColor, { roughness: 0.26, metalness: 0.04 });
  const shoeM = () => mat("#1A1A1A", { roughness: 0.28, metalness: 0.08 });
  const soleM = () => mat("#2C2C2C", { roughness: 0.28, metalness: 0.12 });
  const hairM = () => mat(HAIR_BASE, { roughness: 0.45 });
  const hairL = () => mat(HAIR_LIGHT, { roughness: 0.40 });
  const eyeW = () => mat("#FFFFFF", { roughness: 0.08 });
  const irisM = () => mat("#5B8C5A", { roughness: 0.06 });
  const pupilM = () => mat("#080808", { roughness: 0.03 });
  const browM = () => mat("#3E2723", { roughness: 0.46 });
  const mouthM = () => mat("#C0806A", { roughness: 0.35 });
  const noseM = () => mat(skinHex, { roughness: 0.38 });

  function addObj(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos); m.castShadow = casts; m.receiveShadow = casts;
    group.add(m); return m;
  }

  // ─── HEAD — oval, detailed face ───────────────────────────
  function buildHead() {
    const h = new Group(); h.name = "head"; const hs = headScale;

    // Main cranium
    addObj(h, new SphereGeometry(0.098 * hs, 18, 16), skinM, new Vector3(0, 0.13 * hs, 0));
    const cranium = h.children[h.children.length - 1];
    cranium.scale.set(0.86, 1.04, 0.80);

    // Jaw
    const jaw = addObj(h, new SphereGeometry(0.062 * hs, 14, 10), skinM, new Vector3(0, 0.05 * hs, 0.05 * hs));
    jaw.scale.set(0.78, 0.50, 0.62);

    // Cheek bones — two small spheres for 3D cheek definition
    for (const side of [-1, 1]) {
      const cheek = addObj(h, new SphereGeometry(0.025 * hs, 8, 6), skinS, new Vector3(side * 0.06 * hs, 0.11 * hs, 0.055 * hs));
      cheek.scale.set(0.7, 0.6, 0.5);
    }

    // ── EYES — white + iris + pupil + highlight ────────────
    const eyeY = 0.148 * hs, eyeZ = 0.072 * hs, eyeGap = 0.033 * hs;
    for (const s of [-1, 1]) {
      const ex = s * eyeGap;

      const white = addObj(h, new SphereGeometry(0.018 * hs, 8, 6), eyeW, new Vector3(ex, eyeY, eyeZ));
      white.scale.set(0.60, 0.84, 0.38);

      addObj(h, new SphereGeometry(0.01 * hs, 6, 5), irisM, new Vector3(ex, eyeY, eyeZ + 0.006 * hs));
      addObj(h, new SphereGeometry(0.005 * hs, 4, 3), pupilM, new Vector3(ex, eyeY, eyeZ + 0.009 * hs));

      const hl = new Mesh(new SphereGeometry(0.0025 * hs, 3, 2), new MeshBasicMaterial({ color: 0xFFFFFF }));
      hl.position.set(ex + 0.004 * hs, eyeY + 0.004 * hs, eyeZ + 0.011 * hs);
      h.add(hl);

      // Brow — slightly angled
      const brow = addObj(h, new BoxGeometry(0.034 * hs, 0.007 * hs, 0.006 * hs), browM, new Vector3(ex, eyeY + 0.024 * hs, eyeZ + 0.012 * hs));
      brow.rotation.z = s * 0.08;

      // Upper eyelid — subtle lid fold
      const lid = addObj(h, new BoxGeometry(0.022 * hs, 0.003 * hs, 0.008 * hs), skinS, new Vector3(ex, eyeY + 0.013 * hs, eyeZ + 0.004 * hs));
      lid.rotation.x = -0.15;
    }

    // ── NOSE — bridge + tip ───────────────────────────────
    const noseBridge = addObj(h, new BoxGeometry(0.012 * hs, 0.022 * hs, 0.014 * hs), noseM, new Vector3(0, 0.12 * hs, 0.08 * hs));
    const noseTip = addObj(h, new SphereGeometry(0.013 * hs, 8, 6), noseM, new Vector3(0, 0.105 * hs, 0.086 * hs));
    noseTip.scale.set(0.65, 0.55, 0.55);

    // Nostrils
    for (const s of [-1, 1]) {
      addObj(h, new SphereGeometry(0.005 * hs, 4, 3), mat("#5A3A2A", { roughness: 0.4 }), new Vector3(s * 0.008 * hs, 0.103 * hs, 0.09 * hs));
    }

    // ── MOUTH — upper + lower lip ─────────────────────────
    const upperLip = addObj(h, new BoxGeometry(0.038 * hs, 0.007 * hs, 0.005 * hs), mouthM, new Vector3(0, 0.068 * hs, 0.084 * hs));
    const lowerLip = addObj(h, new BoxGeometry(0.034 * hs, 0.009 * hs, 0.004 * hs), mouthM, new Vector3(0, 0.064 * hs, 0.085 * hs));
    lowerLip.rotation.x = 0.15;

    // ── EARS ──────────────────────────────────────────────
    for (const s of [-1, 1]) {
      const ear = addObj(h, new SphereGeometry(0.02 * hs, 8, 6), skinM, new Vector3(s * 0.086 * hs, 0.13 * hs, 0.002));
      ear.scale.set(0.28, 0.58, 0.40);
    }

    // ── HAIR — layered modern style ───────────────────────
    const mainHair = addObj(h, new SphereGeometry(0.106 * hs, 16, 14), hairM, new Vector3(0, 0.19 * hs, -0.01));
    mainHair.scale.set(1.06, 0.58, 0.96);

    for (const s of [-1, 1]) {
      addObj(h, new SphereGeometry(0.044 * hs, 8, 7), hairL, new Vector3(s * 0.072 * hs, 0.16 * hs, 0.012));
      addObj(h, new SphereGeometry(0.038 * hs, 6, 5), hairM, new Vector3(s * 0.06 * hs, 0.20 * hs, -0.008));
    }
    // Bangs
    const bang = addObj(h, new BoxGeometry(0.06 * hs, 0.026 * hs, 0.07 * hs), hairL, new Vector3(0, 0.21 * hs, 0.052 * hs));
    bang.rotation.x = -0.25;
    // Back hair
    addObj(h, new SphereGeometry(0.07 * hs, 10, 8), hairM, new Vector3(0, 0.12 * hs, -0.06 * hs));

    return h;
  }

  // ─── HAND — shaped with fingers ──────────────────────────
  function buildHand() {
    const h = new Group(); h.name = "hand";

    addObj(h, new BoxGeometry(0.062, 0.035, 0.07), skinS, new Vector3(0, -0.008, 0));

    for (let f = -1; f <= 1; f++) {
      addObj(h, new CylinderGeometry(0.007, 0.008, 0.03, 6), skinS, new Vector3(f * 0.02, -0.032, 0.026));
      addObj(h, new SphereGeometry(0.007, 4, 3), skinS, new Vector3(f * 0.02, -0.048, 0.03));
    }

    addObj(h, new CylinderGeometry(0.007, 0.008, 0.034, 6), skinS, new Vector3(0.038, -0.005, 0.005));
    h.children[h.children.length - 1].rotation.z = -0.7;
    addObj(h, new SphereGeometry(0.008, 4, 3), skinS, new Vector3(0.056, -0.026, 0.005));

    return h;
  }

  // ─── FOOT — detailed shoe ────────────────────────────────
  function buildFoot() {
    const f = new Group(); f.name = "foot";

    addObj(f, new BoxGeometry(0.12, 0.064, 0.18), shoeM, new Vector3(0, 0.016, 0.05));
    addObj(f, new BoxGeometry(0.13, 0.025, 0.19), soleM, new Vector3(0, -0.03, 0.05));

    // Toe cap
    const toe = addObj(f, new SphereGeometry(0.04, 8, 6), shoeM, new Vector3(0, 0.008, 0.13));
    toe.scale.set(0.85, 0.6, 0.5);

    // Heel
    const heel = addObj(f, new BoxGeometry(0.11, 0.04, 0.05), soleM, new Vector3(0, -0.01, -0.04));

    return f;
  }

  // ─── LOWER LEG ───────────────────────────────────────────
  function buildLowerLeg() {
    const g = new Group(); g.name = "lowerLeg";
    const len = legLen * 0.47;
    addObj(g, new CylinderGeometry(0.048, 0.058, len, SEG), pantsM, new Vector3(0, -len / 2, 0));
    const f = buildFoot();
    f.position.set(0, -len - 0.01, 0);
    g.add(f);
    g.userData.foot = f;
    return g;
  }

  // ─── UPPER LEG ───────────────────────────────────────────
  function buildUpperLeg() {
    const g = new Group(); g.name = "upperLeg";
    const len = legLen * 0.53;
    addObj(g, new CylinderGeometry(0.066, 0.073, len, SEG), pantsM, new Vector3(0, -len / 2, 0));
    const ll = buildLowerLeg();
    ll.position.set(0, -len, 0);
    g.add(ll);
    g.userData.lowerLeg = ll;
    return g;
  }

  // ─── FOREARM ─────────────────────────────────────────────
  function buildForearm() {
    const g = new Group(); g.name = "forearm";
    const len = armLen * 0.48;
    addObj(g, new CylinderGeometry(0.032, 0.042, len, SEG), skinM, new Vector3(0, -len / 2, 0));
    const h = buildHand();
    h.position.set(0, -len, 0);
    g.add(h);
    g.userData.hand = h;
    return g;
  }

  // ─── UPPER ARM ───────────────────────────────────────────
  function buildUpperArm() {
    const g = new Group(); g.name = "upperArm";
    const len = armLen * 0.52;
    addObj(g, new CylinderGeometry(0.04, 0.048, len, SEG), skinM, new Vector3(0, -len / 2, 0));
    const fa = buildForearm();
    fa.position.set(0, -len, 0);
    g.add(fa);
    g.userData.forearm = fa;
    return g;
  }

  // ─── TORSO — chest, waist, neck, limbs ────────────────────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  const chestBase = torsoH * 0.62;
  const waistBase = torsoH * 0.18;

  // Lower waist → hips taper
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.30 * waistR, hipW * 0.36, torsoH * 0.42, SEG), shirtM, new Vector3(0, waistBase, 0));

  // Mid torso — main body
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.36, shoulderW * 0.32, torsoH * 0.28, SEG), shirtM, new Vector3(0, waistBase + torsoH * 0.22, 0));

  // Upper chest — widest
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.40, shoulderW * 0.37, torsoH * 0.12, SEG), shirtM, new Vector3(0, chestBase - 0.02, 0));

  // Collarbone/shouler top cap
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.42, shoulderW * 0.41, 0.06, SEG), shirtM, new Vector3(0, chestBase + 0.04, 0));

  // ─── NECK ─────────────────────────────────────────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, chestBase + 0.08, 0);
  addObj(neckGroup, new CylinderGeometry(0.032, 0.036, 0.1, SEG), skinM, new Vector3(0, 0.02, 0));

  // Collarbone highlight
  addObj(neckGroup, new CylinderGeometry(0.06, 0.044, 0.03, SEG), skinS, new Vector3(0, -0.03, 0));

  const headGroup = buildHead();
  headGroup.position.y = 0.06;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS ────────────────────────────────────────────
  const shoulderY = chestBase + 0.01;
  const shoulderZ = -0.04;

  // Shoulder caps — smooth ball joints
  const lSCap = addObj(torsoGroup, new SphereGeometry(0.05, SEG, 8), shirtM, new Vector3(-shoulderW * 0.46, shoulderY + 0.01, shoulderZ + 0.02));
  const rSCap = addObj(torsoGroup, new SphereGeometry(0.05, SEG, 8), shirtM, new Vector3(shoulderW * 0.46, shoulderY + 0.01, shoulderZ + 0.02));

  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-shoulderW * 0.50, shoulderY - 0.02, shoulderZ);
  const leftArm = buildUpperArm();
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(shoulderW * 0.50, shoulderY - 0.02, shoulderZ);
  const rightArm = buildUpperArm();
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ─────────────────────────────────────────────────
  const pelvisY = waistBase - 0.03;
  const hipZ = -0.03;

  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-hipW * 0.44, pelvisY, hipZ);
  const leftLeg = buildUpperLeg();
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(hipW * 0.44, pelvisY, hipZ);
  const rightLeg = buildUpperLeg();
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // ─── SHADOW ───────────────────────────────────────────────
  const sd = new Mesh(new CircleGeometry(0.19, 16), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
  sd.rotation.x = -Math.PI / 2; sd.position.y = -0.94; sd.name = "shadow";
  torsoGroup.add(sd);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — optimized LOD matching the full model
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH] = body;
  const RS = 8;

  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0 };

  const sMat = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.44 });
  const bMat = () => new MeshStandardMaterial({ color: new Color("#2E86C1"), roughness: 0.26, metalness: 0.15 });
  const pMat = () => new MeshStandardMaterial({ color: new Color("#2C3E50"), roughness: 0.28, metalness: 0.05 });
  const eMat = () => new MeshStandardMaterial({ color: new Color("#080808"), roughness: 0.05 });
  const moMat = () => new MeshStandardMaterial({ color: new Color("#C0806A"), roughness: 0.35 });
  const hMat = () => new MeshStandardMaterial({ color: new Color(HAIR_BASE), roughness: 0.46 });

  const bodyY = torsoH * 0.45 + 0.10;
  const torso = new Mesh(new CylinderGeometry(shoulderW * 0.35, hipW * 0.38, torsoH, RS), bMat());
  torso.position.y = bodyY; torso.castShadow = true;
  group.add(torso);

  const headGroup = new Group();
  headGroup.position.y = torsoH * 0.7 + 0.28;

  const hm = new Mesh(new SphereGeometry(0.09, 14, 12), sMat());
  hm.scale.set(0.86, 1.04, 0.80); hm.position.y = 0.1; hm.castShadow = true;
  headGroup.add(hm);

  const jw = new Mesh(new SphereGeometry(0.056, 10, 8), sMat());
  jw.scale.set(0.78, 0.48, 0.62); jw.position.set(0, 0.04, 0.05);
  headGroup.add(jw);

  for (const s of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.012, 5, 4), eMat());
    eye.position.set(s * 0.03, 0.115, 0.07);
    headGroup.add(eye);
  }

  headGroup.add(new Mesh(new BoxGeometry(0.03, 0.008, 0.003), moMat()));
  headGroup.children[headGroup.children.length - 1].position.set(0, 0.06, 0.078);

  const rHair = new Mesh(new SphereGeometry(0.094, 12, 10), hMat());
  rHair.scale.set(1.04, 0.54, 0.94); rHair.position.set(0, 0.148, -0.01); rHair.castShadow = true;
  headGroup.add(rHair);

  group.add(headGroup);

  // Neck ring
  const ring = new Mesh(new TorusGeometry(0.078, 0.012, 8, 12), new MeshBasicMaterial({ color: new Color("#42A5F5"), transparent: true, opacity: 0.45, depthWrite: false }));
  ring.position.y = torsoH * 0.7 + 0.06; ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const lLen = 0.38;
  for (const s of [-1, 1]) {
    const leg = new Mesh(new CylinderGeometry(0.042, 0.05, lLen, 6), pMat());
    leg.position.set(s * 0.07, lLen / 2, 0); leg.castShadow = true;
    leg.name = s > 0 ? "rightLeg" : "leftLeg";
    group.add(leg);

    const shoe = new Mesh(new BoxGeometry(0.08, 0.04, 0.12), new MeshStandardMaterial({ color: "#1A1A1A", roughness: 0.28 }));
    shoe.position.set(s * 0.07, -0.01, 0.03); shoe.castShadow = true;
    group.add(shoe);
  }

  // Username
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 64;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillText((username || "User").substring(0, 16), 128, 32);
  const nt = new CanvasTexture(nc); nt.minFilter = LinearFilter; nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new Sprite(new SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.2, 0.3, 1); ns.position.y = torsoH * 0.7 + 0.50; ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}