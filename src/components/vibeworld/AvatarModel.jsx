import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3, PlaneGeometry,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
  ShapeGeometry, ExtrudeGeometry, Shape, RingGeometry,
} = THREE;

// ─── SKIN TONE PALETTE ────────────────────────────────────────
const SKIN_COLORS = {
  light:        "#FDEBD3",
  "medium-light": "#F3C9A1",
  medium:       "#D4A373",
  "medium-dark":"#B07D5A",
  dark:         "#7B4A3A",
  deep:         "#4A2C2A",
};

// ─── AVATAR TYPE BODY PROPORTIONS ─────────────────────────────
// [shoulderWidth, hipWidth, torsoHeight, armLength, legLength, headScale]
const BODY_PRESETS = {
  masculine:  [0.42, 0.30, 0.40, 0.32, 0.76, 1.0],
  feminine:   [0.34, 0.34, 0.36, 0.28, 0.76, 0.95],
  nonbinary:  [0.38, 0.32, 0.38, 0.30, 0.76, 0.98],
  neutral:    [0.38, 0.32, 0.38, 0.30, 0.76, 0.98],
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
// MODERN HUMANOID AVATAR — face, body, skin tone, avatar type
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone = opts.skinTone || "medium";
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale] = body;

  const avatar = new Group();
  avatar.name = "avatar";

  const skinMat = () => mat(skinHex, { roughness: 0.55 });
  const shirtMat = () => mat("#1565C0", { roughness: 0.3 });
  const pantsMat = () => mat("#1B5E20", { roughness: 0.35 });
  const shoeMat = () => mat("#3E2723", { roughness: 0.4 });
  const hairMat = () => mat("#3E2723", { roughness: 0.55 });
  const eyeWhiteMat = () => mat("#FFFFFF", { roughness: 0.15 });
  const irisMat = () => mat("#4A6741", { roughness: 0.1 });
  const pupilMat = () => mat("#111111", { roughness: 0.05 });
  const darkShoe = () => mat("#1A1A1A", { roughness: 0.35 });
  const mouthMat = () => mat("#C4957A", { roughness: 0.4 });

  function addMesh(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos);
    m.castShadow = casts;
    m.receiveShadow = casts;
    group.add(m);
    return m;
  }

  // ─── FOOT ──────────────────────────────────────────────────
  function createFoot() {
    const foot = new Group();
    foot.name = "foot";
    addMesh(foot, new BoxGeometry(0.11, 0.06, 0.16), darkShoe, new Vector3(0, 0.01, 0.05));
    const sole = new Mesh(new BoxGeometry(0.12, 0.025, 0.17), shoeMat());
    sole.position.set(0, -0.03, 0.05);
    sole.castShadow = true; sole.receiveShadow = true;
    foot.add(sole);
    return foot;
  }

  // ─── LOWER LEG ─────────────────────────────────────────────
  function createLowerLeg() {
    const leg = new Group();
    leg.name = "lowerLeg";
    const len = legLen * 0.47;
    addMesh(leg, new CylinderGeometry(0.055, 0.065, len, 8), pantsMat, new Vector3(0, -len / 2, 0));
    const foot = createFoot();
    foot.position.set(0, -len - 0.01, 0);
    leg.add(foot);
    leg.userData.foot = foot;
    return leg;
  }

  // ─── UPPER LEG ─────────────────────────────────────────────
  function createUpperLeg() {
    const leg = new Group();
    leg.name = "upperLeg";
    const len = legLen * 0.53;
    addMesh(leg, new CylinderGeometry(0.07, 0.078, len, 8), pantsMat, new Vector3(0, -len / 2, 0));
    const lowerLeg = createLowerLeg();
    lowerLeg.position.set(0, -len, 0);
    leg.add(lowerLeg);
    leg.userData.lowerLeg = lowerLeg;
    return leg;
  }

  // ─── HAND (mitten-style, friendly) ─────────────────────────
  function createHand() {
    const hand = new Group();
    hand.name = "hand";
    addMesh(hand, new SphereGeometry(0.05, 6, 4), skinMat, new Vector3(0, 0, 0));
    // Thumb nub
    addMesh(hand, new SphereGeometry(0.02, 4, 3), skinMat, new Vector3(0.04, 0.01, 0.01), false);
    return hand;
  }

  // ─── FOREARM ───────────────────────────────────────────────
  function createForearm() {
    const arm = new Group();
    arm.name = "forearm";
    const len = armLen * 0.48;
    addMesh(arm, new CylinderGeometry(0.04, 0.05, len, 8), skinMat, new Vector3(0, -len / 2, 0));
    const hand = createHand();
    hand.position.set(0, -len, 0);
    arm.add(hand);
    arm.userData.hand = hand;
    return arm;
  }

  // ─── UPPER ARM ─────────────────────────────────────────────
  function createUpperArm() {
    const arm = new Group();
    arm.name = "upperArm";
    const len = armLen * 0.52;
    addMesh(arm, new CylinderGeometry(0.045, 0.055, len, 8), skinMat, new Vector3(0, -len / 2, 0));
    const forearm = createForearm();
    forearm.position.set(0, -len, 0);
    arm.add(forearm);
    arm.userData.forearm = forearm;
    return arm;
  }

  // ─── MODERN HEAD with FACE ─────────────────────────────────
  function createHead() {
    const head = new Group();
    head.name = "head";

    // Main head shape (slightly elongated sphere for more natural look)
    const headGeo = new SphereGeometry(0.1, 14, 12);
    const headMesh = new Mesh(headGeo, skinMat());
    headMesh.scale.set(1, 1.08, 0.92);
    headMesh.position.y = 0.1;
    headMesh.castShadow = true;
    head.add(headMesh);

    // Jaw/chin — subtle taper
    const jawGeo = new SphereGeometry(0.07, 10, 8);
    const jaw = new Mesh(jawGeo, skinMat());
    jaw.scale.set(0.85, 0.5, 0.7);
    jaw.position.set(0, 0.03, 0.06);
    jaw.castShadow = true;
    head.add(jaw);

    // ── EYES ──────────────────────────────────────────────────
    const eyeY = 0.13;
    const eyeZ = 0.085;
    for (let ex = -0.033; ex <= 0.033; ex += 0.066) {
      // Eye white (almond shape via scaled sphere)
      const whiteGeo = new SphereGeometry(0.018, 8, 6);
      const white = new Mesh(whiteGeo, eyeWhiteMat());
      white.scale.set(0.7, 0.85, 0.5);
      white.position.set(ex, eyeY, eyeZ);
      head.add(white);

      // Iris
      const irisGeo = new SphereGeometry(0.01, 6, 4);
      const iris = new Mesh(irisGeo, irisMat());
      iris.position.set(ex, eyeY, eyeZ + 0.006);
      head.add(iris);

      // Pupil
      const pupilGeo = new SphereGeometry(0.005, 4, 3);
      const pupil = new Mesh(pupilGeo, pupilMat());
      pupil.position.set(ex, eyeY, eyeZ + 0.009);
      head.add(pupil);

      // Eye specular highlight
      const hlGeo = new SphereGeometry(0.002, 3, 2);
      const hlMat = new MeshBasicMaterial({ color: new Color("#FFFFFF") });
      const hl = new Mesh(hlGeo, hlMat);
      hl.position.set(ex + 0.003, eyeY + 0.003, eyeZ + 0.01);
      head.add(hl);
    }

    // ── EYEBROWS ──────────────────────────────────────────────
    for (let bx = -0.033; bx <= 0.033; bx += 0.066) {
      const browGeo = new BoxGeometry(0.03, 0.006, 0.006);
      const brow = new Mesh(browGeo, mat("#3E2723", { roughness: 0.6 }));
      brow.position.set(bx, eyeY + 0.02, eyeZ + 0.01);
      head.add(brow);
    }

    // ── NOSE ──────────────────────────────────────────────────
    const noseGeo = new SphereGeometry(0.012, 6, 5);
    const nose = new Mesh(noseGeo, mat(skinHex, { roughness: 0.5 }));
    nose.scale.set(0.7, 0.8, 0.6);
    nose.position.set(0, 0.10, 0.095);
    head.add(nose);

    // ── MOUTH ─────────────────────────────────────────────────
    const mouthGeo = new BoxGeometry(0.04, 0.01, 0.005);
    const mouth = new Mesh(mouthGeo, mouthMat());
    mouth.position.set(0, 0.065, 0.095);
    head.add(mouth);

    // ── EARS ──────────────────────────────────────────────────
    for (const ex of [-1, 1]) {
      const earGeo = new SphereGeometry(0.02, 6, 5);
      const ear = new Mesh(earGeo, skinMat());
      ear.scale.set(0.4, 0.7, 0.5);
      ear.position.set(ex * 0.095, 0.11, 0);
      ear.castShadow = true;
      head.add(ear);
    }

    // ── HAIR (simple cap style) ───────────────────────────────
    const hairGeo = new SphereGeometry(0.105, 12, 10);
    const hair = new Mesh(hairGeo, hairMat());
    hair.scale.set(1.02, 0.55, 0.95);
    hair.position.set(0, 0.16, -0.01);
    hair.castShadow = true;
    head.add(hair);

    // Hair side tufts
    for (const side of [-1, 1]) {
      const tuft = new Mesh(
        new SphereGeometry(0.04, 6, 5),
        hairMat()
      );
      tuft.scale.set(0.7, 0.5, 0.5);
      tuft.position.set(side * 0.085, 0.14, 0.01);
      head.add(tuft);
    }

    return head;
  }

  // ─── TORSO ──────────────────────────────────────────────────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  // Main torso — wider at top, narrower at waist
  const torsoGeo = new CylinderGeometry(shoulderW * 0.38, hipW * 0.45, torsoH, 10);
  addMesh(torsoGroup, torsoGeo, shirtMat, new Vector3(0, torsoH * 0.58, 0));

  // Upper chest (slightly wider for a natural taper)
  const chestGeo = new CylinderGeometry(shoulderW * 0.42, shoulderW * 0.4, 0.1, 10);
  addMesh(torsoGroup, chestGeo, shirtMat, new Vector3(0, torsoH * 0.65, 0));

  // ─── NECK ──────────────────────────────────────────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, torsoH * 0.58 + 0.05, 0);
  addMesh(neckGroup, new CylinderGeometry(0.04, 0.05, 0.1, 8), skinMat, new Vector3(0, 0, 0));

  // Head
  const headGroup = createHead();
  headGroup.position.y = 0.05;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS ─────────────────────────────────────────────
  const shoulderY = torsoH * 0.6;
  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-shoulderW * 0.45, shoulderY, 0);
  const leftArm = createUpperArm();
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(shoulderW * 0.45, shoulderY, 0);
  const rightArm = createUpperArm();
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ──────────────────────────────────────────────────
  const PELVIS_Y = 0.0;
  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-hipW * 0.45, PELVIS_Y, 0);
  const leftLeg = createUpperLeg();
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(hipW * 0.45, PELVIS_Y, 0);
  const rightLeg = createUpperLeg();
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // ─── SHADOW DISC ───────────────────────────────────────────
  const shadowGeo = new CircleGeometry(0.18, 16);
  const shadowDiscMat = new MeshBasicMaterial();
  shadowDiscMat.color = new Color("#000000");
  shadowDiscMat.transparent = true; shadowDiscMat.opacity = 0.22; shadowDiscMat.depthWrite = false;
  const shadowDisc = new Mesh(shadowGeo, shadowDiscMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.88;
  shadowDisc.name = "shadow";
  torsoGroup.add(shadowDisc);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — simplified LOD version of the modern avatar
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH] = body;

  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0 };

  const skinMat = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.5 });
  const bodyMat = () => new MeshStandardMaterial({ color: new Color("#1565C0"), roughness: 0.35, metalness: 0.2 });
  const pantsMat = () => new MeshStandardMaterial({ color: new Color("#1B5E20"), roughness: 0.35, metalness: 0.05 });
  const eyeMat = () => new MeshStandardMaterial({ color: new Color("#111111"), roughness: 0.1 });
  const accentMat = () => new MeshBasicMaterial({ color: new Color("#42A5F5"), depthWrite: false });

  // Torso
  const torso = new Mesh(new CylinderGeometry(shoulderW * 0.38, hipW * 0.45, torsoH, 8), bodyMat());
  torso.position.y = 0.55; torso.castShadow = true;
  group.add(torso);

  // Head with face
  const headGroup = new Group();
  headGroup.position.y = 0.85;

  // Head sphere
  const headMesh = new Mesh(new SphereGeometry(0.09, 10, 8), skinMat());
  headMesh.scale.set(1, 1.05, 0.93);
  headMesh.position.y = 0.09;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Simple eyes
  for (let ex = -0.028; ex <= 0.028; ex += 0.056) {
    const eye = new Mesh(new SphereGeometry(0.012, 4, 3), eyeMat());
    eye.position.set(ex, 0.10, 0.075);
    headGroup.add(eye);
  }

  // Simple mouth
  const mouth = new Mesh(
    new BoxGeometry(0.03, 0.008, 0.004),
    new MeshStandardMaterial({ color: new Color("#C4957A"), roughness: 0.4 })
  );
  mouth.position.set(0, 0.055, 0.082);
  headGroup.add(mouth);

  // Hair
  const hair = new Mesh(new SphereGeometry(0.092, 8, 7), new MeshStandardMaterial({ color: new Color("#3E2723"), roughness: 0.55 }));
  hair.scale.set(1.02, 0.5, 0.95);
  hair.position.set(0, 0.135, -0.01);
  hair.castShadow = true;
  headGroup.add(hair);

  group.add(headGroup);

  // Neck ring
  const ring = new Mesh(new TorusGeometry(0.085, 0.014, 8, 12), accentMat());
  ring.position.y = 0.78; ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Legs
  const legGeo = new CylinderGeometry(0.04, 0.05, 0.35, 6);
  for (const side of [-1, 1]) {
    const leg = new Mesh(legGeo, pantsMat());
    leg.position.set(side * 0.07, 0.18, 0);
    leg.castShadow = true;
    leg.name = side > 0 ? "rightLeg" : "leftLeg";
    group.add(leg);
  }

  // ── Username sprite ──────────────────────────────────────────
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
  nameSprite.position.y = 1.05; nameSprite.renderOrder = 999;
  group.add(nameSprite);

  scene.add(group);
  return group;
}