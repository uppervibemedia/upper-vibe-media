import * as THREE from "three";

export const HOVERBOARD_DASH_DURATION = 75;

const DASH_ROUTE = [
  { x: 0, z: -6, color: "#00E5FF", label: "Dance Floor" },
  { x: 5, z: -12, color: "#C43BFF", label: "Neon Run" },
  { x: 3, z: -22, color: "#FFD36E", label: "Music Stage" },
  { x: -7, z: -29, color: "#FF4FC3", label: "Stage Arc" },
  { x: -18, z: -27, color: "#7CFF8A", label: "Vibe Lounge" },
  { x: -27, z: -18, color: "#00E5FF", label: "Crystal Bend" },
  { x: -29, z: -9, color: "#A078FF", label: "Crystal Field" },
  { x: -16, z: -2, color: "#FFD36E", label: "City Flow" },
  { x: -4, z: 7, color: "#00E5FF", label: "Leaderboard" },
  { x: 0, z: 12, color: "#FF4FC3", label: "Leaderboard" },
  { x: 13, z: 11, color: "#7CFF8A", label: "Wheel Path" },
  { x: 25, z: 9, color: "#FFD36E", label: "Ferris Wheel" },
  { x: 30, z: 15, color: "#C43BFF", label: "Neon Loop" },
  { x: 20, z: 20, color: "#00E5FF", label: "Beach Gate" },
  { x: 8, z: 20, color: "#FF4FC3", label: "Beach Entrance" },
  { x: 0, z: 16, color: "#7CFF8A", label: "Return Line" },
];

const BOOST_PADS = [
  { x: 5, z: -15, color: "#00E5FF" },
  { x: -22, z: -22, color: "#C43BFF" },
  { x: -24, z: -7, color: "#FFD36E" },
  { x: 8, z: 10, color: "#7CFF8A" },
  { x: 24, z: 17, color: "#FF4FC3" },
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

function makeRing(point, index, mobile) {
  const group = new THREE.Group();
  group.position.set(point.x, 1.12, point.z);
  group.userData.baseY = 1.12;
  group.userData.phase = index * 0.65;
  group.userData.color = point.color;
  group.userData.collected = false;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(mobile ? 0.95 : 1.08, mobile ? 0.045 : 0.055, 8, mobile ? 32 : 44),
    basic(point.color, 0.86, false)
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  group.userData.ring = ring;

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(mobile ? 0.7 : 0.78, 0.018, 6, mobile ? 24 : 32),
    basic("#FFFFFF", 0.36, true)
  );
  inner.rotation.x = Math.PI / 2;
  group.add(inner);
  group.userData.inner = inner;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(mobile ? 1.1 : 1.24, mobile ? 1.24 : 1.42, mobile ? 28 : 36),
    basic(point.color, 0.13, true)
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
  group.userData.halo = halo;

  return group;
}

function makeBoostPad(point, index) {
  const group = new THREE.Group();
  group.position.set(point.x, 0.045, point.z);
  group.userData.color = point.color;
  group.userData.phase = index * 1.1;
  group.userData.cooldownUntil = 0;

  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.05, 28), basic(point.color, 0.22, true));
  pad.rotation.x = -Math.PI / 2;
  group.add(pad);
  group.userData.pad = pad;

  const rim = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.25, 36), basic(point.color, 0.78, false));
  rim.rotation.x = -Math.PI / 2;
  group.add(rim);
  group.userData.rim = rim;

  return group;
}

function makeTrailSegment(color) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.25), basic(color, 0.26, true));
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.life = 0.62;
  mesh.userData.maxLife = 0.62;
  return mesh;
}

export function createHoverboardMusicDash(scene, { mobile = false, sessionId = Date.now() } = {}) {
  if (!scene) return null;
  const group = new THREE.Group();
  group.name = "hoverboardMusicDash";
  scene.add(group);

  const rings = DASH_ROUTE.map((point, index) => {
    const ring = makeRing(point, index, mobile);
    group.add(ring);
    return { ...point, index, mesh: ring, collected: false };
  });

  const boostPads = BOOST_PADS.map((point, index) => {
    const pad = makeBoostPad(point, index);
    group.add(pad);
    return { ...point, index, mesh: pad };
  });

  return {
    sessionId,
    group,
    rings,
    boostPads,
    trail: [],
    startedAt: performance.now() * 0.001,
    lastPos: null,
    distance: 0,
    collected: 0,
    combo: 0,
    longestCombo: 0,
    coinsEarned: 0,
    score: 0,
    boostUntil: 0,
    complete: false,
    mobile,
  };
}

export function disposeHoverboardMusicDash(scene, state) {
  if (!scene || !state?.group) return;
  disposeObject(state.group);
  scene.remove(state.group);
}

export function tickHoverboardMusicDash(state, pose, t, dt, audioBeat = 0) {
  if (!state || state.complete) return state;
  const px = pose?.x || 0;
  const pz = pose?.z || 0;
  const boostActive = t < state.boostUntil;

  if (state.lastPos) {
    const dx = px - state.lastPos.x;
    const dz = pz - state.lastPos.z;
    state.distance += Math.sqrt(dx * dx + dz * dz);
  }
  state.lastPos = { x: px, z: pz };

  const comboGlow = Math.min(1, state.combo / 18);
  state.rings.forEach((ring, index) => {
    const mesh = ring.mesh;
    if (!mesh || ring.collected) return;
    const phase = mesh.userData.phase || 0;
    const pulse = 1 + Math.sin(t * 3.0 + phase) * 0.055 + audioBeat * 0.18;
    mesh.scale.setScalar(pulse);
    mesh.position.y = mesh.userData.baseY + Math.sin(t * 2.1 + phase) * 0.055;
    mesh.rotation.y += dt * (0.45 + comboGlow * 0.45);
    if (mesh.userData.ring?.material) mesh.userData.ring.material.opacity = 0.72 + audioBeat * 0.18 + comboGlow * 0.08;
    if (mesh.userData.halo?.material) mesh.userData.halo.material.opacity = 0.08 + audioBeat * 0.08 + comboGlow * 0.08;

    const dx = px - ring.x;
    const dz = pz - ring.z;
    if (dx * dx + dz * dz < 1.45 * 1.45) {
      ring.collected = true;
      mesh.visible = false;
      state.collected += 1;
      state.combo += 1;
      state.longestCombo = Math.max(state.longestCombo, state.combo);
      const coinValue = Math.min(5, 1 + Math.floor(state.combo / 5));
      state.coinsEarned += coinValue;
      state.score += 100 * coinValue + state.combo * 12;
      try { navigator?.vibrate?.(state.combo % 5 === 0 ? 24 : 10); } catch {}
    }
  });

  state.boostPads.forEach((pad) => {
    const mesh = pad.mesh;
    if (!mesh) return;
    const phase = mesh.userData.phase || 0;
    const ready = t > (mesh.userData.cooldownUntil || 0);
    const pulse = ready ? 1 + Math.sin(t * 4 + phase) * 0.08 + audioBeat * 0.12 : 0.82;
    mesh.scale.setScalar(pulse);
    if (mesh.userData.rim?.material) mesh.userData.rim.material.opacity = ready ? 0.58 + audioBeat * 0.22 : 0.18;
    if (mesh.userData.pad?.material) mesh.userData.pad.material.opacity = ready ? 0.18 + audioBeat * 0.10 : 0.06;
    const dx = px - pad.x;
    const dz = pz - pad.z;
    if (ready && dx * dx + dz * dz < 1.55 * 1.55) {
      state.boostUntil = t + 2.6;
      mesh.userData.cooldownUntil = t + 6.5;
      state.combo = Math.max(1, state.combo);
      try { navigator?.vibrate?.(18); } catch {}
    }
  });

  if (state.group && (!state._trailTimer || t > state._trailTimer)) {
    state._trailTimer = t + (state.mobile ? 0.14 : 0.09);
    const color = boostActive ? "#FFD36E" : state.combo >= 12 ? "#FF4FC3" : state.combo >= 6 ? "#C43BFF" : "#00E5FF";
    const seg = makeTrailSegment(color);
    seg.position.set(px, 0.06, pz);
    seg.rotation.z = pose?.rot || 0;
    seg.scale.setScalar(1 + Math.min(0.9, state.combo * 0.035));
    state.group.add(seg);
    state.trail.push(seg);
    if (state.trail.length > (state.mobile ? 18 : 28)) {
      const old = state.trail.shift();
      state.group.remove(old);
      disposeObject(old);
    }
  }

  state.trail.forEach((seg) => {
    seg.userData.life -= dt;
    const life = Math.max(0, seg.userData.life / seg.userData.maxLife);
    seg.material.opacity = 0.26 * life * (1 + Math.min(1, state.combo / 18));
    seg.scale.x *= 0.992;
    if (seg.userData.life <= 0) {
      seg.visible = false;
    }
  });
  state.trail = state.trail.filter((seg) => {
    if (seg.visible) return true;
    state.group.remove(seg);
    disposeObject(seg);
    return false;
  });

  const elapsed = t - state.startedAt;
  state.remaining = Math.max(0, HOVERBOARD_DASH_DURATION - elapsed);
  if (elapsed >= HOVERBOARD_DASH_DURATION || state.collected >= state.rings.length) state.complete = true;
  state.boostActive = boostActive;
  return state;
}

export function getHoverboardDashStats(state) {
  if (!state) return { ringsCollected: 0, longestCombo: 0, distance: 0, coinsEarned: 0, score: 0, bestScore: 0, remaining: HOVERBOARD_DASH_DURATION };
  const bestScore = Math.max(Number(localStorage.getItem("uvc_hoverboard_dash_best") || 0), Math.round(state.score || 0));
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
    remaining: Math.ceil(state.remaining ?? HOVERBOARD_DASH_DURATION),
    boostActive: !!state.boostActive,
    complete: !!state.complete,
  };
}

export function saveHoverboardDashBest(score) {
  const current = Number(localStorage.getItem("uvc_hoverboard_dash_best") || 0);
  const next = Math.max(current, Math.round(score || 0));
  try { localStorage.setItem("uvc_hoverboard_dash_best", String(next)); } catch {}
  return next;
}