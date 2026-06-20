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
    cx: 0, cz: -14, radius: 5,
    icon: "Music4",
  },
  dome: {
    name: "Visualizer Dome",
    id: "dome",
    cx: -12, cz: -3, radius: 4.5,
    icon: "Tv2",
  },
  lounge: {
    name: "Vibe Lounge",
    id: "lounge",
    cx: 12, cz: -3, radius: 5,
    icon: "MessageCircle",
  },
  shop: {
    name: "Shop District",
    id: "shop",
    cx: 16, cz: -11, radius: 6,
    icon: "Store",
  },
  beach: {
    name: "Beach Walk",
    id: "beach",
    cx: 0, cz: 18, radius: 20,
    icon: "Waves",
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