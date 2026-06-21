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
  male:         "https://threejs.org/examples/models/gltf/Soldier.glb",
  female:       "https://threejs.org/examples/models/gltf/Xbot.glb",
  // human_female: loads Michelle's human mesh + borrows Xbot's idle/walk/run animations
  // Both use the standard Mixamo rig so retargeting is perfect
  human_female_mesh: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb",
  human_female_anim: "https://threejs.org/examples/models/gltf/Xbot.glb",
};

const _loader = new GLTFLoader();
const _gltfCache = {};
const _gltfPromises = {};

function loadSingle(key, url) {
  if (_gltfCache[key]) return Promise.resolve(_gltfCache[key]);
  if (_gltfPromises[key]) return _gltfPromises[key];
  _gltfPromises[key] = new Promise((resolve, reject) => {
    _loader.load(
      url,
      (g) => { _gltfCache[key] = g; resolve(g); },
      undefined,
      (e) => { delete _gltfPromises[key]; reject(e); }
    );
  });
  return _gltfPromises[key];
}

function loadGLTF(gender = "male") {
  if (gender === "human_female") {
    // Load Michelle mesh + Xbot animations in parallel, then merge
    const cacheKey = "human_female";
    if (_gltfCache[cacheKey]) return Promise.resolve(_gltfCache[cacheKey]);
    if (_gltfPromises[cacheKey]) return _gltfPromises[cacheKey];
    _gltfPromises[cacheKey] = Promise.all([
      loadSingle("human_female_mesh", GLB_URLS.human_female_mesh),
      loadSingle("female", GLB_URLS.female), // reuse Xbot cache
    ]).then(([meshGltf, animGltf]) => {
      // Merge: use Michelle scene + Xbot animations
      const merged = { scene: meshGltf.scene, animations: animGltf.animations };
      _gltfCache[cacheKey] = merged;
      return merged;
    }).catch((err) => {
      delete _gltfPromises[cacheKey];
      throw err;
    });
    return _gltfPromises[cacheKey];
  }
  const url = GLB_URLS[gender] || GLB_URLS.male;
  return loadSingle(gender, url);
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
// Soldier.glb mesh names: "Alpha_Body_Geometry", "Alpha_Joints_Geometry", etc.
// Michelle.glb mesh names: "Ch03_Body", "Ch03_Eyelashes", "Ch03_Hair", etc.
function classifyMaterial(meshName, matName, origColor) {
  const mname = (meshName || "").toLowerCase();
  const mat   = (matName  || "").toLowerCase();
  const combined = mname + " " + mat;

  // ── HAIR — highest priority, protect from all tinting ──────
  if (/hair|eyebrow|brow|beard|facial_hair|eyelash|lash|bun|ponytail/i.test(combined)) return "hair";

  // ── SKIN — explicit name signals ───────────────────────────
  // Soldier.glb: "Alpha_Body_Geometry" with skin-toned material = skin
  // Michelle.glb: "Ch03_Body" exposed skin parts
  if (/\bskin\b|face|neck|hand|finger|wrist|forearm|upperarm|calf|shin|thigh|foot|toe|ear|nose|lip|mouth|chin|cheek|forehead|flesh|body_skin/i.test(combined)) return "skin";

  // ── OUTFIT — explicit name signals ─────────────────────────
  if (/shirt|top|jacket|pant|trouser|boot|shoe|armor|armour|cloth|outfit|suit|sleeve|collar|vest|coat|glove|belt|strap|trim|neon|accessory|accesso|pad|knee|chest|shoulder|visor|helmet|mask|cape|skirt|sock|sneaker|hoodie|shorts|uniform/i.test(combined)) return "outfit";

  // ── FALLBACK: color heuristics ─────────────────────────────
  const { r, g, b } = origColor;
  const brightness = (r + g + b) / 3;

  // Skin-like: warm mid-range tone
  // r dominant, not too dark, not too desaturated/white
  const isSkinLike = (
    r > 0.25 &&
    r > b * 1.20 &&
    g > b * 0.70 &&
    r < 0.97 &&
    b < 0.70 &&
    g < 0.92 &&
    brightness > 0.22 &&
    brightness < 0.88
  );
  if (isSkinLike) return "skin";

  // Hair-like: very dark neutral or dark warm brown
  const isNearNeutral = Math.abs(r - g) < 0.07 && Math.abs(g - b) < 0.07;
  if (brightness < 0.18 && isNearNeutral) return "hair";
  const isDarkBrown = r > g && r > b && (r - b) < 0.22 && brightness < 0.25 && r < 0.45;
  if (isDarkBrown) return "hair";

  // Bright / saturated / chromatic → outfit
  return "outfit";
}

// ─── crossFade helper ─────────────────────────────────────────
// Smoothly transitions from current clip to target clip.
// No-ops if already playing the target or target doesn't exist.
function crossFade(entry, toKey, duration = 0.2) {
  if (!entry.clips[toKey]) return;
  if (entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to   = entry.clips[toKey];
  to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (from && from !== to) from.crossFadeTo(to, duration, true);
  entry.currentAnim = toKey;
}

// ─── PUBLIC: updateAvatarAnimation ───────────────────────────
// Priority order (highest → lowest):
//   1. Moving (speed > threshold) → walk or run
//   2. Dancing (idle boosted) → idle at 1.4x
//   3. Default → idle at 1.0x
// Emote active flag just holds the current state — movement still wins.
export function updateAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry || !entry.mixer) return;
  entry.mixer.update(dt);

  const idleKey = entry._idleKey || "idle";
  const walkKey = entry._walkKey || "walk";
  const runKey  = entry._runKey  || null;

  // ── 1. MOVEMENT — always highest priority ──────────────────
  if (speed > 0.04) {
    // Clear emote so it doesn't block next idle
    entry._emoteActive = false;
    // Reset idle timescale in case dance boosted it
    if (entry.clips[idleKey]) entry.clips[idleKey].setEffectiveTimeScale(1.0);

    if (speed > 0.35 && runKey && entry.clips[runKey]) {
      crossFade(entry, runKey, 0.15);
      entry.clips[runKey].setEffectiveTimeScale(Math.min(2.4, speed * 0.85));
    } else if (entry.clips[walkKey]) {
      crossFade(entry, walkKey, 0.15);
      entry.clips[walkKey].setEffectiveTimeScale(Math.max(0.6, 0.7 + speed * 0.4));
    }
    return;
  }

  // ── 2. EMOTE active — hold current clip, don't change ──────
  if (entry._emoteActive) return;

  // ── 3. DANCE — idle at boosted speed ───────────────────────
  if (isDancing && entry.clips[idleKey]) {
    crossFade(entry, idleKey, 0.25);
    entry.clips[idleKey].setEffectiveTimeScale(1.4);
    return;
  }

  // ── 4. DEFAULT IDLE ─────────────────────────────────────────
  if (entry.clips[idleKey]) {
    crossFade(entry, idleKey, 0.25);
    entry.clips[idleKey].setEffectiveTimeScale(1.0);
  } else if (entry.clips[walkKey]) {
    // Fallback: frozen walk = effective idle
    crossFade(entry, walkKey, 0.25);
    entry.clips[walkKey].setEffectiveTimeScale(0.0);
  }
}

// ─── PUBLIC: stopEmoteAnimation ──────────────────────────────
export function stopEmoteAnimation(entry) {
  if (!entry) return;
  if (entry._emoteTimer) { clearTimeout(entry._emoteTimer); entry._emoteTimer = null; }
  entry._emoteActive = false;
  // updateAvatarAnimation will handle returning to idle on the next frame
}

// ─── PUBLIC: playEmoteAnimation ──────────────────────────────
// Marks _emoteActive so updateAvatarAnimation holds on idle during the effect.
// Movement always overrides emote (speed > threshold clears _emoteActive).
export function playEmoteAnimation(entry, emoteId) {
  if (!entry || !entry.mixer) return;
  if (entry._emoteTimer) { clearTimeout(entry._emoteTimer); entry._emoteTimer = null; }

  const DURATIONS = { wave: 2200, clap: 2000, heart: 2500, fire: 1800, peace: 2500, dance: 0 };
  const duration = DURATIONS[emoteId] ?? 2000;

  // Snap to idle and hold — visual effect handled by EmoteEffect overlay
  const idleKey = entry._idleKey || entry.clips.idle ? (entry._idleKey || "idle") : null;
  if (idleKey && entry.clips[idleKey] && entry.currentAnim !== idleKey) {
    const current = entry.clips[entry.currentAnim];
    const idle = entry.clips[idleKey];
    idle.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (current && current !== idle) current.crossFadeTo(idle, 0.15, true);
    entry.currentAnim = idleKey;
  }

  entry._emoteActive = true;

  if (duration > 0) {
    entry._emoteTimer = setTimeout(() => stopEmoteAnimation(entry), duration);
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
    // Retarget animation tracks to match this model's bone names.
    // Michelle.glb uses "mixamorig:BoneName" while Xbot uses "mixamorig:BoneName" too —
    // same Mixamo prefix, so clips cross-apply directly. No rename needed.
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    // Store by lowercased name for lookup
    clips[clip.name.toLowerCase()] = action;
  });

  // Resolve canonical keys — handle naming variations across GLB files
  // Soldier.glb: "Idle", "Walk", "Run", "TPose"
  // Michelle.glb: may differ — scan for closest match
  const idleKey = ["idle", "standing", "breathe", "rest"].find(k => clips[k]) || Object.keys(clips).find(k => /idle|stand|breath/i.test(k)) || null;
  const walkKey = ["walk", "walking"].find(k => clips[k]) || Object.keys(clips).find(k => /walk/i.test(k)) || null;
  const runKey  = ["run", "running"].find(k => clips[k])  || Object.keys(clips).find(k => /run/i.test(k))  || null;

  // Stop ALL clips — ensure clean slate, no auto-play from GLB defaults
  Object.values(clips).forEach((a) => { a.stop(); a.setEffectiveWeight(0); });

  // Start in idle immediately — never T-pose or dance
  const startKey = idleKey || walkKey || Object.keys(clips)[0];
  if (startKey && clips[startKey]) {
    clips[startKey].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }

  if (opts.username) {
    const sprite = makeNameSprite(opts.username);
    sprite.position.y = 2.25;
    controllerGroup.add(sprite);
  }

  return {
    mixer, clips,
    currentAnim: startKey || idleKey || "idle",
    _idleKey: idleKey,
    _walkKey: walkKey,
    _runKey:  runKey,
  };
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
    _idleKey: "idle",
    _walkKey: "walk",
    _runKey: "run",
    _emoteActive: false,
    _emoteTimer: null,
  };

  loadGLTF(opts.gender || "male")
    .then((gltf) => {
      const result = attachModel(gltf, controller, {
        avatarStyle: opts.avatarStyle || "streetwear",
        isRemote: false,
      });
      // Mutate the SAME entry object that CityCanvas already has a reference to
      entry.mixer = result.mixer;
      entry.clips = result.clips;
      entry.currentAnim = result.currentAnim;
      entry._idleKey = result._idleKey;
      entry._walkKey = result._walkKey;
      entry._runKey  = result._runKey;
      // Guarantee clean state: not dancing, not emoting
      entry._emoteActive = false;
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
// Hair materials are NEVER changed.
// skinColor=null means "restore original skin" — still safe for all genders.
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
      // Store original color the FIRST time we encounter each material
      if (!m.userData._origColor) m.userData._origColor = m.color.clone();
      const orig = m.userData._origColor;
      // Use both mesh name AND material name for better classification
      const matName = m.name || "";
      const kind = classifyMaterial(child.name, matName, orig);

      if (kind === "skin") {
        // Apply skin color if provided, otherwise restore original
        m.color.copy(skinTarget || orig);
      } else if (kind === "hair") {
        // Always restore original — hair is never tinted
        m.color.copy(orig);
      } else {
        // outfit / accessories — apply suit color
        m.color.copy(outfitTarget);
      }
    });
  });
}

// ─── PUBLIC: applySkinColor ───────────────────────────────────
// Apply only skin color without touching outfit or hair.
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
      const matName = m.name || "";
      const kind = classifyMaterial(child.name, matName, orig);
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

  const entry = { root: controller, mixer: null, clips: {}, currentAnim: "idle", _idleKey: "idle", _walkKey: "walk", _runKey: "run", _emoteActive: false, _emoteTimer: null };
  controller.userData._avatarEntry = entry; // available immediately for animation loop

  loadGLTF(gender)
    .then((gltf) => {
      const result = attachModel(gltf, controller, {
        avatarStyle: avatarStyle || "streetwear",
        username,
        isRemote: true,
      });
      entry.mixer = result.mixer;
      entry.clips = result.clips;
      entry.currentAnim = result.currentAnim;
      entry._idleKey = result._idleKey;
      entry._walkKey = result._walkKey;
      entry._runKey  = result._runKey;
    })
    .catch((err) => console.error("[AvatarModel] Remote GLB load failed:", err));

  return controller;
}