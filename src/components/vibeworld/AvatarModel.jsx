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

// Both genders use Soldier.glb — it has Idle/Walk/Run on a Mixamo rig.
// Michelle.glb only contains SambaDance + TPose — no locomotion clips.
// Female differentiation is handled via outfit color tinting in retintAvatar.
const GLB_URLS = {
  male:   "https://threejs.org/examples/models/gltf/Soldier.glb",
  female: "https://threejs.org/examples/models/gltf/Soldier.glb",
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
  const key = gender === "female" ? "female" : "male";
  return loadSingle(key, GLB_URLS[key]);
}

// Deep-clone a GLTF scene preserving SkinnedMesh skeleton bindings.
// THREE's scene.clone(true) re-maps bones correctly within the cloned hierarchy,
// so this is safe for AnimationMixer targets.
function cloneScene(gltf) {
  return gltf.scene.clone(true);
}

function getModelForPlayer(gltf) {
  return cloneScene(gltf);
}

function cloneGltfForRemote(gltf) {
  return cloneScene(gltf);
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

// ─── fadeToAction ─────────────────────────────────────────────
// Properly fades out the previous action and fades in the new one.
// One active base animation at a time — no bleed-through.
// Skips if already playing the target at normal speed.
function fadeToAction(entry, toKey, duration = 0.2) {
  if (!entry.clips[toKey]) return;
  const nextAction = entry.clips[toKey];

  // Only skip if already playing this key AND timescale is not 0 (frozen walk trick)
  if (entry.currentAnim === toKey && nextAction.getEffectiveWeight() > 0.9 && nextAction.timeScale !== 0) return;

  const prevAction = entry.clips[entry.currentAnim];

  // Stop ALL other clips first to prevent multi-action bleed
  Object.entries(entry.clips).forEach(([key, action]) => {
    if (key !== toKey && action !== nextAction) {
      action.fadeOut(duration);
    }
  });

  entry.currentAnim = toKey;

  nextAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play();
}

// ─── PUBLIC: updateAvatarAnimation ───────────────────────────
// STRICT priority order (highest → lowest):
//   1. MOVEMENT (speed > threshold) → walk or run — ALWAYS wins, cancels dance
//   2. DANCE — only if _isDancing flag is set AND no movement
//   3. IDLE — default
//
// Dance is stored as entry._isDancing so it can be forcibly cleared on movement.
export function updateAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry || !entry.mixer) return;
  entry.mixer.update(dt);

  const idleKey = entry._idleKey || "idle";
  const walkKey = entry._walkKey || "walk";
  const runKey  = entry._runKey  || null;

  const isMoving = speed > 0.04;

  // ── 1. MOVEMENT — HIGHEST PRIORITY, cancels dance unconditionally ──
  if (isMoving) {
    // Force-clear ALL dance/emote state — movement always wins
    entry._emoteActive = false;
    entry._isDancing = false;

    if (speed > 0.35 && runKey && entry.clips[runKey]) {
      fadeToAction(entry, runKey, 0.15);
      entry.clips[runKey].setEffectiveTimeScale(Math.min(2.4, speed * 0.85));
    } else if (walkKey && entry.clips[walkKey]) {
      fadeToAction(entry, walkKey, 0.15);
      entry.clips[walkKey].setEffectiveTimeScale(Math.max(0.6, 0.7 + speed * 0.4));
    } else if (idleKey && entry.clips[idleKey]) {
      // No walk clip (single-clip Michelle export) — speed up idle to simulate walking
      fadeToAction(entry, idleKey, 0.15);
      entry.clips[idleKey].setEffectiveTimeScale(Math.max(1.5, 1.8 + speed * 0.5));
    }
    return;
  }

  // ── 2. NOT MOVING — sync dance state from external isDancing prop ──
  entry._isDancing = isDancing;

  // ── 3. EMOTE active — hold current clip, don't change ──────
  if (entry._emoteActive) return;

  // ── 4. DANCE — play idle at boosted timescale ───────────────
  if (isDancing && entry.clips[idleKey]) {
    if (entry.currentAnim !== idleKey) {
      fadeToAction(entry, idleKey, 0.25);
    }
    entry.clips[idleKey].setEffectiveTimeScale(1.4);
    return;
  }

  // ── 5. DEFAULT IDLE ──────────────────────────────────────────
  // Reset idle timescale in case dance boosted it previously
  if (entry.clips[idleKey]) {
    if (entry.currentAnim === idleKey) {
      // Already idle — just ensure normal speed
      entry.clips[idleKey].setEffectiveTimeScale(1.0);
    } else {
      fadeToAction(entry, idleKey, 0.25);
      entry.clips[idleKey].setEffectiveTimeScale(1.0);
    }
  }
}

// ─── PUBLIC: stopEmoteAnimation ──────────────────────────────
export function stopEmoteAnimation(entry) {
  if (!entry) return;
  if (entry._emoteTimer) { clearTimeout(entry._emoteTimer); entry._emoteTimer = null; }
  entry._emoteActive = false;
  // updateAvatarAnimation will pick up idle on the next frame
}

// ─── PUBLIC: stopDanceAnimation ──────────────────────────────
// Called when dance mode is cancelled externally (movement, zone exit, stop button).
export function stopDanceAnimation(entry) {
  if (!entry) return;
  entry._isDancing = false;
  entry._emoteActive = false;
  // Fade to idle immediately — do not wait for next updateAvatarAnimation call
  const idleKey = entry._idleKey || "idle";
  const walkKey = entry._walkKey || "walk";
  if (entry.clips && (entry.clips[idleKey] || entry.clips[walkKey])) {
    fadeToAction(entry, idleKey || walkKey, 0.2);
    if (entry.clips[idleKey]) entry.clips[idleKey].setEffectiveTimeScale(1.0);
  }
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
  const idleKey = entry._idleKey || "idle";
  if (idleKey && entry.clips?.[idleKey]) {
    fadeToAction(entry, idleKey, 0.15);
    entry.clips[idleKey].setEffectiveTimeScale(1.0);
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
  if (existing) {
    controllerGroup.remove(existing);
    // Dispose old mixer if present
    if (existing.userData._mixer) existing.userData._mixer.stopAllAction();
  }

  const model = opts.isRemote ? cloneGltfForRemote(gltf) : getModelForPlayer(gltf);
  model.name = "avatarModel";

  // Reset transform before measuring
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);

  // ── ADD TO CONTROLLER — parenting must happen before transform tweaks ──
  controllerGroup.add(model);

  // ── SCALE + GROUND ────────────────────────────────────────────
  // Soldier.glb is in meter units, ~1.8m tall at scale 1. Scale 1 is correct.
  model.scale.set(1, 1, 1);
  model.position.y = 0;

  // Face +Z (chest toward camera behind avatar)
  model.rotation.set(0, Math.PI, 0);

  model.traverse((child) => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
  });

  // AnimationMixer targets the model skeleton
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};
  gltf.animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    // Store by both lowercased name AND index for fallback lookups
    clips[clip.name.toLowerCase()] = action;
  });

  // Debug: log clip names to help diagnose missing animations
  if (gltf.animations.length > 0) {
    console.log("[AvatarModel] Loaded clips:", gltf.animations.map(a => a.name));
  }

  // Resolve canonical keys — handle naming variations across GLB files
  // Soldier.glb: "Idle", "Walk", "Run", "TPose"
  // Michelle.glb (Mixamo export): "mixamo.com" (idle), or named clips like "idle", "walking", "running"
  //   Some Michelle.glb exports have only ONE clip named "mixamo.com" — use it as idle fallback.
  const idleKey = ["idle", "standing", "breathe", "rest", "mixamo.com"].find(k => clips[k])
    || Object.keys(clips).find(k => /idle|stand|breath/i.test(k))
    || Object.keys(clips)[0] // absolute fallback — first clip
    || null;
  const walkKey = ["walk", "walking"].find(k => clips[k])
    || Object.keys(clips).find(k => /walk/i.test(k))
    || null;
  const runKey  = ["run", "running"].find(k => clips[k])
    || Object.keys(clips).find(k => /run/i.test(k))
    || null;

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
    _isDancing: false,
  };
}

// ─── PUBLIC: createAvatar ─────────────────────────────────────
export function createAvatar(scene, opts = {}, onReady) {
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  controller.add(makeShadow());
  scene.add(controller);

  // Visible capsule placeholder — shown while GLB loads so the player
  // always sees something moving from frame 1 (not just the shadow disc).
  const placeholder = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 1.0, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4499dd, roughness: 0.6 })
  );
  placeholder.name = "avatarPlaceholder";
  placeholder.position.y = 0.72;
  controller.add(placeholder);

  const entry = {
    root: controller,
    mixer: null,
    clips: {},
    currentAnim: "idle",
    _idleKey: "idle",
    _walkKey: "walk",
    _runKey: "run",
    _emoteActive: false,
    _emoteTimer: null,
    _isDancing: false,
  };

  loadGLTF(opts.gender || "male")
    .then((gltf) => {
      // Remove placeholder once real model arrives
      const ph = controller.getObjectByName("avatarPlaceholder");
      if (ph) controller.remove(ph);

      const result = attachModel(gltf, controller, {
        avatarStyle: opts.avatarStyle || "streetwear",
        isRemote: false,
      });
      entry.mixer = result.mixer;
      entry.clips = result.clips;
      entry.currentAnim = result.currentAnim;
      entry._idleKey = result._idleKey;
      entry._walkKey = result._walkKey;
      entry._runKey  = result._runKey;
      entry._emoteActive = false;
      entry._isDancing = false;

      console.log("[AvatarModel] Player GLB loaded ✓ gender:", opts.gender || "male",
        "| idleKey:", result._idleKey, "| walkKey:", result._walkKey);

      onReady?.(entry);
    })
    .catch((err) => {
      console.error("[AvatarModel] GLB load FAILED — keeping capsule placeholder:", err);
      // Placeholder already visible and attached — no extra action needed
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

  const entry = { root: controller, mixer: null, clips: {}, currentAnim: "idle", _idleKey: "idle", _walkKey: "walk", _runKey: "run", _emoteActive: false, _emoteTimer: null, _isDancing: false };
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