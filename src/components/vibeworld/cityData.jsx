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
  // Spread between zones — clear of all paths and buildings
  [-5, -10, 0.7], [5, -10, 0.7],
  [-3, 2, 0.6], [3, 2, 0.6],
  [-8, -6, 0.65], [9, -6, 0.65],
  [-10, -12, 0.55], [11, -12, 0.55],
  [-15, -6, 0.5], [16, -6, 0.5],
  [-6, 10, 0.5], [7, 10, 0.5],
  [-19, -12, 0.45], [20, -12, 0.45],
  [-22, -1, 0.4], [22, -1, 0.4],
  [-24, -8, 0.35], [24, -8, 0.35],
  [-2, -17, 0.4], [2, -17, 0.4],
];