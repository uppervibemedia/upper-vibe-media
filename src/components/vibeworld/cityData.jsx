/**
 * Simple Park Layout
 */
export const SPAWN = [0, 0.9, 5];
export const PARK_RADIUS = 30;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side, none on beach
export const TREE_POSITIONS = [
  [-10, -2, 0.9], [10, -2, 0.95],
  [-8, -6, 0.8], [8, -7, 0.85],
  [-14, -4, 0.7], [14, -3, 0.75],
  [-5, -10, 0.65], [5, -11, 0.7],
  [-18, -2, 0.55], [18, -1, 0.6],
  [-12, -8, 0.6], [12, -9, 0.65],
  [-3, -5, 0.5], [0, -8, 0.55],
  [-15, -6, 0.5], [15, -7, 0.55],
  [-20, -3, 0.45], [20, -2, 0.5],
  [-9, -12, 0.4], [9, -13, 0.45],
];