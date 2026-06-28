/**
 * Simple Park Layout
 */
// Spawn near the Vibe Check zone so users see it first on entry.
// Vibe Check center: (-16, -13), radius 4.
// Spawn at (-10, -4) — clear of the zone trigger, clear of the dance floor (center 0,-13 r=10.5),
// avatar faces toward Vibe Check (-X, -Z direction), camera sits behind on +X/+Z side.
export const SPAWN = [-10, 0, -4];
export const PARK_RADIUS = 44;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side, none on beach
// Trees removed during layout cleanup — decoration to be added later
export const TREE_POSITIONS = [];