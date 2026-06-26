/**
 * animationLoop.js — Central animation scheduler for all 3D scene updates.
 */
import { animateFerrisWheel } from "../FerrisWheel";
import { animateZenBeach } from "../ZenBeach";
import { animateDanceFloor } from "../DanceFloor";
import { animateCrystalZone } from "../CrystalZone";
import { animateJukebox } from "../Jukebox";
import { animateLaunchZone } from "../VibeLaunchZone";
import { animateHoverboardZone } from "../HoverboardRingRun";
import { animateCosmicSky } from "../CosmicSkySystem";

export function animateScene(scene, camera, t, dt, audioRefs, playerPos, refs) {
  // Guard: ref/closures may not be linked on the very first frames of a fresh deploy
  const isMob = refs?.isMobileRef?.current ?? true;
  const frame = refs?.frameRef?.current ?? 0;
  const tvSmooth = !!(refs?.tvModeRef?.current && refs?.tvQualityRef?.current === "smooth");
  const ferrisRiding = !!refs?.ferrisRidingRef?.current;
  const audioBeat = audioRefs?.audioBeatRef?.current ?? 0;
  const audioIntensity = audioRefs?.audioIntensityRef?.current ?? 0;
  const [px, py, pz] = playerPos ?? [0, 0, 0];
  
  const nearBeach = pz > 10;
  const nearDanceFloor = Math.sqrt(px * px + (pz + 13) * (pz + 13)) < 18;

  // Animate dynamic zones, throttled on mobile
  if (!isMob || nearBeach || frame % 3 === 0) animateZenBeach(scene, t, audioBeat);
  if (!isMob || (nearDanceFloor && frame % 4 === 0)) animateDanceFloor(scene, t, audioBeat, audioIntensity);
  
  // Ferris Wheel
  const nearFerris = Math.sqrt((px - 22) * (px - 22) + (pz - 5) * (pz - 5)) < 28;
  const ferrisGate = tvSmooth ? (ferrisRiding || nearFerris) : (!isMob || ferrisRiding || nearFerris || frame % 6 === 0);
  if (ferrisGate) animateFerrisWheel(scene, t, audioBeat, px, pz, tvSmooth);
  
  animateCosmicSky(scene, camera, t, dt);
}