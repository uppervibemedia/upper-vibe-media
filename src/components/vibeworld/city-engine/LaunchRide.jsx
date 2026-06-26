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
import createCoin from "../VibeCoin";
import { addToOrbBank } from "../../../lib/orbBank";

// ── Pads (mirrors city-engine/cityConfig LAUNCH_PADS coords) ───
const PADS = [
  { x: -10, z: -24, color: "#00E5FF" },
  { x:  14, z: -24, color: "#9B7EFF" },
  { x: -26, z: -4,  color: "#FFD700" },
  { x: -14, z: -8,  color: "#E040FB" },
];

const PAD_RADIUS = 1.6;   // generous step-on detection
const COOLDOWN_MS = 1800; // prevent re-trigger wrap

// ── Launch arc parameters ──────────────────────────────────────
const RISE_TIME     = 0.6;  // seconds up to peak
const GLIDE_FALL    = 0.9;  // seconds down to ground
const PEAK_HEIGHT   = 9;    // world units

// ── Coin paths: one arc per pad, 5 coins at increasing height ───
const PAD_COIN_OFFSETS = [
  { dx:   0, dy: 2, dz:   0 },
  { dx:   0, dy: 4, dz:   1 },
  { dx:   0, dy: 6, dz:   0 },
  { dx:   0, dy: 5, dz:  -1 },
  { dx:   0, dy: 3, dz:   0 },
];

// ── Shared movement bridge (written by CityCanvas → read by tick) ─
export const MOVEMENT_BRIDGE = {
  px: 0, pz: 0, py: 0,
  hbRiding: false, dt_: 0.016,
};

// ── Per-pad state machine storage (scene is the key) ────────────
const perScene = new WeakMap();

// ── Launch state ────────────────────────────────────────────────
let launchActive = 0;
let launchState = "idle";
let launchStartY = 0;
let justLanded = false;

function collectCoins(st) {
  let count = 0;
  const mb = MOVEMENT_BRIDGE;
  st.coins.forEach((c) => {
    if (c.userData.coinId === "co") return;
    const dx = mb.px - c.position.x;
    const dy = mb.py - c.position.y;
    const dz = mb.pz - c.position.z;
    if (dx * dx + dy * dy + dz * dz < 2.0 * 2.0) {
      c.userData.coinId = "co";
      c.visible = false;
      count++;
    }
  });
  return count;
}

// ── reused landing pulse ────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════
// setup — create floating coins + landing pulse
// ═══════════════════════════════════════════════════════════════
export function setupLaunchRide(scene) {
  let st = perScene.get(scene);
  if (st) return st;
  const pads = PADS.map((p, i) => ({
    ...p,
    cooldownUntil: 0,
    padSnapIdx: i,
  }));
  const coins = [];
  PADS.forEach((pad, pi) => {
    PAD_COIN_OFFSETS.forEach((off, ci) => {
      const wx = pad.x + off.dx;
      const wz = pad.z + off.dz;
      const coin = createCoin(scene, { x: wx, z: wz }, 5, `lr_${pi}_${ci}`);
      coins.push(coin);
    });
  });
  const pulse = mkPulse();
  scene.add(pulse);
  st = { pads, coins, pulse };
  perScene.set(scene, st);
  return st;
}

// ═══════════════════════════════════════════════════════════════
// tick — step-on auto-launch + flight + mid-air collection
// ═══════════════════════════════════════════════════════════════
export function tickLaunchRide(scene, t) {
  const st = perScene.get(scene);
  if (!st) return 0;
  const mb = MOVEMENT_BRIDGE;
  const dt = Math.min(mb.dt_, 0.05);
  let collected = 0;

  const isHovering = mb.hbRiding;

  // ── Reset after fixed flight duration ────────────────────────
  if (!isHovering && launchActive > 0) {
    launchActive += dt;
    if (launchActive >= RISE_TIME + GLIDE_FALL) {
      launchActive = 0;
      launchState = "idle";
      justLanded = true;
    }
  } else if (isHovering && launchActive > 0) {
    // If user switches to hoverboard mid-flight, abort
    launchActive = 0;
    launchState = "idle";
  }

  // ── Launch detection (step-on with cooldown) ─────────────────
  if (launchActive <= 0 && !isHovering) {
    const now = performance.now();
    for (const p of st.pads) {
      if (now < p.cooldownUntil) continue;
      const dx = mb.px - p.x;
      const dz = mb.pz - p.z;
      if (dx * dx + dz * dz < PAD_RADIUS * PAD_RADIUS) {
        launchActive = 0.001;
        launchState = "rise";
        launchStartY = mb.py;
        justLanded = false;
        p.cooldownUntil = now + COOLDOWN_MS;
        break;
      }
    }
  }

  // ── Mid-air collection ──────────────────────────────────────
  if (launchActive > 0) {
    collected = collectCoins(st);
  }

  // ── Flight ─────────────────────────────────────────────────
  if (launchActive > 0 && !isHovering) {
    if (launchState === "rise") {
      const progress = Math.min(launchActive / RISE_TIME, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      mb.py = launchStartY + PEAK_HEIGHT * eased;
      if (progress >= 1) { launchState = "fall"; }
    } else if (launchState === "fall") {
      const progress = Math.min((launchActive - RISE_TIME) / GLIDE_FALL, 1);
      const eased = progress * progress;
      mb.py = launchStartY + PEAK_HEIGHT * (1 - eased);
      if (progress >= 1) { launchState = "idle"; launchActive = 0; justLanded = true; }
    }
  }

  // ── Landing pulse ───────────────────────────────────────────
  if (justLanded) {
    st.pulse.visible = true;
    st.pulse.position.x = mb.px;
    st.pulse.position.z = mb.pz;
    st.pulse.material.opacity = 0.8;
    st.pulse.scale.set(1, 1, 1);
    if (collected > 0) addToOrbBank(collected);
    // Broadcast total to window so UpperVibeCity (WorldHUD) can refresh the orb count
    window.__lrNewCoins = collected;
    justLanded = false;
    st._pulseTimer = 0.8;
  }
  if (st._pulseTimer != null && st._pulseTimer > 0) {
    st._pulseTimer -= dt;
    const s = 1 + (1 - st._pulseTimer / 0.8) * 6;
    st.pulse.scale.set(s, s, s);
    st.pulse.material.opacity = (st._pulseTimer / 0.8) * 0.8;
    if (st._pulseTimer <= 0) {
      st.pulse.material.opacity = 0;
      st.pulse.visible = false;
    }
  }

  return collected;
}

// ═══════════════════════════════════════════════════════════════
// quick coin spin animation for the floating coins
// ═══════════════════════════════════════════════════════════════
export function animateLaunchCoins(scene, t) {
  const st = perScene.get(scene);
  if (!st) return;
  st.coins.forEach((c) => {
    if (c.userData.coinId === "co") return;
    // gentle spin & bob
    c.rotation.y += 0.015;
    const baseY = 0.5;
    c.position.y = baseY + Math.sin(t * 2.2 + c.userData.coinId?.charCodeAt(3) || 0) * 0.08;
  });
}