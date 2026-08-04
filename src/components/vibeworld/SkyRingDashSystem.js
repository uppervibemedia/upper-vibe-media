import * as THREE from "three";

export const SKY_RING_DASH_DURATION = 75;

const SKY_ROUTE = [
  { x: -12, y: 4.8, z: -6, color: "#00E5FF" },
  { x: -18, y: 5.4, z: -15, color: "#A078FF" },
  { x: -10, y: 6.2, z: -25, color: "#FFD36E" },
  { x: 2, y: 6.8, z: -27, color: "#FF4FC3" },
  { x: 14, y: 5.8, z: -18, color: "#7CFF8A" },
  { x: 24, y: 5.2, z: -4, color: "#00E5FF" },
  { x: 18, y: 6.4, z: 8, color: "#C43BFF" },
  { x: 6, y: 7.2, z: 14, color: "#FFD36E" },
  { x: -8, y: 6.4, z: 12, color: "#FF4FC3" },
  { x: -20, y: 5.6, z: 5, color: "#7CFF8A" },
  { x: -28, y: 6.6, z: -8, color: "#00E5FF" },
  { x: -20, y: 7.4, z: -22, color: "#A078FF" },
  { x: -4, y: 7.0, z: -30, color: "#FFD36E" },
  { x: 16, y: 6.2, z: -26, color: "#FF4FC3" },
  { x: 28, y: 5.6, z: -12, color: "#7CFF8A" },
  { x: 18, y: 6.6, z: 16, color: "#00E5FF" },
];

function basic(color, opacity = 1, additive = false) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 0.85,
    side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    child.geometry?.dispose?.();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => mat?.dispose?.());
    }
  });
}

function makeSkyRing(point, index, mobile) {
  const group = new THREE.Group();
  group.position.set(point.x, point.y, point.z);
  group.userData.phase = index * 0.58;
  group.userData.color = point.color;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(mobile ? 1.05 : 1.22, mobile ? 0.055 : 0.07, 8, mobile ? 36 : 52),
    basic(point.color, 0.88, false)
  );
  ring.rotation.y = Math.PI / 2;
  group.add(ring);
  group.userData.ring = ring;

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(mobile ? 1.34 : 1.55, 0.018, 6, mobile ? 32 : 44),
    basic("#FFFFFF", 0.22, true)
  );
  halo.rotation.y = Math.PI / 2;
  group.add(halo);
  group.userData.halo = halo;

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), basic(point.color, 0.72, true));
  group.add(core);
  group.userData.core = core;
  return group;
}

function makeTrailOrb(color) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), basic(color, 0.32, true));
  mesh.userData.life = 0.7;
  mesh.userData.maxLife = 0.7;
  return mesh;
}

export function createSkyRingDash(scene, { mobile = false, sessionId = Date.now() } = {}) {
  if (!scene) return null;
  const group = new THREE.Group();
  group.name = "jetpackSkyRingDash";
  scene.add(group);

  const rings = SKY_ROUTE.map((point, index) => {
    const mesh = makeSkyRing(point, index, mobile);
    group.add(mesh);
    return { ...point, index, mesh, collected: false };
  });

  return {
    sessionId,
    group,
    rings,
    trail: [],
    startedAt: performance.now() * 0.001,
    lastPos: null,
    distance: 0,
    collected: 0,
    combo: 0,
    longestCombo: 0,
    coinsEarned: 0,
    score: 0,
    complete: false,
    mobile,
  };
}

export function disposeSkyRingDash(scene, state) {
  if (!scene || !state?.group) return;
  disposeObject(state.group);
  scene.remove(state.group);
}

export function tickSkyRingDash(state, pose, t, dt, audioBeat = 0) {
  if (!state || state.complete) return state;
  const px = pose?.x || 0;
  const py = pose?.y || 0;
  const pz = pose?.z || 0;

  if (state.lastPos) {
    const dx = px - state.lastPos.x;
    const dy = py - state.lastPos.y;
    const dz = pz - state.lastPos.z;
    state.distance += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  state.lastPos = { x: px, y: py, z: pz };

  const comboGlow = Math.min(1, state.combo / 18);
  state.rings.forEach((ring) => {
    const mesh = ring.mesh;
    if (!mesh || ring.collected) return;
    const phase = mesh.userData.phase || 0;
    const pulse = 1 + Math.sin(t * 3.2 + phase) * 0.07 + audioBeat * 0.16 + comboGlow * 0.04;
    mesh.scale.setScalar(pulse);
    mesh.rotation.z += dt * (0.55 + comboGlow * 0.55);
    mesh.rotation.x = Math.sin(t * 0.8 + phase) * 0.12;
    if (mesh.userData.ring?.material) mesh.userData.ring.material.opacity = 0.72 + audioBeat * 0.18 + comboGlow * 0.1;
    if (mesh.userData.halo?.material) mesh.userData.halo.material.opacity = 0.12 + audioBeat * 0.08 + comboGlow * 0.14;

    const dx = px - ring.x;
    const dy = py - ring.y;
    const dz = pz - ring.z;
    if (dx * dx + dy * dy + dz * dz < 1.75 * 1.75) {
      ring.collected = true;
      mesh.visible = false;
      state.collected += 1;
      state.combo += 1;
      state.longestCombo = Math.max(state.longestCombo, state.combo);
      const coinValue = Math.min(6, 1 + Math.floor(state.combo / 4));
      state.coinsEarned += coinValue;
      state.score += 120 * coinValue + state.combo * 18;
      try { navigator?.vibrate?.(state.combo % 5 === 0 ? 24 : 10); } catch {}
    }
  });

  if (state.group && (!state._trailTimer || t > state._trailTimer)) {
    state._trailTimer = t + (state.mobile ? 0.16 : 0.1);
    const color = state.combo >= 12 ? "#FF4FC3" : state.combo >= 6 ? "#FFD36E" : "#00E5FF";
    const orb = makeTrailOrb(color);
    orb.position.set(px, py + 0.05, pz);
    orb.scale.setScalar(1 + Math.min(1.1, state.combo * 0.045));
    state.group.add(orb);
    state.trail.push(orb);
    if (state.trail.length > (state.mobile ? 20 : 34)) {
      const old = state.trail.shift();
      state.group.remove(old);
      disposeObject(old);
    }
  }

  state.trail.forEach((orb) => {
    orb.userData.life -= dt;
    const life = Math.max(0, orb.userData.life / orb.userData.maxLife);
    orb.material.opacity = 0.32 * life * (1 + Math.min(1, state.combo / 16));
    orb.scale.multiplyScalar(0.992);
    if (orb.userData.life <= 0) orb.visible = false;
  });
  state.trail = state.trail.filter((orb) => {
    if (orb.visible) return true;
    state.group.remove(orb);
    disposeObject(orb);
    return false;
  });

  const elapsed = t - state.startedAt;
  state.remaining = Math.max(0, SKY_RING_DASH_DURATION - elapsed);
  if (elapsed >= SKY_RING_DASH_DURATION || state.collected >= state.rings.length) state.complete = true;
  return state;
}

export function getSkyRingDashStats(state) {
  if (!state) return { ringsCollected: 0, longestCombo: 0, distance: 0, coinsEarned: 0, score: 0, bestScore: 0, remaining: SKY_RING_DASH_DURATION };
  const bestScore = Math.max(Number(localStorage.getItem("uvc_sky_ring_dash_best") || 0), Math.round(state.score || 0));
  return {
    sessionId: state.sessionId,
    ringsCollected: state.collected || 0,
    totalRings: state.rings?.length || 0,
    combo: state.combo || 0,
    longestCombo: state.longestCombo || 0,
    distance: Math.round(state.distance || 0),
    coinsEarned: Math.round(state.coinsEarned || 0),
    score: Math.round(state.score || 0),
    bestScore,
    remaining: Math.ceil(state.remaining ?? SKY_RING_DASH_DURATION),
    boostActive: state.combo >= 6,
    complete: !!state.complete,
  };
}

export function saveSkyRingDashBest(score) {
  const current = Number(localStorage.getItem("uvc_sky_ring_dash_best") || 0);
  const next = Math.max(current, Math.round(score || 0));
  try { localStorage.setItem("uvc_sky_ring_dash_best", String(next)); } catch {}
  return next;
}