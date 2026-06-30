import * as THREE from "three";

function makePlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const ocean = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, "#35B9FF");
  ocean.addColorStop(0.55, "#126EBA");
  ocean.addColorStop(1, "#064377");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(182,123,63,0.88)";
  for (let i = 0; i < 18; i++) {
    const x = (i * 77) % canvas.width;
    const y = 28 + ((i * 41) % 180);
    ctx.beginPath();
    ctx.ellipse(x, y, 36 + (i % 4) * 16, 14 + (i % 3) * 11, i * 0.47, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,232,178,0.34)";
  ctx.lineWidth = 3;
  for (let y = 42; y < canvas.height; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.035 + y) * 7);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function createBeachReturnPlanet(scene) {
  const group = new THREE.Group();
  group.name = "beachReturnPlanet";
  group.position.set(-16, 16, 25);
  group.userData.isReturnCityPortal = true;

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(4.8, 64, 32),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture(), roughness: 0.72, metalness: 0.02, emissive: new THREE.Color("#0B5F8E"), emissiveIntensity: 0.14 })
  );
  planet.userData.isReturnCityPortal = true;
  group.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(5.35, 48, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#74D8FF"), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  atmosphere.userData.isReturnCityPortal = true;
  group.add(atmosphere);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(6.2, 0.08, 12, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD18A"), transparent: true, opacity: 0.72, depthWrite: false })
  );
  ring.rotation.set(1.15, 0.15, 0.4);
  ring.userData.isReturnCityPortal = true;
  group.add(ring);

  const light = new THREE.PointLight(new THREE.Color("#9BE8FF"), 4.5, 36);
  light.position.set(0, 0, 2);
  group.add(light);

  scene.add(group);
  scene.userData.beachReturnPlanet = group;
}