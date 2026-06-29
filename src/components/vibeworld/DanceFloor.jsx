import * as THREE from "three";

const {
  PlaneGeometry,
  RingGeometry,
  BoxGeometry,
  Color,
  MeshBasicMaterial,
  Mesh,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
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

  // ── Animated light tiles — one instanced mesh instead of hundreds of objects ──
  const TILE_SIZE = 0.7;
  const TILE_GAP = 0.25;
  const TILE_RADIUS = PLAZA_R - 1.5;
  const tileColors = ["#00D4F0", "#C43BFF", "#E040FB", "#00E5FF", "#A078FF", "#EDB84A", "#FF6EC7", "#4DF0FF"];
  const tileBaseColors = tileColors.map((c) => new Color(c));
  const tileInstances = [];

  for (let row = -7; row <= 7; row++) {
    for (let col = -7; col <= 7; col++) {
      const tx = row * (TILE_SIZE + TILE_GAP);
      const tz = PLAZA_Z + col * (TILE_SIZE + TILE_GAP);
      const dist = Math.sqrt(tx * tx + (tz - PLAZA_Z) * (tz - PLAZA_Z));
      if (dist > TILE_RADIUS) continue;
      const colorIdx = (row + col + 12) % tileColors.length;
      tileInstances.push({ x: tx, z: tz, phase: (row * 0.73 + col * 0.41) % (Math.PI * 2), colorIdx });
    }
  }

  const tileGeo = new PlaneGeometry(TILE_SIZE, TILE_SIZE);
  const tileMat = new MeshBasicMaterial({
    vertexColors: true,
    depthWrite: false,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
  });
  const tileMesh = new InstancedMesh(tileGeo, tileMat, tileInstances.length);
  tileMesh.name = "danceFloorInstancedTiles";
  tileMesh.renderOrder = 2;
  const tileMatrix = new Matrix4();
  const tileQuat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  const tileScale = new Vector3(1, 1, 1);
  for (let i = 0; i < tileInstances.length; i++) {
    const tile = tileInstances[i];
    tileMatrix.compose(new Vector3(tile.x, 0.007, tile.z), tileQuat, tileScale);
    tileMesh.setMatrixAt(i, tileMatrix);
    tileMesh.setColorAt(i, tileBaseColors[tile.colorIdx]);
  }
  tileMesh.instanceMatrix.needsUpdate = true;
  if (tileMesh.instanceColor) tileMesh.instanceColor.needsUpdate = true;
  scene.add(tileMesh);
  danceFloorTiles.push(tileMesh);
  floorTileMats.push({ mesh: tileMesh, instances: tileInstances, baseColors: tileBaseColors });

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

  // ── Edge glow dots — one instanced mesh around perimeter ───────────────────
  const dotCount = 36;
  const dotMats = [];
  const dotGeo = new BoxGeometry(0.08, 0.02, 0.12);
  const dotMat = new MeshBasicMaterial({
    vertexColors: true,
    depthWrite: false,
    transparent: true,
    opacity: 0.50,
  });
  const dotMesh = new InstancedMesh(dotGeo, dotMat, dotCount);
  dotMesh.name = "danceFloorInstancedDots";
  dotMesh.renderOrder = 2;
  const dotMatrix = new Matrix4();
  const dotQuat = new Quaternion();
  const dotScale = new Vector3(1, 1, 1);
  const dotData = [];
  for (let i = 0; i < dotCount; i++) {
    const angle = (i / dotCount) * Math.PI * 2;
    const dx = Math.cos(angle) * TILE_RADIUS;
    const dz = Math.sin(angle) * TILE_RADIUS;
    dotQuat.setFromAxisAngle(new Vector3(0, 1, 0), -angle);
    dotMatrix.compose(new Vector3(PLAZA_X + dx, 0.006, PLAZA_Z + dz), dotQuat, dotScale);
    dotMesh.setMatrixAt(i, dotMatrix);
    dotMesh.setColorAt(i, tileBaseColors[i % tileBaseColors.length]);
    dotData.push({ phase: i * 0.3, colorIdx: i % tileBaseColors.length });
  }
  dotMesh.instanceMatrix.needsUpdate = true;
  if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
  scene.add(dotMesh);
  dotMats.push({ mesh: dotMesh, mat: dotMat, dots: dotData, baseColors: tileBaseColors });

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
    tileMat,
    ...sweepMats.map(s => s.mat),
    dotMat,
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
export function animateDanceFloor(scene, t, audioBeat, audioIntensity) {
  const rings = scene.userData._danceRings;
  const sweeps = scene.userData._danceSweeps;
  const dots = scene.userData._danceDots;
  const tileData = scene.userData._danceFloorTileData;

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
      s.mat.opacity = sweepWave * s.sweep.userData.baseOpacity * beatPulse;
    }
  }

  // ── Edge dots — sequential glow through instanced colors ─────────────────────
  if (dots?.[0]?.mesh) {
    const d = dots[0];
    const scratch = scene.userData._danceScratchColor || (scene.userData._danceScratchColor = new Color());
    for (let i = 0; i < d.dots.length; i++) {
      const dot = d.dots[i];
      const wave = Math.sin(t * 2.5 + dot.phase) * 0.5 + 0.5;
      scratch.copy(d.baseColors[dot.colorIdx]).multiplyScalar(0.75 + beatPulse * 0.35 + wave * 0.18);
      d.mesh.setColorAt(i, scratch);
    }
    if (d.mesh.instanceColor) d.mesh.instanceColor.needsUpdate = true;
    d.mat.opacity = 0.42 + beatPulse * 0.12;
  }

  // ── Tile grid — music-reactive wave patterns via one instanced mesh ───────────
  if (tileData?.[0]?.mesh) {
    const td = tileData[0];
    const base = scene.userData._danceBaseScratch || (scene.userData._danceBaseScratch = new Color());
    const bright = scene.userData._danceBrightScratch || (scene.userData._danceBrightScratch = new Color());
    for (let i = 0; i < td.instances.length; i++) {
      const p = td.instances[i];
      const tileWave = Math.sin(t * 1.5 + p.phase + audioBeat * 3) * 0.5 + 0.5;
      const intensity = Math.max(0, tileWave * beatPulse * 0.7);
      base.copy(td.baseColors[p.colorIdx]);
      bright.copy(base).multiplyScalar(1.8 + audioBeat * 2.1);
      td.mesh.setColorAt(i, base.lerp(bright, intensity));
    }
    if (td.mesh.instanceColor) td.mesh.instanceColor.needsUpdate = true;
    td.mesh.material.opacity = 0.34 + Math.min(0.35, beatPulse * 0.18);
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