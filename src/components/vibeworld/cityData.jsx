/**
 * Simple Park Layout
 */
export const SPAWN = [0, 0.9, 5];
export const PARK_RADIUS = 20;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — trees are just visual
export const TREE_POSITIONS = [
  [-8, -6, 1.0], [8, -6, 0.9], [-7, 6, 0.85], [7, 5, 0.95],
  [-3, -8, 0.7], [4, -8, 0.8], [-5, 8, 0.75], [6, 7, 0.9],
  [-10, 2, 0.65], [10, -2, 0.7], [-9, -3, 0.8], [9, 3, 0.75],
  [-2, 3, 0.6], [3, -3, 0.65], [-6, -5, 0.7], [5, -5, 0.7],
  [-8, 7, 0.5], [8, -7, 0.55], [-10, -7, 0.6], [10, 7, 0.6],
];