import React from 'react';
import * as THREE from 'three';

const { MeshStandardMaterial, Color, BoxGeometry, Mesh, Group } = THREE;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

export function createVibeShop(scene) {
  const shop = new Group();
  shop.name = "vibeShop";

  const shopPlat = new Mesh(
    new THREE.CylinderGeometry(6, 6.2, 0.2, 48),
    mat("#1A1A2A", { roughness: 0.4, metalness: 0.2 })
  );
  shopPlat.position.set(0, 0.1, 4);
  shopPlat.receiveShadow = true;
  shop.add(shopPlat);

  const shopBuilding = new Mesh(
    new BoxGeometry(8, 4, 5),
    mat("#1C1C30", { roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.9 })
  );
  shopBuilding.position.set(0, 2.1, 4);
  shopBuilding.castShadow = true;
  shop.add(shopBuilding);

  scene.add(shop);
}