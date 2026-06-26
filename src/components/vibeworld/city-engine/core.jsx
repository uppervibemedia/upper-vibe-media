import * as THREE from 'three';
import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar, attachHoverboard, detachHoverboard } from "../AvatarModel.js";
import { createTestAvatar, updateTestAvatarAnimation, retintTestAvatar } from "../AvatarModelTest";
import { createMixamoAvatar, updateMixamoAvatarAnimation, retintMixamoAvatar } from "../AvatarModelMixamo";
import { buildPark } from './scene.js';

// This file will be expanded to contain the core animation loop and scene management
// to break up the monolithic CityCanvas.jsx component.

export function initCore(canvas, rendererRef, avatarConfig, mobileInputRef) {
  const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMob,
    powerPreference: isMob ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x0A1020);
  if (rendererRef) rendererRef.current = renderer;

  const basePR = isMob ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(basePR);
  
  const rw = isMob ? window.innerWidth : canvas.clientWidth;
  const rh = isMob ? window.innerHeight : canvas.clientHeight;
  renderer.setSize(rw, Math.max(rh, 1));
  renderer.shadowMap.enabled = !isMob;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, rw / Math.max(rh, 1), 0.1, isMob ? 130 : 160);

  buildPark(scene);

  // Placeholder for avatar creation logic to be moved here
  // const avatarEntry = createAvatar(scene, avatarConfig, () => {});

  return { renderer, scene, camera };
}

export function startAnimationLoop(props) {
  const {
    renderer, scene, camera, avatarEntryRef, lastTimeRef, frameRef, 
    audioIntensityRef, audioBassRef, audioBeatRef, tvModeRef, tvQualityRef,
    lockedRef, hbRidingRef, ferrisRidingRef, isDancingRef, activeEmoteRef,
    playerPos, onPositionChange, onNearPad, onJukeboxProximity, 
    mobileInputRef, remoteUsers, stageScreenPosRef
  } = props;

  let animId;

  const animate = () => {
    animId = requestAnimationFrame(animate);

    const now = performance.now() * 0.001;
    if (lastTimeRef.current === 0) lastTimeRef.current = now;
    let dt = now - lastTimeRef.current;
    lastTimeRef.current = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 0.016;

    // All animation logic from the original CityCanvas animate function goes here...
    // This includes movement, collisions, camera updates, remote avatar sync, and all zone animations.

    renderer.render(scene, camera);
    frameRef.current++;
  };

  animate();

  return () => {
    cancelAnimationFrame(animId);
  };
}