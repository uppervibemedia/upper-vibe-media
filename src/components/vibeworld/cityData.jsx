/**
 * Simple Park Layout
 */
// Spawn in the central plaza area — outside the dance floor (center 0,-13, r=10.5),
// near the shop entrance where the user can see the dance floor and choose to enter.
export const SPAWN = [0, 0, 4];
export const PARK_RADIUS = 44;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side, none on beach
// Trees removed during layout cleanup — decoration to be added later
export const TREE_POSITIONS = [];