import * as THREE from "three";

const SURF_RINGS = [
  { x: 18, z: 40 }, { x: 15, z: 46 }, { x: 21, z: 52 }, { x: 17, z: 58 }, { x: 20, z: 64 },
];
const DIVE_ITEMS = [
  { x: 32, y: 0.35, z: 39, color: "#FFF2BA" }, { x: 37, y: 0.15, z: 42, color: "#7DEBFF" },
  { x: 34, y: 0.45, z: 46, color: "#B58CFF" }, { x: 39, y: 0.25, z: 49, color: "#FFD36E" },
  { x: 31, y: 0.20, z: 52, color: "#42DDF2" }, { x: 36, y: 0.40, z: 55, color: "#FFB347", chest: true },
];
const COASTER_POINTS = [
  [-10, 1.8, -27], [-6, 5.2, -30], [1, 7.1, -28], [7, 4.2, -23],
  [10, 2.3, -15], [4, 5.3, -11], [-5, 3.6, -12], [-11, 2.1, -19],
];

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide });
}
function standard(color) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.38, metalness: 0.22 });
}
function disposeGroup(scene, group) {
  if (!group) return;
  scene.remove(group);
  group.traverse((obj) => { obj.geometry?.dispose?.(); if (obj.material) { (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m?.dispose?.()); } });
}
function makeSurfboard(group) {
  const board = new THREE.Group();
  board.name = "activeSurfboard";
  board.position.set(18, 0.32, 35);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 3.2), standard("#7DEBFF"));
  board.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.85, 24), standard("#FFD36E"));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0, 1.95);
  board.add(nose);
  group.add(board);
  return board;
}
function makeSurfRings(group) {
  return SURF_RINGS.map((p, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.055, 10, 44), basic(i % 2 ? "#FFD36E" : "#00E5FF", 0.8));
    ring.position.set(p.x, 1.2, p.z);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return { ...p, mesh: ring, done: false };
  });
}
function makeDiveItems(group) {
  return DIVE_ITEMS.map((p, i) => {
    const mesh = p.chest
      ? new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.72), standard("#8A5A2B"))
      : new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), standard(p.color));
    mesh.position.set(p.x, p.y, p.z);
    group.add(mesh);
    const glow = new THREE.PointLight(new THREE.Color(p.color), 0.55, 5);
    glow.position.copy(mesh.position);
    group.add(glow);
    return { ...p, mesh, glow, done: false, id: i };
  });
}
function makeCoasterCart(group) {
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 1.0), standard("#14202A"));
  cart.name = "activeCoasterCart";
  group.add(cart);
  return cart;
}

export function startBeachActivity(scene, type, pose) {
  const group = new THREE.Group();
  group.name = `activeBeachActivity_${type}`;
  scene.add(group);
  const state = { type, group, saved: { ...pose }, progress: 0, total: type === "surf" ? SURF_RINGS.length : type === "dive" ? DIVE_ITEMS.length : 1, complete: false, t: 0, x: pose.x, y: pose.y, z: pose.z, rot: pose.rot || 0 };
  if (type === "surf") {
    state.x = 18; state.y = 0.35; state.z = 35; state.rot = 0; state.board = makeSurfboard(group); state.rings = makeSurfRings(group);
  }
  if (type === "dive") {
    state.x = 35; state.y = 0.15; state.z = 36; state.rot = 0; state.items = makeDiveItems(group);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(22, 26), basic("#1BC8F5", 0.18));
    water.rotation.x = -Math.PI / 2; water.position.set(35, 0.04, 47); group.add(water);
  }
  if (type === "coaster") {
    state.curve = new THREE.CatmullRomCurve3(COASTER_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, "catmullrom", 0.55);
    state.duration = 36;
    state.cart = makeCoasterCart(group);
  }
  return state;
}

export function exitBeachActivity(scene, state, completed = false) {
  if (!state) return null;
  disposeGroup(scene, state.group);
  if (completed) {
    if (state.type === "surf") return { x: 18, y: 0, z: 31, rot: Math.PI };
    if (state.type === "dive") return { x: 35, y: 0, z: 31, rot: Math.PI };
    if (state.type === "coaster") return { x: -9, y: 0, z: -25, rot: 0 };
  }
  return state.saved;
}

export function tickBeachActivity(state, input, dt, t) {
  if (!state || state.complete) return { x: state?.x || 0, y: state?.y || 0, z: state?.z || 0, rot: state?.rot || 0 };
  state.t += dt;
  const steer = Math.max(-1, Math.min(1, input?.x || 0));
  if (state.type === "surf") {
    state.x = Math.max(12, Math.min(24, state.x + steer * 6.5 * dt));
    state.z += 1.85 * dt;
    state.y = 0.42 + Math.sin(t * 4) * 0.07;
    state.rot = steer * -0.28;
    state.board?.position.set(state.x, state.y, state.z);
    state.board.rotation.set(0, state.rot, Math.sin(t * 2) * 0.04);
    state.rings.forEach((ring) => {
      if (ring.done) return;
      const dx = state.x - ring.x, dz = state.z - ring.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.8) { ring.done = true; ring.mesh.visible = false; state.progress += 1; }
    });
    if (state.progress >= state.total || state.z > 67) state.complete = state.progress >= state.total;
  }
  if (state.type === "dive") {
    const forward = Math.max(-1, Math.min(1, input?.y || 0));
    state.x = Math.max(28, Math.min(42, state.x + steer * 4.2 * dt));
    state.z = Math.max(36, Math.min(58, state.z + forward * 4.2 * dt + 0.45 * dt));
    state.y = 0.18 + Math.sin(t * 2.2) * 0.08;
    state.rot = Math.atan2(steer * 0.8, Math.max(0.2, forward + 0.35));
    state.items.forEach((item) => {
      if (item.done) return;
      const dx = state.x - item.x, dz = state.z - item.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.25) { item.done = true; item.mesh.visible = false; if (item.glow) item.glow.visible = false; state.progress += 1; }
    });
    if (state.progress >= state.total) state.complete = true;
  }
  if (state.type === "coaster") {
    const u = Math.min(1, state.t / state.duration);
    const pos = state.curve.getPointAt(u % 1);
    const tangent = state.curve.getTangentAt(u % 1);
    state.x = pos.x; state.y = pos.y; state.z = pos.z; state.rot = Math.atan2(tangent.x, tangent.z);
    state.cart?.position.copy(pos);
    if (state.cart) state.cart.rotation.y = state.rot;
    state.progress = u >= 1 ? 1 : 0;
    if (u >= 1) state.complete = true;
  }
  return { x: state.x, y: state.y, z: state.z, rot: state.rot };
}

export function applyBeachActivityCamera(state, camera, dt) {
  if (!state || !camera) return;
  const pos = new THREE.Vector3(state.x, state.y, state.z);
  if (state.type === "coaster") {
    const tangent = state.curve.getTangentAt(Math.min(0.999, state.t / state.duration));
    const camPos = pos.clone().add(new THREE.Vector3(-tangent.x * 5, 2.2, -tangent.z * 5));
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    camera.lookAt(pos.x, pos.y + 0.6, pos.z);
    return;
  }
  const behind = state.type === "surf" ? 6 : 5;
  const height = state.type === "surf" ? 2.4 : 1.5;
  const camPos = new THREE.Vector3(state.x, state.y + height, state.z - behind);
  camera.position.lerp(camPos, Math.min(1, dt * 8));
  camera.lookAt(state.x, state.y + 0.7, state.z + 4);
}