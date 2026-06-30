import * as THREE from "three";

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.82, metalness: 0.03 });
}

export function createBeachPremiumPolish(scene, { shorelineZ = 35, isMobile = false } = {}) {
  const group = new THREE.Group();
  group.name = "beachPremiumPolish";
  const waveBands = [];
  const sandBands = [];

  const sandColors = ["#E6D3AA", "#D7BE86", "#F0DDB6", "#CFAA72"];
  const bandCount = isMobile ? 8 : 13;
  for (let i = 0; i < bandCount; i++) {
    const w = 18 + (i % 5) * 9;
    const d = 1.2 + (i % 3) * 0.55;
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basic(sandColors[i % sandColors.length], 0.12 + (i % 2) * 0.045));
    band.rotation.x = -Math.PI / 2;
    band.rotation.z = -0.18 + (i % 5) * 0.09;
    band.position.set(-45 + (i * 8.5) % 92, 0.024 + i * 0.0007, -24 + (i * 6.2) % 55);
    band.renderOrder = 3;
    group.add(band);
    sandBands.push(band);
  }

  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(150, 8), basic("#62E6E8", 0.22));
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.set(0, 0.018, shorelineZ + 4.2);
  shallow.renderOrder = 4;
  group.add(shallow);

  const mid = new THREE.Mesh(new THREE.PlaneGeometry(150, 18), basic("#1FAFD0", 0.18));
  mid.rotation.x = -Math.PI / 2;
  mid.position.set(0, 0.015, shorelineZ + 17);
  mid.renderOrder = 3;
  group.add(mid);

  const deep = new THREE.Mesh(new THREE.PlaneGeometry(150, 34), basic("#095E94", 0.22));
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(0, 0.012, shorelineZ + 43);
  deep.renderOrder = 2;
  group.add(deep);

  const transition = new THREE.Mesh(new THREE.PlaneGeometry(150, 2.6), basic("#CFE7C9", 0.2));
  transition.rotation.x = -Math.PI / 2;
  transition.position.set(0, 0.032, shorelineZ - 0.85);
  transition.renderOrder = 6;
  group.add(transition);

  const waveCount = isMobile ? 6 : 10;
  for (let i = 0; i < waveCount; i++) {
    const wave = new THREE.Mesh(new THREE.PlaneGeometry(38 + (i % 4) * 13, 0.18 + (i % 2) * 0.08), basic(i % 2 ? "#BFFFFF" : "#FFFFFF", 0.12));
    wave.rotation.x = -Math.PI / 2;
    wave.rotation.z = -0.06 + (i % 3) * 0.04;
    wave.position.set(-40 + (i * 17) % 86, 0.038 + i * 0.0004, shorelineZ + 1.3 + i * 5.3);
    wave.renderOrder = 7;
    wave.userData = { baseZ: wave.position.z, phase: i * 0.73, baseOpacity: 0.08 + (i % 3) * 0.035 };
    group.add(wave);
    waveBands.push(wave);
  }

  const detailMat = standard("#B99465");
  const shellMat = standard("#FFE3A1");
  const detailCount = isMobile ? 14 : 24;
  for (let i = 0; i < detailCount; i++) {
    const isShell = i % 3 === 0;
    const mesh = new THREE.Mesh(isShell ? new THREE.SphereGeometry(0.18, 10, 6) : new THREE.DodecahedronGeometry(0.16 + (i % 4) * 0.035, 0), isShell ? shellMat : detailMat);
    mesh.position.set(-54 + (i * 7.7) % 106, 0.08, -20 + (i * 5.1) % 52);
    mesh.scale.set(isShell ? 1.35 : 1.15, isShell ? 0.42 : 0.5, isShell ? 0.72 : 0.95);
    mesh.rotation.set(0, i * 0.9, 0.1);
    group.add(mesh);
  }

  scene.add(group);
  scene.userData.beachPremiumPolish = { group, waveBands, sandBands, shallow, transition };
}

export function animateBeachPremiumPolish(scene, t, mobileThrottle = false) {
  const polish = scene.userData.beachPremiumPolish;
  if (!polish) return;
  const { waveBands = [], sandBands = [], shallow, transition } = polish;
  waveBands.forEach((wave, i) => {
    wave.position.z = wave.userData.baseZ + Math.sin(t * 0.72 + wave.userData.phase) * 0.34;
    wave.material.opacity = wave.userData.baseOpacity + Math.sin(t * 1.05 + i) * 0.035;
  });
  if (!mobileThrottle) {
    sandBands.forEach((band, i) => { band.material.opacity = 0.11 + Math.sin(t * 0.22 + i) * 0.025; });
  }
  if (shallow?.material) shallow.material.opacity = 0.2 + Math.sin(t * 0.6) * 0.025;
  if (transition?.material) transition.material.opacity = 0.17 + Math.sin(t * 0.85) * 0.035;
}