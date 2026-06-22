/**
 * Simple Park Layout
 */
export const SPAWN = [0, 0, 5];
export const PARK_RADIUS = 44;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side, none on beach
// Trees removed during layout cleanup — decoration to be added later
export const TREE_POSITIONS = [];