import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * loadRPMAvatar
 * Loads a Ready Player Me GLB avatar into the scene.
 * Returns the root THREE.Group.
 *
 * @param {THREE.Scene} scene
 * @param {string} glbUrl — the .glb URL from Ready Player Me
 * @param {object} opts — { x, y, z } initial position
 * @param {function} onLoaded — callback(group) when ready
 * @returns {THREE.Group} placeholder group (replaced when GLB loads)
 */
export function loadRPMAvatar(scene, glbUrl, opts = {}, onLoaded) {
  const loader = new GLTFLoader();

  // Placeholder group so CityCanvas can position/rotate immediately
  const placeholder = new THREE.Group();
  placeholder.name = "avatar";
  placeholder.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  scene.add(placeholder);

  // Append ?morphTargets=ARKit&textureAtlas=1024 for optimized export
  const url = glbUrl.includes("?")
    ? glbUrl
    : glbUrl + "?morphTargets=ARKit&textureAtlas=1024";

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.name = "avatar";

      // RPM avatars are exported at 1:1 metre scale — fits our world
      model.scale.setScalar(1.0);

      // Cast/receive shadows on all meshes
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Ensure materials are correctly set up for the world lighting
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              m.envMapIntensity = 0.6;
            });
          }
        }
      });

      // Copy position/rotation from placeholder
      model.position.copy(placeholder.position);
      model.rotation.copy(placeholder.rotation);

      // Swap placeholder for real model
      scene.remove(placeholder);
      scene.add(model);

      if (onLoaded) onLoaded(model);
    },
    undefined,
    (err) => {
      console.error("[RPMLoader] Failed to load GLB:", err);
      // Keep placeholder so world doesn't break
      if (onLoaded) onLoaded(placeholder);
    }
  );

  return placeholder;
}

/**
 * loadRemoteRPMAvatar — same as above but for remote users.
 * Adds a name label above the head.
 */
export function loadRemoteRPMAvatar(scene, glbUrl, userId, username, opts = {}, onLoaded) {
  const loader = new GLTFLoader();

  const group = new THREE.Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, walkTime: 0, speed: 0 };
  group.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  scene.add(group);

  // Name label
  const nc = document.createElement("canvas");
  nc.width = 256; nc.height = 54;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 18px 'Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText((username || "User").substring(0, 16), 128, 27);
  const nt = new THREE.CanvasTexture(nc);
  nt.minFilter = THREE.LinearFilter;
  nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false })
  );
  ns.scale.set(1.4, 0.34, 1);
  ns.position.y = 2.2; // above head
  ns.renderOrder = 999;
  group.add(ns);

  const url = glbUrl.includes("?") ? glbUrl : glbUrl + "?morphTargets=ARKit&textureAtlas=1024";

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(1.0);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      group.add(model);
      if (onLoaded) onLoaded(group);
    },
    undefined,
    (err) => {
      console.error("[RPMLoader] Remote GLB failed:", err);
      if (onLoaded) onLoaded(group);
    }
  );

  return group;
}