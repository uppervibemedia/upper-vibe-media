import * as THREE from "three";

function makePlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0, "#050A1A");
  base.addColorStop(0.34, "#0A1E46");
  base.addColorStop(0.68, "#31106A");
  base.addColorStop(1, "#080D22");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(80,230,255,0.42)";
  ctx.lineWidth = 1.5;
  for (let y = 18; y < canvas.height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.035 + y * 0.08) * 3);
    ctx.stroke();
  }
  for (let x = 12; x < canvas.width; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 8, canvas.height);
    ctx.stroke();
  }

  for (let i = 0; i < 46; i++) {
    const x = (i * 53) % canvas.width;
    const h = 12 + ((i * 31) % 52);
    const y = 132 + ((i * 17) % 70);
    const w = 5 + (i % 4) * 3;
    ctx.fillStyle = i % 3 === 0 ? "rgba(170,210,255,0.42)" : "rgba(60,240,255,0.32)";
    ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(x + 1, y - h + 3, Math.max(1, w - 2), 1.2);
  }

  ctx.strokeStyle = "rgba(190,120,255,0.54)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const y = 38 + i * 31;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(canvas.width * 0.5, y + (i % 2 ? 22 : -18), canvas.width, y + 4);
    ctx.stroke();
  }

  const shine = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  shine.addColorStop(0, "rgba(255,255,255,0.38)");
  shine.addColorStop(0.45, "rgba(90,235,255,0.08)");
  shine.addColorStop(1, "rgba(30,0,90,0.32)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function createBeachReturnPlanet(scene) {
  const group = new THREE.Group();
  group.name = "beachReturnPlanet";
  group.position.set(42, 8.8, 43);
  group.userData.isReturnCityPortal = true;

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2.55, 56, 32),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture(), roughness: 0.28, metalness: 0.48, emissive: new THREE.Color("#1A4DFF"), emissiveIntensity: 0.38 })
  );
  planet.userData.isReturnCityPortal = true;
  group.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(3.22, 44, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#8B5CFF"), transparent: true, opacity: 0.30, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  atmosphere.userData.isReturnCityPortal = true;
  group.add(atmosphere);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.42, 0.055, 10, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#6FEAFF"), transparent: true, opacity: 0.84, depthWrite: false })
  );
  ring.rotation.set(1.15, 0.15, 0.4);
  ring.userData.isReturnCityPortal = true;
  group.add(ring);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.02, 0.03, 8, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#B36CFF"), transparent: true, opacity: 0.64, depthWrite: false })
  );
  innerRing.rotation.set(1.05, -0.22, -0.28);
  innerRing.userData.isReturnCityPortal = true;
  group.add(innerRing);

  const techOrbit = new THREE.Mesh(
    new THREE.TorusGeometry(3.72, 0.018, 8, 128),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#E4F7FF"), transparent: true, opacity: 0.48, depthWrite: false })
  );
  techOrbit.rotation.set(0.55, 0.86, 1.15);
  techOrbit.userData.isReturnCityPortal = true;
  group.add(techOrbit);

  const light = new THREE.PointLight(new THREE.Color("#7DEBFF"), 6.5, 48);
  light.position.set(0, 0, 2);
  group.add(light);

  scene.add(group);
  scene.userData.beachReturnPlanet = group;
}