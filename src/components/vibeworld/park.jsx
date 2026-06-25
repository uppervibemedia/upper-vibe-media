import * as THREE from "three";
import { createCosmicSky } from "./CosmicSkySystem";
import createCitySkyline from "./CitySkyline";
import { createFerrisWheel } from "./FerrisWheel";
import createZenBeach from "./ZenBeach";
import { addDanceFloor } from "./DanceFloor";
import { createJukebox } from "./Jukebox";
import { buildLaunchZone } from "./VibeLaunchZone";
import { createHoverboardZone } from "./HoverboardRingRun";
import { createCrystalZone } from "./CrystalZone";
import { createZoneSign } from "./ZoneSign";
import { createAvatar, createRemoteAvatar, retintAvatar } from "./AvatarModel.jsx";
import { createTestAvatar, retintTestAvatar } from "./AvatarModelTest";
import { createMixamoAvatar, retintMixamoAvatar } from "./AvatarModelMixamo";

const { MeshStandardMaterial, Color, PlaneGeometry, CircleGeometry, RingGeometry, Mesh, Group, PointLight, HemisphereLight, AmbientLight, DirectionalLight, BoxGeometry, CylinderGeometry } = THREE;

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

export function buildPark(scene, isMobile, refs, animationState) {
    createCosmicSky(scene);
    createCitySkyline(scene);

    const groundGeo = new PlaneGeometry(84, 64);
    const groundMat = mat("#0B1020", { roughness: 0.55, metalness: 0.15 });
    const ground = new Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.01, -10);
    ground.receiveShadow = true;
    ground.name = "plazaGround";
    scene.add(ground);

    // ... (rest of the park building logic, adapted from CityCanvas)
    
    // Example of lighting setup
    const moon = new DirectionalLight();
    moon.color = new Color("#8899CC");
    moon.intensity = 0.6;
    moon.position.set(15, 22, 32 + 10);
    moon.castShadow = true;
    scene.add(moon);

    const ambLight = new AmbientLight();
    ambLight.color = new Color("#4850A0");
    ambLight.intensity = 0.9;
    scene.add(ambLight);

    // Avatar creation logic moved here
    const { avatarConfig, retintRef, launchRef, onLoaded } = refs;
    const onLoadedRef = typeof onLoaded === 'function' ? { current: onLoaded } : { current: null };
    const [spawnX, spawnY, spawnZ] = animationState.avatarPos;

    const avatarTypeKey = avatarConfig?.avatarTypeKey || "current";
    const isMixamoAvatar = avatarTypeKey === "test-mixamo" || avatarTypeKey === "test-mixamo-female";
      
    let entry;
    if (isMixamoAvatar) {
        const mixamoGender = avatarTypeKey === "test-mixamo-female" ? "female" : "male";
        const savedHairStyle = (() => { try { return sessionStorage.getItem("uvc_hair_style") || ""; } catch { return ""; } })();
        entry = createMixamoAvatar(scene, {
          spawnX, spawnY, spawnZ,
          gender: mixamoGender,
          hairStyle: savedHairStyle || (mixamoGender === "female" ? "ponytail" : "short"),
          outfitColorKey: avatarConfig?.outfitColorKey || null,
          skinToneKey: (() => { try { return sessionStorage.getItem("uvc_skin_tone") || null; } catch { return null; } })() || avatarConfig?.skinTone || "medium",
        }, (_entry) => {
          animationState.avatarEntry = _entry;
        });
        if (retintRef) {
          retintRef.current = (hexColor) => retintMixamoAvatar(animationState.avatarEntry, hexColor);
        }
    } else {
        entry = createAvatar(scene, avatarConfig || {}, (_entry) => {
            const savedColor = avatarConfig?.outfitColorKey;
            if (savedColor) {
                const COLOR_MAP = {
                  "cosmic-blue":    "#00AADD",
                  "neon-purple":    "#7B2FFF",
                };
                const hex = COLOR_MAP[savedColor];
                if (hex) retintAvatar(_entry, hex);
            }
        });
        if (retintRef) {
            retintRef.current = (hexColor) => retintAvatar(animationState.avatarEntry, hexColor);
        }
    }
    animationState.avatarEntry = entry;
    animationState.avatar = entry.root;

    if (onLoadedRef.current) {
        setTimeout(() => onLoadedRef.current(), 100); // Allow scene to render once
    }
}