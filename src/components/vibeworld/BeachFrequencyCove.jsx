import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}

function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opts.roughness ?? 0.5, metalness: opts.metalness ?? 0.18 });
}

function label(text, color = "#B58CFF") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.font = "900 28px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 256, 48);
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(5.2, 0.86, 1);
  sprite.renderOrder = 70;
  sprite.userData.isNeonSign = true;
  return sprite;
}

export function createBeachFrequencyCove(scene) {
  const group = new THREE.Group();
  group.name = "beachFrequencyCove";
  const cx = -52;
  const cz = 2;

  const platform = new THREE.Mesh(new THREE.CircleGeometry(5.6, 48), basic("#D8C6A5", { transparent: true, opacity: 0.35 }));
  platform.rotation.x = -Math.PI / 2;
  platform.position.set(cx, 0.055, cz);
  platform.renderOrder = 6;
  group.add(platform);

  const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.35, 60), basic("#B58CFF", { transparent: true, opacity: 0.52 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, 0.08, cz);
  ring.renderOrder = 7;
  group.add(ring);

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const x = cx + Math.cos(angle) * 3.2;
    const z = cz + Math.sin(angle) * 3.2;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.45, 6), standard(i % 2 ? "#7DEBFF" : "#B58CFF", { roughness: 0.26, metalness: 0.36 }));
    crystal.position.set(x, 0.75, z);
    crystal.rotation.z = Math.sin(i) * 0.18;
    group.add(crystal);
  }

  const sign = label("FREQUENCY COVE", "#B58CFF");
  sign.position.set(cx, 2.25, cz - 3.4);
  group.add(sign);

  const light = new THREE.PointLight(new THREE.Color("#B58CFF"), 2.0, 16);
  light.position.set(cx, 2.4, cz);
  group.add(light);

  scene.add(group);
  scene.userData.beachFrequencyCove = group;
}