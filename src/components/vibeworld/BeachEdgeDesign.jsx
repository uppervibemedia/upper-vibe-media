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
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * 1.8 * scale;
    const pz = z + (i % 2) * 1.1 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.18 * scale, 1.9 * scale, 8), standard("#8B5A2B"));
    trunk.position.set(px, 0.95 * scale, pz); trunk.rotation.z = i === 1 ? -0.15 : 0.12; group.add(trunk);
    const leafMat = basic("#2E9F63", { transparent: true, opacity: 0.88 });
    for (let j = 0; j < 5; j++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.25 * scale, 0.07 * scale, 0.26 * scale), leafMat.clone());
      leaf.position.set(px, 1.88 * scale, pz); leaf.rotation.set(0.2, (j / 5) * Math.PI * 2, 0.24); group.add(leaf);
    }
  }
}

function addResortHut(group, x, z, rot = 0) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.25, 2.4), standard("#D9B875"));
  base.position.set(x, 0.64, z); base.rotation.y = rot; group.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 0.85, 4), standard("#B9753C"));
  roof.position.set(x, 1.62, z); roof.rotation.y = Math.PI / 4 + rot; group.add(roof);
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
  addPalmCluster(group, -52, 24, 1.05); addPalmCluster(group, 52, 24, 1.05); addPalmCluster(group, -42, -22, 1.15); addPalmCluster(group, 44, -21, 1.15);
  addPalmCluster(group, -16, -32, 1.25); addPalmCluster(group, 12, -33, 1.2); addPalmCluster(group, 30, -29, 1.08);
  addRock(group, -5, -31, 4.2, 1.25, 1.8, "#7F715F");
  addRock(group, 20, -30, 3.4, 1.1, 1.6, "#99846A");
  addResortHut(group, 4, -27, 0.18);

  const railMat = basic("#F8D38A", { transparent: true, opacity: 0.48 });
  [[46, 24, 18, 0.12], [-42, 26, 14, -0.12], [31, -3, 12, 0.35]].forEach(([x, z, w, rot]) => {
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.16), railMat.clone());
    rail.rotation.x = -Math.PI / 2; rail.rotation.z = rot; rail.position.set(x, 0.08, z); rail.renderOrder = 6; group.add(rail);
  });

  scene.add(group);
  scene.userData.beachNaturalEdges = group;
}