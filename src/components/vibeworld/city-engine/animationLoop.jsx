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
  const {
    isMobileRef, frameRef, tvModeRef, tvQualityRef, ferrisRidingRef,
  } = refs;
  const { audioBeatRef, audioIntensityRef } = audioRefs;
  const [px, py, pz] = playerPos;

  const isMob = isMobileRef.current;
  const tvSmooth = tvModeRef.current && tvQualityRef.current === "smooth";
  const audioBeat = audioBeatRef.current || 0;
  
  const nearBeach = pz > 10;
  const nearDanceFloor = Math.sqrt(px * px + (pz + 13) * (pz + 13)) < 18;

  // Animate dynamic zones, throttled on mobile
  if (!isMob || nearBeach || frameRef.current % 3 === 0) animateZenBeach(scene, t, audioBeat);
  if (!isMob || (nearDanceFloor && frameRef.current % 4 === 0)) animateDanceFloor(scene, t, audioBeat, audioIntensityRef.current || 0);
  
  // Ferris Wheel
  const nearFerris = Math.sqrt((px - 22) * (px - 22) + (pz - 5) * (pz - 5)) < 28;
  const ferrisGate = tvSmooth ? (ferrisRidingRef.current || nearFerris) : (!isMob || ferrisRidingRef.current || nearFerris || frameRef.current % 6 === 0);
  if (ferrisGate) animateFerrisWheel(scene, t, audioBeat, px, pz, tvSmooth);
  
  animateCosmicSky(scene, camera, t, dt);
}