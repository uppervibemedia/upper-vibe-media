/**
 * MusicStageZone.js — extracted verbatim from CityCanvas buildPark()
 * Section 4: MAIN MUSIC STAGE (lines ~233–315 of original)
 * Do NOT modify geometry, positions, colors, or labels.
 */
import * as THREE from "three";
import { createZoneSign } from "../../ZoneSign";

const { BoxGeometry, MeshStandardMaterial, MeshBasicMaterial, Color, Group, Mesh, PointLight } = THREE;

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

export function buildMusicStageZone(scene) {
  const stage = new Group();
  stage.name = "musicStage";

  // Riser base
  const stageRiser = new Mesh(new BoxGeometry(10, 1.0, 5.5), mat("#111830", { roughness: 0.3, metalness: 0.6 }));
  stageRiser.position.set(0, 0.5, -32);
  stageRiser.castShadow = true; stageRiser.receiveShadow = true;
  stage.add(stageRiser);

  // Top platform deck
  const stagePlat = new Mesh(new BoxGeometry(10, 0.25, 5.5), mat("#1A2050", { roughness: 0.2, metalness: 0.65 }));
  stagePlat.position.set(0, 1.12, -32);
  stagePlat.castShadow = true; stagePlat.receiveShadow = true;
  stage.add(stagePlat);

  // Front edge neon strip
  const stageEdge = new Mesh(
    new BoxGeometry(10.1, 0.08, 0.1),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  stageEdge.position.set(0, 1.27, -29.2);
  stage.add(stageEdge);

  // Side neon strips
  for (const sx of [-5.05, 5.05]) {
    const sideStrip = new Mesh(
      new BoxGeometry(0.06, 1.0, 0.06),
      new MeshBasicMaterial({ color: new Color(sx < 0 ? "#C43BFF" : "#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    sideStrip.position.set(sx, 0.5, -32);
    stage.add(sideStrip);
  }

  // Main screen — 16:9 aspect ratio so cover art / video fills it without stretching
  const screenMat = mat("#1A1A3A", { roughness: 0.2, metalness: 0.7 });
  const SCREEN_ASPECT = 16 / 9;
  const screenW = 12.444; // = 7 * 16/9
  const screenH = 7;
  const screen = new Mesh(new BoxGeometry(screenW, screenH, 0.2), screenMat);
  screen.position.set(0, 3.5, -34.4);
  screen.castShadow = true;
  screen.name = "stageScreen";
  stage.add(screen);
  scene.userData.stageScreen = screen;
  scene.userData._stageCanvasApplied = false;
  scene.userData._screenW = screenW;
  scene.userData._screenH = screenH;

  const screenGlow = new Mesh(
    new BoxGeometry(screenW + 0.3, screenH + 0.3, 0.05),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  screenGlow.position.set(0, 3.5, -34.4);
  screenGlow.name = "stageScreenGlow";
  stage.add(screenGlow);

  // Stage arch
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

  // Stage lights
  const spotL = new PointLight();
  spotL.color = new Color("#A078FF"); spotL.intensity = 5; spotL.distance = 20;
  spotL.position.set(-6, 4.5, -31); stage.add(spotL);

  const spotR = new PointLight();
  spotR.color = new Color("#00D4F0"); spotR.intensity = 5; spotR.distance = 20;
  spotR.position.set(6, 4.5, -31); stage.add(spotR);

  // Front wash light
  const frontWash = new PointLight();
  frontWash.color = new Color("#9B4FFF"); frontWash.intensity = 3; frontWash.distance = 14;
  frontWash.position.set(0, 2.5, -29); stage.add(frontWash);

  scene.add(stage);
  // Stage label — just above the screen, centered on screen face
  createZoneSign(scene, 0, 7.4, -34.0, "MUSIC  STAGE", "#00D4F0");
}