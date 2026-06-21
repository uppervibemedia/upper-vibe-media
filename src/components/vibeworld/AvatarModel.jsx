/**
 * AvatarModel — Fully procedural stylized humanoid avatar.
 *
 * Joints are named exactly as CityCanvas expects so the animation
 * system drives them directly — no GLB / bone-mapping needed.
 *
 * Joint hierarchy (mirrors CityCanvas animation references):
 *   root
 *   ├── leftHip  → leg → lowerLeg → foot
 *   ├── rightHip → leg → lowerLeg → foot
 *   ├── torso
 *   │   ├── leftShoulder  → arm → forearm → hand
 *   │   └── rightShoulder → arm → forearm → hand
 *   └── headAnchor (face + hair)
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

// Outfit palettes: top / pants / shoe colors per style
const OUTFIT = {
  streetwear: {
    top:   0x1a2a5e,  // deep navy
    pants: 0x0d0d1a,  // near-black indigo
    shoes: 0x0a0a14,  // very dark
    neon:  0x00d4f0,  // cyan accent
  },
  cosmic: {
    top:   0x0d1038,  // dark armor blue
    pants: 0x08080e,  // near-black
    shoes: 0x060608,
    neon:  0xa040ff,  // purple accent
  },
};

// ─── MATERIAL HELPERS ────────────────────────────────────────────────────────
function stdMat(hex, rough = 0.6, metal = 0.05) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: rough,
    metalness: metal,
  });
}

function basicMat(hex) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
}

function glowMat(hex, opacity = 0.75) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(hex),
    transparent: true,
    opacity,
    depthWrite: false,
  });
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
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: false,
  }));
  sprite.scale.set(1.4, 0.34, 1);
  sprite.renderOrder = 999;
  return sprite;
}

// ─── SHADOW BLOB ─────────────────────────────────────────────────────────────
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
  const faceGroup = new THREE.Group();
  faceGroup.name = "face";

  const skin = basicMat(skinHex);
  const eyeWhite = basicMat(0xf0f0f0);
  const iris = basicMat(avatarType === "feminine" ? 0x5577ee : 0x336688);
  const pupil = basicMat(0x0a0a0a);
  const brow = basicMat(0x1a0e08);
  const lipColor = new THREE.Color(skinHex).multiplyScalar(0.72);
  const lip = new THREE.MeshBasicMaterial({ color: lipColor });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), skin);
  faceGroup.add(head);

  // Eye whites
  for (const sx of [0.044, -0.044]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyeWhite);
    w.position.set(sx, 0.016, 0.097);
    faceGroup.add(w);
    // Iris
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), iris);
    ir.position.set(sx, 0.016, 0.109);
    faceGroup.add(ir);
    // Pupil
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 4), pupil);
    pu.position.set(sx, 0.016, 0.116);
    faceGroup.add(pu);
    // Eyebrow
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.007, 0.005), brow);
    br.position.set(sx, 0.054, 0.100);
    br.rotation.z = sx > 0 ? -0.18 : 0.18;
    faceGroup.add(br);
  }

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 5), skin);
  nose.scale.set(1, 0.7, 1.3);
  nose.position.set(0, -0.010, 0.114);
  faceGroup.add(nose);

  // Lips
  const uLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.022, 4, 6), lip);
  uLip.rotation.z = Math.PI / 2;
  uLip.position.set(0, -0.042, 0.107);
  faceGroup.add(uLip);

  const lLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.028, 4, 6), lip);
  lLip.rotation.z = Math.PI / 2;
  lLip.position.set(0, -0.056, 0.105);
  faceGroup.add(lLip);

  // Ears
  for (const sx of [0.116, -0.116]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), skin);
    ear.scale.set(0.5, 0.8, 0.5);
    ear.position.set(sx, 0.004, 0);
    faceGroup.add(ear);
  }

  return faceGroup;
}

// ─── HAIR ────────────────────────────────────────────────────────────────────
function makeHair(hairHex, avatarType) {
  const g = new THREE.Group();
  g.name = "hair";
  const mat = stdMat(hairHex, 0.85, 0.0);

  // Top cap (all types)
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.126, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    mat
  );
  cap.position.set(0, 0.004, -0.004);
  g.add(cap);

  if (avatarType === "feminine") {
    // Side volume
    for (const sx of [0.112, -0.112]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat);
      side.scale.set(0.5, 1.4, 0.6);
      side.position.set(sx, -0.06, 0.01);
      g.add(side);
    }
    // Back length
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat);
    back.scale.set(0.75, 1.6, 0.7);
    back.position.set(0, -0.08, -0.07);
    g.add(back);
  } else if (avatarType === "masculine") {
    const front = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 5), mat);
    front.scale.set(1.1, 0.52, 0.68);
    front.position.set(0, 0.062, 0.084);
    g.add(front);
  } else {
    // Neutral — slight side volume
    for (const sx of [0.108, -0.108]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.068, 6, 5), mat);
      side.scale.set(0.45, 1.0, 0.55);
      side.position.set(sx, -0.022, 0.0);
      g.add(side);
    }
  }

  return g;
}

// ─── BUILD FULL AVATAR BODY ──────────────────────────────────────────────────
/**
 * Builds a fully-articulated humanoid avatar.
 * All joint Groups are named exactly as CityCanvas expects.
 * Default pose = arms at sides (not T-pose).
 */
function buildAvatarBody(opts = {}) {
  const { avatarType = "neutral", skinTone = "medium", avatarStyle = "streetwear" } = opts;
  const skinHex = SKIN_TONES[skinTone] || SKIN_TONES.medium;
  const hairHex = HAIR_COLORS[skinTone] || HAIR_COLORS.medium;
  const style = avatarStyle === "cosmic" ? "cosmic" : "streetwear";
  const pal = OUTFIT[style];

  const root = new THREE.Group();
  root.name = "avatar";

  const skinMat = basicMat(skinHex);
  const topMat  = stdMat(pal.top,   0.55, 0.1);
  const pantMat = stdMat(pal.pants, 0.65, 0.05);
  const shoeMat = stdMat(pal.shoes, 0.5,  0.3);
  const neonM   = glowMat(pal.neon, 0.8);

  // ── LEGS ─────────────────────────────────────────────────────────────────
  const legDefs = [
    { name: "leftHip",  sx:  0.095 },
    { name: "rightHip", sx: -0.095 },
  ];

  for (const { name, sx } of legDefs) {
    // Hip pivot
    const hipG = new THREE.Group();
    hipG.name = name;
    hipG.position.set(sx, 0.55, 0);

    // Thigh mesh
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 4, 8), pantMat);
    thigh.position.y = -0.16;
    thigh.castShadow = true;
    hipG.add(thigh);

    // Knee pivot
    const kneeG = new THREE.Group();
    kneeG.name = name.replace("Hip", "Knee");
    kneeG.position.y = -0.33;

    // Shin mesh
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.22, 4, 8), pantMat);
    shin.position.y = -0.14;
    shin.castShadow = true;
    kneeG.add(shin);

    // Ankle / foot pivot
    const footG = new THREE.Group();
    footG.name = name.replace("Hip", "Foot");
    footG.position.y = -0.28;

    // Shoe
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.20), shoeMat);
    shoe.position.set(0, -0.02, 0.02);
    shoe.castShadow = true;
    footG.add(shoe);

    // Shoe neon sole strip
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.012, 0.20), neonM);
    sole.position.set(0, -0.056, 0.02);
    footG.add(sole);

    kneeG.add(footG);
    kneeG.userData.foot = footG;

    hipG.add(kneeG);
    hipG.userData.leg = { userData: { lowerLeg: kneeG } };

    root.add(hipG);
  }

  // ── TORSO ────────────────────────────────────────────────────────────────
  const torsoG = new THREE.Group();
  torsoG.name = "torso";
  torsoG.position.y = 0.76;

  // Main torso mesh (shirt)
  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.34, 4, 10), topMat);
  torsoMesh.castShadow = true;
  torsoG.add(torsoMesh);

  // Neon chest stripe
  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.012), neonM);
  chestStripe.position.set(0, 0, 0.15);
  torsoG.add(chestStripe);

  // Neon shoulder pips
  for (const sx of [0.16, -0.16]) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), neonM);
    pip.position.set(sx, 0.1, 0.12);
    torsoG.add(pip);
  }

  // ── ARMS (parented to torso) ─────────────────────────────────────────────
  const armDefs = [
    { name: "leftShoulder",  sx:  0.185 },
    { name: "rightShoulder", sx: -0.185 },
  ];

  for (const { name, sx } of armDefs) {
    // Shoulder pivot
    const shG = new THREE.Group();
    shG.name = name;
    shG.position.set(sx, 0.15, 0);
    // DEFAULT IDLE POSE: arms hanging naturally at sides, not T-pose
    shG.rotation.x = -0.12;  // slight forward hang
    shG.rotation.z = sx > 0 ? 0.15 : -0.15; // slight outward splay

    // Upper arm (shirt sleeve)
    const uArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.20, 4, 6), topMat);
    uArm.position.y = -0.13;
    uArm.castShadow = true;
    shG.add(uArm);

    // Elbow pivot
    const elbG = new THREE.Group();
    elbG.name = name.replace("Shoulder", "Elbow");
    elbG.position.y = -0.26;

    // Forearm (skin)
    const fArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.18, 4, 6), skinMat);
    fArm.position.y = -0.12;
    fArm.castShadow = true;
    elbG.add(fArm);

    // Hand pivot
    const handG = new THREE.Group();
    handG.name = name.replace("Shoulder", "Hand");
    handG.position.y = -0.22;

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.040, 8, 6), skinMat);
    hand.castShadow = true;
    handG.add(hand);

    elbG.add(handG);
    elbG.userData.hand = handG;

    shG.add(elbG);
    shG.userData.arm = { userData: { forearm: elbG } };

    torsoG.add(shG);
  }

  root.add(torsoG);

  // ── NECK ─────────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.08, 4, 6), skinMat);
  neck.position.set(0, 1.12, 0);
  root.add(neck);

  // ── HEAD / FACE / HAIR ───────────────────────────────────────────────────
  const headAnchor = new THREE.Group();
  headAnchor.name = "headAnchor";
  headAnchor.position.set(0, 1.30, 0);

  headAnchor.add(makeFace(skinHex, avatarType));
  headAnchor.add(makeHair(hairHex, avatarType));

  root.add(headAnchor);

  return root;
}

// ─── PUBLIC: createAvatar (LOCAL PLAYER) ─────────────────────────────────────
export function createAvatar(scene, opts = {}) {
  const root = buildAvatarBody(opts);
  root.add(makeShadow());
  root.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(root);
  return root;
}

// ─── PUBLIC: createRemoteAvatar (OTHER PLAYERS) ──────────────────────────────
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle) {
  const root = buildAvatarBody({ avatarType, skinTone, avatarStyle });
  root.name = `remote_${userId}`;
  root.userData = { userId, walkTime: 0, speed: 0 };

  const nameSprite = makeNameSprite(username);
  nameSprite.position.y = 1.68;
  root.add(nameSprite);
  root.add(makeShadow());

  // Wire up joint references for the remote walk animation in CityCanvas
  // CityCanvas looks for these named children via getObjectByName
  // They're already named correctly by buildAvatarBody — nothing extra needed.

  scene.add(root);
  return root;
}