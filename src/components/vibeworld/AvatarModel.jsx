/**
 * AvatarModel — Real humanoid GLB avatar using Three.js GLTFLoader.
 *
 * Uses the official Three.js Soldier.glb (CC0, properly rigged humanoid)
 * with built-in idle, walk, and run AnimationClips.
 *
 * Exports:
 *   createAvatar(scene, opts)       → { root, mixer, clips }
 *   createRemoteAvatar(scene, ...)  → { root, mixer, clips }
 *   updateAvatarAnimation(entry, speed, isDancing, dt)
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

// ── GLB source — Three.js official example model (CC0, properly rigged) ──
const GLB_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";

// ── Color tints per avatar_style ─────────────────────────────────────────
const STYLE_TINTS = {
  streetwear: new THREE.Color(1.0, 1.0, 1.0),   // natural
  cosmic:     new THREE.Color(0.72, 0.55, 1.0),  // purple tint
};

// ── Shared loader + GLB cache (load once, clone for each avatar) ──────────
const loader = new GLTFLoader();
let _cachedGltf = null;
let _loadPromise = null;

function loadGLTF() {
  if (_cachedGltf) return Promise.resolve(_cachedGltf);
  if (_loadPromise) return _loadPromise;
  _loadPromise = new Promise((resolve, reject) => {
    loader.load(GLB_URL, (gltf) => {
      _cachedGltf = gltf;
      resolve(gltf);
    }, undefined, reject);
  });
  return _loadPromise;
}

// ── Name label sprite ─────────────────────────────────────────────────────
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

// ── Ground shadow disc ────────────────────────────────────────────────────
function makeShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  return shadow;
}

// ── Apply color tint to all mesh materials ────────────────────────────────
function applyTint(root, tint) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (mat?.color) mat.color.multiply(tint);
    });
  });
}

// ── Build an avatar entry object from a loaded GLTF ──────────────────────
function buildEntry(gltf, scene, opts = {}) {
  const { username, avatarStyle = "streetwear", spawnPos } = opts;

  // Clone the scene so each avatar is independent
  const root = gltf.scene.clone(true);
  root.name = opts.remoteName || "avatar";
  root.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

  // Scale: Soldier.glb is ~1.8m tall — keep natural scale
  root.scale.set(1, 1, 1);

  // Apply style tint
  const tint = STYLE_TINTS[avatarStyle] || STYLE_TINTS.streetwear;
  if (tint.r !== 1 || tint.g !== 1 || tint.b !== 1) applyTint(root, tint);

  // Position
  const pos = spawnPos || SPAWN;
  root.position.set(pos[0], pos[1], pos[2]);

  // AnimationMixer + clips
  const mixer = new THREE.AnimationMixer(root);
  const clips = {};

  // Soldier.glb clip names: "Idle", "Walk", "Run"
  gltf.animations.forEach((clip) => {
    const key = clip.name.toLowerCase(); // "idle", "walk", "run"
    clips[key] = mixer.clipAction(clip);
    clips[key].setLoop(THREE.LoopRepeat, Infinity);
  });

  // Start with idle
  if (clips.idle) {
    clips.idle.play();
  }

  // Ground shadow
  root.add(makeShadow());

  // Name sprite (remote users only)
  if (username) {
    const sprite = makeNameSprite(username);
    sprite.position.y = 2.2;
    root.add(sprite);
  }

  scene.add(root);

  return { root, mixer, clips, currentAnim: "idle", speed: 0, walkTime: 0 };
}

// ── Transition between animations ────────────────────────────────────────
function crossFade(entry, toKey, duration = 0.25) {
  if (!entry.clips[toKey] || entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to = entry.clips[toKey];
  if (from) {
    to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    from.crossFadeTo(to, duration, true);
  } else {
    to.reset().play();
  }
  entry.currentAnim = toKey;
}

// ── PUBLIC: updateAvatarAnimation ────────────────────────────────────────
/**
 * Call this every frame to drive the avatar's animations.
 * @param {object} entry  - returned by createAvatar / createRemoteAvatar
 * @param {number} speed  - movement speed (0 = idle, >0.1 = walking)
 * @param {boolean} isDancing
 * @param {number} dt     - delta time in seconds
 */
export function updateAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry?.mixer) return;
  entry.mixer.update(dt);

  if (isDancing) {
    // Dance: use run clip sped up as a placeholder dance until custom clip available
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
    // Running
    if (entry.clips.run) {
      crossFade(entry, "run", 0.2);
      entry.clips.run.setEffectiveTimeScale(speed * 0.9);
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.2);
      entry.clips.walk.setEffectiveTimeScale(speed * 1.1);
    }
  } else if (speed > 0.08) {
    // Walking
    if (entry.clips.walk) {
      crossFade(entry, "walk", 0.25);
      entry.clips.walk.setEffectiveTimeScale(0.8 + speed * 0.4);
    }
  } else {
    // Idle
    if (entry.clips.idle) {
      crossFade(entry, "idle", 0.3);
    }
  }
}

// ── PUBLIC: createAvatar (player) ─────────────────────────────────────────
/**
 * Async: loads the GLB and places the player avatar in the scene.
 * Returns a Promise that resolves to the entry object.
 * Also calls onReady(entry) when ready.
 */
export function createAvatar(scene, opts = {}, onReady) {
  // Immediately place a tiny invisible placeholder so CityCanvas has something to reference
  const placeholder = new THREE.Group();
  placeholder.name = "avatar";
  placeholder.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(placeholder);

  // Load async
  loadGLTF().then((gltf) => {
    scene.remove(placeholder);
    const entry = buildEntry(gltf, scene, { ...opts, remoteName: undefined });
    entry.root.name = "avatar";
    onReady?.(entry);
  }).catch((err) => {
    console.error("[AvatarModel] Failed to load GLB:", err);
    // Keep placeholder visible as fallback — shows as empty group
    onReady?.({ root: placeholder, mixer: null, clips: {}, currentAnim: "idle", speed: 0 });
  });

  return placeholder; // returned synchronously for CityCanvas compatibility
}

// ── PUBLIC: createRemoteAvatar ────────────────────────────────────────────
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle) {
  const placeholder = new THREE.Group();
  placeholder.name = `remote_${userId}`;
  placeholder.userData = { userId, walkTime: 0, speed: 0 };
  scene.add(placeholder);

  loadGLTF().then((gltf) => {
    scene.remove(placeholder);
    const entry = buildEntry(gltf, scene, {
      username,
      avatarStyle: avatarStyle || "streetwear",
      remoteName: `remote_${userId}`,
    });
    entry.root.userData = { userId, walkTime: 0, speed: 0 };
    // Store entry on the group for CityCanvas animation loop to find
    entry.root.userData._avatarEntry = entry;
  }).catch((err) => {
    console.error("[AvatarModel] Remote avatar load failed:", err);
  });

  return placeholder;
}