import { createBeachRollerCoaster } from "./BeachRollerCoaster.jsx";
import { createBeachSurfZone } from "./BeachSurfZone.jsx";
import { createBeachResortDecor } from "./BeachResortDecor.jsx";
import { createBeachEdgeDesign } from "./BeachEdgeDesign.jsx";

export function createBeachResortAddOns(scene) {
  createBeachEdgeDesign(scene);
  createBeachResortDecor(scene);
  createBeachSurfZone(scene);
  createBeachRollerCoaster(scene);
}