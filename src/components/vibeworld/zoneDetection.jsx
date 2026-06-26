/**
 * zoneDetection.jsx — Zone definitions and proximity detection for Upper Vibe City.
 */
export const ZONES = [
  { id: "plaza",      name: "Plaza",          x: 0,   z: -13, r: 10.5 },
  { id: "stage",      name: "Music Stage",    x: 0,   z: -32, r: 8 },
  { id: "lounge",     name: "Vibe Lounge",    x: -22, z: -26, r: 7 },
  { id: "library",    name: "Music Library",  x: 22,  z: -20, r: 6 },
  { id: "dome",       name: "Visualizer Dome",x: -13, z: 3,   r: 6 },
  { id: "vibecheck",  name: "Vibe Check",     x: -16, z: -13, r: 5 },
  { id: "academy",    name: "Vibe Academy",   x: -20, z: 5,   r: 6 },
  { id: "zenbeach",   name: "Zen Beach",      x: 0,   z: 24,  r: 9 },
  { id: "ferriswheel", name: "Ferris Wheel",  x: 0,   z: 14,  r: 7 },
];

export function detectZone(px, pz) {
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i];
    const dx = px - z.x;
    const dz = pz - z.z;
    if (dx * dx + dz * dz <= z.r * z.r) return z;
  }
  return null;
}