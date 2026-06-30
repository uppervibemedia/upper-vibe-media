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

function addPalmCluster(group, x, z) {
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * 1.8;
    const pz = z + (i % 2) * 1.1;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 1.9, 8), standard("#8B5A2B"));
    trunk.position.set(px, 0.95, pz); trunk.rotation.z = i === 1 ? -0.15 : 0.12; group.add(trunk);
    const leafMat = basic("#2E9F63", { transparent: true, opacity: 0.88 });
    for (let j = 0; j < 5; j++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.26), leafMat.clone());
      leaf.position.set(px, 1.88, pz); leaf.rotation.set(0.2, (j / 5) * Math.PI * 2, 0.24); group.add(leaf);
    }
  }
}

export function createBeachEdgeDesign(scene) {
  const group = new THREE.Group();
  group.name = "beachNaturalEdges";

  const waterMat = basic("#3E9ED3", { transparent: true, opacity: 0.5 });
  [[-68, 12, 18, 100], [68, 12, 18, 100], [0, -34, 150, 16], [0, 56, 150, 18]].forEach(([x, z, w, d]) => {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat.clone());
    water.rotation.x = -Math.PI / 2; water.position.set(x, 0.001, z); group.add(water);
  });

  const edgeGlow = new THREE.Mesh(new THREE.RingGeometry(58.5, 60, 128), basic("#56DFFF", { transparent: true, opacity: 0.16 }));
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
  [-50, -36, 34, 50, -18, 18].forEach((x, i) => addRock(group, x, 38 + (i % 2) * 5, 2.0, 0.9, 1.3, "#887968"));
  addPalmCluster(group, -52, 24); addPalmCluster(group, 52, 24); addPalmCluster(group, -42, -22); addPalmCluster(group, 44, -21);

  const railMat = basic("#F8D38A", { transparent: true, opacity: 0.48 });
  [[46, 24, 18, 0.12], [-42, 26, 14, -0.12], [31, -3, 12, 0.35]].forEach(([x, z, w, rot]) => {
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.16), railMat.clone());
    rail.rotation.x = -Math.PI / 2; rail.rotation.z = rot; rail.position.set(x, 0.08, z); rail.renderOrder = 6; group.add(rail);
  });

  const fog = new THREE.Mesh(new THREE.PlaneGeometry(150, 10), basic("#CDEEFF", { transparent: true, opacity: 0.2 }));
  fog.position.set(0, 4.2, 66); fog.renderOrder = 1; fog.userData.isNeonSign = true; group.add(fog);

  scene.add(group);
  scene.userData.beachNaturalEdges = group;
}