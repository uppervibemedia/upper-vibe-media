/**
 * VisualizerDomeZone.js
 * Extracted from CityCanvas.jsx — lines 556–601 (Section 7: VISUALIZER DOME)
 * DO NOT MODIFY geometry, positions, colors, or labels.
 * Extraction only — zero behavior changes.
 */
import * as THREE from "three";
import { createZoneSign } from "../../ZoneSign";

const {
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  CircleGeometry,
  SphereGeometry,
  BoxGeometry,
  Mesh,
  Group,
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

export function buildVisualizerDomeZone(scene) {
  const dome = new Group();
  dome.name = "visualizerDome";

  const domeGeo2 = new SphereGeometry(3.5, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMesh2 = new Mesh(
    domeGeo2,
    mat("#1A2540", { roughness: 0.20, metalness: 0.65, transparent: true, opacity: 0.75, depthWrite: true })
  );
  domeMesh2.position.set(-13, 0.05, 10);
  domeMesh2.castShadow = true;
  dome.add(domeMesh2);

  // Pulsing LED dots on dome surface
  for (let d = 0; d < 20; d++) {
    const dAng = (d / 20) * Math.PI * 2;
    const dot = new Mesh(
      new SphereGeometry(0.08, 4, 3),
      new MeshBasicMaterial({ color: new Color(["#C43BFF", "#00D4F0", "#FF00FF"][d % 3]), depthWrite: false })
    );
    dot.position.set(-13 + Math.cos(dAng) * 3.2, 1.5 + (d % 3) * 0.8, 3 + Math.sin(dAng) * 3.2);
    dome.add(dot);
  }

  // Entrance faces Central Plaza (northeast from dome at -10,8 toward 0,-4)
  const domeEntrance = new Mesh(
    new BoxGeometry(2.5, 3.5, 0.1),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.85 })
  );
  domeEntrance.position.set(-13, 1.75, 10 - 3.35);
  domeEntrance.name = "domeEntrance";
  dome.add(domeEntrance);

  const domeFloor = new Mesh(
    new CircleGeometry(3, 32),
    new MeshBasicMaterial({ color: new Color("#1E2A4E"), depthWrite: false, transparent: true, opacity: 0.3 })
  );
  domeFloor.rotation.x = -Math.PI / 2;
  domeFloor.position.set(-13, 0.003, 10);
  dome.add(domeFloor);

  scene.add(dome);
  // Dome sign — above the dome top
  createZoneSign(scene, -13, 3.8, 10, "VISUALIZER  DOME", "#C43BFF");
}