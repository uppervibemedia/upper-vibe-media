/**
 * AvatarModelTest — Test male and female procedural avatars for Upper Vibe City.
 *
 * RULES:
 * - Does NOT touch or replace AvatarModel.jsx (current avatar stays untouched).
 * - These are test-only options selectable via AvatarCustomizerPanel.
 * - Uses Three.js geometry only — no external GLB, zero load time, mobile-safe.
 * - Full idle/walk/run animation via procedural bone-style group animation.
 * - Kept separate so the current avatar can always be restored.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

// ─── RobotExpressive GLB — has Idle, Walk, Run animations ────
const ROBOT_URL = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";
const _robotLoader = new GLTFLoader();
let _robotCache = null;
let _robotPromise = null;

function loadRobotGLB() {
  if (_robotCache) return Promise.resolve(_robotCache);
  if (_robotPromise) return _robotPromise;
  _robotPromise = new Promise((resolve, reject) => {
    _robotLoader.load(ROBOT_URL, (g) => { _robotCache = g; resolve(g); }, undefined, reject);
  });
  return _robotPromise;
}

export function createRobotAvatar(scene, opts = {}, onReady) {
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  controller.add(shadow);
  scene.add(controller);

  const entry = { root: controller, mixer: null, clips: {}, currentAnim: "idle", _isTestAvatar: true, _testGender: "robot" };

  loadRobotGLB()
    .then((gltf) => {
      const model = gltf.scene.clone(true);
      model.name = "avatarModel";
      model.position.set(0, 0, 0);
      model.rotation.set(0, Math.PI, 0);
      model.scale.set(1, 1, 1);
      model.traverse((child) => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      controller.add(model);

      const mixer = new THREE.AnimationMixer(model);
      const clips = {};
      gltf.animations.forEach((clip) => {
        const key = clip.name.toLowerCase();
        clips[key] = mixer.clipAction(clip);
        clips[key].setLoop(THREE.LoopRepeat, Infinity);
      });

      // RobotExpressive clip names: "Idle", "Walking", "Running"
      // Normalize to idle/walk/run keys
      if (clips["walking"] && !clips["walk"]) clips["walk"] = clips["walking"];
      if (clips["running"] && !clips["run"]) clips["run"] = clips["running"];

      const startKey = clips["idle"] ? "idle" : Object.keys(clips)[0];
      if (startKey && clips[startKey]) {
        clips[startKey].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      }
      entry.mixer = mixer;
      entry.clips = clips;
      entry.currentAnim = startKey || "idle";
      onReady?.(entry);
    })
    .catch((err) => {
      console.error("[RobotAvatar] GLB load failed:", err);
      const cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.26, 1.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x44aadd })
      );
      cap.name = "avatarModel"; cap.position.y = 0.82;
      controller.add(cap);
      onReady?.(entry);
    });

  return entry;
}

// ─── Palette ──────────────────────────────────────────────────
const MALE_COLORS = {
  skin:    0xC68642,
  hair:    0x1A1A2E,
  suit:    0x0D1B2A,
  accent:  0x00D4F0,
  boot:    0x0A0F1A,
  glow:    0x00E5FF,
};

const FEMALE_COLORS = {
  skin:    0xC9956C,
  hair:    0x1C0A2E,
  suit:    0x1A0D2E,
  accent:  0xC43BFF,
  boot:    0x0A0514,
  glow:    0xE040FB,
};

// ─── Build male avatar geometry ──────────────────────────────
function buildMale(colors) {
  const root = new THREE.Group();
  root.name = "avatarModel";

  // Shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  root.add(shadow);

  const mat = (hex, opts = {}) => new THREE.MeshStandardMaterial({
    color: hex,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.08,
    ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.emissiveIntensity ?? 0.4 } : {}),
  });

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.085, 0.42, 4, 8);
  const legL = new THREE.Mesh(legGeo, mat(colors.suit));
  legL.name = "legL";
  legL.position.set(0.105, 0.35, 0);
  legL.castShadow = true;
  root.add(legL);

  const legR = legL.clone();
  legR.name = "legR";
  legR.position.set(-0.105, 0.35, 0);
  root.add(legR);

  // Boots
  const bootGeo = new THREE.BoxGeometry(0.115, 0.11, 0.175);
  const bootL = new THREE.Mesh(bootGeo, mat(colors.boot));
  bootL.name = "bootL";
  bootL.position.set(0.105, 0.085, 0.012);
  bootL.castShadow = true;
  root.add(bootL);

  const bootR = bootL.clone();
  bootR.name = "bootR";
  bootR.position.set(-0.105, 0.085, 0.012);
  root.add(bootR);

  // Boot glow stripe
  const bootGlowMat = new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0.7, depthWrite: false });
  for (const bx of [0.105, -0.105]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.018, 0.018), bootGlowMat);
    stripe.position.set(bx, 0.115, 0.088);
    root.add(stripe);
  }

  // Torso (slightly tapered — wider shoulders)
  const torsoGroup = new THREE.Group();
  torsoGroup.name = "torso";
  torsoGroup.position.set(0, 0.83, 0);
  root.add(torsoGroup);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.46, 0.22),
    mat(colors.suit, { roughness: 0.35, metalness: 0.25 })
  );
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Chest accent lines
  const accentMat = new THREE.MeshBasicMaterial({ color: colors.accent, transparent: true, opacity: 0.8, depthWrite: false });
  const chestLine = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.012, 0.012), accentMat);
  chestLine.position.set(0, 0.10, 0.112);
  torsoGroup.add(chestLine);

  const chestV = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.32, 0.012), accentMat);
  chestV.position.set(0, 0.0, 0.112);
  torsoGroup.add(chestV);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.065, 0.38, 4, 8);
  const armL = new THREE.Group();
  armL.name = "armL";
  armL.position.set(0.225, 0.12, 0);
  torsoGroup.add(armL);
  const armLMesh = new THREE.Mesh(armGeo, mat(colors.suit));
  armLMesh.rotation.z = 0.12;
  armLMesh.castShadow = true;
  armL.add(armLMesh);

  const armR = new THREE.Group();
  armR.name = "armR";
  armR.position.set(-0.225, 0.12, 0);
  torsoGroup.add(armR);
  const armRMesh = new THREE.Mesh(armGeo, mat(colors.suit));
  armRMesh.rotation.z = -0.12;
  armRMesh.castShadow = true;
  armR.add(armRMesh);

  // Gloves
  const gloveGeo = new THREE.SphereGeometry(0.072, 8, 6);
  const gloveL = new THREE.Mesh(gloveGeo, mat(colors.accent, { metalness: 0.4 }));
  gloveL.name = "gloveL";
  gloveL.position.set(0.28, -0.24, 0);
  armL.add(gloveL);
  const gloveR = gloveL.clone();
  gloveR.name = "gloveR";
  armR.add(gloveR);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.085, 0.12, 8),
    mat(colors.skin)
  );
  neck.position.set(0, 0.3, 0);
  neck.castShadow = true;
  torsoGroup.add(neck);

  // Head group
  const headGroup = new THREE.Group();
  headGroup.name = "head";
  headGroup.position.set(0, 0.44, 0);
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 12, 10),
    mat(colors.skin)
  );
  head.castShadow = true;
  headGroup.add(head);

  // Hair
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.160, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mat(colors.hair, { roughness: 0.8, metalness: 0.0 })
  );
  hair.position.y = 0.02;
  headGroup.add(hair);

  // Eyes (glow)
  const eyeGeo = new THREE.SphereGeometry(0.022, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: colors.accent });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.055, 0.03, 0.145);
  headGroup.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.set(-0.055, 0.03, 0.145);
  headGroup.add(eyeR);

  // Store animation targets
  root.userData._animParts = { legL, legR, armL, armR, headGroup, torsoGroup, bootL, bootR, gloveL, gloveR };
  root.userData._animTime = 0;
  root.userData._animState = "idle"; // "idle" | "walk" | "run"

  return root;
}

// ─── Build female avatar geometry ────────────────────────────
function buildFemale(colors) {
  const root = new THREE.Group();
  root.name = "avatarModel";

  // Shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.20, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  root.add(shadow);

  const mat = (hex, opts = {}) => new THREE.MeshStandardMaterial({
    color: hex,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.08,
    ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.emissiveIntensity ?? 0.4 } : {}),
  });

  // Legs (slightly slimmer)
  const legGeo = new THREE.CapsuleGeometry(0.072, 0.44, 4, 8);
  const legL = new THREE.Mesh(legGeo, mat(colors.suit));
  legL.name = "legL";
  legL.position.set(0.088, 0.35, 0);
  legL.castShadow = true;
  root.add(legL);

  const legR = legL.clone();
  legR.name = "legR";
  legR.position.set(-0.088, 0.35, 0);
  root.add(legR);

  // Boots (sleeker)
  const bootGeo = new THREE.BoxGeometry(0.095, 0.12, 0.16);
  const bootL = new THREE.Mesh(bootGeo, mat(colors.boot));
  bootL.name = "bootL";
  bootL.position.set(0.088, 0.082, 0.010);
  bootL.castShadow = true;
  root.add(bootL);

  const bootR = bootL.clone();
  bootR.name = "bootR";
  bootR.position.set(-0.088, 0.082, 0.010);
  root.add(bootR);

  // Boot glow
  const bootGlowMat = new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0.75, depthWrite: false });
  for (const bx of [0.088, -0.088]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.015, 0.015), bootGlowMat);
    stripe.position.set(bx, 0.116, 0.082);
    root.add(stripe);
  }

  // Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.name = "torso";
  torsoGroup.position.set(0, 0.84, 0);
  root.add(torsoGroup);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.33, 0.44, 0.20),
    mat(colors.suit, { roughness: 0.35, metalness: 0.25 })
  );
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Accent collar / chest detail
  const accentMat = new THREE.MeshBasicMaterial({ color: colors.accent, transparent: true, opacity: 0.85, depthWrite: false });

  // V-neck accent
  const vL = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.22, 0.012), accentMat);
  vL.position.set(0.04, 0.08, 0.105);
  vL.rotation.z = 0.28;
  torsoGroup.add(vL);
  const vR = vL.clone();
  vR.position.set(-0.04, 0.08, 0.105);
  vR.rotation.z = -0.28;
  torsoGroup.add(vR);

  // Waist belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.022, 0.21), accentMat);
  belt.position.set(0, -0.14, 0);
  torsoGroup.add(belt);

  // Arms (slimmer)
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.36, 4, 8);
  const armL = new THREE.Group();
  armL.name = "armL";
  armL.position.set(0.195, 0.12, 0);
  torsoGroup.add(armL);
  const armLMesh = new THREE.Mesh(armGeo, mat(colors.suit));
  armLMesh.rotation.z = 0.10;
  armLMesh.castShadow = true;
  armL.add(armLMesh);

  const armR = new THREE.Group();
  armR.name = "armR";
  armR.position.set(-0.195, 0.12, 0);
  torsoGroup.add(armR);
  const armRMesh = new THREE.Mesh(armGeo, mat(colors.suit));
  armRMesh.rotation.z = -0.10;
  armRMesh.castShadow = true;
  armR.add(armRMesh);

  // Hands
  const handGeo = new THREE.SphereGeometry(0.058, 8, 6);
  const handL = new THREE.Mesh(handGeo, mat(colors.skin));
  handL.name = "handL";
  handL.position.set(0.22, -0.22, 0);
  armL.add(handL);
  const handR = handL.clone();
  handR.name = "handR";
  armR.add(handR);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.072, 0.11, 8),
    mat(colors.skin)
  );
  neck.position.set(0, 0.30, 0);
  neck.castShadow = true;
  torsoGroup.add(neck);

  // Head group
  const headGroup = new THREE.Group();
  headGroup.name = "head";
  headGroup.position.set(0, 0.44, 0);
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 12, 10),
    mat(colors.skin)
  );
  head.castShadow = true;
  headGroup.add(head);

  // Hair (longer, with side wisps)
  const hairTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.60),
    mat(colors.hair, { roughness: 0.75 })
  );
  hairTop.position.y = 0.02;
  headGroup.add(hairTop);

  // Hair extension behind head
  const hairBack = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.06, 0.28, 4, 6),
    mat(colors.hair, { roughness: 0.75 })
  );
  hairBack.position.set(0, -0.10, -0.09);
  headGroup.add(hairBack);

  // Eyes (glow)
  const eyeGeo = new THREE.SphereGeometry(0.020, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: colors.accent });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.048, 0.028, 0.136);
  headGroup.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.set(-0.048, 0.028, 0.136);
  headGroup.add(eyeR);

  // Store animation targets
  root.userData._animParts = { legL, legR, armL, armR, headGroup, torsoGroup, bootL, bootR };
  root.userData._animTime = 0;
  root.userData._animState = "idle";

  return root;
}

// ─── Procedural animation ─────────────────────────────────────
// Called once per frame by updateTestAvatarAnimation.
// Animates groups by setting rotation.x — fully compatible with
// existing movement/camera system (we never touch the controller root).
export function updateTestAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry?.root) return;

  const model = entry.root.getObjectByName("avatarModel");
  if (!model) return;

  const p = model.userData._animParts;
  if (!p) return;

  model.userData._animTime = (model.userData._animTime || 0) + dt;
  const t = model.userData._animTime;

  const PI = Math.PI;
  const sin = Math.sin;

  // Determine state
  const isRun  = speed > 0.5;
  const isWalk = speed > 0.07 && !isRun;
  const isIdle = !isWalk && !isRun && !isDancing;

  // Speed multiplier for animation frequency
  const freq = isRun ? 3.2 : isWalk ? 2.0 : 1.0;
  const amp  = isRun ? 0.55 : isWalk ? 0.32 : 0.0;

  // Leg swing
  if (p.legL) p.legL.rotation.x = sin(t * freq) * amp;
  if (p.legR) p.legR.rotation.x = -sin(t * freq) * amp;

  // Boot follow leg
  if (p.bootL) p.bootL.rotation.x = sin(t * freq) * amp * 0.6;
  if (p.bootR) p.bootR.rotation.x = -sin(t * freq) * amp * 0.6;

  // Arm swing (opposite to legs)
  if (p.armL) {
    p.armL.rotation.x = -sin(t * freq) * amp * 0.7;
    // Dance: clap arms
    if (isDancing) {
      p.armL.rotation.z = PI * 0.3 - Math.abs(sin(t * 6.0)) * 0.6;
      p.armL.rotation.x = Math.abs(sin(t * 6.0)) * 0.25;
    } else {
      p.armL.rotation.z = 0.1;
    }
  }
  if (p.armR) {
    p.armR.rotation.x = sin(t * freq) * amp * 0.7;
    if (isDancing) {
      p.armR.rotation.z = -(PI * 0.3 - Math.abs(sin(t * 6.0)) * 0.6);
      p.armR.rotation.x = Math.abs(sin(t * 6.0)) * 0.25;
    } else {
      p.armR.rotation.z = -0.1;
    }
  }

  // Torso subtle bob
  if (p.torsoGroup) {
    if (isIdle) {
      p.torsoGroup.position.y = 0.84 + sin(t * 1.2) * 0.006;
    } else {
      const bounceAmp = isRun ? 0.022 : 0.012;
      p.torsoGroup.position.y = 0.84 + Math.abs(sin(t * freq)) * bounceAmp;
    }
  }

  // Head gentle nod
  if (p.headGroup) {
    p.headGroup.rotation.x = isIdle ? sin(t * 0.9) * 0.025 : sin(t * freq) * 0.035;
  }
}

// ─── Shadow helper (shared) ───────────────────────────────────
function makeShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  return m;
}

// ─── Name sprite ─────────────────────────────────────────────
function makeNameSprite(text) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 48;
  const ctx = c.getContext("2d");
  ctx.font = "bold 17px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#ffffff";
  ctx.fillText((text || "User").slice(0, 18), 128, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })
  );
  sprite.scale.set(1.4, 0.32, 1);
  sprite.renderOrder = 999;
  return sprite;
}

// ─── PUBLIC: createTestAvatar ─────────────────────────────────
// gender: "male" | "female"
// Returns an entry object compatible with the CityCanvas avatar system.
// Does NOT replace or touch AvatarModel.jsx.
export function createTestAvatar(scene, gender = "male", opts = {}, onReady) {
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  controller.add(makeShadow());
  scene.add(controller);

  const colors = gender === "female" ? FEMALE_COLORS : MALE_COLORS;
  const model  = gender === "female" ? buildFemale(colors) : buildMale(colors);

  // Rotate 180° so front faces stage (-Z direction = forward)
  model.rotation.y = Math.PI;
  controller.add(model);

  const entry = {
    root: controller,
    mixer: null,   // no AnimationMixer — uses procedural animation
    clips: {},     // empty — not using GLB clips
    currentAnim: "idle",
    _isTestAvatar: true,
    _testGender: gender,
  };

  if (onReady) onReady(entry);
  return entry;
}

// ─── PUBLIC: retintTestAvatar ─────────────────────────────────
export function retintTestAvatar(entry, suitColor) {
  if (!entry?.root) return;
  const targetColor = new THREE.Color(suitColor || "#888888");
  entry.root.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry?.type === "CircleGeometry") return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m?.color) return;
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      const orig = m.userData._origColor;
      // Skip skin tones
      const { r, g, b } = orig;
      const isSkin = r > 0.35 && r > b * 1.3 && g > b * 0.8 && r < 0.95 && b < 0.6;
      if (isSkin) { m.color.copy(orig); return; }
      m.color.copy(targetColor);
    });
  });
}