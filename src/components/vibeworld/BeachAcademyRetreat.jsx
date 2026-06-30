import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opts.roughness ?? 0.48, metalness: opts.metalness ?? 0.12, transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
}

function makeLabel(text, colorHex, scale = [5, 0.9]) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 16;
  ctx.font = "900 28px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 256, 48);
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(...scale, 1);
  sprite.renderOrder = 80;
  sprite.userData.isNeonSign = true;
  return sprite;
}

function addPalm(group, x, z, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 3.2 * scale, 8), standard("#7A4E2A", { roughness: 0.72 }));
  trunk.position.set(x, 1.6 * scale, z);
  trunk.rotation.z = 0.12;
  group.add(trunk);
  const leafMat = basic("#247D55", { transparent: true, opacity: 0.92 });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.1 * scale, 0.08 * scale, 0.36 * scale), leafMat.clone());
    leaf.position.set(x, 3.12 * scale, z);
    leaf.rotation.set(0.18, (i / 7) * Math.PI * 2, 0.24);
    group.add(leaf);
  }
}

function addLessonBoard(group, x, z, title, color, rot = 0) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.15, 0.12), standard("#10202A", { roughness: 0.26, metalness: 0.38 }));
  board.position.set(x, 1.05, z);
  board.rotation.y = rot;
  group.add(board);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.95), basic(color, { transparent: true, opacity: 0.15 }));
  glow.position.set(x + Math.sin(rot) * 0.08, 1.07, z + Math.cos(rot) * 0.08);
  glow.rotation.y = rot;
  group.add(glow);
  const label = makeLabel(title, color, [2.6, 0.5]);
  label.position.set(x, 1.85, z + 0.08);
  group.add(label);
}

function addMat(group, x, z, color, rot = 0) {
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.55), basic(color, { transparent: true, opacity: 0.72 }));
  mat.rotation.x = -Math.PI / 2;
  mat.rotation.z = rot;
  mat.position.set(x, 0.07, z);
  mat.renderOrder = 9;
  group.add(mat);
}

export function createBeachAcademyRetreat(scene) {
  const group = new THREE.Group();
  group.name = "beachVibeAcademyRetreat";
  const cx = -18;
  const cz = 16;

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.8, 0.16, 44), standard("#D8C69E", { roughness: 0.58, metalness: 0.08 }));
  floor.position.set(cx, 0.08, cz);
  floor.receiveShadow = true;
  group.add(floor);

  const teachingRing = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.45, 52), basic("#7DEBFF", { transparent: true, opacity: 0.42 }));
  teachingRing.rotation.x = -Math.PI / 2;
  teachingRing.position.set(cx, 0.18, cz);
  teachingRing.renderOrder = 10;
  group.add(teachingRing);

  const roof = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.9, 0.26, 6), standard("#E7D4A3", { roughness: 0.44, metalness: 0.18 }));
  roof.position.set(cx, 3.0, cz);
  roof.rotation.y = Math.PI / 6;
  group.add(roof);

  for (const [px, pz] of [[-22.4, 12.2], [-13.6, 12.2], [-22.4, 19.8], [-13.6, 19.8]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.85, 10), standard("#85613E"));
    post.position.set(px, 1.48, pz);
    group.add(post);
  }

  [[-20.5, 15.2, "#7DD7E8", -0.35], [-18, 13.8, "#D9C27C", 0], [-15.5, 15.2, "#B58CFF", 0.35], [-20.5, 17.8, "#D9C27C", 0.35], [-15.5, 17.8, "#7DD7E8", -0.35]].forEach(([x, z, c, r]) => addMat(group, x, z, c, r));

  addLessonBoard(group, -24.2, 15, "MANIFEST", "#B58CFF", Math.PI / 2);
  addLessonBoard(group, -11.8, 15, "432 HZ", "#7DEBFF", -Math.PI / 2);
  addLessonBoard(group, -18, 9.8, "DAILY PRACTICE", "#FFD08A", 0);

  const title = makeLabel("VIBE ACADEMY RETREAT", "#B58CFF", [6.2, 0.92]);
  title.position.set(cx, 3.75, cz - 2.9);
  group.add(title);

  const pathMat = basic("#E8D8B8", { transparent: true, opacity: 0.28 });
  [[-18, 23.2, 3.0, 12, 0], [-25.5, 20.5, 2.4, 12, 0.7], [-8.5, 18.5, 2.2, 11, -0.8]].forEach(([x, z, w, d, rot]) => {
    const path = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat.clone());
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = rot;
    path.position.set(x, 0.045, z);
    path.renderOrder = 5;
    group.add(path);
  });

  [[-27, 12, 0.9], [-26, 20, 0.8], [-10, 12, 0.85], [-9, 21, 0.75]].forEach(([x, z, s]) => addPalm(group, x, z, s));

  const waterView = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 36), basic("#55E8FF", { transparent: true, opacity: 0.38 }));
  waterView.rotation.x = -Math.PI / 2;
  waterView.position.set(-18, 0.2, 20.5);
  waterView.renderOrder = 11;
  group.add(waterView);

  const light = new THREE.PointLight(new THREE.Color("#B58CFF"), 2.2, 18);
  light.position.set(cx, 3.3, cz);
  group.add(light);
  const cyanLight = new THREE.PointLight(new THREE.Color("#7DEBFF"), 1.2, 14);
  cyanLight.position.set(-12, 2.2, 15);
  group.add(cyanLight);

  scene.add(group);
  scene.userData.beachAcademyRetreat = group;
}