import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.72, metalness: 0.04 });
}

function makeLabel(text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex; ctx.shadowBlur = 14;
  ctx.font = "900 30px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF"; ctx.fillText(text, 256, 48); ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(4.6, 0.92, 1); sprite.renderOrder = 20; sprite.userData.isNeonSign = true;
  return sprite;
}

function addSurfboard(group, x, z, color, rot = 0) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2.35), standard(color));
  board.position.set(x, 0.15, z); board.rotation.y = rot; group.add(board);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.8), basic("#FFFFFF", { transparent: true, opacity: 0.68 }));
  stripe.rotation.x = -Math.PI / 2; stripe.rotation.z = rot; stripe.position.set(x, 0.205, z); group.add(stripe);
}

export function createBeachSurfZone(scene) {
  const group = new THREE.Group();
  group.name = "beachSurfZone";

  const marker = new THREE.Mesh(new THREE.RingGeometry(8.2, 8.65, 64), basic("#B9F8FF", { transparent: true, opacity: 0.24 }));
  marker.rotation.x = -Math.PI / 2; marker.position.set(28, 0.025, 43); marker.renderOrder = 3; group.add(marker);

  [-5, 0, 5].forEach((x, i) => {
    const wave = new THREE.Mesh(new THREE.PlaneGeometry(16 - i * 1.5, 0.44), basic("#F8FFFF", { transparent: true, opacity: 0.34 - i * 0.05 }));
    wave.rotation.x = -Math.PI / 2; wave.position.set(28 + x * 0.1, 0.04 + i * 0.002, 39.2 + i * 3.3); wave.renderOrder = 4; group.add(wave);
  });

  addSurfboard(group, 34, 31.7, "#FF5DA2", -0.2);
  addSurfboard(group, 35, 32.1, "#F6C45D", -0.15);
  addSurfboard(group, 36, 32.5, "#00CFE8", -0.1);
  addSurfboard(group, 28, 42.2, "#B58CFF", 0.5);

  const rack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.18), standard("#7A5130"));
  rack.position.set(35, 0.55, 31.6); group.add(rack);

  const pier = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.2), basic("#B47B44", { transparent: true, opacity: 0.58 }));
  pier.rotation.x = -Math.PI / 2; pier.position.set(31, 0.035, 34.5); pier.renderOrder = 3; group.add(pier);

  const sign = makeLabel("SURF ZONE", "#00E5FF");
  sign.position.set(34, 2.12, 32.8); group.add(sign);

  const light = new THREE.PointLight(new THREE.Color("#6FE7FF"), 1.15, 18);
  light.position.set(28, 2, 39); group.add(light);

  scene.add(group);
  scene.userData.beachSurfZone = group;
}