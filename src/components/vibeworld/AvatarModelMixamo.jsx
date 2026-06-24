/**
 * AvatarModelMixamo — Mixamo Xbot test avatar.
 * Uses the EXACT same animation logic as the soldier avatar (AvatarModel.js).
 * Movement, camera, hoverboard, zones — all identical to the soldier.
 *
 * The soldier avatar remains the default. This is a TEST option only.
 * Do NOT set as default until explicitly approved.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

// Xbot GLB — hosted by Three.js team, CORS-open, has Idle/Walk/Run/Dance baked in
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

// ── Shadow disc (same as soldier) ────────────────────────────
function makeShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  return m;
}

// ── Cross-fade helper — IDENTICAL to soldier's crossFade ─────
function crossFade(entry, toKey, duration = 0.22) {
  if (!entry.clips[toKey] || entry.currentAnim === toKey) return;
  const from = entry.clips[entry.currentAnim];
  const to   = entry.clips[toKey];
  to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (from) from.crossFadeTo(to, duration, true);
  entry.currentAnim = toKey;
}

// ── Attach Xbot model as child of controller ─────────────────
function attachMixamoModel(gltf, controllerGroup) {
  const existing = controllerGroup.getObjectByName("avatarModel");
  if (existing) controllerGroup.remove(existing);

  // Clone scene for Xbot (unlike soldier which uses scene directly — Xbot needs clone
  // because it's called once and we want clean state)
  const model = gltf.scene.clone(true);
  model.name = "avatarModel";
  model.position.set(0, 0, 0);
  // Xbot faces +Z by default; rotate 180° so it faces same direction as soldier
  model.rotation.set(0, Math.PI, 0);
  // Scale: Xbot is huge (220cm), scale to ~1.75m to match soldier height
  model.scale.setScalar(0.011);

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      // Mobile perf: downgrade to standard material if physics-heavy
      if (child.material?.type === "MeshPhysicalMaterial") {
        const old = child.material;
        const std = new THREE.MeshStandardMaterial({
          color: old.color,
          map: old.map,
          roughness: 0.6,
          metalness: 0.1,
        });
        child.material = std;
        old.dispose();
      }
    }
  });

  controllerGroup.add(model);

  // Build AnimationMixer — target the model (same as soldier pattern)
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};

  for (const clip of gltf.animations) {
    const n = clip.name.toLowerCase();
    let key = null;
    if (n.includes("idle"))  key = "idle";
    else if (n.includes("walk"))  key = "walk";
    else if (n.includes("run"))   key = "run";
    else if (n.includes("dance") || n.includes("hip")) key = "dance";
    if (key) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      clips[key] = action;
    }
  }

  // Play idle immediately — never leave in T/A-pose
  const startKey = clips.idle ? "idle" : clips.walk ? "walk" : Object.keys(clips)[0];
  if (startKey && clips[startKey]) {
    clips[startKey].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }

  return { mixer, clips, currentAnim: startKey || "idle" };
}

// ── PUBLIC: createMixamoAvatar ────────────────────────────────
// Mirrors createAvatar() from AvatarModel.js exactly.
// Returns entry immediately; model loads async.
export function createMixamoAvatar(scene, opts = {}, onReady) {
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  controller.add(makeShadow());
  scene.add(controller);

  const entry = {
    root: controller,   // CityCanvas stores this in avatarRef — same contract as soldier
    mixer: null,
    clips: {},
    currentAnim: "idle",
    _isMixamo: true,    // flag so CityCanvas calls updateMixamoAvatarAnimation
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
      // Capsule fallback — controller still moves correctly
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
// Speed thresholds, hoverboard freeze, dance handling — all the same.
export function updateMixamoAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding = false) {
  if (!entry || !entry.mixer) return;
  entry.mixer.update(dt);

  // Hoverboard: freeze in idle — feet planted on board (same as soldier)
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

  // Locomotion — same thresholds as soldier
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