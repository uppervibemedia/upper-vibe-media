import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { DISTRICTS, COLLISION_BOXES, SPAWN } from "./cityData";

const PLAYER_R = 0.35;
const PLAYER_SPEED = 3.5;

// ─── Helpers ─────────────────────────────────────────────────
function circleVsAABB(cx, cz, r, bx, bz, hw, hd) {
  const closestX = Math.max(bx - hw, Math.min(cx, bx + hw));
  const closestZ = Math.max(bz - hd, Math.min(cz, bz + hd));
  const dx = cx - closestX, dz = cz - closestZ;
  return dx * dx + dz * dz < r * r;
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

// ─── Material shortcuts ──────────────────────────────────────
const buildMat = (color, opts = {}) => new THREE.MeshStandardMaterial({
  color, roughness: opts.roughness ?? 0.5, metalness: opts.metalness ?? 0.1, ...opts,
});
const neonMat = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false,
});
const glowMat = (color, intensity = 0.3) => new THREE.MeshStandardMaterial({
  color, roughness: 0.1, metalness: 0.9, emissive: color, emissiveIntensity: intensity,
});

// ═══════════════════════════════════════════════════════════════
// UPPER VIBE PLAZA — One Detailed City Block
// ═══════════════════════════════════════════════════════════════
function buildPlaza(scene) {
  const t = 0; // ground level offset

  // ─── GROUND LAYERS ──────────────────────────────────────────

  // Base asphalt — the greater block
  const asphaltGeo = new THREE.PlaneGeometry(40, 40);
  const asphalt = new THREE.Mesh(asphaltGeo, buildMat("#1a1a1e", { roughness: 0.9, metalness: 0 }));
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = -0.06;
  asphalt.receiveShadow = true;
  scene.add(asphalt);

  // Road around the plaza
  const roadNSgeo = new THREE.PlaneGeometry(28, 3);
  const roadEWgeo = new THREE.PlaneGeometry(3, 28);
  const roadMat = buildMat("#2a2a30", { roughness: 0.85, metalness: 0.05 });
  const roadN = new THREE.Mesh(roadNSgeo, roadMat);
  roadN.rotation.x = -Math.PI / 2; roadN.position.set(0, -0.05, -9.5); roadN.receiveShadow = true; scene.add(roadN);
  const roadS = new THREE.Mesh(roadNSgeo, roadMat);
  roadS.rotation.x = -Math.PI / 2; roadS.position.set(0, -0.05, 9.5); roadS.receiveShadow = true; scene.add(roadS);
  const roadE = new THREE.Mesh(roadEWgeo, roadMat);
  roadE.rotation.x = -Math.PI / 2; roadE.position.set(9.5, -0.05, 0); roadE.receiveShadow = true; scene.add(roadE);
  const roadW = new THREE.Mesh(roadEWgeo, roadMat);
  roadW.rotation.x = -Math.PI / 2; roadW.position.set(-9.5, -0.05, 0); roadW.receiveShadow = true; scene.add(roadW);

  // Road lane markings (dashed white lines)
  function addLaneMarkings(roadX, roadZ, length, horizontal) {
    for (let i = -length / 2 + 1; i < length / 2; i += 2.5) {
      const markGeo = new THREE.PlaneGeometry(horizontal ? 1.2 : 0.15, horizontal ? 0.15 : 1.2);
      const mark = new THREE.Mesh(markGeo, buildMat("#555560", { roughness: 0.4 }));
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(
        roadX + (horizontal ? i : 0),
        -0.04,
        roadZ + (horizontal ? 0 : i)
      );
      mark.receiveShadow = true;
      scene.add(mark);
    }
  }
  addLaneMarkings(0, -9.5, 26, true);
  addLaneMarkings(0, 9.5, 26, true);
  addLaneMarkings(9.5, 0, 26, false);
  addLaneMarkings(-9.5, 0, 26, false);

  // ─── SIDEWALKS ──────────────────────────────────────────────
  function addSidewalk(x, z, w, d) {
    const geo = new THREE.PlaneGeometry(w, d);
    const sidewalk = new THREE.Mesh(geo, buildMat("#3a3a42", { roughness: 0.55 }));
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(x, -0.03, z);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);
  }
  // Plaza perimeter sidewalks
  addSidewalk(0, -7.5, 18, 1.5);   // north
  addSidewalk(0, 7.5, 18, 1.5);    // south
  addSidewalk(7.5, 0, 1.5, 18);    // east
  addSidewalk(-7.5, 0, 1.5, 18);   // west

  // Curbs
  function addCurb(x, z, len, horiz) {
    const geo = new THREE.BoxGeometry(horiz ? len : 0.2, 0.1, horiz ? 0.2 : len);
    const curb = new THREE.Mesh(geo, buildMat("#555558", { roughness: 0.3 }));
    curb.position.set(x, 0.02, z);
    curb.castShadow = true;
    curb.receiveShadow = true;
    scene.add(curb);
  }
  addCurb(0, -8.25, 18, true);
  addCurb(0, 8.25, 18, true);
  addCurb(8.25, 0, 18, false);
  addCurb(-8.25, 0, 18, false);

  // ─── PLAZA FLOOR (decorative tile pattern) ──────────────────
  const plazaFloorGeo = new THREE.PlaneGeometry(14, 14);
  const plazaFloor = new THREE.Mesh(plazaFloorGeo, buildMat("#252530", { roughness: 0.35, metalness: 0.15 }));
  plazaFloor.rotation.x = -Math.PI / 2;
  plazaFloor.position.y = -0.015;
  plazaFloor.receiveShadow = true;
  scene.add(plazaFloor);

  // Decorative grid lines on plaza
  const gridHelper = new THREE.PolarGridHelper(7, 32, 24, 128, "#3a3a48", "#2a2a35");
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // ─── CENTRAL FOUNTAIN ───────────────────────────────────────
  const fountain = new THREE.Group();
  fountain.name = "fountain";

  // Base tier
  const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.35, 32);
  const baseTier = new THREE.Mesh(baseGeo, buildMat("#282838", { roughness: 0.2, metalness: 0.7 }));
  baseTier.position.y = 0.15;
  baseTier.castShadow = true;
  baseTier.receiveShadow = true;
  fountain.add(baseTier);

  // Middle tier
  const midGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.3, 32);
  const midTier = new THREE.Mesh(midGeo, buildMat("#2a2a42", { roughness: 0.2, metalness: 0.75 }));
  midTier.position.y = 0.5;
  midTier.castShadow = true;
  fountain.add(midTier);

  // Top tier
  const topGeo = new THREE.CylinderGeometry(0.4, 0.55, 0.25, 24);
  const topTier = new THREE.Mesh(topGeo, buildMat("#2c2c48", { roughness: 0.2, metalness: 0.8 }));
  topTier.position.y = 0.8;
  topTier.castShadow = true;
  fountain.add(topTier);

  // Water pool (glowing disc)
  const waterGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.02, 32);
  const water = new THREE.Mesh(waterGeo, glowMat("#00A0DC", 0.4));
  water.position.y = 0.33;
  water.name = "fountainWater";
  fountain.add(water);

  // Water spray particles
  const sprayGroup = new THREE.Group();
  sprayGroup.name = "spray";
  for (let i = 0; i < 20; i++) {
    const dropGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const drop = new THREE.Mesh(dropGeo, neonMat("#88DDFF", 0.7));
    drop.position.set(
      (Math.random() - 0.5) * 0.6,
      1.1 + Math.random() * 1.2,
      (Math.random() - 0.5) * 0.6
    );
    drop.userData = { baseY: drop.position.y, speed: 0.8 + Math.random() * 1.5, offset: Math.random() * Math.PI * 2 };
    sprayGroup.add(drop);
  }
  fountain.add(sprayGroup);

  // Fountain glow light
  const fountainLight = new THREE.PointLight("#00A0DC", 3, 8);
  fountainLight.position.y = 0.7;
  fountain.add(fountainLight);

  scene.add(fountain);

  // ─── BENCHES ────────────────────────────────────────────────
  function addBench(x, z, rotY = 0) {
    const bench = new THREE.Group();
    // Seat
    const seatGeo = new THREE.BoxGeometry(1.6, 0.08, 0.4);
    const seat = new THREE.Mesh(seatGeo, buildMat("#3a3040", { roughness: 0.3, metalness: 0.5 }));
    seat.position.y = 0.45;
    seat.castShadow = true;
    bench.add(seat);
    // Legs
    for (let lx = -0.6; lx <= 0.6; lx += 1.2) {
      for (let lz = -0.12; lz <= 0.12; lz += 0.24) {
        const legGeo = new THREE.BoxGeometry(0.06, 0.42, 0.06);
        const leg = new THREE.Mesh(legGeo, buildMat("#222228", { roughness: 0.3, metalness: 0.7 }));
        leg.position.set(lx, 0.21, lz);
        leg.castShadow = true;
        bench.add(leg);
      }
    }
    // Backrest
    const backGeo = new THREE.BoxGeometry(1.6, 0.35, 0.06);
    const back = new THREE.Mesh(backGeo, buildMat("#3a3040", { roughness: 0.3, metalness: 0.5 }));
    back.position.set(0, 0.65, -0.17);
    back.castShadow = true;
    bench.add(back);
    bench.position.set(x, 0, z);
    bench.rotation.y = rotY;
    scene.add(bench);
  }
  addBench(2.5, -2.5, Math.PI / 4);
  addBench(-2.5, 2.5, Math.PI / 4 + Math.PI);
  addBench(2.5, 2.5, -Math.PI / 4 + Math.PI);
  addBench(-2.5, -2.5, -Math.PI / 4);

  // ─── TREES / PLANTERS ───────────────────────────────────────
  function addTree(x, z, scale = 1) {
    const tree = new THREE.Group();
    // Planter box
    const planterGeo = new THREE.BoxGeometry(0.6, 0.35, 0.6);
    const planter = new THREE.Mesh(planterGeo, buildMat("#2a2a38", { roughness: 0.3, metalness: 0.6 }));
    planter.position.y = 0.17;
    planter.castShadow = true;
    planter.receiveShadow = true;
    tree.add(planter);
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 1.8 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, buildMat("#1a1a22", { roughness: 0.6 }));
    trunk.position.y = 1.25 * scale;
    trunk.castShadow = true;
    tree.add(trunk);
    // Canopy — layered cones for a natural tree shape
    for (let i = 0; i < 3; i++) {
      const canopyGeo = new THREE.ConeGeometry(0.6 * scale - i * 0.1, 0.7 * scale, 10);
      const canopy = new THREE.Mesh(canopyGeo, buildMat("#1a3a2a", { roughness: 0.5 }));
      canopy.position.y = 1.5 * scale + i * 0.4 * scale;
      canopy.castShadow = true;
      canopy.name = "treeCanopy";
      tree.add(canopy);
    }
    // Small glow orb in canopy
    const glowGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const glow = new THREE.Mesh(glowGeo, neonMat("#34D399", 0.35));
    glow.position.y = 2.3 * scale;
    tree.add(glow);
    tree.position.set(x, 0, z);
    scene.add(tree);
  }
  addTree(-4.5, 4.5, 0.8);
  addTree(4.5, -4.5, 0.7);
  addTree(-4, -4, 0.9);
  addTree(4, 4, 0.75);
  addTree(-2.5, -4.5, 0.6);
  addTree(2.5, 4.5, 0.65);

  // Small shrubs/plants around plaza edge
  function addShrub(x, z) {
    const shrub = new THREE.Group();
    const potGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.3, 8);
    const pot = new THREE.Mesh(potGeo, buildMat("#2a2a3a", { roughness: 0.3, metalness: 0.5 }));
    pot.position.y = 0.15;
    pot.castShadow = true;
    shrub.add(pot);
    const foliageGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const foliage = new THREE.Mesh(foliageGeo, buildMat("#1a402a", { roughness: 0.6 }));
    foliage.position.y = 0.45;
    foliage.scale.set(1, 0.7, 1);
    shrub.add(foliage);
    shrub.position.set(x, 0, z);
    scene.add(shrub);
  }
  const shrubSpots = [
    [-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5],
    [-3, -5.8], [3, -5.8], [-3, 5.8], [3, 5.8],
    [-5.8, -3], [-5.8, 3], [5.8, -3], [5.8, 3],
  ];
  shrubSpots.forEach(([sx, sz]) => addShrub(sx, sz));

  // ─── LAMP POSTS ─────────────────────────────────────────────
  function addLampPost(x, z) {
    const lamp = new THREE.Group();
    // Post
    const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.5, 8);
    const post = new THREE.Mesh(postGeo, buildMat("#1a1a28", { roughness: 0.3, metalness: 0.8 }));
    post.position.y = 1.25;
    post.castShadow = true;
    lamp.add(post);
    // Arm
    const armGeo = new THREE.BoxGeometry(0.6, 0.05, 0.05);
    const arm = new THREE.Mesh(armGeo, buildMat("#1a1a28", { roughness: 0.3, metalness: 0.8 }));
    arm.position.set(0.3, 2.45, 0);
    lamp.add(arm);
    // Light housing
    const housingGeo = new THREE.BoxGeometry(0.25, 0.12, 0.2);
    const housing = new THREE.Mesh(housingGeo, buildMat("#282838", { roughness: 0.2, metalness: 0.9 }));
    housing.position.set(0.55, 2.4, 0);
    lamp.add(housing);
    // Glow panel
    const panelGeo = new THREE.PlaneGeometry(0.18, 0.06);
    const panel = new THREE.Mesh(panelGeo, neonMat("#CCDDFF", 0.6));
    panel.rotation.x = -Math.PI / 2;
    panel.position.set(0.55, 2.35, 0);
    lamp.add(panel);
    // Point light
    const ptLight = new THREE.PointLight("#CCDDFF", 1.5, 6);
    ptLight.position.set(0.55, 2.35, 0);
    lamp.add(ptLight);
    lamp.position.set(x, 0, z);
    scene.add(lamp);
  }
  addLampPost(-5, -6.5);
  addLampPost(5, -6.5);
  addLampPost(-5, 6.5);
  addLampPost(5, 6.5);
  addLampPost(-6.5, -5);
  addLampPost(6.5, -5);
  addLampPost(-6.5, 5);
  addLampPost(6.5, 5);

  // ═══════════════════════════════════════════════════════════
  // BUILDINGS
  // ═══════════════════════════════════════════════════════════

  // ─── MUSIC STORE (north side) ──────────────────────────────
  const musicStore = new THREE.Group();
  musicStore.name = "musicStore";

  // Main structure — two sections
  const msBodyGeo = new THREE.BoxGeometry(10, 4.5, 5);
  const msBody = new THREE.Mesh(msBodyGeo, buildMat("#1a1a2a", { roughness: 0.25, metalness: 0.6 }));
  msBody.position.y = 2.25;
  msBody.castShadow = true;
  msBody.receiveShadow = true;
  musicStore.add(msBody);

  // Second floor offset
  const msUpperGeo = new THREE.BoxGeometry(10, 1.8, 3.5);
  const msUpper = new THREE.Mesh(msUpperGeo, buildMat("#1e1e32", { roughness: 0.2, metalness: 0.7 }));
  msUpper.position.set(0, 5.4, -0.7);
  msUpper.castShadow = true;
  musicStore.add(msUpper);

  // Glass storefront (ground floor)
  const glassGeo = new THREE.PlaneGeometry(7, 2.2);
  const glassFront = new THREE.Mesh(glassGeo, glowMat("#00A0DC", 0.2));
  glassFront.position.set(0, 1.3, 2.55);
  musicStore.add(glassFront);

  // Window frames (vertical dividers)
  for (let i = -3; i <= 3; i += 1.5) {
    const frameGeo = new THREE.BoxGeometry(0.06, 2.2, 0.06);
    const frame = new THREE.Mesh(frameGeo, buildMat("#333348", { roughness: 0.2, metalness: 0.9 }));
    frame.position.set(i, 1.3, 2.55);
    musicStore.add(frame);
  }
  // Horizontal divider
  const hFrameGeo = new THREE.BoxGeometry(7, 0.06, 0.06);
  const hFrame = new THREE.Mesh(hFrameGeo, buildMat("#333348", { roughness: 0.2, metalness: 0.9 }));
  hFrame.position.set(0, 2.4, 2.55);
  musicStore.add(hFrame);

  // Entrance door
  const doorGeo = new THREE.BoxGeometry(1.2, 2.2, 0.1);
  const door = new THREE.Mesh(doorGeo, buildMat("#1a1a30", { roughness: 0.15, metalness: 0.9 }));
  door.position.set(0, 1.1, 2.7);
  musicStore.add(door);
  // Door handle
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
  const handle = new THREE.Mesh(handleGeo, buildMat("#888899", { roughness: 0.1, metalness: 1 }));
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0.35, 1.3, 2.78);
  musicStore.add(handle);

  // Upper floor windows
  for (let i = -3.5; i <= 3.5; i += 1.75) {
    const winGeo = new THREE.PlaneGeometry(0.8, 0.8);
    const win = new THREE.Mesh(winGeo, glowMat("#00A0DC", 0.15));
    win.position.set(i, 5.2, 1.1);
    musicStore.add(win);
  }

  // Roof edge lighting
  const roofEdgeGeo = new THREE.BoxGeometry(10.2, 0.1, 5.2);
  const roofEdge = new THREE.Mesh(roofEdgeGeo, neonMat("#00C8FF", 0.5));
  roofEdge.position.y = 4.6;
  roofEdge.name = "msRoofEdge";
  musicStore.add(roofEdge);

  // Store signage — "UPPER VIBE MUSIC"
  const signGeo = new THREE.BoxGeometry(5, 0.5, 0.1);
  const sign = new THREE.Mesh(signGeo, neonMat("#00E5FF", 0.7));
  sign.position.set(0, 3.2, 2.65);
  sign.name = "msSign";
  musicStore.add(sign);

  // Billboard screens on the facade
  function addBillboard(gx, gy, gz, gw, gh) {
    const bg = new THREE.Group();
    const frameGeo = new THREE.BoxGeometry(gw + 0.2, gh + 0.2, 0.08);
    const frame = new THREE.Mesh(frameGeo, buildMat("#1a1a2a", { roughness: 0.2, metalness: 0.9 }));
    bg.add(frame);
    const screenGeo = new THREE.PlaneGeometry(gw, gh);
    const screen = new THREE.Mesh(screenGeo, glowMat("#00A0DC", 0.3));
    screen.position.z = 0.05;
    screen.name = "billboardScreen";
    bg.add(screen);
    // Glow border
    const borderGeo = new THREE.BoxGeometry(gw + 0.05, gh + 0.05, 0.01);
    const border = new THREE.Mesh(borderGeo, neonMat("#00C8FF", 0.35));
    border.position.z = 0.06;
    bg.add(border);
    bg.position.set(gx, gy, gz);
    return bg;
  }
  musicStore.add(addBillboard(-3, 1.8, 2.6, 1.8, 0.9));
  musicStore.add(addBillboard(3, 1.8, 2.6, 1.8, 0.9));

  musicStore.position.set(0, 0, -7);
  scene.add(musicStore);

  // ─── RADIO STATION (east side) ──────────────────────────────
  const radioStation = new THREE.Group();
  radioStation.name = "radioStation";

  // Main building
  const rsBodyGeo = new THREE.BoxGeometry(4, 6, 7);
  const rsBody = new THREE.Mesh(rsBodyGeo, buildMat("#15152a", { roughness: 0.2, metalness: 0.7 }));
  rsBody.position.y = 3;
  rsBody.castShadow = true;
  rsBody.receiveShadow = true;
  radioStation.add(rsBody);

  // Glass front facing plaza
  const rsGlassGeo = new THREE.PlaneGeometry(3, 4);
  const rsGlass = new THREE.Mesh(rsGlassGeo, glowMat("#9B7EFF", 0.18));
  rsGlass.position.set(-2.05, 3, 0);
  radioStation.add(rsGlass);

  // Window frames
  for (let i = -1; i <= 1; i++) {
    const vfGeo = new THREE.BoxGeometry(0.05, 4, 0.05);
    const vf = new THREE.Mesh(vfGeo, buildMat("#2a2a4a", { roughness: 0.2, metalness: 0.9 }));
    vf.position.set(-2.05, 3, i * 1.3);
    radioStation.add(vf);
  }

  // Radio antenna spire
  const spireGeo = new THREE.CylinderGeometry(0.08, 0.1, 4, 8);
  const spire = new THREE.Mesh(spireGeo, buildMat("#2a2a48", { roughness: 0.2, metalness: 0.9 }));
  spire.position.set(0, 8, -1);
  spire.castShadow = true;
  radioStation.add(spire);

  // Antenna crossbars
  for (let i = 0; i < 3; i++) {
    const crossGeo = new THREE.BoxGeometry(1.2 - i * 0.2, 0.05, 0.05);
    const cross = new THREE.Mesh(crossGeo, buildMat("#3a3a5a", { roughness: 0.2, metalness: 0.9 }));
    cross.position.set(0, 7 + i * 1.2, -1);
    radioStation.add(cross);
  }

  // Beacon light
  const beaconGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const beacon = new THREE.Mesh(beaconGeo, neonMat("#C4AAFF", 0.8));
  beacon.position.set(0, 10.2, -1);
  beacon.name = "beacon";
  radioStation.add(beacon);
  const beaconLight = new THREE.PointLight("#9B7EFF", 3, 10);
  beaconLight.position.set(0, 10.2, -1);
  radioStation.add(beaconLight);

  // Station signage
  const rsSignGeo = new THREE.BoxGeometry(3, 0.4, 0.1);
  const rsSign = new THREE.Mesh(rsSignGeo, neonMat("#C4AAFF", 0.6));
  rsSign.position.set(-2.1, 5.5, 0);
  radioStation.add(rsSign);

  // Satellite dish on roof
  const dishGroup = new THREE.Group();
  const dishArmGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
  const dishArm = new THREE.Mesh(dishArmGeo, buildMat("#2a2a3a", { roughness: 0.2, metalness: 0.9 }));
  dishArm.position.y = 0.4;
  dishGroup.add(dishArm);
  const dishGeo = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3);
  const dish = new THREE.Mesh(dishGeo, buildMat("#3a3a5a", { roughness: 0.15, metalness: 0.95 }));
  dish.position.y = 0.65;
  dish.rotation.x = 0.5;
  dishGroup.add(dish);
  dishGroup.position.set(1, 6.2, 2);
  radioStation.add(dishGroup);

  radioStation.position.set(7, 0, 0);
  scene.add(radioStation);

  // ─── MANIFESTATION GARDEN ENTRANCE (west side) ──────────────
  const gardenEntrance = new THREE.Group();
  gardenEntrance.name = "gardenEntrance";

  // Archway structure
  const archPillarGeo = new THREE.BoxGeometry(0.5, 5, 0.5);
  const leftPillar = new THREE.Mesh(archPillarGeo, buildMat("#1a2a1a", { roughness: 0.3, metalness: 0.5 }));
  leftPillar.position.set(-2.5, 2.5, 0);
  leftPillar.castShadow = true;
  gardenEntrance.add(leftPillar);
  const rightPillar = new THREE.Mesh(archPillarGeo, buildMat("#1a2a1a", { roughness: 0.3, metalness: 0.5 }));
  rightPillar.position.set(2.5, 2.5, 0);
  rightPillar.castShadow = true;
  gardenEntrance.add(rightPillar);

  // Arch top
  const archTopGeo = new THREE.BoxGeometry(5.5, 0.3, 0.5);
  const archTop = new THREE.Mesh(archTopGeo, buildMat("#1a2a1a", { roughness: 0.3, metalness: 0.5 }));
  archTop.position.set(0, 5.2, 0);
  archTop.castShadow = true;
  gardenEntrance.add(archTop);

  // Curved arch detail
  const archCurveGeo = new THREE.TorusGeometry(2.6, 0.1, 8, 16, Math.PI);
  const archCurve = new THREE.Mesh(archCurveGeo, glowMat("#34D399", 0.45));
  archCurve.position.set(0, 4.8, 0.26);
  archCurve.rotation.y = Math.PI;
  gardenEntrance.add(archCurve);

  // Wall segments flanking the arch
  for (let side = -1; side <= 1; side += 2) {
    const wallGeo = new THREE.BoxGeometry(2.5, 2.5, 2);
    const wall = new THREE.Mesh(wallGeo, buildMat("#1a2220", { roughness: 0.35, metalness: 0.4 }));
    wall.position.set(side * 4.5, 1.25, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    gardenEntrance.add(wall);

    // Vines on wall
    for (let i = 0; i < 4; i++) {
      const vineGeo = new THREE.SphereGeometry(0.15, 6, 6);
      const vine = new THREE.Mesh(vineGeo, buildMat("#1a3a2a", { roughness: 0.5 }));
      vine.position.set(side * 4.5 + (Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 2, 1.05);
      vine.scale.set(0.7, 1.3, 0.7);
      vine.name = "vine";
      gardenEntrance.add(vine);
    }
  }

  // Garden sign
  const gardenSignGeo = new THREE.BoxGeometry(4, 0.4, 0.08);
  const gardenSign = new THREE.Mesh(gardenSignGeo, neonMat("#34D399", 0.6));
  gardenSign.position.set(0, 5.7, 0.3);
  gardenEntrance.add(gardenSign);

  // Pathway leading into garden (glowing tiles)
  for (let i = 0; i < 5; i++) {
    const tileGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const tile = new THREE.Mesh(tileGeo, glowMat("#34D399", 0.2));
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(0, 0.02, 1.5 + i * 0.7);
    gardenEntrance.add(tile);
  }

  // Trees flanking entrance
  const entranceTree1 = new THREE.Group();
  const etTrunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 2, 8);
  const etTrunk = new THREE.Mesh(etTrunkGeo, buildMat("#1a1a22", { roughness: 0.6 }));
  etTrunk.position.y = 1;
  etTrunk.castShadow = true;
  entranceTree1.add(etTrunk);
  const etCanGeo = new THREE.ConeGeometry(0.8, 1.2, 10);
  const etCan = new THREE.Mesh(etCanGeo, buildMat("#1a3a2a", { roughness: 0.5 }));
  etCan.position.y = 2.2;
  etCan.name = "treeCanopy";
  entranceTree1.add(etCan);
  entranceTree1.position.set(-3.5, 0, 2.5);
  gardenEntrance.add(entranceTree1);

  const entranceTree2 = entranceTree1.clone();
  entranceTree2.position.set(3.5, 0, 2.5);
  gardenEntrance.add(entranceTree2);

  gardenEntrance.position.set(-7, 0, 0);
  scene.add(gardenEntrance);

  // ═══════════════════════════════════════════════════════════
  // AMBIENT DETAILS
  // ═══════════════════════════════════════════════════════════

  // "UPPER VIBE MEDIA" holographic branding text plane above plaza
  const brandPillarGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8);
  const brandPillar = new THREE.Mesh(brandPillarGeo, buildMat("#1a1a2a", { roughness: 0.2, metalness: 0.8 }));
  brandPillar.position.set(0, 1.25, 3.5);
  brandPillar.castShadow = true;
  scene.add(brandPillar);

  const brandBoardGeo = new THREE.BoxGeometry(3, 0.6, 0.08);
  const brandBoard = new THREE.Mesh(brandBoardGeo, neonMat("#00E5FF", 0.5));
  brandBoard.position.set(0, 2.7, 3.5);
  brandBoard.name = "brandBoard";
  scene.add(brandBoard);

  // Trash bins
  function addTrashBin(x, z) {
    const bin = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.6, 12);
    const body = new THREE.Mesh(bodyGeo, buildMat("#2a2a38", { roughness: 0.3, metalness: 0.6 }));
    body.position.y = 0.3;
    body.castShadow = true;
    bin.add(body);
    bin.position.set(x, 0, z);
    scene.add(bin);
  }
  addTrashBin(6.5, 6.5);
  addTrashBin(-6.5, -6.5);
  addTrashBin(6.5, -5);
  addTrashBin(-5, 6.5);

  // ─── AMBIENT PARTICLES (subtle floating motes) ──────────────
  const particleCount = 150;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 22;
    positions[i + 1] = Math.random() * 5 + 0.5;
    positions[i + 2] = (Math.random() - 0.5) * 22;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.04,
    color: "#88CCFF",
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.name = "particles";
  scene.add(particles);

  // ─── LIGHTING ────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight("#1a1a3a", 0.4));

  const moonLight = new THREE.DirectionalLight("#334466", 0.5);
  moonLight.position.set(5, 15, -3);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  moonLight.shadow.camera.near = 0.5;
  moonLight.shadow.camera.far = 40;
  moonLight.shadow.camera.left = -15;
  moonLight.shadow.camera.right = 15;
  moonLight.shadow.camera.top = 15;
  moonLight.shadow.camera.bottom = -15;
  moonLight.shadow.bias = -0.0001;
  scene.add(moonLight);
}

// ═══════════════════════════════════════════════════════════════
// PLAYER CHARACTER
// ═══════════════════════════════════════════════════════════════
function createPlayer(scene) {
  const player = new THREE.Group();
  player.name = "player";

  // Base glow ring
  const ringGeo = new THREE.TorusGeometry(0.28, 0.03, 16, 32);
  const ring = new THREE.Mesh(ringGeo, neonMat("#00E5FF", 0.4));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  player.add(ring);

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.55, 6);
  const body = new THREE.Mesh(bodyGeo, glowMat("#00A0DC", 0.3));
  body.position.y = 0.48;
  body.castShadow = true;
  player.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const head = new THREE.Mesh(headGeo, glowMat("#00C8FF", 0.4));
  head.position.y = 1.05;
  player.add(head);

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
  const animDataRef = useRef({ spray: [], billboards: [], canopies: [], vines: [] });

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
      scene.background = new THREE.Color("#0a0a18");
      scene.fog = new THREE.Fog("#0a0a18", 12, 35);
      const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
      camera.position.set(0, 5, 10);
      sceneRef.current = scene;

      buildPlaza(scene);

      const player = createPlayer(scene);
      playerRef.current = player;

      // Collect animated objects
      const animData = animDataRef.current;
      scene.traverse((obj) => {
        if (obj.name === "spray" && obj.isGroup) {
          obj.children.forEach((c) => animData.spray.push(c));
        }
        if (obj.name === "billboardScreen") animData.billboards.push(obj);
        if (obj.name === "treeCanopy") animData.canopies.push(obj);
        if (obj.name === "vine") animData.vines.push(obj);
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
          mouse.dx = 0; mouse.dy = 0;
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

        const camDist = 5;
        const camHeight = 3.5;
        const behindX = x - Math.sin(rot) * camDist;
        const behindZ = z - Math.cos(rot) * camDist;
        camera.position.lerp(new THREE.Vector3(behindX, y + camHeight, behindZ), 0.08);
        camera.lookAt(x, y + 0.7, z);

        // Zone detection
        let nearest = null, nearestDist = Infinity;
        for (const d of Object.values(DISTRICTS)) {
          const dx = x - d.position[0];
          const dz = z - d.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < d.zoneRadius && dist < nearestDist) {
            nearest = d.id;
            nearestDist = dist;
          }
        }
        if (nearest !== zoneRef.current) {
          zoneRef.current = nearest;
          onZoneChange?.(nearest);
        }

        // ─── ANIMATIONS ───

        // Fountain spray
        animData.spray.forEach((drop) => {
          drop.position.y = drop.userData.baseY + Math.sin(t * drop.userData.speed + drop.userData.offset) * 0.4;
          drop.material.opacity = 0.4 + Math.sin(t * 2 + drop.userData.offset) * 0.3;
        });

        // Fountain water glow
        const fw = scene.getObjectByName("fountainWater");
        if (fw) fw.material.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.15;

        // Billboard screens subtle pulse
        animData.billboards.forEach((bb, i) => {
          bb.material.opacity = 0.25 + Math.sin(t * 1.5 + i) * 0.1;
        });

        // Tree canopies gentle sway
        animData.canopies.forEach((can, i) => {
          can.rotation.y += dt * 0.15;
        });

        // Vines gentle sway
        animData.vines.forEach((v, i) => {
          v.position.x += Math.sin(t * 1.5 + i) * dt * 0.05;
        });

        // Music store roof edge pulse
        const msEdge = scene.getObjectByName("msRoofEdge");
        if (msEdge) msEdge.material.opacity = 0.4 + Math.sin(t * 2) * 0.2;

        // Music store sign
        const msSign = scene.getObjectByName("msSign");
        if (msSign) msSign.material.opacity = 0.6 + Math.sin(t * 1.5) * 0.2;

        // Brand board
        const brandBoard = scene.getObjectByName("brandBoard");
        if (brandBoard) brandBoard.material.opacity = 0.4 + Math.sin(t * 1.8) * 0.2;

        // Beacon
        const beacon = scene.getObjectByName("beacon");
        if (beacon) beacon.material.opacity = 0.7 + Math.sin(t * 3) * 0.2;

        // Particles drift
        const pts = scene.getObjectByName("particles");
        if (pts) pts.rotation.y += dt * 0.04;

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

  // Keyboard input
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "e" || e.key === "E") {
        const z = zoneRef.current;
        if (z) onEnterCurrentZone?.(z);
      }
    };
    const onUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    const onMouseDown = () => { mouseRef.current.down = true; };
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
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a18]">
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