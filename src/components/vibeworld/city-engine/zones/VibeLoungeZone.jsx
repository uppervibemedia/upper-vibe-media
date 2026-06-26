/**
 * VibeLoungeZone.js — extracted verbatim from CityCanvas buildPark()
 * Section 5: VIBE LOUNGE (lines ~321–486 of original)
 * Do NOT modify geometry, positions, colors, or labels.
 */
import * as THREE from "three";
import { createZoneSign } from "../../ZoneSign";

const {
  BoxGeometry, CylinderGeometry, RingGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Color, Group, Mesh, PointLight, CircleGeometry,
} = THREE;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

export function buildVibeLoungeZone(scene) {
  const lounge = new Group();
  lounge.name = "vibeLounge";

  // Platform — larger, darker metallic
  const loungePlat = new Mesh(
    new CircleGeometry(4.5, 48),
    mat("#181032", { roughness: 0.30, metalness: 0.55 })
  );
  loungePlat.rotation.x = -Math.PI / 2;
  loungePlat.position.set(-22, 0.003, -26);
  loungePlat.receiveShadow = true;
  lounge.add(loungePlat);

  // Outer glow ring — pink/purple
  const loungeOuterRing = new Mesh(
    new RingGeometry(4.2, 4.5, 64),
    new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  loungeOuterRing.rotation.x = -Math.PI / 2;
  loungeOuterRing.position.set(-22, 0.006, -26);
  loungeOuterRing.renderOrder = 1;
  lounge.add(loungeOuterRing);

  // Curved neon lounge seating — 5 seats in a semi-circle facing inward
  for (let i = 0; i < 5; i++) {
    const ang = Math.PI + (i / 4) * Math.PI * 0.65;
    const radius = 2.8;
    const sx = -22 + Math.cos(ang) * radius;
    const sz = -26 + Math.sin(ang) * radius;

    const seatBase = new Mesh(
      new BoxGeometry(0.75, 0.18, 0.55),
      mat("#2E1E4A", { roughness: 0.3, metalness: 0.3 })
    );
    seatBase.position.set(sx, 0.15, sz);
    seatBase.rotation.y = -ang + Math.PI;
    seatBase.castShadow = true; seatBase.receiveShadow = true;
    lounge.add(seatBase);

    const cushionGlow = new Mesh(
      new BoxGeometry(0.7, 0.04, 0.48),
      new MeshBasicMaterial({ color: new Color(i % 2 === 0 ? "#C43BFF" : "#A078FF"), depthWrite: false, transparent: true, opacity: 0.55 })
    );
    cushionGlow.position.set(sx, 0.26, sz);
    cushionGlow.rotation.y = -ang + Math.PI;
    lounge.add(cushionGlow);

    if (i < 4) {
      const nextAng = Math.PI + ((i + 0.5) / 4) * Math.PI * 0.65;
      const tx = -22 + Math.cos(nextAng) * (radius - 0.15);
      const tz = -26 + Math.sin(nextAng) * (radius - 0.15);
      const table = new Mesh(
        new CylinderGeometry(0.22, 0.25, 0.12, 8),
        mat("#3A2A5A", { roughness: 0.25, metalness: 0.5 })
      );
      table.position.set(tx, 0.08, tz);
      table.castShadow = true;
      lounge.add(table);

      const tableGlow = new Mesh(
        new CylinderGeometry(0.24, 0.27, 0.03, 8),
        new MeshBasicMaterial({ color: new Color("#E040FB"), depthWrite: false, transparent: true, opacity: 0.5 })
      );
      tableGlow.position.set(tx, 0.15, tz);
      lounge.add(tableGlow);
    }
  }

  // Central fire pit — modernized
  const firePit = new Mesh(
    new CylinderGeometry(0.5, 0.65, 0.25, 24),
    mat("#3A2A5A", { roughness: 0.2, metalness: 0.6 })
  );
  firePit.position.set(-22, 0.14, -26);
  firePit.castShadow = true;
  lounge.add(firePit);

  // Fire glow layers (pink → purple gradient)
  const loungeFireMats = [];
  for (const [radius, opacity] of [[0.55, 0.7], [0.6, 0.4], [0.7, 0.2]]) {
    const fGlowMat = new MeshBasicMaterial({ color: new Color(radius > 0.55 ? "#C43BFF" : "#E040FB"), depthWrite: false, transparent: true, opacity });
    const fGlow = new Mesh(
      new CylinderGeometry(radius, radius + 0.05, 0.05, 24),
      fGlowMat
    );
    fGlow.position.set(-22, 0.32 + (radius - 0.5) * 0.5, -26);
    lounge.add(fGlow);
    loungeFireMats.push(fGlowMat);
  }

  // Neon ambient lighting — 3 RingGeometry arcs
  const loungeNeonMats = [...loungeFireMats];
  const _isMobLounge = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const ARC_COLORS_L = ["#00D4F0", "#A078FF", "#C43BFF"];
  const arcRingMats = [];
  for (let a = 0; a < 3; a++) {
    const arcR = 3.2 + a * 0.5;
    const arcMat = new MeshBasicMaterial({
      color: new Color(ARC_COLORS_L[a]),
      depthWrite: false, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    });
    const arcRing = new Mesh(
      new RingGeometry(arcR - 0.07, arcR + 0.07, _isMobLounge ? 32 : 48),
      arcMat
    );
    arcRing.rotation.x = -Math.PI / 2;
    arcRing.position.set(-22, 0.02, -26);
    arcRing.renderOrder = 1;
    lounge.add(arcRing);
    arcRingMats.push(arcMat);
    loungeNeonMats.push(arcMat);
  }

  // Vertical neon accent pillars — 4 around the lounge
  for (let p = 0; p < 4; p++) {
    const pAng = Math.PI + (p / 3) * Math.PI * 0.65;
    const pr = 3.0;
    const px = -22 + Math.cos(pAng) * pr;
    const pz = -26 + Math.sin(pAng) * pr;
    const pillarMat = new MeshBasicMaterial({
      color: new Color(p % 2 === 0 ? "#00D4F0" : "#A078FF"),
      depthWrite: false, transparent: true, opacity: 0.45,
    });
    const pillar = new Mesh(
      new CylinderGeometry(0.04, 0.04, 2.2, 8),
      pillarMat
    );
    pillar.position.set(px, 1.1, pz);
    lounge.add(pillar);
    loungeNeonMats.push(pillarMat);

    const topDot = new Mesh(
      new SphereGeometry(0.08, 6, 4),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    topDot.position.set(px, 2.2, pz);
    lounge.add(topDot);
    loungeNeonMats.push(topDot.material);
  }

  // Ambient energy ring
  const energyRing = new Mesh(
    new RingGeometry(2.8, 3.0, 64),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
  );
  energyRing.rotation.x = -Math.PI / 2;
  energyRing.position.set(-22, 0.07, -26);
  energyRing.renderOrder = 1;
  lounge.add(energyRing);
  loungeNeonMats.push(energyRing.material);

  scene.userData.loungeNeonMats = loungeNeonMats;

  scene.add(lounge);
  createZoneSign(scene, -22, 3.8, -26, "VIBE  LOUNGE", "#C43BFF");

  // Zone point light
  const loungeLight = new PointLight();
  loungeLight.color = new Color("#E040FB");
  loungeLight.intensity = 3.5; loungeLight.distance = 14;
  loungeLight.position.set(-22, 2.5, -26);
  scene.add(loungeLight);
  scene.userData.loungeLight = loungeLight;
}