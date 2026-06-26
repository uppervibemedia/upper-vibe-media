/**
 * DailyVibeCheckZone.js — extracted verbatim from CityCanvas buildPark()
 * Section 8: DAILY VIBE CHECK — Vibe Mirror reflection zone (lines ~603–718 of original)
 * Do NOT modify geometry, positions, colors, or labels.
 */
import * as THREE from "three";
import { createZoneSign } from "../../ZoneSign";

const {
  BoxGeometry, PlaneGeometry, RingGeometry, CircleGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Color, Group, Mesh, PointLight,
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

export function buildDailyVibeCheckZone(scene) {
  const vibeCheck = new Group();
  vibeCheck.name = "dailyVibeCheck";

  // Base platform
  const vcPlat = new Mesh(
    new CircleGeometry(3, 48),
    mat("#142540", { roughness: 0.30, metalness: 0.55 })
  );
  vcPlat.rotation.x = -Math.PI / 2;
  vcPlat.position.set(-16, 0.003, -13);
  vcPlat.receiveShadow = true;
  vibeCheck.add(vcPlat);

  // Outer cyan ring
  const vcOuterRing = new Mesh(
    new RingGeometry(2.85, 3.0, 64),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  vcOuterRing.rotation.x = -Math.PI / 2;
  vcOuterRing.position.set(-16, 0.006, -13);
  vcOuterRing.renderOrder = 1;
  vibeCheck.add(vcOuterRing);

  // Check-in step platform
  const vcStep = new Mesh(
    new CircleGeometry(1.2, 32),
    mat("#1E2E3E", { roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true })
  );
  vcStep.rotation.x = -Math.PI / 2;
  vcStep.position.set(-16, 0.06, -13);
  vcStep.receiveShadow = true;
  vibeCheck.add(vcStep);

  // Step edge glow ring
  const vcStepRing = new Mesh(
    new RingGeometry(1.15, 1.25, 48),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  vcStepRing.rotation.x = -Math.PI / 2;
  vcStepRing.position.set(-16, 0.07, -13);
  vcStepRing.renderOrder = 1;
  vibeCheck.add(vcStepRing);

  // Mirror assembly sub-group — rotated to face Central Plaza + Vibe Lounge
  const mirrorGroup = new Group();
  mirrorGroup.name = "vibeMirrorGroup";
  mirrorGroup.rotation.y = Math.atan2(16, 0);

  // Vibe Mirror — tall glowing vertical panel
  const mirrorMat = mat("#0A1525", { roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85, depthWrite: true });
  const mirror = new Mesh(new BoxGeometry(1.6, 3.5, 0.15), mirrorMat);
  mirror.position.set(0, 1.85, 0);
  mirror.castShadow = true;
  mirror.name = "vibeMirror";
  mirrorGroup.add(mirror);

  // Mirror face glow
  const mirrorFace = new Mesh(
    new PlaneGeometry(1.35, 3.1),
    new MeshBasicMaterial({ color: new Color("#0A2030"), depthWrite: false, side: THREE.DoubleSide })
  );
  mirrorFace.position.set(0.08, 1.85, 0);
  mirrorFace.rotation.y = Math.PI / 2;
  mirrorFace.renderOrder = 1;
  mirrorFace.name = "vibeMirrorFace";
  mirrorGroup.add(mirrorFace);

  // Mirror frame — cyan neon border
  for (const side of [-1, 1]) {
    const frameVert = new Mesh(
      new BoxGeometry(0.04, 3.6, 0.18),
      new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    frameVert.position.set(side * 0.82, 1.85, 0);
    mirrorGroup.add(frameVert);

    const frameHoriz = new Mesh(
      new BoxGeometry(1.68, 0.04, 0.18),
      new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    frameHoriz.position.set(0, 1.85 + side * 1.78, 0);
    mirrorGroup.add(frameHoriz);
  }

  // Energy accent rings floating around the mirror
  for (const ry of [0.4, 2.2, 3.4]) {
    const vcRing = new Mesh(
      new RingGeometry(0.8, 0.95, 48),
      new MeshBasicMaterial({ color: new Color(ry === 2.2 ? "#00E5FF" : "#20A0CC"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    vcRing.rotation.x = -Math.PI / 2;
    vcRing.position.set(0, ry, 0);
    vcRing.renderOrder = 1;
    mirrorGroup.add(vcRing);
  }

  // Pulse dot on top of mirror
  const mirrorDot = new Mesh(
    new SphereGeometry(0.1, 8, 6),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false })
  );
  mirrorDot.position.set(0, 3.7, 0);
  mirrorGroup.add(mirrorDot);

  mirrorGroup.position.set(-16, 0, -13);
  vibeCheck.add(mirrorGroup);

  scene.add(vibeCheck);
  createZoneSign(scene, -16, 4.2, -13, "DAILY  VIBE  CHECK", "#00E5FF");

  // Zone point light
  const vibeCheckLight = new PointLight();
  vibeCheckLight.color = new Color("#00E5FF");
  vibeCheckLight.intensity = 3.5; vibeCheckLight.distance = 12;
  vibeCheckLight.position.set(-16, 2.5, -13);
  scene.add(vibeCheckLight);
}