/**
 * Upper Vibe City — Layout Data
 * All positions, sizes, and interaction zones for buildings and districts.
 * Units are in world-space meters. Y=0 is ground level.
 */

// District interaction zones — when the player enters this radius, show the prompt
export const DISTRICTS = {
  music: {
    id: "music",
    title: "Music District",
    accent: "0,160,220",
    position: [18, 0, 0],
    zoneRadius: 4,
    buildingSize: [4, 3, 3],
    color: "#0080CC",
  },
  radio: {
    id: "radio",
    title: "Radio Tower",
    accent: "155,126,255",
    position: [0, 0, -18],
    zoneRadius: 4,
    towerHeight: 10,
    color: "#9B7EFF",
  },
  gardens: {
    id: "gardens",
    title: "Manifestation Gardens",
    accent: "52,211,153",
    position: [-18, 0, 0],
    zoneRadius: 5,
    color: "#34D399",
  },
  frequencies: {
    id: "frequencies",
    title: "Hall of Frequencies",
    accent: "236,72,153",
    position: [0, 0, 18],
    zoneRadius: 4,
    buildingSize: [5, 2.5, 2],
    color: "#EC4899",
  },
};

// Collision boxes — [centerX, centerZ, halfWidth, halfDepth]
// Player (radius 0.4) cannot enter these
export const COLLISION_BOXES = [
  // Plaza fountain
  [0, 0, 1.2, 1.2],
  // Music District building
  [18, 0, 2.5, 2],
  // Radio Tower base
  [0, -18, 1.5, 1.5],
  // Hall of Frequencies
  [0, 18, 3, 1.5],
  // Gardens entrance arch
  [-18, 0, 1.5, 1.5],
  // Plaza border walls (low walls around plaza)
  [-6, -6, 3, 0.3],
  [6, -6, 3, 0.3],
  [-6, 6, 3, 0.3],
  [6, 6, 3, 0.3],
];

// Neon path waypoints — connects plaza to each district
export const PATHS = [
  { from: [0, 0], to: [18, 0], color: "#00A0DC", label: "Music" },
  { from: [0, 0], to: [0, -18], color: "#9B7EFF", label: "Radio" },
  { from: [0, 0], to: [-18, 0], color: "#34D399", label: "Gardens" },
  { from: [0, 0], to: [0, 18], color: "#EC4899", label: "Frequencies" },
];

// Hall of Frequencies doors
export const FREQUENCY_DOORS = [
  { id: "focus", label: "Focus", color: "#3B82F6", offset: [-1.5, 0, 1.6] },
  { id: "motivation", label: "Motivation", color: "#F59E0B", offset: [-0.5, 0, 1.6] },
  { id: "wealth", label: "Wealth", color: "#10B981", offset: [0.5, 0, 1.6] },
  { id: "confidence", label: "Confidence", color: "#EC4899", offset: [1.5, 0, 1.6] },
  { id: "relaxation", label: "Relaxation", color: "#8B5CF6", offset: [-1, 0, -1.6] },
  { id: "sleep", label: "Sleep", color: "#6366F1", offset: [1, 0, -1.6] },
];

// Spawn point in Central Plaza
export const SPAWN = [0, 0.8, 0];