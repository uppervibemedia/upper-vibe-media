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
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  AdditiveBlending,
  LinearFilter,
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

  // ── SUNSET GLOW — warm ambient light above the beach ──────
  const sunsetLight = new PointLight();
  sunsetLight.color = new Color("#F97316");
  sunsetLight.intensity = 0.8;
  sunsetLight.distance = 16;
  sunsetLight.position.set(ZEN_X, 3, ZEN_Z + 3);
  sunsetLight.name = "zenSunsetLight";
  scene.add(sunsetLight);
  scene.userData.zenSunsetLight = sunsetLight;

  // Sunset gradient sprite — warm horizontal glow plane
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 256; glowCanvas.height = 256;
  const gCtx = glowCanvas.getContext("2d");
  const glowGrad = gCtx.createRadialGradient(128, 180, 20, 128, 128, 180);
  glowGrad.addColorStop(0, "rgba(251,146,60,0.35)");
  glowGrad.addColorStop(0.35, "rgba(236,72,153,0.15)");
  glowGrad.addColorStop(0.7, "rgba(168,85,247,0.05)");
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  gCtx.fillStyle = glowGrad;
  gCtx.fillRect(0, 0, 256, 256);

  const glowTex = new CanvasTexture(glowCanvas);
  glowTex.minFilter = LinearFilter;
  glowTex.colorSpace = THREE.SRGBColorSpace;

  const sunsetGlow = new Sprite(new SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false,
    blending: AdditiveBlending,
  }));
  sunsetGlow.scale.set(14, 8, 1);
  sunsetGlow.position.set(ZEN_X, 3.5, ZEN_Z + 2);
  sunsetGlow.renderOrder = 0;
  sunsetGlow.name = "zenSunsetGlow";
  scene.add(sunsetGlow);
  scene.userData.zenSunsetGlow = sunsetGlow;

  // ── GENTLE FOG PARTICLES — drifting mist ──────────────────
  const fogCount = 40;
  const fogGeo = new BufferGeometry();
  const fogPositions = new Float32Array(fogCount * 3);
  const fogData = []; // per-particle metadata for animation
  for (let i = 0; i < fogCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 7;
    fogPositions[i * 3] = ZEN_X + Math.cos(ang) * r;
    fogPositions[i * 3 + 1] = 0.2 + Math.random() * 2.0;
    fogPositions[i * 3 + 2] = ZEN_Z + Math.sin(ang) * r + Math.random() * 3 - 1.5;
    fogData.push({
      baseX: fogPositions[i * 3],
      baseZ: fogPositions[i * 3 + 2],
      baseY: fogPositions[i * 3 + 1],
      speed: 0.15 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * 0.3,
      driftZ: (Math.random() - 0.5) * 0.3,
    });
  }
  fogGeo.setAttribute("position", new BufferAttribute(fogPositions, 3));

  const fogCanvas = document.createElement("canvas");
  fogCanvas.width = 32; fogCanvas.height = 32;
  const fCtx = fogCanvas.getContext("2d");
  const fogGrad = fCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  fogGrad.addColorStop(0, "rgba(255,200,160,0.5)");
  fogGrad.addColorStop(0.3, "rgba(255,180,140,0.2)");
  fogGrad.addColorStop(0.7, "rgba(200,130,180,0.04)");
  fogGrad.addColorStop(1, "rgba(0,0,0,0)");
  fCtx.fillStyle = fogGrad;
  fCtx.fillRect(0, 0, 32, 32);
  const fogTex = new CanvasTexture(fogCanvas);
  fogTex.minFilter = LinearFilter;

  const fogMat = new PointsMaterial({
    map: fogTex,
    size: 0.8,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const fogPoints = new Points(fogGeo, fogMat);
  fogPoints.name = "zenFog";
  fogPoints.renderOrder = 0;
  scene.add(fogPoints);
  scene.userData.zenFog = fogPoints;
  scene.userData.zenFogData = fogData;

  // Neon sign
  createNeonSign(scene, ZEN_X, 3.5, ZEN_Z, "ZEN  BEACH", "#00D4F0");

  return { ZEN_X, ZEN_Z };
}

// Called from CityCanvas animation loop — handles breathing glow, fog, sunset + particles
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

  // ── Sunset glow — gentle breathing pulse ──────────────────
  const sunsetGlow = scene.userData.zenSunsetGlow;
  if (sunsetGlow?.material?.opacity !== undefined) {
    sunsetGlow.material.opacity = 0.35 + Math.sin(t * 0.3) * 0.12 + audioBeat * 0.08;
  }
  const sunsetLight = scene.userData.zenSunsetLight;
  if (sunsetLight) {
    sunsetLight.intensity = 0.6 + Math.sin(t * 0.25) * 0.2 + audioBeat * 0.15;
  }

  // ── Fog particles — drift upward, reset when too high ─────
  const fogPoints = scene.userData.zenFog;
  const fogData = scene.userData.zenFogData;
  if (fogPoints && fogData) {
    const pos = fogPoints.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < fogData.length; i++) {
      const fd = fogData[i];
      let y = arr[i * 3 + 1] + fd.speed * 0.01;
      if (y > 2.5) y = 0.15 + Math.random() * 0.3;
      arr[i * 3 + 1] = y;
      arr[i * 3] = fd.baseX + Math.sin(t * 0.4 + fd.phase) * fd.driftX;
      arr[i * 3 + 2] = fd.baseZ + Math.cos(t * 0.35 + fd.phase) * fd.driftZ;
    }
    pos.needsUpdate = true;
    // Opacity sways with breath + beat
    if (fogPoints.material?.opacity !== undefined) {
      fogPoints.material.opacity = 0.22 + Math.sin(t * 0.5) * 0.06 + audioBeat * 0.05;
    }
  }

  // Floating particles (handled inline in CityCanvas loop via isZenParticle)
}