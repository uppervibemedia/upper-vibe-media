/**
 * MusicLibraryZone.js — extracted verbatim from CityCanvas buildPark()
 * Section 6: MUSIC LIBRARY (lines ~488–554 of original)
 * Do NOT modify geometry, positions, colors, or labels.
 */
import * as THREE from "three";
import { createZoneSign } from "../../ZoneSign";

const {
  BoxGeometry, CylinderGeometry, RingGeometry, CircleGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Color, Group, Mesh, PointLight,
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

export function buildMusicLibraryZone(scene) {
  const library = new Group();
  library.name = "musicLibrary";

  const libPlat = new Mesh(
    new CircleGeometry(4, 32),
    mat("#162040", { roughness: 0.35, metalness: 0.35 })
  );
  libPlat.rotation.x = -Math.PI / 2;
  libPlat.position.set(22, 0.002, -20);
  libPlat.receiveShadow = true;
  library.add(libPlat);

  // Main building cylinder
  const libBldg = new Mesh(
    new CylinderGeometry(2.8, 3, 3.2, 16),
    mat("#1E2E4A", { roughness: 0.3, metalness: 0.35, transparent: true, opacity: 0.85, depthWrite: true })
  );
  libBldg.position.set(22, 1.6, -20);
  libBldg.castShadow = true;
  library.add(libBldg);

  // Cyan ring lights around building
  for (const ry of [0.3, 1.8, 3.0]) {
    const libRing = new Mesh(
      new RingGeometry(2.85, 3.05, 32),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide })
    );
    libRing.rotation.x = -Math.PI / 2;
    libRing.position.set(22, ry, -20);
    libRing.renderOrder = 1;
    library.add(libRing);
  }

  // Headphone icon on top
  const iconCanvas = document.createElement("canvas");
  iconCanvas.width = 64; iconCanvas.height = 64;
  const iCtx = iconCanvas.getContext("2d");
  iCtx.fillStyle = "#00D4F0"; iCtx.font = "bold 40px sans-serif";
  iCtx.textAlign = "center"; iCtx.textBaseline = "middle";
  iCtx.fillText("🎧", 32, 32);
  const iconTex = new THREE.CanvasTexture(iconCanvas);
  iconTex.minFilter = THREE.LinearFilter;
  iconTex.colorSpace = THREE.SRGBColorSpace;
  const iconDisc = new Mesh(
    new CircleGeometry(1.2, 16),
    new MeshBasicMaterial({ map: iconTex, depthWrite: false, side: THREE.DoubleSide })
  );
  iconDisc.rotation.x = -Math.PI / 2;
  iconDisc.position.set(22, 3.25, -20);
  iconDisc.renderOrder = 1;
  library.add(iconDisc);

  // Entrance faces Central Plaza
  const libEntrance = new Mesh(
    new BoxGeometry(2.2, 3.0, 0.08),
    new MeshBasicMaterial({ color: new Color("#0080B8"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  libEntrance.position.set(22 - 2.8, 1.5, -20);
  libEntrance.rotation.y = Math.PI / 2;
  library.add(libEntrance);

  scene.add(library);
  createZoneSign(scene, 22, 3.6, -20, "MUSIC  LIBRARY", "#00D4F0");

  // Zone point light
  const libraryLight = new PointLight();
  libraryLight.color = new Color("#00E5FF");
  libraryLight.intensity = 3.5; libraryLight.distance = 14;
  libraryLight.position.set(22, 2.5, -20);
  scene.add(libraryLight);
}