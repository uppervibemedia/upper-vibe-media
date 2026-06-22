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
  const danceFloorTiles = [];
  const floorTileMats = [];
  const ringMats = [];
  const sweepMats = [];

  // ── Animated light tiles — grid of squares across the plaza ──
  const TILE_SIZE = 0.7;
  const TILE_GAP = 0.25;
  const TILE_RADIUS = PLAZA_R - 1.5;
  const tileColors = ["#00D4F0", "#C43BFF", "#E040FB", "#00E5FF", "#A078FF", "#EDB84A", "#FF6EC7", "#4DF0FF"];

  for (let row = -7; row <= 7; row++) {
    for (let col = -7; col <= 7; col++) {
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
    { inner: 1.9, outer: 2.05, color: "#E040FB", opacity: 0.72, name: "danceInnerRing" },
    { inner: 2.8, outer: 2.95, color: "#EDB84A", opacity: 0.55, name: "danceGoldRing" },
    { inner: 3.6, outer: 3.75, color: "#00D4F0", opacity: 0.60, name: "danceCyanRing" },
    { inner: 4.5, outer: 4.7,  color: "#9B7EFF", opacity: 0.55, name: "danceOuterRing" },
    { inner: 5.5, outer: 5.7,  color: "#FF6EC7", opacity: 0.45, name: "dancePinkRing" },
  ];

  for (const rd of ringDefs) {
    const ring = new Mesh(
      new RingGeometry(rd.inner, rd.outer, 64),
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
  for (let i = 0; i < 6; i++) {
    const sweepGeo = new RingGeometry(PLAZA_R * 0.3 + i * 0.9, PLAZA_R * 0.3 + i * 0.9 + 0.12, 64);
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
  const dotCount = 36;
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

// Beat detector — tracks rising edge of audioBeat for sharp snap effects
let _prevBeat = 0;
let _beatSnap = 0;         // sharp 0→1 impulse on detected beat
let _beatSnapDecay = 0;    // decayed snap (used for tile flash)
let _rippleT = 0;          // timestamp of last beat-triggered ripple
let _djWasPlaying = false; // tracks DJ audio state for entry flash

/**
 * animateDanceFloor — music-reactive floor with wave patterns,
 * light sweeps, rhythmic tile flashes, and ring pulses.
 * When djIsPlaying=true, adds sharp beat-sync tile pulses + ripple waves.
 */
export function animateDanceFloor(scene, t, audioBeat, audioIntensity, djIsPlaying = false) {
  const rings = scene.userData._danceRings;
  const sweeps = scene.userData._danceSweeps;
  const dots = scene.userData._danceDots;
  const tileData = scene.userData._danceFloorTileData;

  // ── Beat snap detection (sharp leading-edge pulse) ────────────────
  const beatRise = audioBeat - _prevBeat;
  if (beatRise > 0.12 && audioBeat > 0.22) {
    _beatSnap = 1.0;
    _rippleT = t;
  }
  _beatSnapDecay = _beatSnap * 0.82; // fast decay each call (~60fps = ~5 frames to half)
  _beatSnap = _beatSnapDecay;
  _prevBeat = audioBeat;

  const djActive = djIsPlaying && audioIntensity > 0.03;
  const hasMusic = audioIntensity > 0.05;

  // Base pulse — DJ mode uses sharper, higher-contrast values
  const beatPulse = djActive
    ? 0.5 + audioBeat * 1.1 + audioIntensity * 0.45 + _beatSnap * 0.55
    : hasMusic
    ? 0.6 + audioBeat * 0.6 + audioIntensity * 0.3
    : 0.5 + Math.sin(t * 0.8) * 0.12 + Math.sin(t * 1.3) * 0.08;

  // ── Pulse rings — sharper beat snap in DJ mode ────────────────────
  if (rings) {
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      if (r.mat?.opacity === undefined) continue;
      const wave = Math.sin(t * 1.2 + i * 0.7) * 0.5 + 0.5;
      let opacity = r.baseOpacity * (0.7 + beatPulse * 0.5 + wave * 0.15);
      if (djActive) {
        // Hard flash on beat snap — rings strobe outward in sequence
        const ringDelay = i * 0.06; // stagger outward ring by ring
        const snapAmt = Math.max(0, _beatSnap - ringDelay);
        opacity = Math.min(1.0, opacity + snapAmt * 0.85);
        // Color flash: cycle rings between cyan and pink on beat
        const snap01 = Math.min(1, snapAmt * 3);
        const baseCyan = new Color(r.color || "#00D4F0");
        const flashWhite = new Color("#FFFFFF");
        r.mat.color.copy(baseCyan).lerp(flashWhite, snap01 * 0.45);
      }
      r.mat.opacity = Math.min(1.0, opacity);
    }
  }

  // ── Light sweeps — faster + brighter in DJ mode ───────────────────
  if (sweeps) {
    for (const s of sweeps) {
      if (s.mat?.opacity === undefined) continue;
      const sw = s.sweep;
      const speed = djActive ? sw.userData.sweepSpeed * 2.2 : sw.userData.sweepSpeed;
      sw.rotation.z += 0.003 * speed;
      const sweepWave = Math.sin(t * sw.userData.sweepSpeed + s.phase) * 0.5 + 0.5;
      let opacity = sweepWave * sw.userData.baseOpacity * beatPulse;
      if (djActive) opacity = Math.min(0.85, opacity + _beatSnap * 0.35);
      s.mat.opacity = opacity;
    }
  }

  // ── Edge dots — chase pattern in DJ mode ─────────────────────────
  if (dots) {
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.mat?.opacity === undefined) continue;
      const wave = Math.sin(t * 2.5 + d.dot.userData.phase) * 0.5 + 0.5;
      let opacity = d.dot.userData.baseOpacity * (0.5 + beatPulse * 0.5 + wave * 0.25);
      if (djActive) {
        // Chase effect: lights travel around the perimeter in sync with beat
        const chaseAngle = (t * 2.5) % (Math.PI * 2);
        const dotAngle = (i / dots.length) * Math.PI * 2;
        const angleDiff = Math.abs(((dotAngle - chaseAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const chaseGlow = Math.max(0, 1 - angleDiff / 0.8);
        opacity = Math.min(1.0, opacity + chaseGlow * 0.7 + _beatSnap * 0.5);
      }
      d.mat.opacity = opacity;
    }
  }

  // ── Tile grid — beat-ripple wave from center in DJ mode ──────────
  if (tileData) {
    const PLAZA_X = 0, PLAZA_Z = -4;
    const timeSinceRipple = t - _rippleT;

    for (const td of tileData) {
      if (!td.mat?.color) continue;
      const tile = td.tile;
      const p = tile.userData;

      if (djActive) {
        // Distance from floor center — used for ripple timing
        const dx = p.baseX - PLAZA_X;
        const dz = p.baseZ - PLAZA_Z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Outward ripple: wave front travels at ~3 units/sec from center on beat
        const RIPPLE_SPEED = 3.0;
        const rippleFront = timeSinceRipple * RIPPLE_SPEED;
        const rippleWidth = 1.8;
        const rippleDiff = Math.abs(dist - rippleFront);
        const rippleGlow = rippleDiff < rippleWidth
          ? Math.max(0, 1 - rippleDiff / rippleWidth) * Math.max(0, 1 - timeSinceRipple * 1.2)
          : 0;

        // Per-tile wave (ambient shimmer between beats)
        const tileWave = Math.sin(t * 2.0 + p.phase + dist * 0.8) * 0.5 + 0.5;
        const beatBoost = audioBeat * 1.2 + audioIntensity * 0.5;
        const intensity = Math.max(0, tileWave * 0.4 + beatBoost * 0.5 + rippleGlow * 0.9);

        // Color: flash toward white on ripple, then back to base
        const baseColor = new Color(p.baseColor);
        const rippleColor = new Color("#FFFFFF");
        const beatColor = new Color(p.baseColor).multiplyScalar(3.5 + audioBeat * 3.0);
        td.mat.color.copy(baseColor).lerp(beatColor, Math.min(1, intensity * 0.6));
        if (rippleGlow > 0.15) {
          td.mat.color.lerp(rippleColor, rippleGlow * 0.55);
        }
        td.mat.opacity = Math.min(0.95, 0.22 + intensity * 0.75);

        // Slight Z-lift on beat snap (tiles "pop" upward briefly)
        const lift = _beatSnap * 0.04 * (1 - dist / 8);
        tile.position.y = 0.007 + Math.max(0, lift);

      } else {
        // Normal mode — ambient shimmer
        const tileWave = Math.sin(t * 1.5 + p.phase + audioBeat * 3) * 0.5 + 0.5;
        const intensity = Math.max(0, tileWave * beatPulse * 0.7);
        const baseColor = new Color(p.baseColor);
        const brightColor = new Color(p.baseColor).multiplyScalar(2.5 + audioBeat * 2.5);
        td.mat.color.copy(baseColor).lerp(brightColor, intensity);
        td.mat.opacity = 0.28 + intensity * 0.65;
        tile.position.y = 0.007;
      }
    }
  }
}