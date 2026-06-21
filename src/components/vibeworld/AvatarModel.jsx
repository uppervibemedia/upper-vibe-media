import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
} = THREE;

// ─── SKIN TONE PALETTE ────────────────────────────────────────
const SKIN_COLORS = {
  light:         "#FDEBD3",
  "medium-light":"#F3C9A1",
  medium:        "#D4A373",
  "medium-dark": "#B07D5A",
  dark:          "#7B4A3A",
  deep:          "#4A2C2A",
};

// ─── AVATAR TYPE BODY PROPORTIONS ─────────────────────────────
// [shoulderW, hipW, torsoH, armLen, legLen, headScale]
// Social-world style: slightly larger head, balanced natural limbs
const BODY_PRESETS = {
  masculine:  [0.42, 0.30, 0.42, 0.36, 0.78, 1.10],
  feminine:   [0.34, 0.34, 0.40, 0.34, 0.78, 1.02],
  nonbinary:  [0.38, 0.32, 0.41, 0.35, 0.78, 1.06],
  neutral:    [0.38, 0.32, 0.41, 0.35, 0.78, 1.06],
};

// ─── TYPE-SPECIFIC CLOTHING ───────────────────────────────────
const SHIRT_COLORS = {
  masculine:  "#1A5276",
  feminine:   "#8E44AD",
  nonbinary:  "#2E86C1",
  neutral:    "#2E86C1",
};
const PANTS_COLORS = {
  masculine:  "#212F3D",
  feminine:   "#1B2631",
  nonbinary:  "#2C3E50",
  neutral:    "#2C3E50",
};

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

// ═══════════════════════════════════════════════════════════════
// MODERN STYLIZED HUMANOID AVATAR
// Zepeto + Meta Horizon influence — clean, human, mobile-friendly
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone = opts.skinTone || "medium";
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale] = body;
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const pantsColor = PANTS_COLORS[avatarType] || PANTS_COLORS.neutral;

  const avatar = new Group();
  avatar.name = "avatar";

  const skin = () => mat(skinHex, { roughness: 0.48 });
  const skinSmooth = () => mat(skinHex, { roughness: 0.38 });
  const shirt = () => mat(shirtColor, { roughness: 0.22, metalness: 0.06 });
  const pants = () => mat(pantsColor, { roughness: 0.28, metalness: 0.05 });
  const shoes = () => mat("#1A1A1A", { roughness: 0.3, metalness: 0.08 });
  const sole = () => mat("#2C2C2C", { roughness: 0.3, metalness: 0.12 });
  const hair = () => mat("#2C1B0E", { roughness: 0.48 });
  const hairHighlight = () => mat("#3E2723", { roughness: 0.42 });
  const eyeWhite = () => mat("#FFFFFF", { roughness: 0.1 });
  const iris = () => mat("#5B8C5A", { roughness: 0.08 });
  const pupil = () => mat("#0A0A0A", { roughness: 0.04 });
  const brow = () => mat("#3E2723", { roughness: 0.5 });
  const mouth = () => mat("#C0806A", { roughness: 0.38 });
  const noseSkin = () => mat(skinHex, { roughness: 0.42 });

  function addMesh(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos);
    m.castShadow = casts;
    m.receiveShadow = casts;
    group.add(m);
    return m;
  }

  // ─── HEAD — oval shape with facial features ──────────────────
  function createHead() {
    const head = new Group();
    head.name = "head";
    const hs = headScale;

    // Main head — oval (scaled sphere)
    const headGeo = new SphereGeometry(0.1 * hs, 16, 14);
    const headMesh = new Mesh(headGeo, skin());
    headMesh.scale.set(0.88, 1.05, 0.82);
    headMesh.position.y = 0.12 * hs;
    headMesh.castShadow = true;
    head.add(headMesh);

    // Jaw/chin
    const jawGeo = new SphereGeometry(0.065 * hs, 12, 8);
    const jaw = new Mesh(jawGeo, skin());
    jaw.scale.set(0.78, 0.52, 0.64);
    jaw.position.set(0, 0.04 * hs, 0.055 * hs);
    jaw.castShadow = true;
    head.add(jaw);

    // ── EYES ────────────────────────────────────────────────
    const eyeY = 0.145 * hs;
    const eyeZ = 0.078 * hs;
    const eyeGap = 0.034 * hs;
    for (let side = -1; side <= 1; side += 2) {
      const ex = side * eyeGap;

      const whiteGeo = new SphereGeometry(0.018 * hs, 8, 6);
      const white = new Mesh(whiteGeo, eyeWhite());
      white.scale.set(0.62, 0.85, 0.42);
      white.position.set(ex, eyeY, eyeZ);
      head.add(white);

      const irisGeo = new SphereGeometry(0.01 * hs, 6, 5);
      const irisMesh = new Mesh(irisGeo, iris());
      irisMesh.position.set(ex, eyeY, eyeZ + 0.006 * hs);
      head.add(irisMesh);

      const pupilGeo = new SphereGeometry(0.005 * hs, 4, 3);
      const pupilMesh = new Mesh(pupilGeo, pupil());
      pupilMesh.position.set(ex, eyeY, eyeZ + 0.009 * hs);
      head.add(pupilMesh);

      const hlGeo = new SphereGeometry(0.0025 * hs, 3, 2);
      const hl = new Mesh(hlGeo, new MeshBasicMaterial({ color: 0xFFFFFF }));
      hl.position.set(ex + 0.004 * hs, eyeY + 0.004 * hs, eyeZ + 0.011 * hs);
      head.add(hl);

      const browGeo = new BoxGeometry(0.032 * hs, 0.006 * hs, 0.005 * hs);
      const browMesh = new Mesh(browGeo, brow());
      browMesh.position.set(ex, eyeY + 0.022 * hs, eyeZ + 0.01 * hs);
      browMesh.rotation.z = side * 0.05;
      head.add(browMesh);
    }

    // ── NOSE ────────────────────────────────────────────────
    const noseGeo = new SphereGeometry(0.013 * hs, 8, 6);
    const nose = new Mesh(noseGeo, noseSkin());
    nose.scale.set(0.62, 0.72, 0.52);
    nose.position.set(0, 0.115 * hs, 0.088 * hs);
    head.add(nose);

    // ── MOUTH ───────────────────────────────────────────────
    const mouthGeo = new BoxGeometry(0.04 * hs, 0.008 * hs, 0.004 * hs);
    const mouthMesh = new Mesh(mouthGeo, mouth());
    mouthMesh.position.set(0, 0.072 * hs, 0.088 * hs);
    head.add(mouthMesh);

    // ── EARS ────────────────────────────────────────────────
    for (const side of [-1, 1]) {
      const earGeo = new SphereGeometry(0.022 * hs, 8, 6);
      const ear = new Mesh(earGeo, skin());
      ear.scale.set(0.32, 0.62, 0.42);
      ear.position.set(side * 0.088 * hs, 0.128 * hs, 0.002);
      ear.castShadow = true;
      head.add(ear);
    }

    // ── HAIR — clean modern cap with layered depth ──────────
    const hairGeo = new SphereGeometry(0.108 * hs, 14, 12);
    const hairMesh = new Mesh(hairGeo, hair());
    hairMesh.scale.set(1.04, 0.56, 0.96);
    hairMesh.position.set(0, 0.18 * hs, -0.01);
    hairMesh.castShadow = true;
    head.add(hairMesh);

    for (const side of [-1, 1]) {
      const sideHair = new Mesh(new SphereGeometry(0.045 * hs, 8, 7), hairHighlight());
      sideHair.scale.set(0.55, 0.42, 0.48);
      sideHair.position.set(side * 0.075 * hs, 0.15 * hs, 0.01);
      sideHair.castShadow = true;
      head.add(sideHair);

      const topHair = new Mesh(new SphereGeometry(0.04 * hs, 6, 5), hair());
      topHair.scale.set(0.48, 0.38, 0.42);
      topHair.position.set(side * 0.065 * hs, 0.188 * hs, -0.01);
      head.add(topHair);
    }

    // Front hair detail
    const frontHair = new Mesh(new BoxGeometry(0.04 * hs, 0.022 * hs, 0.06 * hs), hairHighlight());
    frontHair.position.set(0, 0.198 * hs, 0.058 * hs);
    frontHair.rotation.x = -0.22;
    head.add(frontHair);

    return head;
  }

  // ─── HAND — stylized mitten with subtle fingers ──────────────
  function createHand() {
    const hand = new Group();
    hand.name = "hand";

    const palmGeo = new BoxGeometry(0.06, 0.034, 0.068);
    const palm = new Mesh(palmGeo, skinSmooth());
    palm.position.y = -0.008;
    palm.castShadow = true;
    hand.add(palm);

    for (let f = -1; f <= 1; f++) {
      const fingerGeo = new BoxGeometry(0.016, 0.028, 0.018);
      const finger = new Mesh(fingerGeo, skinSmooth());
      finger.position.set(f * 0.019, -0.03, 0.026);
      finger.rotation.x = -0.12;
      hand.add(finger);

      const tipGeo = new SphereGeometry(0.008, 4, 3);
      const tip = new Mesh(tipGeo, skinSmooth());
      tip.position.set(f * 0.019, -0.044, 0.033);
      hand.add(tip);
    }

    const thumbGeo = new CylinderGeometry(0.008, 0.007, 0.034, 6);
    const thumb = new Mesh(thumbGeo, skinSmooth());
    thumb.position.set(0.036, -0.004, 0.005);
    thumb.rotation.z = -0.7;
    thumb.castShadow = true;
    hand.add(thumb);

    const thumbTip = new Mesh(new SphereGeometry(0.008, 4, 3), skinSmooth());
    thumbTip.position.set(0.052, -0.025, 0.005);
    hand.add(thumbTip);

    return hand;
  }

  // ─── FOOT — shoe with sole and toe shaping ───────────────────
  function createFoot() {
    const foot = new Group();
    foot.name = "foot";

    const shoeGeo = new BoxGeometry(0.12, 0.062, 0.18);
    const shoeMesh = new Mesh(shoeGeo, shoes());
    shoeMesh.position.set(0, 0.014, 0.05);
    shoeMesh.castShadow = true; shoeMesh.receiveShadow = true;
    foot.add(shoeMesh);

    const soleGeo = new BoxGeometry(0.13, 0.025, 0.19);
    const soleMesh = new Mesh(soleGeo, sole());
    soleMesh.position.set(0, -0.03, 0.05);
    soleMesh.castShadow = true; soleMesh.receiveShadow = true;
    foot.add(soleMesh);

    const toeGeo = new SphereGeometry(0.04, 8, 6);
    const toe = new Mesh(toeGeo, shoes());
    toe.scale.set(0.85, 0.65, 0.55);
    toe.position.set(0, 0.008, 0.13);
    foot.add(toe);

    return foot;
  }

  // ─── LOWER LEG — shin + foot ─────────────────────────────────
  function createLowerLeg() {
    const leg = new Group();
    leg.name = "lowerLeg";
    const len = legLen * 0.47;
    addMesh(leg, new CylinderGeometry(0.05, 0.06, len, 8), pants, new Vector3(0, -len / 2, 0));
    const f = createFoot();
    f.position.set(0, -len - 0.01, 0);
    leg.add(f);
    leg.userData.foot = f;
    return leg;
  }

  // ─── UPPER LEG — thigh + lower ──────────────────────────────
  function createUpperLeg() {
    const leg = new Group();
    leg.name = "upperLeg";
    const len = legLen * 0.53;
    addMesh(leg, new CylinderGeometry(0.068, 0.074, len, 8), pants, new Vector3(0, -len / 2, 0));
    const ll = createLowerLeg();
    ll.position.set(0, -len, 0);
    leg.add(ll);
    leg.userData.lowerLeg = ll;
    return leg;
  }

  // ─── FOREARM — lower arm + hand ──────────────────────────────
  function createForearm() {
    const arm = new Group();
    arm.name = "forearm";
    const len = armLen * 0.48;
    addMesh(arm, new CylinderGeometry(0.034, 0.044, len, 8), skin, new Vector3(0, -len / 2, 0));
    const h = createHand();
    h.position.set(0, -len, 0);
    arm.add(h);
    arm.userData.hand = h;
    return arm;
  }

  // ─── UPPER ARM — bicep + forearm ─────────────────────────────
  function createUpperArm() {
    const arm = new Group();
    arm.name = "upperArm";
    const len = armLen * 0.52;
    addMesh(arm, new CylinderGeometry(0.042, 0.05, len, 8), skin, new Vector3(0, -len / 2, 0));
    const fa = createForearm();
    fa.position.set(0, -len, 0);
    arm.add(fa);
    arm.userData.forearm = fa;
    return arm;
  }

  // ─── TORSO — chest, waist, neck, limbs ───────────────────────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  const chestTop = torsoH * 0.62;
  const waistY = torsoH * 0.24;

  // Lower waist
  const waistGeo = new CylinderGeometry(shoulderW * 0.32, hipW * 0.38, torsoH * 0.38, 10);
  addMesh(torsoGroup, waistGeo, shirt, new Vector3(0, waistY, 0));

  // Upper chest — wider
  const chestGeo = new CylinderGeometry(shoulderW * 0.36, shoulderW * 0.34, torsoH * 0.4, 10);
  addMesh(torsoGroup, chestGeo, shirt, new Vector3(0, waistY + torsoH * 0.2, 0));

  // ─── NECK ──────────────────────────────────────────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, chestTop + 0.05, 0);
  addMesh(neckGroup, new CylinderGeometry(0.034, 0.04, 0.1, 8), skin, new Vector3(0, 0.02, 0));

  const headGroup = createHead();
  headGroup.position.y = 0.06;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS ─────────────────────────────────────────────
  const shoulderY = chestTop;
  const shoulderZ = -0.03;

  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-shoulderW * 0.48, shoulderY, shoulderZ);
  const leftArm = createUpperArm();
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(shoulderW * 0.48, shoulderY, shoulderZ);
  const rightArm = createUpperArm();
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ──────────────────────────────────────────────────
  const PELVIS_Y = waistY - 0.04;
  const hipZ = -0.02;

  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-hipW * 0.44, PELVIS_Y, hipZ);
  const leftLeg = createUpperLeg();
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(hipW * 0.44, PELVIS_Y, hipZ);
  const rightLeg = createUpperLeg();
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // ─── SHADOW DISC ───────────────────────────────────────────
  const shadowGeo = new CircleGeometry(0.18, 16);
  const shadowDiscMat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
  const shadowDisc = new Mesh(shadowGeo, shadowDiscMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.92;
  shadowDisc.name = "shadow";
  torsoGroup.add(shadowDisc);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — stylized LOD matching the modern social-world model
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH] = body;

  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0 };

  const skinMat = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.48 });
  const bodyMat = () => new MeshStandardMaterial({ color: new Color("#2E86C1"), roughness: 0.28, metalness: 0.15 });
  const pantsMat = () => new MeshStandardMaterial({ color: new Color("#2C3E50"), roughness: 0.3, metalness: 0.05 });
  const eyeMat = () => new MeshStandardMaterial({ color: new Color("#0A0A0A"), roughness: 0.06 });
  const mouthMat = () => new MeshStandardMaterial({ color: new Color("#C0806A"), roughness: 0.38 });
  const hairMat = () => new MeshStandardMaterial({ color: new Color("#2C1B0E"), roughness: 0.5 });

  // Torso
  const torso = new Mesh(new CylinderGeometry(shoulderW * 0.34, hipW * 0.38, torsoH, 8), bodyMat());
  torso.position.y = torsoH * 0.45 + 0.08;
  torso.castShadow = true;
  group.add(torso);

  // Head group
  const headGroup = new Group();
  headGroup.position.y = torsoH * 0.7 + 0.22;

  const headMesh = new Mesh(new SphereGeometry(0.092, 12, 10), skinMat());
  headMesh.scale.set(0.88, 1.04, 0.82);
  headMesh.position.y = 0.1;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const jaw = new Mesh(new SphereGeometry(0.058, 8, 6), skinMat());
  jaw.scale.set(0.78, 0.48, 0.62);
  jaw.position.set(0, 0.04, 0.05);
  headGroup.add(jaw);

  for (let side = -1; side <= 1; side += 2) {
    const eye = new Mesh(new SphereGeometry(0.012, 5, 4), eyeMat());
    eye.position.set(side * 0.03, 0.115, 0.07);
    headGroup.add(eye);
  }

  const mouth = new Mesh(new BoxGeometry(0.032, 0.007, 0.003), mouthMat());
  mouth.position.set(0, 0.062, 0.078);
  headGroup.add(mouth);

  const hairMesh = new Mesh(new SphereGeometry(0.095, 10, 8), hairMat());
  hairMesh.scale.set(1.02, 0.52, 0.94);
  hairMesh.position.set(0, 0.145, -0.01);
  hairMesh.castShadow = true;
  headGroup.add(hairMesh);

  group.add(headGroup);

  // Neck ring
  const ring = new Mesh(new TorusGeometry(0.08, 0.012, 8, 12), new MeshBasicMaterial({
    color: new Color("#42A5F5"), depthWrite: false, transparent: true, opacity: 0.5,
  }));
  ring.position.y = torsoH * 0.7 + 0.04;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Legs with shoes
  const legLen = 0.38;
  const legGeo = new CylinderGeometry(0.042, 0.05, legLen, 6);
  for (const side of [-1, 1]) {
    const leg = new Mesh(legGeo, pantsMat());
    leg.position.set(side * 0.07, legLen / 2, 0);
    leg.castShadow = true;
    leg.name = side > 0 ? "rightLeg" : "leftLeg";
    group.add(leg);

    const shoe = new Mesh(new BoxGeometry(0.08, 0.04, 0.12), new MeshStandardMaterial({ color: "#1A1A1A", roughness: 0.3 }));
    shoe.position.set(side * 0.07, -0.01, 0.03);
    shoe.castShadow = true;
    group.add(shoe);
  }

  // Username sprite
  const nameCanvas = document.createElement("canvas");
  nameCanvas.width = 256; nameCanvas.height = 64;
  const ctx = nameCanvas.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText((username || "User").substring(0, 16), 128, 32);
  const nameTex = new CanvasTexture(nameCanvas);
  nameTex.minFilter = LinearFilter; nameTex.colorSpace = THREE.SRGBColorSpace;
  const nameSprite = new Sprite(new SpriteMaterial({ map: nameTex, transparent: true, depthWrite: false, depthTest: false }));
  nameSprite.scale.set(1.2, 0.3, 1);
  nameSprite.position.y = torsoH * 0.7 + 0.48;
  nameSprite.renderOrder = 999;
  group.add(nameSprite);

  scene.add(group);
  return group;
}