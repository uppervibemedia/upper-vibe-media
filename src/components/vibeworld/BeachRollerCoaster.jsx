import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: opts.depthWrite ?? true, side: opts.side ?? THREE.FrontSide });
}

function standard(color) {
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.55, metalness: 0.12 });
  return mat;
}

function makeLabel(text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 14;
  ctx.font = "900 30px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 256, 48);
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(6.8, 1.25, 1);
  sprite.renderOrder = 20;
  sprite.userData.isNeonSign = true;
  return sprite;
}

export function createBeachRollerCoaster(scene) {
  const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const group = new THREE.Group();
  group.name = "beachResortRollerCoaster";
  group.position.set(-38, 0, -8);

  const basePoints = [
    new THREE.Vector3(-10, 1.8, -7), new THREE.Vector3(-6, 5.2, -10),
    new THREE.Vector3(1, 7.1, -8), new THREE.Vector3(7, 4.2, -3),
    new THREE.Vector3(10, 2.3, 5), new THREE.Vector3(4, 5.3, 9),
    new THREE.Vector3(-5, 3.6, 8), new THREE.Vector3(-11, 2.1, 1),
  ];

  [-0.34, 0.34].forEach((offset) => {
    const curve = new THREE.CatmullRomCurve3(basePoints.map((p) => p.clone().add(new THREE.Vector3(offset, 0, 0))), true, "catmullrom", 0.55);
    const track = new THREE.Mesh(
      new THREE.TubeGeometry(curve, isMob ? 64 : 96, 0.075, 8, true),
      basic(offset < 0 ? "#00DDF5" : "#F6C45D", { transparent: true, opacity: 0.92 })
    );
    track.name = "beachCoasterTrack";
    group.add(track);
  });

  basePoints.forEach((p, i) => {
    if (i % 2 === 1 && isMob) return;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, Math.max(0.8, p.y), 8), standard("#6A4A33"));
    post.position.set(p.x, p.y / 2, p.z);
    group.add(post);
  });

  const station = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 2.4), standard("#C58B45"));
  station.position.set(-9, 0.35, -5.4);
  group.add(station);

  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.52, 0.92), standard("#FF5DA2"));
  cart.position.set(2, 6.7, -7.6);
  cart.rotation.y = 0.42;
  group.add(cart);

  const sign = makeLabel("VIBE COASTER", "#00DDF5");
  sign.position.set(-7.5, 3.1, -7.5);
  group.add(sign);

  const light = new THREE.PointLight(new THREE.Color("#00DDF5"), 1.35, 18);
  light.position.set(0, 5, 0);
  group.add(light);

  scene.add(group);
  scene.userData.beachRollerCoaster = group;
}