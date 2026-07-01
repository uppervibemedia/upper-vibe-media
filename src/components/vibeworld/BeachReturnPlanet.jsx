import * as THREE from "three";

function makePlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0, "#071A36");
  base.addColorStop(0.36, "#0A3B73");
  base.addColorStop(0.62, "#29146E");
  base.addColorStop(1, "#070D24");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.9;
  for (let band = 0; band < 7; band++) {
    const y = 42 + band * 42;
    const grad = ctx.createLinearGradient(0, y - 8, canvas.width, y + 8);
    grad.addColorStop(0, "rgba(0,229,255,0.05)");
    grad.addColorStop(0.45, band % 2 ? "rgba(180,108,255,0.26)" : "rgba(0,229,255,0.24)");
    grad.addColorStop(1, "rgba(255,211,110,0.08)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = band % 2 ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.018 + band) * (7 + band * 0.8));
    ctx.stroke();
  }

  const cityGlow = ctx.createLinearGradient(0, 118, 0, 300);
  cityGlow.addColorStop(0, "rgba(0,229,255,0.02)");
  cityGlow.addColorStop(0.55, "rgba(0,229,255,0.22)");
  cityGlow.addColorStop(1, "rgba(255,211,110,0.10)");
  ctx.fillStyle = cityGlow;
  ctx.fillRect(0, 116, canvas.width, 190);

  for (let i = 0; i < 72; i++) {
    const x = (i * 47) % canvas.width;
    const baseY = 258 + ((i * 19) % 42);
    const h = 18 + ((i * 31) % 72);
    const w = 5 + (i % 5) * 3;
    ctx.fillStyle = i % 4 === 0 ? "rgba(255,224,146,0.58)" : i % 3 === 0 ? "rgba(180,134,255,0.45)" : "rgba(86,239,255,0.44)";
    ctx.fillRect(x, baseY - h, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.56)";
    if (h > 36) ctx.fillRect(x + 1, baseY - h + 5, Math.max(1, w - 2), 1.3);
  }

  ctx.strokeStyle = "rgba(230,252,255,0.42)";
  ctx.lineWidth = 1.4;
  for (let x = 18; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + Math.sin(x * 0.03) * 12, canvas.height - 18);
    ctx.stroke();
  }

  const shine = ctx.createRadialGradient(210, 80, 20, 250, 105, 360);
  shine.addColorStop(0, "rgba(255,255,255,0.34)");
  shine.addColorStop(0.32, "rgba(120,235,255,0.13)");
  shine.addColorStop(0.75, "rgba(80,30,130,0.12)");
  shine.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function makePortalLabel() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 30px Syne, Inter, sans-serif";
  ctx.shadowColor = "rgba(0,229,255,0.75)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("UPPER VIBE CITY", 256, 50);
  ctx.font = "800 17px Inter, sans-serif";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(255,211,110,0.86)";
  ctx.fillText("TAP TO RETURN", 256, 82);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(8.6, 2.15, 1);
  sprite.renderOrder = 80;
  sprite.userData.isReturnCityPortal = true;
  return sprite;
}

function portalMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
}

export function createBeachReturnPlanet(scene) {
  const group = new THREE.Group();
  group.name = "beachReturnPlanet";
  group.position.set(5.5, 7.1, 63.5);
  group.userData.isReturnCityPortal = true;

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(3.15, 64, 36),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture(), roughness: 0.22, metalness: 0.42, emissive: new THREE.Color("#123CFF"), emissiveIntensity: 0.42 })
  );
  planet.userData.isReturnCityPortal = true;
  group.add(planet);

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(3.34, 48, 28), portalMaterial("#74E8FF", 0.13));
  atmosphere.userData.isReturnCityPortal = true;
  group.add(atmosphere);

  const outerHalo = new THREE.Mesh(new THREE.SphereGeometry(3.8, 40, 22), portalMaterial("#8B5CFF", 0.055));
  outerHalo.userData.isReturnCityPortal = true;
  group.add(outerHalo);

  const rings = [
    [4.28, 0.045, "#6FEAFF", 0.74, 1.18, 0.08, 0.34],
    [4.78, 0.026, "#FFD36E", 0.48, 1.08, -0.32, -0.18],
    [5.26, 0.018, "#C4A0FF", 0.36, 0.52, 0.78, 1.12],
  ];
  rings.forEach(([radius, tube, color, opacity, rx, ry, rz]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 128), portalMaterial(color, opacity));
    ring.rotation.set(rx, ry, rz);
    ring.userData.isReturnCityPortal = true;
    group.add(ring);
  });

  const label = makePortalLabel();
  label.position.set(0, 5.0, -0.25);
  group.add(label);

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  );
  hitArea.userData.isReturnCityPortal = true;
  group.add(hitArea);

  const light = new THREE.PointLight(new THREE.Color("#7DEBFF"), 5.8, 62);
  light.position.set(0, 0.5, 2.2);
  group.add(light);

  scene.add(group);
  scene.userData.beachReturnPlanet = group;
}