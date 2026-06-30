import { createBeachRollerCoaster } from "./BeachRollerCoaster.jsx";
import { createBeachResortDecor } from "./BeachResortDecor.jsx";
import { createBeachEdgeDesign } from "./BeachEdgeDesign.jsx";
import { createBeachActivities } from "./BeachActivities.jsx";
import { createBeachAcademyRetreat } from "./BeachAcademyRetreat.jsx";

export function createBeachResortAddOns(scene) {
  createBeachEdgeDesign(scene);
  createBeachResortDecor(scene);
  createBeachRollerCoaster(scene);
  createBeachAcademyRetreat(scene);
  createBeachActivities(scene);
}