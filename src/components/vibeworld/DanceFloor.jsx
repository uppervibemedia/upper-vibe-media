import * as THREE from "three";

const {
  CircleGeometry,
  RingGeometry,
  Color,
  MeshBasicMaterial,
  Mesh,
  CanvasTexture,
  LinearFilter,
} = THREE;

function createFlowerOfLifeTexture(size = 768) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const floorRadius = size * 0.45;

  ctx.clearRect(0, 0, size, size);

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, floorRadius);
  bg.addColorStop(0, "rgba(0,229,255,0.10)");
  bg.addColorStop(0.55, "rgba(124,58,237,0.08)");
  bg.addColorStop(1, "rgba(0,10,20,0.02)");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, floorRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, floorRadius * 0.96, 0, Math.PI * 2);
  ctx.clip();

  const circleRadius = size * 0.145;
  const spacing = circleRadius;
  const centers = [{ x: cx, y: cy }];

  for (let ring = 1; ring <= 3; ring++) {
    for (let side = 0; side < 6; side++) {
      const baseAngle = (Math.PI / 3) * side;
      const nextAngle = (Math.PI / 3) * (side + 1);
      for (let step = 0; step < ring; step++) {
        const a = step / ring;
        centers.push({
          x: cx + Math.cos(baseAngle) * spacing * ring * (1 - a) + Math.cos(nextAngle) * spacing * ring * a,
          y: cy + Math.sin(baseAngle) * spacing * ring * (1 - a) + Math.sin(nextAngle) * spacing * ring * a,
        });
      }
    }
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,229,255,0.55)";
  ctx.shadowBlur = size * 0.018;
  ctx.strokeStyle = "rgba(0,229,255,0.60)";
  ctx.lineWidth = size * 0.0045;
  for (const c of centers) {
    const dx = c.x - cx;
    const dy = c.y - cy;
    if (Math.sqrt(dx * dx + dy * dy) > floorRadius * 0.74) continue;
    ctx.beginPath();
    ctx.arc(c.x, c.y, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.shadowColor = "rgba(172,120,255,0.45)";
  ctx.shadowBlur = size * 0.012;
  ctx.strokeStyle = "rgba(172,120,255,0.34)";
  ctx.lineWidth = size * 0.003;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * floorRadius * 0.18, cy + Math.sin(angle) * floorRadius * 0.18);
    ctx.lineTo(cx + Math.cos(angle) * floorRadius * 0.86, cy + Math.sin(angle) * floorRadius * 0.86);
    ctx.stroke();
  }

  ctx.shadowColor = "rgba(255,255,255,0.50)";
  ctx.shadowBlur = size * 0.01;
  ctx.strokeStyle = "rgba(235,255,255,0.48)";
  ctx.lineWidth = size * 0.0035;
  [0.22, 0.42, 0.64, 0.86].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, floorRadius * r, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();

  const edge = ctx.createRadialGradient(cx, cy, floorRadius * 0.82, cx, cy, floorRadius);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,229,255,0.22)");
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(cx, cy, floorRadius, 0, Math.PI * 2);
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * addDanceFloor — lightweight neon Flower of Life sacred geometry floor.
 * Visual-only: keeps existing dance floor proximity/music logic untouched.
 */
export function addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const texture = createFlowerOfLifeTexture(isMobile ? 512 : 768);

  const patternMat = new MeshBasicMaterial({
    map: texture,
    color: new Color("#FFFFFF"),
    depthWrite: false,
    transparent: true,
    opacity: isMobile ? 0.72 : 0.82,
    side: THREE.DoubleSide,
  });

  const flowerFloor = new Mesh(
    new CircleGeometry(1.55, isMobile ? 48 : 72),
    patternMat,
  );
  flowerFloor.rotation.x = -Math.PI / 2;
  flowerFloor.position.set(PLAZA_X, 0.009, PLAZA_Z);
  flowerFloor.renderOrder = 2;
  flowerFloor.name = "flowerOfLifeDanceFloor";
  scene.add(flowerFloor);

  const centerMat = new MeshBasicMaterial({
    color: new Color("#EFFFFF"),
    depthWrite: false,
    transparent: true,
    opacity: isMobile ? 0.34 : 0.42,
    side: THREE.DoubleSide,
  });
  const centerRing = new Mesh(new RingGeometry(0.82, 1.02, isMobile ? 48 : 72), centerMat);
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.set(PLAZA_X, 0.011, PLAZA_Z);
  centerRing.renderOrder = 3;
  centerRing.name = "flowerOfLifeCenterPulse";
  scene.add(centerRing);

  const outerMat = new MeshBasicMaterial({
    color: new Color("#00E5FF"),
    depthWrite: false,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });

  scene.userData.danceFloorMats = [patternMat, centerMat];
  scene.userData._danceFloorTiles = [];
  scene.userData._danceRings = [];
  scene.userData._danceSweeps = [];
  scene.userData._danceDots = [];
  scene.userData._danceFloorTileData = [];
  scene.userData._flowerOfLifeDanceFloor = {
    patternMat,
    centerMat,
    outerMat,
    texture,
    basePatternOpacity: isMobile ? 0.72 : 0.82,
    baseCenterOpacity: isMobile ? 0.34 : 0.42,
    baseOuterOpacity: isMobile ? 0.26 : 0.34,
    lastUpdate: 0,
  };
}

/**
 * animateDanceFloor — low-cost music-reactive pulse for the Flower of Life floor.
 */
export function animateDanceFloor(scene, t, audioBeat, audioIntensity, quality = "full") {
  const flower = scene.userData._flowerOfLifeDanceFloor;
  if (!flower) return;

  const minInterval = quality === "low" ? 1 / 12 : quality === "medium" ? 1 / 20 : 1 / 30;
  if (t - flower.lastUpdate < minInterval) return;
  flower.lastUpdate = t;

  const hasMusic = audioIntensity > 0.05;
  const slowBreath = Math.sin(t * 0.7) * 0.5 + 0.5;
  const beat = hasMusic ? Math.min(1, audioBeat * 0.8 + audioIntensity * 0.28) : slowBreath * 0.18;
  const qualityScale = quality === "low" ? 0.55 : quality === "medium" ? 0.78 : 1;

  flower.patternMat.opacity = flower.basePatternOpacity * (0.88 + beat * 0.18 * qualityScale);
  flower.centerMat.opacity = flower.baseCenterOpacity * (0.78 + beat * 0.45 * qualityScale + slowBreath * 0.08);
  flower.outerMat.opacity = flower.baseOuterOpacity * (0.82 + beat * 0.32 * qualityScale + slowBreath * 0.10);

  const coolShift = 0.18 + beat * 0.25 * qualityScale;
  flower.patternMat.color.set("#FFFFFF");
  flower.patternMat.color.lerp(new Color("#BDFBFF"), coolShift);
  flower.outerMat.color.set("#00E5FF");
  flower.outerMat.color.lerp(new Color("#A078FF"), beat * 0.22 * qualityScale);
}