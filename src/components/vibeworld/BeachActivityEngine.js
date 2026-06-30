import * as THREE from "three";

const SURF_RINGS = [
  { x: 18, z: 36 }, { x: 14.5, z: 42 }, { x: 20.5, z: 48 }, { x: 16, z: 54 }, { x: 22, z: 60 }, { x: 18, z: 66 },
];
const DIVE_ITEMS = [
  { x: 31, y: -1.45, z: 39, color: "#FFF2BA", kind: "pearl" },
  { x: 38, y: -1.25, z: 42, color: "#7DEBFF", kind: "crystal" },
  { x: 33, y: -1.65, z: 47, color: "#B58CFF", kind: "shell" },
  { x: 41, y: -1.35, z: 50, color: "#FFD36E", kind: "star" },
  { x: 29, y: -1.55, z: 54, color: "#42DDF2", kind: "pearl" },
  { x: 36, y: -1.38, z: 57, color: "#FFB347", kind: "chest" },
];
const COASTER_POINTS = [
  [-12, 1.25, -22], [-24, 6.8, -29], [-42, 12.4, -25], [-55, 3.0, -16],
  [-38, 8.2, -9], [-14, 13.2, -18], [12, 5.0, -29], [38, 10.6, -25],
  [54, 2.7, -14], [28, 8.8, -7], [3, 3.2, -12], [-12, 1.25, -22],
];

function basic(color, opacity = 1, depthWrite = opacity >= 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity, depthWrite, side: THREE.DoubleSide });
}
function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opts.roughness ?? 0.42, metalness: opts.metalness ?? 0.18, transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
}
function disposeGroup(scene, group) {
  if (!group) return;
  scene.remove(group);
  group.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m?.dispose?.());
  });
}
function addLightRay(group, x, z, rot = 0) {
  const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 5.0), basic("#BDF9FF", 0.12, false));
  ray.position.set(x, -0.85, z);
  ray.rotation.set(-0.18, rot, 0.08);
  ray.userData.baseOpacity = 0.12;
  group.add(ray);
  return ray;
}
function addSeaweed(group, x, z, h = 1.0, color = "#209C79") {
  const blades = new THREE.Group();
  blades.position.set(x, -2.25, z);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * (0.72 + i * 0.08), 0.12), standard(color, { roughness: 0.7, metalness: 0.02 }));
    blade.position.set((i - 1.5) * 0.14, h * 0.35, 0);
    blade.rotation.z = (i - 1.5) * 0.11;
    blades.add(blade);
  }
  group.add(blades);
  return blades;
}
function addCoral(group, x, z, color = "#B58CFF") {
  const coral = new THREE.Group();
  coral.position.set(x, -2.18, z);
  for (let i = 0; i < 5; i++) {
    const branch = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.75 + i * 0.08, 7), standard(color, { roughness: 0.62, metalness: 0.04 }));
    branch.position.set(Math.sin(i * 1.7) * 0.33, 0.32 + i * 0.02, Math.cos(i * 1.2) * 0.24);
    branch.rotation.z = (i - 2) * 0.22;
    coral.add(branch);
  }
  group.add(coral);
  return coral;
}
function makeDiveCollectible(p) {
  if (p.kind === "chest") {
    const chest = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.52, 0.78), standard("#7A4E2A", { roughness: 0.55, metalness: 0.16 }));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 1.1, 16, 1, false, 0, Math.PI), standard("#9B6734", { roughness: 0.45, metalness: 0.18 }));
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.26;
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.08, 0.86), basic("#FFD36E", 0.85));
    band.position.y = 0.05;
    chest.add(base, lid, band);
    return chest;
  }
  const geo = p.kind === "star" ? new THREE.TetrahedronGeometry(0.52, 0) : p.kind === "shell" ? new THREE.SphereGeometry(0.48, 16, 8) : new THREE.SphereGeometry(0.44, 16, 12);
  const mesh = new THREE.Mesh(geo, standard(p.color, { roughness: 0.26, metalness: 0.36 }));
  if (p.kind === "shell") mesh.scale.set(1.25, 0.55, 0.82);
  return mesh;
}
function makeUnderwaterScene(scene, group) {
  scene.userData._savedBeachFog = scene.fog || null;
  scene.fog = new THREE.Fog(0x0a8fb4, 5, 34);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 32, 8, 8), standard("#BBA47A", { roughness: 0.85, metalness: 0.02 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(35, -2.55, 48);
  floor.receiveShadow = true;
  group.add(floor);

  const surface = new THREE.Mesh(new THREE.PlaneGeometry(32, 34), basic("#45DFF5", 0.20, false));
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(35, -0.04, 48);
  surface.name = "diveWaterSurface";
  group.add(surface);

  const haze = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), basic("#0DAFD6", 0.12, false));
  haze.position.set(35, -1.1, 48);
  haze.scale.set(1.25, 0.45, 1.25);
  group.add(haze);

  const props = [
    [30, 39, "rock"], [41, 41, "rock"], [28, 51, "rock"], [43, 56, "rock"],
    [32, 44, "coral"], [39, 47, "coral"], [34, 55, "coral"], [29, 57, "weed"], [42, 52, "weed"], [37, 39, "weed"],
  ];
  props.forEach(([x, z, kind], i) => {
    if (kind === "rock") {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + (i % 3) * 0.18, 0), standard("#6A777A", { roughness: 0.78, metalness: 0.04 }));
      rock.position.set(x, -2.13, z);
      rock.scale.set(1.35, 0.62, 0.95);
      group.add(rock);
    } else if (kind === "coral") addCoral(group, x, z, i % 2 ? "#FF7ABF" : "#B58CFF");
    else addSeaweed(group, x, z, 1.15 + (i % 2) * 0.25);
  });
  for (let i = 0; i < 18; i++) {
    const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + (i % 4) * 0.025, 0), standard(i % 3 ? "#8AA0A4" : "#F2DCA8", { roughness: 0.8, metalness: 0.02 }));
    pebble.position.set(28 + Math.random() * 15, -2.47, 39 + Math.random() * 19);
    pebble.scale.set(1.4, 0.35, 1.0);
    group.add(pebble);
  }
  for (let i = 0; i < 6; i++) {
    const glowShell = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 7), standard(i % 2 ? "#7DEBFF" : "#FFF2BA", { roughness: 0.25, metalness: 0.28 }));
    glowShell.scale.set(1.25, 0.42, 0.78);
    glowShell.position.set(29 + i * 2.5, -2.18, 41 + (i % 3) * 5.4);
    group.add(glowShell);
  }

  const lightRays = [[29, 39, 0.25], [35, 45, -0.18], [41, 52, 0.35], [32, 57, -0.28], [39, 40, 0.14], [28, 55, -0.38]].map(([x, z, r]) => addLightRay(group, x, z, r));
  const bubbles = [];
  for (let i = 0; i < 28; i++) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.045 + (i % 4) * 0.014, 8, 6), basic("#E5FFFF", 0.42, false));
    bubble.position.set(28 + Math.random() * 15, -2.0 + Math.random() * 1.6, 38 + Math.random() * 20);
    bubble.userData.baseX = bubble.position.x;
    bubble.userData.speed = 0.25 + Math.random() * 0.34;
    bubble.userData.phase = Math.random() * Math.PI * 2;
    group.add(bubble);
    bubbles.push(bubble);
  }

  const fish = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Group();
    f.position.set(29 + i * 3.2, -1.25 - (i % 2) * 0.25, 42 + i * 2.5);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), standard(i % 2 ? "#FFD36E" : "#7DEBFF", { roughness: 0.35, metalness: 0.08 }));
    body.scale.set(1.35, 0.58, 0.58);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 3), basic(i % 2 ? "#FFD36E" : "#7DEBFF", 0.8));
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.33;
    f.add(body, tail);
    group.add(f);
    fish.push(f);
  }

  const lights = [
    new THREE.PointLight(new THREE.Color("#6EF6FF"), 1.8, 18),
    new THREE.PointLight(new THREE.Color("#B58CFF"), 0.85, 12),
  ];
  lights[0].position.set(35, -0.4, 48);
  lights[1].position.set(41, -1.2, 55);
  lights.forEach((l) => group.add(l));
  return { floor, surface, lightRays, bubbles, fish };
}
function makeDiveItems(group) {
  return DIVE_ITEMS.map((p, i) => {
    const mesh = makeDiveCollectible(p);
    mesh.position.set(p.x, p.y, p.z);
    group.add(mesh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 8, 30), basic(p.color, 0.64, false));
    ring.position.set(p.x, p.y, p.z);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const glow = new THREE.PointLight(new THREE.Color(p.color), 0.75, 5);
    glow.position.copy(mesh.position);
    group.add(glow);
    return { ...p, mesh, ring, glow, done: false, id: i };
  });
}
function makeSurfboard(group) {
  const board = new THREE.Group();
  board.name = "premiumSurfboard";
  const deck = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 2.65, 6, 20), standard("#68D7E8", { roughness: 0.24, metalness: 0.12 }));
  deck.rotation.x = Math.PI / 2;
  deck.scale.z = 0.11;
  const noseMark = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 3), standard("#FFD36E", { roughness: 0.3, metalness: 0.12 }));
  noseMark.rotation.x = Math.PI / 2;
  noseMark.position.set(0, 0.075, 1.78);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 2.65), basic("#FFFFFF", 0.72, false));
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.y = 0.075;
  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 2.85), basic("#0E6E84", 0.82, false));
  railL.position.set(-0.43, 0.055, 0);
  const railR = railL.clone();
  railR.position.x = 0.43;
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 3), standard("#0B4E64", { roughness: 0.35, metalness: 0.18 }));
  fin.rotation.x = Math.PI;
  fin.position.set(0, -0.18, -1.2);
  board.add(deck, noseMark, stripe, railL, railR, fin);
  group.add(board);
  return board;
}
function makeSurfRings(group) {
  return SURF_RINGS.map((p, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.055, 10, 48), basic(i % 2 ? "#FFD36E" : "#00E5FF", 0.82, false));
    ring.position.set(p.x, 0.82, p.z);
    ring.rotation.y = (i % 2 ? -0.18 : 0.18);
    group.add(ring);
    const buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.48, 10), standard(i % 2 ? "#FFD36E" : "#00E5FF", { roughness: 0.42, metalness: 0.2 }));
    buoy.position.set(p.x, 0.24, p.z);
    group.add(buoy);
    return { ...p, mesh: ring, buoy, done: false };
  });
}
function makeSurfCourse(group) {
  const foam = [];
  SURF_RINGS.forEach((p, i) => {
    const crest = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.34), basic("#FFFFFF", 0.22, false));
    crest.rotation.x = -Math.PI / 2;
    crest.rotation.z = (i % 2 ? -0.25 : 0.22);
    crest.position.set(p.x, 0.055, p.z - 2.0);
    group.add(crest);
    foam.push(crest);
  });
  const sparkles = [];
  for (let i = 0; i < 18; i++) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), basic("#EFFFFF", 0.52, false));
    s.rotation.x = -Math.PI / 2;
    s.position.set(12 + Math.random() * 14, 0.065, 35 + Math.random() * 31);
    s.userData.phase = Math.random() * 8;
    group.add(s);
    sparkles.push(s);
  }
  return { foam, sparkles };
}
function makeWake(group) {
  const wake = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75 + i * 0.34, 0.12), basic("#FFFFFF", 0.35 - i * 0.045, false));
    m.rotation.x = -Math.PI / 2;
    group.add(m);
    wake.push(m);
  }
  return wake;
}
function makeSplashes(group) {
  const splashes = [];
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 3) * 0.012, 7, 5), basic("#FFFFFF", 0.42, false));
    s.userData.phase = i * 0.7;
    group.add(s);
    splashes.push(s);
  }
  return splashes;
}
function buildCoasterTrack(group, curve) {
  [-0.38, 0.38].forEach((offset) => {
    const points = COASTER_POINTS.map(([x, y, z]) => new THREE.Vector3(x + offset, y, z));
    const railCurve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.45);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 120, 0.07, 8, false), basic(offset < 0 ? "#7DEBFF" : "#FFD36E", 0.9));
    group.add(rail);
  });
  for (let i = 0; i <= 34; i++) {
    const u = i / 34;
    const p = curve.getPointAt(Math.min(0.999, u));
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.18), standard("#293747", { roughness: 0.45, metalness: 0.32 }));
    tie.position.copy(p);
    const tangent = curve.getTangentAt(Math.min(0.999, u));
    tie.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;
    group.add(tie);
    if (i % 2 === 0) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, Math.max(0.7, p.y), 8), standard("#5D6872", { roughness: 0.52, metalness: 0.42 }));
      post.position.set(p.x, p.y / 2, p.z);
      group.add(post);
    }
  }
  const station = new THREE.Group();
  station.position.set(-12, 0, -22);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.26, 3.2), standard("#C4A36A", { roughness: 0.58, metalness: 0.12 }));
  deck.position.y = 0.24;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.18, 3.6), standard("#E7D4A3", { roughness: 0.45, metalness: 0.12 }));
  canopy.position.y = 2.2;
  [-2.8, 2.8].forEach((x) => [-1.2, 1.2].forEach((z) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.1, 8), standard("#5D6872"));
    post.position.set(x, 1.1, z);
    station.add(post);
  }));
  const gate = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 0.12), basic("#00E5FF", 0.76));
  gate.position.set(0, 1.05, -1.65);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 1.4), standard("#B48A52", { roughness: 0.62, metalness: 0.06 }));
  ramp.position.set(-2.2, -0.02, 2.15);
  ramp.rotation.x = -0.18;
  const entryPad = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.08, 32), basic("#7DEBFF", 0.46));
  entryPad.rotation.x = -Math.PI / 2;
  entryPad.position.set(0, 0.07, 2.35);
  const entryArch = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.06, 8, 28, Math.PI), basic("#7DEBFF", 0.72));
  entryArch.position.set(0, 1.22, 1.95);
  entryArch.rotation.z = Math.PI;
  const queueRailL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 3.2), standard("#6D7A84", { roughness: 0.5, metalness: 0.35 }));
  queueRailL.position.set(-2.55, 0.82, 0.25);
  const queueRailR = queueRailL.clone();
  queueRailR.position.x = 2.55;
  station.add(deck, canopy, gate, ramp, entryPad, entryArch, queueRailL, queueRailR);
  group.add(station);
}
function makeCoasterCart(group) {
  const cart = new THREE.Group();
  cart.name = "premiumCoasterCart";
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 2.15), standard("#00A7C8", { roughness: 0.28, metalness: 0.34 }));
  base.position.y = 0.2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.86, 0.8, 4), standard("#00A7C8", { roughness: 0.28, metalness: 0.34 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.23, 1.35);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.28, 0.9), standard("#24384A", { roughness: 0.42, metalness: 0.22 }));
  seat.position.set(0, 0.56, -0.24);
  const bar = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 24), basic("#FFD36E", 0.9));
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0, 0.92, -0.1);
  const rider = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.45, 4, 8), standard("#6EEBFF", { roughness: 0.45, metalness: 0.1 }));
  torso.position.y = 0.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), standard("#D9A47C", { roughness: 0.55, metalness: 0.02 }));
  head.position.y = 1.28;
  rider.add(torso, head);
  cart.add(base, nose, seat, bar, rider);
  [-0.72, 0.72].forEach((x) => [-0.76, 0.76].forEach((z) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), standard("#05080D", { roughness: 0.42, metalness: 0.35 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.02, z);
    cart.add(wheel);
  }));
  group.add(cart);
  return cart;
}

export function startBeachActivity(scene, type, pose) {
  const group = new THREE.Group();
  group.name = `activeBeachActivity_${type}`;
  scene.add(group);
  const state = { type, group, saved: { ...pose }, progress: 0, total: type === "surf" ? SURF_RINGS.length : type === "dive" ? DIVE_ITEMS.length : 1, complete: false, t: 0, x: pose.x, y: pose.y, z: pose.z, rot: pose.rot || 0 };
  if (type === "surf") {
    state.x = 18; state.y = 0.58; state.z = 33.5; state.rot = 0;
    state.board = makeSurfboard(group);
    state.rings = makeSurfRings(group);
    state.course = makeSurfCourse(group);
    state.wake = makeWake(group);
    state.splashes = makeSplashes(group);
  }
  if (type === "dive") {
    state.x = 35; state.y = -1.35; state.z = 37; state.rot = 0;
    state.underwater = makeUnderwaterScene(scene, group);
    state.items = makeDiveItems(group);
  }
  if (type === "coaster") {
    state.curve = new THREE.CatmullRomCurve3(COASTER_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "catmullrom", 0.45);
    state.duration = 36;
    state.total = 100;
    state.rideU = 0;
    buildCoasterTrack(group, state.curve);
    state.cart = makeCoasterCart(group);
  }
  return state;
}

export function exitBeachActivity(scene, state, completed = false) {
  if (!state) return null;
  if (state.type === "dive") scene.fog = scene.userData._savedBeachFog || null;
  disposeGroup(scene, state.group);
  if (completed) {
    if (state.type === "surf") return { x: 18, y: 0, z: 31, rot: 0 };
    if (state.type === "dive") return { x: 35, y: 0, z: 31, rot: 0 };
    if (state.type === "coaster") return { x: -12, y: 0, z: -18, rot: Math.PI };
  }
  return state.saved;
}

export function tickBeachActivity(state, input, dt, t) {
  if (!state || state.complete) return { x: state?.x || 0, y: state?.y || 0, z: state?.z || 0, rot: state?.rot || 0 };
  state.t += dt;
  const steer = Math.max(-1, Math.min(1, input?.x || 0));
  if (state.type === "surf") {
    const targetX = SURF_RINGS[Math.min(state.progress, SURF_RINGS.length - 1)]?.x || state.x;
    state.x += (targetX - state.x) * Math.min(1, dt * 0.75) + steer * 5.2 * dt;
    state.x = Math.max(12, Math.min(24, state.x));
    state.z += 1.95 * dt;
    state.y = 0.58 + Math.sin(t * 4.2) * 0.075;
    state.rot = steer * -0.32 + Math.sin(t * 1.5) * 0.035;
    state.avatarPitch = -0.24 + Math.sin(t * 3) * 0.018;
    state.avatarRoll = steer * -0.38 + Math.sin(t * 2) * 0.035;
    state.avatarYOffset = -0.08;
    state.board?.position.set(state.x, state.y - 0.12, state.z);
    if (state.board) state.board.rotation.set(Math.sin(t * 3.2) * 0.035, state.rot, steer * -0.12 + Math.sin(t * 2) * 0.045);
    state.wake?.forEach((w, i) => {
      w.position.set(state.x + Math.sin(t * 3 + i) * 0.12, 0.08, state.z - 1.0 - i * 0.58);
      w.rotation.z = state.rot + Math.sin(t * 2 + i) * 0.08;
      w.scale.x = 1 + Math.min(0.55, i * 0.08 + Math.abs(steer) * 0.18);
      w.material.opacity = Math.max(0.05, 0.34 - i * 0.052 + Math.sin(t * 5 + i) * 0.035);
    });
    state.splashes?.forEach((s, i) => {
      const side = i % 2 ? -1 : 1;
      s.position.set(state.x + side * (0.45 + (i % 3) * 0.08) + Math.sin(t * 8 + i) * 0.05, 0.18 + Math.sin(t * 7 + i) * 0.12, state.z - 0.25 - (i % 6) * 0.18);
      s.material.opacity = 0.18 + Math.sin(t * 9 + s.userData.phase) * 0.14;
    });
    state.course?.foam?.forEach((f, i) => { f.material.opacity = 0.18 + Math.sin(t * 2 + i) * 0.05; });
    state.course?.sparkles?.forEach((s, i) => { s.material.opacity = 0.25 + Math.sin(t * 3 + s.userData.phase) * 0.18; s.rotation.z += 0.02 + i * 0.0004; });
    state.rings.forEach((ring, i) => {
      if (ring.done) return;
      ring.mesh.rotation.z += 0.012;
      ring.mesh.position.y = 0.82 + Math.sin(t * 2.6 + i) * 0.045;
      ring.buoy.position.y = 0.22 + Math.sin(t * 2 + i) * 0.05;
      const dx = state.x - ring.x, dz = state.z - ring.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.45) { ring.done = true; ring.mesh.visible = false; ring.buoy.visible = false; state.progress += 1; }
    });
    if (state.progress >= state.total || state.z > 69) state.complete = state.progress >= state.total;
  }
  if (state.type === "dive") {
    const forward = Math.max(-1, Math.min(1, input?.y || 0));
    state.x = Math.max(27, Math.min(43, state.x + steer * 4.0 * dt));
    state.z = Math.max(37, Math.min(59, state.z + forward * 4.0 * dt + 0.32 * dt));
    state.y = -1.42 + Math.sin(t * 2.15) * 0.13;
    state.rot = Math.atan2(steer * 0.9, Math.max(0.2, forward + 0.35));
    state.avatarPitch = -0.78 + Math.sin(t * 2.1) * 0.05;
    state.avatarRoll = steer * -0.18 + Math.sin(t * 1.7) * 0.035;
    state.underwater?.surface && (state.underwater.surface.material.opacity = 0.16 + Math.sin(t * 1.7) * 0.035);
    state.underwater?.lightRays?.forEach((r, i) => { r.material.opacity = 0.08 + Math.sin(t * 1.2 + i) * 0.04; r.rotation.z = Math.sin(t * 0.5 + i) * 0.08; });
    state.underwater?.bubbles?.forEach((b) => {
      b.position.y += b.userData.speed * dt;
      b.position.x = b.userData.baseX + Math.sin(t * 1.6 + b.userData.phase) * 0.16;
      if (b.position.y > -0.12) b.position.y = -2.15;
    });
    state.underwater?.fish?.forEach((f, i) => {
      f.position.x += Math.sin(t * 0.35 + i) * 0.012;
      f.position.z += Math.cos(t * 0.45 + i) * 0.018;
      f.rotation.y = Math.sin(t * 0.8 + i) * 0.55 + Math.PI / 2;
    });
    state.items.forEach((item, i) => {
      if (item.done) return;
      item.mesh.rotation.y += 0.018;
      item.mesh.position.y = item.y + Math.sin(t * 2.4 + i) * 0.08;
      item.ring.position.y = item.mesh.position.y;
      item.ring.rotation.z += 0.02;
      item.glow.position.y = item.mesh.position.y;
      const dx = state.x - item.x, dz = state.z - item.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.15 && Math.abs(state.y - item.mesh.position.y) < 1.2) {
        item.done = true;
        item.mesh.visible = false;
        item.ring.visible = false;
        if (item.glow) item.glow.visible = false;
        state.progress += 1;
      }
    });
    if (state.progress >= state.total) state.complete = true;
  }
  if (state.type === "coaster") {
    const currentU = state.rideU || 0;
    const fastDrop = (currentU > 0.18 && currentU < 0.34) || (currentU > 0.56 && currentU < 0.72);
    const climb = (currentU > 0.08 && currentU < 0.18) || (currentU > 0.44 && currentU < 0.56);
    const speedBoost = fastDrop ? 1.9 : climb ? 0.62 : 1.05;
    state.rideU = Math.min(1, currentU + (dt / state.duration) * speedBoost);
    const u = state.rideU;
    const eased = u < 0.06 ? (u * u) / 0.06 : u > 0.94 ? 1 - ((1 - u) * (1 - u)) / 0.06 : u;
    const pos = state.curve.getPointAt(Math.min(0.999, eased));
    const tangent = state.curve.getTangentAt(Math.min(0.999, eased));
    state.x = pos.x; state.y = pos.y + 0.18; state.z = pos.z; state.rot = Math.atan2(tangent.x, tangent.z);
    state.avatarYOffset = 0.28;
    state.avatarPitch = tangent.y * 0.12;
    state.avatarRoll = -tangent.x * 0.12;
    if (state.cart) {
      state.cart.position.copy(pos).add(new THREE.Vector3(0, 0.2, 0));
      state.cart.rotation.y = state.rot;
      state.cart.rotation.z = -tangent.x * 0.18;
      state.cart.rotation.x = tangent.y * 0.18;
    }
    state.progress = Math.min(100, Math.round(u * 100));
    if (u >= 1) state.complete = true;
  }
  return { x: state.x, y: state.y, z: state.z, rot: state.rot };
}

export function applyBeachActivityCamera(state, camera, dt) {
  if (!state || !camera) return;
  const pos = new THREE.Vector3(state.x, state.y, state.z);
  if (state.type === "coaster") {
    const u = Math.min(0.985, Math.max(0, state.rideU || 0));
    const tangent = state.curve.getTangentAt(u).normalize();
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const look = state.curve.getPointAt(Math.min(0.999, u + 0.032));
    const chaseCam = pos.clone().add(tangent.clone().multiplyScalar(-5.0)).add(side.multiplyScalar(Math.sin(u * Math.PI * 6) * 0.72)).add(new THREE.Vector3(0, 2.15, 0));
    camera.position.lerp(chaseCam, Math.min(1, dt * 6.4));
    camera.lookAt(look.x, look.y + 0.78, look.z);
    return;
  }
  if (state.type === "dive") {
    const dir = new THREE.Vector3(Math.sin(state.rot || 0), 0, Math.cos(state.rot || 0));
    const camPos = new THREE.Vector3(state.x, state.y + 0.34, state.z).add(dir.clone().multiplyScalar(0.38));
    const look = new THREE.Vector3(state.x, state.y + 0.14, state.z).add(dir.multiplyScalar(5.2));
    camera.position.lerp(camPos, Math.min(1, dt * 8.5));
    camera.lookAt(look.x, look.y, look.z);
    return;
  }
  if (state.type === "surf") {
    const camPos = new THREE.Vector3(state.x, state.y + 1.65, state.z - 5.4);
    camera.position.lerp(camPos, Math.min(1, dt * 7.8));
    camera.lookAt(state.x, state.y + 0.45, state.z + 4.8);
    return;
  }
  const camPos = new THREE.Vector3(state.x, state.y + 2.15, state.z - 6.2);
  camera.position.lerp(camPos, Math.min(1, dt * 7.2));
  camera.lookAt(state.x, state.y + 0.65, state.z + 4.4);
}