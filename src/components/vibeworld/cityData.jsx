/**
 * Simple Park Layout
 */
// Spawn near the Upper Vibe Beach transporter, but safely outside the pad trigger.
// City transporter pad: (12, 8), radius 3.2. Spawn at (7, 8) keeps users close without auto-triggering transport.
export const SPAWN = [7, 0, 8];
export const PARK_RADIUS = 44;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side, none on beach
// Trees removed during layout cleanup — decoration to be added later
export const TREE_POSITIONS = [];