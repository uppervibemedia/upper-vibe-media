import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// UpperVibeShop — visual-only futuristic storefront 3D scene
// Builds the shop structure + sign in a TRANSFORM-ONLY Group,
// animating the sign pulse and shop lights in-place.
// ⚠ No purchase logic, no wallet, no modal, no click behavior.
// ─────────────────────────────────────────────────────────────

const {
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Group,
  BoxGeometry,
  PlaneGeometry,
  TorusGeometry,
  RingGeometry,
  CylinderGeometry,
  SphereGeometry,
  Color,
  CanvasTexture,
  LinearFilter,
} = THREE;

// ── Shop sign canvas (UPPER VIBE SHOP + Upper Vibe sub-brand) ──
let _signTex = null;
function getSignTex() {
  if (_signTex) return _signTex;
  const c = document.createElement("canvas");
  c.width = 520;
  c.height = 120;
  const ctx = c.getContext("2d");

  // Dark panel bg
  ctx.fillStyle = "#0b0420";
  ctx.fillRect(0, 0, 400, 120);

  // Gold glow behind text
  const goldGlow = ctx.createRadialGradient(260, 42, 10, 260, 42, 180);
  goldGlow.addColorStop(0, "rgba(255,215,0,0.14)");
  goldGlow.addColorStop(1, "rgba(124,58,237,0)");
  ctx.fillStyle = goldGlow;
  ctx.fillRect(0, 0, 400, 120);

  // UPPER VIBE SHOP (main line only — no sub-brand text)
  ctx.fillStyle = "#ffd700";
  // "UPPER VIBE SHOP" fits cleanly on one 520px-wide canvas — large enough at distance, no cut-off
  ctx.font = "700 35px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("UPPER VIBE SHOP", 260, 58);

  _signTex = new CanvasTexture(c);
  _signTex.minFilter = LinearFilter;
  _signTex.colorSpace = THREE.SRGBColorSpace;
  return _signTex;
}

// ── "COMING SOON" canvas for the display panels ──────────────
let _csTex = null;
function getCsTex() {
  if (_csTex) return _csTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a1030";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(255,215,0,0.25)";
  ctx.font = "500 16px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★ UPPER VIBE ★", 64, 60);

  // Faint grid overlay
  ctx.strokeStyle = "rgba(0,212,240,0.06)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }

  _csTex = new CanvasTexture(c);
  _csTex.minFilter = LinearFilter;
  _csTex.colorSpace = THREE.SRGBColorSpace;
  return _csTex;
}

// ── Build the shop storefront ────────────────────────────────
function buildShop(group) {
  const _v = (hex) => new Color(hex);

  // ── Main building box
  const bldgMat = new MeshStandardMaterial({ color: _v("#121028"), roughness: 0.35, metalness: 0.55, transparent: true, opacity: 0.88 });
  const bldg = new Mesh(new BoxGeometry(7.0, 4.6, 5.5), bldgMat);
  bldg.position.y = 2.3;
  bldg.castShadow = true;
  bldg.receiveShadow = true;
  group.add(bldg);

  // ── Roof panel
  const roofMat = new MeshStandardMaterial({ color: _v("#1e1440"), roughness: 0.3, metalness: 0.55, emissive: _v("#7C3AED"), emissiveIntensity: 0.02 });
  const roof = new Mesh(new BoxGeometry(7.6, 0.18, 1.2), roofMat);
  roof.position.set(0, 4.8, 2.2);
  group.add(roof);

  // Roof neon edge strips
  for (const sx of [-1, 1]) {
    const strip = new Mesh(new PlaneGeometry(7.6, 0.07), new MeshBasicMaterial({ color: _v("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.75 }));
    strip.position.set(0, 4.8, 2.2 + sx * 0.6);
    group.add(strip);
  }

  // ── Purple/cyan horizontal bands
  for (const ry of [0.35, 2.0]) {
    const band = new Mesh(new BoxGeometry(7.15, 0.06, 5.65), new MeshBasicMaterial({
      color: _v(ry > 1 ? "#00D4F0" : "#7C3AED"),
      depthWrite: false, transparent: true, opacity: 0.35,
    }));
    band.position.y = ry;
    group.add(band);
  }

  // ── Shop sign (front face, texture)
  const signMat = new MeshBasicMaterial({ map: getSignTex(), depthWrite: true });
  // Wider sign board — full phrase one line, centered, readable from distance
  const sign = new Mesh(new PlaneGeometry(7.0, 1.5), signMat);
  sign.position.set(0, 3.6, 2.755);
  group.add(sign);

  // Sign neon frame
  const frameMat = new MeshBasicMaterial({ color: _v("#ffd700"), depthWrite: false, transparent: true, opacity: 0.5 });
  const frame = new Mesh(new RingGeometry(0.3, 0.32, 4), frameMat);
  frame.position.set(-2.8, 4.35, 2.76);
  group.add(frame);
  const fr2 = frame.clone();
  fr2.position.x = 2.8;
  group.add(fr2);

  // ── Neon glow ring above sign
  for (const ry of [4.5, 0.2]) {
    const ring = new Mesh(new TorusGeometry(1.2, 0.025, 8, 24), new MeshBasicMaterial({
      color: _v("#7C3AED"), depthWrite: false, transparent: true, opacity: 0.35,
    }));
    ring.position.y = ry;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  // ── Entrance doorway (facing out = +z)
  const entMat = new MeshBasicMaterial({ color: _v("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.6 });
  const ent = new Mesh(new BoxGeometry(2.4, 3.2, 0.12), entMat);
  ent.position.set(0, 1.7, 2.75);
  group.add(ent);

  // Door frame glow pillars
  for (const side of [-1.25, 1.25]) {
    const pillar = new Mesh(new CylinderGeometry(0.06, 0.07, 3.2, 8), new MeshBasicMaterial({
      color: _v("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.55,
    }));
    pillar.position.set(side, 1.7, 2.74);
    group.add(pillar);
  }

  // ── Holographic display windows (side faces)
  const holoMat = new MeshBasicMaterial({ map: getCsTex(), depthWrite: false, side: THREE.DoubleSide });
  const winL = new Mesh(new PlaneGeometry(2.4, 2.8), holoMat);
  winL.position.set(-3.51, 2.4, 1.0);
  winL.rotation.y = -Math.PI / 2;
  group.add(winL);

  const winR = winL.clone();
  winR.position.x = 3.51;
  winR.rotation.y = Math.PI / 2;
  group.add(winR);

  // Window glow
  for (const { x } of [{ x: -3.5 }, { x: 3.5 }]) {
    const wGlow = new Mesh(new BoxGeometry(0.05, 2.6, 2.2), new MeshBasicMaterial({
      color: _v("#ffd700"), depthWrite: false, transparent: true, opacity: 0.06,
    }));
    wGlow.position.set(x, 2.4, 1.0);
    group.add(wGlow);
  }

  // ── Accent rings around building
  for (const ry of [0.5, 2.0]) {
    const r = new Mesh(new TorusGeometry(3.55, 0.025, 8, 24), new MeshBasicMaterial({
      color: _v(ry > 1 ? "#7C3AED" : "#00D4F0"), depthWrite: false, transparent: true, opacity: 0.25,
    }));
    r.position.y = ry;
    group.add(r);
  }

  // ── Rooftop UVM marker (small sphere + sphere)
  const roofMarker = new Mesh(new SphereGeometry(0.25, 12, 8), new MeshStandardMaterial({ color: _v("#ffd700"), roughness: 0.2, metalness: 0.7 }));
  roofMarker.position.set(0, 4.8, -1.0);
  group.add(roofMarker);

  const roofDot = new Mesh(new SphereGeometry(0.08, 8, 6), new MeshBasicMaterial({ color: _v("#00D4F0"), depthWrite: false }));
  roofDot.position.set(0, 5.0, -1.0);
  group.add(roofDot);

  // ── Shop lights
  const shopLight = new THREE.PointLight(new Color("#ffd700"), 1.5, 14);
  shopLight.position.set(0, 2.5, 1.0);
  group.add(shopLight);

  const shopLight2 = new THREE.PointLight(new Color("#7C3AED"), 1.2, 14);
  shopLight2.position.set(0, 4.0, 1.0);
  group.add(shopLight2);

  const shopLight3 = new THREE.PointLight(new Color("#00D4F0"), 1.0, 11);
  shopLight3.position.set(0, 0.5, 1.0);
  group.add(shopLight3);

  group.userData = {
    _shopLight1: shopLight,
    _shopLight2: shopLight2,
    _shopLight3: shopLight3,
    _signMat: signMat,
  };
}

// ── Animation ────────────────────────────────────────────────
let _animT = 0;
export function animateShop(group, t = performance.now() * 0.001, audioBeat = 0) {
  _animT += 0.016;
  const T = _animT;

  const gl1 = group?.userData?._shopLight1;
  if (gl1) gl1.intensity = 1.3 + Math.sin(T * 1.2) * 0.4 + audioBeat * 0.4;

  const gl2 = group?.userData?._shopLight2;
  if (gl2) gl2.intensity = 1.1 + Math.sin(T * 1.8) * 0.25 + audioBeat * 0.3;

  const gl3 = group?.userData?._shopLight3;
  if (gl3) gl3.intensity = 0.8 + Math.sin(T * 2.4) * 0.2 + audioBeat * 0.2;
}

// ── Factory ──────────────────────────────────────────────────
let _msgShown = false;
if (!_msgShown) {
  console.log("[UpperVibeShop] Visual-only component created. Still inactive — not placed in city.");
  _msgShown = true;
}

export default function createUpperVibeShop(scene, pos) {
  if (!scene) {
    console.warn("[UpperVibeShop] No scene provided — skipping.");
    return null;
  }
  const isArray = Array.isArray(pos);
  const fx = isArray ? pos[0] : (pos?.x ?? 0);
  const fz = isArray ? pos[2] : (pos?.z ?? 0);

  const group = new Group();
  group.name = "upperVibeShop";
  group.position.set(fx, 0, fz);
  group.rotation.y = Math.PI;
  buildShop(group);
  scene.add(group);
  return group;
}