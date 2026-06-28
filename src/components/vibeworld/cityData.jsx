/**
 * Simple Park Layout
 */
// Spawn in the Welcome Plaza — open walkway south of the shop, well clear of the dance floor.
// Dance floor center: (0, -13), radius 10.5 → nearest edge at Z = -2.5.
// Spawn at Z = 10 gives ~12.5 units of clearance from the dance floor edge (>5u requirement).
// Avatar faces -Z (toward city center / dance floor), camera sits at +Z behind avatar.
export const SPAWN = [0, 0, 10];
export const PARK_RADIUS = 44;

// Empty districts — will be populated later when city is built
export const DISTRICTS = {};

// Simple collision boxes for trees
export const COLLISION_BOXES = [];

// Tree positions [x, z, scale] — only on grass/park side, none on beach
// Trees removed during layout cleanup — decoration to be added later
export const TREE_POSITIONS = [];