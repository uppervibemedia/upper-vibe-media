/**
 * VibeLaunchZone — launch pads, floating orbs, launch physics for CityCanvas.
 * All Three.js objects; exported as pure scene-building helpers.
 * Import in CityCanvas.jsx and call buildLaunchZone(scene) + animateLaunchZone(scene, t).
 */

import * as THREE from "three";

// Launch pad positions in the wide-open plaza area
export const LAUNCH_PADS = [
  { x: 6,  z: 2,  color: "#00D4F0" },
  { x: -6, z: 2,  color: "#C43BFF" },
  { x: 0,  z: 7,  color: "#9B7EFF" },
];

export const LAUNCH_PAD_RADIUS = 1.1;
export const LAUNCH_HEIGHT = 9.0;       // peak height above ground
export const LAUNCH_DURATION = 1.4;     // seconds to reach peak
export const GLIDE_DURATION  = 1.8;     // seconds to fall back down

// Orb positions (above the launch zone)
const ORB_DEFS = [
  { x: 4,   y: 5.5, z: 2,  color: "#00E5FF" },
  { x: -4,  y: 6.0, z: 1,  color: "#C43BFF" },
  { x: 1,   y: 7.5, z: 5,  color: "#FFD700" },
  { x: -2,  y: 5.0, z: 5,  color: "#9B7EFF" },
  { x: 0,   y: 8.5, z: 4,  color: "#FF4FC3" },
];

export function buildLaunchZone(scene) {
  const group = new THREE.Group();
  group.name = "VibeLaunchZone";

  // ── Launch pads ────────────────────────────────────────────
  LAUNCH_PADS.forEach((pad, i) => {
    const padGroup = new THREE.Group();
    padGroup.name = `launchPad_${i}`;
    padGroup.userData = { isPad: true, padIndex: i };

    // Platform disc
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(LAUNCH_PAD_RADIUS, LAUNCH_PAD_RADIUS * 1.1, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(pad.color), roughness: 0.2, metalness: 0.7 })
    );
    disc.position.y = 0.06;
    disc.castShadow = true;
    disc.receiveShadow = true;
    padGroup.add(disc);

    // Glow ring on floor
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(pad.color), transparent: true, opacity: 0.45,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(LAUNCH_PAD_RADIUS, LAUNCH_PAD_RADIUS + 0.25, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    ring.renderOrder = 1;
    ring.userData = { isLaunchRing: true, padColor: pad.color };
    padGroup.add(ring);

    // Inner energy glow disc
    const innerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(LAUNCH_PAD_RADIUS * 0.9, 32),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(pad.color), transparent: true, opacity: 0.18,
        depthWrite: false, side: THREE.DoubleSide,
      })
    );
    innerGlow.rotation.x = -Math.PI / 2;
    innerGlow.position.y = 0.015;
    innerGlow.renderOrder = 1;
    innerGlow.userData = { isInnerGlow: true };
    padGroup.add(innerGlow);

    // Arrow pointing up (vertical stripe)
    const arrowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff"), transparent: true, opacity: 0.55, depthWrite: false });
    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), arrowMat);
    arrow.position.y = 0.5;
    padGroup.add(arrow);

    // Cone tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 8), arrowMat);
    tip.position.y = 0.83;
    padGroup.add(tip);

    padGroup.position.set(pad.x, 0, pad.z);
    group.add(padGroup);
  });

  // ── Floating orbs ─────────────────────────────────────────
  const orbs = [];
  ORB_DEFS.forEach((o, i) => {
    const orbGroup = new THREE.Group();
    orbGroup.name = `vibeOrb_${i}`;
    orbGroup.userData = { isOrb: true, orbIndex: i, baseY: o.y, phase: i * 1.3, collected: false, respawnTimer: 0 };

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color) })
    );
    orb.renderOrder = 2;
    orbGroup.add(orb);

    // Orb halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color), transparent: true, opacity: 0.18, depthWrite: false })
    );
    halo.renderOrder = 1;
    orbGroup.add(halo);

    orbGroup.position.set(o.x, o.y, o.z);
    group.add(orbGroup);
    orbs.push(orbGroup);
  });

  scene.add(group);
  scene.userData.launchZone = { group, orbs, pads: LAUNCH_PADS };

  // "Jetpack Coming Soon" sign placeholder — far open area
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(155,126,255,0.7)";
  ctx.font = "bold 16px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🚀 Jetpack Station — Coming Soon", 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sign.scale.set(4, 1, 1);
  sign.position.set(0, 2.2, 12);
  sign.renderOrder = 99;
  scene.add(sign);
}

/**
 * Animate the launch zone: pulse pads, float orbs, handle orb respawn.
 * Call this from CityCanvas render loop.
 * @param {THREE.Scene} scene
 * @param {number} t  elapsed seconds
 * @param {number} audioBeat  0-1 beat intensity
 */
export function animateLaunchZone(scene, t, audioBeat = 0) {
  const lz = scene.userData.launchZone;
  if (!lz) return;

  // Pulse pads
  lz.group.children.forEach((child) => {
    if (!child.userData?.isPad) return;
    child.children.forEach((part) => {
      if (part.userData?.isLaunchRing && part.material) {
        part.material.opacity = 0.3 + Math.sin(t * 3 + child.position.x) * 0.2 + audioBeat * 0.2;
      }
      if (part.userData?.isInnerGlow && part.material) {
        part.material.opacity = 0.10 + Math.sin(t * 2) * 0.08;
      }
    });
  });

  // Float orbs
  lz.orbs.forEach((orb, i) => {
    const ud = orb.userData;
    if (ud.collected) {
      ud.respawnTimer -= 0.016;
      if (ud.respawnTimer <= 0) {
        ud.collected = false;
        orb.visible = true;
      }
      return;
    }
    orb.position.y = ud.baseY + Math.sin(t * 1.1 + ud.phase) * 0.28;
    orb.rotation.y += 0.02;
  });
}

/**
 * Check if avatar is near a launch pad.
 * Returns pad index or -1.
 */
export function getNearLaunchPad(px, pz) {
  for (let i = 0; i < LAUNCH_PADS.length; i++) {
    const pad = LAUNCH_PADS[i];
    const dx = px - pad.x, dz = pz - pad.z;
    if (Math.sqrt(dx * dx + dz * dz) < LAUNCH_PAD_RADIUS + 0.3) return i;
  }
  return -1;
}

/**
 * Check + collect orbs near airborne avatar position.
 * Returns array of collected orb indices.
 */
export function collectNearbyOrbs(scene, px, py, pz, radius = 0.9) {
  const lz = scene.userData.launchZone;
  if (!lz) return [];
  const collected = [];
  lz.orbs.forEach((orb, i) => {
    if (orb.userData.collected) return;
    const dx = px - orb.position.x;
    const dy = py - orb.position.y;
    const dz = pz - orb.position.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < radius) {
      orb.userData.collected = true;
      orb.userData.respawnTimer = 5.0;
      orb.visible = false;
      collected.push(i);
    }
  });
  return collected;
}