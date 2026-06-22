import * as THREE from "three";

// ─── Crystal Zone — Giant crystal field between Vibe Lounge and Vibe Academy ───
// Center: (-26, 0, -12) — open space on the left side of the map

export const CRYSTAL_ZONE_CENTER = { x: -26, z: -12 };
export const CRYSTAL_ZONE_RADIUS = 7.5;

// ── Helpers ───────────────────────────────────────────────────────────────────
function mat(hex, opts = {}) {
  const m = new THREE.MeshStandardMaterial();
  m.color = new THREE.Color(hex);
  m.roughness = opts.roughness ?? 0.08;
  m.metalness = opts.metalness ?? 0.15;
  if (opts.transparent || opts.opacity !== undefined) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 0.82;
    m.depthWrite = opts.depthWrite ?? false;
  }
  return m;
}

// Build a single crystal using a tapered geometry stack
// Returns a Group with userData for animation
function buildCrystal(scene, cx, cy, cz, heightScale, radiusScale, colorHex, tiltX = 0, tiltZ = 0) {
  const group = new THREE.Group();
  group.position.set(cx, cy, cz);
  group.rotation.x = tiltX;
  group.rotation.z = tiltZ;

  const H = 1.8 * heightScale;
  const R = 0.22 * radiusScale;
  const segments = 6; // hexagonal prism

  // Body — semi-transparent glowing shard
  const bodyGeo = new THREE.CylinderGeometry(R * 0.55, R, H * 0.72, segments, 1, false);
  const bodyMat = mat(colorHex, { opacity: 0.72, roughness: 0.06, metalness: 0.2 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = H * 0.36;
  body.castShadow = true;
  group.add(body);

  // Tip — sharp point
  const tipGeo = new THREE.ConeGeometry(R * 0.55, H * 0.42, segments, 1, false);
  const tipMat = mat(colorHex, { opacity: 0.85, roughness: 0.04, metalness: 0.25 });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.y = H * 0.72 + H * 0.21;
  group.add(tip);

  // Inner glow core — brighter, more transparent
  const coreGeo = new THREE.CylinderGeometry(R * 0.22, R * 0.35, H * 0.6, segments);
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = H * 0.32;
  group.add(core);

  // Ground footprint ring
  const footRing = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.9, R * 1.6, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex), transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.01;
  group.add(footRing);

  scene.add(group);

  return {
    group,
    bodyMat,
    tipMat,
    coreMat,
    footRing: footRing.material,
    baseOpacity: { body: 0.72, tip: 0.85, core: 0.38, foot: 0.18 },
    colorHex,
    H,
  };
}

// Build the arc of "electric bolt" line segments between two points
// Returns a Line object stored in scene.userData for animation
function buildArcLine(scene, from, to, colorHex) {
  const count = 12;
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    linewidth: 1,
  });

  const line = new THREE.Line(geo, mat);
  line.renderOrder = 3;
  scene.add(line);

  return { line, from: from.clone(), to: to.clone(), colorHex, mat, positions };
}

// ── Main export: creates the entire crystal zone ──────────────────────────────
export function createCrystalZone(scene) {
  const CX = CRYSTAL_ZONE_CENTER.x;
  const CZ = CRYSTAL_ZONE_CENTER.z;

  // ── Ground energy disc ─────────────────────────────────────────────────────
  const groundDisc = new THREE.Mesh(
    new THREE.CircleGeometry(CRYSTAL_ZONE_RADIUS, 64),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color("#1A0A2E"),
      transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.set(CX, 0.002, CZ);
  groundDisc.renderOrder = 0;
  scene.add(groundDisc);

  // Outer energy ring
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(CRYSTAL_ZONE_RADIUS - 0.4, CRYSTAL_ZONE_RADIUS, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#8B5CF6"), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.set(CX, 0.004, CZ);
  outerRing.renderOrder = 1;
  scene.add(outerRing);

  // Mid energy ring
  const midRing = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.5, 48),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#00D4F0"), transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
  );
  midRing.rotation.x = -Math.PI / 2;
  midRing.position.set(CX, 0.005, CZ);
  midRing.renderOrder = 1;
  scene.add(midRing);

  // ── Main giant crystal ─────────────────────────────────────────────────────
  const giant = buildCrystal(scene, CX, 0, CZ, 3.8, 2.2, "#A78BFF", 0, 0);

  // Extra halo ring around giant base
  const haloRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.2, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#C4B5FD"), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })
  );
  haloRing.rotation.x = -Math.PI / 2;
  haloRing.position.set(CX, 0.008, CZ);
  haloRing.renderOrder = 2;
  scene.add(haloRing);

  // ── Smaller crystals — arranged in a natural ring + scatter ───────────────
  const smallCrystalDefs = [
    // [angle from center, distance, heightScale, radiusScale, color, tiltX, tiltZ]
    [0.0,   3.8, 1.6, 1.3, "#00E5FF",  0.05, -0.08],
    [0.7,   4.2, 1.1, 1.0, "#7C3AED",  0.08,  0.04],
    [1.4,   3.5, 1.9, 1.5, "#C084FC", -0.06,  0.10],
    [2.1,   4.0, 0.9, 0.85,"#06B6D4",  0.04, -0.06],
    [2.8,   3.7, 1.4, 1.1, "#818CF8",  0.07,  0.05],
    [3.5,   4.3, 1.2, 0.9, "#A78BFF", -0.05,  0.09],
    [4.2,   3.6, 2.0, 1.4, "#38BDF8",  0.09, -0.07],
    [5.0,   4.1, 1.0, 0.8, "#E879F9", -0.08,  0.06],
    [5.7,   3.9, 1.5, 1.2, "#22D3EE",  0.06,  0.04],
    // Tighter inner ring
    [0.4,   2.2, 0.75, 0.7, "#C4B5FD", 0.10, -0.10],
    [1.8,   2.5, 0.65, 0.6, "#67E8F9", 0.08,  0.08],
    [3.2,   2.1, 0.80, 0.72,"#A78BFF",-0.07,  0.07],
    [4.8,   2.4, 0.60, 0.65,"#F0ABFC", 0.09, -0.06],
    // Micro accent crystals at zone edge
    [1.1,   5.2, 0.45, 0.5, "#818CF8", 0.12,  0.08],
    [3.8,   5.4, 0.50, 0.48,"#00E5FF",-0.10,  0.12],
    [5.4,   5.1, 0.42, 0.44,"#C084FC", 0.08, -0.09],
  ];

  const smallCrystals = smallCrystalDefs.map(([angle, dist, hs, rs, color, tx, tz]) => {
    const sx = CX + Math.cos(angle) * dist;
    const sz = CZ + Math.sin(angle) * dist;
    return buildCrystal(scene, sx, 0, sz, hs, rs, color, tx, tz);
  });

  // ── Electric arc lines from giant to ring crystals ────────────────────────
  const giantTopPos = new THREE.Vector3(CX, giant.H * 0.85, CZ);
  const arcTargets = [0, 2, 4, 6, 8]; // indices into smallCrystals (outer ring)
  const arcs = arcTargets.map((i) => {
    const sc = smallCrystals[i];
    const sp = sc.group.position.clone();
    sp.y += sc.H * 0.75;
    const color = i % 2 === 0 ? "#00E5FF" : "#C084FC";
    return buildArcLine(scene, giantTopPos, sp, color);
  });

  // ── Point light for the crystal zone ─────────────────────────────────────
  const crystalLight = new THREE.PointLight();
  crystalLight.color = new THREE.Color("#A78BFF");
  crystalLight.intensity = 2.5;
  crystalLight.distance = 14;
  crystalLight.position.set(CX, 3.5, CZ);
  scene.add(crystalLight);

  const crystalLight2 = new THREE.PointLight();
  crystalLight2.color = new THREE.Color("#00E5FF");
  crystalLight2.intensity = 1.5;
  crystalLight2.distance = 10;
  crystalLight2.position.set(CX, 1.5, CZ);
  scene.add(crystalLight2);

  // ── Energy mist particles ─────────────────────────────────────────────────
  const MIST_COUNT = 32;
  const mistGeo = new THREE.BufferGeometry();
  const mistPos = new Float32Array(MIST_COUNT * 3);
  const mistPhases = new Float32Array(MIST_COUNT);
  for (let i = 0; i < MIST_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * CRYSTAL_ZONE_RADIUS * 0.85;
    mistPos[i * 3]     = CX + Math.cos(a) * r;
    mistPos[i * 3 + 1] = 0.1 + Math.random() * 2.2;
    mistPos[i * 3 + 2] = CZ + Math.sin(a) * r;
    mistPhases[i] = Math.random() * Math.PI * 2;
  }
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
  mistGeo.userData = { phases: mistPhases, origPos: new Float32Array(mistPos) };

  const mistMat = new THREE.PointsMaterial({
    color: new THREE.Color("#B794F4"),
    size: 0.28,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mistPoints = new THREE.Points(mistGeo, mistMat);
  mistPoints.renderOrder = 2;
  scene.add(mistPoints);

  // Store everything for animation
  scene.userData.crystalZone = {
    giant,
    smallCrystals,
    arcs,
    crystalLight,
    crystalLight2,
    haloRing: haloRing.material,
    midRing: midRing.material,
    outerRing: outerRing.material,
    groundDisc: groundDisc.material,
    mistPoints,
    mistGeo,
    mistMat,
    proximity: 0, // 0 = idle, 1 = fully activated
  };
}

// ── Animation — called every frame from CityCanvas ───────────────────────────
export function animateCrystalZone(scene, t, audioBeat, playerX, playerZ) {
  const cz = scene.userData.crystalZone;
  if (!cz) return;

  // Proximity calc
  const dx = playerX - CRYSTAL_ZONE_CENTER.x;
  const dz = playerZ - CRYSTAL_ZONE_CENTER.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const rawProx = Math.max(0, Math.min(1, 1 - (dist - 2) / (CRYSTAL_ZONE_RADIUS - 1)));
  // Smooth transition
  cz.proximity += (rawProx - cz.proximity) * 0.04;
  const P = cz.proximity;
  const beat = audioBeat ?? 0;

  // ── Ground rings pulse ──────────────────────────────────────────────────
  cz.outerRing.opacity = 0.18 + P * 0.35 + beat * 0.15 + Math.sin(t * 1.2) * 0.06;
  cz.midRing.opacity   = 0.15 + P * 0.45 + beat * 0.20 + Math.sin(t * 2.1 + 1.0) * 0.07;
  cz.groundDisc.opacity = 0.30 + P * 0.28;
  cz.haloRing.opacity  = 0.25 + P * 0.55 + beat * 0.25 + Math.sin(t * 3.0) * 0.08;

  // ── Giant crystal breathe ───────────────────────────────────────────────
  const giantPulse = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.5 + 0.5) * 0.06;
  cz.giant.bodyMat.opacity = cz.giant.baseOpacity.body + P * 0.20 + beat * 0.12 + giantPulse;
  cz.giant.tipMat.opacity  = cz.giant.baseOpacity.tip  + P * 0.12 + beat * 0.10 + giantPulse * 0.7;
  cz.giant.coreMat.opacity = cz.giant.baseOpacity.core + P * 0.45 + beat * 0.30 + giantPulse * 1.2;
  cz.giant.footRing.opacity = cz.giant.baseOpacity.foot + P * 0.40 + beat * 0.20;
  // Gentle vertical bob on giant
  cz.giant.group.position.y = Math.sin(t * 0.9) * 0.06;

  // ── Small crystals ──────────────────────────────────────────────────────
  cz.smallCrystals.forEach((sc, i) => {
    const phase = i * 0.62;
    const pulse = Math.sin(t * 2.2 + phase) * 0.10 + Math.sin(t * 1.1 + phase * 1.7) * 0.05;
    sc.bodyMat.opacity = sc.baseOpacity.body + P * 0.18 + beat * 0.10 + pulse;
    sc.tipMat.opacity  = sc.baseOpacity.tip  + P * 0.12 + beat * 0.08 + pulse * 0.7;
    sc.coreMat.opacity = sc.baseOpacity.core + P * 0.40 + beat * 0.28 + pulse * 1.3;
    sc.footRing.opacity = sc.baseOpacity.foot + P * 0.35 + beat * 0.18;
    // Subtle bob
    sc.group.position.y = Math.sin(t * 1.1 + phase) * 0.03;
  });

  // ── Point lights intensity ──────────────────────────────────────────────
  cz.crystalLight.intensity  = 1.5 + P * 3.5 + beat * 1.2 + Math.sin(t * 2.0) * 0.4;
  cz.crystalLight2.intensity = 0.8 + P * 2.0 + beat * 0.8 + Math.sin(t * 1.5 + 1.2) * 0.3;
  // Color shift between purple and cyan based on proximity
  cz.crystalLight.color.set("#A78BFF").lerp(new THREE.Color("#00E5FF"), P * 0.5 + Math.sin(t * 0.5) * 0.25);

  // ── Electric arcs ───────────────────────────────────────────────────────
  const arcActive = P * 0.7 + beat * 0.5;
  cz.arcs.forEach((arc, i) => {
    const phase = i * 1.1 + t * (2.5 + P * 3.0);
    // Opacity flickers — arcs fire in pulses
    const flicker = Math.max(0, Math.sin(phase) * 0.5 + 0.5) * arcActive;
    arc.mat.opacity = flicker * 0.85;

    if (arc.mat.opacity < 0.01) return;

    // Rebuild jagged arc path each frame — lightning look
    const { from, to, positions } = arc;
    const count = positions.length / 3;
    for (let j = 0; j < count; j++) {
      const frac = j / (count - 1);
      const bx = from.x + (to.x - from.x) * frac;
      const by = from.y + (to.y - from.y) * frac;
      const bz = from.z + (to.z - from.z) * frac;
      // Jitter mid segments — ends stay fixed
      const jitterAmt = frac > 0 && frac < 1 ? (Math.sin(phase + j * 1.7) * 0.22 + Math.cos(phase * 1.3 + j) * 0.14) * (1 - Math.abs(frac - 0.5) * 1.2) : 0;
      positions[j * 3]     = bx + jitterAmt * (frac * (1 - frac) * 4);
      positions[j * 3 + 1] = by + jitterAmt * (frac * (1 - frac) * 3);
      positions[j * 3 + 2] = bz + jitterAmt * (frac * (1 - frac) * 4);
    }
    arc.line.geometry.attributes.position.needsUpdate = true;
  });

  // ── Mist particles drift ────────────────────────────────────────────────
  const mistGeo = cz.mistGeo;
  const orig = mistGeo.userData.origPos;
  const phases = mistGeo.userData.phases;
  const arr = mistGeo.attributes.position.array;
  const driftAmt = 0.12 + P * 0.22;
  for (let i = 0; i < arr.length / 3; i++) {
    arr[i * 3]     = orig[i * 3]     + Math.sin(t * 0.6 + phases[i]) * driftAmt;
    arr[i * 3 + 1] = orig[i * 3 + 1] + Math.sin(t * 0.9 + phases[i] * 1.3) * 0.18;
    arr[i * 3 + 2] = orig[i * 3 + 2] + Math.cos(t * 0.7 + phases[i] * 0.9) * driftAmt;
  }
  mistGeo.attributes.position.needsUpdate = true;
  cz.mistMat.opacity = 0.12 + P * 0.28 + beat * 0.12 + Math.sin(t * 1.6) * 0.04;
  cz.mistMat.color.set("#B794F4").lerp(new THREE.Color("#67E8F9"), P * 0.6);
}