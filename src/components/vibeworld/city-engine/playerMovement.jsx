/**
 * playerMovement.js — Movement helpers extracted from CityCanvas.
 * Pure functions, no React/three refs.
 */
import { SPAWN, TREE_POSITIONS } from "../cityData";

// ── Movement constants ─────────────────────────────────────
export const MOVE_SPEED = 4.5;
export const ACCELERATION = 14.0;
export const DECELERATION = 11.0;
export const TURN_SPEED = 2.5;
export const ROTATION_SMOOTH = 8.0;

// ── Camera constants ───────────────────────────────────────
export const CAM_DIST = 5.5;
export const CAM_HEIGHT = 2.4;
export const CAM_LOOK_Y = 0.9;
export const CAM_PITCH_MIN = -0.35;
export const CAM_PITCH_MAX = 0.22;

export const CAM_DIST_LS = 3.5;
export const CAM_HEIGHT_LS = 1.75;
export const CAM_LOOK_Y_LS = 1.35;
export const FOV_PORTRAIT = 52;
export const FOV_LANDSCAPE = 60;

// ── Collision ───────────────────────────────────────────────
export const TREE_R = 0.5;
export const AVATAR_R = 0.3;

export const COLLISION_BOXES = TREE_POSITIONS
  ? TREE_POSITIONS.map(([tx, tz]) => [tx, tz, TREE_R, TREE_R]).concat([
      [22 - 1.5, 5, 0.5, 0.5],
      [22 + 1.5, 5, 0.5, 0.5],
      [22, 5, 1.2, 1.2],
    ])
  : [];

const SKYLINE_NORTH = -36;
const SKYLINE_EAST = 36;
const SKYLINE_WEST = -36;
const SKYLINE_BEACH_START = 15;

export function circleVsCircle(x1, z1, r1, x2, z2, r2) {
  const dx = x1 - x2,
    dz = z1 - z2;
  return dx * dx + dz * dz < (r1 + r2) * (r1 + r2);
}

export function resolveCollisions(px, pz, r, boxes, isHoverboarding = false) {
  let x = px,
    z = pz;
  for (const [bx, bz, br] of boxes) {
    if (!circleVsCircle(x, z, r, bx, bz, br)) continue;
    const dx = x - bx,
      dz = z - bz;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const overlap = r + br - dist;
    x += (dx / dist) * overlap;
    z += (dz / dist) * overlap;
  }

  if (z < SKYLINE_NORTH + r) z = SKYLINE_NORTH + r;
  if (x > SKYLINE_EAST - r) x = SKYLINE_EAST - r;
  if (x < SKYLINE_WEST + r) x = SKYLINE_WEST + r;

  if (z >= SKYLINE_BEACH_START) {
    const beachProgress = Math.min(1, (z - SKYLINE_BEACH_START) / 18);
    const beachXLimit = 34 - beachProgress * 6;
    if (x > beachXLimit) x = beachXLimit;
    if (x < -beachXLimit) x = -beachXLimit;
  }

  const maxZ = isHoverboarding ? 75 : 34;
  if (z > maxZ) z = maxZ;

  return [x, z];
}