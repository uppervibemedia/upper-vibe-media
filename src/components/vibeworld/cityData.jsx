/**
 * Simple Park Layout
 */
export const SPAWN = [0, 0.9, 5];
export const PARK_RADIUS = 20;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side (z >= 1), none on beach
export const TREE_POSITIONS = [
  [-7, 6, 0.85], [7, 5, 0.95],
  [-5, 8, 0.75], [6, 7, 0.9],
  [-10, 2, 0.65], [9, 3, 0.75],
  [-2, 3, 0.6],
  [-8, 7, 0.5], [10, 7, 0.6],
];