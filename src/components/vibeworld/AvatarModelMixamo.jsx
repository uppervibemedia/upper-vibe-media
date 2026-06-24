/**
 * AvatarModelMixamo — "Human Test" avatar using Three.js Soldier.glb.
 *
 * Soldier.glb has Idle, Walk, Run animations baked in and is the exact
 * model used in the official Three.js SkeletonUtils.clone() demo.
 *
 * Uses SkeletonUtils.clone() to correctly rebind SkinnedMesh bones —
 * plain .clone(true) detaches bones → permanent T-pose.
 *
 * Controller Group pattern mirrors the original soldier avatar:
 *   entry.root  → CityCanvas moves this every frame (position + rotation)
 *   shadow disc → child of root, always stays under feet
 *   model       → child of root, moves with it
 *
 * TEST ONLY — original soldier remains the permanent default.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

// Soldier.glb from Three.js CDN — confirmed to have Idle/Walk/Run clips
const SOLDIER_URL =
  "https://threejs.org/examples/models/gltf/Soldier.glb";

const _loader = new GLTFLoader();
let _gltfCache = null;
let _gltfPromise = null;

function loadGLTF() {
  if (_gltfCache) return Promise.resolve(_gltfCache);
  if (_gltfPromise) return _gltfPromise;
  _gltfPromise = new Promise((resolve, reject) => {
    _loader.load(
      SOLDIER_URL,
      (g) => { _gltfCache = g; resolve(g); },
      undefined,
      (e) => { _gltfPromise = null; reject(e); }
    );
  });
  return _gltfPromise;
}

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

function crossFade(entry, toKey, duration = 0.22) {
  if (!entry.clips[toKey] || entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to   = entry.clips[toKey];
  to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (from) from.crossFadeTo(to, duration, true);
  entry.currentAnim = toKey;
}

function attachModel(gltf, controllerGroup) {
  // Remove stale model if re-attaching
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

  // SkeletonUtils.clone rebinds bones correctly — fixes T-pose
  const model = SkeletonUtils.clone(gltf.scene);
  model.name = "avatarModel";
  model.position.set(0, 0, 0);
  // Soldier faces +Z by default; rotate 180° so it faces -Z (toward stage, matching spawn)
  model.rotation.set(0, Math.PI, 0);
  // Soldier is ~1.8m — scale up slightly so it matches scene scale
  model.scale.setScalar(1.0);

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    // Tint the model slightly to distinguish from default soldier
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        if (mat.color) mat.color.multiplyScalar(1.1); // slightly brighter
      });
    }
  });

  // Add to controller BEFORE creating mixer
  controllerGroup.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const clips = {};

  for (const clip of gltf.animations) {
    const n = clip.name.toLowerCase();
    let key = null;
    if      (n.includes("idle"))  key = "idle";
    else if (n.includes("walk"))  key = "walk";
    else if (n.includes("run"))   key = "run";
    if (key && !clips[key]) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      clips[key] = action;
    }
  }

  // Start idle immediately — never leave in T-pose
  const startKey = clips.idle ? "idle" : clips.walk ? "walk" : Object.keys(clips)[0];
  if (startKey && clips[startKey]) {
    clips[startKey].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }

  console.log("[AvatarModelMixamo] loaded clips:", Object.keys(clips), "starting:", startKey);
  return { mixer, clips, currentAnim: startKey || "idle" };
}

// ── PUBLIC: createMixamoAvatar ────────────────────────────────────────────
export function createMixamoAvatar(scene, opts = {}, onReady) {
  const sx = opts.spawnX ?? 0;
  const sy = opts.spawnY ?? 0;
  const sz = opts.spawnZ ?? 5;

  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(sx, sy, sz);
  controller.add(makeShadow());
  scene.add(controller);

  const entry = {
    root: controller,
    mixer: null,
    clips: {},
    currentAnim: "idle",
    _isMixamo: true,
  };

  loadGLTF()
    .then((gltf) => {
      const { mixer, clips, currentAnim } = attachModel(gltf, controller);
      entry.mixer = mixer;
      entry.clips = clips;
      entry.currentAnim = currentAnim;
      onReady?.(entry);
    })
    .catch((err) => {
      console.warn("[AvatarModelMixamo] GLB load failed:", err);
      // Capsule fallback so movement still works
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

// ── PUBLIC: updateMixamoAvatarAnimation ──────────────────────────────────
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
    if (entry.clips.idle) {
      crossFade(entry, "idle", 0.3);
      entry.clips.idle.setEffectiveTimeScale(0.6);
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