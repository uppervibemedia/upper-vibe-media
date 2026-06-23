/**
 * CrystalZone — Giant Crystal Energy Field
 * Center: (-28, -11)
 *
 * Centerpiece: one huge CLEAR/white diamond crystal
 * Surrounding: colored faceted crystals with realistic gem-like appearance
 * Electric arcs, ground glow, energy particles
 */
import * as THREE from "three";

export const CRYSTAL_ZONE_X = -28;
export const CRYSTAL_ZONE_Z = -11;
export const CRYSTAL_ZONE_RADIUS = 9;

// ─── Build a sharp faceted crystal geometry ──────────────────────────
// Creates a proper gem-like crystal: flat hexagonal base → wide belly → sharp top point
function crystalGeo(radius, height, sides = 6) {
  const geo = new THREE.CylinderGeometry(0, radius, height * 0.38, sides, 1, false);
  const geo2 = new THREE.CylinderGeometry(radius, radius * 0.55, height * 0.30, sides, 1, false);
  const geo3 = new THREE.CylinderGeometry(radius * 0.55, 0.04, height * 0.32, sides, 1, false);
  return mergeGeos([
    { geo: geo3, y: height * 0.38 + height * 0.30 + height * 0.32 * 0.5 },
    { geo: geo2, y: height * 0.38 + height * 0.30 * 0.5 },
    { geo,       y: height * 0.38 * 0.5 },
  ]);
}

function mergeGeos(parts) {
  const positions = [], normals = [], uvs = [], indices = [];
  let offset = 0;
  for (const { geo, y } of parts) {
    const pos = geo.attributes.position.array;
    const nor = geo.attributes.normal.array;
    const uv  = geo.attributes.uv.array;
    const idx = geo.index ? geo.index.array : null;
    for (let i = 0; i < pos.length; i += 3) {
      positions.push(pos[i], pos[i + 1] + y, pos[i + 2]);
    }
    for (let i = 0; i < nor.length; i++) normals.push(nor[i]);
    for (let i = 0; i < uv.length;  i++) uvs.push(uv[i]);
    if (idx) {
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + offset);
      offset += pos.length / 3;
    }
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal",   new THREE.Float32BufferAttribute(normals,   3));
  out.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs,       2));
  if (indices.length) out.setIndex(indices);
  out.computeVertexNormals();
  return out;
}

// Clear/diamond crystal material — high-refraction glass look
function makeClearCrystalMat() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#E8F4FF"),
    emissive: new THREE.Color("#6699FF"),
    emissiveIntensity: 0.35,
    metalness: 0.0,
    roughness: 0.0,
    transmission: 0.92,    // glass-like see-through
    thickness: 1.8,
    ior: 2.1,              // diamond-like refraction
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.0,
  });
}

// Colored crystal — gem-like with strong internal glow
function makeColorCrystalMat(color, emissive, opacity = 0.75) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: 0.6,
    metalness: 0.0,
    roughness: 0.04,
    transmission: 0.55,
    thickness: 0.8,
    ior: 1.8,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

// Thin outer glow shell (BackSide so it halos outside the crystal)
function makeGlowShell(color, opacity = 0.12) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

// Internal light shaft — thin plane inside crystal to simulate light scattering
function makeLightShaftMat(color) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

// Arc lightning
function makeArcLine(color) {
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true, opacity: 0.0, depthWrite: false, linewidth: 1,
  });
  const points = Array.from({ length: 10 }, () => new THREE.Vector3());
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
      points[i].y += (Math.random() - 0.5) * jitter * 0.5;
      points[i].z += (Math.random() - 0.5) * jitter;
    }
  }
  geo.setFromPoints(points);
  geo.attributes.position.needsUpdate = true;
}

function makeParticles(count, radius, color) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    pos[i * 3]     = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 4.0;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size: 0.10, transparent: true, opacity: 0.30,
    depthWrite: false, sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

// ─── Main export ────────────────────────────────────────────────────
export function createCrystalZone(scene) {
  const group = new THREE.Group();
  group.name = "crystalZone";
  group.position.set(CRYSTAL_ZONE_X, 0, CRYSTAL_ZONE_Z);

  // ── Ground pad ───────────────────────────────────────────────────
  const groundGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1133AA"),
    transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide,
  });
  const groundGlow = new THREE.Mesh(new THREE.CircleGeometry(8.5, 64), groundGlowMat);
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.y = 0.02;
  groundGlow.renderOrder = 1;
  groundGlow.name = "crystalGroundGlow";
  group.add(groundGlow);

  // Hexagonal rune rings on the ground
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#88DDFF"), transparent: true, opacity: 0.25,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.55, 6), innerRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.03;
  innerRing.renderOrder = 2;
  group.add(innerRing);

  const midRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#7722FF"), transparent: true, opacity: 0.16,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const midRing = new THREE.Mesh(new THREE.RingGeometry(3.8, 4.05, 6), midRingMat);
  midRing.rotation.x = -Math.PI / 2;
  midRing.rotation.z = Math.PI / 6; // rotate hex ring 30°
  midRing.position.y = 0.03;
  midRing.renderOrder = 2;
  group.add(midRing);

  const outerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#5500CC"), transparent: true, opacity: 0.12,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.5, 64), outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.03;
  outerRing.renderOrder = 2;
  group.add(outerRing);

  // ── HUGE CLEAR CENTERPIECE CRYSTAL ───────────────────────────────
  const bigGeo = crystalGeo(1.05, 7.5, 8);
  const bigMat = makeClearCrystalMat();
  const bigCrystal = new THREE.Mesh(bigGeo, bigMat);
  bigCrystal.position.set(0, 0, 0);
  bigCrystal.name = "bigCrystal";
  bigCrystal.renderOrder = 5;
  group.add(bigCrystal);

  // Inner light shaft — glowing column inside the clear crystal
  const shaftMat = makeLightShaftMat("#AADDFF");
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 6.5, 6), shaftMat);
  shaft.position.set(0, 3.5, 0);
  shaft.renderOrder = 6;
  group.add(shaft);

  // Second angled shaft for rainbow-prism feel
  const shaftMat2 = makeLightShaftMat("#CC88FF");
  const shaft2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 5.0, 6), shaftMat2);
  shaft2.position.set(0.3, 3.0, 0.2);
  shaft2.rotation.z = 0.15;
  shaft2.renderOrder = 6;
  group.add(shaft2);

  // Outer glow shell on big crystal
  const bigGlowGeo = crystalGeo(1.25, 8.0, 8);
  const bigGlowMat = makeGlowShell("#88CCFF", 0.13);
  const bigGlow = new THREE.Mesh(bigGlowGeo, bigGlowMat);
  bigGlow.position.set(0, 0, 0);
  bigGlow.renderOrder = 4;
  group.add(bigGlow);

  // Strong point light inside big crystal
  const bigLight = new THREE.PointLight("#88CCFF", 5.0, 22);
  bigLight.position.set(0, 4.0, 0);
  group.add(bigLight);

  // Secondary warm light for prism shimmer
  const bigLight2 = new THREE.PointLight("#CC88FF", 2.0, 12);
  bigLight2.position.set(0.5, 2.0, 0.5);
  group.add(bigLight2);

  // ── SMALLER SURROUNDING CRYSTALS ─────────────────────────────────
  // Varied sizes, colored gems — positioned like a natural crystal cluster
  const SMALL_CRYSTALS = [
    // [x, z, radius, height, rotY, rotZ, color, emissive, opacity]
    [-3.0,  1.2, 0.32, 3.2, 0.4,  0.08,  "#AA77FF", "#6600CC", 0.78],
    [ 2.8,  0.9, 0.28, 2.6, 1.1,  -0.06, "#00E5FF", "#005599", 0.75],
    [-2.2, -2.8, 0.36, 3.8, 0.7,  0.12,  "#CC66FF", "#880099", 0.80],
    [ 2.5, -3.0, 0.22, 2.0, 2.1,  -0.10, "#55CCFF", "#003388", 0.70],
    [-4.8, -1.2, 0.30, 2.8, 1.8,  0.06,  "#BB55FF", "#550099", 0.76],
    [ 4.5, -1.6, 0.18, 1.6, 0.9,  -0.08, "#00DDFF", "#004477", 0.68],
    [ 1.2,  3.8, 0.25, 2.2, 3.2,  0.10,  "#FF88EE", "#AA0077", 0.72],
    [-1.8,  4.0, 0.20, 1.8, 2.5,  -0.12, "#55EEFF", "#007788", 0.66],
    [ 4.0,  3.0, 0.33, 3.0, 0.6,  0.07,  "#9966FF", "#440099", 0.78],
    // Extra small accent crystals for denser cluster feel
    [-1.2, -1.5, 0.14, 1.2, 1.0,  0.15,  "#00CCFF", "#003366", 0.65],
    [ 1.5, -1.8, 0.12, 1.0, 2.8,  -0.18, "#CC88FF", "#550088", 0.62],
    [-3.5,  3.2, 0.16, 1.4, 0.3,  0.09,  "#88FFEE", "#007766", 0.64],
    [ 3.2, -4.0, 0.18, 1.5, 1.5,  -0.08, "#BB44FF", "#440088", 0.68],
    [-5.0,  0.5, 0.20, 1.8, 0.8,  0.11,  "#00AAFF", "#003399", 0.66],
  ];

  const smallCrystalMeshes = [];
  const smallCrystalPositions = [];

  for (const [sx, sz, rad, h, ry, rz, col, em, op] of SMALL_CRYSTALS) {
    const geo = crystalGeo(rad, h, 6);
    const mat = makeColorCrystalMat(col, em, op);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sx, 0, sz);
    mesh.rotation.y = ry;
    mesh.rotation.z = rz;
    mesh.renderOrder = 4;
    group.add(mesh);

    // Glow shell
    const glowGeo = crystalGeo(rad * 1.28, h + 0.5, 6);
    const glowMat = makeGlowShell(col, 0.09);
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(sx, 0, sz);
    glowMesh.rotation.y = ry;
    glowMesh.rotation.z = rz;
    glowMesh.renderOrder = 3;
    group.add(glowMesh);

    // Point light
    const pl = new THREE.PointLight(col, 0.9, 8);
    pl.position.set(sx, h * 0.55, sz);
    group.add(pl);

    smallCrystalMeshes.push({ mesh, glowMesh, mat, glowMat: glowMesh.material, light: pl, h });
    smallCrystalPositions.push(new THREE.Vector3(sx, h * 0.75, sz));
  }

  // ── Electric arcs ────────────────────────────────────────────────
  const ARC_COLORS = ["#88EEFF", "#BB88FF", "#00DDFF", "#FF88EE", "#44FFCC"];
  const bigTip = new THREE.Vector3(0, 7.5, 0);
  // Arcs from big crystal to 5 nearest smalls
  const arcs = [0, 1, 2, 4, 6].map((idx, i) => {
    const arc = makeArcLine(ARC_COLORS[i % ARC_COLORS.length]);
    group.add(arc.line);
    return { ...arc, targetIdx: idx };
  });

  // Secondary arcs between small crystals
  const secondaryArcs = [[0, 2], [1, 8], [3, 4], [6, 7], [9, 10]].map(([a, b], i) => {
    const arc = makeArcLine(ARC_COLORS[(i + 2) % ARC_COLORS.length]);
    group.add(arc.line);
    return { ...arc, aIdx: a, bIdx: b };
  });

  // ── Particles ────────────────────────────────────────────────────
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const particles = makeParticles(isMobile ? 50 : 100, 7.5, "#88BBFF");
  particles.renderOrder = 2;
  group.add(particles);

  scene.add(group);

  scene.userData.crystalZone = {
    group, bigCrystal, bigMat, bigGlow,
    bigGlowMat: bigGlow.material,
    bigLight, bigLight2,
    shaftMat, shaftMat2,
    groundGlowMat, innerRingMat, midRingMat, outerRingMat,
    smallCrystals: smallCrystalMeshes,
    smallPositions: smallCrystalPositions,
    arcs, secondaryArcs,
    bigTip,
    particles, particleMat: particles.material,
    proximity: 0,
  };
}

// ─── Animation tick ─────────────────────────────────────────────────
export function animateCrystalZone(scene, t, dt, playerX, playerZ) {
  const cz = scene.userData.crystalZone;
  if (!cz) return;

  const dx = playerX - CRYSTAL_ZONE_X;
  const dz = playerZ - CRYSTAL_ZONE_Z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const targetProx = dist < CRYSTAL_ZONE_RADIUS ? Math.max(0, 1 - dist / CRYSTAL_ZONE_RADIUS) : 0;
  cz.proximity += (targetProx - cz.proximity) * Math.min(1, dt * 2.5);
  const prox = cz.proximity;

  const idlePulse = Math.sin(t * 1.1) * 0.5 + 0.5;
  const fastPulse = Math.sin(t * 4.8) * 0.5 + 0.5;
  const pulse = idlePulse + prox * fastPulse * 0.5;

  // ── Big clear crystal — slow rotation, diamond shimmer ──────────
  cz.bigCrystal.rotation.y = t * 0.06;
  cz.bigMat.emissiveIntensity = 0.25 + pulse * 0.20 + prox * 0.65;
  cz.bigMat.opacity = 0.82 + prox * 0.12;
  cz.bigGlowMat.opacity = 0.09 + pulse * 0.06 + prox * 0.20;

  // Light shafts shimmer
  cz.shaftMat.opacity  = 0.12 + Math.sin(t * 2.5) * 0.06 + prox * 0.18;
  cz.shaftMat2.opacity = 0.08 + Math.sin(t * 3.1 + 1.0) * 0.05 + prox * 0.14;

  // Prism color shift on secondary light
  cz.bigLight.intensity  = 3.5 + pulse * 2.0 + prox * 6.0;
  cz.bigLight.distance   = 16 + prox * 12;
  cz.bigLight2.intensity = 1.2 + Math.sin(t * 1.8) * 0.6 + prox * 2.5;
  const hue = (t * 0.08) % 1;
  cz.bigLight2.color.setHSL(hue, 1.0, 0.6);

  // ── Small crystals ───────────────────────────────────────────────
  for (let i = 0; i < cz.smallCrystals.length; i++) {
    const sc = cz.smallCrystals[i];
    const phase = i * 0.65;
    const sp = Math.sin(t * 1.4 + phase) * 0.5 + 0.5;
    const fp = Math.sin(t * 5.2 + phase) * 0.5 + 0.5;
    const localPulse = sp + prox * fp * 0.4;
    sc.mat.emissiveIntensity = 0.45 + localPulse * 0.35 + prox * 0.75;
    sc.mat.opacity = 0.68 + prox * 0.16;
    sc.glowMat.opacity = 0.06 + localPulse * 0.06 + prox * 0.16;
    sc.light.intensity = 0.7 + sp * 0.5 + prox * 2.8;
    // Gentle float
    sc.mesh.position.y = Math.sin(t * 0.85 + phase) * 0.07;
    sc.glowMesh.position.y = sc.mesh.position.y;
  }

  // ── Ground rings ─────────────────────────────────────────────────
  cz.groundGlowMat.opacity = 0.10 + pulse * 0.06 + prox * 0.20;
  cz.innerRingMat.opacity  = 0.20 + pulse * 0.12 + prox * 0.40;
  cz.midRingMat.opacity    = 0.12 + pulse * 0.08 + prox * 0.28;
  cz.outerRingMat.opacity  = 0.08 + pulse * 0.05 + prox * 0.18;
  // Hex rings slowly rotate
  if (cz.group) {
    const innerRing = cz.group.children.find(c => c.geometry?.type === "RingGeometry" && c.geometry.parameters?.innerRadius === 1.3);
    if (innerRing) innerRing.rotation.z = t * 0.12;
  }

  // ── Arcs ─────────────────────────────────────────────────────────
  if (!cz._arcTimer) cz._arcTimer = 0;
  cz._arcTimer += dt;
  const arcRate = 0.07 + prox * 0.03;
  const fireArc = cz._arcTimer >= arcRate;
  if (fireArc) cz._arcTimer = 0;

  for (const arc of cz.arcs) {
    const target = cz.smallPositions[arc.targetIdx];
    if (!target) continue;
    const jitter = 0.22 + prox * 0.65;
    arc.mat.opacity = Math.max(0, 0.10 + prox * 0.70 + Math.sin(t * 6.5 + arc.targetIdx) * 0.15);
    if (fireArc) updateArc(arc, cz.bigTip, target, jitter);
  }

  for (const arc of cz.secondaryArcs) {
    const aPos = cz.smallPositions[arc.aIdx];
    const bPos = cz.smallPositions[arc.bIdx];
    if (!aPos || !bPos) continue;
    arc.mat.opacity = Math.max(0, prox * 0.45 + Math.sin(t * 7.5 + arc.aIdx) * 0.08 * prox);
    if (fireArc && prox > 0.08) updateArc(arc, aPos, bPos, 0.10 + prox * 0.30);
  }

  // ── Particles ────────────────────────────────────────────────────
  cz.particleMat.opacity = 0.18 + pulse * 0.10 + prox * 0.38;
  cz.particleMat.size    = 0.09 + prox * 0.08;
  const posAttr = cz.particles.geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setY(i, posAttr.getY(i) + dt * (0.18 + prox * 0.30));
    if (posAttr.getY(i) > 5.0) posAttr.setY(i, 0);
  }
  posAttr.needsUpdate = true;
}