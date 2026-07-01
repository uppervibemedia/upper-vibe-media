/**
 * CrystalZone — Premium Energy Station
 * Center: (-28, 9)  (matches CityCanvas sign placement)
 *
 * MOBILE PERF: All MeshPhysicalMaterial replaced with MeshStandardMaterial + emissive.
 * No transmission, ior, or thickness on mobile. Reduced to 2 PointLights total on mobile.
 * Arc lines throttled on mobile — only update every 6 frames.
 */
import * as THREE from "three";

export const CRYSTAL_ZONE_X  = -28;
export const CRYSTAL_ZONE_Z  = 9;
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
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#C8E8FF"),
    emissive: new THREE.Color("#5577FF"),
    emissiveIntensity: IS_MOBILE ? 0.7 : 0.5,
    metalness: 0.12,
    roughness: 0.04,
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

function makeSmallMat(color, emissive, opacity = 0.76) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: IS_MOBILE ? 0.65 : 0.55,
    metalness: 0.08,
    roughness: 0.08,
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: true,
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

function makeCrystalPanelTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = "rgba(0,10,24,0.58)";
  ctx.fillRect(24, 28, 464, 104);
  ctx.strokeStyle = "rgba(0,229,255,0.78)";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(0,229,255,0.55)";
  ctx.shadowBlur = 12;
  ctx.strokeRect(24, 28, 464, 104);
  ctx.strokeStyle = "rgba(255,211,110,0.46)";
  for (let i = 0; i < 7; i++) {
    const x = 58 + i * 60;
    ctx.beginPath();
    ctx.moveTo(x, 118);
    ctx.lineTo(x + 22, 118);
    ctx.stroke();
  }
  ctx.font = text.length > 16 ? "900 28px Syne, Inter, sans-serif" : "900 34px Syne, Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(235,255,255,0.94)";
  ctx.fillText(text, 256, 82);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addCrystalUIPanel(group, text, x, y, z, rotY) {
  const mat = new THREE.MeshBasicMaterial({ map: makeCrystalPanelTexture(text), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  mat.userData.baseOpacity = IS_MOBILE ? 0.36 : 0.56;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(text.length > 16 ? 3.4 : 2.8, 0.86), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.renderOrder = 8;
  group.add(mesh);
  return { mesh, mat };
}

// ── Main build ────────────────────────────────────────────────────────
export function createCrystalZone(scene) {
  const group = new THREE.Group();
  group.name = "crystalZone";
  group.position.set(CRYSTAL_ZONE_X, 0, CRYSTAL_ZONE_Z);

  // ── Energy platform — circular base ────────────────────────────────
  const baseMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1A0E44"),
    transparent: false, opacity: 1, depthWrite: true, side: THREE.DoubleSide,
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

  const uiPanels = [
    addCrystalUIPanel(group, "CHARGE ENERGY", 0, 2.6, -4.55, 0),
    addCrystalUIPanel(group, "AURA CALIBRATION", -4.25, 2.0, 0.5, Math.PI / 2),
    addCrystalUIPanel(group, "FIELD STABLE", 4.25, 2.0, 0.5, -Math.PI / 2),
  ];

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

  const holoRingMats = [];
  const holoRings = [];
  [2.1, 4.2, 6.1].slice(0, IS_MOBILE ? 2 : 3).forEach((y, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(i === 1 ? "#A078FF" : "#00E5FF"), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    mat.userData.baseOpacity = IS_MOBILE ? 0.16 : 0.26;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.52 + i * 0.2, 0.018, 6, IS_MOBILE ? 48 : 72), mat);
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2 + i * 0.34;
    ring.rotation.z = i * 0.45;
    ring.renderOrder = 7;
    group.add(ring);
    holoRings.push(ring);
    holoRingMats.push(mat);
  });

  const scanLineMats = [];
  const scanLines = [1.5, 3.2, 5.1].map((y, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(i === 1 ? "#FFD36E" : "#88EEFF"), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    mat.userData.baseOpacity = IS_MOBILE ? 0.18 : 0.3;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.045), mat);
    line.position.set(0, y, 1.28);
    line.renderOrder = 8;
    group.add(line);
    scanLineMats.push(mat);
    return line;
  });

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
    uiPanels, holoRings, holoRingMats, scanLines, scanLineMats,
    proximity: 0,
    activated: false,
    activatedTimer: 0,
    _arcFrame: 0,
  };
}

// ── Animation — decorative landmark only, no interaction ───────────────
export function animateCrystalZone(scene, t, dt, playerX, playerZ, tvSmooth = false) {
  const cz = scene.userData.crystalZone;
  if (!cz) return;

  const dx = playerX - CRYSTAL_ZONE_X;
  const dz = playerZ - CRYSTAL_ZONE_Z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Far away: only rotate, no material writes (cheapest possible update)
  if (dist > 20) {
    cz.center.rotation.y = t * 0.07;
    // Keep light range small when far to reduce shadow/draw cost
    cz.bigLight.distance = 10;
    cz.bigLight.intensity = 1.8;
    cz.uiPanels?.forEach((p) => { p.mat.opacity = 0; });
    cz.holoRingMats?.forEach((m) => { m.opacity = 0; });
    cz.scanLineMats?.forEach((m) => { m.opacity = 0; });
    return;
  }

  // Track frame counter on the zone for throttling
  cz._frame = (cz._frame || 0) + 1;

  // On mobile: update material properties every 3 frames only
  if (IS_MOBILE && cz._frame % 3 !== 0) {
    cz.center.rotation.y = t * 0.07;
    return;
  }

  const idlePulse = Math.sin(t * 1.1) * 0.5 + 0.5;
  const nearStrength = Math.max(0, Math.min(1, 1 - dist / 18));

  cz.uiPanels?.forEach((p, i) => {
    p.mat.opacity = p.mat.userData.baseOpacity * nearStrength * (0.82 + Math.sin(t * 1.0 + i) * 0.08);
  });
  cz.holoRings?.forEach((ring, i) => {
    ring.rotation.y += (IS_MOBILE ? 0.002 : 0.0035) * (i + 1);
    ring.rotation.z += (IS_MOBILE ? 0.001 : 0.002) * (i + 1);
  });
  cz.holoRingMats?.forEach((m, i) => {
    m.opacity = m.userData.baseOpacity * nearStrength * (0.82 + Math.sin(t * 1.2 + i) * 0.1);
  });
  cz.scanLines?.forEach((line, i) => {
    line.position.y = 1.3 + ((t * (0.34 + i * 0.06) + i * 1.7) % 1) * 5.1;
  });
  cz.scanLineMats?.forEach((m, i) => {
    m.opacity = m.userData.baseOpacity * nearStrength * (0.72 + Math.sin(t * 1.8 + i) * 0.12);
  });

  // ── Center crystal — slow rotate + subtle glow pulse ──
  cz.center.rotation.y = t * 0.07;
  cz.cMat.emissiveIntensity = 0.35 + idlePulse * 0.18;
  cz.glowMat.opacity        = 0.06 + idlePulse * 0.05;
  cz.coreMat.opacity        = 0.12 + Math.sin(t * 2.2) * 0.04;

  cz.bigLight.intensity = 2.0 + idlePulse * 0.8;  // reduced from 2.5+1.2
  cz.bigLight.distance  = 14;                       // reduced from 16
  if (cz.bigLight2) cz.bigLight2.intensity = 0.8 + Math.sin(t * 1.7) * 0.25;

  // ── Small crystals — update every other crystal per frame ──
  const frameOdd = cz._frame % 2;
  for (let i = 0; i < cz.smallCrystals.length; i++) {
    if (i % 2 !== frameOdd) continue; // interleave: half per frame
    const sc = cz.smallCrystals[i];
    const sp = Math.sin(t * 0.9 + i * 0.7) * 0.5 + 0.5;
    sc.mat.emissiveIntensity = 0.35 + sp * 0.14;
    sc.glowMat.opacity = 0.04 + sp * 0.04;
    if (sc.light) sc.light.intensity = 0.35 + sp * 0.2;
  }

  // ── Ground rings — write only on slow frames ──
  if (cz._frame % 4 === 0) {
    cz.baseMat.opacity      = 1;
    cz.outerRingMat.opacity = 0.28;
    cz.midRingMat.opacity   = 0.14;
    cz.innerRingMat.opacity = 0.24;
  }
  // Inner ring rotation is cheap (just a rotation, no material write)
  if (!cz._innerRing) cz._innerRing = cz.group.getObjectByName("crystalInnerRing");
  if (cz._innerRing) cz._innerRing.rotation.z = t * 0.10;

  // Arcs, beam, aura — keep hidden
  for (const arc of cz.arcs) { if (arc.mat.opacity !== 0) arc.mat.opacity = 0; }
  if (cz.beamMat && cz.beamMat.opacity !== 0) cz.beamMat.opacity = 0;
  if (cz.auraMat && cz.auraMat.opacity !== 0) cz.auraMat.opacity = 0;
}