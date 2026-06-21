import * as THREE from "three";

const {
  PlaneGeometry,
  RingGeometry,
  Color,
  MeshBasicMaterial,
  Mesh,
  CanvasTexture,
  LinearFilter,
  SpriteMaterial,
  Sprite,
} = THREE;

/**
 * addDanceFloor — enhances Central Plaza with animated light tiles,
 * pulse rings, and a "DANCE FLOOR" label. Stores materials in
 * scene.userData.danceFloorMats for audio-reactive pulsing.
 */

export function addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R) {
  const danceFloorTiles = [];
  const floorTileMats = [];

  // ── Animated light tiles — grid of small squares across the plaza ──
  const TILE_SIZE = 0.7;
  const TILE_GAP = 0.25;
  const TILE_RADIUS = PLAZA_R - 1.5;
  const tileColors = ["#00D4F0", "#C43BFF", "#E040FB", "#00E5FF", "#A078FF", "#EDB84A"];

  for (let row = -6; row <= 6; row++) {
    for (let col = -6; col <= 6; col++) {
      const tx = row * (TILE_SIZE + TILE_GAP);
      const tz = PLAZA_Z + col * (TILE_SIZE + TILE_GAP);
      const dist = Math.sqrt(tx * tx + (tz - PLAZA_Z) * (tz - PLAZA_Z));
      if (dist > TILE_RADIUS) continue;

      const tileGeo = new PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const tileMat = new MeshBasicMaterial({
        color: new Color(tileColors[(row + col + 10) % tileColors.length]),
        depthWrite: false,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      const tile = new Mesh(tileGeo, tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(tx, 0.007, tz);
      tile.userData = {
        isDanceTile: true,
        baseX: tx, baseZ: tz,
        phase: Math.random() * Math.PI * 2,
        colorIdx: (row + col + 10) % tileColors.length,
      };
      scene.add(tile);
      danceFloorTiles.push(tile);
      floorTileMats.push(tileMat);
    }
  }

  // ── Concentric pulse rings ────────────────────────────────────────
  const ringDefs = [
    { inner: 1.9, outer: 2.05, color: "#E040FB", opacity: 0.45, name: "danceInnerRing" },
    { inner: 2.8, outer: 2.95, color: "#EDB84A", opacity: 0.3,  name: "danceGoldRing" },
    { inner: 3.6, outer: 3.75, color: "#00D4F0", opacity: 0.35, name: "danceCyanRing" },
    { inner: 4.5, outer: 4.7,  color: "#9B7EFF", opacity: 0.3,  name: "danceOuterRing" },
  ];

  const danceRingMats = [];

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
    danceRingMats.push(ring.material);
  }

  // ── "DANCE FLOOR" subtle label ───────────────────────────────────
  const dfCanvas = document.createElement("canvas");
  dfCanvas.width = 128;
  dfCanvas.height = 32;
  const dfCtx = dfCanvas.getContext("2d");
  dfCtx.font = "600 10px 'Syne','Inter',sans-serif";
  dfCtx.textAlign = "center";
  dfCtx.textBaseline = "middle";
  dfCtx.fillStyle = "rgba(255,255,255,0.3)";
  dfCtx.fillText("DANCE FLOOR", 64, 16);
  const dfTex = new CanvasTexture(dfCanvas);
  dfTex.minFilter = LinearFilter;
  dfTex.colorSpace = THREE.SRGBColorSpace;
  const dfSprite = new Sprite(new SpriteMaterial({
    map: dfTex, transparent: true, depthWrite: false, depthTest: false,
  }));
  dfSprite.scale.set(4, 1, 1);
  dfSprite.position.set(PLAZA_X, 0.01, PLAZA_Z + 4.5);
  dfSprite.renderOrder = 999;
  dfSprite.name = "danceFloorLabel";
  scene.add(dfSprite);

  // ── Store for animation loop ─────────────────────────────────────
  scene.userData.danceFloorMats = [...danceRingMats, ...floorTileMats];
  scene.userData._danceFloorTiles = danceFloorTiles;
}

/**
 * animateDanceFloor — called from the CityCanvas animation loop.
 * Pulses dance floor rings and tiles in sync with music.
 */
export function animateDanceFloor(scene, t, audioBeat, audioIntensity) {
  const mats = scene.userData.danceFloorMats;
  if (!mats) return;

  const hasMusic = audioIntensity > 0.05;
  // Smooth beat pulse: music-driven when playing, gentle idle sine when silent
  const beatPulse = hasMusic
    ? 0.6 + audioBeat * 0.5
    : 0.55 + Math.sin(t * 0.8) * 0.12 + Math.sin(t * 1.3) * 0.08;

  // Pulse ring materials
  for (let i = 0; i < mats.length; i++) {
    const mat = mats[i];
    if (!mat?.opacity !== undefined) continue;
    // Rings (first 4) pulse more noticeably than tiles
    const isRing = i < 4;
    const baseOp = isRing ? 0.25 + (i % 2) * 0.1 : 0.14;
    const scale = isRing ? 0.18 : 0.10;
    mat.opacity = baseOp + beatPulse * scale;
  }

  // Color-shift tile glow between cyan and purple based on beat
  const tiles = scene.userData._danceFloorTiles;
  if (tiles) {
    const cyan = new Color("#00D4F0");
    const purple = new Color("#C43BFF");
    const gold = new Color("#EDB84A");

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const mat = tile?.material;
      if (!mat?.color) continue;

      const p = tile.userData;
      const wave = Math.sin(t * 1.2 + p.phase) * 0.5 + 0.5;

      // Shift between tile's base color and the beat-driven accent
      const baseColor = new Color(mat.color.getHex());
      if (p.colorIdx % 3 === 0) {
        mat.color.copy(baseColor).lerp(cyan, wave * (audioIntensity || 0.15));
      } else if (p.colorIdx % 3 === 1) {
        mat.color.copy(baseColor).lerp(purple, wave * (audioIntensity || 0.15));
      } else {
        mat.color.copy(baseColor).lerp(gold, wave * (audioIntensity || 0.12));
      }
    }
  }
}