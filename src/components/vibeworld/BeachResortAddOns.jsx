import { createBeachRollerCoaster } from "./BeachRollerCoaster.jsx";
import { createBeachSurfZone } from "./BeachSurfZone.jsx";
import { createBeachResortDecor } from "./BeachResortDecor.jsx";

export function createBeachResortAddOns(scene) {
  createBeachResortDecor(scene);
  createBeachSurfZone(scene);
  createBeachRollerCoaster(scene);
}