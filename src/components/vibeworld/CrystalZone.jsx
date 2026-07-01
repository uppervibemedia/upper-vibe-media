/**
 * CrystalZone — two smaller matching crystal energy nodes framing the Dance Floor.
 * Lightweight, decorative-only, no collision or interaction blockers.
 */
import * as THREE from "three";

export const CRYSTAL_ZONE_NODES = [
  { x: -30, z: -10, label: "Crystal Node" },
  { x: 30, z: -10, label: "Crystal Node" },
];
export const CRYSTAL_ZONE_X = 0;
export const CRYSTAL_ZONE_Z = -10;
export const CRYSTAL_ZONE_RADIUS = 4.2;

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function crystalGeo(radius, height, sides = 7) {
  const bot = new THREE.CylinderGeometry(radius * 0.55, radius * 0.7, height * 0.28, sides, 1, false);
  const mid = new THREE.CylinderGeometry(radius, radius * 0.55, height * 0.35, sides, 1, false);
  const top = new THREE.CylinderGeometry(0, radius, height * 0.37, sides, 1, false);
  return mergeGeos([
    { geo: bot, y: height * 0.14 },
    { geo: mid, y: height * 0.28 + height * 0.175 },
    { geo: top, y: height * 0.63 + height * 0.185 },
  ]);
}

function mergeGeos(parts) {
  const positions = [], normals = [], uvs = [], indices = [];
  let offset = 0;
  for (const { geo, y } of parts) {
    const pos = geo.attributes.position.array;
    const nor = geo.attributes.normal.array;
    const uv = geo.attributes.uv.array;
    const idx = geo.index ? geo.index.array : null;
    for (let i = 0; i < pos.length; i += 3) positions.push(pos[i], pos[i + 1] + y, pos[i + 2]);
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

function makeCrystalMat(color, emissive, intensity = 0.5) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: IS_MOBILE ? intensity + 0.08 : intensity,
    metalness: 0.1,
    roughness: 0.07,
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

function makeGlowShell(color, opacity = 0.08) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

function createCrystalNode(node, index) {
  const group = new THREE.Group();
  group.name = "crystalZone";
  group.position.set(node.x, 0, node.z);
  group.rotation.y = index === 0 ? Math.PI / 10 : -Math.PI / 10;

  const baseMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#140B36"),
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const baseDisc = new THREE.Mesh(new THREE.CircleGeometry(2.7, IS_MOBILE ? 28 : 48), baseMat);
  baseDisc.rotation.x = -Math.PI / 2;
  baseDisc.position.y = 0.02;
  baseDisc.renderOrder = 1;
  group.add(baseDisc);

  const outerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#7C3AED"),
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.25, 2.5, IS_MOBILE ? 28 : 48), outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.035;
  outerRing.renderOrder = 2;
  group.add(outerRing);

  const innerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#44CCFF"),
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.02, 6), innerRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.045;
  innerRing.renderOrder = 2;
  group.add(innerRing);

  const centerGeo = crystalGeo(0.62, 4.4, 8);
  const centerMat = makeCrystalMat("#C8E8FF", "#5577FF", 0.42);
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.name = "crystalNodeCore";
  center.renderOrder = 5;
  group.add(center);

  const glowGeo = crystalGeo(0.78, 4.8, 8);
  const glowMat = makeGlowShell("#88BBFF", 0.08);
  const centerGlow = new THREE.Mesh(glowGeo, glowMat);
  centerGlow.renderOrder = 4;
  group.add(centerGlow);

  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#AADDFF"),
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 3.8, 8), coreMat);
  core.position.y = 2.05;
  core.renderOrder = 6;
  group.add(core);

  const smallCrystals = [];
  const SMALL = [
    [1.45, 0, 0.16, 1.6, 0.07, "#AA77FF", "#6600CC"],
    [1.55, Math.PI / 2, 0.14, 1.3, -0.06, "#00E5FF", "#005599"],
    [1.45, Math.PI, 0.18, 1.8, 0.08, "#CC66FF", "#880099"],
    [1.55, Math.PI * 1.5, 0.13, 1.2, -0.08, "#55CCFF", "#003388"],
  ];

  for (const [r, ang, rad, h, rz, col, em] of SMALL) {
    const sx = Math.cos(ang) * r;
    const sz = Math.sin(ang) * r;
    const mat = makeCrystalMat(col, em, 0.38);
    const mesh = new THREE.Mesh(crystalGeo(rad, h, 6), mat);
    mesh.position.set(sx, 0, sz);
    mesh.rotation.y = ang;
    mesh.rotation.z = rz;
    mesh.renderOrder = 4;
    group.add(mesh);

    const glowMat = makeGlowShell(col, 0.055);
    const glow = new THREE.Mesh(crystalGeo(rad * 1.22, h + 0.22, 6), glowMat);
    glow.position.set(sx, 0, sz);
    glow.rotation.y = ang;
    glow.rotation.z = rz;
    glow.renderOrder = 3;
    group.add(glow);

    smallCrystals.push({ mesh, mat, glowMat });
  }

  const mainLight = new THREE.PointLight("#88CCFF", IS_MOBILE ? 1.45 : 2.0, IS_MOBILE ? 9 : 12);
  mainLight.position.set(0, 2.7, 0);
  group.add(mainLight);

  let accentLight = null;
  if (!IS_MOBILE) {
    accentLight = new THREE.PointLight("#B688FF", 0.65, 7);
    accentLight.position.set(0.35, 1.55, 0.35);
    group.add(accentLight);
  }

  return {
    group,
    x: node.x,
    z: node.z,
    center,
    centerMat,
    centerGlow,
    glowMat,
    coreMat,
    outerRingMat,
    innerRingMat,
    baseMat,
    smallCrystals,
    mainLight,
    accentLight,
  };
}

export function createCrystalZone(scene) {
  const nodes = CRYSTAL_ZONE_NODES.map((node, index) => createCrystalNode(node, index));
  nodes.forEach((node) => scene.add(node.group));
  scene.userData.crystalZones = nodes;
  scene.userData.crystalZone = {
    nodes,
    activated: false,
    _frame: 0,
  };
}

export function animateCrystalZone(scene, t, dt, playerX, playerZ, tvSmooth = false) {
  const state = scene.userData.crystalZone;
  const nodes = state?.nodes || scene.userData.crystalZones || [];
  if (!nodes.length) return;

  state._frame = (state._frame || 0) + 1;
  const frame = state._frame;

  for (let n = 0; n < nodes.length; n++) {
    const node = nodes[n];
    const dx = playerX - node.x;
    const dz = playerZ - node.z;
    const distSq = dx * dx + dz * dz;

    node.center.rotation.y = t * 0.08 * (n === 0 ? 1 : -1);
    if (distSq > 22 * 22) {
      node.mainLight.distance = 7;
      node.mainLight.intensity = IS_MOBILE ? 0.75 : 1.0;
      continue;
    }

    if (IS_MOBILE && frame % 3 !== n) continue;
    if (tvSmooth && frame % 2 !== n) continue;

    const idlePulse = Math.sin(t * 1.05 + n * 0.9) * 0.5 + 0.5;
    node.centerMat.emissiveIntensity = 0.32 + idlePulse * 0.14;
    node.glowMat.opacity = 0.045 + idlePulse * 0.035;
    node.coreMat.opacity = 0.10 + Math.sin(t * 2.0 + n) * 0.03;
    node.outerRingMat.opacity = 0.20 + idlePulse * 0.08;
    node.innerRingMat.opacity = 0.18 + idlePulse * 0.08;
    node.mainLight.intensity = (IS_MOBILE ? 1.25 : 1.7) + idlePulse * 0.45;
    node.mainLight.distance = IS_MOBILE ? 8.5 : 11;
    if (node.accentLight) node.accentLight.intensity = 0.45 + idlePulse * 0.18;

    for (let i = 0; i < node.smallCrystals.length; i++) {
      if ((i + frame) % 2 !== 0) continue;
      const sc = node.smallCrystals[i];
      const sp = Math.sin(t * 0.9 + i * 0.8 + n) * 0.5 + 0.5;
      sc.mesh.rotation.y += 0.004 * (n === 0 ? 1 : -1);
      sc.mat.emissiveIntensity = 0.27 + sp * 0.12;
      sc.glowMat.opacity = 0.03 + sp * 0.03;
    }
  }
}