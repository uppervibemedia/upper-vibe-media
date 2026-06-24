/**
 * AvatarModelMixamo — Mixamo Xbot test avatar.
 *
 * Uses the EXACT same controller Group pattern as the soldier (AvatarModel.js).
 * The controller Group IS the movement root — CityCanvas moves it via
 *   avatar.position.set(px, py, pz) and avatar.rotation.y = rot
 * every frame, exactly like the soldier.
 *
 * KEY FIX: We always clone gltf.scene (not use it directly) so that
 * re-mounts from sessionStorage switching don't leave the model
 * orphaned in the old controller.
 *
 * TEST ONLY — soldier remains the default.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Three.js-hosted Xbot — CORS-open, has Idle/Walk/Run/Dance baked in
const XBOT_URL =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb";

const _loader = new GLTFLoader();
let _gltfCache = null;
let _gltfPromise = null;

function loadGLTF() {
  if (_gltfCache) return Promise.resolve(_gltfCache);
  if (_gltfPromise) return _gltfPromise;
  _gltfPromise = new Promise((resolve, reject) => {
    _loader.load(
      XBOT_URL,
      (g) => { _gltfCache = g; resolve(g); },
      undefined,
      (e) => { _gltfPromise = null; reject(e); }
    );
  });
  return _gltfPromise;
}

// ── Shadow disc — IDENTICAL to soldier's makeShadow() ────────
// This is the black circle under the avatar's feet.
function makeShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  return m;
}

// ── crossFade — IDENTICAL to soldier's crossFade ─────────────
function crossFade(entry, toKey, duration = 0.22) {
  if (!entry.clips[toKey] || entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to   = entry.clips[toKey];
  to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (from) from.crossFadeTo(to, duration, true);
  entry.currentAnim = toKey;
}

// ── Attach Xbot model as child of the controller Group ───────
function attachMixamoModel(gltf, controllerGroup) {
  // Remove any stale model first (handles React StrictMode double-mount)
  const existing = controllerGroup.getObjectByName("avatarModel");
  if (existing) controllerGroup.remove(existing);

  // ALWAYS clone — gltf.scene may already be parented somewhere else
  // (soldier avoids this by using scene directly since only 1 instance exists,
  //  but Mixamo can be remounted so we must clone)
  const model = gltf.scene.clone(true);
  model.name = "avatarModel";
  model.position.set(0, 0, 0);
  // Xbot faces +Z; rotate 180° so it faces -Z like the soldier
  model.rotation.set(0, Math.PI, 0);
  // Scale Xbot from ~200cm down to ~1.75m to match soldier height
  model.scale.setScalar(0.011);

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    // Mobile perf: replace heavy physical material with standard
    if (child.material?.type === "MeshPhysicalMaterial") {
      const old = child.material;
      child.material = new THREE.MeshStandardMaterial({
        color: old.color,
        map: old.map,
        roughness: 0.6,
        metalness: 0.1,
      });
      old.dispose();
    }
  });

  // Add to controller BEFORE creating AnimationMixer (Three.js requirement)
  controllerGroup.add(model);

  // AnimationMixer targets the cloned model
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};

  for (const clip of gltf.animations) {
    const n = clip.name.toLowerCase();
    let key = null;
    if (n.includes("idle"))                               key = "idle";
    else if (n.includes("walk"))                          key = "walk";
    else if (n.includes("run"))                           key = "run";
    else if (n.includes("dance") || n.includes("hip hop")) key = "dance";
    if (key && !clips[key]) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      clips[key] = action;
    }
  }

  // Play idle immediately — never leave in T/A-pose
  const startKey = clips.idle ? "idle"
    : clips.walk ? "walk"
    : Object.keys(clips)[0];
  if (startKey && clips[startKey]) {
    clips[startKey].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }

  return { mixer, clips, currentAnim: startKey || "idle" };
}

// ── PUBLIC: createMixamoAvatar ────────────────────────────────
// Mirrors createAvatar() from AvatarModel.js exactly.
//
// The controller Group is added to the scene at spawnPos and becomes
// entry.root — which CityCanvas stores in avatarRef.current.
// Every frame: avatar.position.set(px,py,pz) and avatar.rotation.y = rot
// moves this controller, pulling the model AND shadow disc with it.
//
// spawnPos is passed from CityCanvas so the controller starts at the
// correct effectiveSpawn position (not just the default SPAWN constant).
export function createMixamoAvatar(scene, opts = {}, onReady) {
  // Use spawn position from opts if provided, otherwise default to origin
  const sx = opts.spawnX ?? 0;
  const sy = opts.spawnY ?? 0;
  const sz = opts.spawnZ ?? 5;

  const controller = new THREE.Group();
  controller.name = "avatar";           // same name as soldier controller
  controller.position.set(sx, sy, sz);  // start at correct spawn position
  controller.add(makeShadow());         // black ground circle — child of controller
  scene.add(controller);

  // Same entry contract as soldier:
  //   entry.root   → CityCanvas avatarRef.current (moved every frame)
  //   entry.mixer  → populated async when GLB loads
  //   entry.clips  → populated async when GLB loads
  //   entry._isMixamo → tells CityCanvas to call updateMixamoAvatarAnimation
  const entry = {
    root: controller,
    mixer: null,
    clips: {},
    currentAnim: "idle",
    _isMixamo: true,
  };

  loadGLTF()
    .then((gltf) => {
      const { mixer, clips, currentAnim } = attachMixamoModel(gltf, controller);
      entry.mixer = mixer;
      entry.clips = clips;
      entry.currentAnim = currentAnim;
      onReady?.(entry);
    })
    .catch((err) => {
      console.warn("[AvatarModelMixamo] GLB load failed:", err);
      // Capsule fallback — controller still moves correctly with joystick/camera
      const cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.26, 1.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x44aadd })
      );
      cap.name = "avatarModel";
      cap.position.y = 0.82;
      controller.add(cap);
      onReady?.(entry);
    });

  return entry;
}

// ── PUBLIC: updateMixamoAvatarAnimation ──────────────────────
// IDENTICAL logic to updateAvatarAnimation() in AvatarModel.js.
// Same speed thresholds, hoverboard freeze, dance handling, timeScale math.
export function updateMixamoAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding = false) {
  if (!entry?.mixer) return;
  entry.mixer.update(dt);

  // Hoverboard: freeze in idle pose — feet stay planted on board (same as soldier)
  if (isHoverboarding) {
    if (entry.clips.idle) {
      crossFade(entry, "idle", 0.35);
      entry.clips.idle.setEffectiveTimeScale(0.0);
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.35);
      entry.clips.walk.setEffectiveTimeScale(0.0);
    }
    return;
  }

  // Dancing — slow idle/walk to a sway (same as soldier)
  if (isDancing) {
    const key = entry.clips.idle ? "idle" : entry.clips.walk ? "walk" : null;
    if (key) {
      crossFade(entry, key, 0.3);
      entry.clips[key].setEffectiveTimeScale(0.6);
    }
    return;
  }

  // Locomotion — exact same thresholds and timeScale math as soldier
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