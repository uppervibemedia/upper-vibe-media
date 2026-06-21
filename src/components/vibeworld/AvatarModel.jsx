import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3, PlaneGeometry,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
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

export function createAvatar(scene) {
  const avatar = new Group();
  avatar.name = "avatar";

  const skinMat = () => mat("#FFD5C2", { roughness: 0.45 });
  const shirtMat = () => mat("#1565C0", { roughness: 0.3 });
  const pantsMat = () => mat("#1B5E20", { roughness: 0.35 });
  const shoeMat = () => mat("#3E2723", { roughness: 0.4 });
  const hairMat = () => mat("#3E2723", { roughness: 0.55 });
  const eyeMat = () => mat("#111111", { roughness: 0.1 });
  const darkShoe = () => mat("#1A1A1A", { roughness: 0.35 });

  function addMesh(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos);
    m.castShadow = casts;
    m.receiveShadow = casts;
    group.add(m);
    return m;
  }

  function createFoot() {
    const foot = new Group();
    foot.name = "foot";
    addMesh(foot, new CylinderGeometry(0.04, 0.05, 0.12, 8), darkShoe, new Vector3(0, 0.03, 0.05));
    const sole = new Mesh(new BoxGeometry(0.11, 0.025, 0.16), shoeMat());
    sole.position.set(0, -0.02, 0.05);
    sole.castShadow = true; sole.receiveShadow = true;
    foot.add(sole);
    return foot;
  }

  function createLowerLeg() {
    const leg = new Group();
    leg.name = "lowerLeg";
    const len = 0.36;
    addMesh(leg, new CylinderGeometry(0.055, 0.065, len, 8), pantsMat, new Vector3(0, -len / 2, 0));
    const foot = createFoot();
    foot.position.set(0, -len - 0.01, 0);
    leg.add(foot);
    leg.userData.foot = foot;
    return leg;
  }

  function createUpperLeg() {
    const leg = new Group();
    leg.name = "upperLeg";
    const len = 0.4;
    addMesh(leg, new CylinderGeometry(0.065, 0.075, len, 8), pantsMat, new Vector3(0, -len / 2, 0));
    const lowerLeg = createLowerLeg();
    lowerLeg.position.set(0, -len, 0);
    leg.add(lowerLeg);
    leg.userData.lowerLeg = lowerLeg;
    return leg;
  }

  function createHand() {
    const hand = new Group();
    hand.name = "hand";
    addMesh(hand, new SphereGeometry(0.045, 6, 4), skinMat, new Vector3(0, 0, 0));
    return hand;
  }

  function createForearm() {
    const arm = new Group();
    arm.name = "forearm";
    const len = 0.26;
    addMesh(arm, new CylinderGeometry(0.04, 0.05, len, 8), skinMat, new Vector3(0, -len / 2, 0));
    const hand = createHand();
    hand.position.set(0, -len, 0);
    arm.add(hand);
    arm.userData.hand = hand;
    return arm;
  }

  function createUpperArm() {
    const arm = new Group();
    arm.name = "upperArm";
    const len = 0.3;
    addMesh(arm, new CylinderGeometry(0.045, 0.055, len, 8), skinMat, new Vector3(0, -len / 2, 0));
    const forearm = createForearm();
    forearm.position.set(0, -len, 0);
    arm.add(forearm);
    arm.userData.forearm = forearm;
    return arm;
  }

  const torsoGroup = new Group();
  torsoGroup.name = "torso";
  addMesh(torsoGroup, new CylinderGeometry(0.13, 0.16, 0.38, 8), shirtMat, new Vector3(0, 0.22, 0));
  addMesh(torsoGroup, new CylinderGeometry(0.16, 0.17, 0.1, 8), shirtMat, new Vector3(0, 0.44, 0));

  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, 0.5, 0);
  addMesh(neckGroup, new CylinderGeometry(0.04, 0.05, 0.1, 8), skinMat, new Vector3(0, 0.05, 0));

  const headGroup = new Group();
  headGroup.name = "head";
  headGroup.position.y = 0.1;
  addMesh(headGroup, new SphereGeometry(0.1, 12, 10), skinMat, new Vector3(0, 0.1, 0), true);
  for (let ex = -0.04; ex <= 0.04; ex += 0.08) {
    const eye = new Mesh(new SphereGeometry(0.015, 6, 4), eyeMat());
    eye.position.set(ex, 0.12, 0.088);
    headGroup.add(eye);
    const pupilMat = new MeshStandardMaterial(); pupilMat.color = new Color("#FFFFFF"); pupilMat.roughness = 0.1;
    const pupil = new Mesh(new SphereGeometry(0.005, 4, 3), pupilMat);
    pupil.position.set(ex, 0.122, 0.098);
    headGroup.add(pupil);
  }
  addMesh(headGroup, new SphereGeometry(0.012, 4, 3), mat("#FFC0A8", { roughness: 0.5 }), new Vector3(0, 0.11, 0.1), false);
  addMesh(headGroup, new SphereGeometry(0.105, 8, 6), hairMat, new Vector3(0, 0.135, 0), false);
  addMesh(headGroup, new CylinderGeometry(0.07, 0.09, 0.06, 8), darkShoe, new Vector3(0, 0.17, 0.02), false);
  addMesh(headGroup, new BoxGeometry(0.14, 0.015, 0.07), darkShoe, new Vector3(0, 0.17, 0.08), false);

  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-0.19, 0.48, 0);
  leftShoulder.add(createUpperArm());
  leftShoulder.userData.arm = leftShoulder.children[0];
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(0.19, 0.48, 0);
  rightShoulder.add(createUpperArm());
  rightShoulder.userData.arm = rightShoulder.children[0];
  torsoGroup.add(rightShoulder);

  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-0.08, 0, 0);
  leftHip.add(createUpperLeg());
  leftHip.userData.leg = leftHip.children[0];
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(0.08, 0, 0);
  rightHip.add(createUpperLeg());
  rightHip.userData.leg = rightHip.children[0];
  torsoGroup.add(rightHip);

  const shadowGeo = new CircleGeometry(0.18, 16);
  const shadowMat = new MeshBasicMaterial();
  shadowMat.color = new Color("#000000"); shadowMat.transparent = true; shadowMat.opacity = 0.22; shadowMat.depthWrite = false;
  const shadowDisc = new Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.88;
  shadowDisc.name = "shadow";
  torsoGroup.add(shadowDisc);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

export function createRemoteAvatar(scene, userId, username, avatarType) {
  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0 };

  const typeColors = {
    default:  { body: "#1565C0", head: "#1976D2", accent: "#42A5F5" },
    cyber:    { body: "#1B5E20", head: "#2E7D32", accent: "#00E676" },
    cosmic:   { body: "#4A148C", head: "#6A1B9A", accent: "#CE93D8" },
    neon:     { body: "#880E4F", head: "#AD1457", accent: "#FF4081" },
  };
  const colors = typeColors[avatarType] || typeColors.default;
  const bodyMat = () => new MeshStandardMaterial({ color: new Color(colors.body), roughness: 0.35, metalness: 0.2 });
  const headMat = () => new MeshStandardMaterial({ color: new Color(colors.head), roughness: 0.35 });
  const accentMat = () => new MeshBasicMaterial({ color: new Color(colors.accent), depthWrite: false });

  const torso = new Mesh(new CylinderGeometry(0.12, 0.14, 0.38, 8), bodyMat());
  torso.position.y = 0.55; torso.castShadow = true;
  group.add(torso);
  const head = new Mesh(new SphereGeometry(0.09, 8, 6), headMat());
  head.position.y = 0.85; head.castShadow = true;
  group.add(head);
  const ring = new Mesh(new TorusGeometry(0.09, 0.015, 8, 16), accentMat());
  ring.position.y = 0.78; ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const legGeo = new CylinderGeometry(0.04, 0.05, 0.35, 6);
  for (const side of [-1, 1]) {
    const leg = new Mesh(legGeo, bodyMat());
    leg.position.set(side * 0.07, 0.18, 0);
    leg.castShadow = true;
    leg.name = side > 0 ? "rightLeg" : "leftLeg";
    group.add(leg);
  }

  const nameCanvas = document.createElement("canvas");
  nameCanvas.width = 256; nameCanvas.height = 64;
  const ctx = nameCanvas.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText((username || "User").substring(0, 16), 128, 32);
  const nameTex = new CanvasTexture(nameCanvas);
  nameTex.minFilter = LinearFilter; nameTex.colorSpace = THREE.SRGBColorSpace;
  const nameSprite = new Sprite(new SpriteMaterial({ map: nameTex, transparent: true, depthWrite: false, depthTest: false }));
  nameSprite.scale.set(1.2, 0.3, 1);
  nameSprite.position.y = 1.05; nameSprite.renderOrder = 999;
  group.add(nameSprite);

  scene.add(group);
  return group;
}