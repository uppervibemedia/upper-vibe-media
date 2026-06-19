import * as THREE from "three";

const {
  Color, Fog, PlaneGeometry, CylinderGeometry, SphereGeometry, BoxGeometry,
  CircleGeometry, TorusGeometry, RingGeometry, BufferGeometry, Float32BufferAttribute,
  MeshStandardMaterial, MeshBasicMaterial, PointsMaterial, ShaderMaterial,
  Mesh, Group, Vector3, DirectionalLight, AmbientLight, HemisphereLight,
  PointLight, Points, AdditiveBlending,
} = THREE;

export const BEACH_RADIUS = 18;

// ─── PALM TREE POSITIONS ───────────────────────────────────────
const PALM_POSITIONS = [
  [-8, -6, 1.0], [8, -6, 0.9], [-7, 6, 0.85], [7, 5, 0.95],
  [-3, -8, 0.7], [4, -8, 0.8], [-5, 8, 0.75], [6, 7, 0.9],
  [-10, 2, 0.65], [10, -2, 0.7], [-9, -3, 0.8], [9, 3, 0.75],
  [-2, 3, 0.6], [3, -3, 0.65], [-6, -5, 0.7], [5, -5, 0.7],
  [-8, 7, 0.5], [8, -7, 0.55], [-10, -7, 0.6], [10, 7, 0.6],
];

// ─── COLLISION DATA ────────────────────────────────────────────
export const PALM_TREE_R = 0.4;
export const PALM_COLLISION_BOXES = PALM_POSITIONS.map(([x, z]) => [x, z, PALM_TREE_R, PALM_TREE_R]);

// ─── MATERIAL HELPER ───────────────────────────────────────────
function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = opts.depthWrite ?? true; }
  return m;
}

// ═══════════════════════════════════════════════════════════════
// BUILD: Upper Vibe Cosmic Beach
// ═══════════════════════════════════════════════════════════════
export function buildBeach(scene) {
  scene.userData.beachAnims = {};

  // ─── 1. SKY ──────────────────────────────────────────────────
  scene.background = new Color("#0A0A1E");
  scene.fog = new Fog("#0A0A1E", 28, 65);

  // ─── NEBULA CLOUDS ───────────────────────────────────────────
  const nebulaData = [
    { x: 8, y: 13, z: -12, s: 7, color: "#4B1E8F", opacity: 0.14 },
    { x: -6, y: 12, z: -14, s: 6, color: "#1E3A8A", opacity: 0.12 },
    { x: 2, y: 15, z: -10, s: 8, color: "#7C2A8E", opacity: 0.11 },
    { x: -8, y: 11, z: -15, s: 6, color: "#0E7490", opacity: 0.12 },
    { x: 5, y: 14, z: -8, s: 5, color: "#C026D3", opacity: 0.09 },
    { x: -3, y: 16, z: -16, s: 9, color: "#2563EB", opacity: 0.10 },
    { x: 9, y: 10, z: -13, s: 6, color: "#7C3AED", opacity: 0.11 },
    { x: -5, y: 9, z: -11, s: 7, color: "#0891B2", opacity: 0.13 },
    { x: 0, y: 17, z: -14, s: 10, color: "#9333EA", opacity: 0.10 },
    { x: -10, y: 15, z: -8, s: 5, color: "#EC4899", opacity: 0.09 },
    { x: 10, y: 16, z: -11, s: 6, color: "#06B6D4", opacity: 0.10 },
  ];
  nebulaData.forEach(({ x, y, z, s, color, opacity }) => {
    const geo = new SphereGeometry(s, 16, 12);
    const m = mat(color, { transparent: true, opacity, depthWrite: false, roughness: 1, metalness: 0 });
    const cloud = new Mesh(geo, m);
    cloud.position.set(x, y, z);
    cloud.scale.set(1, 0.4, 1);
    scene.add(cloud);
  });

  // ─── STARS ────────────────────────────────────────────────────
  const starCount = 400;
  const starGeo = new BufferGeometry();
  const starVerts = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starVerts[i * 3] = (Math.random() - 0.5) * 50;
    starVerts[i * 3 + 1] = 8 + Math.random() * 22;
    starVerts[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }
  starGeo.setAttribute("position", new Float32BufferAttribute(starVerts, 3));
  const starMat = new PointsMaterial({ color: 0xFFFFFF, size: 0.08, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending });
  const stars = new Points(starGeo, starMat);
  stars.name = "stars";
  scene.add(stars);

  // ─── PLANETS / MOONS ─────────────────────────────────────────
  const planetData = [
    { x: 16, y: 16, z: -18, r: 2.5, color: "#C084FC" },
    { x: -16, y: 13, z: -20, r: 1.8, color: "#60A5FA" },
    { x: 10, y: 18, z: -22, r: 1.2, color: "#F9A8D4" },
  ];
  planetData.forEach(({ x, y, z, r, color }) => {
    const geo = new SphereGeometry(r, 16, 12);
    const m = new MeshStandardMaterial();
    m.color = new Color(color);
    m.roughness = 0.7;
    m.emissive = new Color(color);
    m.emissiveIntensity = 0.15;
    const planet = new Mesh(geo, m);
    planet.position.set(x, y, z);
    planet.name = "planet";
    scene.add(planet);
  });

  // ─── 2. GLOWING SAND GROUND ─────────────────────────────────
  const sandGeo = new PlaneGeometry(70, 70);
  const sandMat = mat("#EDE4D4", { roughness: 0.78, metalness: 0.02 });
  const sand = new Mesh(sandGeo, sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = -0.02;
  sand.receiveShadow = true;
  scene.add(sand);

  // Inner beach walking area
  const innerGeo = new PlaneGeometry(BEACH_RADIUS * 2, BEACH_RADIUS * 2);
  const innerMat = mat("#FAF7F0", { roughness: 0.78, metalness: 0.03 });
  const inner = new Mesh(innerGeo, innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = -0.005;
  inner.receiveShadow = true;
  scene.add(inner);

  // ─── SAND SHIMMER PARTICLES ──────────────────────────────────
  const shimmerCount = 200;
  const shimmerGeo = new BufferGeometry();
  const shimmerVerts = new Float32Array(shimmerCount * 3);
  for (let i = 0; i < shimmerCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 1 + Math.random() * BEACH_RADIUS;
    shimmerVerts[i * 3] = Math.cos(angle) * dist;
    shimmerVerts[i * 3 + 1] = 0.02 + Math.random() * 0.08;
    shimmerVerts[i * 3 + 2] = Math.sin(angle) * dist;
  }
  shimmerGeo.setAttribute("position", new Float32BufferAttribute(shimmerVerts, 3));
  const shimmerMat = new PointsMaterial({
    color: 0xFFFFFF,
    size: 0.06,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const shimmer = new Points(shimmerGeo, shimmerMat);
  shimmer.name = "shimmer";
  scene.add(shimmer);

  // ─── 3. COSMIC OCEAN ─────────────────────────────────────────
  const oceanWidth = 40;
  const oceanDepth = 30;
  const oceanSegments = 40;
  const oceanGeo = new PlaneGeometry(oceanWidth, oceanDepth, oceanSegments, oceanSegments);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new MeshStandardMaterial();
  oceanMat.color = new Color("#1E1460");
  oceanMat.roughness = 0.12;
  oceanMat.metalness = 0.95;
  oceanMat.emissive = new Color("#150A45");
  oceanMat.emissiveIntensity = 0.5;
  const ocean = new Mesh(oceanGeo, oceanMat);
  ocean.position.set(0, -0.6, -(BEACH_RADIUS - 6));
  ocean.name = "ocean";
  ocean.receiveShadow = true;
  scene.add(ocean);
  scene.userData.beachAnims.ocean = ocean;
  scene.userData.beachAnims.oceanVertices = oceanGeo.attributes.position.array.slice();

  // ─── OCEAN GLOW PARTICLES ────────────────────────────────────
  const oceanGlowCount = 150;
  const oceanGlowGeo = new BufferGeometry();
  const oceanGlowVerts = new Float32Array(oceanGlowCount * 3);
  for (let i = 0; i < oceanGlowCount; i++) {
    oceanGlowVerts[i * 3] = (Math.random() - 0.5) * oceanWidth * 0.8;
    oceanGlowVerts[i * 3 + 1] = -1.0 - Math.random() * 2;
    oceanGlowVerts[i * 3 + 2] = -(BEACH_RADIUS - 6) + (Math.random() - 0.5) * oceanDepth;
  }
  oceanGlowGeo.setAttribute("position", new Float32BufferAttribute(oceanGlowVerts, 3));
  const oceanGlowMat = new PointsMaterial({
    color: 0x7C3AED,
    size: 0.2,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const oceanGlow = new Points(oceanGlowGeo, oceanGlowMat);
  oceanGlow.name = "oceanGlow";
  scene.add(oceanGlow);

  // ─── 4. CRYSTAL PALM TREES ────────────────────────────────────
  PALM_POSITIONS.forEach(([tx, tz, scale]) => {
    const tree = new Group();

    // Trunk — thin, slightly curved
    const trunkGeo = new CylinderGeometry(0.04 * scale, 0.07 * scale, 1.8 * scale, 8);
    const trunkMat = mat("#1A1030", { roughness: 0.4, metalness: 0.6 });
    const trunk = new Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.9 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Glowing canopy spheres
    const canopyColors = ["#7C3AED", "#06B6D4", "#A855F7"];
    for (let i = 0; i < 3; i++) {
      const canopyGeo = new SphereGeometry(0.55 * scale - i * 0.06, 8, 6);
      const cMat = new MeshStandardMaterial();
      cMat.color = new Color(canopyColors[i]);
      cMat.roughness = 0.3;
      cMat.emissive = new Color(canopyColors[i]);
      cMat.emissiveIntensity = 0.4 + i * 0.1;
      const canopy = new Mesh(canopyGeo, cMat);
      canopy.position.y = 1.5 * scale + i * 0.3 * scale;
      canopy.position.x = (i - 1) * 0.12 * scale;
      canopy.castShadow = true;
      tree.add(canopy);
    }

    tree.position.set(tx, 0, tz);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
  });

  // ─── 5. UPPER VIBE BEACH LOUNGE ──────────────────────────────
  const loungeGroup = new Group();
  loungeGroup.position.set(-5, 0, -3);
  loungeGroup.rotation.y = 0.3;

  // Lounge deck
  const deckGeo = new BoxGeometry(4, 0.08, 3);
  const deckMat = mat("#2D1B4E", { roughness: 0.3, metalness: 0.5 });
  const deck = new Mesh(deckGeo, deckMat);
  deck.position.y = 0.15;
  deck.receiveShadow = true;
  deck.castShadow = true;
  loungeGroup.add(deck);

  // Neon seating — curved benches
  for (let i = 0; i < 3; i++) {
    const seatGeo = new BoxGeometry(1.2, 0.13, 0.5);
    const seatM = new MeshStandardMaterial();
    seatM.color = new Color(i === 1 ? "#7C3AED" : "#06B6D4");
    seatM.roughness = 0.2;
    seatM.emissive = new Color(i === 1 ? "#7C3AED" : "#06B6D4");
    seatM.emissiveIntensity = 0.3;
    const seat = new Mesh(seatGeo, seatM);
    seat.position.set(-1.2 + i * 1.2, 0.24, 0.7);
    seat.castShadow = true;
    seat.receiveShadow = true;
    loungeGroup.add(seat);
  }

  // Lounge back wall / canopy
  const backGeo = new BoxGeometry(4.2, 1.2, 0.08);
  const backMat = mat("#1A1030", { roughness: 0.3, metalness: 0.5 });
  const back = new Mesh(backGeo, backMat);
  back.position.set(0, 0.65, -1.4);
  back.castShadow = true;
  loungeGroup.add(back);

  // Neon strip on back wall
  const stripGeo = new BoxGeometry(3.8, 0.04, 0.1);
  const stripM = new MeshStandardMaterial();
  stripM.color = new Color("#C026D3");
  stripM.roughness = 0.1;
  stripM.emissive = new Color("#C026D3");
  stripM.emissiveIntensity = 0.6;
  const strip = new Mesh(stripGeo, stripM);
  strip.position.set(0, 0.62, -1.35);
  loungeGroup.add(strip);

  scene.add(loungeGroup);
  scene.userData.beachAnims.loungeStrip = strip;

  // ─── 6. 432 HZ FOUNTAIN ──────────────────────────────────────
  const fountainGroup = new Group();
  fountainGroup.position.set(4, 0, 1);

  // Base pool
  const poolGeo = new TorusGeometry(0.8, 0.12, 8, 16);
  const poolMat = mat("#1A1030", { roughness: 0.2, metalness: 0.7 });
  const pool = new Mesh(poolGeo, poolMat);
  pool.rotation.x = Math.PI / 2;
  pool.position.y = 0.15;
  pool.receiveShadow = true;
  fountainGroup.add(pool);

  // Center pillar
  const pillarGeo = new CylinderGeometry(0.08, 0.12, 0.8, 8);
  const pillarM = new MeshStandardMaterial();
  pillarM.color = new Color("#7C3AED");
  pillarM.roughness = 0.15;
  pillarM.emissive = new Color("#7C3AED");
  pillarM.emissiveIntensity = 0.5;
  const pillar = new Mesh(pillarGeo, pillarM);
  pillar.position.y = 0.45;
  pillar.name = "fountainPillar";
  fountainGroup.add(pillar);

  // Ring at top
  const ringGeo = new TorusGeometry(0.25, 0.04, 8, 12);
  const ringM = new MeshStandardMaterial();
  ringM.color = new Color("#06B6D4");
  ringM.roughness = 0.1;
  ringM.emissive = new Color("#06B6D4");
  ringM.emissiveIntensity = 0.7;
  const ring = new Mesh(ringGeo, ringM);
  ring.position.y = 0.88;
  ring.name = "fountainRing";
  fountainGroup.add(ring);

  // Base glow disc
  const discGeo = new CircleGeometry(1, 32);
  const discM = new MeshBasicMaterial();
  discM.color = new Color("#7C3AED");
  discM.transparent = true;
  discM.opacity = 0.2;
  discM.depthWrite = false;
  const disc = new Mesh(discGeo, discM);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.01;
  fountainGroup.add(disc);

  scene.add(fountainGroup);
  scene.userData.beachAnims.fountain = { pillar, ring };

  // ─── FOUNTAIN PARTICLES ──────────────────────────────────────
  const fountainParticleCount = 50;
  const fPartGeo = new BufferGeometry();
  const fPartVerts = new Float32Array(fountainParticleCount * 3);
  const fPartData = []; // store per-particle state
  for (let i = 0; i < fountainParticleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 0.15;
    fPartVerts[i * 3] = 4 + Math.cos(angle) * dist;
    fPartVerts[i * 3 + 1] = 0.6 + Math.random() * 0.8;
    fPartVerts[i * 3 + 2] = 1 + Math.sin(angle) * dist;
    fPartData.push({ baseY: 0.6, speed: 0.4 + Math.random() * 0.8, offset: Math.random() * Math.PI * 2 });
  }
  fPartGeo.setAttribute("position", new Float32BufferAttribute(fPartVerts, 3));
  const fPartMat = new PointsMaterial({
    color: 0x06B6D4,
    size: 0.06,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const fParts = new Points(fPartGeo, fPartMat);
  fParts.name = "fountainParticles";
  scene.add(fParts);
  scene.userData.beachAnims.fountainParticles = { points: fParts, data: fPartData, basePos: [4, 0, 1] };

  // ─── 7. ALBUM ART DISPLAYS ────────────────────────────────────
  const albumColors = [
    { color: "#7C3AED", emissive: "#4C1D95" },
    { color: "#06B6D4", emissive: "#0E7490" },
    { color: "#EC4899", emissive: "#BE185D" },
  ];
  const albumPositions = [
    { x: -7, y: 1.6, z: 2, ry: 0.4 },
    { x: 7, y: 1.8, z: -1, ry: -0.5 },
    { x: -2, y: 1.5, z: -6, ry: 0.8 },
  ];
  const albumGroups = [];
  albumPositions.forEach((pos, i) => {
    const g = new Group();
    const { color } = albumColors[i];

    // Stand
    const standGeo = new CylinderGeometry(0.03, 0.05, 1.2, 8);
    const standMat = mat("#1A1030", { roughness: 0.3, metalness: 0.5 });
    const stand = new Mesh(standGeo, standMat);
    stand.position.y = 0.5;
    stand.castShadow = true;
    g.add(stand);

    // Album panel
    const panelGeo = new BoxGeometry(0.7, 0.7, 0.04);
    const panelM = new MeshStandardMaterial();
    panelM.color = new Color(color);
    panelM.roughness = 0.3;
    panelM.emissive = new Color(color);
    panelM.emissiveIntensity = 0.25;
    const panel = new Mesh(panelGeo, panelM);
    panel.position.y = 1.2;
    panel.name = "albumPanel";
    g.add(panel);

    // Glow edge
    const edgeGeo = new BoxGeometry(0.74, 0.74, 0.02);
    const edgeM = new MeshBasicMaterial();
    edgeM.color = new Color(color);
    edgeM.transparent = true;
    edgeM.opacity = 0.3;
    edgeM.depthWrite = false;
    const edge = new Mesh(edgeGeo, edgeM);
    edge.position.y = 1.2;
    g.add(edge);

    g.position.set(pos.x, 0, pos.z);
    g.rotation.y = pos.ry;
    g.userData.rotSpeed = 0.15 + Math.random() * 0.3;
    scene.add(g);
    albumGroups.push(g);
  });
  scene.userData.beachAnims.albumDisplays = albumGroups;

  // ─── 8. AMBIENT PARTICLES / FIREFLIES ────────────────────────
  const ambientCount = 120;
  const ambientGeo = new BufferGeometry();
  const ambientVerts = new Float32Array(ambientCount * 3);
  const ambientData = [];
  for (let i = 0; i < ambientCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * BEACH_RADIUS;
    ambientVerts[i * 3] = Math.cos(angle) * dist;
    ambientVerts[i * 3 + 1] = 0.3 + Math.random() * 3;
    ambientVerts[i * 3 + 2] = Math.sin(angle) * dist;
    ambientData.push({ speed: 0.4 + Math.random() * 1.2, offset: Math.random() * Math.PI * 2, baseX: ambientVerts[i * 3], baseZ: ambientVerts[i * 3 + 2] });
  }
  ambientGeo.setAttribute("position", new Float32BufferAttribute(ambientVerts, 3));
  const colors = new Float32Array(ambientCount * 3);
  const colorPalette = [
    [0.49, 0.24, 0.93], // purple
    [0.02, 0.71, 0.83], // cyan
    [0.93, 0.29, 0.60], // pink
    [0.42, 0.65, 1.0],  // blue
  ];
  for (let i = 0; i < ambientCount; i++) {
    const c = colorPalette[i % colorPalette.length];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  ambientGeo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  const ambientMat = new PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const ambientPoints = new Points(ambientGeo, ambientMat);
  ambientPoints.name = "ambientParticles";
  scene.add(ambientPoints);
  scene.userData.beachAnims.ambientParticles = { points: ambientPoints, data: ambientData };

  // ─── SHOOTING STAR TRAIL ─────────────────────────────────────
  const trailPositions = [[-12, 16, -15], [8, 12, -18], [-5, 18, -10]];
  const trailData = [];
  trailPositions.forEach(([sx, sy, sz]) => {
    const tGeo = new BufferGeometry();
    tGeo.setAttribute("position", new Float32BufferAttribute([sx, sy, sz, sx + 1, sy - 0.3, sz + 1], 3));
    const tMat = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5, depthWrite: false });
    const trail = new Mesh(new BoxGeometry(0.8, 0.02, 0.02), tMat);
    trail.position.set(sx, sy, sz);
    trail.name = "shootingStar";
    trail.visible = false;
    scene.add(trail);
    trailData.push({ mesh: trail, timer: 3 + Math.random() * 8, active: false, progress: 0, startPos: [sx, sy, sz] });
  });
  scene.userData.beachAnims.shootingStars = trailData;

  // ─── AURORA WAVES ────────────────────────────────────────────
  const auroraGeo = new PlaneGeometry(40, 6, 20, 1);
  const auroraMat = new MeshBasicMaterial({
    color: 0x7C3AED,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const aurora1 = new Mesh(auroraGeo, auroraMat);
  aurora1.position.set(0, 12, -18);
  aurora1.name = "aurora1";

  const aurora2Geo = new PlaneGeometry(35, 5, 20, 1);
  const aurora2Mat = new MeshBasicMaterial({
    color: 0x06B6D4,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const aurora2 = new Mesh(aurora2Geo, aurora2Mat);
  aurora2.position.set(3, 10, -20);
  aurora2.name = "aurora2";
  scene.add(aurora1);
  scene.add(aurora2);
  scene.userData.beachAnims.auroras = [aurora1, aurora2];

  // ─── 9. LIGHTING ──────────────────────────────────────────────
  // Moonlight — soft blue/purple key light
  const moonLight = new DirectionalLight();
  moonLight.color = new Color("#8B9DC3");
  moonLight.intensity = 0.8;
  moonLight.position.set(5, 14, -8);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  moonLight.shadow.camera.near = 0.5;
  moonLight.shadow.camera.far = 60;
  moonLight.shadow.camera.left = -20;
  moonLight.shadow.camera.right = 20;
  moonLight.shadow.camera.top = 20;
  moonLight.shadow.camera.bottom = -20;
  moonLight.shadow.bias = -0.0003;
  scene.add(moonLight);

  const ambLight = new AmbientLight();
  ambLight.color = new Color("#3D2B6E");
  ambLight.intensity = 0.55;
  scene.add(ambLight);

  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#4B1E8F");
  hemiLight.groundColor = new Color("#1A1030");
  hemiLight.intensity = 0.25;
  scene.add(hemiLight);

  // Pool area glow point lights
  const pointLight1 = new PointLight("#7C3AED", 0.6, 8);
  pointLight1.position.set(4, 1.2, 1);
  scene.add(pointLight1);

  const pointLight2 = new PointLight("#06B6D4", 0.4, 6);
  pointLight2.position.set(-5, 0.8, -3);
  scene.add(pointLight2);
}

// ═══════════════════════════════════════════════════════════════
// UPDATE: Animate beach elements each frame
// ═══════════════════════════════════════════════════════════════
export function updateBeachAnims(scene, time, dt) {
  const ba = scene.userData.beachAnims;
  if (!ba) return;

  // ─── OCEAN WAVES ─────────────────────────────────────────────
  if (ba.ocean && ba.oceanVertices) {
    const pos = ba.ocean.geometry.attributes.position;
    const orig = ba.oceanVertices;
    for (let i = 0; i < pos.count; i++) {
      const x = orig[i * 3];
      const z = orig[i * 3 + 2];
      const wave = Math.sin(x * 0.5 + time * 1.2) * 0.15 + Math.sin(z * 0.4 + time * 0.8) * 0.15 + Math.sin((x + z) * 0.6 + time * 1.5) * 0.1;
      pos.setY(i, orig[i * 3 + 1] + wave);
    }
    pos.needsUpdate = true;
  }

  // ─── FOUNTAIN PARTICLES ───────────────────────────────────────
  if (ba.fountainParticles) {
    const { points, data, basePos } = ba.fountainParticles;
    const pos = points.geometry.attributes.position;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const y = d.baseY + Math.sin(time * d.speed + d.offset) * 0.5;
      pos.setXYZ(i, basePos[0] + Math.cos(time * 1.5 + d.offset) * 0.1, Math.max(0.6, y), basePos[2] + Math.sin(time * 1.5 + d.offset) * 0.1);
    }
    pos.needsUpdate = true;
  }

  // ─── AMBIENT PARTICLES ────────────────────────────────────────
  if (ba.ambientParticles) {
    const { points, data } = ba.ambientParticles;
    const pos = points.geometry.attributes.position;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const y = 0.3 + Math.sin(time * d.speed + d.offset) * 1.2 + Math.cos(time * 0.7 + d.offset) * 0.5;
      pos.setXYZ(i, d.baseX + Math.cos(time * 0.5 + d.offset) * 0.3, Math.max(0.1, y), d.baseZ + Math.sin(time * 0.5 + d.offset) * 0.3);
    }
    pos.needsUpdate = true;
  }

  // ─── ALBUM DISPLAYS ──────────────────────────────────────────
  if (ba.albumDisplays) {
    ba.albumDisplays.forEach((g) => {
      g.rotation.y += (g.userData.rotSpeed || 0.2) * dt;
    });
  }

  // ─── SHOOTING STARS ───────────────────────────────────────────
  if (ba.shootingStars) {
    ba.shootingStars.forEach((s) => {
      s.timer -= dt;
      if (s.timer <= 0 && !s.active) {
        s.active = true;
        s.progress = 0;
        s.mesh.visible = true;
        s.mesh.position.set(s.startPos[0], s.startPos[1], s.startPos[2]);
        s.timer = 6 + Math.random() * 10;
      }
      if (s.active) {
        s.progress += dt * 8;
        s.mesh.position.x = s.startPos[0] + s.progress * 2;
        s.mesh.position.y = s.startPos[1] - s.progress * 1.2;
        s.mesh.position.z = s.startPos[2] + s.progress * 0.5;
        if (s.progress > 4) {
          s.active = false;
          s.mesh.visible = false;
        }
      }
    });
  }

  // ─── AURORAS ──────────────────────────────────────────────────
  if (ba.auroras) {
    ba.auroras.forEach((a, i) => {
      a.material.opacity = 0.04 + Math.sin(time * 0.3 + i * 2) * 0.02;
    });
  }

  // ─── STAR TWINKLE ─────────────────────────────────────────────
  const starsMesh = scene.getObjectByName("stars");
  if (starsMesh) {
    starsMesh.material.opacity = 0.55 + Math.sin(time * 1.5) * 0.15;
  }
}