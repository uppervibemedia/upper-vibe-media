import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: opts.depthWrite ?? true, side: opts.side ?? THREE.FrontSide });
}

function standard(color) {
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.38, metalness: 0.36 });
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
  sprite.scale.set(5.2, 1.0, 1);
  sprite.renderOrder = 20;
  sprite.userData.isNeonSign = true;
  return sprite;
}

export function createBeachRollerCoaster(scene) {
  const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const group = new THREE.Group();
  group.name = "beachResortRollerCoaster";
  group.position.set(0, 0, -20);

  const basePoints = [
    new THREE.Vector3(-46, 2.0, -4), new THREE.Vector3(-38, 5.0, -10),
    new THREE.Vector3(-25, 7.2, -8), new THREE.Vector3(-10, 4.0, -1),
    new THREE.Vector3(5, 6.4, 5), new THREE.Vector3(22, 7.8, 0),
    new THREE.Vector3(38, 4.8, -7), new THREE.Vector3(49, 2.5, -1),
    new THREE.Vector3(36, 5.7, 9), new THREE.Vector3(12, 3.5, 12),
    new THREE.Vector3(-14, 5.2, 8), new THREE.Vector3(-34, 3.1, 5),
  ];
  const centerCurve = new THREE.CatmullRomCurve3(basePoints, true, "catmullrom", 0.55);

  [-0.34, 0.34].forEach((offset) => {
    const curve = new THREE.CatmullRomCurve3(basePoints.map((p) => p.clone().add(new THREE.Vector3(offset, 0, 0))), true, "catmullrom", 0.55);
    const track = new THREE.Mesh(
      new THREE.TubeGeometry(curve, isMob ? 96 : 144, 0.075, 8, true),
      basic(offset < 0 ? "#7DEBFF" : "#D9C27C", { transparent: true, opacity: 0.88 })
    );
    track.name = "beachCoasterTrack";
    group.add(track);
  });

  basePoints.forEach((p, i) => {
    if (i % 2 === 1 && isMob) return;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, Math.max(0.8, p.y), 8), standard("#5D6872"));
    post.position.set(p.x, p.y / 2, p.z);
    group.add(post);
  });
  for (let i = 0; i < (isMob ? 18 : 30); i++) {
    const u = i / (isMob ? 18 : 30);
    const p = centerCurve.getPointAt(u);
    const tangent = centerCurve.getTangentAt(u);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 0.18), standard("#2B3D46"));
    tie.position.copy(p);
    tie.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;
    group.add(tie);
    if (i % 2 === 0) {
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, Math.max(0.8, p.y), 7), standard("#6B777E"));
      brace.position.set(p.x, p.y / 2, p.z);
      brace.rotation.z = i % 4 === 0 ? 0.08 : -0.08;
      group.add(brace);
    }
  }

  const station = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 2.4), standard("#C4A36A"));
  station.position.set(-9, 0.24, -5.4);
  group.add(station);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.14, 2.7), standard("#E7D4A3"));
  canopy.position.set(-9, 1.7, -5.4);
  group.add(canopy);

  const cart = new THREE.Group();
  cart.position.set(22, 7.9, 0);
  cart.rotation.y = 0.92;
  const cartBase = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.36, 1.15), standard("#00A7C8"));
  const cartSeat = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.24, 0.55), standard("#24384A"));
  cartSeat.position.y = 0.36;
  cart.add(cartBase, cartSeat);
  group.add(cart);

  const sign = makeLabel("VIBE COASTER", "#00DDF5");
  sign.position.set(-7.2, 2.15, -4.8);
  group.add(sign);

  const light = new THREE.PointLight(new THREE.Color("#00DDF5"), 1.35, 18);
  light.position.set(0, 5, -2);
  group.add(light);

  scene.add(group);
  scene.userData.beachRollerCoaster = group;
}