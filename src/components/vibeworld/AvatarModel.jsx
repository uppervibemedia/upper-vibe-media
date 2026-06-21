/**
 * AvatarModel — GLB-based Humanoid Avatar with Face/Hair/Outfit Overlays
 *
 * The GLB (Soldier.glb) provides the body shape, scale, rig, and animation.
 * We overlay face features, hairstyles, and outfit color accents on top.
 * Nothing about the body geometry, scale, rig, or movement is changed.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

// ─── GLB MODEL (provides body shape, rig, animations) ────────────────────────
const SOLDIER_GLB = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb";

const MODEL_URLS = {
  masculine:  SOLDIER_GLB,
  feminine:   SOLDIER_GLB,
  nonbinary:  SOLDIER_GLB,
  neutral:    SOLDIER_GLB,
};

// ─── OUTFIT ACCENT COLORS ─────────────────────────────────────────────────────
// streetwear = modern Upper Vibe look; cosmic = futuristic armor tint
const OUTFIT_COLORS = {
  streetwear: {
    masculine:  0x1a3a6e,  // deep navy hoodie
    feminine:   0x4a1060,  // deep purple jacket
    nonbinary:  0x0d4a3a,  // deep teal top
    neutral:    0x0d3050,  // dark cyan-blue
  },
  cosmic: {
    masculine:  0x0d1f4a,  // dark armor blue
    feminine:   0x2d0640,  // dark armor purple
    nonbinary:  0x0a2820,  // dark armor teal
    neutral:    0x071828,  // dark armor cyan
  },
};

// Neon accent line color per outfit/type
const ACCENT_COLORS = {
  streetwear: {
    masculine:  0x00b8d4,
    feminine:   0xe040fb,
    nonbinary:  0x00e5a0,
    neutral:    0x00e5ff,
  },
  cosmic: {
    masculine:  0x00cfff,
    feminine:   0xd060ff,
    nonbinary:  0x00ffcc,
    neutral:    0x40e0ff,
  },
};

const SKIN_TONES = {
  "light":        0xfde8c8,
  "medium-light": 0xf0c490,
  "medium":       0xc8864a,
  "medium-dark":  0x9a6038,
  "dark":         0x6b3a22,
  "deep":         0x3e2018,
};

// Hair color per skin tone (realistic range)
const HAIR_COLORS = {
  "light":        0xc8a060,  // dirty blonde
  "medium-light": 0x7a4820,  // medium brown
  "medium":       0x3a1e0a,  // dark brown
  "medium-dark":  0x1a0a04,  // very dark brown
  "dark":         0x100804,  // near black
  "deep":         0x080402,  // black
};

// Three.js Soldier.glb bone names
const BONE_MAP = {
  torso:          ["Spine", "mixamorigSpine", "spine", "Spine1", "spine01"],
  leftShoulder:   ["LeftArm", "mixamorigLeftArm", "Left_Arm", "leftArm"],
  rightShoulder:  ["RightArm", "mixamorigRightArm", "Right_Arm", "rightArm"],
  leftHip:        ["LeftUpLeg", "mixamorigLeftUpLeg", "Left_UpLeg", "leftUpLeg"],
  rightHip:       ["RightUpLeg", "mixamorigRightUpLeg", "Right_UpLeg", "rightUpLeg"],
  leftElbow:      ["LeftForeArm", "mixamorigLeftForeArm", "Left_ForeArm"],
  rightElbow:     ["RightForeArm", "mixamorigRightForeArm", "Right_ForeArm"],
  leftKnee:       ["LeftLeg", "mixamorigLeftLeg", "Left_Leg"],
  rightKnee:      ["RightLeg", "mixamorigRightLeg", "Right_Leg"],
  leftAnkle:      ["LeftFoot", "mixamorigLeftFoot", "Left_Foot"],
  rightAnkle:     ["RightFoot", "mixamorigRightFoot", "Right_Foot"],
};

function findBone(root, candidates) {
  let found = null;
  root.traverse((obj) => {
    if (found) return;
    for (const name of candidates) {
      if (obj.name === name || obj.name.toLowerCase() === name.toLowerCase()) {
        found = obj;
        return;
      }
    }
  });
  return found;
}

// ─── NAME LABEL SPRITE ────────────────────────────────────────────────────────
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

// ─── SHADOW BLOB ──────────────────────────────────────────────────────────────
function makeShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.20, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  return shadow;
}

// ─── FACE OVERLAY ─────────────────────────────────────────────────────────────
// Attaches a visible face (skin, eyes, brows, nose, mouth) onto the GLB head bone.
// The GLB soldier has a helmet mesh — we keep the body but add our face geometry
// ABOVE the neck area where the head should be exposed.
function makeFaceGroup(skinHex, avatarType, avatarStyle) {
  const skin = new THREE.Color(skinHex);
  const faceGroup = new THREE.Group();
  faceGroup.name = "faceOverlay";

  // Unlit face mat so it's always visible regardless of lighting
  const faceMat = new THREE.MeshBasicMaterial({ color: skin });
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
  const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeIrisMat = new THREE.MeshBasicMaterial({ color: avatarType === "feminine" ? 0x5566cc : 0x336688 });
  const browMat = new THREE.MeshBasicMaterial({ color: 0x1a0e08 });
  const lipMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(skinHex).multiplyScalar(0.75) });

  // ── Head sphere (skin tone) ──
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 16, 12),
    faceMat,
  );
  headMesh.position.set(0, 0, 0);
  faceGroup.add(headMesh);

  // ── Eyes ──
  // Eye socket (white)
  const eyeWhiteGeo = new THREE.SphereGeometry(0.028, 8, 6);
  const lEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  const rEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  lEyeWhite.position.set(0.042, 0.018, 0.096);
  rEyeWhite.position.set(-0.042, 0.018, 0.096);
  faceGroup.add(lEyeWhite, rEyeWhite);

  // Iris
  const irisGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const lIris = new THREE.Mesh(irisGeo, eyeIrisMat);
  const rIris = new THREE.Mesh(irisGeo, eyeIrisMat);
  lIris.position.set(0.042, 0.018, 0.108);
  rIris.position.set(-0.042, 0.018, 0.108);
  faceGroup.add(lIris, rIris);

  // Pupil
  const pupilGeo = new THREE.SphereGeometry(0.011, 6, 4);
  const lPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
  const rPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
  lPupil.position.set(0.042, 0.018, 0.116);
  rPupil.position.set(-0.042, 0.018, 0.116);
  faceGroup.add(lPupil, rPupil);

  // ── Eyebrows ──
  const browGeo = new THREE.BoxGeometry(0.038, 0.007, 0.006);
  const lBrow = new THREE.Mesh(browGeo, browMat);
  const rBrow = new THREE.Mesh(browGeo, browMat);
  // Slight inward angle
  lBrow.position.set(0.042, 0.052, 0.098);
  rBrow.position.set(-0.042, 0.052, 0.098);
  lBrow.rotation.z = -0.15;
  rBrow.rotation.z = 0.15;
  faceGroup.add(lBrow, rBrow);

  // ── Nose ──
  const noseGeo = new THREE.SphereGeometry(0.014, 6, 4);
  const noseMesh = new THREE.Mesh(noseGeo, faceMat);
  noseMesh.scale.set(1, 0.7, 1.2);
  noseMesh.position.set(0, -0.01, 0.112);
  faceGroup.add(noseMesh);

  // ── Mouth / lips ──
  // Upper lip
  const upperLipGeo = new THREE.CapsuleGeometry(0.022, 0.024, 4, 6);
  const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
  upperLip.rotation.z = Math.PI / 2;
  upperLip.position.set(0, -0.042, 0.105);
  faceGroup.add(upperLip);

  // Lower lip (slightly larger)
  const lowerLipGeo = new THREE.CapsuleGeometry(0.018, 0.030, 4, 6);
  const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
  lowerLip.rotation.z = Math.PI / 2;
  lowerLip.position.set(0, -0.056, 0.103);
  faceGroup.add(lowerLip);

  // ── Ear stubs ──
  const earGeo = new THREE.SphereGeometry(0.022, 6, 4);
  const earMat = new THREE.MeshBasicMaterial({ color: skin });
  const lEar = new THREE.Mesh(earGeo, earMat);
  const rEar = new THREE.Mesh(earGeo, earMat);
  lEar.scale.set(0.5, 0.8, 0.5);
  rEar.scale.set(0.5, 0.8, 0.5);
  lEar.position.set(0.114, 0.005, 0);
  rEar.position.set(-0.114, 0.005, 0);
  faceGroup.add(lEar, rEar);

  return faceGroup;
}

// ─── HAIR OVERLAY ─────────────────────────────────────────────────────────────
function makeHairGroup(hairColor, avatarType) {
  const hairGroup = new THREE.Group();
  hairGroup.name = "hairOverlay";
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairColor),
    roughness: 0.85,
    metalness: 0.0,
  });

  if (avatarType === "feminine") {
    // Shoulder-length layered hair
    // Top cap
    const topGeo = new THREE.SphereGeometry(0.122, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const topMesh = new THREE.Mesh(topGeo, mat);
    topMesh.position.set(0, 0.005, -0.005);
    hairGroup.add(topMesh);

    // Side volume — left
    const sideGeoL = new THREE.SphereGeometry(0.09, 8, 6);
    const sideMeshL = new THREE.Mesh(sideGeoL, mat);
    sideMeshL.scale.set(0.5, 1.4, 0.6);
    sideMeshL.position.set(0.112, -0.06, 0.01);
    hairGroup.add(sideMeshL);

    // Side volume — right
    const sideMeshR = sideMeshL.clone();
    sideMeshR.position.set(-0.112, -0.06, 0.01);
    hairGroup.add(sideMeshR);

    // Back length
    const backGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const backMesh = new THREE.Mesh(backGeo, mat);
    backMesh.scale.set(0.75, 1.6, 0.7);
    backMesh.position.set(0, -0.08, -0.07);
    hairGroup.add(backMesh);

  } else if (avatarType === "masculine") {
    // Short textured fade / crop
    // Main cap (slightly flat on sides = fade look)
    const topGeo = new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const topMesh = new THREE.Mesh(topGeo, mat);
    topMesh.scale.set(0.92, 0.95, 0.92);
    topMesh.position.set(0, 0.01, -0.004);
    hairGroup.add(topMesh);

    // Front texture bump
    const frontGeo = new THREE.SphereGeometry(0.065, 8, 5);
    const frontMesh = new THREE.Mesh(frontGeo, mat);
    frontMesh.scale.set(1.1, 0.55, 0.7);
    frontMesh.position.set(0, 0.06, 0.082);
    hairGroup.add(frontMesh);

  } else {
    // nonbinary / neutral — medium textured style
    const topGeo = new THREE.SphereGeometry(0.122, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const topMesh = new THREE.Mesh(topGeo, mat);
    topMesh.position.set(0, 0.004, -0.004);
    hairGroup.add(topMesh);

    // Slight side volume
    const sideGeoL = new THREE.SphereGeometry(0.07, 6, 5);
    const sideMeshL = new THREE.Mesh(sideGeoL, mat);
    sideMeshL.scale.set(0.45, 1.0, 0.55);
    sideMeshL.position.set(0.106, -0.02, 0.0);
    hairGroup.add(sideMeshL);

    const sideMeshR = sideMeshL.clone();
    sideMeshR.position.set(-0.106, -0.02, 0.0);
    hairGroup.add(sideMeshR);
  }

  return hairGroup;
}

// ─── OUTFIT ACCENT STRIP ──────────────────────────────────────────────────────
// Adds a thin neon strip along the chest of the GLB to signal outfit style.
// Kept very minimal so it doesn't clash with the GLB body mesh.
function makeOutfitAccents(accentColor, avatarStyle) {
  const group = new THREE.Group();
  group.name = "outfitAccents";

  const accentMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentColor),
    transparent: true,
    opacity: avatarStyle === "cosmic" ? 0.85 : 0.65,
  });

  // Chest stripe
  const stripeGeo = new THREE.BoxGeometry(0.018, 0.28, 0.012);
  const stripe = new THREE.Mesh(stripeGeo, accentMat);
  stripe.position.set(0, 0, 0.18); // in front of chest
  group.add(stripe);

  // Shoulder pip — left
  const pipGeo = new THREE.SphereGeometry(0.018, 6, 4);
  const lPip = new THREE.Mesh(pipGeo, accentMat);
  lPip.position.set(0.17, 0.12, 0.12);
  group.add(lPip);

  // Shoulder pip — right
  const rPip = lPip.clone();
  rPip.position.set(-0.17, 0.12, 0.12);
  group.add(rPip);

  return group;
}

// ─── APPLY STYLE OVERLAYS ONTO LOADED GLB ────────────────────────────────────
// Called after GLB loads. Adds face, hair, outfit accents ON TOP of the model.
// Does NOT modify the GLB geometry, scale, or rig.
function addStyleOverlays(wrapper, glbModel, opts = {}) {
  const { avatarType = "neutral", skinTone = "medium", avatarStyle = "streetwear" } = opts;
  const skinHex = SKIN_TONES[skinTone] || SKIN_TONES.medium;
  const hairHex = HAIR_COLORS[skinTone] || HAIR_COLORS.medium;
  const style = avatarStyle === "cosmic" ? "cosmic" : "streetwear";
  const accentColor = ACCENT_COLORS[style]?.[avatarType] || ACCENT_COLORS.streetwear.neutral;

  // ── Tint the GLB body to match outfit color ──
  const outfitColor = new THREE.Color(OUTFIT_COLORS[style]?.[avatarType] || 0x1a3a6e);
  glbModel.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    // Tint all body meshes with outfit color (keeps texture detail, adds color wash)
    if (child.material) {
      const mat = child.material.clone();
      mat.color = outfitColor;
      // For cosmic style, add a slight emissive glow
      if (style === "cosmic") {
        mat.emissive = new THREE.Color(accentColor);
        mat.emissiveIntensity = 0.08;
      }
      child.material = mat;
    }
  });

  // ── Find head bone to attach face/hair at correct world position ──
  // Soldier GLB head bone position is roughly at Y=1.7 in model space
  // Since model is offset by -0.9 in wrapper, head is at wrapper Y ≈ 0.82
  // We attach face/hair to a sub-group at the head position
  const headAnchor = new THREE.Group();
  headAnchor.name = "headAnchor";
  headAnchor.position.set(0, 0.85, 0); // approximate head center in wrapper coords

  // Face
  const faceGroup = makeFaceGroup(skinHex, avatarType, style);
  headAnchor.add(faceGroup);

  // Hair
  const hairGroup = makeHairGroup(hairHex, avatarType);
  headAnchor.add(hairGroup);

  wrapper.add(headAnchor);

  // ── Outfit accents (chest stripe, shoulder pips) ──
  const accents = makeOutfitAccents(accentColor, style);
  accents.position.set(0, 0.35, 0); // torso area
  wrapper.add(accents);
}

// ─── CAPSULE FALLBACK (used if GLB fails to load) ────────────────────────────
function createCapsuleFallback(scene, opts = {}) {
  const type = opts.avatarType || "neutral";
  const style = opts.avatarStyle || "streetwear";
  const skinHex = SKIN_TONES[opts.skinTone] || SKIN_TONES.medium;
  const hairHex = HAIR_COLORS[opts.skinTone] || HAIR_COLORS.medium;
  const outfitColor = OUTFIT_COLORS[style]?.[type] || 0x1a3a6e;
  const accentColor = ACCENT_COLORS[style]?.[type] || 0x00e5ff;

  const root = new THREE.Group();
  root.name = "avatar";

  const M = (hex, rough = 0.55, emissive = null, ei = 0) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough });
    if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei; }
    return m;
  };

  // Legs
  const lHipG = new THREE.Group(); lHipG.name = "leftHip"; lHipG.position.set(0.10, 0.55, 0);
  const rHipG = new THREE.Group(); rHipG.name = "rightHip"; rHipG.position.set(-0.10, 0.55, 0);
  const thighGeo = new THREE.CapsuleGeometry(0.07, 0.28, 4, 8);
  const pantMat = M(0x111122);
  const lThigh = new THREE.Mesh(thighGeo, pantMat); lThigh.position.y = -0.18;
  const rThigh = new THREE.Mesh(thighGeo, pantMat); rThigh.position.y = -0.18;
  lHipG.add(lThigh); rHipG.add(rThigh);
  const lKneeG = new THREE.Group(); lKneeG.name = "leftKnee"; lKneeG.position.y = -0.36;
  const rKneeG = new THREE.Group(); rKneeG.name = "rightKnee"; rKneeG.position.y = -0.36;
  lHipG.add(lKneeG); rHipG.add(rKneeG);
  const shinGeo = new THREE.CapsuleGeometry(0.055, 0.24, 4, 8);
  lKneeG.add(new THREE.Mesh(shinGeo, pantMat)); rKneeG.add(new THREE.Mesh(shinGeo, pantMat));
  const lFootG = new THREE.Group(); lFootG.name = "leftFoot"; lFootG.position.y = -0.30;
  const rFootG = new THREE.Group(); rFootG.name = "rightFoot"; rFootG.position.y = -0.30;
  lKneeG.add(lFootG); rKneeG.add(rFootG);
  const shoeGeo = new THREE.BoxGeometry(0.10, 0.06, 0.20);
  const shoeMat = M(0x111118);
  lFootG.add(new THREE.Mesh(shoeGeo, shoeMat));
  rFootG.add(new THREE.Mesh(shoeGeo, shoeMat));
  lKneeG.userData.foot = lFootG; rKneeG.userData.foot = rFootG;
  lHipG.userData.leg = { userData: { lowerLeg: lKneeG } };
  rHipG.userData.leg = { userData: { lowerLeg: rKneeG } };
  root.add(lHipG, rHipG);

  // Torso
  const torsoG = new THREE.Group(); torsoG.name = "torso"; torsoG.position.y = 0.78;
  torsoG.add(new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.36, 4, 8),
    M(outfitColor, 0.6, accentColor, 0.15),
  ));
  root.add(torsoG);

  // Arms
  const lShG = new THREE.Group(); lShG.name = "leftShoulder"; lShG.position.set(0.18, 0.92, 0);
  const rShG = new THREE.Group(); rShG.name = "rightShoulder"; rShG.position.set(-0.18, 0.92, 0);
  const upperArmGeo = new THREE.CapsuleGeometry(0.045, 0.22, 4, 6);
  const shirtMat = M(outfitColor);
  const skinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(skinHex) });
  lShG.add(new THREE.Mesh(upperArmGeo, shirtMat));
  rShG.add(new THREE.Mesh(upperArmGeo, shirtMat));
  const lElbG = new THREE.Group(); lElbG.name = "leftElbow"; lElbG.position.y = -0.26;
  const rElbG = new THREE.Group(); rElbG.name = "rightElbow"; rElbG.position.y = -0.26;
  lShG.add(lElbG); rShG.add(rElbG);
  const foreArmGeo = new THREE.CapsuleGeometry(0.038, 0.20, 4, 6);
  lElbG.add(new THREE.Mesh(foreArmGeo, skinMat));
  rElbG.add(new THREE.Mesh(foreArmGeo, skinMat));
  const handGeo = new THREE.SphereGeometry(0.038, 6, 4);
  const lHandG = new THREE.Group(); lHandG.name = "leftHand"; lHandG.position.y = -0.24;
  const rHandG = new THREE.Group(); rHandG.name = "rightHand"; rHandG.position.y = -0.24;
  lElbG.add(lHandG); rElbG.add(rHandG);
  lHandG.add(new THREE.Mesh(handGeo, skinMat));
  rHandG.add(new THREE.Mesh(handGeo, skinMat));
  lShG.userData.arm = { userData: { forearm: lElbG } };
  rShG.userData.arm = { userData: { forearm: rElbG } };
  lElbG.userData.hand = lHandG; rElbG.userData.hand = rHandG;
  root.add(lShG, rShG);

  // Neck
  root.add(new THREE.Mesh(
    new THREE.CapsuleGeometry(0.04, 0.08, 4, 6),
    skinMat,
  )).position?.set?.(0, 1.12, 0);

  // ── Face (head anchor at 1.30) ──
  const headAnchor = new THREE.Group();
  headAnchor.position.set(0, 1.30, 0);

  const faceG = makeFaceGroup(skinHex, type, style);
  headAnchor.add(faceG);

  const hairG = makeHairGroup(hairHex, type);
  headAnchor.add(hairG);

  root.add(headAnchor);
  root.add(makeShadow());

  root.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(root);
  return root;
}

// ─── APPLY GLB + OVERLAYS ─────────────────────────────────────────────────────
function applyModelToWrapper(wrapper, gltf, opts = {}) {
  const model = gltf.scene;
  model.scale.setScalar(1.0);
  model.position.set(0, -0.9, 0); // offset so feet touch ground (wrapper sits at SPAWN Y=0.9)

  wrapper.add(model);

  // Add face/hair/outfit overlays on top of the GLB
  addStyleOverlays(wrapper, model, opts);

  // ── Map bones for animation system ──
  const joints = {};
  for (const [ourName, candidates] of Object.entries(BONE_MAP)) {
    joints[ourName] = findBone(model, candidates);
  }

  const torsoProxy = joints.torso || new THREE.Group(); torsoProxy.name = "torso";
  const lShProxy = joints.leftShoulder || new THREE.Group(); lShProxy.name = "leftShoulder";
  const rShProxy = joints.rightShoulder || new THREE.Group(); rShProxy.name = "rightShoulder";
  const lHipProxy = joints.leftHip || new THREE.Group(); lHipProxy.name = "leftHip";
  const rHipProxy = joints.rightHip || new THREE.Group(); rHipProxy.name = "rightHip";

  const lKneeProxy = joints.leftKnee || new THREE.Group(); lKneeProxy.name = "leftKnee";
  const rKneeProxy = joints.rightKnee || new THREE.Group(); rKneeProxy.name = "rightKnee";
  const lAnkleProxy = joints.leftAnkle || new THREE.Group(); lAnkleProxy.name = "leftFoot";
  const rAnkleProxy = joints.rightAnkle || new THREE.Group(); rAnkleProxy.name = "rightFoot";

  lKneeProxy.userData.foot = lAnkleProxy;
  rKneeProxy.userData.foot = rAnkleProxy;
  lHipProxy.userData.leg = { userData: { lowerLeg: lKneeProxy } };
  rHipProxy.userData.leg = { userData: { lowerLeg: rKneeProxy } };

  const lElbProxy = joints.leftElbow || new THREE.Group(); lElbProxy.name = "leftElbow";
  const rElbProxy = joints.rightElbow || new THREE.Group(); rElbProxy.name = "rightElbow";
  lElbProxy.userData.hand = null; rElbProxy.userData.hand = null;
  lShProxy.userData.arm = { userData: { forearm: lElbProxy } };
  rShProxy.userData.arm = { userData: { forearm: rElbProxy } };

  wrapper.userData.joints = {
    torso: torsoProxy, leftShoulder: lShProxy, rightShoulder: rShProxy,
    leftHip: lHipProxy, rightHip: rHipProxy,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// createAvatar — LOCAL PLAYER
// ═══════════════════════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const type = opts.avatarType || "neutral";
  const url = MODEL_URLS[type] || MODEL_URLS.neutral;

  // Start with styled capsule fallback — visible immediately
  const wrapper = createCapsuleFallback(scene, opts);

  // Load GLB and swap in once ready
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      while (wrapper.children.length > 0) wrapper.remove(wrapper.children[0]);
      applyModelToWrapper(wrapper, gltf, opts);
      wrapper.add(makeShadow());
      console.log("[AvatarModel] GLB loaded with style overlays:", opts.avatarStyle);
    },
    undefined,
    (err) => {
      console.warn("[AvatarModel] GLB load failed, keeping styled fallback:", err);
    }
  );

  return wrapper;
}

// ═══════════════════════════════════════════════════════════════════════════════
// createRemoteAvatar — OTHER PLAYERS
// ═══════════════════════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle) {
  const type = avatarType || "neutral";
  const style = avatarStyle || "streetwear";
  const url = MODEL_URLS[type] || MODEL_URLS.neutral;

  const group = new THREE.Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, walkTime: 0, speed: 0 };

  // Build styled capsule placeholder while GLB loads
  const skinHex = SKIN_TONES[skinTone] || SKIN_TONES.medium;
  const hairHex = HAIR_COLORS[skinTone] || HAIR_COLORS.medium;
  const outfitColor = OUTFIT_COLORS[style]?.[type] || 0x1a3a6e;
  const accentColor = ACCENT_COLORS[style]?.[type] || 0x00e5ff;
  const M = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: r });

  // Body
  group.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.36, 4, 8), M(outfitColor)));
  const body = group.children[0]; body.position.y = 0.78; body.castShadow = true;

  // Legs
  [-1, 1].forEach((s) => {
    const side = s > 0 ? "right" : "left";
    const hPivot = new THREE.Group(); hPivot.name = side + "Hip"; hPivot.position.set(s * -0.10, 0.55, 0);
    hPivot.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.26, 4, 6), M(0x111122)));
    hPivot.children[0].position.y = -0.17;
    const kPivot = new THREE.Group(); kPivot.name = side + "Knee"; kPivot.position.y = -0.34;
    kPivot.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 6), M(0x111122)));
    kPivot.children[0].position.y = -0.15;
    const aPivot = new THREE.Group(); aPivot.name = side + "Foot"; aPivot.position.y = -0.28;
    kPivot.add(aPivot);
    kPivot.userData.foot = aPivot;
    hPivot.userData.leg = { userData: { lowerLeg: kPivot } };
    hPivot.add(kPivot);
    group.add(hPivot);
  });

  // Arms
  [-1, 1].forEach((s) => {
    const side = s > 0 ? "right" : "left";
    const shPivot = new THREE.Group(); shPivot.name = side + "Shoulder"; shPivot.position.set(s * -0.18, 0.92, 0);
    shPivot.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.20, 4, 6), M(outfitColor)));
    shPivot.children[0].position.y = -0.13;
    const ePivot = new THREE.Group(); ePivot.name = side + "Elbow"; ePivot.position.y = -0.24;
    ePivot.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.18, 4, 6), M(skinHex)));
    ePivot.children[0].position.y = -0.12;
    shPivot.userData.arm = { userData: { forearm: ePivot } };
    shPivot.add(ePivot);
    group.add(shPivot);
  });

  // Face anchor
  const headAnchor = new THREE.Group();
  headAnchor.position.set(0, 1.30, 0);
  headAnchor.add(makeFaceGroup(skinHex, type, style));
  headAnchor.add(makeHairGroup(hairHex, type));
  group.add(headAnchor);

  // Name label
  const nameSprite = makeNameSprite(username);
  nameSprite.position.y = 1.65;
  group.add(nameSprite);
  group.add(makeShadow());

  // Load GLB and replace
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      const toRemove = group.children.filter((c) => !(c instanceof THREE.Sprite));
      toRemove.forEach((c) => group.remove(c));
      applyModelToWrapper(group, gltf, { avatarType: type, skinTone, avatarStyle: style });
      group.add(nameSprite);
      group.add(makeShadow());
    },
    undefined,
    (err) => {
      console.warn("[AvatarModel] Remote GLB load failed, keeping styled fallback:", err);
    }
  );

  scene.add(group);
  return group;
}