import * as THREE from "three";

function makePlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const ocean = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, "#7CE0FF");
  ocean.addColorStop(0.34, "#1C9BD4");
  ocean.addColorStop(0.72, "#07649D");
  ocean.addColorStop(1, "#033963");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 24; i++) {
    const x = (i * 67) % canvas.width;
    const y = 18 + ((i * 47) % 210);
    const land = ctx.createRadialGradient(x, y, 4, x, y, 44 + (i % 4) * 11);
    land.addColorStop(0, i % 2 ? "rgba(226,169,88,0.9)" : "rgba(199,132,67,0.86)");
    land.addColorStop(0.55, "rgba(166,104,54,0.45)");
    land.addColorStop(1, "rgba(166,104,54,0)");
    ctx.fillStyle = land;
    ctx.beginPath();
    ctx.ellipse(x, y, 42 + (i % 5) * 9, 16 + (i % 3) * 8, i * 0.43, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(244,225,183,0.42)";
  ctx.lineWidth = 2;
  for (let y = 34; y < canvas.height; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.045 + y * 0.16) * 5);
    ctx.stroke();
  }

  const shine = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  shine.addColorStop(0, "rgba(255,255,255,0.28)");
  shine.addColorStop(0.45, "rgba(255,255,255,0.04)");
  shine.addColorStop(1, "rgba(0,30,70,0.18)");
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
  group.position.set(38, 7.2, -2);
  group.userData.isReturnCityPortal = true;

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 56, 32),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture(), roughness: 0.58, metalness: 0.08, emissive: new THREE.Color("#0B6FA8"), emissiveIntensity: 0.22 })
  );
  planet.userData.isReturnCityPortal = true;
  group.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(3.12, 44, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#74D8FF"), transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  atmosphere.userData.isReturnCityPortal = true;
  group.add(atmosphere);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.32, 0.055, 10, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#D9C27C"), transparent: true, opacity: 0.78, depthWrite: false })
  );
  ring.rotation.set(1.15, 0.15, 0.4);
  ring.userData.isReturnCityPortal = true;
  group.add(ring);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.95, 0.026, 8, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#65E7FF"), transparent: true, opacity: 0.58, depthWrite: false })
  );
  innerRing.rotation.set(1.05, -0.22, -0.28);
  innerRing.userData.isReturnCityPortal = true;
  group.add(innerRing);

  const light = new THREE.PointLight(new THREE.Color("#9BE8FF"), 5.8, 42);
  light.position.set(0, 0, 2);
  group.add(light);

  scene.add(group);
  scene.userData.beachReturnPlanet = group;
}