import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.76, metalness: 0.04 });
}

function addUmbrella(group, x, z, color) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.55, 8), standard("#8B5A2B"));
  pole.position.set(x, 0.78, z);
  group.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.48, 18), basic(color, { transparent: true, opacity: 0.92 }));
  top.position.set(x, 1.6, z);
  group.add(top);
}

function addChair(group, x, z, color, rot = 0) {
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 1.9), standard(color));
  seat.position.set(x, 0.12, z);
  seat.rotation.y = rot;
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.72), standard(color));
  back.position.set(x - Math.sin(rot) * 0.78, 0.43, z - Math.cos(rot) * 0.78);
  back.rotation.set(0.5, rot, 0);
  group.add(back);
}

function addPalm(group, x, z, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 2.15 * scale, 8), standard("#8B5A2B"));
  trunk.position.set(x, 1.05 * scale, z);
  trunk.rotation.z = 0.12;
  group.add(trunk);
  const leafMat = basic("#31A86A", { transparent: true, opacity: 0.9 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.55 * scale, 0.08 * scale, 0.32 * scale), leafMat.clone());
    leaf.position.set(x, 2.08 * scale, z);
    leaf.rotation.set(0.18, (i / 6) * Math.PI * 2, 0.25);
    group.add(leaf);
  }
}

export function createBeachResortDecor(scene) {
  const group = new THREE.Group();
  group.name = "beachResortDecor";

  const boardwalk = new THREE.Mesh(new THREE.PlaneGeometry(34, 2.4), basic("#D39B5C", { transparent: true, opacity: 0.48 }));
  boardwalk.rotation.x = -Math.PI / 2;
  boardwalk.position.set(2, 0.022, 27.5);
  boardwalk.renderOrder = 2;
  group.add(boardwalk);

  [-30, -25, 15, 23, 38].forEach((x, i) => addPalm(group, x, i % 2 ? 18 : 24, i > 2 ? 0.9 : 1));
  addUmbrella(group, -33, 16, "#FF7DB5");
  addUmbrella(group, -27, 14, "#00DDF5");
  addChair(group, -34.4, 14.2, "#F6C45D", -0.25);
  addChair(group, -31.6, 13.8, "#7DD3FC", 0.15);
  addChair(group, 13.5, 25.6, "#F9A8D4", -0.6);
  addChair(group, 16.3, 25.2, "#B58CFF", -0.55);

  const cabana = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.75, 2.4), standard("#F0D7A0"));
  cabana.position.set(36, 0.9, 22);
  group.add(cabana);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.0, 4), standard("#C87938"));
  roof.position.set(36, 2.25, 22);
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  [[-22, 1.1, 27], [0, 1.1, 27], [22, 1.1, 27], [36, 1.8, 22]].forEach(([x, y, z]) => {
    const light = new THREE.PointLight(new THREE.Color("#FFD08A"), 0.9, 10);
    light.position.set(x, y, z);
    group.add(light);
  });

  scene.add(group);
  scene.userData.beachResortDecor = group;
}