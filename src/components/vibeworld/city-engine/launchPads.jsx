/**
 * launchPads.js — Manages launch pad logic and state.
 */
import { getNearLaunchPad, LAUNCH_DURATION, GLIDE_DURATION, LAUNCH_HEIGHT, triggerLandingPulse } from "../VibeLaunchZone";
import { SPAWN } from "./cityConfig";
import { collectNearbyOrbs } from "./collectibles";

export function updateLaunchPads(refs, dt) {
  const { launchStateRef, nearPadRef, onNearPad, sceneRef, avatarPosRef } = refs;
  let [px, py, pz] = avatarPosRef.current;

  const ls = launchStateRef;
  if (ls.active) {
    ls.timer += dt;
    if (ls.phase === "rise") {
      const progress = Math.min(ls.timer / LAUNCH_DURATION, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      py = ls.startY + LAUNCH_HEIGHT * eased;
      if (progress >= 1) { ls.phase = "fall"; ls.timer = 0; }
    } else if (ls.phase === "fall") {
      const progress = Math.min(ls.timer / GLIDE_DURATION, 1);
      const eased = progress * progress;
      py = ls.startY + LAUNCH_HEIGHT * (1 - eased);
      if (progress >= 1) {
        py = ls.startY;
        ls.active = false;
        ls.phase = "idle";
        if (sceneRef.current) triggerLandingPulse(sceneRef.current, px, pz);
      }
    }
    if (sceneRef.current) {
      collectNearbyOrbs(sceneRef.current, px, py, pz, refs.orbCountRef);
    }
    refs.velocityRef.current.x *= 0.88;
    refs.velocityRef.current.z *= 0.88;
  }

  avatarPosRef.current[1] = py; // Update Y position

  if (refs.frameRef % 6 === 0 && sceneRef.current) {
    nearPadRef.current = getNearLaunchPad(px, pz);
  }

  if (onNearPad && refs.frameRef % 10 === 0) {
    try { onNearPad(nearPadRef.current, ls.active, refs.orbCountRef.current); } catch {}
  }
}