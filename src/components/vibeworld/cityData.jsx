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
  [-7, 1, 0.85], [7, 0, 0.95],
  [-5, 3, 0.75], [6, 2, 0.9],
  [-10, -1, 0.65], [9, 0, 0.75],
  [-3, 0, 0.6],
  [-8, 2, 0.5], [10, 2, 0.6],
  [-12, -2, 0.7], [11, -1, 0.55],
];