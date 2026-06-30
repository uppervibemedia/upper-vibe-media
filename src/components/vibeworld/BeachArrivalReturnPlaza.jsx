import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opts.roughness ?? 0.55, metalness: opts.metalness ?? 0.14 });
}

function makeLabel(text, colorHex, scale = [7.2, 1.05]) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 14;
  ctx.font = "900 34px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 384, 64);
  ctx.fillText(text, 384, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(...scale, 1);
  sprite.renderOrder = 90;
  sprite.userData.isNeonSign = true;
  return sprite;
}

function addPalm(group, x, z, scale = 0.75) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 2.7 * scale, 8), standard("#7A4E2A", { roughness: 0.78 }));
  trunk.position.set(x, 1.35 * scale, z);
  trunk.rotation.z = 0.12;
  group.add(trunk);
  const leafMat = basic("#247D55", { transparent: true, opacity: 0.9 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.65 * scale, 0.08 * scale, 0.32 * scale), leafMat.clone());
    leaf.position.set(x, 2.58 * scale, z);
    leaf.rotation.set(0.16, (i / 6) * Math.PI * 2, 0.24);
    group.add(leaf);
  }
}

export function createBeachArrivalReturnPlaza(scene) {
  const group = new THREE.Group();
  group.name = "beachArrivalReturnPlaza";
  const x = 10;
  const signZ = 12;
  const padZ = 16;

  const plazaRing = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.15, 64), basic("#7DEBFF", { transparent: true, opacity: 0.28 }));
  plazaRing.rotation.x = -Math.PI / 2;
  plazaRing.position.set(x, 0.045, padZ);
  plazaRing.renderOrder = 8;
  group.add(plazaRing);

  const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.42, 0.72), standard("#B9AA88", { roughness: 0.7, metalness: 0.06 }));
  stoneBase.position.set(x, 0.25, signZ);
  group.add(stoneBase);

  const bambooRail = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.18, 0.22), standard("#9B7142", { roughness: 0.68, metalness: 0.06 }));
  bambooRail.position.set(x, 1.05, signZ - 0.08);
  group.add(bambooRail);

  for (const sx of [-3.35, 3.35]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.65, 10), standard("#85613E"));
    post.position.set(x + sx, 0.9, signZ);
    group.add(post);
  }

  const label = makeLabel("UPPER VIBE BEACH", "#7DEBFF");
  label.position.set(x, 1.82, signZ - 0.12);
  group.add(label);

  [[x - 4.6, signZ + 0.8], [x + 4.4, signZ + 0.8], [x - 3.8, padZ + 3.4], [x + 3.8, padZ + 3.4]].forEach(([rx, rz], i) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(i < 2 ? 0.48 : 0.36), standard(i % 2 ? "#8B887D" : "#B8AA93", { roughness: 0.82, metalness: 0.04 }));
    rock.position.set(rx, 0.32, rz);
    rock.rotation.set(0.2 * i, 0.5 * i, 0.1);
    group.add(rock);
  });

  addPalm(group, x - 5.4, signZ + 1.5, 0.68);
  addPalm(group, x + 5.3, signZ + 1.3, 0.64);

  const glowLine = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 7.5), basic("#E8D8B8", { transparent: true, opacity: 0.16 }));
  glowLine.rotation.x = -Math.PI / 2;
  glowLine.position.set(x, 0.04, 14.5);
  glowLine.renderOrder = 5;
  group.add(glowLine);

  const light = new THREE.PointLight(new THREE.Color("#7DEBFF"), 1.6, 18);
  light.position.set(x, 2.2, padZ);
  group.add(light);

  scene.add(group);
  scene.userData.beachArrivalReturnPlaza = group;
}