import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.76, metalness: 0.04 });
}

function makeLabel(text, colorHex, scale = [5.6, 1.08]) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const ctx = c.getContext("2d");
  ctx.shadowColor = colorHex; ctx.shadowBlur = 14;
  ctx.font = "900 28px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 256, 48); ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(...scale, 1); sp.renderOrder = 50; sp.userData.isNeonSign = true;
  return sp;
}

function addUmbrella(group, x, z, color) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.55, 8), standard("#8B5A2B"));
  pole.position.set(x, 0.78, z); group.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.48, 18), basic(color, { transparent: true, opacity: 0.92 }));
  top.position.set(x, 1.6, z); group.add(top);
}

function addChair(group, x, z, color, rot = 0) {
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 1.9), standard(color));
  seat.position.set(x, 0.12, z); seat.rotation.y = rot; group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.72), standard(color));
  back.position.set(x - Math.sin(rot) * 0.78, 0.43, z - Math.cos(rot) * 0.78);
  back.rotation.set(0.5, rot, 0); group.add(back);
}

function addPalm(group, x, z, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 2.15 * scale, 8), standard("#8B5A2B"));
  trunk.position.set(x, 1.05 * scale, z); trunk.rotation.z = 0.12; group.add(trunk);
  const leafMat = basic("#31A86A", { transparent: true, opacity: 0.9 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.55 * scale, 0.08 * scale, 0.32 * scale), leafMat.clone());
    leaf.position.set(x, 2.08 * scale, z); leaf.rotation.set(0.18, (i / 6) * Math.PI * 2, 0.25); group.add(leaf);
  }
}

function addGlowStone(group, x, z, color = "#B58CFF") {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.46, 24), basic(color, { transparent: true, opacity: 0.52 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.045, z); ring.renderOrder = 6; group.add(ring);
}

export function createBeachResortDecor(scene) {
  const group = new THREE.Group();
  group.name = "beachResortDecor";

  const pathMat = basic("#F7DFA2", { transparent: true, opacity: 0.34 });
  [[16, -5, 36, 2.0], [-16, -5, 36, 2.0], [0, 9, 44, 2.2], [-26, 18, 30, 2.0], [26, 16, 28, 2.0]].forEach(([x, z, w, d], i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat.clone());
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.03 + i * 0.001, z); p.renderOrder = 3; group.add(p);
  });
  [[32,-8],[8,-8],[0,10],[-38,22],[-38,-8],[27,31]].forEach(([x,z]) => addGlowStone(group, x, z));

  addPalm(group, 6, -12, 0.9); addPalm(group, 14, -10, 0.85); addPalm(group, 20, -12, 0.85);
  addUmbrella(group, 8, -7, "#FF7DB5"); addUmbrella(group, 16, -6, "#00DDF5");
  addChair(group, 7, -5.2, "#F6C45D", 0.25); addChair(group, 11, -5.5, "#7DD3FC", -0.2);
  addChair(group, 15, -4.8, "#F9A8D4", 0.1); addChair(group, 19, -5.6, "#B58CFF", -0.35);
  const loungeLabel = makeLabel("RESORT LOUNGE", "#FFD08A", [6.2, 1.18]);
  loungeLabel.position.set(13, 2.65, -10); group.add(loungeLabel);

  const cabana = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.75, 2.4), standard("#F0D7A0"));
  cabana.position.set(20, 0.9, -14); group.add(cabana);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.0, 4), standard("#C87938"));
  roof.position.set(20, 2.25, -14); roof.rotation.y = Math.PI / 4; group.add(roof);

  addUmbrella(group, -4, 12, "#F6C45D"); addUmbrella(group, 5, 13, "#B58CFF"); addPalm(group, -7, 16, 0.85);
  [-2, 2, 6, -6].forEach((x, i) => addChair(group, x, 10 + (i % 2) * 2, i % 2 ? "#7DD3FC" : "#FF7DB5", i * 0.4));
  const fire = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 36), basic("#FFB347", { transparent: true, opacity: 0.58 }));
  fire.rotation.x = -Math.PI / 2; fire.position.set(0, 0.06, 12); fire.renderOrder = 5; group.add(fire);
  const hangoutLabel = makeLabel("BEACH HANGOUT", "#FFB347", [6.2, 1.18]);
  hangoutLabel.position.set(0, 2.55, 8); group.add(hangoutLabel);

  const arrivalLabel = makeLabel("ARRIVAL / TELEPORT", "#EDB84A", [7.4, 1.18]);
  arrivalLabel.position.set(32, 2.75, -13); group.add(arrivalLabel);

  [[13, 1.5, -8], [0, 1.1, 12], [32, 1.4, -8], [-24, 1.1, 18]].forEach(([x, y, z]) => {
    const light = new THREE.PointLight(new THREE.Color("#FFD08A"), 0.82, 10);
    light.position.set(x, y, z); group.add(light);
  });

  scene.add(group);
  scene.userData.beachResortDecor = group;
}