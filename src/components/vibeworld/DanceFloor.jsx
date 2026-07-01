import * as THREE from "three";

const {
  PlaneGeometry,
  RingGeometry,
  BoxGeometry,
  Color,
  MeshBasicMaterial,
  Mesh,
  CanvasTexture,
  LinearFilter,
  SpriteMaterial,
  Sprite,
} = THREE;

/**
 * addDanceFloor — creates an animated, music-reactive light grid
 * with concentric pulse rings, light sweeps, and a "DANCE FLOOR" label.
 * Stores materials in scene.userData.danceFloorMats for animation.
 */
export function addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const danceFloorTiles = [];
  const floorTileMats = [];
  const ringMats = [];
  const sweepMats = [];

  // ── Animated light tiles — grid of squares across the plaza ──
  // Mobile uses fewer, larger visual tiles so the dance floor stays lively without making controls feel heavy.
  const TILE_SIZE = isMobile ? 1.05 : 0.85;
  const TILE_GAP = isMobile ? 0.58 : 0.38;
  const TILE_RADIUS = PLAZA_R - 1.35;
  const tileColors = ["#00D4F0", "#C43BFF", "#E040FB", "#00E5FF", "#A078FF", "#EDB84A", "#FF6EC7", "#4DF0FF"];

  const tileSpan = isMobile ? 3 : 4;
  for (let row = -tileSpan; row <= tileSpan; row++) {
    for (let col = -tileSpan; col <= tileSpan; col++) {
      const tx = row * (TILE_SIZE + TILE_GAP);
      const tz = PLAZA_Z + col * (TILE_SIZE + TILE_GAP);
      const dist = Math.sqrt(tx * tx + (tz - PLAZA_Z) * (tz - PLAZA_Z));
      if (dist > TILE_RADIUS) continue;

      const colorIdx = (row + col + 12) % tileColors.length;
      const tileGeo = new PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const tileMat = new MeshBasicMaterial({
        color: new Color(tileColors[colorIdx]),
        depthWrite: false,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      });

      const tile = new Mesh(tileGeo, tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(tx, 0.007, tz);
      tile.userData = {
        isDanceTile: true,
        baseX: tx,
        baseZ: tz,
        phase: Math.random() * Math.PI * 2,
        colorIdx,
        baseColor: tileColors[colorIdx],
      };
      scene.add(tile);
      danceFloorTiles.push(tile);
      floorTileMats.push({ mat: tileMat, tile });
    }
  }

  // ── Concentric pulse rings — brighter, more visible ──────────
  const ringDefs = [
    { inner: 1.6, outer: 1.75, color: "#E040FB", opacity: 0.58, name: "danceInnerRing" },
    { inner: 2.7, outer: 2.86, color: "#EDB84A", opacity: 0.42, name: "danceGoldRing" },
    { inner: 3.8, outer: 3.98, color: "#00D4F0", opacity: 0.46, name: "danceCyanRing" },
  ];

  for (const rd of ringDefs) {
    const ring = new Mesh(
      new RingGeometry(rd.inner, rd.outer, isMobile ? 36 : 64),
      new MeshBasicMaterial({
        color: new Color(rd.color),
        depthWrite: false,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: rd.opacity,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(PLAZA_X, 0.008, PLAZA_Z);
    ring.renderOrder = 2;
    ring.name = rd.name;
    scene.add(ring);
    ringMats.push({ mat: ring.material, baseOpacity: rd.opacity, color: rd.color });
  }

  // ── Light sweep beams — thin glowing strips that arc across the floor ──
  const sweepCount = isMobile ? 1 : 2;
  for (let i = 0; i < sweepCount; i++) {
    const sweepGeo = new RingGeometry(PLAZA_R * 0.3 + i * 0.9, PLAZA_R * 0.3 + i * 0.9 + 0.12, isMobile ? 32 : 64);
    const sweepMat = new MeshBasicMaterial({
      color: new Color(["#00E5FF", "#C43BFF", "#EDB84A", "#FF6EC7", "#A078FF", "#00D4F0"][i]),
      depthWrite: false,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    });
    const sweep = new Mesh(sweepGeo, sweepMat);
    sweep.rotation.x = -Math.PI / 2;
    sweep.position.set(PLAZA_X, 0.009, PLAZA_Z);
    sweep.renderOrder = 3;
    sweep.name = `danceSweep${i}`;
    sweep.userData = { phase: i * 1.1, baseOpacity: 0.25 + i * 0.02, sweepSpeed: 0.6 + i * 0.2 };
    scene.add(sweep);
    sweepMats.push({ mat: sweepMat, sweep, phase: i * 1.1 });
  }

  // ── Edge glow dots — perimeter of floor ───────────────────
  const dotCount = isMobile ? 10 : 16;
  const dotMats = [];
  for (let i = 0; i < dotCount; i++) {
    const angle = (i / dotCount) * Math.PI * 2;
    const dx = Math.cos(angle) * TILE_RADIUS;
    const dz = Math.sin(angle) * TILE_RADIUS;
    const dotGeo = new BoxGeometry(0.08, 0.02, 0.12);
    const dotMat = new MeshBasicMaterial({
      color: new Color(tileColors[i % tileColors.length]),
      depthWrite: false,
      transparent: true,
      opacity: 0.50,
    });
    const dot = new Mesh(dotGeo, dotMat);
    dot.position.set(PLAZA_X + dx, 0.006, PLAZA_Z + dz);
    dot.userData = { phase: i * 0.3, baseOpacity: 0.50 };
    scene.add(dot);
    dotMats.push({ mat: dotMat, dot });
  }

  // ── "DANCE FLOOR" glowing label ────────────────────────────
  const dfCanvas = document.createElement("canvas");
  dfCanvas.width = 256;
  dfCanvas.height = 48;
  const dfCtx = dfCanvas.getContext("2d");
  dfCtx.font = "bold 14px 'Syne','Inter',sans-serif";
  dfCtx.textAlign = "center";
  dfCtx.textBaseline = "middle";
  dfCtx.shadowColor = "#C43BFF";
  dfCtx.shadowBlur = 8;
  dfCtx.fillStyle = "rgba(255,255,255,0.5)";
  dfCtx.fillText("DANCE FLOOR", 128, 24);
  const dfTex = new CanvasTexture(dfCanvas);
  dfTex.minFilter = LinearFilter;
  dfTex.colorSpace = THREE.SRGBColorSpace;
  const dfSprite = new Sprite(new SpriteMaterial({
    map: dfTex, transparent: true, depthWrite: false, depthTest: false,
  }));
  dfSprite.scale.set(6, 1.2, 1);
  dfSprite.position.set(PLAZA_X, 0.01, PLAZA_Z + 5);
  dfSprite.renderOrder = 999;
  dfSprite.name = "danceFloorLabel";
  scene.add(dfSprite);

  // ── Store for animation loop ──────────────────────────────
  scene.userData.danceFloorMats = [
    ...ringMats.map(r => r.mat),
    ...floorTileMats.map(t => t.mat),
    ...sweepMats.map(s => s.mat),
    ...dotMats.map(d => d.mat),
  ];
  scene.userData._danceFloorTiles = danceFloorTiles;
  scene.userData._danceRings = ringMats;
  scene.userData._danceSweeps = sweepMats;
  scene.userData._danceDots = dotMats;
  scene.userData._danceFloorTileData = floorTileMats;
}

/**
 * animateDanceFloor — music-reactive floor with wave patterns,
 * light sweeps, rhythmic tile flashes, and ring pulses.
 */
export function animateDanceFloor(scene, t, audioBeat, audioIntensity, quality = "full") {
  const rings = scene.userData._danceRings;
  const sweeps = scene.userData._danceSweeps;
  const dots = scene.userData._danceDots;
  const tileData = scene.userData._danceFloorTileData;
  const lowQuality = quality === "low";
  const mediumQuality = quality === "medium";

  const hasMusic = audioIntensity > 0.05;
  const beatPulse = hasMusic
    ? 0.6 + audioBeat * 0.6 + audioIntensity * 0.3
    : 0.5 + Math.sin(t * 0.8) * 0.12 + Math.sin(t * 1.3) * 0.08;

  // ── Pulse rings — each with its own phase ────────────────
  if (rings) {
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      if (r.mat?.opacity === undefined) continue;
      const wave = Math.sin(t * 1.2 + i * 0.7) * 0.5 + 0.5;
      r.mat.opacity = r.baseOpacity * (0.7 + beatPulse * 0.5 + wave * 0.15);
    }
  }

  // ── Light sweeps — rotating arcs with fade ───────────────
  if (sweeps) {
    for (const s of sweeps) {
      if (!s.mat?.opacity !== undefined) continue;
      const sw = s.sweep;
      // Rotate sweep position
      sw.rotation.z += 0.003 * s.sweep.userData.sweepSpeed;
      // Pulse opacity with beat
      const sweepWave = Math.sin(t * s.sweep.userData.sweepSpeed + s.phase) * 0.5 + 0.5;
      s.mat.opacity = sweepWave * s.sweep.userData.baseOpacity * beatPulse * (lowQuality ? 0.45 : 1);
    }
  }

  // ── Edge dots — sequential glowing ─────────────────────
  if (dots && !lowQuality) {
    for (const d of dots) {
      if (!d.mat?.opacity !== undefined) continue;
      const wave = Math.sin(t * 2.5 + d.dot.userData.phase) * 0.5 + 0.5;
      d.mat.opacity = d.dot.userData.baseOpacity * (0.5 + beatPulse * 0.5 + wave * 0.25);
    }
  }

  // ── Tile grid — music-reactive wave patterns ────────────
  // Flash individual tiles in wave-like patterns based on beat
  if (tileData) {
    for (let i = 0; i < tileData.length; i++) {
      if ((lowQuality && i % 3 !== 0) || (mediumQuality && i % 2 !== 0)) continue;
      const td = tileData[i];
      if (!td.mat?.color) continue;
      const tile = td.tile;
      const p = tile.userData;

      // Each tile pulses to its own phase + the global beat
      const tileWave = Math.sin(t * 1.5 + p.phase + audioBeat * 3) * 0.5 + 0.5;
      const intensity = Math.max(0, tileWave * beatPulse * 0.7);

      // Brighten the tile based on music — 50% brighter base
      const baseColor = new Color(p.baseColor);
      const brightColor = new Color(p.baseColor).multiplyScalar((lowQuality ? 1.8 : 2.5) + audioBeat * (lowQuality ? 1.2 : 2.5));
      td.mat.color.copy(baseColor).lerp(brightColor, intensity);
      td.mat.opacity = 0.28 + intensity * 0.65;
    }
  }

  // ── Also pulse the central UVC ring materials ────────────
  const uvcMats = scene.userData.danceFloorMats;
  if (uvcMats) {
    for (let i = 0; i < Math.min(5, uvcMats.length); i++) {
      const m = uvcMats[i];
      if (m?.opacity !== undefined) {
        // Keep these in range for the ring materials which are first in the array
      }
    }
  }
}