import * as THREE from 'three';

export function createTestAvatar(scene, gender, avatarConfig, callback) {
  const group = new THREE.Group();
  scene.add(group);
  return { root: group };
}

export function updateTestAvatarAnimation(entry, speed, isDancing, dt) {
  // Animation logic here
}

export function retintTestAvatar(entry, hexColor) {
  // Retinting logic here
}