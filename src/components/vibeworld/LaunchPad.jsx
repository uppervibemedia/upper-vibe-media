import * as THREE from 'three';

const {
  CylinderGeometry,
  RingGeometry,
  BoxGeometry,
  ConeGeometry,
  Mesh,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Color,
} = THREE;

function smat(hex, opts = {}) {
  return new MeshStandardMaterial({
    color: new Color(hex),
    roughness: opts.r ?? 0.35,
    metalness: opts.m ?? 0.7,
    ...(opts.opacity != null ? { transparent: true, opacity: opts.opacity } : {}),
  });
}

function bmat(hex, opts = {}) {
    const m = new MeshBasicMaterial({
        color: new Color(hex),
        depthWrite: false,
        ...opts
    });
    if (opts.opacity) {
        m.transparent = true;
        m.opacity = opts.opacity;
    }
    return m;
}

export function createLaunchPad(scene, x, z, rotation = 0) {
  const group = new Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.name = `launchPad_${x}_${z}`;

  const base = new Mesh(new CylinderGeometry(1.4, 1.5, 0.1, 32), smat("#1A0A0A", { r: 0.2, m: 0.8 }));
  base.position.y = 0.05;
  base.receiveShadow = true;
  group.add(base);

  const ringMat = bmat("#FF8C00", { opacity: 0.8 });
  const ring = new Mesh(new RingGeometry(1.1, 1.4, 64), ringMat);
  ring.position.y = 0.11;
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const innerMat = bmat("#FFB800", { opacity: 0.3 });
  const innerDisc = new Mesh(new CylinderGeometry(1.0, 1.0, 0.02, 32), innerMat);
  innerDisc.position.y = 0.12;
  group.add(innerDisc);
  
  // Upward arrow icon
  const arrowBody = new Mesh(new BoxGeometry(0.2, 0.04, 0.6), bmat("#FFFFFF", {opacity: 0.8}));
  arrowBody.position.y = 0.14;
  group.add(arrowBody);

  const arrowHead = new Mesh(new ConeGeometry(0.3, 0.4, 4), bmat("#FFFFFF", {opacity: 0.8}));
  arrowHead.position.y = 0.14;
  arrowHead.position.z = -0.4;
  arrowHead.rotation.x = Math.PI / 2;
  arrowHead.rotation.z = Math.PI / 4;
  group.add(arrowHead);
  
  scene.add(group);

  return { group, ringMat, innerMat };
}

export function animateLaunchPad(pad, t) {
    if (!pad) return;
    const pulse = Math.sin(t * 3) * 0.5 + 0.5;
    pad.ringMat.opacity = 0.6 + pulse * 0.4;
    pad.innerMat.opacity = 0.2 + pulse * 0.3;
}