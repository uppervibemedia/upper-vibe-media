import * as THREE from "three";

export function createBeachDaySky(scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#48AEFF");
  sky.addColorStop(0.42, "#8ED7FF");
  sky.addColorStop(0.74, "#CDEEFF");
  sky.addColorStop(1, "#FFD6A8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sun = ctx.createRadialGradient(720, 250, 10, 720, 250, 180);
  sun.addColorStop(0, "rgba(255,245,190,0.95)");
  sun.addColorStop(0.35, "rgba(255,195,100,0.45)");
  sun.addColorStop(1, "rgba(255,160,120,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(260, 32, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, depthTest: false })
  );
  skyMesh.name = "beachDaySky";
  skyMesh.renderOrder = -9;
  scene.add(skyMesh);
  scene.userData.beachDaySky = skyMesh;
}