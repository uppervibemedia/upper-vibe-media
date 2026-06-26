/**
 * cityConfig.js — Shared constants for Upper Vibe City 3D engine.
 *
 * Central source of truth. Other builders import these instead of redefining.
 * SPAWN / COLLISION_BOXES / TREE_POSITIONS re-exported from ./cityData
 * so existing code that imports "@/components/vibeworld/cityData" still works.
 */
import { SPAWN, COLLISION_BOXES, TREE_POSITIONS, PARK_RADIUS } from "../cityData";

// ── Scene dimensions ─────────────────────────────────────────
export { SPAWN, COLLISION_BOXES, TREE_POSITIONS, PARK_RADIUS };

export const PLAZA_X = 0;
export const PLAZA_Z = -13;
export const PLAZA_R = 10.5;

export const SHORELINE_Z = 32;
export const OCEAN_DEPTH = 54;

// Skyline perimeter (matches CitySkyline.jsx wall positions)
export const SKYLINE_NORTH = -36;
export const SKYLINE_EAST = 36;
export const SKYLINE_WEST = -36;
export const SKYLINE_BEACH_START = 15;

// Beach & ocean limits
export const BEACH_MAX_Z = 34;
export const BEACH_HOVERBOARD_MAX_Z = 75;
export const BEACH_PROGRESS_LIMIT = 18;
export const BEACH_X_LIMIT_BASE = 34;
export const BEACH_X_LIMIT_NARROW = 28;

// ── Zone positions ───────────────────────────────────────────
export const LOUNGE_X = -22;
export const LOUNGE_Z = -26;

export const LIBRARY_X = 22;
export const LIBRARY_Z = -20;

export const DOME_X = -13;
export const DOME_Z = 3;

export const VIBE_CHECK_X = -16;
export const VIBE_CHECK_Z = -13;

export const ACAD_Y = -28;
export const ACAD_Z = 5;

export const LAUNCH_ZONE_Z = 4;

// ── Movement constants ───────────────────────────────────────
export const MOVE_SPEED = 4.5;
export const ACCELERATION = 14.0;
export const DECELERATION = 11.0;
export const TURN_SPEED = 2.5;
export const ROTATION_SMOOTH = 8.0;

// ── Camera constants (third-person) ──────────────────────────
export const CAM_DIST = 5.5;
export const CAM_HEIGHT = 2.4;
export const CAM_LOOK_Y = 0.9;
export const CAM_PITCH_MIN = -0.35;
export const CAM_PITCH_MAX = 0.22;

// Landscape mobile
export const CAM_DIST_LS = 3.5;
export const CAM_HEIGHT_LS = 1.75;
export const CAM_LOOK_Y_LS = 1.35;
export const FOV_PORTRAIT = 52;
export const FOV_LANDSCAPE = 60;

// ── Collision helpers ────────────────────────────────────────
export const TREE_RADIUS = 0.5;
export const AVATAR_COLLISION_RADIUS = 0.3;

// ── Audio reactivity ─────────────────────────────────────────
export const FOAM_TIDE_SPEED = 0.55;
export const WAVE_SPEED = 1.8;
export const WAVE_AMPLITUDE = 0.18;
export const WAVE_SURGE = 0.12;

// ── Screen / stage ───────────────────────────────────────────
export const SCREEN_WIDTH = 14;
export const SCREEN_HEIGHT = 7;
export const SCREEN_X = 0;
export const SCREEN_Y = 3.5;
export const SCREEN_Z = -34.4;