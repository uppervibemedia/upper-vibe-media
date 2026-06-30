import * as THREE from "three";

export function createBeachDaySky(scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#2F9DFF");
  sky.addColorStop(0.45, "#78C9FF");
  sky.addColorStop(0.82, "#BDEBFF");
  sky.addColorStop(1, "#DDF6FF");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sun = ctx.createRadialGradient(720, 240, 10, 720, 240, 170);
  sun.addColorStop(0, "rgba(255,255,255,0.82)");
  sun.addColorStop(0.38, "rgba(180,230,255,0.32)");
  sun.addColorStop(1, "rgba(120,200,255,0)");
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