import * as THREE from "three";

const {
  CircleGeometry,
  RingGeometry,
  SphereGeometry,
  Color,
  PlaneGeometry,
  BoxGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Mesh,
  PointLight,
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

function createNeonSign(scene, x, y, z, text, colorHex) {
  const group = new Group();
  group.name = "neonSign_" + text.replace(/\s+/g, "");

  const backGeo = new PlaneGeometry(6, 1.7);
  const backMat = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide,
  });
  const back = new Mesh(backGeo, backMat);
  back.name = "neonBack";
  group.add(back);

  const borderGeo = new PlaneGeometry(6.1, 1.8);
  const borderMat = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide,
  });
  const borderFrame = new Mesh(borderGeo, borderMat);
  borderFrame.renderOrder = 1;
  group.add(borderFrame);

  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 10;
  ctx.font = "bold 20px 'Syne', 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 128, 32);
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const spriteMat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(5, 1.3, 1);
  sprite.renderOrder = 2;
  group.add(sprite);

  group.position.set(x, y, z);
  group.userData = { isNeonSign: true, baseOpacity: 0.3, colorHex };
  scene.add(group);
}

export default function createZenBeach(scene, PLAZA_X, PLAZA_Z) {
  const ZEN_X = -20, ZEN_Z = 22;

  // Circular meditation platform
  const zenPlat = new Mesh(
    new CircleGeometry(3.5, 48),
    mat("#1A1030", { roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.75 })
  );
  zenPlat.rotation.x = -Math.PI / 2;
  zenPlat.position.set(ZEN_X, 0.008, ZEN_Z);
  zenPlat.receiveShadow = true;
  zenPlat.name = "zenPlat";
  scene.add(zenPlat);

  // Outer glow ring — cyan
  const zenOuterRing = new Mesh(
    new RingGeometry(3.3, 3.5, 64),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
  );
  zenOuterRing.rotation.x = -Math.PI / 2;
  zenOuterRing.position.set(ZEN_X, 0.01, ZEN_Z);
  zenOuterRing.renderOrder = 1;
  zenOuterRing.name = "zenOuterRing";
  scene.add(zenOuterRing);
  scene.userData.zenOuterRing = zenOuterRing;

  // Inner gold ring
  const zenInnerRing = new Mesh(
    new RingGeometry(1.6, 1.8, 48),
    new MeshBasicMaterial({ color: new Color("#EDB84A"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.3 })
  );
  zenInnerRing.rotation.x = -Math.PI / 2;
  zenInnerRing.position.set(ZEN_X, 0.011, ZEN_Z);
  zenInnerRing.renderOrder = 1;
  zenInnerRing.name = "zenInnerRing";
  scene.add(zenInnerRing);
  scene.userData.zenInnerRing = zenInnerRing;

  // Meditation pads — 6 glowing circles in a ring
  for (let p = 0; p < 6; p++) {
    const ang = (p / 6) * Math.PI * 2;
    const px = ZEN_X + Math.cos(ang) * 2.2;
    const pz = ZEN_Z + Math.sin(ang) * 2.2;
    const pad = new Mesh(
      new CircleGeometry(0.35, 24),
      new MeshBasicMaterial({
        color: new Color(p % 2 === 0 ? "#00D4F0" : "#A078FF"),
        depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(px, 0.009, pz);
    pad.renderOrder = 1;
    pad.name = "zenPad";
    scene.add(pad);
  }

  // Center glow orb
  const zenOrb = new Mesh(
    new SphereGeometry(0.25, 16, 12),
    new MeshBasicMaterial({ color: new Color("#EDB84A"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  zenOrb.position.set(ZEN_X, 0.5, ZEN_Z);
  zenOrb.name = "zenOrb";
  scene.add(zenOrb);
  scene.userData.zenOrb = zenOrb;

  // Floating calm particles
  for (let fp = 0; fp < 12; fp++) {
    const fAng = (fp / 12) * Math.PI * 2 + Math.random() * 0.5;
    const fR = 2.5 + Math.random() * 2;
    const fY = 0.3 + Math.random() * 1.2;
    const fpx = ZEN_X + Math.cos(fAng) * fR;
    const fpz = ZEN_Z + Math.sin(fAng) * fR;
    const particle = new Mesh(
      new SphereGeometry(0.03, 4, 3),
      new MeshBasicMaterial({
        color: new Color(fp % 3 === 0 ? "#EDB84A" : fp % 3 === 1 ? "#00D4F0" : "#A078FF"),
        depthWrite: false, transparent: true, opacity: 0.5,
      })
    );
    particle.position.set(fpx, fY, fpz);
    particle.userData = { isZenParticle: true, baseX: fpx, baseZ: fpz, baseY: fY, phase: Math.random() * Math.PI * 2 };
    particle.name = "zenParticle";
    scene.add(particle);
  }

  // Ambient light
  const zenLight = new PointLight();
  zenLight.color = new Color("#A078FF");
  zenLight.intensity = 1.2;
  zenLight.distance = 10;
  zenLight.position.set(ZEN_X, 1.5, ZEN_Z);
  zenLight.name = "zenLight";
  scene.add(zenLight);
  scene.userData.zenLight = zenLight;

  // Neon sign
  createNeonSign(scene, ZEN_X, 3.5, ZEN_Z, "ZEN  BEACH", "#00D4F0");

  return { ZEN_X, ZEN_Z };
}

// Called from CityCanvas animation loop — handles breathing glow + particles
export function animateZenBeach(scene, t, audioBeat) {
  const zOrb = scene.userData.zenOrb;
  if (!zOrb) return;
  const br = Math.sin(t * 0.4) * 0.5 + 0.5;
  zOrb.position.y = 0.5 + Math.sin(t * 0.7) * 0.1;
  if (zOrb.material?.opacity !== undefined) zOrb.material.opacity = 0.4 + br * 0.35 + audioBeat * 0.15;
  const zo = scene.userData.zenOuterRing;
  if (zo?.material?.opacity !== undefined) zo.material.opacity = 0.25 + br * 0.2 + audioBeat * 0.1;
  const zi = scene.userData.zenInnerRing;
  if (zi?.material?.opacity !== undefined) zi.material.opacity = 0.2 + br * 0.2;
  const zl = scene.userData.zenLight;
  if (zl) zl.intensity = 0.9 + br * 0.5;
  // Floating particles (handled inline in CityCanvas loop via isZenParticle)
}