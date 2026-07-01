/**
 * Zone detection — returns which zone the player is in based on (x, z) position.
 * All coordinates match the layout in CityCanvas.jsx (buildPark).
 */

const ZONES = {
  plaza: {
    name: "UVC Central Plaza",
    id: "plaza",
    cx: 0, cz: -6, radius: 6,
    icon: "Compass",
  },
  stage: {
    name: "Main Music Stage",
    id: "stage",
    cx: 0, cz: -32, radius: 6,
    icon: "Music4",
  },
  lounge: {
    name: "Vibe Lounge",
    id: "lounge",
    cx: -22, cz: -26, radius: 5,
    icon: "MessageCircle",
  },
  library: {
    name: "Music Library",
    id: "library",
    cx: 22, cz: -20, radius: 5,
    icon: "Library",
  },
  dome: {
    name: "Visualizer Dome",
    id: "dome",
    cx: -13, cz: 10, radius: 7,
    icon: "Tv2",
  },
  vibecheck: {
    name: "Daily Vibe Check",
    id: "vibecheck",
    cx: -16, cz: -13, radius: 4,
    icon: "Sparkles",
  },
  leaderboard: {
    name: "Frequency Leaderboard",
    id: "leaderboard",
    cx: -13, cz: 17, radius: 4.5,
    icon: "Trophy",
  },
  zenbeach: {
    name: "Zen Beach",
    id: "zenbeach",
    cx: 40, cz: 12, radius: 7,
    icon: "Waves",
  },
  beach: {
    name: "Beach Walk",
    id: "beach",
    cx: 0, cz: 24, radius: 18,
    icon: "Sun",
  },
  academy: {
    name: "Main Vibe Academy",
    id: "academy",
    cx: -28, cz: 10, radius: 7,
    icon: "GraduationCap",
  },
  retreatacademy: {
    name: "Vibe Retreat Academy",
    id: "retreatacademy",
    cx: -18, cz: 16, radius: 7,
    icon: "GraduationCap",
  },
  coaster: {
    name: "Vibe Coaster",
    id: "coaster",
    cx: -12, cz: -20, radius: 10,
    icon: "Sparkles",
  },
  frequencycove: {
    name: "Frequency Cove",
    id: "frequencycove",
    cx: -52, cz: 2, radius: 8,
    icon: "Sparkles",
  },
  bonfirebeach: {
    name: "Bonfire Beach",
    id: "bonfirebeach",
    cx: 52, cz: 20, radius: 7,
    icon: "Sparkles",
  },
  shop: {
    name: "Upper Vibe Shop",
    id: "shop",
    cx: 22, cz: 12.25, radius: 6,
    icon: "ShoppingBag",
  },
  ferriswheel: {
    name: "Neon Vibe Wheel",
    id: "ferriswheel",
    cx: 0, cz: 24, radius: 10,
    icon: "Sparkles",
  },
  surfzone: {
    name: "Surf Zone",
    id: "surfzone",
    cx: 18, cz: 34, radius: 7,
    icon: "Waves",
  },
  divezone: {
    name: "Dive Zone",
    id: "divezone",
    cx: 35, cz: 34, radius: 7,
    icon: "Waves",
  },
  crystalzone: {
    name: "Crystal Nodes",
    id: "crystalzone",
    cx: 0, cz: -10, radius: 0,
    icon: "Sparkles",
  },
};

export function detectZone(px, pz) {
  const mode = typeof window !== "undefined" ? (window.__uvcWorldMode || "city") : "city";
  const beachOnly = new Set(["zenbeach", "beach", "retreatacademy", "surfzone", "divezone", "coaster", "frequencycove", "bonfirebeach"]);
  for (const zone of Object.values(ZONES)) {
    if (mode === "beach" && !beachOnly.has(zone.id)) continue;
    if (mode === "city" && beachOnly.has(zone.id)) continue;
    const dx = px - zone.cx;
    const dz = pz - zone.cz;
    if (dx * dx + dz * dz <= zone.radius * zone.radius) return zone;
  }
  return null; // wandering between zones
}

export function getZoneInfo(zoneId) {
  return ZONES[zoneId] || null;
}

export { ZONES };