/**
 * AvatarModelRPM.js
 * TEST-ONLY: Loads a Ready Player Me avatar GLB + retargets official RPM animation GLBs.
 * Uses the RPM animation library (MIT) from GitHub for idle, walk, run, dance.
 * Does NOT replace the current avatar system.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SPAWN } from "./cityData";

const LOADER = new GLTFLoader();

// ─── RPM Demo Avatar (public, no auth required) ───────────────────────────────
// This is a publicly available RPM avatar used in official RPM three.js demos
const AVATAR_URL = "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=none&textureAtlas=none&lod=0";

// ─── RPM Official Animation Library (raw GitHub CDN) ─────────────────────────
const ANIM_BASE = "https://raw.githubusercontent.com/readyplayerme/animation-library/master/masculine/glb";
const ANIM_URLS = {
  idle:  `${ANIM_BASE}/idle/M_Standing_Idle_001.glb`,
  walk:  `${ANIM_BASE}/locomotion/M_Walk_001.glb`,
  run:   `${ANIM_BASE}/locomotion/F_Run_001.glb`,
  dance: `${ANIM_BASE}/dance/M_Dances_001.glb`,
};

// Simple cache so re-mounting doesn't re-download
const _cache = {};
function loadGLB(url) {
  if (_cache[url]) return Promise.resolve(_cache[url]);
  return new Promise((resolve, reject) => {
    LOADER.load(url, (g) => { _cache[url] = g; resolve(g); }, undefined, reject);
  });
}

/**
 * Retarget an animation clip from a source skeleton to a target skeleton.
 * Matches bones by name — RPM skeletons are consistent across all animation GLBs.
 */
function retargetClip(clip, targetMesh) {
  const bones = {};
  targetMesh.traverse((n) => { if (n.isBone) bones[n.name] = true; });

  const validTracks = clip.tracks.filter((track) => {
    const boneName = track.name.split(".")[0];
    return bones[boneName];
  });

  return new THREE.AnimationClip(clip.name, clip.duration, validTracks);
}

/**
 * Cross-fade between two animation actions smoothly.
 */
function crossFade(from, to, duration = 0.25) {
  if (!to) return;
  if (from === to) return;
  to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
  if (from) {
    from.crossFadeTo(to, duration, true);
  }
  to.play();
}

/**
 * createRPMAvatar(scene, opts, onReady)
 * Returns an entry object immediately; populates mixer/clips async after GLB loads.
 */
export function createRPMAvatar(scene, opts = {}, onReady) {
  // Controller group — positioned immediately, model attaches when loaded
  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);

  // Shadow disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  controller.add(shadow);
  scene.add(controller);

  const entry = {
    root: controller,
    mixer: null,
    clips: {},
    currentAnim: "idle",
    _currentAction: null,
    _isTestAvatar: true,
    _testGender: "rpm",
  };

  // Load avatar + all animations in parallel
  Promise.all([
    loadGLB(AVATAR_URL),
    ...Object.entries(ANIM_URLS).map(([key, url]) =>
      loadGLB(url).then((g) => ({ key, gltf: g })).catch(() => null)
    ),
  ])
    .then(([avatarGltf, ...animResults]) => {
      const model = avatarGltf.scene.clone(true);
      model.name = "avatarModel";

      // RPM avatars are Y-up and face +Z — flip 180° to face -Z (toward stage)
      model.rotation.set(0, Math.PI, 0);
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Ensure materials render correctly
          if (child.material) {
            child.material.side = THREE.FrontSide;
          }
        }
      });
      controller.add(model);

      // Find the SkinnedMesh root for retargeting
      let skinnedMesh = null;
      model.traverse((n) => { if (n.isSkinnedMesh && !skinnedMesh) skinnedMesh = n; });

      const mixer = new THREE.AnimationMixer(model);
      entry.mixer = mixer;

      // Retarget and register each animation
      for (const result of animResults) {
        if (!result) continue;
        const { key, gltf } = result;
        const clip = gltf.animations?.[0];
        if (!clip) continue;

        let finalClip = clip;
        if (skinnedMesh) {
          try { finalClip = retargetClip(clip, model); } catch {}
        }
        finalClip.name = key;
        const action = mixer.clipAction(finalClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        entry.clips[key] = action;
      }

      // Start idle
      const idleAction = entry.clips["idle"];
      if (idleAction) {
        idleAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        entry._currentAction = idleAction;
        entry.currentAnim = "idle";
      }

      onReady?.(entry);
    })
    .catch((err) => {
      console.error("[RPMAvatar] Load failed:", err);
      // Fallback capsule so the slot isn't empty
      const cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 1.15, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x7C3AED })
      );
      cap.position.y = 0.85;
      controller.add(cap);
      onReady?.(entry);
    });

  return entry;
}

/**
 * updateRPMAvatarAnimation(entry, speed, isDancing, dt)
 * Called every frame from the CityCanvas animation loop.
 */
export function updateRPMAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry?.mixer || !entry?.clips) return;

  entry.mixer.update(dt);

  // Determine target animation key
  let targetKey;
  if (isDancing) {
    targetKey = "dance";
  } else if (speed > 2.0) {
    targetKey = "run";
  } else if (speed > 0.15) {
    targetKey = "walk";
  } else {
    targetKey = "idle";
  }

  if (targetKey !== entry.currentAnim && entry.clips[targetKey]) {
    crossFade(entry._currentAction, entry.clips[targetKey]);
    entry._currentAction = entry.clips[targetKey];
    entry.currentAnim = targetKey;
  }
}