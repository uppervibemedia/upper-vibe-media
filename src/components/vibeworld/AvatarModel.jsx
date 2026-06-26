import * as THREE from 'three';

export function createAvatar(scene, avatarConfig, callback) {
  const group = new THREE.Group();
  scene.add(group);
  return { root: group };
}

export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle, outfitColor) {
  const group = new THREE.Group();
  scene.add(group);
  return group;
}

export function updateAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding) {
  // Animation logic here
}

export function retintAvatar(entry, hexColor) {
  // Retinting logic here
}

export function attachHoverboard(entry) {
  // Attachment logic here
}

export function detachHoverboard(entry) {
  // Detachment logic here
}