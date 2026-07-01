import * as THREE from "three";

const trunkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#7A4E2A"), roughness: 0.86, metalness: 0.05 });
const trunkBandMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#A16B3A"), roughness: 0.82, metalness: 0.04 });
const frondMats = ["#16B8A8", "#23D7C7", "#2AA7FF", "#8B6CFF"].map((color) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide }));
const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#65F4FF"), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });

export function addNeonPalm(parent, x, z, scale = 1, opts = {}) {
  const group = new THREE.Group();
  const lean = opts.lean ?? 0.12;
  const leanDir = opts.leanDir ?? (x < 0 ? 1 : -1);
  const height = 2.85 * scale;
  group.position.set(x, 0, z);
  group.rotation.y = opts.rot ?? 0;

  for (let i = 0; i < 4; i++) {
    const progress = (i + 0.5) / 4;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14 * scale, 0.21 * scale, height / 4 + 0.04 * scale, 7),
      i % 2 ? trunkMat : trunkBandMat
    );
    seg.position.set(leanDir * lean * scale * progress * 1.15, height * progress, 0);
    seg.rotation.z = leanDir * lean * 0.24;
    group.add(seg);
  }

  const crown = new THREE.Group();
  crown.position.set(leanDir * lean * scale * 1.3, height + 0.08 * scale, 0);
  const fronds = opts.fronds ?? 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + (opts.frondOffset || 0);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.24 * scale, 2.05 * scale * (0.88 + (i % 3) * 0.07), 4), frondMats[i % frondMats.length]);
    leaf.position.set(Math.cos(a) * 0.58 * scale, Math.sin(i * 1.7) * 0.08 * scale, Math.sin(a) * 0.58 * scale);
    leaf.rotation.set(Math.PI / 2 + 0.28, 0, -a + Math.PI / 2);
    leaf.scale.z = 0.55;
    crown.add(leaf);
  }

  const crownGlow = new THREE.Mesh(new THREE.SphereGeometry(0.82 * scale, 10, 6), glowMat);
  crownGlow.scale.y = 0.42;
  crownGlow.renderOrder = 8;
  crown.add(crownGlow);
  group.add(crown);

  group.userData.isNeonPalm = true;
  parent.add(group);
  return group;
}

export function addNeonPalmCluster(parent, x, z, scale = 1, opts = {}) {
  const count = opts.count ?? 3;
  const spacing = opts.spacing ?? 1.85;
  for (let i = 0; i < count; i++) {
    const off = i - (count - 1) / 2;
    addNeonPalm(parent, x + off * spacing * scale, z + (i % 2) * 1.05 * scale, scale * (0.9 + (i % 3) * 0.09), {
      lean: 0.1 + (i % 2) * 0.07,
      leanDir: i % 2 ? 1 : -1,
      rot: (i - 1) * 0.16,
      frondOffset: i * 0.28,
    });
  }
}