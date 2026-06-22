/**
 * DJBooth — futuristic Live DJ Booth positioned to the LEFT side of the Dance Floor.
 * Offset so the Music Stage center-line is fully clear for sightlines.
 * Exports same symbols as the old Jukebox so CityCanvas needs no changes.
 */
import * as THREE from "three";

// Plaza / dance floor center
const PLAZA_X = 0;
const PLAZA_Z = -4;

// DJ Booth sits to the LEFT (west) of the dance floor, beside it — not behind the stage.
// Dance floor center is (0, -4), radius 7. Booth placed at (-12, -4) — 5 units clear of the floor edge.
export const JUKEBOX_POS = { x: -12, z: -4 };
export const JUKEBOX_INTERACT_RADIUS = 6;
export const DANCE_FLOOR_RADIUS = 7;

// Booth faces toward dance floor center (east, toward +X).
// Booth is at x=-12, floor center at x=0 → face angle = +90° (Math.PI/2) around Y axis.
const FACE_ANGLE = Math.PI / 2; // faces +X (toward dance floor center)

// Scale multiplier — 1.0x (compact secondary attraction)
const S = 1.0;

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

function makeTextSprite(lines, opts = {}) {
  const cw = opts.width || 512;
  const ch = opts.height || 128;
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, cw, ch);
  }
  lines.forEach((line, i) => {
    ctx.shadowColor = line.shadow || line.color;
    ctx.shadowBlur = line.blur || 16;
    ctx.font = line.font || `bold ${line.size || 28}px 'Syne','Inter',sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = line.color;
    const y = line.y !== undefined ? line.y : ch / 2;
    ctx.fillText(line.text, cw / 2, y);
    if (line.double) ctx.fillText(line.text, cw / 2, y);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createJukebox(scene) {
  const group = new THREE.Group();
  group.name = "jukebox";

  // ── Platform base — raised platform for the booth ──────────────────
  const platformH = 0.5 * S;
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4 * S, 2.6 * S, platformH, 32),
    mat("#0A0A1E", { roughness: 0.3, metalness: 0.7 })
  );
  platform.position.y = platformH / 2;
  platform.receiveShadow = true;
  group.add(platform);

  // Platform raise — booth sits elevated above dance floor
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(5 * S, 0.3 * S, 2.5 * S),
    mat("#080820", { roughness: 0.25, metalness: 0.8 })
  );
  pedestal.position.set(0, 0.15 * S, 0);
  group.add(pedestal);

  // Platform glow ring
  const platRingMat = basicMat("#00D4F0", 0.3);
  const platRing = new THREE.Mesh(new THREE.RingGeometry(2.0 * S, 2.35 * S, 64), platRingMat);
  platRing.rotation.x = -Math.PI / 2;
  platRing.position.y = platformH + 0.01;
  platRing.renderOrder = 1;
  platRing.name = "djPlatRing";
  group.add(platRing);

  const consoleY = platformH + 0.35 * S;

  // ── Console main body — wide DJ table ─────────────────────────────
  const console_ = new THREE.Mesh(
    new THREE.BoxGeometry(4.2 * S, 0.55 * S, 1.2 * S),
    mat("#12102A", { roughness: 0.2, metalness: 0.75 })
  );
  console_.position.set(0, consoleY, 0);
  console_.castShadow = true;
  group.add(console_);

  // Sloped front face
  const slope = new THREE.Mesh(
    new THREE.BoxGeometry(4.2 * S, 0.06 * S, 1.2 * S),
    mat("#1A1840", { roughness: 0.2, metalness: 0.7 })
  );
  slope.position.set(0, consoleY + 0.28 * S, 0);
  slope.rotation.x = 0.28;
  group.add(slope);

  // Console top glow
  const topGlowMat = basicMat("#00D4F0", 0.18);
  const topGlow = new THREE.Mesh(new THREE.BoxGeometry(4.0 * S, 0.02 * S, 1.1 * S), topGlowMat);
  topGlow.position.set(0, consoleY + 0.28 * S, 0);
  topGlow.name = "djTopGlow";
  group.add(topGlow);

  // ── EQ bars on the front face of the console ──────────────────────
  const eqBarCount = 12;
  const eqBarMats = [];
  const eqBars = [];
  for (let i = 0; i < eqBarCount; i++) {
    const barMat = basicMat(i % 2 === 0 ? "#00E5FF" : "#C43BFF", 0.9);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.1 * S, 0.16 * S, 0.06 * S),
      barMat
    );
    const bx = (-1.8 + i * 0.33) * S;
    bar.position.set(bx, consoleY + 0.3 * S, 0.61 * S);
    bar.name = `djEqBar_${i}`;
    group.add(bar);
    eqBarMats.push(barMat);
    eqBars.push({ mesh: bar, baseX: bx, baseY: consoleY + 0.3 * S, phase: i * 0.55 });
  }
  scene.userData.djEqBars = eqBars;
  scene.userData.djEqBarMats = eqBarMats;

  // ── DJ deck platters on top ────────────────────────────────────────
  for (const px of [-1.0 * S, 1.0 * S]) {
    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 * S, 0.32 * S, 0.05 * S, 32),
      mat("#1A1A3A", { roughness: 0.15, metalness: 0.85 })
    );
    platter.position.set(px, consoleY + 0.3 * S, -0.1 * S);
    group.add(platter);

    const groove = new THREE.Mesh(
      new THREE.RingGeometry(0.18 * S, 0.3 * S, 40),
      basicMat("#00D4F0", 0.35)
    );
    groove.rotation.x = -Math.PI / 2;
    groove.position.set(px, consoleY + 0.33 * S, -0.1 * S);
    groove.renderOrder = 1;
    group.add(groove);

    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * S, 0.05 * S, 0.04 * S, 12),
      basicMat("#FF4FC3", 0.9)
    );
    dot.position.set(px, consoleY + 0.35 * S, -0.1 * S);
    group.add(dot);
  }

  // ── Speaker towers — flanking the console, aimed toward dance floor (+X) ──
  const djTrimMats = [];
  const djBeamMats = [];

  // Booth faces +X (FACE_ANGLE = PI/2). Towers flank on local Z axis (left/right of booth).
  // Speaker cones face +X (forward face of the booth toward dance floor).
  for (const [szRaw, beamAngle] of [[-2.4, 0.18], [2.4, -0.18]]) {
    const sz = szRaw * S;
    const towerH = 2.8 * S;

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.55 * S, towerH, 0.55 * S),
      mat("#0E0E22", { roughness: 0.25, metalness: 0.6 })
    );
    tower.position.set(0, platformH + towerH / 2, sz);
    tower.castShadow = true;
    group.add(tower);

    // Speaker cones face +X (the booth's forward direction after FACE_ANGLE rotation)
    for (const coneY of [platformH + 0.5 * S, platformH + 1.2 * S, platformH + 2.0 * S]) {
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * S, 0.2 * S, 0.1 * S, 20),
        mat("#1A1A40", { roughness: 0.4, metalness: 0.5 })
      );
      // Cone faces +X: rotate around Z by -PI/2
      cone.rotation.z = -Math.PI / 2;
      cone.position.set(0.28 * S, coneY, sz + Math.sin(beamAngle) * 0.12 * S);
      group.add(cone);

      // Speaker ring glow
      const sRingMat = basicMat(szRaw < 0 ? "#C43BFF" : "#00D4F0", 0.25);
      const sRing = new THREE.Mesh(new THREE.RingGeometry(0.1 * S, 0.16 * S, 24), sRingMat);
      sRing.rotation.z = -Math.PI / 2;
      sRing.position.set(0.34 * S, coneY, sz + Math.sin(beamAngle) * 0.12 * S);
      sRing.renderOrder = 1;
      group.add(sRing);
    }

    // Neon side strip (runs along tower height)
    const stripMat = basicMat(szRaw < 0 ? "#C43BFF" : "#00D4F0", 0.8);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05 * S, towerH * 0.9, 0.04 * S), stripMat);
    strip.position.set(0, platformH + towerH / 2, sz + (szRaw < 0 ? -0.3 : 0.3) * S);
    group.add(strip);
    djTrimMats.push(stripMat);

    // Tower top glow cap
    const towerTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.52 * S, 0.06 * S, 0.52 * S),
      basicMat(szRaw < 0 ? "#C43BFF" : "#00D4F0", 0.6)
    );
    towerTop.position.set(0, platformH + towerH, sz);
    group.add(towerTop);

    // Light beam projecting toward dance floor (+X direction, angled slightly inward)
    const beamMat = basicMat(szRaw < 0 ? "#C43BFF" : "#00D4F0", 0.08);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 * S, 0.55 * S, 7 * S, 10, 1, true),
      beamMat
    );
    beam.rotation.z = -Math.PI / 2 + 0.25; // tilt toward floor
    beam.rotation.x = beamAngle;
    beam.position.set(2.2 * S, platformH + towerH * 0.75, sz * 0.4);
    beam.renderOrder = 1;
    group.add(beam);
    djBeamMats.push(beamMat);
  }

  scene.userData.djTrimMats = djTrimMats;
  scene.userData.djBeamMats = djBeamMats;

  // ── Point lights projecting toward dance floor (+X direction) ────────
  const djLightCyan = new THREE.PointLight();
  djLightCyan.color = new THREE.Color("#00D4F0");
  djLightCyan.intensity = 5;
  djLightCyan.distance = 18;
  djLightCyan.position.set(1.5 * S, platformH + 2 * S, 0);
  group.add(djLightCyan);

  const djLightPurple = new THREE.PointLight();
  djLightPurple.color = new THREE.Color("#C43BFF");
  djLightPurple.intensity = 3.5;
  djLightPurple.distance = 16;
  djLightPurple.position.set(2.5 * S, platformH + 3 * S, 0);
  group.add(djLightPurple);

  // ── "LIVE DJ" hologram sign ────────────────────────────────────────
  const liveDJTex = makeTextSprite([
    { text: "▶  LIVE DJ", color: "#00E5FF", size: 38, blur: 22, y: 48, double: true },
    { text: "Upper Vibe Radio", color: "#A078FF", size: 22, blur: 10, y: 96 },
  ], { width: 512, height: 128 });

  const holoMat = new THREE.SpriteMaterial({ map: liveDJTex, transparent: true, depthWrite: false, depthTest: false });
  const holo = new THREE.Sprite(holoMat);
  holo.scale.set(5 * S, 1.5 * S, 1);
  holo.position.set(0.5 * S, platformH + consoleY + 1.2 * S, 0);
  holo.renderOrder = 999;
  holo.name = "djHoloSign";
  group.add(holo);
  scene.userData.djHoloMat = holoMat;

  // ── Floating "Now Playing" display ─────────────────────────────────
  const nowPlayingCanvas = document.createElement("canvas");
  nowPlayingCanvas.width = 512; nowPlayingCanvas.height = 80;
  const npCtx = nowPlayingCanvas.getContext("2d");
  npCtx.fillStyle = "rgba(0,0,0,0.6)";
  npCtx.roundRect(4, 4, 504, 72, 12);
  npCtx.fill();
  npCtx.shadowColor = "#00E5FF";
  npCtx.shadowBlur = 8;
  npCtx.font = "bold 16px 'Inter',sans-serif";
  npCtx.textAlign = "left";
  npCtx.fillStyle = "#00E5FF";
  npCtx.fillText("NOW PLAYING", 20, 28);
  npCtx.shadowColor = "#FFFFFF";
  npCtx.shadowBlur = 4;
  npCtx.font = "bold 20px 'Syne','Inter',sans-serif";
  npCtx.fillStyle = "#FFFFFF";
  npCtx.fillText("Loading stream...", 20, 56);
  const npTex = new THREE.CanvasTexture(nowPlayingCanvas);
  npTex.minFilter = THREE.LinearFilter;
  npTex.colorSpace = THREE.SRGBColorSpace;

  const npMat = new THREE.SpriteMaterial({ map: npTex, transparent: true, depthWrite: false, depthTest: false });
  const npSprite = new THREE.Sprite(npMat);
  npSprite.scale.set(5 * S, 1.0 * S, 1);
  npSprite.position.set(0.5 * S, platformH + consoleY + 2.6 * S, 0);
  npSprite.renderOrder = 998;
  npSprite.name = "djNowPlaying";
  group.add(npSprite);
  scene.userData.djNowPlayingSprite = npSprite;
  scene.userData.djNowPlayingCanvas = nowPlayingCanvas;
  scene.userData.djNowPlayingTex = npTex;
  scene.userData.djNowPlayingMat = npMat;
  scene.userData.djCurrentTrackId = null;

  // ── Music pulse rings radiating toward dance floor ─────────────────
  const pulseRingMats = [];
  for (let r = 0; r < 4; r++) {
    const prMat = basicMat(r % 2 === 0 ? "#00D4F0" : "#C43BFF", 0.08 - r * 0.012);
    const pr = new THREE.Mesh(new THREE.RingGeometry((1.4 + r * 1.4) * S, (1.55 + r * 1.4) * S, 64), prMat);
    pr.rotation.x = -Math.PI / 2;
    pr.position.y = 0.01;
    pr.renderOrder = 1;
    pr.name = `djPulseRing_${r}`;
    group.add(pr);
    pulseRingMats.push({ mat: prMat, base: 0.08 - r * 0.012, phase: r * 1.1 });
  }
  scene.userData.djPulseRingMats = pulseRingMats;

  // ── Rear backdrop arch — behind the booth (local -X side) ─────────
  const archW = 5 * S;
  const archH = 4.0 * S;
  for (let a = 0; a < 10; a++) {
    const archAngle = -Math.PI / 2 + (a / 9) * Math.PI;
    const az = Math.cos(archAngle) * archW * 0.5;
    const ay = platformH + archH * 0.5 + Math.sin(archAngle) * archH * 0.5;
    const archSeg = new THREE.Mesh(
      new THREE.BoxGeometry(0.15 * S, 0.1 * S, 0.1 * S),
      basicMat(a % 2 === 0 ? "#C43BFF" : "#00D4F0", 0.8)
    );
    archSeg.position.set(-0.5 * S, ay, az);
    group.add(archSeg);
  }

  // ── Position: left side of dance floor, facing dance floor center ──
  group.position.set(JUKEBOX_POS.x, 0.5, JUKEBOX_POS.z);
  group.rotation.y = FACE_ANGLE;
  scene.add(group);

  // Store refs for animation
  scene.userData.jukebox = group;
  scene.userData.jukeboxLight = djLightCyan;
  scene.userData.jukeboxScreenMat = topGlowMat;
  scene.userData.jukeboxGlowRingMat = platRingMat;
  scene.userData.jukeboxTrimMats = djTrimMats;
  scene.userData.jukeboxGrilleMats = eqBarMats;
  scene.userData.djLightCyan = djLightCyan;
  scene.userData.djLightPurple = djLightPurple;

  return group;
}

/**
 * animateJukebox — called every frame from CityCanvas render loop.
 * Also handles Now Playing text updates via scene.userData.djNowPlayingTrack
 */
export function animateJukebox(scene, t, beat) {
  // EQ bars bounce with music
  const eqBars = scene.userData.djEqBars;
  if (eqBars) {
    for (const b of eqBars) {
      const h = 0.1 + Math.abs(Math.sin(t * 3.8 + b.phase)) * 0.35 + beat * 0.42;
      b.mesh.scale.y = Math.max(0.5, h / 0.14);
      b.mesh.position.y = b.baseY + (h - 0.14) * 0.5;
    }
  }

  const eqMats = scene.userData.djEqBarMats;
  if (eqMats) {
    for (let i = 0; i < eqMats.length; i++) {
      eqMats[i].opacity = 0.55 + beat * 0.5 + Math.sin(t * 4.2 + i * 0.5) * 0.15;
    }
  }

  // Hologram flicker
  const holoMat = scene.userData.djHoloMat;
  if (holoMat) {
    holoMat.opacity = 0.80 + Math.sin(t * 3.1) * 0.12 + beat * 0.1;
  }

  // Now Playing display — update text when track changes
  const nowPlayingTrack = scene.userData.djNowPlayingTrack;
  const lastId = scene.userData.djCurrentTrackId;
  if (nowPlayingTrack && nowPlayingTrack.id !== lastId) {
    scene.userData.djCurrentTrackId = nowPlayingTrack.id;
    const canvas = scene.userData.djNowPlayingCanvas;
    const tex = scene.userData.djNowPlayingTex;
    if (canvas && tex) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      if (ctx.roundRect) {
        ctx.roundRect(4, 4, 504, 72, 12);
      } else {
        ctx.rect(4, 4, 504, 72);
      }
      ctx.fill();
      // Label
      ctx.shadowColor = "#00E5FF"; ctx.shadowBlur = 8;
      ctx.font = "bold 15px 'Inter',sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#00E5FF";
      ctx.fillText("♪  NOW PLAYING", 20, 26);
      // Title
      ctx.shadowColor = "#FFFFFF"; ctx.shadowBlur = 4;
      ctx.font = "bold 20px 'Syne','Inter',sans-serif";
      ctx.fillStyle = "#FFFFFF";
      const title = nowPlayingTrack.title || "Unknown";
      const artist = nowPlayingTrack.artist_display || "";
      const label = artist ? `${title} — ${artist}` : title;
      // Truncate if too long
      const maxW = 470;
      let displayLabel = label;
      ctx.font = "bold 18px 'Syne','Inter',sans-serif";
      while (ctx.measureText(displayLabel).width > maxW && displayLabel.length > 4) {
        displayLabel = displayLabel.slice(0, -4) + "...";
      }
      ctx.fillText(displayLabel, 20, 56);
      tex.needsUpdate = true;
    }
  }

  // Now Playing mat pulse
  const npMat = scene.userData.djNowPlayingMat;
  if (npMat) {
    npMat.opacity = 0.75 + Math.sin(t * 1.8) * 0.08 + beat * 0.08;
  }

  // Console top glow
  const topGlow = scene.userData.jukeboxScreenMat;
  if (topGlow) {
    topGlow.opacity = 0.1 + beat * 0.42 + Math.sin(t * 2.2) * 0.06;
  }

  // Platform ring
  const platRing = scene.userData.jukeboxGlowRingMat;
  if (platRing) {
    platRing.opacity = 0.14 + beat * 0.6 + Math.sin(t * 1.8) * 0.08;
  }

  // Trim strips color shift
  const trimMats = scene.userData.jukeboxTrimMats;
  if (trimMats) {
    const shift = Math.sin(t * 0.9) * 0.5 + 0.5;
    const cyan = new THREE.Color("#00D4F0");
    const purple = new THREE.Color("#C43BFF");
    for (let i = 0; i < trimMats.length; i++) {
      trimMats[i].color.copy(i % 2 === 0 ? cyan : purple).lerp(i % 2 === 0 ? purple : cyan, shift);
      trimMats[i].opacity = 0.55 + beat * 0.45;
    }
  }

  // Light beams
  const beamMats = scene.userData.djBeamMats;
  if (beamMats) {
    for (let i = 0; i < beamMats.length; i++) {
      beamMats[i].opacity = 0.05 + beat * 0.18 + Math.sin(t * 1.6 + i) * 0.025;
    }
  }

  // Pulse rings
  const prMats = scene.userData.djPulseRingMats;
  if (prMats) {
    for (const pr of prMats) {
      pr.mat.opacity = Math.max(0, pr.base + beat * 0.32 + Math.sin(t * 2.1 + pr.phase) * 0.04);
    }
  }

  // Lights
  const cl = scene.userData.djLightCyan;
  if (cl) cl.intensity = 3.5 + beat * 5 + Math.sin(t * 2.2) * 0.7;

  const pl = scene.userData.djLightPurple;
  if (pl) pl.intensity = 1.8 + beat * 3 + Math.sin(t * 1.7 + 1.2) * 0.5;
}