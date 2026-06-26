/**
 * zoneDetection.js — Handles proximity checks for all interactive zones.
 */
import { JUKEBOX_POS, JUKEBOX_INTERACT_RADIUS } from "../Jukebox";
import { HOVERBOARD_START, HOVERBOARD_INTERACT_RADIUS } from "../HoverboardRingRun";
import { DANCE_FLOOR_RADIUS } from "../Jukebox";

export function checkZoneProximity(refs, playerPos) {
  const {
    sceneRef, onJukeboxProximity, 
  } = refs;
  const [px, py, pz] = playerPos;

  // Jukebox
  const jdx = px - JUKEBOX_POS.x;
  const jdz = pz - JUKEBOX_POS.z;
  const jDist = Math.sqrt(jdx * jdx + jdz * jdz);
  const nearJukebox = jDist < JUKEBOX_INTERACT_RADIUS;

  // Dance floor volume
  const ddx = px;
  const ddz = pz - (-13);
  const dFloorDist = Math.sqrt(ddx * ddx + ddz * ddz);
  const proximityVol = Math.max(0.1, Math.min(1.0, 1.0 - (dFloorDist - 2) / (DANCE_FLOOR_RADIUS - 2)));
  
  if (onJukeboxProximity && refs.frameRef % 6 === 0) {
    try { onJukeboxProximity(nearJukebox, proximityVol); } catch {}
  }

  // Hoverboard
  if (refs.frameRef % 10 === 0) {
      const hbdx = px - HOVERBOARD_START.x;
      const hbdz = pz - HOVERBOARD_START.z;
      const hbDist = Math.sqrt(hbdx * hbdx + hbdz * hbdz);
      sceneRef.current.userData._nearHoverboard = hbDist < HOVERBOARD_INTERACT_RADIUS;
  }
}