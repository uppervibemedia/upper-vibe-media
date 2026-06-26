import * as THREE from 'three';
import createCitySkyline from "../CitySkyline";
import { createFerrisWheel } from "../FerrisWheel";
import createZenBeach from "../ZenBeach";
import { addDanceFloor } from "../DanceFloor";
import { createJukebox } from "../Jukebox";
import { buildLaunchZone } from "../VibeLaunchZone";
import { createHoverboardZone } from "../HoverboardRingRun";
import { createCrystalZone } from "../CrystalZone";
import { createCosmicSky } from "../CosmicSkySystem";
import { createZoneSign } from "../ZoneSign";

// This file will contain the scene-building logic extracted from CityCanvas.jsx
// to make the main component lighter and more focused on state management.

function mat(hexColor, opts = {}) {
  const m = new THREE.MeshStandardMaterial();
  m.color = new THREE.Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

export function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 32;
  const OCEAN_DEPTH = 54;

  const groundGeo = new THREE.PlaneGeometry(84, 64);
  const groundMat = mat("#0B1020", { roughness: 0.55, metalness: 0.15 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -10);
  ground.receiveShadow = true;
  ground.name = "plazaGround";
  scene.add(ground);
  
  // All other scene setup logic (plaza, stage, lounge, etc.) will be moved here
  const PLAZA_X = 0, PLAZA_Z = -13, PLAZA_R = 10.5;

  const plazaDisc = new THREE.Mesh(
    new THREE.CircleGeometry(PLAZA_R, 64),
    mat("#141B2D", { roughness: 0.35, metalness: 0.30 })
  );
  plazaDisc.rotation.x = -Math.PI / 2;
  plazaDisc.position.set(PLAZA_X, 0.001, PLAZA_Z);
  plazaDisc.receiveShadow = true;
  plazaDisc.name = "plazaDisc";
  scene.add(plazaDisc);

  addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R);
  createJukebox(scene);
  buildLaunchZone(scene);
  createHoverboardZone(scene);
  createCrystalZone(scene);
  createZenBeach(scene, PLAZA_X, PLAZA_Z);
  createFerrisWheel(scene);

  // Lighting
  const moon = new THREE.DirectionalLight();
  moon.color = new THREE.Color("#8899CC");
  moon.intensity = 0.6;
  moon.position.set(15, 22, SHORELINE_Z + 10);
  moon.castShadow = true;
  moon.shadow.mapSize.width = 1024;
  moon.shadow.mapSize.height = 1024;
  scene.add(moon);

  const ambLight = new THREE.AmbientLight();
  ambLight.color = new THREE.Color("#4850A0");
  ambLight.intensity = 0.9;
  scene.add(ambLight);

  const hemiLight = new THREE.HemisphereLight();
  hemiLight.color = new THREE.Color("#6B5CAA");
  hemiLight.groundColor = new THREE.Color("#1A2040");
  hemiLight.intensity = 0.7;
  scene.add(hemiLight);
}