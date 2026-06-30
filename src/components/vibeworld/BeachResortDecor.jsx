import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.58, metalness: 0.16 });
}

function makeLabel(text, colorHex, scale = [4.8, 0.94]) {
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
  const tallScale = scale * 1.7;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * tallScale, 0.22 * tallScale, 2.28 * tallScale, 8), standard("#7A4E2A"));
  trunk.position.set(x, 1.14 * tallScale, z); trunk.rotation.z = 0.12; group.add(trunk);
  const leafMat = basic("#247D55", { transparent: true, opacity: 0.92 });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.55 * tallScale, 0.08 * tallScale, 0.32 * tallScale), leafMat.clone());
    leaf.position.set(x, 2.24 * tallScale, z); leaf.rotation.set(0.16, (i / 7) * Math.PI * 2, 0.25); group.add(leaf);
  }
}

function addGlowStone(group, x, z, color = "#B58CFF") {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.46, 24), basic(color, { transparent: true, opacity: 0.52 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.045, z); ring.renderOrder = 6; group.add(ring);
}

function addBeachTowel(group, x, z, color, rot = 0) {
  const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.75), basic(color, { transparent: true, opacity: 0.92 }));
  towel.rotation.x = -Math.PI / 2;
  towel.rotation.z = rot;
  towel.position.set(x, 0.055, z);
  towel.renderOrder = 6;
  group.add(towel);
}

function addBoardwalk(group, x, z, w, rot = 0) {
  const deckMat = standard("#B98E5C");
  for (let i = 0; i < 6; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(w / 6 - 0.08, 0.05, 1.25), deckMat.clone());
    plank.position.set(x + Math.cos(rot) * (i - 2.5) * (w / 6), 0.08, z - Math.sin(rot) * (i - 2.5) * (w / 6));
    plank.rotation.y = rot;
    group.add(plank);
  }
}

function addSmallVilla(group, x, z, rot = 0) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.25, 2.6), standard("#EFE5D4"));
  base.position.set(x, 0.64, z); base.rotation.y = rot; group.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 0.75, 4), standard("#B98B4A"));
  roof.position.set(x, 1.62, z); roof.rotation.y = Math.PI / 4 + rot; group.add(roof);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.0), standard("#B99362"));
  deck.position.set(x + Math.sin(rot) * 1.15, 0.12, z + Math.cos(rot) * 1.15); deck.rotation.y = rot; group.add(deck);
}

function addOpenAirStructure(group, x, z, label, color, rot = 0) {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 2.7), standard("#C4A36A"));
  floor.position.set(x, 0.1, z); floor.rotation.y = rot; group.add(floor);
  for (const sx of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 8), standard("#85613E"));
    post.position.set(x + Math.cos(rot) * sx, 0.9, z - Math.sin(rot) * sx); group.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 3.0), standard("#E7D4A3"));
  roof.position.set(x, 1.8, z); roof.rotation.y = rot; group.add(roof);
  const sign = makeLabel(label, color, [4.6, 0.85]);
  sign.position.set(x, 2.35, z - 1.2); group.add(sign);
}

export function createBeachResortDecor(scene) {
  const group = new THREE.Group();
  group.name = "beachResortDecor";

  const pathMat = basic("#E3D3B2", { transparent: true, opacity: 0.18 });
  [[-34, 27, 22, 1.35, -0.12], [-16, 22, 28, 1.25, 0.08], [0, 18, 30, 1.25, 0.02], [0, 7, 28, 1.35, 0.02], [0, 31, 22, 1.15, 0.0], [35, 31, 22, 1.15, -0.08]].forEach(([x, z, w, d, rot], i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat.clone());
    p.rotation.x = -Math.PI / 2; p.rotation.z = rot; p.position.set(x, 0.03 + i * 0.001, z); p.renderOrder = 3; group.add(p);
  });
  [[-34,28],[-20,24],[0,20],[0,8],[0,32],[35,32],[48,20],[-34,-18]].forEach(([x,z]) => addGlowStone(group, x, z));
  addBoardwalk(group, -34, 28, 8, -0.12);
  addBoardwalk(group, 35, 32, 8, 0.08);

  addPalm(group, -8, 2, 0.88); addPalm(group, 8, 2, 0.82); addPalm(group, 14, 10, 0.86);
  addUmbrella(group, -7, 5, "#DCE6EA"); addUmbrella(group, 7, 5, "#68D7E8");
  addChair(group, -8, 7.2, "#C8CDD2", 0.25); addChair(group, -4, 4.8, "#7DD7E8", -0.2);
  addChair(group, 4, 4.8, "#D9C27C", 0.1); addChair(group, 8, 7.2, "#9CA8B8", -0.35);
  const loungeLabel = makeLabel("RESORT LOUNGE", "#FFD08A", [5.0, 0.9]);
  loungeLabel.position.set(8, 2.0, 2.5); group.add(loungeLabel);

  const cabana = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.75, 2.4), standard("#D5D0C2"));
  cabana.position.set(13, 0.9, 4); group.add(cabana);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.0, 4), standard("#5F7280"));
  roof.position.set(13, 2.25, 4); roof.rotation.y = Math.PI / 4; group.add(roof);

  addSmallVilla(group, -10, -6, -0.18);
  addSmallVilla(group, -24, 8, 0.35);
  addOpenAirStructure(group, -34, -20, "VIBE COASTER", "#68D7E8", 0.2);
  addOpenAirStructure(group, 40, 12, "BEACH BAR", "#FFD08A", -0.28);

  addUmbrella(group, -5, 8, "#D9C27C"); addUmbrella(group, 7, 8, "#80DCEB"); addPalm(group, -9, 11, 0.85); addPalm(group, 11, 11, 0.78);
  [[-7,6.5,"#7DD7E8",0.5],[-3,4.5,"#C8CDD2",-0.2],[3,4.5,"#D9C27C",0.25],[7,6.5,"#9CA8B8",-0.55]].forEach(([x,z,c,r]) => addChair(group, x, z, c, r));
  addBeachTowel(group, -1, 9.2, "#F7B267", 0.28);
  addBeachTowel(group, 4.4, 9.0, "#7DD7E8", -0.18);
  const shade = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.14, 3.2), standard("#E7D4A3"));
  shade.position.set(0, 1.85, 8.2); group.add(shade);
  for (const [x,z] of [[-2.6,6.8],[2.6,6.8],[-2.6,9.6],[2.6,9.6]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.75, 8), standard("#85613E"));
    post.position.set(x, 0.9, z); group.add(post);
  }
  const fire = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.52, 36), basic("#78E7FF", { transparent: true, opacity: 0.5 }));
  fire.rotation.x = -Math.PI / 2; fire.position.set(0, 0.06, 7); fire.renderOrder = 5; group.add(fire);
  const hangoutLabel = makeLabel("BEACH HANGOUT", "#FFB347", [5.0, 0.9]);
  hangoutLabel.position.set(0, 2.05, 3.3); group.add(hangoutLabel);

  const arrivalLabel = makeLabel("ARRIVAL / RETURN", "#EDB84A", [5.4, 0.9]);
  arrivalLabel.position.set(-34, 2.05, 25.2); group.add(arrivalLabel);

  [[-34, 1.5, 25], [0, 1.1, 7], [-34, 1.4, 28], [0, 1.1, 34], [35, 1.2, 34], [40, 1.2, 13]].forEach(([x, y, z]) => {
    const light = new THREE.PointLight(new THREE.Color("#FFD08A"), 0.82, 10);
    light.position.set(x, y, z); group.add(light);
  });

  scene.add(group);
  scene.userData.beachResortDecor = group;
}