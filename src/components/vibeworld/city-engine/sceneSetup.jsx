/**
 * sceneSetup.js — Pure scene builder for Upper Vibe City.
 *
 * Exports buildPark(scene) which creates the ENTIRE 3D scene.
 * Individual zone modules create their own objects; sceneSetup only CALLS
 * their create functions. They import config from cityConfig.js only as needed.
 */
import * as THREE from "three";
import { createCosmicSky } from "../CosmicSkySystem";
import createCitySkyline from "../CitySkyline";
import { addDanceFloor } from "../DanceFloor";
import { createJukebox } from "../Jukebox";
import { buildLaunchZone } from "../VibeLaunchZone";
import { createHoverboardZone } from "../HoverboardRingRun";
import { createCrystalZone } from "../CrystalZone";
import createZenBeach from "../ZenBeach";
import { createFerrisWheel } from "../FerrisWheel";
import { createZoneSign } from "../ZoneSign";

const {
  MeshStandardMaterial, MeshBasicMaterial, Color,
  PlaneGeometry, RingGeometry, CircleGeometry, CylinderGeometry,
  SphereGeometry, BoxGeometry,
  Mesh, Group, PointLight, DirectionalLight, AmbientLight,
  HemisphereLight,
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

const isMobScene = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 32;
  const OCEAN_DEPTH = 54;

  const groundGeo = new PlaneGeometry(84, 64);
  const groundMat = mat("#0B1020", { roughness: 0.55, metalness: 0.15 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -10);
  ground.receiveShadow = true;
  ground.name = "plazaGround";
  scene.add(ground);

  const PLAZA_X = 0, PLAZA_Z = -13, PLAZA_R = 10.5;

  const plazaDisc = new Mesh(
    new CircleGeometry(PLAZA_R, 64),
    mat("#141B2D", { roughness: 0.35, metalness: 0.30 })
  );
  plazaDisc.rotation.x = -Math.PI / 2;
  plazaDisc.position.set(PLAZA_X, 0.001, PLAZA_Z);
  plazaDisc.receiveShadow = true;
  plazaDisc.name = "plazaDisc";
  scene.add(plazaDisc);

  const ringInner = new Mesh(
    new RingGeometry(1.8, 2.1, 64),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide })
  );
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.set(PLAZA_X, 0.005, PLAZA_Z);
  ringInner.renderOrder = 1;
  scene.add(ringInner);

  const uvcCanvas = document.createElement("canvas");
  uvcCanvas.width = 128; uvcCanvas.height = 128;
  const uCtx = uvcCanvas.getContext("2d");
  uCtx.fillStyle = "#00D4F0"; uCtx.font = "bold 36px 'Syne','Inter',sans-serif";
  uCtx.textAlign = "center"; uCtx.textBaseline = "middle";
  uCtx.fillText("UVC", 64, 64);
  const uvcTex = new THREE.CanvasTexture(uvcCanvas);
  uvcTex.minFilter = THREE.LinearFilter;
  uvcTex.colorSpace = THREE.SRGBColorSpace;
  const uvcDisc = new Mesh(
    new CircleGeometry(1.5, 32),
    new MeshBasicMaterial({ map: uvcTex, depthWrite: false, side: THREE.DoubleSide })
  );
  uvcDisc.rotation.x = -Math.PI / 2;
  uvcDisc.position.set(PLAZA_X, 0.006, PLAZA_Z);
  uvcDisc.renderOrder = 1;
  scene.add(uvcDisc);

  const ringOuter = new Mesh(
    new RingGeometry(PLAZA_R - 0.5, PLAZA_R - 0.2, 64),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, side: THREE.DoubleSide })
  );
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.set(PLAZA_X, 0.005, PLAZA_Z);
  ringOuter.renderOrder = 1;
  scene.add(ringOuter);
  addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R);
  createJukebox(scene);

  const stage = new Group();
  stage.name = "musicStage";

  const stageRiser = new Mesh(new BoxGeometry(10, 1.0, 5.5), mat("#111830", { roughness: 0.3, metalness: 0.6 }));
  stageRiser.position.set(0, 0.5, -32);
  stageRiser.castShadow = true; stageRiser.receiveShadow = true;
  stage.add(stageRiser);

  const stagePlat = new Mesh(new BoxGeometry(10, 0.25, 5.5), mat("#1A2050", { roughness: 0.2, metalness: 0.65 }));
  stagePlat.position.set(0, 1.12, -32);
  stagePlat.castShadow = true; stagePlat.receiveShadow = true;
  stage.add(stagePlat);

  const stageEdge = new Mesh(
    new BoxGeometry(10.1, 0.08, 0.1),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  stageEdge.position.set(0, 1.27, -29.2);
  stage.add(stageEdge);

  for (const sx of [-5.05, 5.05]) {
    const sideStrip = new Mesh(
      new BoxGeometry(0.06, 1.0, 0.06),
      new MeshBasicMaterial({ color: new Color(sx < 0 ? "#C43BFF" : "#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    sideStrip.position.set(sx, 0.5, -32);
    stage.add(sideStrip);
  }

  const screenMat = mat("#1A1A3A", { roughness: 0.2, metalness: 0.7 });
  const screen = new Mesh(new BoxGeometry(14, 7, 0.2), screenMat);
  screen.position.set(0, 3.5, -34.4);
  screen.castShadow = true;
  screen.name = "stageScreen";
  stage.add(screen);
  scene.userData.stageScreen = screen;
  scene.userData._stageCanvasApplied = false;

  const screenGlow = new Mesh(
    new BoxGeometry(14.3, 7.3, 0.05),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  screenGlow.position.set(0, 3.5, -34.4);
  screenGlow.name = "stageScreenGlow";
  stage.add(screenGlow);

  for (let a = 0; a < 10; a++) {
    const archAngle = -Math.PI / 2 + (a / 9) * Math.PI;
    const ax = Math.cos(archAngle) * 7.2;
    const ay = 3.5 + Math.sin(archAngle) * 7.2;
    const archSeg = new Mesh(
      new BoxGeometry(0.09, 0.09, 0.15),
      new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.85 })
    );
    archSeg.position.set(ax, ay, -34.3);
    stage.add(archSeg);
  }

  const spotL = new PointLight();
  spotL.color = new Color("#A078FF"); spotL.intensity = 5; spotL.distance = 20;
  spotL.position.set(-6, 4.5, -31); stage.add(spotL);

  const spotR = new PointLight();
  spotR.color = new Color("#00D4F0"); spotR.intensity = 5; spotR.distance = 20;
  spotR.position.set(6, 4.5, -31); stage.add(spotR);

  const frontWash = new PointLight();
  frontWash.color = new Color("#9B4FFF"); frontWash.intensity = 3; frontWash.distance = 14;
  frontWash.position.set(0, 2.5, -29); stage.add(frontWash);

  scene.add(stage);
  createZoneSign(scene, 0, 7.4, -34.0, "MUSIC  STAGE", "#00D4F0");

  buildLaunchZone(scene);
  createZoneSign(scene, 0, 3.5, 4, "VIBE  LAUNCH  ZONE", "#00E5FF");

  const lounge = new Group();
  lounge.name = "vibeLounge";
  scene.add(lounge);
  createZoneSign(scene, -22, 3.8, -26, "VIBE  LOUNGE", "#C43BFF");

  const library = new Group();
  library.name = "musicLibrary";
  scene.add(library);
  createZoneSign(scene, 22, 3.6, -20, "MUSIC  LIBRARY", "#00D4F0");

  const dome = new Group();
  dome.name = "visualizerDome";
  scene.add(dome);
  createZoneSign(scene, -13, 3.8, 3, "VISUALIZER  DOME", "#C43BFF");

  const vibeCheck = new Group();
  vibeCheck.name = "dailyVibeCheck";
  scene.add(vibeCheck);
  createZoneSign(scene, -16, 4.2, -13, "DAILY  VIBE  CHECK", "#00E5FF");

  const academy = new Group();
  academy.name = "upperVibeAcademy";
  scene.add(academy);
  createZoneSign(scene, -28, 4.6, 5, "VIBE  ACADEMY", "#7C3AED");

  createCrystalZone(scene);
  createZoneSign(scene, -26, 3.2, -14, "CRYSTAL  ZONE", "#AA66FF");

  createZenBeach(scene, PLAZA_X, PLAZA_Z);
  createHoverboardZone(scene);
  createFerrisWheel(scene);

  const beachGeo = new PlaneGeometry(92, 32);
  const beach = new Mesh(beachGeo, mat("#D4AA70", { roughness: 0.55, metalness: 0.0 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.001, 24);
  beach.receiveShadow = true;
  beach.name = "beach";
  scene.add(beach);

  const oceanWidth = 92;
  const oceanGeo = new PlaneGeometry(oceanWidth, OCEAN_DEPTH, isMobScene ? 4 : 56, isMobScene ? 4 : 54);
  const oceanMat = new MeshBasicMaterial({ color: new Color(isMobScene ? "#38B8E0" : "#30B0DC"), side: THREE.DoubleSide });
  const ocean = new Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0, SHORELINE_Z + OCEAN_DEPTH / 2);
  ocean.renderOrder = 0; ocean.name = "ocean";
  scene.add(ocean);

  const moon = new DirectionalLight();
  moon.color = new Color("#8899CC");
  moon.intensity = 0.6;
  moon.position.set(15, 22, SHORELINE_Z + 10);
  moon.castShadow = true;
  scene.add(moon);

  const ambLight = new AmbientLight();
  ambLight.color = new Color("#4850A0");
  ambLight.intensity = 0.9;
  scene.add(ambLight);

  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#6B5CAA");
  hemiLight.groundColor = new Color("#1A2040");
  hemiLight.intensity = 0.7;
  scene.add(hemiLight);
}