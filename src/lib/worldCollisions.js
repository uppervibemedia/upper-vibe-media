import { TREE_POSITIONS } from '../components/vibeworld/cityData';

const TREE_R = 0.5;
const COLLISION_BOXES = [
  ...TREE_POSITIONS.map(([tx, tz]) => [tx, tz, TREE_R, TREE_R]),
  [22 - 1.5, 5, 0.5, 0.5], [22 + 1.5, 5, 0.5, 0.5], [22, 5, 1.2, 1.2],
];

const SKYLINE_NORTH = -36;
const SKYLINE_EAST  =  36;
const SKYLINE_WEST  = -36;
const SKYLINE_BEACH_START = 15;

function circleVsCircle(x1, z1, r1, x2, z2, r2) {
  const dx = x1 - x2, dz = z1 - z2;
  return dx * dx + dz * dz < (r1 + r2) * (r1 + r2);
}

export function resolveCollisions(px, pz, r, isHoverboarding = false) {
  let x = px, z = pz;
  for (const [bx, bz, br] of COLLISION_BOXES) {
    if (!circleVsCircle(x, z, r, bx, bz, br)) continue;
    const dx = x - bx, dz = z - bz;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const overlap = r + br - dist;
    x += (dx / dist) * overlap;
    z += (dz / dist) * overlap;
  }

  if (z < SKYLINE_NORTH + r) z = SKYLINE_NORTH + r;
  if (x > SKYLINE_EAST - r) x = SKYLINE_EAST - r;
  if (x < SKYLINE_WEST + r) x = SKYLINE_WEST + r;

  if (z >= SKYLINE_BEACH_START) {
    const beachProgress = Math.min(1, (z - SKYLINE_BEACH_START) / 18);
    const beachXLimit = 34 - beachProgress * 6;
    if (x > beachXLimit) x = beachXLimit;
    if (x < -beachXLimit) x = -beachXLimit;
  }

  const maxZ = isHoverboarding ? 75 : 34;
  if (z > maxZ) z = maxZ;

  return [x, z];
}