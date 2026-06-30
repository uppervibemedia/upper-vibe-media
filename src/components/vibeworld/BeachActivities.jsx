import * as THREE from "three";

export const BEACH_SHELLS = [
  { id: "shell_1", x: 24, z: 3 }, { id: "shell_2", x: 8, z: 21 },
  { id: "shell_3", x: -12, z: 8 }, { id: "shell_4", x: -30, z: 26 },
  { id: "shell_5", x: -50, z: 15 }, { id: "shell_6", x: 43, z: 18 },
  { id: "shell_7", x: -4, z: -17 }, { id: "shell_8", x: 35, z: -4 },
  { id: "shell_9", x: -24, z: -8 }, { id: "shell_10", x: 16, z: 31 },
];

export const BEACH_ACTIVITY_POINTS = {
  questBoard: { x: 29, z: -10, radius: 7 },
  bonfire: { x: 0, z: 14, radius: 7 },
  photoSpot: { x: 45, z: 27, radius: 6 },
  surf: { x: -24, z: 33, radius: 7 },
  dive: { x: 32, z: 33, radius: 7 },
};

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: opts.depthWrite ?? false, side: THREE.DoubleSide });
}

function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opts.roughness ?? 0.5, metalness: opts.metalness ?? 0.18, transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
}

function label(text, color = "#00E5FF", scale = [5, 0.9]) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = color;
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
  sprite.scale.set(scale[0], scale[1], 1);
  sprite.renderOrder = 60;
  sprite.userData.isNeonSign = true;
  return sprite;
}

function addQuestBoard(group) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 0.22), standard("#1A2640", { roughness: 0.36, metalness: 0.45 }));
  board.position.set(29, 1.45, -11.5);
  board.rotation.y = -0.12;
  group.add(board);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.55), basic("#00E5FF", { transparent: true, opacity: 0.18 }));
  glow.position.set(29, 1.48, -11.34);
  glow.rotation.y = -0.12;
  group.add(glow);
  const title = label("DAILY BEACH QUEST", "#FFD36E", [5.5, 0.82]);
  title.position.set(29, 2.9, -11.2);
  group.add(title);
}

function addBonfire(group) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.75, 36), basic("#FFB347", { transparent: true, opacity: 0.62 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.075, 14);
  group.add(ring);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.1, 12), basic("#FF7A2F", { transparent: true, opacity: 0.88 }));
  flame.position.set(0, 0.7, 14);
  group.add(flame);
  group.userData.bonfireFlame = flame;
  [[-3, 12.4, 0.45], [3, 12.4, -0.45], [-3.4, 15.8, -0.55], [3.4, 15.8, 0.55], [0, 17.1, 0]].forEach(([x, z, r], i) => {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.9), standard(i % 2 ? "#7DD7E8" : "#D9C27C", { roughness: 0.85, metalness: 0.05 }));
    cushion.position.set(x, 0.13, z);
    cushion.rotation.y = r;
    group.add(cushion);
  });
  const sign = label("BONFIRE HANGOUT", "#FFB347", [5.2, 0.8]);
  sign.position.set(0, 2.25, 11.1);
  group.add(sign);
}

function addPhotoSpot(group) {
  const frame = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.045, 8, 72), basic("#00E5FF", { transparent: true, opacity: 0.78 }));
  frame.position.set(45, 2.25, 27);
  frame.rotation.set(Math.PI / 2, 0.2, 0);
  group.add(frame);
  const platform = new THREE.Mesh(new THREE.CircleGeometry(2.4, 36), basic("#E6D8BC", { transparent: true, opacity: 0.34 }));
  platform.rotation.x = -Math.PI / 2;
  platform.position.set(45, 0.06, 27);
  group.add(platform);
  const beachSign = label("UPPER VIBE BEACH", "#FFD36E", [6.2, 0.95]);
  beachSign.position.set(45, 3.45, 25.7);
  group.add(beachSign);
  const photo = label("PHOTO SPOT", "#00E5FF", [4.1, 0.72]);
  photo.position.set(45, 1.25, 24.7);
  group.add(photo);
}

function addTreasureShells(group) {
  group.userData.shells = [];
  for (const shell of BEACH_SHELLS) {
    const sg = new THREE.Group();
    sg.name = `beachShell_${shell.id}`;
    sg.position.set(shell.x, 0.18, shell.z);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8), standard("#FFD36E", { roughness: 0.42, metalness: 0.34 }));
    body.scale.set(1.15, 0.48, 0.72);
    sg.add(body);
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 24), basic("#FFF4B8", { transparent: true, opacity: 0.34 }));
    aura.rotation.x = -Math.PI / 2;
    sg.add(aura);
    sg.userData.shellId = shell.id;
    group.add(sg);
    group.userData.shells.push(sg);
  }
}

function addSurfPreview(group) {
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(22, 4.2), basic("#7FE8F4", { transparent: true, opacity: 0.18 }));
  lane.rotation.x = -Math.PI / 2;
  lane.rotation.z = -0.18;
  lane.position.set(-30, 0.035, 39);
  group.add(lane);

  const rack = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 0.55), standard("#85613E"));
  rack.position.set(-24, 0.32, 31.8);
  group.add(rack);
  [-1.15, 0, 1.15].forEach((off, i) => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 2.7), standard(i === 1 ? "#68D7E8" : "#D9C27C", { metalness: 0.12 }));
    board.position.set(-24 + off, 0.58, 31.8);
    board.rotation.set(0.42, -0.2, 0);
    group.add(board);
  });
  [[-28, 36], [-34, 40], [-40, 44]].forEach(([x, z], i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.045, 8, 44), basic("#7FE8F4", { transparent: true, opacity: 0.46 }));
    ring.position.set(x, 1.0, z);
    ring.rotation.set(Math.PI / 2, 0.15 * i, 0);
    group.add(ring);
  });
  const sign = label("SURF ZONE", "#68D7E8", [4.4, 0.72]);
  sign.position.set(-24, 1.85, 29.7);
  group.add(sign);
}

function addDivePreview(group) {
  const dockMat = standard("#A87948", { roughness: 0.72, metalness: 0.06 });
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 4.6), dockMat.clone());
    plank.position.set(30 + i * 0.62, 0.12, 33.2);
    group.add(plank);
  }
  const platform = new THREE.Mesh(new THREE.CircleGeometry(2.1, 36), basic("#42DDF2", { transparent: true, opacity: 0.2 }));
  platform.rotation.x = -Math.PI / 2;
  platform.position.set(34, 0.045, 36.2);
  group.add(platform);
  [[31.5, 37.5], [34.5, 39.8], [37, 36.7]].forEach(([x, z], i) => {
    const coral = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 7), standard(i % 2 ? "#B58CFF" : "#32D6B4", { roughness: 0.55, metalness: 0.08 }));
    coral.position.set(x, 0.62, z);
    coral.rotation.z = (i - 1) * 0.15;
    group.add(coral);
  });
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.8), standard("#7B4E2A", { roughness: 0.52, metalness: 0.18 }));
  chest.position.set(36.5, 0.38, 38.5);
  group.add(chest);
  const sign = label("DIVE ZONE", "#42DDF2", [4.3, 0.72]);
  sign.position.set(32, 1.85, 29.8);
  group.add(sign);
}

export function createBeachActivities(scene) {
  const group = new THREE.Group();
  group.name = "beachActivities";
  addQuestBoard(group);
  addBonfire(group);
  addPhotoSpot(group);
  addTreasureShells(group);
  addSurfPreview(group);
  addDivePreview(group);
  scene.add(group);
  scene.userData.beachActivities = group;
  scene.userData.beachShellMeshes = group.userData.shells;
}

export function animateBeachActivities(scene, t, beat = 0) {
  const group = scene.userData.beachActivities;
  if (!group) return;
  const flame = group.userData.bonfireFlame;
  if (flame) {
    flame.scale.setScalar(0.9 + Math.sin(t * 5.2) * 0.08 + beat * 0.08);
    flame.rotation.y += 0.025;
  }
  const shells = scene.userData.beachShellMeshes || [];
  for (let i = 0; i < shells.length; i++) {
    const shell = shells[i];
    if (!shell.visible) continue;
    shell.position.y = 0.18 + Math.sin(t * 1.8 + i) * 0.08;
    shell.rotation.y += 0.012;
  }
}