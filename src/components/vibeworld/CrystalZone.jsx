/**
 * CrystalZone — Premium Energy Station
 * Center: (-26, -14)  (matches CityCanvas sign placement)
 *
 * MOBILE PERF: All MeshPhysicalMaterial replaced with MeshStandardMaterial + emissive.
 * No transmission, ior, or thickness on mobile. Reduced to 2 PointLights total on mobile.
 * Arc lines throttled on mobile — only update every 6 frames.
 */
import * as THREE from "three";

export const CRYSTAL_ZONE_X  = -26;
export const CRYSTAL_ZONE_Z  = -14;
export const CRYSTAL_ZONE_RADIUS = 9;

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ── Faceted crystal geometry: flat base → tapered body → sharp tip ───
function crystalGeo(radius, height, sides = 7) {
  const bot = new THREE.CylinderGeometry(radius * 0.55, radius * 0.7, height * 0.28, sides, 1, false);
  const mid = new THREE.CylinderGeometry(radius,        radius * 0.55, height * 0.35, sides, 1, false);
  const top = new THREE.CylinderGeometry(0,             radius,        height * 0.37, sides, 1, false);
  return mergeGeos([
    { geo: bot, y: height * 0.28 * 0.5 },
    { geo: mid, y: height * 0.28 + height * 0.35 * 0.5 },
    { geo: top, y: height * 0.28 + height * 0.35 + height * 0.37 * 0.5 },
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
    for (let i = 0; i < pos.length; i += 3)
      positions.push(pos[i], pos[i + 1] + y, pos[i + 2]);
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

// ── Materials — mobile uses MeshStandardMaterial (no transmission/ior/thickness) ──
function makeCenterMat() {
  if (IS_MOBILE) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#C8E8FF"),
      emissive: new THREE.Color("#5577FF"),
      emissiveIntensity: 0.7,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#C8E8FF"),
    emissive: new THREE.Color("#5577FF"),
    emissiveIntensity: 0.5,
    metalness: 0.0,
    roughness: 0.0,
    transmission: 0.88,
    thickness: 2.2,
    ior: 2.0,
    transparent: true,
    opacity: 0.90,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function makeSmallMat(color, emissive, opacity = 0.76) {
  if (IS_MOBILE) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(emissive),
      emissiveIntensity: 0.65,
      metalness: 0.05,
      roughness: 0.08,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: 0.55,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.55,
    thickness: 0.7,
    ior: 1.8,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function makeGlowShell(color, opacity = 0.10) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true, opacity,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

// ── Arc lightning helper ───────────────────────────────────────────────
function makeArcLine(color) {
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true, opacity: 0.0, depthWrite: false,
  });
  const pts = Array.from({ length: 8 }, () => new THREE.Vector3());
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, mat);
  line.renderOrder = 3;
  return { line, mat, geo, pts };
}

function updateArc(arc, from, to, jitter) {
  const { pts, geo } = arc;
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    pts[i].lerpVectors(from, to, t);
    if (i > 0 && i < pts.length - 1) {
      pts[i].x += (Math.random() - 0.5) * jitter;
      pts[i].y += (Math.random() - 0.5) * jitter * 0.4;
      pts[i].z += (Math.random() - 0.5) * jitter;
    }
  }
  geo.setFromPoints(pts);
  geo.attributes.position.needsUpdate = true;
}

// ── Main build ────────────────────────────────────────────────────────
export function createCrystalZone(scene) {
  const group = new THREE.Group();
  group.name = "crystalZone";
  group.position.set(CRYSTAL_ZONE_X, 0, CRYSTAL_ZONE_Z);

  // ── Energy platform — circular base ────────────────────────────────
  const baseMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1A0E44"),
    transparent: true, opacity: 0.30, depthWrite: false, side: THREE.DoubleSide,
  });
  const baseDisc = new THREE.Mesh(new THREE.CircleGeometry(5.5, IS_MOBILE ? 32 : 64), baseMat);
  baseDisc.rotation.x = -Math.PI / 2;
  baseDisc.position.y = 0.02;
  baseDisc.renderOrder = 1;
  group.add(baseDisc);

  // Outer neon ring
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#7722FF"),
    transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.1, IS_MOBILE ? 32 : 64), outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.03;
  outerRing.renderOrder = 2;
  group.add(outerRing);

  // Inner hex ring
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#44CCFF"),
    transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  });
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.65, 6), innerRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.04;
  innerRing.renderOrder = 2;
  innerRing.name = "crystalInnerRing";
  group.add(innerRing);

  // Mid hex ring
  const midRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#6633FF"),
    transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
  });
  const midRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.42, 6), midRingMat);
  midRing.rotation.x = -Math.PI / 2;
  midRing.rotation.z = Math.PI / 6;
  midRing.position.y = 0.03;
  midRing.renderOrder = 2;
  group.add(midRing);

  // Light rays — skip on mobile (transparent additive cylinders are costly)
  if (!IS_MOBILE) {
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const rayMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(i === 0 ? "#88CCFF" : i === 1 ? "#AA77FF" : "#44DDFF"),
        transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.35, 4.5, 6), rayMat);
      ray.position.set(Math.cos(ang) * 3.0, 2.25, Math.sin(ang) * 3.0);
      ray.renderOrder = 1;
      group.add(ray);
    }
  }

  // ── CENTER CRYSTAL ──────────────────────────────────────────────────
  const cGeo = crystalGeo(1.1, 8.0, 8);
  const cMat = makeCenterMat();
  const center = new THREE.Mesh(cGeo, cMat);
  center.name = "bigCrystal";
  center.renderOrder = 5;
  group.add(center);

  // Inner glow core
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#AADDFF"),
    transparent: true, opacity: 0.20, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.40, 6.8, 8), coreMat);
  core.position.y = 3.6;
  core.renderOrder = 6;
  group.add(core);

  // Outer glow shell
  const glowGeo = crystalGeo(1.32, 8.6, 8);
  const glowMat = makeGlowShell("#88BBFF", 0.12);
  const centerGlow = new THREE.Mesh(glowGeo, glowMat);
  centerGlow.renderOrder = 4;
  group.add(centerGlow);

  // ── LIGHTS — mobile: 1 main + 1 ambient only; desktop: 2 per center + 7 small ──
  const bigLight = new THREE.PointLight("#88CCFF", 4.5, 20);
  bigLight.position.set(0, 4.5, 0);
  group.add(bigLight);

  let bigLight2 = null;
  if (!IS_MOBILE) {
    bigLight2 = new THREE.PointLight("#CC88FF", 1.8, 10);
    bigLight2.position.set(0.4, 2.0, 0.4);
    group.add(bigLight2);
  }

  // ── SMALL CRYSTALS — 7 in a clean ring ──────────────────────────────
  const RING_R = 3.2;
  const SMALL = [
    [RING_R, 0,              0.30, 3.0,  0.07, "#AA77FF", "#6600CC", 0.78],
    [RING_R, Math.PI*2/7,    0.24, 2.4, -0.08, "#00E5FF", "#005599", 0.74],
    [RING_R, Math.PI*4/7,    0.34, 3.6,  0.10, "#CC66FF", "#880099", 0.80],
    [RING_R, Math.PI*6/7,    0.20, 2.0, -0.06, "#55CCFF", "#003388", 0.70],
    [RING_R, Math.PI*8/7,    0.28, 2.8,  0.09, "#BB55FF", "#550099", 0.76],
    [RING_R, Math.PI*10/7,   0.18, 1.8, -0.11, "#00DDFF", "#004477", 0.68],
    [RING_R, Math.PI*12/7,   0.32, 3.2,  0.06, "#9966FF", "#440099", 0.78],
  ];

  const smallCrystalMeshes = [];
  const smallCrystalPositions = [];

  for (const [r, ang, rad, h, rz, col, em, op] of SMALL) {
    const sx = Math.cos(ang) * r;
    const sz = Math.sin(ang) * r;

    const geo = crystalGeo(rad, h, 6);
    const mat = makeSmallMat(col, em, op);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sx, 0, sz);
    mesh.rotation.y = ang;
    mesh.rotation.z = rz;
    mesh.renderOrder = 4;
    group.add(mesh);

    // Glow shell
    const ggeo = crystalGeo(rad * 1.25, h + 0.4, 6);
    const gmat = makeGlowShell(col, 0.08);
    const glowMesh = new THREE.Mesh(ggeo, gmat);
    glowMesh.position.set(sx, 0, sz);
    glowMesh.rotation.y = ang;
    glowMesh.rotation.z = rz;
    glowMesh.renderOrder = 3;
    group.add(glowMesh);

    // On mobile: NO per-small-crystal PointLights (saves 7 lights)
    let pl = null;
    if (!IS_MOBILE) {
      pl = new THREE.PointLight(col, 0.7, 7);
      pl.position.set(sx, h * 0.5, sz);
      group.add(pl);
    }

    smallCrystalMeshes.push({ mesh, glowMesh, mat, glowMat: gmat, light: pl, h, baseY: 0 });
    smallCrystalPositions.push(new THREE.Vector3(sx, h * 0.72, sz));
  }

  // ── Electric arcs — mobile: 2 arcs only; desktop: 4 ─────────────────
  const ARC_COLORS = ["#88EEFF", "#BB88FF", "#00DDFF", "#AA77FF"];
  const bigTip = new THREE.Vector3(0, 8.0, 0);
  const arcIndices = IS_MOBILE ? [0, 4] : [0, 2, 4, 6];
  const arcs = arcIndices.map((idx, i) => {
    const arc = makeArcLine(ARC_COLORS[i]);
    group.add(arc.line);
    return { ...arc, targetIdx: idx };
  });

  // ── Avatar energy beam — from crystal tip to player (shown on activation) ──
  const beamMat = new THREE.LineBasicMaterial({
    color: new THREE.Color("#44EEFF"),
    transparent: true, opacity: 0.0, depthWrite: false,
  });
  const beamPts = [new THREE.Vector3(0, 8.0, 0), new THREE.Vector3(0, 1.2, 0)];
  const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPts);
  const beamLine = new THREE.Line(beamGeo, beamMat);
  beamLine.name = "crystalBeam";
  beamLine.renderOrder = 6;
  beamLine.frustumCulled = false;
  scene.add(beamLine); // world-space line (not in group, so world coords work directly)

  // Avatar aura — soft glow sphere around avatar
  const auraMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#66CCFF"),
    transparent: true, opacity: 0.0, depthWrite: false,
    side: THREE.BackSide, blending: THREE.AdditiveBlending,
  });
  const auraMesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 7), auraMat);
  auraMesh.name = "crystalAura";
  auraMesh.renderOrder = 7;
  auraMesh.frustumCulled = false;
  scene.add(auraMesh);

  scene.add(group);

  scene.userData.crystalZone = {
    group, center, cMat, centerGlow,
    glowMat: centerGlow.material,
    coreMat,
    bigLight, bigLight2,
    outerRingMat, innerRingMat, midRingMat, baseMat,
    smallCrystals: smallCrystalMeshes,
    smallPositions: smallCrystalPositions,
    arcs, bigTip,
    beamLine, beamMat, beamGeo, beamPts,
    auraMesh, auraMat,
    proximity: 0,
    activated: false,
    activatedTimer: 0,
    _arcFrame: 0,
  };
}

// ── Animation ──────────────────────────────────────────────────────────
export function animateCrystalZone(scene, t, dt, playerX, playerZ) {
  const cz = scene.userData.crystalZone;
  if (!cz) return;

  cz._arcFrame = (cz._arcFrame || 0) + 1;

  // Proximity
  const dx = playerX - CRYSTAL_ZONE_X;
  const dz = playerZ - CRYSTAL_ZONE_Z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const targetProx = dist < CRYSTAL_ZONE_RADIUS ? Math.max(0, 1 - dist / CRYSTAL_ZONE_RADIUS) : 0;
  cz.proximity += (targetProx - cz.proximity) * Math.min(1, dt * 2.5);
  const prox = cz.proximity;

  // Activation timer
  if (cz.activated) {
    cz.activatedTimer -= dt;
    if (cz.activatedTimer <= 0) cz.activated = false;
  }
  const actBoost = cz.activated ? 1.0 : 0.0;

  const idlePulse = Math.sin(t * 1.1) * 0.5 + 0.5;

  // ── Center crystal ────────────────────────────────────────────────
  cz.center.rotation.y = t * 0.07;
  cz.cMat.emissiveIntensity = 0.35 + idlePulse * 0.20 + prox * 0.55 + actBoost * 0.8;
  cz.cMat.opacity = 0.85 + prox * 0.10;
  cz.glowMat.opacity = 0.08 + idlePulse * 0.05 + prox * 0.18 + actBoost * 0.25;
  cz.coreMat.opacity = 0.14 + Math.sin(t * 2.2) * 0.06 + prox * 0.20 + actBoost * 0.35;

  cz.bigLight.intensity  = 3.0 + idlePulse * 1.5 + prox * 5.0 + actBoost * 8.0;
  cz.bigLight.distance   = 16  + prox * 10;

  if (cz.bigLight2) {
    cz.bigLight2.intensity = 1.2 + Math.sin(t * 1.7) * 0.5 + prox * 2.0 + actBoost * 3.0;
    const hue = (t * 0.07) % 1;
    cz.bigLight2.color.setHSL(hue, 1.0, 0.6);
  }

  // ── Small crystals — mostly static on mobile ──────────────────
  for (let i = 0; i < cz.smallCrystals.length; i++) {
    const sc = cz.smallCrystals[i];
    if (!IS_MOBILE) {
      const phase = i * 0.9;
      sc.mesh.position.y = Math.sin(t * 0.7 + phase) * 0.06;
      sc.glowMesh.position.y = sc.mesh.position.y;
    }
    // Mobile: only update every other crystal, slow pulse
    if (!IS_MOBILE || i % 2 === 0) {
      const sp = Math.sin(t * 0.9 + i * 0.7) * 0.5 + 0.5;
      sc.mat.emissiveIntensity = 0.40 + sp * 0.20 + prox * 0.55 + actBoost * 0.6;
      sc.glowMat.opacity = 0.05 + sp * 0.05 + prox * 0.12;
      if (sc.light) sc.light.intensity = 0.5 + sp * 0.3 + prox * 1.8 + actBoost * 2.0;
    }
  }

  // ── Ground rings ──────────────────────────────────────────────────
  cz.baseMat.opacity      = 0.20 + idlePulse * 0.06 + prox * 0.18 + actBoost * 0.22;
  cz.outerRingMat.opacity = 0.32 + idlePulse * 0.12 + prox * 0.30 + actBoost * 0.40;
  cz.innerRingMat.opacity = 0.28 + idlePulse * 0.10 + prox * 0.28 + actBoost * 0.45;
  cz.midRingMat.opacity   = 0.16 + idlePulse * 0.07 + prox * 0.20 + actBoost * 0.30;

  const innerRing = cz.group.getObjectByName("crystalInnerRing");
  if (innerRing) innerRing.rotation.z = t * 0.15;

  // ── Arcs — throttled every 6 frames on mobile, every 3 on desktop ──
  const arcUpdateRate = IS_MOBILE ? 6 : 3;
  if (!cz._arcTimer) cz._arcTimer = 0;
  cz._arcTimer += dt;
  const arcRate = 0.09 - prox * 0.04;
  const fireArc = cz._arcTimer >= arcRate && (cz._arcFrame % arcUpdateRate === 0);
  if (fireArc) cz._arcTimer = 0;

  for (const arc of cz.arcs) {
    const target = cz.smallPositions[arc.targetIdx];
    if (!target) continue;
    arc.mat.opacity = Math.max(0, 0.05 + prox * 0.65 + actBoost * 0.9 + Math.sin(t * 6.0 + arc.targetIdx) * 0.12);
    if (fireArc) updateArc(arc, cz.bigTip, target, 0.18 + prox * 0.55);
  }

  // ── Avatar energy beam — tracks player world position while activated ──
  const beamActive = cz.activated && cz.activatedTimer > 0;
  if (cz.beamLine && cz.beamMat) {
    if (beamActive) {
      // Crystal tip in world space (group is offset by CRYSTAL_ZONE_X, CRYSTAL_ZONE_Z)
      const crystalTipWorld = new THREE.Vector3(CRYSTAL_ZONE_X, 8.0, CRYSTAL_ZONE_Z);
      const avatarWorld = new THREE.Vector3(playerX, 1.2, playerZ);
      cz.beamPts[0].copy(crystalTipWorld);
      cz.beamPts[1].copy(avatarWorld);
      cz.beamGeo.setFromPoints(cz.beamPts);
      cz.beamGeo.attributes.position.needsUpdate = true;
      // Flicker the beam
      const ratio = cz.activatedTimer / 4.0;
      const fadeIn  = Math.min(1, (4.0 - cz.activatedTimer) * 3); // fast fade in
      const fadeOut = Math.min(1, cz.activatedTimer * 1.5);       // fade out at end
      cz.beamMat.opacity = Math.min(fadeIn, fadeOut) * (0.55 + Math.sin(t * 18) * 0.2);
      // Shift beam color cyan → purple over duration
      cz.beamMat.color.setHSL(0.5 + (1 - ratio) * 0.15, 1.0, 0.7);
    } else {
      cz.beamMat.opacity = 0;
    }
  }

  // ── Avatar aura — follows player while activated ──
  if (cz.auraMesh && cz.auraMat) {
    if (beamActive) {
      cz.auraMesh.position.set(playerX, 1.0, playerZ);
      const ratio = cz.activatedTimer / 4.0;
      const fade = Math.min(1, (4.0 - cz.activatedTimer) * 2) * Math.min(1, cz.activatedTimer * 1.5);
      cz.auraMat.opacity = fade * (0.18 + Math.sin(t * 3.0) * 0.07);
      cz.auraMesh.scale.setScalar(1.0 + Math.sin(t * 4.0) * 0.08);
    } else {
      cz.auraMat.opacity = 0;
    }
  }
}

// ── Call this when player activates the crystal (from UpperVibeCity) ──
export function activateCrystalZone(scene) {
  const cz = scene.userData.crystalZone;
  if (!cz) return;
  cz.activated = true;
  cz.activatedTimer = 4.0; // 4 seconds
}

export const CRYSTAL_INTERACT_RADIUS = 5.5;