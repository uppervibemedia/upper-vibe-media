/**
 * Simple Park Layout
 */
// Spawn on the dance floor center, avatar faces stage (-Z direction)
// Dance floor is centered at (0, 0, -13) with radius 10.5
export const SPAWN = [0, 0, -8];
export const PARK_RADIUS = 44;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side, none on beach
// Trees removed during layout cleanup — decoration to be added later
export const TREE_POSITIONS = [];