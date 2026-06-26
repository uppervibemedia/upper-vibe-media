/**
 * sceneSetup.js — Pure scene builder for Upper Vibe City.
 *
 * Exports buildPark(scene) which creates the ENTIRE 3D scene.
 * This is the biggest file so it stays as a single new module
 * (the 2500-line edit limit applies to existing files only).
 *
 * Individual zone modules already exist as their own files;
 * sceneSetup only CALLS their create functions, it doesn't redefine them.
 * They import config from cityConfig.js only as needed.
 */
import * as THREE from "three";
import { SHORELINE_Z, OCEAN_DEPTH } from "./cityConfig";
import { createCosmicSky } from "../CosmicSkySystem";
import createCitySkyline from "../CitySkyline";
import { addDanceFloor } from "../DanceFloor";
import {
  createJukebox, DANCE_FLOOR_RADIUS,
} from "../Jukebox";
import { buildLaunchZone } from "../VibeLaunchZone";
import { createHoverboardZone } from "../HoverboardRingRun";
import { createCrystalZone } from "../CrystalZone";
import { createZenBeach } from "../ZenBeach";
import { createFerrisWheel, WHEEL_X, WHEEL_Z } from "../FerrisWheel";
import { createZoneSign } from "../ZoneSign";

const {
  MeshStandardMaterial, MeshBasicMaterial, Color,
  PlaneGeometry, RingGeometry, CircleGeometry, CylinderGeometry,
  SphereGeometry, BoxGeometry, TorusGeometry,
  Mesh, Group, Vector3, PointLight, DirectionalLight, AmbientLight,
  HemisphereLight, Quaternion,
} = THREE;

// ── Color helper ───────────────────────────────────────────────────
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

// Mobile check (defined outside closure so both mobile & desktop runners access the same value)
const isMobScene = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function buildPark(scene) {
  // ═════════════════════════════════════════════════════════════
  // COSMIC SKY & SKYLINE — must come first for proper layering
  // ═════════════════════════════════════════════════════════════
  createCosmicSky(scene);
  createCitySkyline(scene);

  // ═════════════════════════════════════════════════════════════
  // 1. GROUND — dark urban plaza floor
  // ═════════════════════════════════════════════════════════════
  const groundGeo = new PlaneGeometry(84, 64);
  const groundMat = mat("#0B1020", { roughness: 0.55, metalness: 0.15 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -10);
  ground.receiveShadow = true;
  ground.name = "plazaGround";
  scene.add(ground);

  // ═════════════════════════════════════════════════════════════
  // 2. UVC CENTRAL PLAZA — circular hub at center
  // ═════════════════════════════════════════════════════════════
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

  // ═════════════════════════════════════════════════════════════
  // 3. OPEN CONNECTED FLOOR
  // ═════════════════════════════════════════════════════════════

  // ═════════════════════════════════════════════════════════════
  // 4. MAIN MUSIC STAGE
  // ═════════════════════════════════════════════════════════════
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

  // ═════════════════════════════════════════════════════════════
  // VIBE LAUNCH ZONE
  // ═════════════════════════════════════════════════════════════
  buildLaunchZone(scene);
  createZoneSign(scene, 0, 3.5, 4, "VIBE  LAUNCH  ZONE", "#00E5FF");

  // ═════════════════════════════════════════════════════════════
  // 5. VIBE LOUNGE
  // ═════════════════════════════════════════════════════════════
  const lounge = new Group();
  lounge.name = "vibeLounge";

  const loungePlat = new Mesh(
    new CircleGeometry(4.5, 48),
    mat("#181032", { roughness: 0.30, metalness: 0.55 })
  );
  loungePlat.rotation.x = -Math.PI / 2;
  loungePlat.position.set(-22, 0.003, -26);
  loungePlat.receiveShadow = true;
  lounge.add(loungePlat);

  const loungeOuterRing = new Mesh(
    new RingGeometry(4.2, 4.5, 64),
    new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  loungeOuterRing.rotation.x = -Math.PI / 2;
  loungeOuterRing.position.set(-22, 0.006, -26);
  loungeOuterRing.renderOrder = 1;
  lounge.add(loungeOuterRing);

  const loungeFireMats = [];
  for (const [radius, opacity] of [[0.55, 0.7], [0.6, 0.4], [0.7, 0.2]]) {
    const fGlowMat = new MeshBasicMaterial({ color: new Color(radius > 0.55 ? "#C43BFF" : "#E040FB"), depthWrite: false, transparent: true, opacity });
    const fGlow = new Mesh(new CylinderGeometry(radius, radius + 0.05, 0.05, 24), fGlowMat);
    fGlow.position.set(-22, 0.32 + (radius - 0.5) * 0.5, -26);
    lounge.add(fGlow);
    loungeFireMats.push(fGlowMat);
  }

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
    const arcRing = new Mesh(new RingGeometry(arcR - 0.07, arcR + 0.07, _isMobLounge ? 32 : 48), arcMat);
    arcRing.rotation.x = -Math.PI / 2;
    arcRing.position.set(-22, 0.02, -26);
    arcRing.renderOrder = 1;
    lounge.add(arcRing);
    arcRingMats.push(arcMat);
    loungeNeonMats.push(arcMat);
  }

  for (let p = 0; p < 4; p++) {
    const pAng = Math.PI + (p / 3) * Math.PI * 0.65;
    const pr = 3.0;
    const px = -22 + Math.cos(pAng) * pr;
    const pz = -26 + Math.sin(pAng) * pr;
    const pillarMat = new MeshBasicMaterial({
      color: new Color(p % 2 === 0 ? "#00D4F0" : "#A078FF"),
      depthWrite: false, transparent: true, opacity: 0.45,
    });
    const pillar = new Mesh(new CylinderGeometry(0.04, 0.04, 2.2, 8), pillarMat);
    pillar.position.set(px, 1.1, pz);
    lounge.add(pillar);
    loungeNeonMats.push(pillarMat);

    const topDot = new Mesh(new SphereGeometry(0.08, 6, 4), new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 }));
    topDot.position.set(px, 2.2, pz);
    lounge.add(topDot);
    loungeNeonMats.push(topDot.material);
  }

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

  // ═════════════════════════════════════════════════════════════
  // 6. MUSIC LIBRARY
  // ═════════════════════════════════════════════════════════════
  const library = new Group();
  library.name = "musicLibrary";

  const libPlat = new Mesh(new CircleGeometry(4, 32), mat("#162040", { roughness: 0.35, metalness: 0.35 }));
  libPlat.rotation.x = -Math.PI / 2;
  libPlat.position.set(22, 0.002, -20);
  libPlat.receiveShadow = true;
  library.add(libPlat);

  const libBldg = new Mesh(
    new CylinderGeometry(2.8, 3, 3.2, 16),
    mat("#1E2E4A", { roughness: 0.3, metalness: 0.35, transparent: true, opacity: 0.85, depthWrite: true })
  );
  libBldg.position.set(22, 1.6, -20);
  libBldg.castShadow = true;
  library.add(libBldg);

  for (const ry of [0.3, 1.8, 3.0]) {
    const libRing = new Mesh(new RingGeometry(2.85, 3.05, 32), new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide }));
    libRing.rotation.x = -Math.PI / 2;
    libRing.position.set(22, ry, -20);
    libRing.renderOrder = 1;
    library.add(libRing);
  }

  const iconCanvas = document.createElement("canvas");
  iconCanvas.width = 64; iconCanvas.height = 64;
  const iCtx = iconCanvas.getContext("2d");
  iCtx.fillStyle = "#00D4F0"; iCtx.font = "bold 40px sans-serif";
  iCtx.textAlign = "center"; iCtx.textBaseline = "middle";
  iCtx.fillText("🎧", 32, 32);
  const iconTex = new THREE.CanvasTexture(iconCanvas);
  iconTex.minFilter = THREE.LinearFilter;
  iconTex.colorSpace = THREE.SRGBColorSpace;
  const iconDisc = new Mesh(new CircleGeometry(1.2, 16), new MeshBasicMaterial({ map: iconTex, depthWrite: false, side: THREE.DoubleSide }));
  iconDisc.rotation.x = -Math.PI / 2;
  iconDisc.position.set(22, 3.25, -20);
  iconDisc.renderOrder = 1;
  library.add(iconDisc);

  const libEntrance = new Mesh(new BoxGeometry(2.2, 3.0, 0.08), new MeshBasicMaterial({ color: new Color("#0080B8"), depthWrite: false, transparent: true, opacity: 0.65 }));
  libEntrance.position.set(22 - 2.8, 1.5, -20);
  libEntrance.rotation.y = Math.PI / 2;
  library.add(libEntrance);

  scene.add(library);
  createZoneSign(scene, 22, 3.6, -20, "MUSIC  LIBRARY", "#00D4F0");

  // ═════════════════════════════════════════════════════════════
  // 7. VISUALIZER DOME
  // ═════════════════════════════════════════════════════════════
  const dome = new Group();
  dome.name = "visualizerDome";

  const domeGeo2 = new SphereGeometry(3.5, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMesh2 = new Mesh(domeGeo2, mat("#1A2540", { roughness: 0.20, metalness: 0.65, transparent: true, opacity: 0.75, depthWrite: true }));
  domeMesh2.position.set(-13, 0.05, 3);
  domeMesh2.castShadow = true;
  dome.add(domeMesh2);

  for (let d = 0; d < 20; d++) {
    const dAng = (d / 20) * Math.PI * 2;
    const dot = new Mesh(new SphereGeometry(0.08, 4, 3), new MeshBasicMaterial({ color: new Color(["#C43BFF", "#00D4F0", "#FF00FF"][d % 3]), depthWrite: false }));
    dot.position.set(-13 + Math.cos(dAng) * 3.2, 1.5 + (d % 3) * 0.8, 3 + Math.sin(dAng) * 3.2);
    dome.add(dot);
  }

  const domeEntrance = new Mesh(new BoxGeometry(2.5, 3.5, 0.1), new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.85 }));
  domeEntrance.position.set(-13, 1.75, 3 - 3.35);
  domeEntrance.name = "domeEntrance";
  dome.add(domeEntrance);

  const domeFloor = new Mesh(new CircleGeometry(3, 32), new MeshBasicMaterial({ color: new Color("#1E2A4E"), depthWrite: false, transparent: true, opacity: 0.3 }));
  domeFloor.rotation.x = -Math.PI / 2;
  domeFloor.position.set(-13, 0.003, 3);
  dome.add(domeFloor);

  scene.add(dome);
  createZoneSign(scene, -13, 3.8, 3, "VISUALIZER  DOME", "#C43BFF");

  // ═════════════════════════════════════════════════════════════
  // 8. DAILY VIBE CHECK
  // ═════════════════════════════════════════════════════════════
  const vibeCheck = new Group();
  vibeCheck.name = "dailyVibeCheck";

  const vcPlat = new Mesh(new CircleGeometry(3, 48), mat("#142540", { roughness: 0.30, metalness: 0.55 }));
  vcPlat.rotation.x = -Math.PI / 2;
  vcPlat.position.set(-16, 0.003, -13);
  vcPlat.receiveShadow = true;
  vibeCheck.add(vcPlat);

  const vcOuterRing = new Mesh(new RingGeometry(2.85, 3.0, 64), new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
  vcOuterRing.rotation.x = -Math.PI / 2;
  vcOuterRing.position.set(-16, 0.006, -13);
  vcOuterRing.renderOrder = 1;
  vibeCheck.add(vcOuterRing);

  const vcStep = new Mesh(new CircleGeometry(1.2, 32), mat("#1E2E3E", { roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true }));
  vcStep.rotation.x = -Math.PI / 2;
  vcStep.position.set(-16, 0.06, -13);
  vcStep.receiveShadow = true;
  vibeCheck.add(vcStep);

  const vcStepRing = new Mesh(new RingGeometry(1.15, 1.25, 48), new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
  vcStepRing.rotation.x = -Math.PI / 2;
  vcStepRing.position.set(-16, 0.07, -13);
  vcStepRing.renderOrder = 1;
  vibeCheck.add(vcStepRing);

  const mirrorGroup = new Group();
  mirrorGroup.name = "vibeMirrorGroup";
  mirrorGroup.rotation.y = Math.atan2(16, 0);

  const mirrorMat = mat("#0A1525", { roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85, depthWrite: true });
  const mirror = new Mesh(new BoxGeometry(1.6, 3.5, 0.15), mirrorMat);
  mirror.position.set(0, 1.85, 0);
  mirror.castShadow = true;
  mirror.name = "vibeMirror";
  mirrorGroup.add(mirror);

  const mirrorFace = new Mesh(new PlaneGeometry(1.35, 3.1), new MeshBasicMaterial({ color: new Color("#0A2030"), depthWrite: false, side: THREE.DoubleSide }));
  mirrorFace.position.set(0.08, 1.85, 0);
  mirrorFace.rotation.y = Math.PI / 2;
  mirrorFace.renderOrder = 1;
  mirrorFace.name = "vibeMirrorFace";
  mirrorGroup.add(mirrorFace);

  for (const side of [-1, 1]) {
    const frameVert = new Mesh(new BoxGeometry(0.04, 3.6, 0.18), new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 }));
    frameVert.position.set(side * 0.82, 1.85, 0);
    mirrorGroup.add(frameVert);

    const frameHoriz = new Mesh(new BoxGeometry(1.68, 0.04, 0.18), new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 }));
    frameHoriz.position.set(0, 1.85 + side * 1.78, 0);
    mirrorGroup.add(frameHoriz);
  }

  for (const ry of [0.4, 2.2, 3.4]) {
    const vcRing = new Mesh(new RingGeometry(0.8, 0.95, 48), new MeshBasicMaterial({
      color: new Color(ry === 2.2 ? "#00E5FF" : "#20A0CC"),
      depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.35,
    }));
    vcRing.rotation.x = -Math.PI / 2;
    vcRing.position.set(0, ry, 0);
    vcRing.renderOrder = 1;
    mirrorGroup.add(vcRing);
  }

  const mirrorDot = new Mesh(new SphereGeometry(0.1, 8, 6), new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false }));
  mirrorDot.position.set(0, 3.7, 0);
  mirrorGroup.add(mirrorDot);
  mirrorGroup.position.set(-16, 0, -13);
  vibeCheck.add(mirrorGroup);

  scene.add(vibeCheck);
  createZoneSign(scene, -16, 4.2, -13, "DAILY  VIBE  CHECK", "#00E5FF");

  // ═════════════════════════════════════════════════════════════
  // 8.5. UPPER VIBE ACADEMY
  // ═════════════════════════════════════════════════════════════
  const academy = new Group();
  academy.name = "upperVibeAcademy";
  const ACAD_X = -28, ACAD_Z = 5;

  const acadPlat = new Mesh(new BoxGeometry(8, 0.15, 6), mat("#181032", { roughness: 0.30, metalness: 0.55 }));
  acadPlat.position.set(ACAD_X, 0.08, ACAD_Z);
  acadPlat.receiveShadow = true;
  academy.add(acadPlat);

  const acadBldg = new Mesh(new BoxGeometry(6, 3.5, 4.5), mat("#1A1030", { roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.88, depthWrite: true }));
  acadBldg.position.set(ACAD_X, 1.9, ACAD_Z);
  acadBldg.castShadow = true;
  academy.add(acadBldg);

  const marquee = new Mesh(new BoxGeometry(6.6, 0.2, 1.2), new MeshBasicMaterial({ color: new Color("#7C3AED"), depthWrite: false, transparent: true, opacity: 0.7 }));
  marquee.position.set(ACAD_X, 3.7, ACAD_Z + 2.0);
  academy.add(marquee);

  for (const sx of [-1, 1]) {
    const marqEdge = new Mesh(new BoxGeometry(6.6, 0.05, 0.06), new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.8 }));
    marqEdge.position.set(ACAD_X, 3.7, ACAD_Z + 2.0 + sx * 0.58);
    academy.add(marqEdge);
  }

  for (const ry of [0.4, 2.0, 3.3]) {
    const acadRing = new Mesh(new BoxGeometry(6.15, 0.06, 4.65), new MeshBasicMaterial({ color: new Color(ry === 2.0 ? "#00D4F0" : "#7C3AED"), depthWrite: false, transparent: true, opacity: 0.4 }));
    acadRing.position.set(ACAD_X, ry, ACAD_Z);
    academy.add(acadRing);
  }

  const entGeo = new BoxGeometry(3.5, 3.2, 0.12);
  const entMat = new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.6 });
  const entrance = new Mesh(entGeo, entMat);
  const entAngle = Math.atan2(5 - 0, -20 - 0);
  entrance.position.set(ACAD_X + Math.sin(entAngle) * 2.9, 1.7, ACAD_Z + Math.cos(entAngle) * 2.9);
  entrance.rotation.y = entAngle;
  entrance.name = "academyEntrance";
  academy.add(entrance);

  for (const side of [-1, 1]) {
    const pillarX = ACAD_X + Math.sin(entAngle) * 2.9 + Math.cos(entAngle) * side * 1.8;
    const pillarZ = ACAD_Z + Math.cos(entAngle) * 2.9 - Math.sin(entAngle) * side * 1.8;
    const pillar = new Mesh(new CylinderGeometry(0.08, 0.1, 3.2, 8), new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 }));
    pillar.position.set(pillarX, 1.7, pillarZ);
    academy.add(pillar);
  }

  for (let row = 0; row < 3; row++) {
    const rz = ACAD_Z - 2.2 + row * 0.6;
    for (let s = -3; s <= 3; s++) {
      const seat = new Mesh(new BoxGeometry(0.3, 0.12, 0.25), mat(row === 1 ? "#2A1A5A" : "#1E143E", { roughness: 0.3, metalness: 0.3 }));
      seat.position.set(ACAD_X + s * 0.55, 0.2, rz);
      seat.castShadow = true;
      academy.add(seat);

      if (row === 1 && s % 2 === 0) {
        const seatGlow = new Mesh(new BoxGeometry(0.28, 0.03, 0.22), new MeshBasicMaterial({ color: new Color(s === 0 ? "#00D4F0" : "#7C3AED"), depthWrite: false, transparent: true, opacity: 0.45 }));
        seatGlow.position.set(ACAD_X + s * 0.55, 0.27, rz);
        academy.add(seatGlow);
      }
    }
  }

  const roofDome = new Mesh(new SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat("#2A1A5A", { roughness: 0.25, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true }));
  roofDome.position.set(ACAD_X, 3.85, ACAD_Z);
  roofDome.castShadow = true;
  academy.add(roofDome);

  const roofDot = new Mesh(new SphereGeometry(0.1, 8, 6), new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false }));
  roofDot.position.set(ACAD_X, 4.3, ACAD_Z);
  academy.add(roofDot);

  scene.add(academy);
  createZoneSign(scene, ACAD_X, 4.6, ACAD_Z, "VIBE  ACADEMY", "#7C3AED");

  const academyLight = new PointLight();
  academyLight.color = new Color("#7C3AED");
  academyLight.intensity = 1.8; academyLight.distance = 12;
  academyLight.position.set(ACAD_X, 2.5, ACAD_Z);
  scene.add(academyLight);

  // ═════════════════════════════════════════════════════════════
  // 8.5.5 CRYSTAL ZONE
  // ═════════════════════════════════════════════════════════════
  createCrystalZone(scene);
  createZoneSign(scene, -26, 3.2, -14, "CRYSTAL  ZONE", "#AA66FF");

  // ═════════════════════════════════════════════════════════════
  // 8.6. ZEN BEACH
  // ═════════════════════════════════════════════════════════════
  createZenBeach(scene, PLAZA_X, PLAZA_Z);

  // ═════════════════════════════════════════════════════════════
  // 8.8. HOVERBOARD RING RUN (right beach)
  // ═════════════════════════════════════════════════════════════
  createHoverboardZone(scene);

  // ═════════════════════════════════════════════════════════════
  // 8.7. NEON VIBE WHEEL (FERRIS)
  // ═════════════════════════════════════════════════════════════
  createFerrisWheel(scene);

  // ═════════════════════════════════════════════════════════════
  // 9. CITY EDGE BUILDINGS (currently empty)
  // ═════════════════════════════════════════════════════════════
  const edgeBuildings = new Group();
  edgeBuildings.name = "edgeBuildings";
  scene.add(edgeBuildings);

  // ═════════════════════════════════════════════════════════════
  // 10. BEACH — sand strip
  // ═════════════════════════════════════════════════════════════
  const beachGeo = new PlaneGeometry(92, 32);
  const beach = new Mesh(beachGeo, mat("#D4AA70", { roughness: 0.55, metalness: 0.0 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.001, 24);
  beach.receiveShadow = true;
  beach.name = "beach";
  scene.add(beach);

  // ═════════════════════════════════════════════════════════════
  // 11. OCEAN
  // ═════════════════════════════════════════════════════════════
  const oceanWidth = 92;
  const oceanGeo = new PlaneGeometry(oceanWidth, OCEAN_DEPTH, isMobScene ? 4 : 56, isMobScene ? 4 : 54);
  const oceanMat = new MeshBasicMaterial({ color: new Color(isMobScene ? "#38B8E0" : "#30B0DC"), side: THREE.DoubleSide });
  const ocean = new Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0, SHORELINE_Z + OCEAN_DEPTH / 2);
  ocean.renderOrder = 0; ocean.name = "ocean";
  scene.add(ocean);
  const origArr = isMobScene ? null : (() => {
    const a = new Float32Array(oceanGeo.attributes.position.array.length);
    a.set(oceanGeo.attributes.position.array);
    return a;
  })();
  scene.userData.ocean = ocean;
  scene.userData._oceanOrig = origArr;
  scene.userData._oceanStatic = isMobScene;
  scene.userData._oceanCenterZ = SHORELINE_Z + OCEAN_DEPTH / 2;

  const foamGeo = new PlaneGeometry(92, 1.5);
  const foamMeshMat = new MeshBasicMaterial({ color: new Color("#FFFFFF"), transparent: true, opacity: 0.35, depthWrite: false });
  const foam = new Mesh(foamGeo, foamMeshMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.005, SHORELINE_Z + 0.3);
  foam.renderOrder = 2;
  foam.name = "foam";
  scene.add(foam);
  scene.userData.foam = foam;
  scene.userData._foamBaseZ = SHORELINE_Z + 0.3;
  scene.userData.shorelineZ = SHORELINE_Z;

  // Shoreline glow
  const shoreGlowGeo = new PlaneGeometry(92, 0.5);
  const shoreGlowMat = new MeshBasicMaterial({ color: new Color("#00D4F0"), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const shoreGlow = new Mesh(shoreGlowGeo, shoreGlowMat);
  shoreGlow.rotation.x = -Math.PI / 2;
  shoreGlow.position.set(0, 0.01, SHORELINE_Z);
  shoreGlow.renderOrder = 1;
  shoreGlow.name = "shoreGlow";
  scene.add(shoreGlow);
  scene.userData.shoreGlow = shoreGlow;

  // ═════════════════════════════════════════════════════════════
  // 12. LIGHTING — night ambiance
  // ═════════════════════════════════════════════════════════════
  const moon = new DirectionalLight();
  moon.color = new Color("#8899CC");
  moon.intensity = 0.6;
  moon.position.set(15, 22, SHORELINE_Z + 10);
  moon.castShadow = true;
  moon.shadow.mapSize.width = 1024;
  moon.shadow.mapSize.height = 1024;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 100;
  moon.shadow.camera.left = -55;
  moon.shadow.camera.right = 55;
  moon.shadow.camera.top = 48;
  moon.shadow.camera.bottom = -48;
  moon.shadow.bias = -0.0006;
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

  const beachLight = new PointLight();
  beachLight.color = new Color("#FFE0A0");
  beachLight.intensity = 6.0;
  beachLight.distance = 42;
  beachLight.position.set(0, 5, SHORELINE_Z + 6);
  scene.add(beachLight);

  const beachSunL = new PointLight();
  beachSunL.color = new Color("#FFD580");
  beachSunL.intensity = 4.5;
  beachSunL.distance = 36;
  beachSunL.position.set(-20, 7, SHORELINE_Z + 8);
  scene.add(beachSunL);

  const beachSunR = new PointLight();
  beachSunR.color = new Color("#FFC060");
  beachSunR.intensity = 4.5;
  beachSunR.distance = 36;
  beachSunR.position.set(20, 7, SHORELINE_Z + 8);
  scene.add(beachSunR);

  const oceanReflect = new PointLight();
  oceanReflect.color = new Color("#40D4FF");
  oceanReflect.intensity = 3.5;
  oceanReflect.distance = 28;
  oceanReflect.position.set(0, 2, SHORELINE_Z + 20);
  scene.add(oceanReflect);

  const loungeLight = new PointLight();
  loungeLight.color = new Color("#E040FB");
  loungeLight.intensity = 3.5; loungeLight.distance = 14;
  loungeLight.position.set(-22, 2.5, -26);
  scene.add(loungeLight);
  scene.userData.loungeLight = loungeLight;

  const libraryLight = new PointLight();
  libraryLight.color = new Color("#00E5FF");
  libraryLight.intensity = 3.5; libraryLight.distance = 14;
  libraryLight.position.set(22, 2.5, -20);
  scene.add(libraryLight);

  const domeLight = new PointLight();
  domeLight.color = new Color("#FF00FF");
  domeLight.intensity = 3.5; domeLight.distance = 14;
  domeLight.position.set(-13, 2.5, 3);
  scene.add(domeLight);

  const vibeCheckLight = new PointLight();
  vibeCheckLight.color = new Color("#00E5FF");
  vibeCheckLight.intensity = 3.5; vibeCheckLight.distance = 12;
  vibeCheckLight.position.set(-16, 2.5, -13);
  scene.add(vibeCheckLight);

  const plazaFill = new PointLight();
  plazaFill.color = new Color("#8888DD");
  plazaFill.intensity = 2.0;
  plazaFill.distance = 16;
  plazaFill.position.set(0, 1.5, -13);
  scene.add(plazaFill);
  scene.userData.plazaFill = plazaFill;

  const _isMobLights = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const _allNeonAmb = [
    { pos: [8, 3.5, -20], color: new Color("#0088FF"), distance: 18, phase: 0.0, baseI: 1.2 },
    { pos: [-8, 3.5, -20], color: new Color("#7C3AED"), distance: 18, phase: 1.6, baseI: 1.2 },
    { pos: [0, 4.0, 8], color: new Color("#00C8E8"), distance: 16, phase: 3.1, baseI: 1.0 },
    { pos: [0, 3.5, -30], color: new Color("#9B4FFF"), distance: 14, phase: 4.7, baseI: 0.9 },
  ];
  const neonAmbients = (_isMobLights ? _allNeonAmb.slice(0, 1) : _allNeonAmb).map(({ pos, color, distance, phase, baseI }) => {
    const light = new PointLight();
    light.color.copy(color); light.intensity = baseI; light.distance = distance; light.position.set(...pos);
    scene.add(light);
    return { light, phase, baseI, color1: color.clone(), color2: new Color(phase < 2 ? "#A040FF" : "#00B8D4") };
  });
  scene.userData.neonAmbients = neonAmbients;
}