/**
 * launchPadSystem.js
 *
 * Extracted helpers for the VibeLaunchZone arc physics and
 * hoverboard step-on launch pad detection.
 *
 * Behavior is identical to the inline code that was in CityCanvas.jsx.
 * Do NOT change: launch height, duration, arc shape, coin collection,
 * cooldown timing, landing behavior, or camera follow.
 */

import { collectNearbyOrbs, triggerLandingPulse, LAUNCH_HEIGHT, LAUNCH_DURATION, GLIDE_DURATION } from "../VibeLaunchZone";

/**
 * tickLaunchPhysics
 *
 * Drives the rise/fall arc for the VibeLaunchZone pads.
 * Call this every animation frame when the launch state is active.
 *
 * @param {object}  ls           - launchStateRef.current  { active, phase, timer, startY }
 * @param {number}  dt           - delta time (seconds)
 * @param {number}  py           - current avatar Y position
 * @param {number}  px           - current avatar X position
 * @param {number}  pz           - current avatar Z position
 * @param {object}  scene        - THREE.Scene (for collectNearbyOrbs + triggerLandingPulse)
 * @param {object}  orbCountRef  - React ref whose .current holds total orbs collected
 * @param {object}  velRef       - velocityRef.current { x, z } — damped during flight
 *
 * @returns {number} updated py
 */
export function tickLaunchPhysics(ls, dt, py, px, pz, scene, orbCountRef, velRef) {
  ls.timer += dt;

  if (ls.phase === "rise") {
    const progress = Math.min(ls.timer / LAUNCH_DURATION, 1);
    const eased = 1 - (1 - progress) * (1 - progress); // ease-out quad
    py = ls.startY + LAUNCH_HEIGHT * eased;
    if (progress >= 1) { ls.phase = "fall"; ls.timer = 0; }

  } else if (ls.phase === "fall") {
    const progress = Math.min(ls.timer / GLIDE_DURATION, 1);
    const eased = progress * progress; // ease-in quad
    py = ls.startY + LAUNCH_HEIGHT * (1 - eased);
    if (progress >= 1) {
      py = ls.startY;
      ls.active = false;
      ls.phase = "idle";
      if (scene) triggerLandingPulse(scene, px, pz);
    }
  }

  // Collect sky coins every frame during all airborne phases
  if (scene) {
    const collected = collectNearbyOrbs(scene, px, py, pz);
    if (collected.length) orbCountRef.current += collected.length;
  }

  // Dampen horizontal momentum during flight
  velRef.x *= 0.88;
  velRef.z *= 0.88;

  return py;
}

/**
 * checkHbLaunchPads
 *
 * Detects when the hoverboard rider steps on a launch pad and fires
 * the launch arc. Enforces a 3-second cooldown per scene.
 * Only active while hbRiding is true.
 *
 * @param {number}   px             - avatar X
 * @param {number}   py             - avatar Y
 * @param {number}   pz             - avatar Z
 * @param {object}   scene          - THREE.Scene (for cooldown storage)
 * @param {object}   launchStateRef - ref to { active, phase, timer, startY }
 * @param {Array}    launchPads     - array of { x, z } pad positions (from HoverboardRingRun)
 */
export function checkHbLaunchPads(px, py, pz, scene, launchStateRef, launchPads) {
  const nowMs = performance.now();
  for (const pad of launchPads) {
    const dx = px - pad.x;
    const dz = pz - pad.z;
    if (Math.sqrt(dx * dx + dz * dz) < 1.6) {
      if (!scene.userData._lastLaunchTime || nowMs - scene.userData._lastLaunchTime > 3000) {
        scene.userData._lastLaunchTime = nowMs;
        const ls = launchStateRef.current;
        if (!ls.active) {
          ls.active = true;
          ls.phase = "rise";
          ls.timer = 0;
          ls.startY = py;
        }
        if (window.__hbLaunchTriggered) window.__hbLaunchTriggered();
      }
    }
  }
}