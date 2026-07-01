import * as THREE from "three";

const { Group, Mesh, CircleGeometry, RingGeometry, MeshBasicMaterial, CanvasTexture, Color, LinearFilter } = THREE;

function moonTexture(phase, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size / 2;
  const r = size * 0.34;

  ctx.clearRect(0, 0, size, size);
  ctx.shadowColor = "rgba(0,229,255,0.9)";
  ctx.shadowBlur = size * 0.12;
  ctx.fillStyle = "rgba(210,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  if (phase !== 0.5) {
    const shift = (phase - 0.5) * r * 2;
    ctx.globalCompositeOperation = "destination-out";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.beginPath();
    ctx.arc(c - shift, c, r * 1.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.strokeStyle = "rgba(0,229,255,0.55)";
  ctx.lineWidth = size * 0.025;
  ctx.beginPath();
  ctx.arc(c, c, r * 1.08, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createMoonPhaseStagePath(scene, startZ = -8.5, endZ = -28) {
  const group = new Group();
  group.name = "moonPhaseStagePath";

  const phases = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92, 0.78, 0.64];
  phases.forEach((phase, index) => {
    const t = phases.length === 1 ? 0 : index / (phases.length - 1);
    const z = startZ + (endZ - startZ) * t;
    const x = Math.sin(t * Math.PI * 2) * 0.42;

    const moon = new Mesh(
      new CircleGeometry(0.62, 40),
      new MeshBasicMaterial({ map: moonTexture(phase), transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide })
    );
    moon.rotation.x = -Math.PI / 2;
    moon.position.set(x, 0.028, z);
    moon.renderOrder = 4;
    group.add(moon);

    const glow = new Mesh(
      new RingGeometry(0.72, 0.88, 48),
      new MeshBasicMaterial({ color: new Color(index % 2 ? "#A078FF" : "#00E5FF"), transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, 0.024, z);
    glow.renderOrder = 3;
    group.add(glow);
  });

  scene.add(group);
  scene.userData.moonPhaseStagePath = group;
  return group;
}