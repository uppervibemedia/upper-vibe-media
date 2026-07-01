import * as THREE from "three";

const { CircleGeometry, RingGeometry, PlaneGeometry, Color, MeshBasicMaterial, Mesh, CanvasTexture, LinearFilter } = THREE;

function createReactorTexture(size = 768) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const floorRadius = size * 0.45;

  ctx.clearRect(0, 0, size, size);

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, floorRadius);
  bg.addColorStop(0, "rgba(0,229,255,0.18)");
  bg.addColorStop(0.38, "rgba(124,58,237,0.10)");
  bg.addColorStop(0.72, "rgba(255,211,110,0.045)");
  bg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, floorRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, floorRadius * 0.96, 0, Math.PI * 2);
  ctx.clip();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const circleRadius = size * 0.126;
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

  ctx.shadowColor = "rgba(0,229,255,0.62)";
  ctx.shadowBlur = size * 0.018;
  ctx.strokeStyle = "rgba(0,229,255,0.66)";
  ctx.lineWidth = size * 0.0042;
  for (const c of centers) {
    const dx = c.x - cx;
    const dy = c.y - cy;
    if (Math.sqrt(dx * dx + dy * dy) > floorRadius * 0.72) continue;
    ctx.beginPath();
    ctx.arc(c.x, c.y, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.shadowColor = "rgba(172,120,255,0.48)";
  ctx.strokeStyle = "rgba(172,120,255,0.52)";
  ctx.lineWidth = size * 0.003;
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const inner = i % 3 === 0 ? floorRadius * 0.18 : floorRadius * 0.34;
    const outer = i % 3 === 0 ? floorRadius * 0.9 : floorRadius * 0.72;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  ctx.shadowColor = "rgba(255,211,110,0.42)";
  ctx.strokeStyle = "rgba(255,211,110,0.48)";
  ctx.lineWidth = size * 0.0026;
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * floorRadius * 0.12, cy + Math.sin(a) * floorRadius * 0.12);
    ctx.lineTo(cx + Math.cos(a) * floorRadius * 0.9, cy + Math.sin(a) * floorRadius * 0.9);
    ctx.stroke();
    const nodeX = cx + Math.cos(a) * floorRadius * 0.62;
    const nodeY = cy + Math.sin(a) * floorRadius * 0.62;
    ctx.beginPath();
    ctx.arc(nodeX, nodeY, size * 0.011, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,211,110,0.82)";
    ctx.fill();
  }

  ctx.setLineDash([size * 0.02, size * 0.018]);
  ctx.shadowColor = "rgba(255,255,255,0.35)";
  ctx.strokeStyle = "rgba(235,255,255,0.42)";
  ctx.lineWidth = size * 0.0028;
  [0.24, 0.46, 0.66, 0.86].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, floorRadius * r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  ctx.font = `900 ${size * 0.035}px Syne, Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(235,255,255,0.64)";
  ctx.shadowBlur = size * 0.006;
  ctx.fillText("FREQUENCY REACTOR", cx, cy + floorRadius * 0.82);

  ctx.restore();

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addTrace(scene, x1, z1, x2, z2, y, color, width) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const mat = new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const line = new Mesh(new PlaneGeometry(len, width), mat);
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = -Math.atan2(dz, dx);
  line.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  line.renderOrder = 2;
  scene.add(line);
  return mat;
}

export function addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const texture = createReactorTexture(isMobile ? 512 : 768);

  const baseMat = new MeshBasicMaterial({ color: new Color("#020711"), depthWrite: true, transparent: false, side: THREE.DoubleSide });
  const baseFloor = new Mesh(new CircleGeometry(PLAZA_R - 0.42, isMobile ? 72 : 112), baseMat);
  baseFloor.rotation.x = -Math.PI / 2;
  baseFloor.position.set(PLAZA_X, 0.006, PLAZA_Z);
  baseFloor.renderOrder = 1;
  baseFloor.name = "frequencyReactorBase";
  scene.add(baseFloor);

  const patternMat = new MeshBasicMaterial({
    map: texture,
    color: new Color("#FFFFFF"),
    depthWrite: false,
    transparent: true,
    opacity: isMobile ? 0.68 : 0.8,
    side: THREE.DoubleSide,
  });

  const flowerFloor = new Mesh(new CircleGeometry(PLAZA_R - 0.55, isMobile ? 72 : 112), patternMat);
  flowerFloor.rotation.x = -Math.PI / 2;
  flowerFloor.position.set(PLAZA_X, 0.01, PLAZA_Z);
  flowerFloor.renderOrder = 2;
  flowerFloor.name = "flowerOfLifeDanceFloor";
  scene.add(flowerFloor);

  const centerMat = new MeshBasicMaterial({ color: new Color("#EFFFFF"), depthWrite: false, transparent: true, opacity: isMobile ? 0.4 : 0.52, side: THREE.DoubleSide });
  const centerRing = new Mesh(new RingGeometry(0.72, 1.12, isMobile ? 48 : 72), centerMat);
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.set(PLAZA_X, 0.012, PLAZA_Z);
  centerRing.renderOrder = 3;
  centerRing.name = "flowerOfLifeCenterPulse";
  scene.add(centerRing);

  const coreMat = new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: isMobile ? 0.34 : 0.46, side: THREE.DoubleSide });
  const core = new Mesh(new CircleGeometry(0.44, isMobile ? 32 : 48), coreMat);
  core.rotation.x = -Math.PI / 2;
  core.position.set(PLAZA_X, 0.014, PLAZA_Z);
  core.renderOrder = 4;
  scene.add(core);

  const outerMat = new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: isMobile ? 0.24 : 0.32, side: THREE.DoubleSide });
  const outerRing = new Mesh(new RingGeometry(PLAZA_R - 0.95, PLAZA_R - 0.76, isMobile ? 72 : 112), outerMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.set(PLAZA_X, 0.013, PLAZA_Z);
  outerRing.renderOrder = 3;
  outerRing.name = "flowerOfLifeOuterGlow";
  scene.add(outerRing);

  const traceMats = [
    addTrace(scene, PLAZA_X, PLAZA_Z, PLAZA_X, PLAZA_Z - 7.1, 0.011, "#00E5FF", isMobile ? 0.06 : 0.085),
    addTrace(scene, PLAZA_X - 2.2, PLAZA_Z - 1.4, PLAZA_X - 5.4, PLAZA_Z - 4.8, 0.011, "#A078FF", isMobile ? 0.05 : 0.075),
    addTrace(scene, PLAZA_X + 2.2, PLAZA_Z - 1.4, PLAZA_X + 5.4, PLAZA_Z - 4.8, 0.011, "#D4A843", isMobile ? 0.05 : 0.075),
  ];

  scene.userData.danceFloorMats = [patternMat, centerMat, outerMat, coreMat, ...traceMats];
  scene.userData._danceFloorTiles = [];
  scene.userData._danceRings = [];
  scene.userData._danceSweeps = [];
  scene.userData._danceDots = [];
  scene.userData._danceFloorTileData = [];
  scene.userData._flowerOfLifeDanceFloor = {
    patternMat,
    centerMat,
    outerMat,
    coreMat,
    traceMats,
    texture,
    basePatternOpacity: isMobile ? 0.68 : 0.8,
    baseCenterOpacity: isMobile ? 0.4 : 0.52,
    baseOuterOpacity: isMobile ? 0.24 : 0.32,
    baseCoreOpacity: isMobile ? 0.34 : 0.46,
    lastUpdate: 0,
  };
}

export function animateDanceFloor(scene, t, audioBeat, audioIntensity, quality = "full") {
  const flower = scene.userData._flowerOfLifeDanceFloor;
  if (!flower) return;

  const minInterval = quality === "low" ? 1 / 12 : quality === "medium" ? 1 / 20 : 1 / 30;
  if (t - flower.lastUpdate < minInterval) return;
  flower.lastUpdate = t;

  const hasMusic = audioIntensity > 0.05;
  const slowBreath = Math.sin(t * 0.7) * 0.5 + 0.5;
  const beat = hasMusic ? Math.min(1, audioBeat * 0.8 + audioIntensity * 0.28) : slowBreath * 0.18;
  const qualityScale = quality === "low" ? 0.52 : quality === "medium" ? 0.76 : 1;

  flower.patternMat.opacity = flower.basePatternOpacity * (0.84 + beat * 0.18 * qualityScale);
  flower.centerMat.opacity = flower.baseCenterOpacity * (0.76 + beat * 0.5 * qualityScale + slowBreath * 0.08);
  flower.outerMat.opacity = flower.baseOuterOpacity * (0.8 + beat * 0.34 * qualityScale + slowBreath * 0.1);
  flower.coreMat.opacity = flower.baseCoreOpacity * (0.78 + beat * 0.62 * qualityScale + slowBreath * 0.12);

  flower.patternMat.color.set("#FFFFFF");
  flower.patternMat.color.lerp(new Color("#BDFBFF"), 0.16 + beat * 0.24 * qualityScale);
  flower.outerMat.color.set("#00E5FF");
  flower.outerMat.color.lerp(new Color("#A078FF"), beat * 0.22 * qualityScale);
  flower.coreMat.color.set("#00E5FF");
  flower.coreMat.color.lerp(new Color("#FFD36E"), beat * 0.2 * qualityScale);

  flower.traceMats.forEach((mat, i) => {
    mat.opacity = (i === 0 ? 0.24 : 0.18) * (0.82 + beat * 0.35 * qualityScale + Math.sin(t * 0.9 + i) * 0.08);
  });
}