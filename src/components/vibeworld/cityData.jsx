/**
 * Upper Vibe Plaza — Layout Data
 * A single detailed city square block.
 * Units are in world-space meters. Y=0 is ground level.
 */

export const DISTRICTS = {
  musicStore: {
    id: "music",
    title: "Music District",
    accent: "0,160,220",
    position: [0, 0, -9],
    zoneRadius: 3,
    color: "#00A0DC",
  },
  radioStation: {
    id: "radio",
    title: "Radio Tower",
    accent: "155,126,255",
    position: [7, 0, 0],
    zoneRadius: 3,
    color: "#9B7EFF",
  },
  gardenEntrance: {
    id: "gardens",
    title: "Manifestation Gardens",
    accent: "52,211,153",
    position: [-7, 0, 0],
    zoneRadius: 4,
    color: "#34D399",
  },
};

// Collision boxes — [centerX, centerZ, halfWidth, halfDepth]
export const COLLISION_BOXES = [
  // Fountain
  [0, 0, 1.5, 1.5],
  // Central planter left
  [-3, 2, 0.8, 0.8],
  // Central planter right
  [3, -1.5, 0.8, 0.8],
  // Music Store building
  [0, -7, 6, 2.5],
  // Radio Station building
  [7, 0, 2.5, 4],
  // Garden wall/entrance
  [-7, 0, 2, 4],
  // Plaza border bollards/planters
  [-4, -5, 0.3, 0.3],
  [4, -5, 0.3, 0.3],
  [-5, 4, 0.3, 0.3],
  [5, -4, 0.3, 0.3],
];

// Spawn point — at the south entrance of the plaza
export const SPAWN = [0, 0.8, 5];