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
  const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), basic("#DDBB7B", { transparent: true, opacity: 0.58 }));
  dune.position.set(x, 0.16, z);
  dune.scale.set(sx, 0.26, sz);
  group.add(dune);
}

function addPalmCluster(group, x, z) {
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * 1.8;
    const pz = z + (i % 2) * 1.1;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 1.9, 8), standard("#8B5A2B"));
    trunk.position.set(px, 0.95, pz);
    trunk.rotation.z = i === 1 ? -0.15 : 0.12;
    group.add(trunk);
    const leafMat = basic("#2E9F63", { transparent: true, opacity: 0.88 });
    for (let j = 0; j < 5; j++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.26), leafMat.clone());
      leaf.position.set(px, 1.88, pz);
      leaf.rotation.set(0.2, (j / 5) * Math.PI * 2, 0.24);
      group.add(leaf);
    }
  }
}

export function createBeachEdgeDesign(scene) {
  const group = new THREE.Group();
  group.name = "beachNaturalEdges";

  const leftWater = new THREE.Mesh(new THREE.PlaneGeometry(12, 92), basic("#4EA4D8", { transparent: true, opacity: 0.42 }));
  leftWater.rotation.x = -Math.PI / 2;
  leftWater.position.set(-62, 0.002, 12);
  group.add(leftWater);
  const rightWater = leftWater.clone();
  rightWater.position.x = 62;
  group.add(rightWater);

  const northDune = new THREE.Mesh(new THREE.PlaneGeometry(116, 5.4), basic("#D8B574", { transparent: true, opacity: 0.36 }));
  northDune.rotation.x = -Math.PI / 2;
  northDune.position.set(0, 0.018, -24.5);
  northDune.renderOrder = 2;
  group.add(northDune);

  [-48, -30, -12, 12, 32, 50].forEach((x, i) => addDune(group, x, -25.6 + (i % 2), 5.2, 1.5));
  [-54, -50, -46, 48, 52, 56, -44, 44].forEach((x, i) => addRock(group, x, -18 + (i % 3) * 12, 1.5, 0.8, 1.1, i % 2 ? "#A28B72" : "#7D6E61"));
  [-46, 46, -52, 52].forEach((x, i) => addRock(group, x, 33 + (i % 2) * 5, 1.9, 0.95, 1.25, "#887968"));
  addPalmCluster(group, -48, 24);
  addPalmCluster(group, 50, 28);
  addPalmCluster(group, -42, -16);

  const railMat = basic("#F8D38A", { transparent: true, opacity: 0.5 });
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.16), railMat.clone());
    rail.rotation.x = -Math.PI / 2;
    rail.rotation.z = side * 0.08;
    rail.position.set(side * 43, 0.08, 28.5);
    rail.renderOrder = 4;
    group.add(rail);
  });

  const horizonFog = new THREE.Mesh(new THREE.PlaneGeometry(132, 9), basic("#CDEEFF", { transparent: true, opacity: 0.18 }));
  horizonFog.position.set(0, 4.2, 64);
  horizonFog.renderOrder = 1;
  horizonFog.userData.isNeonSign = true;
  group.add(horizonFog);

  scene.add(group);
  scene.userData.beachNaturalEdges = group;
}