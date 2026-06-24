/**
 * AvatarModelMixamo — Mixamo Xbot test avatar.
 *
 * CRITICAL FIX: Regular .clone(true) BREAKS SkinnedMesh — bones detach
 * from the mesh, causing T-pose and broken animations. Must use
 * SkeletonUtils.clone() which correctly rebinds skeleton per clone.
 *
 * Uses the EXACT same controller Group pattern as soldier (AvatarModel.js):
 *   entry.root = controller Group (moved every frame by CityCanvas)
 *   shadow disc is a child of controller → moves with it automatically
 *   model is a child of controller → moves with it automatically
 *
 * TEST ONLY — soldier remains the default.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

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

// Black ground circle — same as soldier's makeShadow()
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

// crossFade — identical to soldier's
function crossFade(entry, toKey, duration = 0.22) {
  if (!entry.clips[toKey] || entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to   = entry.clips[toKey];
  to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (from) from.crossFadeTo(to, duration, true);
  entry.currentAnim = toKey;
}

function attachMixamoModel(gltf, controllerGroup) {
  // Remove any stale model
  const existing = controllerGroup.getObjectByName("avatarModel");
  if (existing) {
    existing.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    controllerGroup.remove(existing);
  }

  // SkeletonUtils.clone correctly rebinds bones per instance — fixes T-pose
  const model = SkeletonUtils.clone(gltf.scene);
  model.name = "avatarModel";
  model.position.set(0, 0, 0);
  // Xbot faces +Z; rotate 180° so it faces -Z like soldier
  model.rotation.set(0, Math.PI, 0);
  // Xbot is ~200cm — scale to ~1.75m to match soldier height
  model.scale.setScalar(0.011);

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    // Replace heavy MeshPhysicalMaterial for mobile perf
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

  // Mixer targets the correctly-cloned model
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};

  for (const clip of gltf.animations) {
    const n = clip.name.toLowerCase();
    let key = null;
    if      (n.includes("idle"))                              key = "idle";
    else if (n.includes("walk"))                              key = "walk";
    else if (n.includes("run"))                               key = "run";
    else if (n.includes("dance") || n.includes("hip hop"))   key = "dance";
    if (key && !clips[key]) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      clips[key] = action;
    }
  }

  // Play idle immediately — never leave in T-pose
  const startKey = clips.idle ? "idle" : clips.walk ? "walk" : Object.keys(clips)[0];
  if (startKey && clips[startKey]) {
    clips[startKey].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }

  return { mixer, clips, currentAnim: startKey || "idle" };
}

// ── PUBLIC: createMixamoAvatar ────────────────────────────────
export function createMixamoAvatar(scene, opts = {}, onReady) {
  const sx = opts.spawnX ?? 0;
  const sy = opts.spawnY ?? 0;
  const sz = opts.spawnZ ?? 5;

  // Controller Group = movement root. CityCanvas does:
  //   avatar.position.set(px,py,pz)  ← moves controller → model + shadow move with it
  //   avatar.rotation.y = rot        ← rotates controller → model faces direction
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(sx, sy, sz);
  controller.add(makeShadow()); // shadow is child → always stays under feet
  scene.add(controller);

  const entry = {
    root: controller,      // CityCanvas: avatarRef.current = entry.root
    mixer: null,
    clips: {},
    currentAnim: "idle",
    _isMixamo: true,       // CityCanvas calls updateMixamoAvatarAnimation
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
      console.warn("[AvatarModelMixamo] load failed:", err);
      // Capsule fallback — at least moveable
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
// Identical logic to updateAvatarAnimation() in AvatarModel.js
export function updateMixamoAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding = false) {
  if (!entry?.mixer) return;
  entry.mixer.update(dt);

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

  if (isDancing) {
    const key = entry.clips.idle ? "idle" : entry.clips.walk ? "walk" : null;
    if (key) {
      crossFade(entry, key, 0.3);
      entry.clips[key].setEffectiveTimeScale(0.6);
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
    } else if (entry.clips.walk) {
      crossFade(entry, "walk", 0.3);
      entry.clips.walk.setEffectiveTimeScale(0.0);
    }
  }
}