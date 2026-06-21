/**
 * Jukebox — 3D interactive jukebox for the Central Plaza dance floor.
 * Placed on the edge of the plaza. The jukebox pulses with music.
 * Returns the group so it can be animated in the render loop.
 */
import * as THREE from "three";

// Plaza center (matches CityCanvas buildPark)
const PLAZA_X = 0;
const PLAZA_Z = -4;

// Jukebox world position — on the dance floor edge, angled toward center
export const JUKEBOX_POS = { x: PLAZA_X + 5.5, z: PLAZA_Z + 1.5 };
export const JUKEBOX_INTERACT_RADIUS = 4.5; // within this distance the HUD button appears
export const DANCE_FLOOR_RADIUS = 7;        // dance floor radius for proximity volume

function mat(hexColor, opts = {}) {
  const m = new THREE.MeshStandardMaterial();
  m.color = new THREE.Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
  }
  return m;
}

export function createJukebox(scene) {
  const group = new THREE.Group();
  group.name = "jukebox";

  // ── Cabinet body ──
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.55, 0.55),
    mat("#1A0A30", { roughness: 0.25, metalness: 0.6 })
  );
  cabinet.position.set(0, 0.78, 0);
  cabinet.castShadow = true;
  group.add(cabinet);

  // ── Arched top dome ──
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mat("#220A40", { roughness: 0.2, metalness: 0.5 })
  );
  dome.position.set(0, 1.56, 0);
  dome.castShadow = true;
  group.add(dome);

  // ── Screen / display face ──
  const screenMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00D4F0"),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.06), screenMat);
  screen.position.set(0, 1.05, 0.29);
  screen.name = "jukeboxScreen";
  group.add(screen);

  // ── Screen inner glow ──
  const screenInnerMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#A0F8FF"),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const screenInner = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.46, 0.04), screenInnerMat);
  screenInner.position.set(0, 1.05, 0.31);
  screenInner.name = "jukeboxScreenInner";
  group.add(screenInner);

  // ── Speaker grille strips ──
  const grilleMats = [];
  for (let i = 0; i < 3; i++) {
    const gMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#00D4F0"),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.04), gMat);
    grille.position.set(0, 0.62 + i * 0.1, 0.29);
    group.add(grille);
    grilleMats.push(gMat);
  }

  // ── Side neon trim strips (purple) ──
  const trimMats = [];
  for (const sx of [-0.48, 0.48]) {
    const tMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#C43BFF"),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), tMat);
    trim.position.set(sx, 0.82, 0.29);
    group.add(trim);
    trimMats.push(tMat);
  }

  // ── Base platform ──
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.1, 0.7),
    mat("#140820", { roughness: 0.3, metalness: 0.5 })
  );
  base.position.set(0, 0.05, 0);
  base.receiveShadow = true;
  group.add(base);

  // ── Ground glow ring ──
  const glowRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00D4F0"),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glowRing = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.85, 32), glowRingMat);
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.set(0, 0.02, 0);
  glowRing.renderOrder = 1;
  glowRing.name = "jukeboxGlowRing";
  group.add(glowRing);

  // ── Point light emanating from the jukebox ──
  const jukeboxLight = new THREE.PointLight();
  jukeboxLight.color = new THREE.Color("#00D4F0");
  jukeboxLight.intensity = 2.5;
  jukeboxLight.distance = 8;
  jukeboxLight.position.set(0, 1.2, 0);
  group.add(jukeboxLight);

  // ── Position & angle toward plaza center ──
  group.position.set(JUKEBOX_POS.x, 0, JUKEBOX_POS.z);
  group.rotation.y = -Math.PI * 0.35;
  scene.add(group);

  // ── Floating label sprite ──
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 200;
  labelCanvas.height = 48;
  const lCtx = labelCanvas.getContext("2d");
  lCtx.font = "bold 19px 'Syne','Inter',sans-serif";
  lCtx.textAlign = "center";
  lCtx.textBaseline = "middle";
  lCtx.shadowColor = "#00D4F0";
  lCtx.shadowBlur = 10;
  lCtx.fillStyle = "#00D4F0";
  lCtx.fillText("🎵 JUKEBOX", 100, 24);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.minFilter = THREE.LinearFilter;
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, depthTest: false })
  );
  labelSprite.scale.set(2.0, 0.5, 1);
  labelSprite.position.set(JUKEBOX_POS.x, 2.55, JUKEBOX_POS.z);
  labelSprite.renderOrder = 999;
  labelSprite.name = "jukeboxLabel";
  scene.add(labelSprite);

  // Store refs for animation
  scene.userData.jukebox = group;
  scene.userData.jukeboxLight = jukeboxLight;
  scene.userData.jukeboxScreenMat = screenMat;
  scene.userData.jukeboxGlowRingMat = glowRingMat;
  scene.userData.jukeboxTrimMats = trimMats;
  scene.userData.jukeboxGrilleMats = grilleMats;

  return group;
}

/**
 * Animate the jukebox — call in the render loop.
 * @param {THREE.Scene} scene
 * @param {number} t    current time in seconds
 * @param {number} beat  audio beat intensity 0..1
 */
export function animateJukebox(scene, t, beat) {
  // Screen shimmer
  const screenMat = scene.userData.jukeboxScreenMat;
  if (screenMat) {
    screenMat.opacity = 0.65 + Math.sin(t * 3.5) * 0.15 + beat * 0.25;
  }

  // Glow ring pulse
  const ringMat = scene.userData.jukeboxGlowRingMat;
  if (ringMat) {
    ringMat.opacity = 0.18 + Math.sin(t * 2.8) * 0.1 + beat * 0.4;
  }

  // Trim color shift cyan ↔ purple
  const trimMats = scene.userData.jukeboxTrimMats;
  if (trimMats) {
    const shift = Math.sin(t * 0.8) * 0.5 + 0.5;
    const cyan = new THREE.Color("#00D4F0");
    const purple = new THREE.Color("#C43BFF");
    for (const tm of trimMats) {
      tm.color.copy(cyan).lerp(purple, shift);
      tm.opacity = 0.6 + beat * 0.35;
    }
  }

  // Grille pulse
  const grilleMats = scene.userData.jukeboxGrilleMats;
  if (grilleMats) {
    for (let i = 0; i < grilleMats.length; i++) {
      grilleMats[i].opacity = 0.35 + Math.sin(t * 4 + i * 0.8) * 0.15 + beat * 0.4;
    }
  }

  // Point light intensity
  const jl = scene.userData.jukeboxLight;
  if (jl) {
    jl.intensity = 1.8 + beat * 2.5 + Math.sin(t * 2.2) * 0.4;
  }
}