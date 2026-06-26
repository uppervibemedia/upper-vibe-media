/**
 * Zone detection — returns which zone the player is in based on (x, z) position.
 * All coordinates match the layout in CityCanvas.jsx (buildPark).
 */

const ZONES = {
  plaza: {
    name: "UVC Central Plaza",
    id: "plaza",
    cx: 0, cz: -13, radius: 7,
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
    cx: -13, cz: 3, radius: 5,
    icon: "Tv2",
  },
  vibecheck: {
    name: "Daily Vibe Check",
    id: "vibecheck",
    cx: -16, cz: -13, radius: 4,
    icon: "Sparkles",
  },
  zenbeach: {
    name: "Zen Beach",
    id: "zenbeach",
    cx: -20, cz: 22, radius: 5,
    icon: "Waves",
  },
  beach: {
    name: "Beach Walk",
    id: "beach",
    cx: 0, cz: 24, radius: 18,
    icon: "Sun",
  },
  academy: {
    name: "Vibe Academy",
    id: "academy",
    cx: -28, cz: 5, radius: 5,
    icon: "GraduationCap",
  },
  ferriswheel: {
    name: "Neon Vibe Wheel",
    id: "ferriswheel",
    cx: 22, cz: 5, radius: 9.5,
    icon: "Ferris",
  },
  shop: {
    name: "Upper Vibe Shop",
    id: "shop",
    cx: 0, cz: 10, radius: 6,
    icon: "Store",
  },
  hoverboard: {
    name: "Neon Surf Beach",
    id: "hoverboard",
    cx: 28, cz: 23, radius: 8,
    icon: "Zap",
  },
  crystalzone: {
    name: "Crystal Zone",
    id: "crystalzone",
    cx: -28, cz: -11, radius: 9,
    icon: "Sparkles",
  },
};

export function detectZone(px, pz) {
  for (const zone of Object.values(ZONES)) {
    const dx = px - zone.cx;
    const dz = pz - zone.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= zone.radius) return zone;
  }
  return null; // wandering between zones
}

export function getZoneInfo(zoneId) {
  return ZONES[zoneId] || null;
}

export { ZONES };