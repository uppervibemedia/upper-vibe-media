/**
 * AvatarModelMixamo — loads the Three.js Xbot (Mixamo-rigged) GLB which already
 * contains Idle, Walk, Run and Dance animations baked in.
 * URL is raw.githubusercontent.com (CORS-open).
 *
 * Exported API matches AvatarModelTest so CityCanvas can swap seamlessly:
 *   createMixamoAvatar(scene, config, onReady) → entry
 *   updateMixamoAvatarAnimation(entry, speed, isDancing, dt)
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// The Three.js team hosts this Mixamo Xbot with Idle/Walk/Run/Dance clips.
const XBOT_URL =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb";

const _loader = new GLTFLoader();
let _cached = null; // cache the parsed GLTF so multiple remounts don't re-download

// ── Cross-fade helper ──────────────────────────────────────────
function crossFade(from, to, duration) {
  if (from === to) return;
  to.reset();
  to.play();
  if (from) from.crossFadeTo(to, duration, true);
}

// ── Shadow disc ───────────────────────────────────────────────
function makeShadowDisc() {
  const geo = new THREE.CircleGeometry(0.35, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(geo, mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.005;
  disc.renderOrder = 1;
  return disc;
}

// ── Nameplate sprite ──────────────────────────────────────────
function makeNameplate(label) {
  const cvs = document.createElement("canvas");
  cvs.width = 256; cvs.height = 48;
  const ctx = cvs.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect?.(4, 4, 248, 40, 8) ||
    ctx.fillRect(4, 4, 248, 40);
  ctx.fill();
  ctx.fillStyle = "#00E5FF";
  ctx.font = "bold 22px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label || "Avatar", 128, 24);
  const tex = new THREE.CanvasTexture(cvs);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 0.3, 1);
  sprite.position.y = 2.1; // above head
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * createMixamoAvatar
 * @param {THREE.Scene} scene
 * @param {object} config  — { label }
 * @param {function} onReady  — called with entry once loaded
 * @returns entry — controller object (root placed immediately, model attaches async)
 */
export function createMixamoAvatar(scene, config = {}, onReady = () => {}) {
  const root = new THREE.Group();
  root.name = "mixamoAvatarRoot";
  scene.add(root);
  root.add(makeShadowDisc());

  const nameLabel = config.label || "";
  if (nameLabel) root.add(makeNameplate(nameLabel));

  const entry = {
    root,
    mixer: null,
    clips: {},          // { idle, walk, run, dance }
    _activeClip: null,
    _isTestAvatar: true, // flag so CityCanvas calls updateMixamoAvatarAnimation
    _isMixamo: true,
  };

  // Use cached GLTF to avoid double-download
  const onGltf = (gltf) => {
    _cached = gltf;
    const model = gltf.scene.clone(true);

    // Xbot is huge — scale to ~1.75m humanoid
    model.scale.setScalar(0.011);
    model.position.y = 0;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    root.add(model);

    // Build mixer + clip map
    const mixer = new THREE.AnimationMixer(model);
    entry.mixer = mixer;

    // Xbot baked clips — names vary slightly; match by prefix
    const names = { idle: null, walk: null, run: null, dance: null };
    for (const clip of gltf.animations) {
      const n = clip.name.toLowerCase();
      if (n.includes("idle"))  names.idle  = clip;
      if (n.includes("walk"))  names.walk  = clip;
      if (n.includes("run"))   names.run   = clip;
      if (n.includes("dance") || n.includes("hip hop")) names.dance = clip;
    }

    for (const [key, clip] of Object.entries(names)) {
      if (clip) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        entry.clips[key] = action;
      }
    }

    // Start with idle
    if (entry.clips.idle) {
      entry.clips.idle.play();
      entry._activeClip = "idle";
    }

    onReady(entry);
  };

  if (_cached) {
    onGltf(_cached);
  } else {
    _loader.load(
      XBOT_URL,
      onGltf,
      undefined,
      (err) => console.warn("[AvatarModelMixamo] load error:", err)
    );
  }

  return entry;
}

/**
 * updateMixamoAvatarAnimation
 * Called every frame from CityCanvas animate loop.
 */
export function updateMixamoAvatarAnimation(entry, speed, isDancing, dt) {
  if (!entry?.mixer) return;
  entry.mixer.update(dt);

  const { clips, _activeClip } = entry;

  let desired;
  if (isDancing && clips.dance) {
    desired = "dance";
  } else if (speed > 2.5 && clips.run) {
    desired = "run";
  } else if (speed > 0.2 && clips.walk) {
    desired = "walk";
  } else {
    desired = "idle";
  }

  if (!clips[desired]) desired = "idle";
  if (!clips[desired]) return; // nothing loaded yet

  if (_activeClip !== desired) {
    crossFade(clips[_activeClip] || null, clips[desired], 0.25);
    entry._activeClip = desired;
  }
}