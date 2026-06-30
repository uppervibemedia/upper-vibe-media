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
  group.position.set(0, 0, 0);

  const basePoints = [
    new THREE.Vector3(-12, 1.25, -22), new THREE.Vector3(-24, 6.8, -29),
    new THREE.Vector3(-42, 12.4, -25), new THREE.Vector3(-55, 3.0, -16),
    new THREE.Vector3(-38, 8.2, -9), new THREE.Vector3(-14, 13.2, -18),
    new THREE.Vector3(12, 5.0, -29), new THREE.Vector3(38, 10.6, -25),
    new THREE.Vector3(54, 2.7, -14), new THREE.Vector3(28, 8.8, -7),
    new THREE.Vector3(3, 3.2, -12), new THREE.Vector3(-12, 1.25, -22),
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

  const stationGroup = new THREE.Group();
  stationGroup.position.set(-12, 0, -22);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 4.2), standard("#C9A96B"));
  deck.position.set(0, 0.18, 0);
  const planks = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.045, 3.75), basic("#E8D8AD", { transparent: true, opacity: 0.38 }));
  planks.position.set(0, 0.36, 0);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.22, 4.5), standard("#F1DFA8"));
  canopy.position.set(0, 2.25, 0);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 1.0, 4), standard("#64CFE0"));
  roof.position.set(0, 2.85, 0);
  roof.rotation.y = Math.PI / 4;
  stationGroup.add(deck, planks, canopy, roof);
  [-3.7, 3.7].forEach((x) => [-1.7, 1.7].forEach((z) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.25, 10), standard("#7A6B57"));
    post.position.set(x, 1.18, z);
    stationGroup.add(post);
  }));
  [-2.7, 2.7].forEach((x) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.7), standard("#7A6B57"));
    rail.position.set(x, 0.86, 0);
    stationGroup.add(rail);
  });
  const entryGlow = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.22, 36), basic("#7DEBFF", { transparent: true, opacity: 0.46 }));
  entryGlow.rotation.x = -Math.PI / 2;
  entryGlow.position.set(0, 0.42, 2.35);
  const ridePad = new THREE.Mesh(new THREE.CircleGeometry(1.45, 36), basic("#00E5FF", { transparent: true, opacity: 0.18 }));
  ridePad.rotation.x = -Math.PI / 2;
  ridePad.position.set(0, 0.39, 2.35);
  const neonTrimA = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.08, 0.08), basic("#00E5FF", { transparent: true, opacity: 0.72 }));
  neonTrimA.position.set(0, 0.58, 2.1);
  const neonTrimB = neonTrimA.clone();
  neonTrimB.position.z = -2.1;
  stationGroup.add(entryGlow, ridePad, neonTrimA, neonTrimB);
  group.add(stationGroup);

  const cart = new THREE.Group();
  cart.position.set(-12, 1.55, -22);
  const tangent0 = centerCurve.getTangentAt(0.01);
  cart.rotation.y = Math.atan2(tangent0.x, tangent0.z);
  const cartBase = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.34, 2.1), standard("#00A7C8"));
  cartBase.position.y = 0.2;
  const cartNose = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.72, 4), standard("#00A7C8"));
  cartNose.rotation.x = Math.PI / 2;
  cartNose.position.set(0, 0.25, 1.28);
  const cartSeat = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.3, 0.82), standard("#24384A"));
  cartSeat.position.set(0, 0.58, -0.2);
  const lapBar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 24), basic("#FFD36E", { transparent: true, opacity: 0.92 }));
  lapBar.rotation.x = Math.PI / 2;
  lapBar.position.set(0, 0.9, -0.12);
  cart.add(cartBase, cartNose, cartSeat, lapBar);
  [-0.66, 0.66].forEach((x) => [-0.72, 0.72].forEach((z) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), standard("#061018"));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.02, z);
    cart.add(wheel);
  }));
  group.add(cart);

  const sign = makeLabel("VIBE COASTER", "#00DDF5");
  sign.position.set(-12, 3.85, -19.6);
  group.add(sign);

  const light = new THREE.PointLight(new THREE.Color("#00DDF5"), 1.35, 18);
  light.position.set(0, 5, -2);
  group.add(light);

  scene.add(group);
  scene.userData.beachRollerCoaster = group;
}