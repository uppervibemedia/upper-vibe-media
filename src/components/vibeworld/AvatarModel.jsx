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

const GLB_URLS = {
  male:   "https://threejs.org/examples/models/gltf/Soldier.glb",
  female: "https://threejs.org/examples/models/gltf/Michelle.glb",
};

const _loader = new GLTFLoader();
const _gltfCache = {};
const _gltfPromises = {};

function loadGLTF(gender = "male") {
  const url = GLB_URLS[gender] || GLB_URLS.male;
  if (_gltfCache[gender]) return Promise.resolve(_gltfCache[gender]);
  if (_gltfPromises[gender]) return _gltfPromises[gender];
  _gltfPromises[gender] = new Promise((resolve, reject) => {
    _loader.load(
      url,
      (g) => { _gltfCache[gender] = g; resolve(g); },
      undefined,
      (e) => { delete _gltfPromises[gender]; reject(e); }
    );
  });
  return _gltfPromises[gender];
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

// ─── Material classification ──────────────────────────────────
// Returns "skin" | "hair" | "outfit" based on mesh name + color heuristics.
// Order matters: name-based check runs first; color heuristic is fallback.
function classifyMaterial(meshName, origColor) {
  const name = (meshName || "").toLowerCase();

  // Hair — name signals
  if (/hair|eyebrow|brow|beard|facial_hair|eyelash|lash/i.test(name)) return "hair";

  // Skin — name signals
  if (/skin|face|head|neck|hand|arm|leg|body|torso|flesh/i.test(name)) return "skin";

  // Outfit — name signals
  if (/shirt|top|jacket|pant|boot|shoe|armor|cloth|outfit|suit|sleeve|collar|vest|coat|glove|belt|strap|trim|neon|accessory|accesso|pad|knee|chest|shoulder|visor|helmet|mask|cape|skirt/i.test(name)) return "outfit";

  // Fallback: color heuristic
  const { r, g, b } = origColor;
  // Skin-like: warm mid-range (not too bright white, not near-black)
  const isSkinLike = r > 0.28 && r > b * 1.25 && g > b * 0.75 && r < 0.96 && b < 0.65 && g < 0.90;
  if (isSkinLike) return "skin";

  // Hair-like: very dark or near-neutral dark brown/black
  const brightness = (r + g + b) / 3;
  const isNearNeutral = Math.abs(r - g) < 0.06 && Math.abs(g - b) < 0.06;
  if (brightness < 0.18 && isNearNeutral) return "hair"; // very dark neutral = likely hair/dark feature
  const isDarkBrown = r > g && r > b && (r - b) < 0.18 && brightness < 0.22;
  if (isDarkBrown) return "hair";

  return "outfit";
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

  // Emote active: hold on idle, don't interrupt
  if (entry._emoteActive) return;

  // Movement ALWAYS overrides dance — highest priority
  if (speed > 0.05) {
    // Reset dance timescale bleed: ensure idle clip is at normal speed if we return to idle later
    if (entry._wasIdleBoosted) {
      if (entry.clips.idle) entry.clips.idle.setEffectiveTimeScale(1.0);
      entry._wasIdleBoosted = false;
    }
    if (speed > 0.4) {
      const key = entry.clips.run ? "run" : "walk";
      if (entry.clips[key]) {
        crossFade(entry, key, 0.15);
        entry.clips[key].setEffectiveTimeScale(Math.min(2.4, speed * 0.9));
      }
    } else {
      if (entry.clips.walk) {
        crossFade(entry, "walk", 0.15);
        entry.clips.walk.setEffectiveTimeScale(0.75 + speed * 0.45);
      }
    }
    return;
  }

  // Standing still — check dance state
  if (isDancing) {
    if (entry.clips.idle) {
      if (entry.currentAnim !== "idle") crossFade(entry, "idle", 0.3);
      entry.clips.idle.setEffectiveTimeScale(1.4);
      entry._wasIdleBoosted = true;
    }
    return;
  }

  // Default: normal idle — always reset timescale to 1.0
  if (entry.clips.idle) {
    crossFade(entry, "idle", 0.3);
    entry.clips.idle.setEffectiveTimeScale(1.0);
    entry._wasIdleBoosted = false;
  } else if (entry.clips.walk) {
    crossFade(entry, "walk", 0.3);
    entry.clips.walk.setEffectiveTimeScale(0.0);
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

  // applyStyleTint removed — retintAvatar handles all coloring now

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

  // Always start in idle — never T-pose, never dance
  const startKey = clips.idle ? "idle" : clips.walk ? "walk" : Object.keys(clips)[0];
  if (startKey && clips[startKey]) {
    // Stop all other clips first to ensure clean state
    Object.values(clips).forEach((a) => { a.stop(); });
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
    _emoteActive: false,
    _emoteTimer: null,
  };

  loadGLTF(opts.gender || "male")
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
// suitColor: hex string — applied to outfit/accessory materials only
// skinColor: hex string — optional, applied to skin materials only
// Hair materials are never changed.
export function retintAvatar(entry, suitColor, skinColor) {
  if (!entry?.root) return;
  const outfitTarget = new THREE.Color(suitColor || "#888888");
  const skinTarget = skinColor ? new THREE.Color(skinColor) : null;

  entry.root.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry?.type === "CircleGeometry") return; // skip shadow disc

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m?.color) return;
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      const orig = m.userData._origColor;
      const kind = classifyMaterial(child.name, orig);

      if (kind === "skin") {
        // Only update skin if a skin color was provided
        if (skinTarget) m.color.copy(skinTarget);
        else m.color.copy(orig); // restore original
      } else if (kind === "hair") {
        // Never change hair — always restore original
        m.color.copy(orig);
      } else {
        // outfit / accessories
        m.color.copy(outfitTarget);
      }
    });
  });
}

// ─── PUBLIC: applySkinColor ───────────────────────────────────
// Apply only skin color without touching outfit.
export function applySkinColor(entry, skinColor) {
  if (!entry?.root || !skinColor) return;
  const skinTarget = new THREE.Color(skinColor);

  entry.root.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry?.type === "CircleGeometry") return;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m?.color) return;
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      const orig = m.userData._origColor;
      const kind = classifyMaterial(child.name, orig);
      if (kind === "skin") m.color.copy(skinTarget);
    });
  });
}

// ─── PUBLIC: createRemoteAvatar ───────────────────────────────
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle, gender = "male") {
  const controller = new THREE.Group();
  controller.name = `remote_${userId}`;
  controller.userData = { userId };
  controller.add(makeShadow());
  scene.add(controller);

  const entry = { root: controller, mixer: null, clips: {}, currentAnim: "idle" };
  controller.userData._avatarEntry = entry; // available immediately for animation loop

  loadGLTF(gender)
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