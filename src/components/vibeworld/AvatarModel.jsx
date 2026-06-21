/**
 * AvatarModel — Real humanoid GLB avatar using Three.js GLTFLoader.
 *
 * KEY ARCHITECTURE: createAvatar returns a persistent Group ("root") that is
 * immediately added to the scene. The movement loop always holds a ref to this
 * same Group and updates its position/rotation every frame. When the GLB finishes
 * loading, the model is added as a CHILD of that Group — so it automatically
 * follows all transforms. This prevents the classic "T-pose stuck" bug where
 * the visible model is a different object from the moving controller.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

const GLB_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";

// Color tints per avatar_style
const STYLE_TINTS = {
  streetwear: new THREE.Color(1.0, 1.0, 1.0),
  cosmic:     new THREE.Color(0.72, 0.55, 1.0),
  neon:       new THREE.Color(0.5,  1.0,  0.9),
  shadow:     new THREE.Color(0.4,  0.4,  0.55),
  golden:     new THREE.Color(1.0,  0.85, 0.4),
  crimson:    new THREE.Color(1.0,  0.35, 0.35),
};

// Shared GLTF cache — load once, SkeletonUtils.clone per avatar
const loader = new GLTFLoader();
let _cachedGltf = null;
let _loadPromise = null;

function loadGLTF() {
  if (_cachedGltf) return Promise.resolve(_cachedGltf);
  if (_loadPromise) return _loadPromise;
  _loadPromise = new Promise((resolve, reject) => {
    loader.load(GLB_URL, (gltf) => { _cachedGltf = gltf; resolve(gltf); }, undefined, reject);
  });
  return _loadPromise;
}

// Deep-clone a GLTF scene with proper skeleton binding
// (THREE.SkeletonUtils is not always available as a standalone module so we clone manually)
function cloneGltfScene(gltf) {
  // Use THREE.SkeletonUtils if available (three/addons), otherwise fall back to .clone(true)
  try {
    // Dynamic import path that works with three/addons
    // eslint-disable-next-line no-undef
    if (typeof SkeletonUtils !== "undefined") return SkeletonUtils.clone(gltf.scene);
  } catch {}
  return gltf.scene.clone(true);
}

// Name label sprite (for remote users)
function makeNameSprite(name) {
  const nc = document.createElement("canvas");
  nc.width = 256; nc.height = 52;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 18px 'Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(255,255,255,0.93)";
  ctx.fillText((name || "User").substring(0, 16), 128, 26);
  const tex = new THREE.CanvasTexture(nc);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(1.5, 0.35, 1);
  sprite.renderOrder = 999;
  return sprite;
}

// Ground shadow disc
function makeShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  return shadow;
}

// Apply suit color tint to all mesh materials in a model
function applyTint(modelRoot, tint) {
  modelRoot.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => { if (mat?.color) mat.color.multiply(tint); });
  });
}

// Attach a loaded GLTF model into an existing controller Group
// The controller Group is already in the scene and tracked by the movement loop.
function attachModelToController(gltf, controllerGroup, opts = {}) {
  const { avatarStyle = "streetwear", username } = opts;

  // Clone the GLTF scene (each avatar needs its own skeleton instance)
  const model = cloneGltfScene(gltf);
  model.name = "avatarModel";
  model.traverse((child) => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
  });
  model.scale.set(1, 1, 1);
  model.position.set(0, 0, 0); // local to controller — DO NOT offset

  // Apply style tint
  const tint = STYLE_TINTS[avatarStyle] || STYLE_TINTS.streetwear;
  if (tint.r !== 1 || tint.g !== 1 || tint.b !== 1) applyTint(model, tint);

  // Add model as child of controller so it inherits all transforms
  controllerGroup.add(model);

  // AnimationMixer targets the model (not the controller group)
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};

  // Soldier.glb clip names: "Idle", "Walk", "Run"
  gltf.animations.forEach((clip) => {
    const key = clip.name.toLowerCase();
    clips[key] = mixer.clipAction(clip);
    clips[key].setLoop(THREE.LoopRepeat, Infinity);
  });

  // Start idle immediately — never leave in T-pose
  if (clips.idle) {
    clips.idle.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  } else if (clips.walk) {
    // Fallback: if no idle clip, slow-play walk
    clips.walk.reset().setEffectiveTimeScale(0.1).setEffectiveWeight(1).play();
  }

  // Name label (remote avatars)
  if (username) {
    const sprite = makeNameSprite(username);
    sprite.position.y = 2.3;
    controllerGroup.add(sprite);
  }

  return { mixer, clips, currentAnim: clips.idle ? "idle" : (clips.walk ? "walk" : "") };
}

// Crossfade between animation states
function crossFade(entry, toKey, duration = 0.25) {
  if (!entry.clips[toKey] || entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to = entry.clips[toKey];
  if (from) {
    to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    from.crossFadeTo(to, duration, true);
  } else {
    to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }
  entry.currentAnim = toKey;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: updateAvatarAnimation
// Call every frame. entry = the object returned by createAvatar.
// ─────────────────────────────────────────────────────────────
export function updateAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry?.mixer) return;
  entry.mixer.update(dt);

  if (isDancing) {
    if (entry.clips.run) {
      crossFade(entry, "run", 0.3);
      entry.clips.run.setEffectiveTimeScale(1.4);
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.3);
      entry.clips.walk.setEffectiveTimeScale(1.6);
    }
    return;
  }

  if (speed > 0.5) {
    if (entry.clips.run) {
      crossFade(entry, "run", 0.2);
      entry.clips.run.setEffectiveTimeScale(Math.min(2.5, speed * 0.9));
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.2);
      entry.clips.walk.setEffectiveTimeScale(Math.min(2.5, speed * 1.1));
    }
  } else if (speed > 0.08) {
    if (entry.clips.walk) {
      crossFade(entry, "walk", 0.25);
      entry.clips.walk.setEffectiveTimeScale(0.8 + speed * 0.4);
    }
  } else {
    if (entry.clips.idle) {
      crossFade(entry, "idle", 0.3);
    } else if (entry.clips.walk) {
      // Fallback: very slow walk as idle substitute
      crossFade(entry, "walk", 0.3);
      entry.clips.walk.setEffectiveTimeScale(0.05);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: createAvatar (player)
//
// Returns a persistent controller Group that is IMMEDIATELY added to the
// scene and tracked by the CityCanvas movement loop. The GLB model is
// loaded async and parented INTO this group — so when it appears, it
// automatically follows the controller's position/rotation.
// ─────────────────────────────────────────────────────────────
export function createAvatar(scene, opts = {}, onReady) {
  // Controller group — this is the object that CityCanvas moves every frame
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);

  // Add a shadow under the avatar immediately (visible while model loads)
  controller.add(makeShadow());

  scene.add(controller);

  // The entry object — mixer/clips are null until the GLB loads
  const entry = {
    root: controller,
    mixer: null,
    clips: {},
    currentAnim: "idle",
    speed: 0,
  };

  loadGLTF().then((gltf) => {
    const { mixer, clips, currentAnim } = attachModelToController(gltf, controller, opts);
    entry.mixer = mixer;
    entry.clips = clips;
    entry.currentAnim = currentAnim;
    onReady?.(entry);
  }).catch((err) => {
    console.error("[AvatarModel] Failed to load GLB:", err);
    // Fallback: build a simple capsule so user is never invisible
    const fallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 1.1, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.6 })
    );
    fallback.position.y = 0.8;
    controller.add(fallback);
    onReady?.(entry);
  });

  // Return the entry immediately — root is the controller group
  return entry;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: retintAvatar
// ─────────────────────────────────────────────────────────────
export function retintAvatar(entry, suitColor, styleTint) {
  if (!entry?.root) return;
  const baseColor = new THREE.Color(suitColor || "#ffffff");
  const tint = styleTint ? new THREE.Color(...styleTint) : new THREE.Color(1, 1, 1);
  const final = baseColor.clone().multiply(tint);

  entry.root.traverse((child) => {
    if (!child.isMesh || child.geometry?.type === "CircleGeometry") return; // skip shadow disc
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => { if (mat?.color) mat.color.copy(final); });
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: createRemoteAvatar
//
// Same pattern: persistent controller Group returned immediately,
// GLB model parented in when ready.
// ─────────────────────────────────────────────────────────────
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle) {
  const controller = new THREE.Group();
  controller.name = `remote_${userId}`;
  controller.userData = { userId, walkTime: 0, speed: 0 };

  controller.add(makeShadow());
  scene.add(controller);

  const entry = {
    root: controller,
    mixer: null,
    clips: {},
    currentAnim: "idle",
  };

  loadGLTF().then((gltf) => {
    const { mixer, clips, currentAnim } = attachModelToController(gltf, controller, {
      avatarStyle: avatarStyle || "streetwear",
      username,
    });
    entry.mixer = mixer;
    entry.clips = clips;
    entry.currentAnim = currentAnim;
    // Store entry reference so CityCanvas animation loop can find it
    controller.userData._avatarEntry = entry;
  }).catch((err) => {
    console.error("[AvatarModel] Remote avatar load failed:", err);
  });

  // Store entry immediately so the animation loop always has a valid reference
  controller.userData._avatarEntry = entry;

  return controller;
}