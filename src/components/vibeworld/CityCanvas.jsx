import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { DISTRICTS, COLLISION_BOXES, SPAWN } from "./cityData";

const PLAYER_R = 0.4;
const PLAYER_SPEED = 4;

// ─── Helpers ─────────────────────────────────────────────────
function circleVsAABB(cx, cz, r, bx, bz, hw, hd) {
  const closestX = Math.max(bx - hw, Math.min(cx, bx + hw));
  const closestZ = Math.max(bz - hd, Math.min(cz, bz + hd));
  const dx = cx - closestX, dz = cz - closestZ;
  return (dx * dx + dz * dz) < (r * r);
}

function resolveCollisions(x, z, r, boxes) {
  let px = x, pz = z;
  for (const [bx, bz, hw, hd] of boxes) {
    if (!circleVsAABB(px, pz, r, bx, bz, hw, hd)) continue;
    const dx = px - bx, dz = pz - bz;
    const ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz);
    if (ox < oz) px = dx > 0 ? bx + hw + r : bx - hw - r;
    else pz = dz > 0 ? bz + hd + r : bz - hd - r;
  }
  return [px, pz];
}

// simple hex → rgb string helper
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Material factory ──────────────────────────────────────
const cosmicMat = (color) => new THREE.MeshStandardMaterial({
  color, roughness: 0.25, metalness: 0.85
});
const glowMat = (color, opacity = 0.7) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false
});
const emissiveMat = (color, emissive, intensity = 0.4) => new THREE.MeshStandardMaterial({
  color, roughness: 0.3, metalness: 0.8, emissive, emissiveIntensity: intensity
});

// ═══════════════════════════════════════════════════════════════
// BUILD URBAN FUTURE CITY
// ═══════════════════════════════════════════════════════════════
function buildCity(scene) {
  // ─── Cosmic Ground Platform ───
  const gridHelper = new THREE.PolarGridHelper(30, 48, 32, 256, "#1a1a3a", "#0d0d20");
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({ color: "#080818", roughness: 0.5, metalness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // ─── Energy Conduits (roads connecting districts) ───
  const conduits = [
    { from: [0, 0], to: [18, 0], color: 0x00A0DC },
    { from: [0, 0], to: [-18, 0], color: 0x34D399 },
    { from: [0, 0], to: [0, -18], color: 0x9B7EFF },
    { from: [0, 0], to: [0, 18], color: 0xEC4899 },
  ];
  conduits.forEach((c) => {
    const [fx, fz] = c.from, [tx, tz] = c.to;
    const dx = tx - fx, dz = tz - fz;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    // Road base
    const roadGeo = new THREE.PlaneGeometry(2.0, len);
    const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ color: "#0c0c28", roughness: 0.3, metalness: 0.9 }));
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = angle;
    road.position.set((fx + tx) / 2, 0.005, (fz + tz) / 2);
    road.receiveShadow = true;
    scene.add(road);

    // Center glow line
    const lineGeo = new THREE.PlaneGeometry(0.15, len);
    const line = new THREE.Mesh(lineGeo, glowMat(new THREE.Color(c.color), 0.35));
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = angle;
    line.position.set((fx + tx) / 2, 0.015, (fz + tz) / 2);
    scene.add(line);

    // Edge markers (pulsing dots along the road)
    for (let i = 0; i < 6; i++) {
      const t = (i + 1) / 7;
      const px = fx + dx * t, pz = fz + dz * t;
      const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const dot = new THREE.Mesh(dotGeo, glowMat(new THREE.Color(c.color), 0.6));
      dot.position.set(px + Math.cos(angle) * 0.6, 0.04, pz - Math.sin(angle) * 0.6);
      dot.name = "conduitDot";
      scene.add(dot);
      const dot2 = dot.clone();
      dot2.position.set(px - Math.cos(angle) * 0.6, 0.04, pz + Math.sin(angle) * 0.6);
      scene.add(dot2);
    }
  });

  // ─── CENTRAL PLAZA ───
  const plazaGroup = new THREE.Group();
  plazaGroup.name = "plaza";

  // Plaza floor
  const plazaGeo = new THREE.CircleGeometry(8, 48);
  const plaza = new THREE.Mesh(plazaGeo, new THREE.MeshStandardMaterial({ color: "#0c0c2a", roughness: 0.2, metalness: 0.9 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.015;
  plaza.receiveShadow = true;
  plazaGroup.add(plaza);

  // Outer ring
  const ringGeo = new THREE.TorusGeometry(7.5, 0.08, 16, 64);
  const ring = new THREE.Mesh(ringGeo, emissiveMat("#00A0DC", "#0066aa", 0.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  ring.name = "plazaRing";
  plazaGroup.add(ring);

  // Central Hologram Pillar
  const pillarGroup = new THREE.Group();
  const pillarGeo = new THREE.CylinderGeometry(0.15, 0.25, 3.5, 16);
  const pillar = new THREE.Mesh(pillarGeo, emissiveMat("#1a1a4a", "#003388", 0.5));
  pillar.position.y = 1.75;
  pillarGroup.add(pillar);

  // Floating holographic rings around pillar
  for (let i = 0; i < 3; i++) {
    const hrGeo = new THREE.TorusGeometry(0.8 + i * 0.3, 0.04, 16, 32);
    const hr = new THREE.Mesh(hrGeo, glowMat("#00C8FF", 0.6 - i * 0.15));
    hr.position.y = 1.0 + i * 1.0;
    hr.name = `holoRing_${i}`;
    pillarGroup.add(hr);
  }

  // Floating diamond at top
  const crystalGeo = new THREE.OctahedronGeometry(0.25, 0);
  const crystal = new THREE.Mesh(crystalGeo, emissiveMat("#FFFFFF", "#00C8FF", 1.0));
  crystal.position.y = 3.8;
  crystal.name = "plazaCrystal";
  pillarGroup.add(crystal);
  const crystalLight = new THREE.PointLight("#00C8FF", 4, 10);
  crystalLight.position.y = 3.8;
  pillarGroup.add(crystalLight);

  plazaGroup.add(pillarGroup);

  // Fountain — cosmic energy pool
  const fountain = new THREE.Group();
  fountain.name = "fountain";
  const poolGeo = new THREE.CylinderGeometry(1.5, 1.7, 0.3, 32);
  const pool = new THREE.Mesh(poolGeo, emissiveMat("#0d0d3a", "#001166", 0.3));
  pool.position.y = 0.1;
  fountain.add(pool);
  // Glowing water surface
  const waterGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.05, 32);
  const water = new THREE.Mesh(waterGeo, glowMat("#00A0DC", 0.5));
  water.position.y = 0.25;
  water.name = "fountainWater";
  fountain.add(water);
  // Energy orbs floating above
  for (let i = 0; i < 5; i++) {
    const orbGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const orb = new THREE.Mesh(orbGeo, glowMat("#00E5FF", 0.8));
    orb.position.set(
      Math.cos(i * 1.3) * 0.7,
      0.5 + Math.sin(i * 0.7) * 0.3,
      Math.sin(i * 1.3) * 0.7
    );
    orb.name = `fountainOrb_${i}`;
    fountain.add(orb);
  }
  fountain.position.set(2, 0, 2);
  plazaGroup.add(fountain);

  scene.add(plazaGroup);

  // ─── Plaza Billboard (holographic display) ───
  const billboard = new THREE.Group();
  billboard.position.set(-2, 3, 6);
  const bFrameGeo = new THREE.BoxGeometry(4, 2, 0.08);
  const bFrame = new THREE.Mesh(bFrameGeo, emissiveMat("#0a0a2a", "#003366", 0.4));
  billboard.add(bFrame);
  // Screen glow
  const screenGeo = new THREE.PlaneGeometry(3.6, 1.6);
  const screen = new THREE.Mesh(screenGeo, glowMat("#00A0DC", 0.25));
  screen.position.z = 0.05;
  billboard.add(screen);
  // Frame border
  const borderGeo = new THREE.BoxGeometry(4, 2, 0.02);
  const border = new THREE.Mesh(borderGeo, glowMat("#00C8FF", 0.4));
  border.position.z = 0.06;
  billboard.add(border);
  // Support struts
  const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8);
  const strutMat = emissiveMat("#001122", "#004488", 0.5);
  const leftStrut = new THREE.Mesh(strutGeo, strutMat);
  leftStrut.position.set(-1.8, -1.5, 0);
  billboard.add(leftStrut);
  const rightStrut = new THREE.Mesh(strutGeo, strutMat);
  rightStrut.position.set(1.8, -1.5, 0);
  billboard.add(rightStrut);
  billboard.name = "billboard";
  scene.add(billboard);

  // ─── MUSIC DISTRICT (sleek angular building) ───
  const mdPos = DISTRICTS.music.position;
  const musicDistrict = new THREE.Group();
  // Main building — angled futuristic shape
  const mdBodyGeo = new THREE.BoxGeometry(5, 4, 4);
  const mdBody = new THREE.Mesh(mdBodyGeo, emissiveMat("#0d0d2a", "#002244", 0.3));
  mdBody.position.y = 2;
  mdBody.castShadow = true;
  mdBody.receiveShadow = true;
  musicDistrict.add(mdBody);

  // Glass facade strips
  for (let i = 0; i < 4; i++) {
    const stripGeo = new THREE.BoxGeometry(0.3, 3.2, 4.05);
    const strip = new THREE.Mesh(stripGeo, glowMat("#00A0DC", 0.3));
    strip.position.set(-1.5 + i * 1, 2.2, 0.03);
    musicDistrict.add(strip);
  }

  // Angled roof
  const roofGeo = new THREE.ConeGeometry(3.5, 0.8, 4);
  const roof = new THREE.Mesh(roofGeo, emissiveMat("#00A0DC", "#005599", 0.5));
  roof.position.y = 4.4;
  roof.rotation.y = Math.PI / 4;
  musicDistrict.add(roof);

  // Entry door — glowing portal
  const doorFrameGeo = new THREE.BoxGeometry(1.6, 2.2, 0.15);
  const doorFrame = new THREE.Mesh(doorFrameGeo, emissiveMat("#0a0a2a", "#003366", 0.4));
  doorFrame.position.set(0, 1.1, 2.05);
  musicDistrict.add(doorFrame);
  const doorGlowGeo = new THREE.PlaneGeometry(1.3, 1.8);
  const doorGlow = new THREE.Mesh(doorGlowGeo, glowMat("#00E5FF", 0.35));
  doorGlow.position.set(0, 1.1, 2.13);
  musicDistrict.add(doorGlow);

  // Equalizer bars on the front
  for (let i = 0; i < 5; i++) {
    const h = 0.4 + Math.sin(i * 0.8) * 0.6;
    const barGeo = new THREE.BoxGeometry(0.2, Math.abs(h), 0.2);
    const bar = new THREE.Mesh(barGeo, glowMat("#00C8FF", 0.5));
    bar.position.set(-1 + i * 0.5, 0.5 + Math.abs(h) / 2, 2.15);
    bar.name = `eqBar_${i}`;
    musicDistrict.add(bar);
  }

  musicDistrict.position.set(mdPos[0], 0, mdPos[2]);
  scene.add(musicDistrict);

  // ─── RADIO TOWER (tall crystalline spire) ───
  const rtPos = DISTRICTS.radio.position;
  const towerH = DISTRICTS.radio.towerHeight;
  const radioTower = new THREE.Group();

  // Crystalline base
  const baseGeo = new THREE.CylinderGeometry(1.8, 2.2, 1.5, 8);
  const base = new THREE.Mesh(baseGeo, emissiveMat("#1a1035", "#4a1a88", 0.4));
  base.position.y = 0.75;
  base.castShadow = true;
  radioTower.add(base);

  // Main spire — octagonal for crystalline look
  const spireGeo = new THREE.CylinderGeometry(0.3, 0.5, towerH, 8);
  const spire = new THREE.Mesh(spireGeo, emissiveMat("#2a1a55", "#6D28D9", 0.5));
  spire.position.y = towerH / 2 + 1.5;
  radioTower.add(spire);

  // Orbiting energy rings
  for (let i = 0; i < 4; i++) {
    const r = 1.2 - i * 0.15;
    const y = 2.5 + i * (towerH / 4);
    const orbRingGeo = new THREE.TorusGeometry(r, 0.05, 16, 32);
    const orbRing = new THREE.Mesh(orbRingGeo, glowMat("#9B7EFF", 0.5 - i * 0.08));
    orbRing.position.y = y;
    orbRing.name = `towerRing_${i}`;
    radioTower.add(orbRing);
  }

  // Beacon at top
  const beaconGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const beacon = new THREE.Mesh(beaconGeo, glowMat("#C4AAFF", 0.8));
  beacon.position.y = towerH + 2.0;
  beacon.name = "beacon";
  radioTower.add(beacon);
  const beaconLight = new THREE.PointLight("#9B7EFF", 5, 18);
  beaconLight.position.y = towerH + 2.0;
  radioTower.add(beaconLight);

  // Side antenna dishes
  for (let side = -1; side <= 1; side += 2) {
    const dishGroup = new THREE.Group();
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
    const arm = new THREE.Mesh(armGeo, emissiveMat("#1a1a3a", "#3a1a77", 0.3));
    arm.rotation.z = Math.PI / 2;
    dishGroup.add(arm);
    const dishGeo = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 3);
    const dish = new THREE.Mesh(dishGeo, emissiveMat("#2a2a4a", "#6D28D9", 0.3));
    dish.position.x = side * 1.6;
    dish.rotation.z = -side * 0.3;
    dishGroup.add(dish);
    dishGroup.position.y = towerH * 0.7;
    radioTower.add(dishGroup);
  }

  radioTower.position.set(rtPos[0], 0, rtPos[2]);
  scene.add(radioTower);

  // ─── MANIFESTATION GARDENS (floating bioluminescent sanctuary) ───
  const gPos = DISTRICTS.gardens.position;
  const gardens = new THREE.Group();

  // Reflecting pool
  const pondGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.06, 32);
  const pond = new THREE.Mesh(pondGeo, emissiveMat("#0a2a1a", "#1a6644", 0.5));
  pond.position.y = 0.05;
  gardens.add(pond);

  // Crystal trees (geometric, floating)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 3 + Math.random() * 3;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    const th = 1.5 + Math.random() * 2;

    // Trunk — dark crystal
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, th, 6);
    const trunk = new THREE.Mesh(trunkGeo, emissiveMat("#0d3322", "#0a4422", 0.2));
    trunk.position.set(tx, th / 2, tz);
    trunk.castShadow = true;
    gardens.add(trunk);

    // Canopy — floating geometric clusters
    for (let j = 0; j < 3; j++) {
      const leafGeo = new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.2, 0);
      const leaf = new THREE.Mesh(leafGeo, glowMat("#34D399", 0.45));
      leaf.position.set(
        tx + (Math.random() - 0.5) * 0.8,
        th + 0.5 + Math.random() * 0.6,
        tz + (Math.random() - 0.5) * 0.8
      );
      leaf.name = "gardenLeaf";
      gardens.add(leaf);
    }

    // Bioluminescent glow orb
    const glowOrbGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const glowOrb = new THREE.Mesh(glowOrbGeo, glowMat("#34D399", 0.7));
    glowOrb.position.set(tx, th + 0.8, tz);
    gardens.add(glowOrb);
  }

  // Floating affirmation crystals (small floating diamonds)
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 3;
    const affGeo = new THREE.OctahedronGeometry(0.08, 0);
    const aff = new THREE.Mesh(affGeo, glowMat("#A7F3D0", 0.5));
    aff.position.set(Math.cos(angle) * r, 1.5 + Math.random() * 2, Math.sin(angle) * r);
    aff.name = "affirmation";
    gardens.add(aff);
  }

  gardens.position.set(gPos[0], 0, gPos[2]);
  scene.add(gardens);

  // ─── HALL OF FREQUENCIES (geometric dome structure) ───
  const fPos = DISTRICTS.frequencies.position;
  const hall = new THREE.Group();
  const fSize = DISTRICTS.frequencies.buildingSize;

  // Dome base
  const domeBaseGeo = new THREE.CylinderGeometry(fSize[0], fSize[0] * 1.1, fSize[1], 16);
  const domeBase = new THREE.Mesh(domeBaseGeo, emissiveMat("#1a0a20", "#330044", 0.3));
  domeBase.position.y = fSize[1] / 2;
  domeBase.castShadow = true;
  hall.add(domeBase);

  // Geodesic dome on top
  const domeGeo = new THREE.SphereGeometry(fSize[0] * 0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, emissiveMat("#1a0a20", "#440066", 0.4));
  dome.position.y = fSize[1];
  hall.add(dome);

  // Dome edge ring
  const domeRingGeo = new THREE.TorusGeometry(fSize[0] * 0.7, 0.06, 16, 32);
  const domeRing = new THREE.Mesh(domeRingGeo, glowMat("#EC4899", 0.5));
  domeRing.position.y = fSize[1];
  domeRing.rotation.x = Math.PI / 2;
  hall.add(domeRing);

  // Frequency doors — colored portals
  const doorData = [
    { offset: [-1.5, 0.8, 1.55], color: "#3B82F6" },
    { offset: [-0.5, 0.8, 1.55], color: "#F59E0B" },
    { offset: [0.5, 0.8, 1.55], color: "#EC4899" },
    { offset: [1.5, 0.8, 1.55], color: "#8B5CF6" },
    { offset: [-0.75, 0.8, -1.55], color: "#10B981" },
    { offset: [0.75, 0.8, -1.55], color: "#6366F1" },
  ];
  doorData.forEach((d) => {
    const doorGeo = new THREE.BoxGeometry(0.6, 1.8, 0.08);
    const door = new THREE.Mesh(doorGeo, glowMat(d.color, 0.5));
    door.position.set(...d.offset);
    hall.add(door);
    // Door glow aura
    const auraGeo = new THREE.BoxGeometry(0.7, 1.9, 0.02);
    const aura = new THREE.Mesh(auraGeo, glowMat(d.color, 0.15));
    aura.position.set(d.offset[0], d.offset[1], d.offset[2] + 0.02);
    hall.add(aura);
  });

  hall.position.set(fPos[0], 0, fPos[2]);
  scene.add(hall);

  // ─── Street Lamps (energy pillars along conduits) ───
  const lampPositions = [
    [6, 0], [12, 0], [18, 0],
    [-6, 0], [-12, 0], [-18, 0],
    [0, -6], [0, -12], [0, -18],
    [0, 6], [0, 12], [0, 18],
  ];
  lampPositions.forEach(([lx, lz]) => {
    const lampGroup = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 2, 8);
    const post = new THREE.Mesh(postGeo, emissiveMat("#0a0a2a", "#003366", 0.3));
    post.position.y = 1;
    lampGroup.add(post);
    const lightGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const light = new THREE.Mesh(lightGeo, glowMat("#00C8FF", 0.5));
    light.position.y = 2.1;
    lampGroup.add(light);
    lampGroup.position.set(lx, 0, lz);
    scene.add(lampGroup);
  });

  // ─── Cosmic Particles (stars) ───
  const particleCount = 400;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 50;
    positions[i + 1] = Math.random() * 12 + 0.5;
    positions[i + 2] = (Math.random() - 0.5) * 50;
    // Mix of blue, purple, and white stars
    const colorChoice = Math.random();
    if (colorChoice < 0.5) { colors[i] = 0.3; colors[i + 1] = 0.6; colors[i + 2] = 1.0; }       // blue
    else if (colorChoice < 0.8) { colors[i] = 0.7; colors[i + 1] = 0.4; colors[i + 2] = 1.0; }  // purple
    else { colors[i] = 1.0; colors[i + 1] = 1.0; colors[i + 2] = 1.0; }                          // white
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particleSystem = new THREE.Points(particleGeo, particleMat);
  particleSystem.name = "particles";
  scene.add(particleSystem);

  // ─── Lighting (cosmic atmosphere) ───
  scene.add(new THREE.AmbientLight("#1a1a3a", 0.3));

  const dirLight = new THREE.DirectionalLight("#446688", 0.5);
  dirLight.position.set(10, 25, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 60;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  scene.add(dirLight);

  // Point lights for district accents
  const plazaGlow = new THREE.PointLight("#00A0DC", 4, 15);
  plazaGlow.position.set(0, 3, 0);
  scene.add(plazaGlow);

  const gardenGlow = new THREE.PointLight("#34D399", 3, 12);
  gardenGlow.position.set(gPos[0], 2, gPos[2]);
  scene.add(gardenGlow);

  const freqGlow = new THREE.PointLight("#EC4899", 3, 12);
  freqGlow.position.set(fPos[0], 2, fPos[2]);
  scene.add(freqGlow);

  const musicGlow = new THREE.PointLight("#00A0DC", 3, 12);
  musicGlow.position.set(mdPos[0], 3, mdPos[2]);
  scene.add(musicGlow);
}

// ═══════════════════════════════════════════════════════════════
// PLAYER CHARACTER (cosmic avatar)
// ═══════════════════════════════════════════════════════════════
function createPlayer(scene) {
  const player = new THREE.Group();
  player.name = "player";

  // Hover ring
  const ringGeo = new THREE.TorusGeometry(0.3, 0.04, 16, 32);
  const ring = new THREE.Mesh(ringGeo, glowMat("#00E5FF", 0.5));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  player.add(ring);

  // Body — glowing crystalline
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.6, 6);
  const body = new THREE.Mesh(bodyGeo, emissiveMat("#00A0DC", "#004488", 0.5));
  body.position.y = 0.5;
  body.castShadow = true;
  player.add(body);

  // Head — glowing orb
  const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const head = new THREE.Mesh(headGeo, emissiveMat("#00C8FF", "#005599", 0.6));
  head.position.y = 1.1;
  player.add(head);

  // Shoulder pads — small crystals
  for (let side = -1; side <= 1; side += 2) {
    const padGeo = new THREE.OctahedronGeometry(0.08, 0);
    const pad = new THREE.Mesh(padGeo, glowMat("#00E5FF", 0.5));
    pad.position.set(side * 0.25, 0.85, 0);
    player.add(pad);
  }

  player.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(player);
  return player;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded, onZoneChange, onEnterCurrentZone }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const sceneRef = useRef(null);
  const playerRef = useRef(null);
  const playerPosRef = useRef([...SPAWN, 0]);
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0 });
  const frameRef = useRef(0);
  const zoneRef = useRef(null);
  const animDataRef = useRef({
    fountainOrbs: [],
    eqBars: [],
    gardenLeaves: [],
    affirmations: [],
    conduitDots: [],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#05050f");
      scene.fog = new THREE.FogExp2("#05050f", 0.0008);
      const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 80);
      camera.position.set(0, 6, 10);
      sceneRef.current = scene;

      buildCity(scene);

      const player = createPlayer(scene);
      playerRef.current = player;

      // Collect animated objects
      const animData = animDataRef.current;
      scene.traverse((obj) => {
        if (obj.name?.startsWith("fountainOrb_")) animData.fountainOrbs.push(obj);
        if (obj.name?.startsWith("eqBar_")) animData.eqBars.push(obj);
        if (obj.name === "gardenLeaf") animData.gardenLeaves.push(obj);
        if (obj.name === "affirmation") animData.affirmations.push(obj);
        if (obj.name === "conduitDot") animData.conduitDots.push(obj);
      });

      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const dt = 0.016;
        const t = Date.now() * 0.001;

        const keys = keysRef.current;
        const mouse = mouseRef.current;
        const [px, py, pz, prot] = playerPosRef.current;
        let x = px, y = py, z = pz, rot = prot;

        if (mouse.down) {
          rot += mouse.dx * 0.01;
          mouse.dx = 0;
          mouse.dy = 0;
        }

        let mx = 0, mz = 0;
        if (keys.w || keys.arrowup) { mx += Math.sin(rot); mz += Math.cos(rot); }
        if (keys.s || keys.arrowdown) { mx -= Math.sin(rot); mz -= Math.cos(rot); }
        if (keys.a || keys.arrowleft) { mx -= Math.cos(rot); mz += Math.sin(rot); }
        if (keys.d || keys.arrowright) { mx += Math.cos(rot); mz -= Math.sin(rot); }

        const mag = Math.sqrt(mx * mx + mz * mz);
        if (mag > 0) {
          mx = (mx / mag) * PLAYER_SPEED * dt;
          mz = (mz / mag) * PLAYER_SPEED * dt;
        }

        x += mx; z += mz;
        [x, z] = resolveCollisions(x, z, PLAYER_R, COLLISION_BOXES);

        playerPosRef.current = [x, y, z, rot];
        player.position.set(x, y, z);
        player.rotation.y = rot + Math.PI;

        const camDist = 6;
        const camHeight = 4.5;
        const behindX = x - Math.sin(rot) * camDist;
        const behindZ = z - Math.cos(rot) * camDist;
        camera.position.lerp(new THREE.Vector3(behindX, y + camHeight, behindZ), 0.08);
        camera.lookAt(x, y + 0.8, z);

        // Zone detection
        let nearest = null, nearestDist = Infinity;
        for (const d of Object.values(DISTRICTS)) {
          const dx = x - d.position[0];
          const dz = z - d.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < d.zoneRadius && dist < nearestDist) { nearest = d.id; nearestDist = dist; }
        }
        if (nearest !== zoneRef.current) {
          zoneRef.current = nearest;
          onZoneChange?.(nearest);
        }

        // ─── ANIMATIONS ───
        // Plaza ring rotation
        const plazaRing = scene.getObjectByName("plazaRing");
        if (plazaRing) plazaRing.rotation.z += dt * 0.3;

        // Hologram rings
        for (let i = 0; i < 3; i++) {
          const hr = scene.getObjectByName(`holoRing_${i}`);
          if (hr) {
            hr.rotation.x += dt * 0.5;
            hr.rotation.y += dt * 0.3;
            hr.position.y = 1.0 + i * 1.0 + Math.sin(t * 1.5 + i) * 0.15;
          }
        }

        // Plaza crystal
        const crystal = scene.getObjectByName("plazaCrystal");
        if (crystal) crystal.rotation.y += dt * 1.2;

        // Fountain orbs
        animData.fountainOrbs.forEach((orb, i) => {
          orb.position.y = 0.5 + Math.sin(t * 2 + i) * 0.2;
        });
        const fountainWater = scene.getObjectByName("fountainWater");
        if (fountainWater) {
          fountainWater.material.opacity = 0.4 + Math.sin(t * 2.5) * 0.2;
        }

        // Equalizer bars
        animData.eqBars.forEach((bar, i) => {
          const scale = 0.3 + Math.abs(Math.sin(t * 3 + i * 0.7)) * 0.7;
          bar.scale.y = scale;
          bar.position.y = 0.2 + scale * 0.5;
        });

        // Billboard pulse
        const billboard = scene.getObjectByName("billboard");
        if (billboard) {
          billboard.children.forEach((child) => {
            if (child.material && child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = 0.3 + Math.sin(t * 1.5) * 0.15;
            }
          });
        }

        // Tower rings
        for (let i = 0; i < 4; i++) {
          const tr = scene.getObjectByName(`towerRing_${i}`);
          if (tr) {
            tr.rotation.z += dt * 0.2;
            tr.position.y = 2.5 + i * 2.5 + Math.sin(t * 1.3 + i) * 0.15;
          }
        }

        // Beacon
        const beacon = scene.getObjectByName("beacon");
        if (beacon) {
          beacon.scale.setScalar(0.9 + Math.sin(t * 2.5) * 0.1);
        }

        // Garden leaves
        animData.gardenLeaves.forEach((leaf, i) => {
          leaf.rotation.y += dt * 0.4;
          leaf.position.y += Math.sin(t * 1.8 + i) * dt * 0.3;
        });

        // Affirmations
        animData.affirmations.forEach((aff, i) => {
          aff.rotation.y += dt * 0.6;
          aff.position.y += Math.sin(t * 1.2 + i) * dt * 0.2;
        });

        // Conduit dots pulse
        animData.conduitDots.forEach((dot, i) => {
          const base = 0.5 + Math.sin(t * 2 + i * 0.3) * 0.3;
          dot.material.opacity = Math.max(0.2, Math.min(0.8, base));
        });

        // Particles
        const particles = scene.getObjectByName("particles");
        if (particles) particles.rotation.y += dt * 0.03;

        renderer.render(scene, camera);
        frameRef.current++;

        if (frameRef.current === 2) onLoaded?.();
      };

      animate();

      const onResize = () => {
        if (!canvas) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      };
    } catch (e) {
      setError(e.message || String(e));
    }
  }, []);

  // ─── Keyboard input ───
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "e" || e.key === "E") {
        const z = zoneRef.current;
        if (z) onEnterCurrentZone?.(z);
      }
    };
    const onUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    const onMouseDown = (e) => { mouseRef.current.down = true; };
    const onMouseUp = () => { mouseRef.current.down = false; };
    const onMouseMove = (e) => {
      if (!mouseRef.current.down) return;
      mouseRef.current.dx += e.movementX;
      mouseRef.current.dy += e.movementY;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [onEnterCurrentZone]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#05050f]">
        <div className="text-center px-6">
          <p className="text-red-400 font-bold text-sm mb-2">3D Error</p>
          <p className="text-xs text-white/40 mb-4 max-w-md">{error}</p>
          <button onClick={() => { setError(null); window.location.reload(); }}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-bold">
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: "none" }}
    />
  );
}