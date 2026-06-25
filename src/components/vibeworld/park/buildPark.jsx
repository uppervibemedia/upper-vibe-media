import * as THREE from 'three';
import { createCosmicSky } from '../CosmicSkySystem';
import createCitySkyline from '../CitySkyline';
import { createFerrisWheel } from '../FerrisWheel';
import createZenBeach from '../ZenBeach';
import { addDanceFloor } from '../DanceFloor';
import { createJukebox } from '../Jukebox';
import { buildLaunchZone } from '../VibeLaunchZone';
import { createHoverboardZone } from '../HoverboardRingRun';
import { createCrystalZone } from '../CrystalZone';
import { createZoneSign } from '../ZoneSign';
import { mat } from './utils';

const { 
    Mesh, Group, PointLight, DirectionalLight, AmbientLight, HemisphereLight,
    PlaneGeometry, CircleGeometry, RingGeometry, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, MeshBasicMaterial, CanvasTexture, LinearFilter, Vector3
} = THREE;

// Alias — all sign creation delegated to ZoneSign.js
const createNeonSign = createZoneSign;

export function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 32;
  const OCEAN_DEPTH = 54;

  // ... (rest of the buildPark function from CityCanvas.jsx)
}