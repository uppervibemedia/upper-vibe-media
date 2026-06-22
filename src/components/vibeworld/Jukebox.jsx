/**
 * DJBooth (replaces Jukebox) — futuristic Live DJ Booth outside the Dance Floor.
 * Positioned just outside the dance floor edge, facing inward.
 * Exports same symbols as Jukebox so CityCanvas needs no changes.
 */
import * as THREE from "three";

// Plaza center
const PLAZA_X = 0;
const PLAZA_Z = -4;

// DJ Booth sits outside the dance floor edge, facing toward center
export const JUKEBOX_POS = { x: PLAZA_X + 7.8, z: PLAZA_Z + 1.0 };
export const JUKEBOX_INTERACT_RADIUS = 5.5;
export const DANCE_FLOOR_RADIUS = 7;

function mat(hexColor, opts = {}) {
  const m = new THREE.MeshStandardMaterial();
  m.color = new THREE.Color(hexColor);
  m.roughness = opts.roughness ?? 0.45;
  m.metalness = opts.metalness ?? 0.6;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

function basicMat(hex, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), depthWrite: false });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}

export function createJukebox(scene) {
  const group = new THREE.Group();
  group.name = "jukebox";

  const ANGLE = -Math.PI * 0.25; // faces dance floor (slightly inward)

  // ── Platform base ──────────────────────────────────────────────────
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.0, 0.12, 24),
    mat("#0A0A1E", { roughness: 0.3, metalness: 0.7 })
  );
  platform.position.y = 0.06;
  platform.receiveShadow = true;
  group.add(platform);

  // Platform glow ring
  const platRing = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.85, 48),
    basicMat("#00D4F0", 0.28)
  );
  platRing.rotation.x = -Math.PI / 2;
  platRing.position.y = 0.13;
  platRing.renderOrder = 1;
  platRing.name = "djPlatRing";
  group.add(platRing);

  // ── Console main body ──────────────────────────────────────────────
  const console_ = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.55, 0.9),
    mat("#12102A", { roughness: 0.2, metalness: 0.75 })
  );
  console_.position.set(0, 0.4, 0);
  console_.castShadow = true;
  group.add(console_);

  // Console front angled face (sloped toward user)
  const slope = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.06, 0.9),
    mat("#1A1840", { roughness: 0.2, metalness: 0.7 })
  );
  slope.position.set(0, 0.68, 0);
  slope.rotation.x = 0.3;
  group.add(slope);

  // Console top surface glow
  const topGlowMat = basicMat("#00D4F0", 0.18);
  const topGlow = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.8), topGlowMat);
  topGlow.position.set(0, 0.69, 0);
  topGlow.name = "djTopGlow";
  group.add(topGlow);

  // ── EQ bars (facing dance floor) ──────────────────────────────────
  const eqBarCount = 7;
  const eqBarMats = [];
  const eqBars = [];
  for (let i = 0; i < eqBarCount; i++) {
    const barMat = basicMat(i % 2 === 0 ? "#00E5FF" : "#C43BFF", 0.85);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12 + Math.random() * 0.25, 0.06),
      barMat
    );
    const bx = -0.65 + i * 0.2;
    bar.position.set(bx, 0.72, 0.46);
    bar.name = `djEqBar_${i}`;
    group.add(bar);
    eqBarMats.push(barMat);
    eqBars.push({ mesh: bar, baseX: bx, phase: i * 0.7 });
  }
  scene.userData.djEqBars = eqBars;
  scene.userData.djEqBarMats = eqBarMats;

  // ── DJ deck platters (two spinning circles on console) ──
  for (const px of [-0.45, 0.45]) {
    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24),
      mat("#1A1A3A", { roughness: 0.15, metalness: 0.85 })
    );
    platter.position.set(px, 0.72, -0.05);
    group.add(platter);

    // Platter groove ring
    const groove = new THREE.Mesh(
      new THREE.RingGeometry(0.17, 0.28, 32),
      basicMat("#00D4F0", 0.35)
    );
    groove.rotation.x = -Math.PI / 2;
    groove.position.set(px, 0.75, -0.05);
    groove.renderOrder = 1;
    group.add(groove);

    // Center dot
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12),
      basicMat("#FF4FC3", 0.9)
    );
    dot.position.set(px, 0.76, -0.05);
    group.add(dot);
  }

  // ── Speaker towers (left and right) ───────────────────────────────
  for (const sx of [-1.55, 1.55]) {
    // Tower body
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.65, 0.38),
      mat("#0E0E22", { roughness: 0.25, metalness: 0.6 })
    );
    tower.position.set(sx, 0.85, 0);
    tower.castShadow = true;
    group.add(tower);

    // Speaker cone (front face)
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.08, 16),
      mat("#1A1A40", { roughness: 0.4, metalness: 0.5 })
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(sx, 0.85, 0.2);
    group.add(cone);

    // Tweeter (top cone)
    const tweeter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.06, 12),
      mat("#111130", { roughness: 0.4, metalness: 0.5 })
    );
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(sx, 1.28, 0.2);
    group.add(tweeter);

    // Neon side strip
    const stripMat = basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.75);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.4, 0.04), stripMat);
    strip.position.set(sx + (sx < 0 ? 0.22 : -0.22), 0.85, 0);
    group.add(strip);
    if (!scene.userData.djTrimMats) scene.userData.djTrimMats = [];
    scene.userData.djTrimMats.push(stripMat);

    // Speaker tower top glow
    const towerTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.04, 0.35),
      basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.55)
    );
    towerTop.position.set(sx, 1.69, 0);
    group.add(towerTop);

    // Light beam toward dance floor
    const beamMat = basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.08);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.35, 5.5, 8, 1, true), beamMat);
    beam.rotation.z = sx < 0 ? 0.35 : -0.35;
    beam.rotation.x = -0.2;
    beam.position.set(sx < 0 ? sx + 1.5 : sx - 1.5, 1.8, -1.2);
    beam.renderOrder = 1;
    group.add(beam);
    if (!scene.userData.djBeamMats) scene.userData.djBeamMats = [];
    scene.userData.djBeamMats.push(beamMat);
  }

  // ── Point lights ───────────────────────────────────────────────────
  const djLightCyan = new THREE.PointLight();
  djLightCyan.color = new THREE.Color("#00D4F0");
  djLightCyan.intensity = 3.5;
  djLightCyan.distance = 10;
  djLightCyan.position.set(0, 1.5, 0);
  group.add(djLightCyan);

  const djLightPurple = new THREE.PointLight();
  djLightPurple.color = new THREE.Color("#C43BFF");
  djLightPurple.intensity = 2.0;
  djLightPurple.distance = 8;
  djLightPurple.position.set(-1.6, 1.8, 0);
  group.add(djLightPurple);

  // ── Hologram "LIVE DJ" sign (sprite above console) ────────────────
  const holoCanvas = document.createElement("canvas");
  holoCanvas.width = 256; holoCanvas.height = 64;
  const hCtx = holoCanvas.getContext("2d");
  hCtx.shadowColor = "#00E5FF";
  hCtx.shadowBlur = 18;
  hCtx.font = "bold 24px 'Syne','Inter',sans-serif";
  hCtx.textAlign = "center";
  hCtx.textBaseline = "middle";
  hCtx.fillStyle = "#00E5FF";
  hCtx.fillText("▶ LIVE DJ", 128, 32);
  hCtx.fillText("▶ LIVE DJ", 128, 32);
  const holoTex = new THREE.CanvasTexture(holoCanvas);
  holoTex.minFilter = THREE.LinearFilter;
  holoTex.colorSpace = THREE.SRGBColorSpace;
  const holoMat = new THREE.SpriteMaterial({ map: holoTex, transparent: true, depthWrite: false, depthTest: false });
  const holo = new THREE.Sprite(holoMat);
  holo.scale.set(2.2, 0.55, 1);
  holo.position.set(0, 1.9, 0);
  holo.renderOrder = 999;
  holo.name = "djHoloSign";
  group.add(holo);
  scene.userData.djHoloMat = holoMat;

  // ── Floating label sprite (visible from further away) ──────────────
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256; labelCanvas.height = 52;
  const lCtx = labelCanvas.getContext("2d");
  lCtx.shadowColor = "#C43BFF";
  lCtx.shadowBlur = 12;
  lCtx.font = "bold 20px 'Syne','Inter',sans-serif";
  lCtx.textAlign = "center";
  lCtx.textBaseline = "middle";
  lCtx.fillStyle = "#C43BFF";
  lCtx.fillText("🎧 DJ BOOTH", 128, 26);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.minFilter = THREE.LinearFilter;
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, depthTest: false })
  );
  labelSprite.scale.set(2.4, 0.6, 1);
  labelSprite.position.set(JUKEBOX_POS.x, 3.2, JUKEBOX_POS.z);
  labelSprite.renderOrder = 999;
  labelSprite.name = "jukeboxLabel";
  scene.add(labelSprite);

  // ── Music pulse rings on the ground toward dance floor ─────────────
  const pulseRingMats = [];
  for (let r = 0; r < 3; r++) {
    const pr = new THREE.Mesh(
      new THREE.RingGeometry(1.0 + r * 1.1, 1.1 + r * 1.1, 48),
      basicMat(r % 2 === 0 ? "#00D4F0" : "#C43BFF", 0.08 - r * 0.02)
    );
    pr.rotation.x = -Math.PI / 2;
    pr.position.y = 0.01;
    pr.renderOrder = 1;
    pr.name = `djPulseRing_${r}`;
    group.add(pr);
    pulseRingMats.push({ mat: pr.material, base: 0.08 - r * 0.02, phase: r * 1.1 });
  }
  scene.userData.djPulseRingMats = pulseRingMats;

  // ── Position + face dance floor ────────────────────────────────────
  group.position.set(JUKEBOX_POS.x, 0, JUKEBOX_POS.z);
  group.rotation.y = ANGLE;
  scene.add(group);

  // Store all refs for animation
  scene.userData.jukebox = group;
  scene.userData.jukeboxLight = djLightCyan;
  scene.userData.jukeboxScreenMat = topGlowMat;
  scene.userData.jukeboxGlowRingMat = platRing.material;
  scene.userData.jukeboxTrimMats = scene.userData.djTrimMats || [];
  scene.userData.jukeboxGrilleMats = eqBarMats;
  scene.userData.djLightCyan = djLightCyan;
  scene.userData.djLightPurple = djLightPurple;

  return group;
}

/**
 * animateJukebox — same export name so CityCanvas needs no changes.
 */
export function animateJukebox(scene, t, beat) {
  // EQ bars — bounce with music
  const eqBars = scene.userData.djEqBars;
  if (eqBars) {
    for (const b of eqBars) {
      const h = 0.1 + Math.abs(Math.sin(t * 3.5 + b.phase)) * 0.28 + beat * 0.35;
      b.mesh.scale.y = h / 0.12;
      b.mesh.position.y = 0.72 + (h - 0.12) * 0.5;
    }
  }
  const eqMats = scene.userData.djEqBarMats;
  if (eqMats) {
    for (let i = 0; i < eqMats.length; i++) {
      eqMats[i].opacity = 0.55 + beat * 0.45 + Math.sin(t * 4 + i * 0.6) * 0.15;
    }
  }

  // Hologram flicker
  const holoMat = scene.userData.djHoloMat;
  if (holoMat) {
    holoMat.opacity = 0.75 + Math.sin(t * 2.8) * 0.15 + beat * 0.15;
  }

  // Console top glow
  const topGlow = scene.userData.jukeboxScreenMat;
  if (topGlow) {
    topGlow.opacity = 0.1 + beat * 0.35 + Math.sin(t * 2.2) * 0.06;
  }

  // Platform ring
  const platRing = scene.userData.jukeboxGlowRingMat;
  if (platRing) {
    platRing.opacity = 0.15 + beat * 0.5 + Math.sin(t * 1.8) * 0.08;
  }

  // Trim strips — color shift cyan ↔ purple
  const trimMats = scene.userData.jukeboxTrimMats;
  if (trimMats) {
    const shift = Math.sin(t * 0.9) * 0.5 + 0.5;
    const cyan = new THREE.Color("#00D4F0");
    const purple = new THREE.Color("#C43BFF");
    for (let i = 0; i < trimMats.length; i++) {
      trimMats[i].color.copy(i % 2 === 0 ? cyan : purple).lerp(i % 2 === 0 ? purple : cyan, shift);
      trimMats[i].opacity = 0.55 + beat * 0.4;
    }
  }

  // Light beams
  const beamMats = scene.userData.djBeamMats;
  if (beamMats) {
    for (let i = 0; i < beamMats.length; i++) {
      beamMats[i].opacity = 0.04 + beat * 0.12 + Math.sin(t * 1.5 + i) * 0.02;
    }
  }

  // Pulse rings ripple outward
  const prMats = scene.userData.djPulseRingMats;
  if (prMats) {
    for (const pr of prMats) {
      pr.mat.opacity = pr.base + beat * 0.25 + Math.sin(t * 2.0 + pr.phase) * 0.04;
    }
  }

  // Cyan light intensity
  const cl = scene.userData.djLightCyan;
  if (cl) cl.intensity = 2.5 + beat * 3.5 + Math.sin(t * 2.2) * 0.5;

  // Purple light
  const pl = scene.userData.djLightPurple;
  if (pl) pl.intensity = 1.2 + beat * 2.0 + Math.sin(t * 1.7 + 1.2) * 0.4;
}