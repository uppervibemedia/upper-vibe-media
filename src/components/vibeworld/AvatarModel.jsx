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

// ─── Procedural emote animation — applied on top of idle pose ─
// Runs per-frame and manipulates bone rotations directly.
// Returns nothing; mutates bones in place.
function applyEmotePose(entry, dt) {
  if (!entry._emote) return;
  const t = entry._emoteTimer || 0;
  entry._emoteTimer = t + dt;
  const tm = entry._emoteTimer;

  const model = entry.root.getObjectByName("avatarModel");
  if (!model) return;

  // Helper: find bone by partial name match
  const getBone = (partialName) => {
    let found = null;
    model.traverse((obj) => {
      if (obj.isBone && obj.name.toLowerCase().includes(partialName.toLowerCase())) found = obj;
    });
    return found;
  };

  const spine = getBone("spine") || getBone("chest") || getBone("upper");
  const armL  = getBone("leftarm")  || getBone("left_arm")  || getBone("larm");
  const armR  = getBone("rightarm") || getBone("right_arm") || getBone("rarm");
  const head  = getBone("head") || getBone("neck");

  const sin = Math.sin;
  const cos = Math.cos;
  const PI  = Math.PI;

  switch (entry._emote) {
    case "wave": {
      // Right arm waves up and down, head turns slightly
      if (armR) {
        armR.rotation.z = -PI * 0.55 + sin(tm * 5.0) * 0.45;
        armR.rotation.x = sin(tm * 5.0) * 0.15;
      }
      if (armL) { armL.rotation.z = 0.1; }
      if (head) { head.rotation.y = sin(tm * 2.0) * 0.2; }
      break;
    }
    case "clap": {
      // Both arms swing toward each other rhythmically
      const clap = Math.abs(sin(tm * 6.0));
      if (armL) { armL.rotation.z = PI * 0.3 - clap * 0.7; armL.rotation.x = clap * 0.3; }
      if (armR) { armR.rotation.z = -(PI * 0.3 - clap * 0.7); armR.rotation.x = clap * 0.3; }
      if (head) { head.rotation.x = sin(tm * 6.0) * 0.06; }
      break;
    }
    case "heart": {
      // Arms open wide, head tilts lovingly, slight body sway
      if (armL) { armL.rotation.z = PI * 0.5 + sin(tm * 1.5) * 0.1; armL.rotation.x = 0.2; }
      if (armR) { armR.rotation.z = -(PI * 0.5 + sin(tm * 1.5) * 0.1); armR.rotation.x = 0.2; }
      if (head) { head.rotation.z = sin(tm * 1.5) * 0.12; head.rotation.x = -0.08; }
      if (spine) { spine.rotation.z = sin(tm * 1.5) * 0.04; }
      break;
    }
    case "fire": {
      // Pump fist up rhythmically, energetic body bounce
      if (armR) {
        armR.rotation.z = -PI * 0.35;
        armR.rotation.x = -PI * 0.4 + sin(tm * 5.5) * PI * 0.35;
      }
      if (armL) { armL.rotation.z = 0.2; }
      if (spine) { spine.rotation.x = sin(tm * 5.5) * 0.06; }
      if (head) { head.rotation.x = sin(tm * 5.5) * 0.05; }
      break;
    }
    case "peace": {
      // V sign — arm slightly raised with gentle sway
      if (armR) {
        armR.rotation.z = -PI * 0.35 + sin(tm * 1.2) * 0.08;
        armR.rotation.x = -PI * 0.15;
      }
      if (armL) { armL.rotation.z = 0.1; }
      if (head) { head.rotation.z = sin(tm * 1.0) * 0.08; }
      if (spine) { spine.rotation.z = sin(tm * 1.0) * 0.03; }
      break;
    }
    case "dance": {
      // Groove in place: body sway + arm swing + head bob
      if (spine) {
        spine.rotation.z = sin(tm * 3.0) * 0.15;
        spine.rotation.y = sin(tm * 1.5) * 0.12;
      }
      if (armL) {
        armL.rotation.z = PI * 0.2 + sin(tm * 3.0 + PI) * 0.45;
        armL.rotation.x = cos(tm * 1.5) * 0.2;
      }
      if (armR) {
        armR.rotation.z = -(PI * 0.2 + sin(tm * 3.0) * 0.45);
        armR.rotation.x = cos(tm * 1.5 + PI) * 0.2;
      }
      if (head) {
        head.rotation.z = sin(tm * 3.0) * 0.08;
        head.rotation.y = sin(tm * 1.5) * 0.1;
      }
      break;
    }
    default:
      break;
  }
}

// ─── PUBLIC: updateAvatarAnimation ───────────────────────────
// isHoverboarding: when true, locks avatar in idle pose — feet stay planted on board.
export function updateAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding = false) {
  if (!entry || !entry.mixer) return;
  entry.mixer.update(dt);

  // Hoverboard mode: freeze in idle — no walking/running animation at all
  if (isHoverboarding) {
    if (entry.clips.idle) {
      crossFade(entry, "idle", 0.35);
      entry.clips.idle.setEffectiveTimeScale(0.0); // fully frozen pose
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.35);
      entry.clips.walk.setEffectiveTimeScale(0.0);
    }
    return;
  }

  if (isDancing) {
    // Lock to idle/walk at slow speed and apply procedural emote pose on top
    const key = entry.clips.idle ? "idle" : entry.clips.walk ? "walk" : null;
    if (key) {
      crossFade(entry, key, 0.3);
      // Run idle at 0.6x — subtle body sway from base animation
      entry.clips[key].setEffectiveTimeScale(0.6);
    }
    applyEmotePose(entry, dt);
    return;
  }

  // Reset emote state when not dancing
  if (entry._emote) {
    entry._emote = null;
    entry._emoteTimer = 0;
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
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.3);
      entry.clips.walk.setEffectiveTimeScale(0.0);
    }
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

// ─── PUBLIC: attachHoverboard / detachHoverboard ──────────────
// Attaches a glowing hoverboard mesh as a child of the avatar model node
// (not the controller root) so it moves WITH the character in world space.
export function attachHoverboard(entry) {
  if (!entry?.root) return;
  if (entry.root.getObjectByName("avatarHoverboard")) return; // already attached

  const board = new THREE.Group();
  board.name = "avatarHoverboard";

  // Main deck — Z is forward direction in world, so board runs front-to-back
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.06, 0.75),
    new THREE.MeshStandardMaterial({ color: new THREE.Color("#080818"), roughness: 0.06, metalness: 0.98 })
  );
  deck.castShadow = true;
  board.add(deck);

  // Top center glow stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.022, 0.68),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#00E5FF"), transparent: true, opacity: 0.92, depthWrite: false })
  );
  stripe.position.y = 0.042;
  board.add(stripe);
  board.userData.stripeMat = stripe.material;

  // Left/right side rail glows
  for (const bx of [-0.17, 0.17]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.02, 0.72),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#C43BFF"), transparent: true, opacity: 0.8, depthWrite: false })
    );
    rail.position.set(bx, 0.041, 0);
    board.add(rail);
  }

  // Nose/tail kick-ups (front and back)
  for (const bz of [-0.40, 0.40]) {
    const kick = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.035, 0.055),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#0E0E22"), roughness: 0.08, metalness: 0.95 })
    );
    kick.position.set(0, 0.05, bz);
    kick.rotation.x = bz < 0 ? -0.28 : 0.28;
    board.add(kick);
  }

  // 4 corner thruster nozzles
  for (const bx of [-0.12, 0.12]) {
    for (const bz of [-0.30, 0.30]) {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.052, 0.045, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color("#00CCFF"), transparent: true, opacity: 0.88, depthWrite: false })
      );
      nozzle.position.set(bx, -0.038, bz);
      board.add(nozzle);

      // Downward thruster glow cone
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.10, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color("#00E5FF"), transparent: true, opacity: 0.32, depthWrite: false })
      );
      cone.rotation.x = Math.PI;
      cone.position.set(bx, -0.11, bz);
      board.add(cone);
    }
  }

  // Ground hover disc — projects glow under the board
  const discMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00AAFF"),
    transparent: true, opacity: 0.20, depthWrite: false, side: THREE.DoubleSide
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.30, 24), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.20;
  disc.renderOrder = 1;
  board.add(disc);
  board.userData.hoverDisc = discMat;

  // Attach board to controller root — it is moved each frame via avatar.position.set()
  // so the board moves identically with the avatar.
  // Y offset puts it just below the character's feet (GLB feet ≈ y=0 on controller).
  board.position.set(0, -0.05, 0);
  board.rotation.set(0, 0, 0); // ensure no inherited rotation weirdness

  entry.root.add(board);
  entry._hbBoard = board; // quick ref for animation
}

export function detachHoverboard(entry) {
  if (!entry?.root) return;
  const board = entry.root.getObjectByName("avatarHoverboard");
  if (board) {
    board.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    entry.root.remove(board);
  }
  entry._hbBoard = null;
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