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
  // Along paths — placed between walkways, not on them
  [-4, -10, 0.7], [4, -10, 0.7],
  [-3, 2, 0.6], [3, 2, 0.6],
  [-8, -6, 0.65], [8, -6, 0.65],
  [-10, -12, 0.55], [10, -12, 0.55],
  [-15, -6, 0.5], [15, -6, 0.5],
  [-6, 10, 0.5], [6, 10, 0.5],
  [-18, -12, 0.45], [18, -12, 0.45],
  [-19, -1, 0.4], [19, -1, 0.4],
  [-22, -8, 0.4], [22, -8, 0.4],
];