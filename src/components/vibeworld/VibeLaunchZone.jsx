/**
 * VibeLaunchZone — improved launch pads, orb path, and collection.
 *
 * Key improvements:
 * - 3 pads in open plaza (not beach), better visuals
 * - Orbs placed along launch arc so they are collectible mid-air
 * - Large collection radius (2.0 world units = easy to grab)
 * - Landing pulse ring spawned on ground after flight
 * - No auto-launch — pads only signal proximity; UpperVibeCity gates the button
 */

import * as THREE from "three";

// ── Launch pad world positions — open plaza near dance floor ──
export const LAUNCH_PADS = [
  { x: -5,  z: 9,  color: "#00D4F0", label: "PAD A" },
  { x:  5,  z: 9,  color: "#9B7EFF", label: "PAD B" },
  { x:  0,  z: 13, color: "#FF4FC3", label: "PAD C" },
];

export const LAUNCH_PAD_RADIUS  = 1.2;   // walk-on detection radius
export const LAUNCH_HEIGHT      = 9.0;   // peak above ground (world units)
export const LAUNCH_DURATION    = 1.5;   // seconds to reach peak
export const GLIDE_DURATION     = 2.0;   // seconds to fall back down
export const ORB_COLLECT_RADIUS = 2.0;   // generous hitbox (world units)

// ── Orb path: placed along the launch arc so they're reachable mid-flight ──
// Heights are relative to ground (y=0). Each pad triggers the same arc layout
// offset by the pad's x/z center.
const ORB_OFFSETS = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function makePadMesh(pad) {
  const group = new THREE.Group();
  group.name = `launchPad_${pad.label}`;
  group.userData = { isPad: true, padColor: pad.color, destination: pad.destination };

  const color = new THREE.Color(pad.color);

  // ── Raised metallic base platform ──
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(LAUNCH_PAD_RADIUS, LAUNCH_PAD_RADIUS * 1.15, 0.18, 32),
    new THREE.MeshStandardMaterial({ color: new THREE.Color("#1A2050"), roughness: 0.2, metalness: 0.85 })
  );
  base.position.y = 0.09;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // ── Glowing top face ──
  const topDisc = new THREE.Mesh(
    new THREE.CircleGeometry(LAUNCH_PAD_RADIUS * 0.88, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })
  );
  topDisc.rotation.x = -Math.PI / 2;
  topDisc.position.y = 0.19;
  topDisc.renderOrder = 1;
  topDisc.userData = { isTopGlow: true };
  group.add(topDisc);

  // ── Outer energy ring ──
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(LAUNCH_PAD_RADIUS, LAUNCH_PAD_RADIUS + 0.3, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.02;
  outerRing.renderOrder = 2;
  outerRing.userData = { isOuterRing: true };
  group.add(outerRing);

  // ── Inner spin ring ──
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(LAUNCH_PAD_RADIUS * 0.5, LAUNCH_PAD_RADIUS * 0.65, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.20;
  innerRing.renderOrder = 2;
  innerRing.userData = { isInnerRing: true };
  group.add(innerRing);

  // ── Upward arrow (vertical stripe + cone) ──
  const arrowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff"), transparent: true, opacity: 0.7, depthWrite: false });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 8), arrowMat);
  shaft.position.y = 0.58;
  group.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.25, 8), arrowMat);
  tip.position.y = 0.95;
  group.add(tip);

  // ── Rising particle wisps — 8 thin cylinders around the pad ──
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const r = LAUNCH_PAD_RADIUS * 0.7;
    const wispMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.0, depthWrite: false });
    const wisp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.01, 0.6 + Math.random() * 0.4, 4),
      wispMat
    );
    wisp.position.set(Math.cos(ang) * r, 0.6 + Math.random() * 0.3, Math.sin(ang) * r);
    wisp.userData = { isWisp: true, phase: i * 0.78, speed: 0.9 + Math.random() * 0.6 };
    group.add(wisp);
  }

  // ── Label sprite ──
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256; labelCanvas.height = 64;
  const ctx = labelCanvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.font = "bold 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Launch Pad", 128, 24);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText("Step on to quick travel", 128, 44);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.minFilter = THREE.LinearFilter;
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, sizeAttenuation: false }));
  label.scale.set(0.01 * 256, 0.01 * 64, 1);
  label.position.y = 1.5;
  label.renderOrder = 99;
  group.add(label);

  return group;
}

function makeOrb(color) {
  const g = new THREE.Group();
  const col = new THREE.Color(color);

  // Core sphere
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshBasicMaterial({ color: col })
  );
  core.renderOrder = 2;
  g.add(core);

  // Halo
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 12),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.15, depthWrite: false })
  );
  halo.renderOrder = 1;
  g.add(halo);

  // Outer pulse ring (horizontal)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.42, 24),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.renderOrder = 1;
  ring.userData = { isOrbRing: true };
  g.add(ring);

  return g;
}

// ══════════════════════════════════════════════════════════════════
// buildLaunchZone — add all pads + orbs to scene
// ══════════════════════════════════════════════════════════════════
export function buildLaunchZone(scene) {
  const group = new THREE.Group();
  group.name = "VibeLaunchZone";

  // ── Build pads ──
  LAUNCH_PADS.forEach((pad) => {
    const padMesh = makePadMesh(pad);
    padMesh.position.set(pad.x, 0, pad.z);
    group.add(padMesh);
  });

  // ── Zone base platform — large circle tying pads together ──
  const zonePlat = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 48),
    new THREE.MeshStandardMaterial({ color: new THREE.Color("#0E1830"), roughness: 0.4, metalness: 0.35 })
  );
  zonePlat.rotation.x = -Math.PI / 2;
  zonePlat.position.set(0, 0.002, 11);
  zonePlat.receiveShadow = true;
  group.add(zonePlat);

  // Zone outer ring
  const zoneRing = new THREE.Mesh(
    new THREE.RingGeometry(6.3, 6.6, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#00E5FF"), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })
  );
  zoneRing.rotation.x = -Math.PI / 2;
  zoneRing.position.set(0, 0.004, 11);
  zoneRing.renderOrder = 1;
  group.add(zoneRing);

  scene.add(group);

  // ── Orbs — one set per pad, placed along launch arc ──
  // Using a single shared orb pool; pads share the same arc path offset from pad center
  const allOrbs = [];
  LAUNCH_PADS.forEach((pad, padIdx) => {
    ORB_OFFSETS.forEach((off, orbIdx) => {
      const orbGroup = makeOrb(off.color);
      orbGroup.name = `vibeOrb_${padIdx}_${orbIdx}`;
      const wx = pad.x + off.dx;
      const wy = off.dy;
      const wz = pad.z + off.dz;
      orbGroup.position.set(wx, wy, wz);
      orbGroup.userData = {
        isOrb: true,
        orbIndex: allOrbs.length,
        baseX: wx, baseY: wy, baseZ: wz,
        phase: (padIdx * 5 + orbIdx) * 0.83,
        collected: false,
        respawnTimer: 0,
      };
      scene.add(orbGroup);
      allOrbs.push(orbGroup);
    });
  });

  scene.userData.launchZone = { group, orbs: allOrbs, pads: LAUNCH_PADS };

  // Landing pulse ring (reused, hidden by default)
  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.5, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#00E5FF"), transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })
  );
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.03;
  pulseRing.renderOrder = 3;
  pulseRing.name = "launchLandingPulse";
  scene.add(pulseRing);
  scene.userData.launchLandingPulse = { mesh: pulseRing, active: false, timer: 0, x: 0, z: 0 };
}

// ══════════════════════════════════════════════════════════════════
// animateLaunchZone — call from render loop every frame
// ══════════════════════════════════════════════════════════════════
export function animateLaunchZone(scene, t, audioBeat = 0, dt = 0.016) {
  const lz = scene.userData.launchZone;
  if (!lz) return;

  // ── Animate pads ──
  lz.group.traverse((child) => {
    if (!child.userData?.isPad) return;
    const phase = child.position.x * 0.4;

    child.children.forEach((part) => {
      if (part.userData?.isOuterRing && part.material) {
        part.material.opacity = 0.4 + Math.sin(t * 2.8 + phase) * 0.25 + audioBeat * 0.2;
        part.rotation.z += dt * 0.6; // slow spin
      }
      if (part.userData?.isInnerRing && part.material) {
        part.material.opacity = 0.35 + Math.sin(t * 4.0 + phase + 1.2) * 0.2;
        part.rotation.z -= dt * 1.1; // counter-spin
      }
      if (part.userData?.isTopGlow && part.material) {
        part.material.opacity = 0.25 + Math.sin(t * 1.8 + phase) * 0.18 + audioBeat * 0.15;
      }
      if (part.userData?.isWisp && part.material) {
        const w = part.userData;
        const rise = (Math.sin(t * w.speed + w.phase) * 0.5 + 0.5); // 0..1
        part.position.y = 0.4 + rise * 0.8;
        part.material.opacity = rise * 0.5;
        part.scale.y = 0.7 + rise * 0.6;
      }
    });
  });

  // ── Float + rotate orbs ──
  lz.orbs.forEach((orb) => {
    const ud = orb.userData;
    if (ud.collected) {
      ud.respawnTimer -= dt;
      if (ud.respawnTimer <= 0) {
        ud.collected = false;
        orb.visible = true;
      }
      return;
    }
    // Gentle float
    orb.position.y = ud.baseY + Math.sin(t * 1.1 + ud.phase) * 0.3;
    orb.rotation.y += dt * 1.2;
    // Ring tilt
    orb.children.forEach((c) => {
      if (c.userData?.isOrbRing) {
        c.rotation.x = Math.sin(t * 0.8 + ud.phase) * 0.6;
      }
    });
  });

  // ── Landing pulse ring ──
  const lp = scene.userData.launchLandingPulse;
  if (lp?.active) {
    lp.timer += dt;
    const prog = Math.min(lp.timer / 0.8, 1);
    const mesh = lp.mesh;
    if (mesh) {
      // Expand from small to large, fade out
      const scale = 1 + prog * 8;
      mesh.scale.set(scale, scale, scale);
      mesh.position.set(lp.x, 0.03, lp.z);
      mesh.material.opacity = (1 - prog) * 0.7;
    }
    if (lp.timer >= 0.8) lp.active = false;
  }
}

// ══════════════════════════════════════════════════════════════════
// triggerLandingPulse — call when avatar lands
// ══════════════════════════════════════════════════════════════════
export function triggerLandingPulse(scene, x, z) {
  const lp = scene.userData.launchLandingPulse;
  if (!lp) return;
  lp.active = true;
  lp.timer = 0;
  lp.x = x;
  lp.z = z;
  lp.mesh.scale.set(1, 1, 1);
}

// ══════════════════════════════════════════════════════════════════
// getNearLaunchPad — returns pad index (0-based) or -1
// ══════════════════════════════════════════════════════════════════
export function getNearLaunchPad(px, pz) {
  for (let i = 0; i < LAUNCH_PADS.length; i++) {
    const pad = LAUNCH_PADS[i];
    const dx = px - pad.x;
    const dz = pz - pad.z;
    if (Math.sqrt(dx * dx + dz * dz) < LAUNCH_PAD_RADIUS + 0.4) return i;
  }
  return -1;
}


// ══════════════════════════════════════════════════════════════════
// collectNearbyOrbs — checks FULL 3D distance including Y (airborne)
// Call every frame during flight (rise + glide + fall)
// ══════════════════════════════════════════════════════════════════
export function collectNearbyOrbs(scene, px, py, pz) {
  const lz = scene.userData.launchZone;
  if (!lz) return [];
  const collected = [];
  lz.orbs.forEach((orb, i) => {
    if (orb.userData.collected) return;
    // Use current animated position for accurate 3D distance
    const dx = px - orb.position.x;
    const dy = py - orb.position.y;  // py is the REAL airborne height
    const dz = pz - orb.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < ORB_COLLECT_RADIUS) {
      orb.userData.collected = true;
      orb.userData.respawnTimer = 7.0; // 7 second respawn
      orb.visible = false;
      collected.push(i);
    }
  });
  return collected;
}