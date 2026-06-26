/**
 * LaunchRide — step-on auto-launch + Vibe Coin paths
 *
 * Plugs into CityAddOns: setup creates coin meshes and stores per-pad
 * cooldown state; tick reads a shared movement ref and drives launch
 * animation + mid-air coin collection autonomously.
 *
 * No manual launch UI, no collision-box changes, no zone detection edits.
 */

import * as THREE from "three";
import createCoin, { animateVibeCoin } from "../VibeCoin";
import { addVibeCoins } from "@/lib/vibeCoinBank";

// ── Pads (mirrors city-engine/cityConfig LAUNCH_PADS coords) ───
const PADS = [
  { id: 'pad-lounge',  x: -10, z: -24, color: "#00E5FF" },
  { id: 'pad-library', x:  14, z: -24, color: "#9B7EFF" },
  { id: 'pad-academy', x: -26, z: -4,  color: "#FFD700" },
  { id: 'pad-crystal', x: -14, z: -8,  color: "#E040FB" },
];

const PAD_RADIUS = 1.6;
const COOLDOWN_MS = 2500; // 2.5 seconds

// ── Launch arc parameters ──────────────────────────────────────
const RISE_TIME     = 0.55;
const GLIDE_FALL    = 0.8;
const PEAK_HEIGHT   = 10;

// ── Direction each pad hurls the player ──
const PAD_DIRECTION = [
  { fx: 4,  fz: 6  },
  { fx: -4, fz: 8  },
  { fx: 4,  fz: 2  },
  { fx: 4,  fz: 4  },
];
const DIRECTION_SPEED = 6.5;

// ── Coin arc trails — 7 coins per pad in a smooth parabolic arc ──
// Evenly spaced along the launch trajectory so the player flies through them
const COINS_PER_PAD = 7;
function getPadCoinOffsets(padIdx) {
  const dir = PAD_DIRECTION[padIdx] || { fx: 0, fz: 0 };
  const offsets = [];
  for (let i = 0; i < COINS_PER_PAD; i++) {
    const t = (i + 1) / (COINS_PER_PAD + 1); // 0..1 exclusive
    // Parabolic height: peak at t=0.5
    const dy = PEAK_HEIGHT * (4 * t * (1 - t)) * 0.85;
    // Horizontal spread along launch direction
    const horiz = t * DIRECTION_SPEED * (RISE_TIME + GLIDE_FALL) * 0.55;
    const fLen = Math.sqrt(dir.fx * dir.fx + dir.fz * dir.fz) || 1;
    const dx = (dir.fx / fLen) * horiz;
    const dz = (dir.fz / fLen) * horiz;
    offsets.push({ dx, dy, dz });
  }
  return offsets;
}

export const MOVEMENT_BRIDGE = { px: 0, pz: 0, py: 0, hbRiding: false, dt_: 0.016 };
const perScene = new WeakMap();

function ensureFlightState(st) {
  if (st.flightActive === undefined) {
    st.flightActive = 0;
    st.flightState = "idle";
    st.launchStartY = 0;
    st.justLanded = false;
  }
}

function collectCoins(st) {
  let count = 0;
  const mb = MOVEMENT_BRIDGE;
  st.coins.forEach((c) => {
    if (c.userData.collected) return;
    const dx = mb.px - c.position.x;
    const dy = mb.py - c.position.y;
    const dz = mb.pz - c.position.z;
    if (dx * dx + dy * dy + dz * dz < 1.4 * 1.4) {
      c.userData.collected = true;
      c.userData._fadeTimer = 0;
      // Keep visible briefly for sparkle fade-out
      count++;
    }
  });
  return count;
}

function mkPulse() {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.6, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#00E5FF"), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  m.renderOrder = 3;
  return m;
}

function mkCooldownRing(hex) {
  const fullRing = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.8, 48, 1, 0, 0), // Start at 0 sweep
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(hex).multiplyScalar(1.5),
      transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
    })
  );
  fullRing.rotation.x = -Math.PI / 2;
  fullRing.position.y = 0.02;
  fullRing.renderOrder = 3;
  return fullRing;
}

export function setupLaunchRide(scene) {
  let st = perScene.get(scene);
  if (st) return st;

  const pads = PADS.map((p, i) => ({
    ...p,
    cooldownUntil: 0,
    padSnapIdx: i,
    isPlayerOn: false,
  }));

  const coins = [];
  PADS.forEach((pad, pi) => {
    const offsets = getPadCoinOffsets(pi);
    offsets.forEach((off, ci) => {
      const wx = pad.x + off.dx;
      const wz = pad.z + off.dz;
      const coin = createCoin(scene, { x: wx, z: wz }, 1, `lr_${pi}_${ci}`);
      coin.position.y = 1.0 + off.dy;
      coin.scale.setScalar(0.7); // small collectible size
      coin.userData._placedBaseY = off.dy;
      coins.push(coin);
    });
  });

  const pulse = mkPulse();
  scene.add(pulse);

  const cooldownRings = PADS.map((p, pi) => {
    const ring = mkCooldownRing(p.color);
    ring.position.x = p.x;
    ring.position.z = p.z;
    scene.add(ring);
    return ring;
  });

  st = { pads, coins, pulse, cooldownRings };
  ensureFlightState(st);
  perScene.set(scene, st);
  return st;
}

export function tickLaunchRide(scene, t) {
  const st = perScene.get(scene);
  if (!st) return 0;
  ensureFlightState(st);

  const mb = MOVEMENT_BRIDGE;
  const dt = Math.min(mb.dt_, 0.05);
  let collected = 0;

  window.__lr_flying = st.flightActive > 0;

  if (!mb.hbRiding && st.flightActive > 0) {
    st.flightActive += dt;
    if (st.flightActive >= RISE_TIME + GLIDE_FALL) {
      st.flightActive = 0;
      st.flightState = "idle";
      st.justLanded = true;
      st._flightOrig = null;
    }
  } else if (mb.hbRiding && st.flightActive > 0) {
    st.flightActive = 0;
    st.flightState = "idle";
  }

  const now = performance.now();
  if (st.flightActive <= 0 && !mb.hbRiding) {
    for (const p of st.pads) {
      const dx = mb.px - p.x;
      const dz = mb.pz - p.z;
      const isOnPad = dx * dx + dz * dz < PAD_RADIUS * PAD_RADIUS;

      if (isOnPad && !p.isPlayerOn && now > p.cooldownUntil) {
        st.flightActive = 0.001;
        st.flightState = "rise";
        st.launchStartY = mb.py;
        st.justLanded = false;
        p.cooldownUntil = now + COOLDOWN_MS;
        st._flightOrig = { x: mb.px, y: mb.py, z: mb.pz };
        st._flightDir = PAD_DIRECTION[p.padSnapIdx] || { fx: 0, fz: 0 };
      }
      p.isPlayerOn = isOnPad;
    }
  }

  if (st.flightActive > 0) {
    collected = collectCoins(st);
  }

  if (st.flightActive > 0 && !mb.hbRiding) {
    const dir = st._flightDir || { fx: 0, fz: 0 };
    mb.px += dir.fx * DIRECTION_SPEED * dt;
    mb.pz += dir.fz * DIRECTION_SPEED * dt;

    if (st.flightState === "rise") {
      const progress = Math.min(st.flightActive / RISE_TIME, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      mb.py = st.launchStartY + PEAK_HEIGHT * eased;
      if (progress >= 1) { st.flightState = "fall"; }
    } else if (st.flightState === "fall") {
      const progress = Math.min((st.flightActive - RISE_TIME) / GLIDE_FALL, 1);
      const eased = progress * progress;
      mb.py = st.launchStartY + PEAK_HEIGHT * (1 - eased);
    }
  }

  if (st.justLanded) {
    st.pulse.visible = true;
    st.pulse.position.set(mb.px, 0.01, mb.pz);
    st.pulse.material.opacity = 0.8;
    st.pulse.scale.set(1, 1, 1);
    if (collected > 0) {
      const { total } = addVibeCoins(collected);
      window.__lrCoinsCollected = collected;
      window.__lrTotalCoins = total;
    } else {
      window.__lrCoinsCollected = 0;
    }
    st.justLanded = false;
    st._pulseTimer = 0.8;
    window.__lrJustLanded = true;
  }
  
  if (st._pulseTimer > 0) {
    st._pulseTimer -= dt;
    const s = 1 + (1 - st._pulseTimer / 0.8) * 6;
    st.pulse.scale.set(s, s, s);
    st.pulse.material.opacity = (st._pulseTimer / 0.8) * 0.8;
  }

  return collected;
}

export function animateLaunchCoins(scene, t) {
  const st = perScene.get(scene);
  if (!st) return;

  st.coins.forEach((c) => {
    if (c.userData.collected) {
      // Sparkle fade-out after collection
      if (c.visible) {
        c.userData._fadeTimer = (c.userData._fadeTimer || 0) + 0.016;
        const scale = 1 + c.userData._fadeTimer * 4;
        c.scale.setScalar(0.7 * (1 + c.userData._fadeTimer * 3));
        // Fade out all materials
        c.traverse((obj) => {
          if (obj.material?.opacity !== undefined && obj.material.transparent) {
            obj.material.opacity = Math.max(0, obj.material.opacity - 0.08);
          }
        });
        if (c.userData._fadeTimer > 0.35) c.visible = false;
      }
      return;
    }
    // Gentle bob + arc-path sway
    const phase = (c.userData._phaseOff || 0);
    const placedBase = c.userData._placedBaseY || 0;
    c.position.y = 1.0 + placedBase + Math.sin(t * 2.0 + phase) * 0.08;
    animateVibeCoin(c, t, 0);
  });

  const now = performance.now();
  st.pads.forEach((p, i) => {
    const ring = st.cooldownRings[i];
    if (!ring) return;

    const remaining = p.cooldownUntil - now;
    if (remaining > 0) {
        const ratio = Math.max(0, Math.min(1, 1 - remaining / COOLDOWN_MS));
        const sweep = ratio * Math.PI * 2;
        ring.geometry.dispose();
        ring.geometry = new THREE.RingGeometry(1.6, 1.8, 48, 1, -Math.PI / 2, sweep);
        ring.material.opacity = 0.65 + Math.sin(t * 8 + i) * 0.2;
    } else {
        const timeSinceReady = now - p.cooldownUntil;
        if (timeSinceReady < 500) {
            const flash = 1 - (timeSinceReady / 500);
            ring.material.opacity = flash * 0.8;
        } else {
            ring.material.opacity = 0;
        }
    }
  });
}