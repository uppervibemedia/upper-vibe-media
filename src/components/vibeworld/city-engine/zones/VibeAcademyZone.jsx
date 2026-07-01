/**
 * VibeAcademyZone.js — extracted verbatim from CityCanvas buildPark()
 * Section 8.5: UPPER VIBE ACADEMY (lines ~720–851 of original)
 * Do NOT modify geometry, positions, colors, or labels.
 */
import * as THREE from "three";
import { createZoneSign } from "../../ZoneSign";

const {
  BoxGeometry, CylinderGeometry, SphereGeometry,
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

export function buildVibeAcademyZone(scene) {
  const academy = new Group();
  academy.name = "upperVibeAcademy";

  const ACAD_X = -28, ACAD_Z = 10;

  // Base platform — wide, cinematic
  const acadPlat = new Mesh(
    new BoxGeometry(8, 0.15, 6),
    mat("#181032", { roughness: 0.30, metalness: 0.55 })
  );
  acadPlat.position.set(ACAD_X, 0.08, ACAD_Z);
  acadPlat.receiveShadow = true;
  academy.add(acadPlat);

  // Main building — wide theater-style front
  const acadBldg = new Mesh(
    new BoxGeometry(6, 3.5, 4.5),
    mat("#1A1030", { roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.88, depthWrite: true })
  );
  acadBldg.position.set(ACAD_X, 1.9, ACAD_Z);
  acadBldg.castShadow = true;
  academy.add(acadBldg);

  // Marquee top — floating roof panel
  const marquee = new Mesh(
    new BoxGeometry(6.6, 0.2, 1.2),
    new MeshBasicMaterial({ color: new Color("#7C3AED"), depthWrite: false, transparent: true, opacity: 0.7 })
  );
  marquee.position.set(ACAD_X, 3.7, ACAD_Z + 2.0);
  academy.add(marquee);

  // Marquee edge glow
  for (const sx of [-1, 1]) {
    const marqEdge = new Mesh(
      new BoxGeometry(6.6, 0.05, 0.06),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.8 })
    );
    marqEdge.position.set(ACAD_X, 3.7, ACAD_Z + 2.0 + sx * 0.58);
    academy.add(marqEdge);
  }

  // Purple/cyan ring bands around building
  for (const ry of [0.4, 2.0, 3.3]) {
    const acadRing = new Mesh(
      new BoxGeometry(6.15, 0.06, 4.65),
      new MeshBasicMaterial({
        color: new Color(ry === 2.0 ? "#00D4F0" : "#7C3AED"),
        depthWrite: false, transparent: true, opacity: 0.4,
      })
    );
    acadRing.position.set(ACAD_X, ry, ACAD_Z);
    academy.add(acadRing);
  }

  // Cinema entrance — wide doorway
  const entGeo = new BoxGeometry(3.5, 3.2, 0.12);
  const entMat = new MeshBasicMaterial({
    color: new Color("#00D4F0"),
    depthWrite: false, transparent: true, opacity: 0.6,
  });
  const entrance = new Mesh(entGeo, entMat);
  const entAngle = Math.atan2(5 - 0, -20 - 0);
  entrance.position.set(ACAD_X + Math.sin(entAngle) * 2.9, 1.7, ACAD_Z + Math.cos(entAngle) * 2.9);
  entrance.rotation.y = entAngle;
  entrance.name = "academyEntrance";
  academy.add(entrance);

  // Door frame glow pillars
  for (const side of [-1, 1]) {
    const pillarX = ACAD_X + Math.sin(entAngle) * 2.9 + Math.cos(entAngle) * side * 1.8;
    const pillarZ = ACAD_Z + Math.cos(entAngle) * 2.9 - Math.sin(entAngle) * side * 1.8;
    const pillar = new Mesh(
      new CylinderGeometry(0.08, 0.1, 3.2, 8),
      new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
    );
    pillar.position.set(pillarX, 1.7, pillarZ);
    academy.add(pillar);
  }

  // Theater seats (glowing rows visible through entrance)
  for (let row = 0; row < 3; row++) {
    const rz = ACAD_Z - 2.2 + row * 0.6;
    for (let s = -3; s <= 3; s++) {
      const seat = new Mesh(
        new BoxGeometry(0.3, 0.12, 0.25),
        mat(row === 1 ? "#2A1A5A" : "#1E143E", { roughness: 0.3, metalness: 0.3 })
      );
      seat.position.set(ACAD_X + s * 0.55, 0.2, rz);
      seat.castShadow = true;
      academy.add(seat);

      if (row === 1 && s % 2 === 0) {
        const seatGlow = new Mesh(
          new BoxGeometry(0.28, 0.03, 0.22),
          new MeshBasicMaterial({ color: new Color(s === 0 ? "#00D4F0" : "#7C3AED"), depthWrite: false, transparent: true, opacity: 0.45 })
        );
        seatGlow.position.set(ACAD_X + s * 0.55, 0.27, rz);
        academy.add(seatGlow);
      }
    }
  }

  // Roof accent — small dome/sphere
  const roofDome = new Mesh(
    new SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    mat("#2A1A5A", { roughness: 0.25, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true })
  );
  roofDome.position.set(ACAD_X, 3.85, ACAD_Z);
  roofDome.castShadow = true;
  academy.add(roofDome);

  const roofDot = new Mesh(
    new SphereGeometry(0.1, 8, 6),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  roofDot.position.set(ACAD_X, 4.3, ACAD_Z);
  academy.add(roofDot);

  scene.add(academy);
  createZoneSign(scene, ACAD_X, 4.6, ACAD_Z, "UPPER  VIBE  ACADEMY", "#7C3AED");

  // Academy ambient light
  const academyLight = new PointLight();
  academyLight.color = new Color("#7C3AED");
  academyLight.intensity = 1.8; academyLight.distance = 12;
  academyLight.position.set(ACAD_X, 2.5, ACAD_Z);
  scene.add(academyLight);
}