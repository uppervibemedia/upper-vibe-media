/**
 * CrystalZone — Giant Crystal Energy Field
 * Placed between Vibe Lounge (-22,-26) and Vibe Academy (-28, 5)
 * Center: (-28, -11)
 *
 * Features:
 * - One giant centerpiece crystal + 9 smaller surrounding crystals
 * - Electric energy arcing between crystals
 * - Proximity activation: idle glow → charge-up on approach
 * - Ground glow pad + energy mist particles
 * - Optimized for mobile (lower particle counts, shared geometry)
 */
import * as THREE from "three";

export const CRYSTAL_ZONE_X = -28;
export const CRYSTAL_ZONE_Z = -11;
export const CRYSTAL_ZONE_RADIUS = 9;

// ─── Shared geometry helpers ────────────────────────────────────────
function crystalGeo(radiusBot, radiusMid, height, sides = 6) {
  // A crystal = tapered cylinder (octahedron-ish prism):
  // bottom point → wide middle → top point
  const geo = new THREE.CylinderGeometry(0, radiusMid, height * 0.55, sides, 1);
  const geo2 = new THREE.CylinderGeometry(radiusMid, 0, height * 0.45, sides, 1);
  // Merge via BufferGeometry (manual merge)
  const merged = mergeGeos([
    { geo: geo2, y: height * 0.55 * 0.5 + height * 0.45 * 0.5 },
    { geo, y: height * 0.55 * 0.5 },
  ]);
  return merged;
}

function mergeGeos(parts) {
  // Manual vertex merge for CylinderGeometry parts
  const positions = [];
  const normals = [];
  const uvs = [];
  let offset = 0;
  const indices = [];

  for (const { geo, y } of parts) {
    const pos = geo.attributes.position.array;
    const nor = geo.attributes.normal.array;
    const uv = geo.attributes.uv.array;
    const idx = geo.index ? geo.index.array : null;

    for (let i = 0; i < pos.length; i += 3) {
      positions.push(pos[i], pos[i + 1] + y, pos[i + 2]);
    }
    for (let i = 0; i < nor.length; i++) normals.push(nor[i]);
    for (let i = 0; i < uv.length; i++) uvs.push(uv[i]);

    if (idx) {
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + offset);
      offset += pos.length / 3;
    }
    geo.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  if (indices.length) out.setIndex(indices);
  out.computeVertexNormals();
  return out;
}

function makeCrystalMat(color, emissiveColor, opacity = 0.72) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissiveColor),
    emissiveIntensity: 0.55,
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function makeGlowMat(color, opacity = 0.18) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

// ─── Arc / lightning segment ─────────────────────────────────────────
// An "arc" is a thin tube that connects two positions with jitter.
// We redraw it every N frames for a sparking effect.
function makeArcLine(color) {
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    linewidth: 1,
  });
  const points = Array.from({ length: 8 }, () => new THREE.Vector3());
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, mat);
  line.renderOrder = 3;
  return { line, mat, geo, points };
}

function updateArc(arc, fromPos, toPos, jitter) {
  const { points, geo } = arc;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    points[i].lerpVectors(fromPos, toPos, t);
    if (i > 0 && i < n - 1) {
      points[i].x += (Math.random() - 0.5) * jitter;
      points[i].y += (Math.random() - 0.5) * jitter * 0.6;
      points[i].z += (Math.random() - 0.5) * jitter;
    }
  }
  geo.setFromPoints(points);
  geo.attributes.position.needsUpdate = true;
}

// ─── Floating particles (energy mist) ────────────────────────────────
function makeParticles(count, radius, color) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.random() * 3.5;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size: 0.12,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

// ─── Main export ────────────────────────────────────────────────────
export function createCrystalZone(scene) {
  const group = new THREE.Group();
  group.name = "crystalZone";
  group.position.set(CRYSTAL_ZONE_X, 0, CRYSTAL_ZONE_Z);

  // ── Ground glow pad ──────────────────────────────────────────────
  const groundGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#2244BB"),
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const groundGlow = new THREE.Mesh(new THREE.CircleGeometry(8.5, 48), groundGlowMat);
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.y = 0.02;
  groundGlow.renderOrder = 1;
  groundGlow.name = "crystalGroundGlow";
  group.add(groundGlow);

  // Inner ring
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00D4F0"),
    transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
  });
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 48), innerRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.03;
  innerRing.renderOrder = 2;
  group.add(innerRing);

  // Outer ring
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#7722FF"),
    transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(6.0, 6.4, 64), outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.03;
  outerRing.renderOrder = 2;
  group.add(outerRing);

  // ── Giant centerpiece crystal ─────────────────────────────────────
  const bigGeo = crystalGeo(0, 0.75, 5.8, 7);
  const bigMat = makeCrystalMat("#88CCFF", "#0088DD", 0.78);
  const bigCrystal = new THREE.Mesh(bigGeo, bigMat);
  bigCrystal.position.set(0, 0, 0);
  bigCrystal.castShadow = false;
  bigCrystal.name = "bigCrystal";
  bigCrystal.renderOrder = 4;
  group.add(bigCrystal);

  // Big crystal outer glow shell
  const bigGlowGeo = crystalGeo(0, 0.95, 6.2, 7);
  const bigGlowMat = makeGlowMat("#0088EE", 0.14);
  const bigGlow = new THREE.Mesh(bigGlowGeo, bigGlowMat);
  bigGlow.position.set(0, 0, 0);
  bigGlow.renderOrder = 3;
  group.add(bigGlow);

  // Point light at big crystal
  const bigLight = new THREE.PointLight("#44AAFF", 3.5, 18);
  bigLight.position.set(0, 3.5, 0);
  group.add(bigLight);

  // ── Small crystals — positions around center ──────────────────────
  // 9 smaller crystals, varied sizes & rotations, natural cluster feel
  const SMALL_CRYSTALS = [
    // [x, z, height, rotY, colorHex, emissiveHex, opacity]
    [-3.2,  1.1, 2.8, 0.4,  "#AA88FF", "#6600CC", 0.70],
    [ 2.8,  0.8, 2.2, 1.1,  "#00E5FF", "#0066AA", 0.68],
    [-2.0, -3.0, 3.1, 0.7,  "#CC88FF", "#7711BB", 0.72],
    [ 2.2, -2.8, 1.8, 2.1,  "#88DDFF", "#0055BB", 0.65],
    [-4.5, -1.5, 2.4, 1.8,  "#BB88FF", "#5500AA", 0.70],
    [ 4.2, -1.8, 1.5, 0.9,  "#00CCFF", "#004488", 0.60],
    [ 1.0,  3.5, 2.0, 3.2,  "#DD99FF", "#8800CC", 0.68],
    [-1.5,  3.8, 1.6, 2.5,  "#55DDFF", "#0077AA", 0.62],
    [ 3.8,  3.2, 2.6, 0.6,  "#BB77FF", "#6600BB", 0.72],
  ];

  const smallCrystalMeshes = [];
  const smallCrystalPositions = []; // world-local positions for arc endpoints

  for (const [sx, sz, h, ry, col, em, op] of SMALL_CRYSTALS) {
    const sides = 5 + Math.floor(Math.random() * 2);
    const geo = crystalGeo(0, h * 0.18, h, sides);
    const mat = makeCrystalMat(col, em, op);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sx, 0, sz);
    mesh.rotation.y = ry;
    mesh.rotation.z = (Math.random() - 0.5) * 0.18; // slight lean
    mesh.renderOrder = 4;
    group.add(mesh);

    // Glow shell
    const glowGeo = crystalGeo(0, h * 0.23, h + 0.4, sides);
    const glowMesh = new THREE.Mesh(glowGeo, makeGlowMat(col, 0.10));
    glowMesh.position.set(sx, 0, sz);
    glowMesh.rotation.y = ry;
    glowMesh.rotation.z = mesh.rotation.z;
    glowMesh.renderOrder = 3;
    group.add(glowMesh);

    // Tiny point light at each small crystal
    const pl = new THREE.PointLight(col, 0.8, 7);
    pl.position.set(sx, h * 0.6, sz);
    group.add(pl);

    smallCrystalMeshes.push({ mesh, glowMesh, mat, glowMat: glowMesh.material, light: pl, h });
    smallCrystalPositions.push(new THREE.Vector3(sx, h * 0.7, sz));
  }

  // ── Electric arcs: big crystal → 4 nearest small crystals ────────
  const ARC_COLORS = ["#44EEFF", "#BB88FF", "#00CCFF", "#CC66FF"];
  const arcTargetIndices = [0, 1, 2, 4]; // indices into smallCrystalPositions
  const bigCrystalTip = new THREE.Vector3(0, 5.8, 0);
  const arcs = arcTargetIndices.map((idx, i) => {
    const arc = makeArcLine(ARC_COLORS[i % ARC_COLORS.length]);
    group.add(arc.line);
    return { ...arc, targetIdx: idx };
  });

  // Secondary arcs between small crystals
  const arcPairs = [[0, 2], [1, 8], [3, 5], [6, 7]];
  const secondaryArcs = arcPairs.map(([a, b], i) => {
    const arc = makeArcLine(ARC_COLORS[(i + 1) % ARC_COLORS.length]);
    group.add(arc.line);
    return { ...arc, aIdx: a, bIdx: b };
  });

  // ── Energy mist particles ─────────────────────────────────────────
  // Use fewer particles on mobile-like conditions (detect via window width)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const particles = makeParticles(isMobile ? 40 : 80, 7.0, "#4488FF");
  particles.renderOrder = 2;
  group.add(particles);

  scene.add(group);

  // Store all refs for animation
  scene.userData.crystalZone = {
    group,
    bigCrystal,
    bigMat,
    bigGlow,
    bigGlowMat: bigGlow.material,
    bigLight,
    groundGlowMat,
    innerRingMat,
    outerRingMat,
    smallCrystals: smallCrystalMeshes,
    smallPositions: smallCrystalPositions,
    arcs,
    secondaryArcs,
    bigTip: bigCrystalTip,
    particles,
    particleMat: particles.material,
    proximity: 0, // 0 = idle, 1 = fully activated
  };
}

// ─── Animation tick ──────────────────────────────────────────────────
// playerX, playerZ — world-space position of the player
export function animateCrystalZone(scene, t, dt, playerX, playerZ) {
  const cz = scene.userData.crystalZone;
  if (!cz) return;

  // Proximity factor (0 = idle, 1 = close)
  const dx = playerX - CRYSTAL_ZONE_X;
  const dz = playerZ - CRYSTAL_ZONE_Z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const targetProx = dist < CRYSTAL_ZONE_RADIUS ? Math.max(0, 1 - dist / CRYSTAL_ZONE_RADIUS) : 0;
  cz.proximity += (targetProx - cz.proximity) * Math.min(1, dt * 2.5);
  const prox = cz.proximity;

  // Idle: soft low-freq pulse. Activated: fast bright charge
  const idlePulse = Math.sin(t * 1.2) * 0.5 + 0.5;
  const fastPulse = Math.sin(t * 4.5) * 0.5 + 0.5;
  const pulse = idlePulse + prox * fastPulse * 0.6;

  // ── Big crystal ──────────────────────────────────────────────────
  cz.bigMat.emissiveIntensity = 0.45 + pulse * 0.35 + prox * 0.8;
  cz.bigMat.opacity = 0.72 + prox * 0.14;
  cz.bigGlowMat.opacity = 0.10 + pulse * 0.06 + prox * 0.22;
  cz.bigCrystal.rotation.y = t * 0.08;
  cz.bigLight.intensity = 2.5 + pulse * 1.5 + prox * 5.0;
  cz.bigLight.distance = 14 + prox * 10;

  // ── Small crystals ────────────────────────────────────────────────
  for (let i = 0; i < cz.smallCrystals.length; i++) {
    const sc = cz.smallCrystals[i];
    const phase = i * 0.72;
    const sp = Math.sin(t * 1.5 + phase) * 0.5 + 0.5;
    const fp = Math.sin(t * 5.0 + phase) * 0.5 + 0.5;
    const localPulse = sp + prox * fp * 0.5;
    sc.mat.emissiveIntensity = 0.4 + localPulse * 0.3 + prox * 0.7;
    sc.mat.opacity = 0.62 + prox * 0.18;
    sc.glowMat.opacity = 0.07 + localPulse * 0.05 + prox * 0.18;
    sc.light.intensity = 0.6 + sp * 0.4 + prox * 2.5;
    // Subtle float
    sc.mesh.position.y = Math.sin(t * 0.9 + phase) * 0.06;
    sc.glowMesh.position.y = sc.mesh.position.y;
  }

  // ── Ground glow ──────────────────────────────────────────────────
  cz.groundGlowMat.opacity = 0.10 + pulse * 0.05 + prox * 0.18;
  cz.innerRingMat.opacity = 0.18 + pulse * 0.10 + prox * 0.35;
  cz.outerRingMat.opacity = 0.10 + pulse * 0.06 + prox * 0.20;

  // ── Electric arcs from big crystal ───────────────────────────────
  // Fire arcs on a timer — more frequent when player is near
  const arcFireRate = 0.08 + prox * 0.04; // seconds between redraws
  if (!cz._arcTimer) cz._arcTimer = 0;
  cz._arcTimer += dt;
  const fireArc = cz._arcTimer >= arcFireRate;
  if (fireArc) cz._arcTimer = 0;

  for (const arc of cz.arcs) {
    const target = cz.smallPositions[arc.targetIdx];
    const jitter = 0.18 + prox * 0.55;
    const arcOpacity = 0.12 + prox * 0.65 + Math.sin(t * 6.0 + arc.targetIdx) * 0.15;
    arc.mat.opacity = Math.max(0, arcOpacity);
    if (fireArc) updateArc(arc, cz.bigTip, target, jitter);
  }

  // Secondary arcs — only visible when player is fairly close
  for (const arc of cz.secondaryArcs) {
    const aPos = cz.smallPositions[arc.aIdx];
    const bPos = new THREE.Vector3(
      cz.smallPositions[arc.bIdx].x,
      cz.smallPositions[arc.bIdx].y,
      cz.smallPositions[arc.bIdx].z,
    );
    const aOpacity = prox * 0.4 + Math.sin(t * 7.0 + arc.aIdx) * 0.1 * prox;
    arc.mat.opacity = Math.max(0, aOpacity);
    if (fireArc && prox > 0.1) updateArc(arc, aPos, bPos, 0.12 + prox * 0.35);
  }

  // ── Particles ────────────────────────────────────────────────────
  cz.particleMat.opacity = 0.20 + pulse * 0.10 + prox * 0.35;
  cz.particleMat.size = 0.10 + prox * 0.08;
  // Slow Y-drift of particles
  const pos = cz.particles.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) + dt * (0.15 + prox * 0.25));
    if (pos.getY(i) > 4.0) pos.setY(i, 0);
  }
  pos.needsUpdate = true;
}