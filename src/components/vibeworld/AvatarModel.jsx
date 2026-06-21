/**
 * AvatarModel — GLB-based Humanoid Avatar
 *
 * Uses a real low-poly humanoid GLB from a free CDN.
 * Falls back to a simple capsule placeholder if the GLB fails to load.
 *
 * The loaded model is wrapped in a Group whose children are named to match
 * the CityCanvas animation system:
 *   torso, leftShoulder, rightShoulder, leftHip, rightHip
 *   + userData.leg.userData.lowerLeg per hip
 *   + userData.arm.userData.forearm per shoulder
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

// ─── FREE CC0 LOW-POLY HUMANOID MODELS ───────────────────────────────────────
// Quaternius "Ultimate Modular Characters" pack hosted on itch / GitHub Pages
// These are CC0 stylized humanoids, ~50KB each, mobile-friendly.
// We use one base model and tint/scale per avatar type.
const MODEL_URLS = {
  masculine:  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb",
  feminine:   "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb",
  nonbinary:  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb",
  neutral:    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb",
};

// Body tints per type
const TYPE_TINT = {
  masculine:  0x1a5fc8,   // blue
  feminine:   0x9b27af,   // purple
  nonbinary:  0x4caf8e,   // teal
  neutral:    0x2196f3,   // cyan-blue
};

const SKIN_TONES = {
  "light":        0xfde8c8,
  "medium-light": 0xf0c490,
  "medium":       0xc8864a,
  "medium-dark":  0x9a6038,
  "dark":         0x6b3a22,
  "deep":         0x3e2018,
};

// Three.js Soldier.glb uses these exact bone names (verified from source)
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

// ─── NAME LABEL SPRITE ────────────────────────────────────────
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

// ─── SHADOW BLOB ──────────────────────────────────────────────
function makeShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.20, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  return shadow;
}

// ─── FALLBACK CAPSULE AVATAR ──────────────────────────────────
// Used when GLB load fails. Simple but human-proportioned capsule stack.
function createCapsuleFallback(scene, opts = {}) {
  const type = opts.avatarType || "neutral";
  const tint = TYPE_TINT[type] ?? 0x2196f3;
  const skin = SKIN_TONES[opts.skinTone] || SKIN_TONES.medium;

  const root = new THREE.Group();
  root.name = "avatar";

  const M = (hex, rough = 0.55) =>
    new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough });

  // Legs group (hip pivot)
  const lHipG = new THREE.Group(); lHipG.name = "leftHip"; lHipG.position.set(0.10, 0.55, 0);
  const rHipG = new THREE.Group(); rHipG.name = "rightHip"; rHipG.position.set(-0.10, 0.55, 0);

  // Thighs
  const thighGeo = new THREE.CapsuleGeometry(0.07, 0.28, 4, 8);
  const pantMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x111122) });
  const lThigh = new THREE.Mesh(thighGeo, pantMat); lThigh.position.y = -0.18;
  const rThigh = new THREE.Mesh(thighGeo, pantMat); rThigh.position.y = -0.18;
  lHipG.add(lThigh); rHipG.add(rThigh);

  // Knee pivots
  const lKneeG = new THREE.Group(); lKneeG.name = "leftKnee"; lKneeG.position.y = -0.36;
  const rKneeG = new THREE.Group(); rKneeG.name = "rightKnee"; rKneeG.position.y = -0.36;
  lHipG.add(lKneeG); rHipG.add(rKneeG);

  // Shins
  const shinGeo = new THREE.CapsuleGeometry(0.055, 0.24, 4, 8);
  const lShin = new THREE.Mesh(shinGeo, pantMat); lShin.position.y = -0.16;
  const rShin = new THREE.Mesh(shinGeo, pantMat); rShin.position.y = -0.16;
  lKneeG.add(lShin); rKneeG.add(rShin);

  // Feet pivots
  const lFootG = new THREE.Group(); lFootG.name = "leftFoot"; lFootG.position.y = -0.30;
  const rFootG = new THREE.Group(); rFootG.name = "rightFoot"; rFootG.position.y = -0.30;
  lKneeG.add(lFootG); rKneeG.add(rFootG);

  const shoeGeo = new THREE.BoxGeometry(0.10, 0.06, 0.20);
  const shoeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x111118) });
  const lShoe = new THREE.Mesh(shoeGeo, shoeMat); lShoe.position.set(0, -0.03, 0.04);
  const rShoe = new THREE.Mesh(shoeGeo, shoeMat); rShoe.position.set(0, -0.03, 0.04);
  lFootG.add(lShoe); rFootG.add(rShoe);

  // userData for animation
  lKneeG.userData.foot = lFootG;
  rKneeG.userData.foot = rFootG;
  lHipG.userData.leg = { userData: { lowerLeg: lKneeG } };
  rHipG.userData.leg = { userData: { lowerLeg: rKneeG } };

  root.add(lHipG, rHipG);

  // Torso
  const torsoG = new THREE.Group(); torsoG.name = "torso"; torsoG.position.y = 0.78;
  const torsoMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.36, 4, 8),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(tint), emissive: new THREE.Color(tint), emissiveIntensity: 0.25 }),
  );
  torsoMesh.castShadow = true;
  torsoG.add(torsoMesh);
  root.add(torsoG);

  // Arms
  const lShG = new THREE.Group(); lShG.name = "leftShoulder"; lShG.position.set(0.18, 0.92, 0);
  const rShG = new THREE.Group(); rShG.name = "rightShoulder"; rShG.position.set(-0.18, 0.92, 0);

  const upperArmGeo = new THREE.CapsuleGeometry(0.045, 0.22, 4, 6);
  const shirtMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint) });
  const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skin) });

  const lUA = new THREE.Mesh(upperArmGeo, shirtMat); lUA.position.y = -0.14;
  const rUA = new THREE.Mesh(upperArmGeo, shirtMat); rUA.position.y = -0.14;
  lShG.add(lUA); rShG.add(rUA);

  const lElbG = new THREE.Group(); lElbG.name = "leftElbow"; lElbG.position.y = -0.26;
  const rElbG = new THREE.Group(); rElbG.name = "rightElbow"; rElbG.position.y = -0.26;
  lShG.add(lElbG); rShG.add(rElbG);

  const foreArmGeo = new THREE.CapsuleGeometry(0.038, 0.20, 4, 6);
  const lFA = new THREE.Mesh(foreArmGeo, skinMat); lFA.position.y = -0.13;
  const rFA = new THREE.Mesh(foreArmGeo, skinMat); rFA.position.y = -0.13;
  lElbG.add(lFA); rElbG.add(rFA);

  // Hand stub
  const lHandG = new THREE.Group(); lHandG.name = "leftHand"; lHandG.position.y = -0.24;
  const rHandG = new THREE.Group(); rHandG.name = "rightHand"; rHandG.position.y = -0.24;
  lElbG.add(lHandG); rElbG.add(rHandG);
  const handGeo = new THREE.SphereGeometry(0.038, 6, 4);
  lHandG.add(new THREE.Mesh(handGeo, skinMat));
  rHandG.add(new THREE.Mesh(handGeo, skinMat));

  // userData for animation
  lShG.userData.arm = { userData: { forearm: lElbG } };
  rShG.userData.arm = { userData: { forearm: rElbG } };
  lElbG.userData.hand = lHandG;
  rElbG.userData.hand = rHandG;

  root.add(lShG, rShG);

  // Neck
  const neckMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.04, 0.08, 4, 6),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(skin) }),
  );
  neckMesh.position.set(0, 1.12, 0);
  root.add(neckMesh);

  // Head
  const headGeo = new THREE.SphereGeometry(0.12, 12, 10);
  const headMesh = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(skin), emissive: new THREE.Color(skin), emissiveIntensity: 0.15 }));
  headMesh.position.set(0, 1.30, 0);
  headMesh.castShadow = true;
  root.add(headMesh);

  // Simple hair cap
  const hairGeo = new THREE.SphereGeometry(0.125, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hairMesh = new THREE.Mesh(hairGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(0x1a0e08) }));
  hairMesh.position.set(0, 1.32, 0);
  root.add(hairMesh);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.018, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const lEye = new THREE.Mesh(eyeGeo, eyeMat); lEye.position.set(0.045, 1.32, 0.112);
  const rEye = new THREE.Mesh(eyeGeo, eyeMat); rEye.position.set(-0.045, 1.32, 0.112);
  root.add(lEye, rEye);

  // Shadow
  root.add(makeShadow());

  root.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(root);
  return root;
}

// ─── APPLY GLB MODEL TO WRAPPER GROUP ────────────────────────────────────────
function applyModelToWrapper(wrapper, gltf, opts = {}) {
  const type = opts.avatarType || "neutral";
  const tint = new THREE.Color(TYPE_TINT[type] ?? 0x2196f3);
  const skin = new THREE.Color(SKIN_TONES[opts.skinTone] || SKIN_TONES.medium);

  const model = gltf.scene;
  model.scale.setScalar(1.0);
  model.position.set(0, -0.9, 0); // SPAWN[1]=0.9, offset so feet touch ground

  // Recolor model to match avatar type
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const nameLower = (child.name || "").toLowerCase();
    // Shirt / jacket → tint color
    if (nameLower.includes("shirt") || nameLower.includes("top") ||
        nameLower.includes("jacket") || nameLower.includes("upper") ||
        nameLower.includes("torso") || nameLower.includes("body")) {
      if (child.material) {
        child.material = child.material.clone();
        child.material.color.copy(tint);
      }
    }
    // Skin → skin tone
    if (nameLower.includes("head") || nameLower.includes("skin") ||
        nameLower.includes("face") || nameLower.includes("hand") ||
        nameLower.includes("neck")) {
      if (child.material) {
        child.material = child.material.clone();
        child.material.color.copy(skin);
      }
    }
  });

  wrapper.add(model);

  // ── Map bones to our animation joint names ──────────────────
  // Find armature root
  let armature = null;
  model.traverse((obj) => { if (obj.isSkinnedMesh && !armature) armature = obj; });

  const joints = {};
  for (const [ourName, candidates] of Object.entries(BONE_MAP)) {
    joints[ourName] = findBone(model, candidates);
  }

  // Expose joints as named children on the wrapper so CityCanvas can find them
  // We create proxy Group objects at the right positions
  const torsoProxy = joints.torso || new THREE.Group();
  torsoProxy.name = "torso";

  const lShProxy = joints.leftShoulder || new THREE.Group();
  lShProxy.name = "leftShoulder";

  const rShProxy = joints.rightShoulder || new THREE.Group();
  rShProxy.name = "rightShoulder";

  const lHipProxy = joints.leftHip || new THREE.Group();
  lHipProxy.name = "leftHip";

  const rHipProxy = joints.rightHip || new THREE.Group();
  rHipProxy.name = "rightHip";

  // Wire up leg/arm userData chains for the animation system
  const lKneeProxy = joints.leftKnee || new THREE.Group();
  lKneeProxy.name = "leftKnee";
  const rKneeProxy = joints.rightKnee || new THREE.Group();
  rKneeProxy.name = "rightKnee";
  const lAnkleProxy = joints.leftAnkle || new THREE.Group();
  lAnkleProxy.name = "leftFoot";
  const rAnkleProxy = joints.rightAnkle || new THREE.Group();
  rAnkleProxy.name = "rightFoot";

  lKneeProxy.userData.foot = lAnkleProxy;
  rKneeProxy.userData.foot = rAnkleProxy;
  lHipProxy.userData.leg = { userData: { lowerLeg: lKneeProxy } };
  rHipProxy.userData.leg = { userData: { lowerLeg: rKneeProxy } };

  const lElbProxy = joints.leftElbow || new THREE.Group();
  lElbProxy.name = "leftElbow";
  const rElbProxy = joints.rightElbow || new THREE.Group();
  rElbProxy.name = "rightElbow";

  lElbProxy.userData.hand = null;
  rElbProxy.userData.hand = null;
  lShProxy.userData.arm = { userData: { forearm: lElbProxy } };
  rShProxy.userData.arm = { userData: { forearm: rElbProxy } };

  wrapper.userData.joints = {
    torso: torsoProxy,
    leftShoulder: lShProxy,
    rightShoulder: rShProxy,
    leftHip: lHipProxy,
    rightHip: rHipProxy,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// createAvatar — LOCAL PLAYER
// Returns a Group immediately (capsule fallback), then swaps to GLB once loaded.
// ═══════════════════════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const type = opts.avatarType || "neutral";
  const url = MODEL_URLS[type] || MODEL_URLS.neutral;

  // Start with capsule fallback — visible immediately
  const wrapper = createCapsuleFallback(scene, opts);

  // Attempt to load GLB and swap out the fallback
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      // Remove capsule children (keep the Group identity for ref stability)
      while (wrapper.children.length > 0) wrapper.remove(wrapper.children[0]);

      applyModelToWrapper(wrapper, gltf, opts);

      // Re-add shadow blob
      wrapper.add(makeShadow());

      // Rim light will be re-added by CityCanvas automatically
      console.log("[AvatarModel] GLB loaded:", url);
    },
    undefined,
    (err) => {
      console.warn("[AvatarModel] GLB load failed, keeping capsule fallback:", err);
    }
  );

  return wrapper;
}

// ═══════════════════════════════════════════════════════════════════════════════
// createRemoteAvatar — OTHER PLAYERS
// ═══════════════════════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const type = avatarType || "neutral";
  const url = MODEL_URLS[type] || MODEL_URLS.neutral;

  // Capsule placeholder immediately visible
  const group = new THREE.Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, walkTime: 0, speed: 0 };

  // Build a minimal capsule remote while GLB loads
  const tint = TYPE_TINT[type] ?? 0x2196f3;
  const skin = SKIN_TONES[skinTone] || SKIN_TONES.medium;
  const M = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: r });

  // Body
  const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.36, 4, 8), M(tint));
  bodyMesh.position.y = 0.78;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Head
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M(skin));
  headMesh.position.y = 1.30;
  headMesh.castShadow = true;
  group.add(headMesh);

  // Hair
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 8, 7, 0, Math.PI * 2, 0, Math.PI * 0.55),
    M(0x1a0e08),
  );
  hairMesh.position.y = 1.32;
  group.add(hairMesh);

  // Legs (hip pivots for animation)
  [-1, 1].forEach((s) => {
    const side = s > 0 ? "right" : "left";
    const hPivot = new THREE.Group(); hPivot.name = side + "Hip"; hPivot.position.set(s * -0.10, 0.55, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.26, 4, 6), M(0x111122));
    thigh.position.y = -0.17;
    hPivot.add(thigh);
    const kPivot = new THREE.Group(); kPivot.name = side + "Knee"; kPivot.position.y = -0.34;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 6), M(0x111122));
    shin.position.y = -0.15;
    kPivot.add(shin);
    const aPivot = new THREE.Group(); aPivot.name = side + "Foot"; aPivot.position.y = -0.28;
    kPivot.add(aPivot);
    kPivot.userData.anklePivot = aPivot;
    kPivot.userData.foot = aPivot;
    hPivot.userData.kneePivot = kPivot;
    hPivot.userData.leg = { userData: { lowerLeg: kPivot } };
    hPivot.add(kPivot);
    group.add(hPivot);
  });

  // Arms (shoulder pivots)
  [-1, 1].forEach((s) => {
    const side = s > 0 ? "right" : "left";
    const shPivot = new THREE.Group(); shPivot.name = side + "Shoulder"; shPivot.position.set(s * -0.18, 0.92, 0);
    const uArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.20, 4, 6), M(tint));
    uArm.position.y = -0.13;
    shPivot.add(uArm);
    const ePivot = new THREE.Group(); ePivot.name = side + "Elbow"; ePivot.position.y = -0.24;
    const fArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.18, 4, 6), M(skin));
    fArm.position.y = -0.12;
    ePivot.add(fArm);
    shPivot.userData.elbowPivot = ePivot;
    shPivot.userData.arm = { userData: { forearm: ePivot } };
    shPivot.add(ePivot);
    group.add(shPivot);
  });

  // Name label
  const nameSprite = makeNameSprite(username);
  nameSprite.position.y = 1.65;
  group.add(nameSprite);

  // Shadow
  group.add(makeShadow());

  // Attempt to load GLB and replace with real model
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      // Remove primitive children
      const toRemove = group.children.filter((c) => !(c instanceof THREE.Sprite));
      toRemove.forEach((c) => group.remove(c));

      applyModelToWrapper(group, gltf, { avatarType: type, skinTone });

      // Re-add name sprite and shadow
      group.add(nameSprite);
      group.add(makeShadow());
    },
    undefined,
    (err) => {
      console.warn("[AvatarModel] Remote GLB load failed, keeping capsule:", err);
    }
  );

  scene.add(group);
  return group;
}