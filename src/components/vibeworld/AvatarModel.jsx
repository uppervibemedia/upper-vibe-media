/**
 * AvatarModel — Humanoid GLB avatar for Upper Vibe City.
 *
 * THE FIX for T-pose + stuck avatar:
 *
 * createAvatar() creates ONE Group ("controller") and adds it to the scene.
 * It returns an entry object where entry.root === controller.
 * CityCanvas stores entry.root in avatarRef and moves it every frame via
 * avatar.position.set() and avatar.rotation.y = rot.
 *
 * When the GLB loads, the model is added as a CHILD of controller with
 * model.position = (0,0,0). Because it's a child, it inherits every
 * transform from the parent controller automatically. Zero swap needed.
 *
 * There is never a separate "placeholder" that gets removed and replaced.
 * The controller Group is permanent — only its children change.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

const GLB_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";

const _loader = new GLTFLoader();
let _gltfCache = null;
let _gltfPromise = null;

function loadGLTF() {
  if (_gltfCache) return Promise.resolve(_gltfCache);
  if (_gltfPromise) return _gltfPromise;
  _gltfPromise = new Promise((resolve, reject) => {
    _loader.load(
      GLB_URL,
      (g) => { _gltfCache = g; resolve(g); },
      undefined,
      (e) => { _gltfPromise = null; reject(e); }
    );
  });
  return _gltfPromise;
}

// For the player avatar we use the GLTF scene directly (no clone needed — only 1 player).
// For remote avatars we re-parse a fresh copy via the loader each time.
// This avoids ALL skeleton rebinding issues.
function getModelForPlayer(gltf) {
  return gltf.scene; // direct use — safe because only one player exists
}

function cloneGltfForRemote(gltf) {
  // Use THREE's built-in ObjectLoader-style clone which handles SkinnedMesh correctly
  // by serializing to JSON and re-parsing
  try {
    const exp = new THREE.ObjectLoader();
    const json = gltf.scene.toJSON();
    return exp.parse(json);
  } catch {
    // Fallback: simple clone (may have skeleton issues but better than crash)
    return gltf.scene.clone(true);
  }
}

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

function makeShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  return m;
}

const STYLE_TINTS = {
  streetwear: null,
  cosmic:  [0.72, 0.55, 1.0],
  neon:    [0.50, 1.00, 0.85],
  shadow:  [0.40, 0.40, 0.55],
  golden:  [1.00, 0.85, 0.40],
  crimson: [1.00, 0.35, 0.35],
};

function applyStyleTint(root, avatarStyle) {
  const rgb = STYLE_TINTS[avatarStyle];
  if (!rgb) return;
  const tint = new THREE.Color(...rgb);
  root.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => { if (m?.color) m.color.multiply(tint); });
  });
}

// ─── crossFade helper ─────────────────────────────────────────
function crossFade(entry, toKey, duration = 0.22) {
  if (!entry.clips[toKey] || entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to   = entry.clips[toKey];
  to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (from) from.crossFadeTo(to, duration, true);
  entry.currentAnim = toKey;
}

// ─── PUBLIC: updateAvatarAnimation ───────────────────────────
// SAFE RULE: Only ever play idle/walk/run clips from Soldier.glb.
// Never touch bone positions directly — the hip bone controls body height
// and zeroing it collapses the avatar. Never play run during dance — run
// has forward root motion that breaks the standing pose in-place.
export function updateAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry || !entry.mixer) return;
  entry.mixer.update(dt);

  // Emote active: stay on idle, don't interrupt
  if (entry._emoteActive) return;

  if (isDancing) {
    // SAFE DANCE: use idle at 1.4x — it's already a standing animation with
    // no root motion, no hip drop, no forward translation. Looks like a gentle
    // rhythmic sway. Never use run/walk here — they move the hips forward.
    const key = entry.clips.idle ? "idle" : entry.clips.walk ? "walk" : null;
    if (key) {
      if (entry.currentAnim !== key) crossFade(entry, key, 0.3);
      entry.clips[key].setEffectiveTimeScale(1.4);
    }
    return;
  }

  if (speed > 0.5) {
    const key = entry.clips.run ? "run" : "walk";
    if (entry.clips[key]) {
      crossFade(entry, key, 0.2);
      entry.clips[key].setEffectiveTimeScale(Math.min(2.4, speed * 0.9));
    }
  } else if (speed > 0.07) {
    if (entry.clips.walk) {
      crossFade(entry, "walk", 0.2);
      entry.clips.walk.setEffectiveTimeScale(0.75 + speed * 0.45);
    }
  } else {
    if (entry.clips.idle) {
      crossFade(entry, "idle", 0.3);
      entry.clips.idle.setEffectiveTimeScale(1.0);
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.3);
      entry.clips.walk.setEffectiveTimeScale(0.0);
    }
  }
}

// ─── PUBLIC: stopEmoteAnimation ──────────────────────────────
export function stopEmoteAnimation(entry) {
  if (!entry) return;
  if (entry._emoteTimer) { clearTimeout(entry._emoteTimer); entry._emoteTimer = null; }
  entry._emoteActive = false;
  // Return to idle — always safe, never collapses the avatar
  if (!entry.mixer) return;
  const clips = entry.clips;
  const idleKey = clips.idle ? "idle" : clips.walk ? "walk" : null;
  if (!idleKey) return;
  const idleAction = clips[idleKey];
  const current = clips[entry.currentAnim];
  idleAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (current && current !== idleAction) current.crossFadeTo(idleAction, 0.3, true);
  entry.currentAnim = idleKey;
}

// ─── PUBLIC: playEmoteAnimation ──────────────────────────────
// SAFE RULE: All emotes stay on the idle clip at normal speed.
// We do NOT switch to walk/run for emotes — those animations move the
// hips in ways that collapse or slide the avatar.
// Visual effects (emoji overlays) are handled by EmoteEffect component.
// This function just marks _emoteActive so updateAvatarAnimation holds
// on idle, then auto-clears after the effect duration.
export function playEmoteAnimation(entry, emoteId) {
  if (!entry || !entry.mixer) return;

  // Cancel any existing emote timer
  if (entry._emoteTimer) { clearTimeout(entry._emoteTimer); entry._emoteTimer = null; }

  const clips = entry.clips;
  const idleKey = clips.idle ? "idle" : clips.walk ? "walk" : null;
  if (!idleKey) return;

  // Emote durations (ms) — just controls how long _emoteActive stays true
  const DURATIONS = {
    wave: 2200, clap: 2000, heart: 2500, fire: 1800, peace: 2500, dance: 0,
  };
  const duration = DURATIONS[emoteId] ?? 2000;

  // Stay on idle — don't switch clips, don't adjust timeScale
  // The visual effect (emoji/particles) is shown by EmoteEffect component
  entry._emoteActive = true;
  if (entry.currentAnim !== idleKey) {
    const current = clips[entry.currentAnim];
    const idle = clips[idleKey];
    idle.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (current && current !== idle) current.crossFadeTo(idle, 0.2, true);
    entry.currentAnim = idleKey;
  }

  if (duration > 0) {
    entry._emoteTimer = setTimeout(() => {
      stopEmoteAnimation(entry);
    }, duration);
  }
}

// ─── attachModel ─────────────────────────────────────────────
// Loads the cloned GLTF model as a child of controllerGroup.
// Returns { mixer, clips, currentAnim }.
function attachModel(gltf, controllerGroup, opts = {}) {
  // Remove any existing model (handles double-mounts from React StrictMode)
  const existing = controllerGroup.getObjectByName("avatarModel");
  if (existing) controllerGroup.remove(existing);

  const model = opts.isRemote ? cloneGltfForRemote(gltf) : getModelForPlayer(gltf);
  model.name = "avatarModel";
  // Model lives at local origin — inherits controller position/rotation/scale
  // Rotate 180° on Y so the model's chest faces +Z (matching movement forward direction)
  model.position.set(0, 0, 0);
  model.rotation.set(0, Math.PI, 0);
  model.scale.set(1, 1, 1);

  model.traverse((child) => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
  });

  applyStyleTint(model, opts.avatarStyle || "streetwear");

  // MUST add to controller BEFORE creating AnimationMixer
  controllerGroup.add(model);

  // AnimationMixer targets the model skeleton
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};
  gltf.animations.forEach((clip) => {
    const key = clip.name.toLowerCase(); // "idle", "walk", "run"
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    clips[key] = action;
  });

  // Play idle immediately — never leave in T-pose
  const startKey = clips.idle ? "idle" : clips.walk ? "walk" : Object.keys(clips)[0];
  if (startKey && clips[startKey]) {
    clips[startKey].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }

  if (opts.username) {
    const sprite = makeNameSprite(opts.username);
    sprite.position.y = 2.25;
    controllerGroup.add(sprite);
  }

  return { mixer, clips, currentAnim: startKey || "idle" };
}

// ─── PUBLIC: createAvatar ─────────────────────────────────────
export function createAvatar(scene, opts = {}, onReady) {
  // This controller Group is the ONLY object CityCanvas ever needs to know about.
  // Movement loop: avatar.position.set(px, py, pz); avatar.rotation.y = rot;
  // This works from frame 1, even before the GLB loads.
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  controller.add(makeShadow());
  scene.add(controller);

  const entry = {
    root: controller,  // ← CityCanvas stores this in avatarRef
    mixer: null,
    clips: {},
    currentAnim: "idle",
  };

  loadGLTF()
    .then((gltf) => {
      const { mixer, clips, currentAnim } = attachModel(gltf, controller, {
        avatarStyle: opts.avatarStyle || "streetwear",
        isRemote: false,
      });
      // Mutate the SAME entry object that CityCanvas already has a reference to
      entry.mixer = mixer;
      entry.clips = clips;
      entry.currentAnim = currentAnim;
      onReady?.(entry);
    })
    .catch((err) => {
      console.error("[AvatarModel] GLB load failed:", err);
      // Capsule fallback — still moves with controller
      const cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.26, 1.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4499dd })
      );
      cap.name = "avatarModel";
      cap.position.y = 0.82;
      controller.add(cap);
      onReady?.(entry);
    });

  return entry;
}

// ─── PUBLIC: retintAvatar ─────────────────────────────────────
// suitColor: hex string e.g. "#00AADD" — applied directly to outfit/armor materials
// Skips skin-toned materials (face, hands, neck) and shadow discs
export function retintAvatar(entry, suitColor) {
  if (!entry?.root) return;
  const targetColor = new THREE.Color(suitColor || "#888888");

  entry.root.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry?.type === "CircleGeometry") return; // skip shadow disc

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m?.color) return;
      // Cache original color on first call
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      const orig = m.userData._origColor;
      // Skip skin-toned materials — warm mid-range colors (face/hands)
      const r = orig.r, g = orig.g, b = orig.b;
      const isSkinLike = (r > 0.35) && (r > b * 1.3) && (g > b * 0.8) && (r < 0.95) && (b < 0.6);
      if (isSkinLike) { m.color.copy(orig); return; }
      // Apply outfit color directly
      m.color.copy(targetColor);
    });
  });
}

// ─── PUBLIC: createRemoteAvatar ───────────────────────────────
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle) {
  const controller = new THREE.Group();
  controller.name = `remote_${userId}`;
  controller.userData = { userId };
  controller.add(makeShadow());
  scene.add(controller);

  const entry = { root: controller, mixer: null, clips: {}, currentAnim: "idle" };
  controller.userData._avatarEntry = entry; // available immediately for animation loop

  loadGLTF()
    .then((gltf) => {
      const { mixer, clips, currentAnim } = attachModel(gltf, controller, {
        avatarStyle: avatarStyle || "streetwear",
        username,
        isRemote: true,
      });
      entry.mixer = mixer;
      entry.clips = clips;
      entry.currentAnim = currentAnim;
    })
    .catch((err) => console.error("[AvatarModel] Remote GLB load failed:", err));

  return controller;
}