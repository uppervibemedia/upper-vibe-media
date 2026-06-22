/**
 * Zone detection — returns which zone the player is in based on (x, z) position.
 * All coordinates match the layout in CityCanvas.jsx (buildPark).
 */

const ZONES = {
  plaza: {
    name: "UVC Central Plaza",
    id: "plaza",
    cx: 0, cz: -4, radius: 7,
    icon: "Compass",
  },
  stage: {
    name: "Main Music Stage",
    id: "stage",
    cx: 0, cz: -15, radius: 5,
    icon: "Music4",
  },
  lounge: {
    name: "Vibe Lounge",
    id: "lounge",
    cx: -16, cz: -10, radius: 5,
    icon: "MessageCircle",
  },
  library: {
    name: "Music Library",
    id: "library",
    cx: 16, cz: -10, radius: 5,
    icon: "Library",
  },
  dome: {
    name: "Visualizer Dome",
    id: "dome",
    cx: -10, cz: 8, radius: 5,
    icon: "Tv2",
  },
  vibecheck: {
    name: "Daily Vibe Check",
    id: "vibecheck",
    cx: 10, cz: 4, radius: 4,
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
    cx: -20, cz: 5, radius: 5,
    icon: "GraduationCap",
  },
  shop: {
    name: "Vibe Shop",
    id: "shop",
    cx: 22, cz: 5, radius: 4.5,
    icon: "ShoppingBag",
  },
  launchzone: {
    name: "Vibe Launch Zone",
    id: "launchzone",
    cx: 0, cz: 4, radius: 6,
    icon: "Rocket",
  },
  djbooth: {
    name: "Live DJ Booth",
    id: "djbooth",
    cx: 12, cz: -4, radius: 5,
    icon: "Music4",
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