import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.9, metalness: 0.02 });
}

function addRock(group, x, z, sx, sy, sz, color = "#8D7863") {
  const rock = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), standard(color));
  rock.position.set(x, sy * 0.42, z);
  rock.scale.set(sx, sy, sz);
  rock.rotation.set(0.12, x * 0.03, -0.08);
  group.add(rock);
}

function addDune(group, x, z, sx, sz) {
  const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), basic("#DDBB7B", { transparent: true, opacity: 0.54 }));
  dune.position.set(x, 0.16, z);
  dune.scale.set(sx, 0.24, sz);
  group.add(dune);
}

function addPalmCluster(group, x, z, scale = 1) {
  const tallScale = scale * 1.75;
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * 1.85 * scale;
    const pz = z + (i % 2) * 1.15 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * tallScale, 0.18 * tallScale, 2.15 * tallScale, 8), standard("#7A4E2A"));
    trunk.position.set(px, 1.08 * tallScale, pz); trunk.rotation.z = i === 1 ? -0.15 : 0.12; group.add(trunk);
    const leafMat = basic("#247D55", { transparent: true, opacity: 0.9 });
    for (let j = 0; j < 6; j++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.45 * tallScale, 0.07 * tallScale, 0.3 * tallScale), leafMat.clone());
      leaf.position.set(px, 2.1 * tallScale, pz); leaf.rotation.set(0.18, (j / 6) * Math.PI * 2, 0.24); group.add(leaf);
    }
  }
}

function addResortHut(group, x, z, rot = 0) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.25, 2.4), standard("#D5D0C2"));
  base.position.set(x, 0.64, z); base.rotation.y = rot; group.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 0.85, 4), standard("#5F7280"));
  roof.position.set(x, 1.62, z); roof.rotation.y = Math.PI / 4 + rot; group.add(roof);
}

function addWaterfall(group, x, width, height) {
  const fallsMat = basic("#8FEAFF", { transparent: true, opacity: 0.58 });
  const falls = new THREE.Mesh(new THREE.PlaneGeometry(width, height), fallsMat);
  falls.position.set(x, height / 2 + 0.7, -27.65);
  falls.renderOrder = 11;
  group.add(falls);

  const shine = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.35, height * 0.92), basic("#FFFFFF", { transparent: true, opacity: 0.28 }));
  shine.position.set(x - width * 0.15, height / 2 + 0.85, -27.6);
  shine.renderOrder = 12;
  group.add(shine);

  const pool = new THREE.Mesh(new THREE.CircleGeometry(width * 1.55, 28), basic("#42C8E8", { transparent: true, opacity: 0.42 }));
  pool.rotation.x = -Math.PI / 2;
  pool.scale.z = 0.45;
  pool.position.set(x, 0.07, -23.5);
  pool.renderOrder = 9;
  group.add(pool);

  const foam = new THREE.Mesh(new THREE.RingGeometry(width * 1.08, width * 1.48, 28), basic("#FFFFFF", { transparent: true, opacity: 0.32 }));
  foam.rotation.x = -Math.PI / 2;
  foam.scale.z = 0.45;
  foam.position.set(x, 0.09, -23.5);
  foam.renderOrder = 10;
  group.add(foam);
}

function addCliffWall(group) {
  const cliffMats = [standard("#6F746E"), standard("#5D665F"), standard("#7D7464")];
  const cliffXs = [-60, -48, -36, -24, -12, 0, 12, 24, 36, 48, 60];
  cliffXs.forEach((x, i) => {
    const height = 6.8 + (i % 4) * 1.3 + (i === 5 ? 2.2 : 0);
    const width = 9.5 + (i % 3) * 1.7;
    const depth = 5.5 + (i % 2) * 1.4;
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.42, width * 0.58, height, 6), cliffMats[i % cliffMats.length]);
    cliff.position.set(x, height / 2 - 0.1, -30 - (i % 2) * 0.8);
    cliff.scale.z = depth / width;
    cliff.rotation.y = (i - 5) * 0.08;
    group.add(cliff);

    addRock(group, x + 3.5, -24.5 + (i % 2), 2.3, 1.05, 1.35, i % 2 ? "#79716A" : "#646C66");
  });

  addWaterfall(group, -34, 3.0, 6.8);
  addWaterfall(group, 0, 3.6, 8.4);
  addWaterfall(group, 33, 2.8, 6.2);

  [-54, -42, -22, -8, 16, 30, 46, 56].forEach((x, i) => addPalmCluster(group, x, -22.5 + (i % 2) * 1.8, 1.18));

  const invisibleWall = new THREE.Mesh(new THREE.BoxGeometry(138, 9, 2.5), basic("#000000", { transparent: true, opacity: 0 }));
  invisibleWall.position.set(0, 4.5, -28.5);
  invisibleWall.name = "beachBackInvisibleCollisionWall";
  group.add(invisibleWall);
}

export function createBeachEdgeDesign(scene) {
  const group = new THREE.Group();
  group.name = "beachNaturalEdges";

  const waterMat = basic("#2F91B6", { transparent: true, opacity: 0.48 });
  [[-68, 12, 18, 100], [68, 12, 18, 100], [0, -34, 150, 16], [0, 56, 150, 18]].forEach(([x, z, w, d]) => {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat.clone());
    water.rotation.x = -Math.PI / 2; water.position.set(x, 0.001, z); group.add(water);
  });

  const edgeGlow = new THREE.Mesh(new THREE.RingGeometry(58.5, 60, 128), basic("#7DEBFF", { transparent: true, opacity: 0.13 }));
  edgeGlow.rotation.x = -Math.PI / 2;
  edgeGlow.scale.y = 0.72;
  edgeGlow.position.set(0, 0.04, 9);
  edgeGlow.renderOrder = 7;
  group.add(edgeGlow);

  const foamEdge = new THREE.Mesh(new THREE.RingGeometry(55, 56, 128), basic("#FFFFFF", { transparent: true, opacity: 0.14 }));
  foamEdge.rotation.x = -Math.PI / 2;
  foamEdge.scale.y = 0.72;
  foamEdge.position.set(0, 0.05, 9);
  foamEdge.renderOrder = 8;
  group.add(foamEdge);

  [-55, -38, -20, 0, 22, 42, 58].forEach((x, i) => addDune(group, x, -29 + (i % 2), 5.2, 1.4));
  [-54, -58, -50, 50, 58, 54, -48, 48].forEach((x, i) => addRock(group, x, -22 + (i % 4) * 13, 1.6, 0.8, 1.15, i % 2 ? "#A28B72" : "#7D6E61"));
  [-50, -36, 34, 50, -18, 18].forEach((x, i) => addRock(group, x, 34 + (i % 2) * 4, 2.0, 0.9, 1.3, "#887968"));
  addPalmCluster(group, -52, 20, 1.05); addPalmCluster(group, 52, 20, 1.05); addPalmCluster(group, -42, -22, 1.15); addPalmCluster(group, 44, -21, 1.15);
  addPalmCluster(group, -16, -32, 1.25); addPalmCluster(group, 12, -33, 1.2); addPalmCluster(group, 30, -29, 1.08);
  addRock(group, -5, -31, 4.2, 1.25, 1.8, "#7F715F");
  addRock(group, 20, -30, 3.4, 1.1, 1.6, "#99846A");
  addCliffWall(group);

  const railMat = basic("#F8D38A", { transparent: true, opacity: 0.48 });
  [[46, 24, 18, 0.12], [-42, 26, 14, -0.12], [31, -3, 12, 0.35]].forEach(([x, z, w, rot]) => {
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.16), railMat.clone());
    rail.rotation.x = -Math.PI / 2; rail.rotation.z = rot; rail.position.set(x, 0.08, z); rail.renderOrder = 6; group.add(rail);
  });

  scene.add(group);
  scene.userData.beachNaturalEdges = group;
}