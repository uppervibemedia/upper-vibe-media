/**
 * cameraController.js — Handles all camera logic (third-person, ride, locked).
 */
import * as THREE from "three";
import { CAM_DIST, CAM_HEIGHT, CAM_LOOK_Y, CAM_PITCH_MIN, CAM_PITCH_MAX, CAM_DIST_LS, CAM_HEIGHT_LS, CAM_LOOK_Y_LS, FOV_PORTRAIT, FOV_LANDSCAPE } from "./cityConfig";
import { getRiderCameraTransform } from "../FerrisWheel";

export function updateCamera(refs, dt, playerPos) {
  const { cameraRef, isMobileRef, camYawRef, camPitchRef, camYawSmoothRef, camPitchSmoothRef, userTouchingCamRef, mouseRef, mobileInputRef, lockedRef, ferrisRidingRef, avatarRotRef, sceneRef } = refs;
  const [px, py, pz] = playerPos;

  if (mouseRef.current.down && mouseRef.current.button === 2 && !lockedRef.current) {
    camYawRef.current += mouseRef.current.dx * 0.004;
    camPitchRef.current = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitchRef.current - mouseRef.current.dy * 0.004));
    userTouchingCamRef.current = true;
  } else if (!mouseRef.current.down) {
    userTouchingCamRef.current = false;
  }
  mouseRef.current.dx = 0;
  mouseRef.current.dy = 0;

  if (isMobileRef.current) {
    const joy = mobileInputRef.current;
    const cdx = joy.camDx || 0;
    const cdy = joy.camDy || 0;
    if (Math.abs(cdx) > 0.00005 || Math.abs(cdy) > 0.00005) {
      camYawRef.current += cdx;
      camPitchRef.current = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitchRef.current - cdy));
      userTouchingCamRef.current = true;
    }
    joy.camDx = 0;
    joy.camDy = 0;
    if (mobileInputRef.current._camActive) {
      userTouchingCamRef.current = true;
    }
  }

  const isMoving = refs.isMoving;
  if (isMobileRef.current && isMoving && !userTouchingCamRef.current) {
    const targetYaw = avatarRotRef.current + Math.PI;
    let yawDelta = targetYaw - camYawRef.current;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    const step = Math.min(Math.abs(yawDelta) * Math.min(1, dt * 0.8), 0.06) * Math.sign(yawDelta);
    camYawRef.current += step;
  } else if (!isMobileRef.current && refs.speed > 0.05 && !userTouchingCamRef.current) {
    const targetYaw = avatarRotRef.current + Math.PI;
    let yawDelta = targetYaw - camYawRef.current;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    camYawRef.current += yawDelta * Math.min(1, dt * 2.5);
  }

  let yawDiff = camYawRef.current - camYawSmoothRef.current;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  camYawSmoothRef.current += yawDiff * Math.min(1, dt * (isMobileRef.current ? 6.0 : 10.0));
  camPitchSmoothRef.current += (camPitchRef.current - camPitchSmoothRef.current) * Math.min(1, dt * 8.0);

  const camera = cameraRef.current;
  if (!camera) return;

  const cv = sceneRef.current.userData._camVecs;

  if (ferrisRidingRef.current) {
    // The separate ferris wheel rAF loop handles camera updates.
    // This is just a placeholder.
  } else if (lockedRef.current) {
    const inLounge = Math.sqrt((px - (-22)) ** 2 + (pz - (-26)) ** 2) < 12;
    if (inLounge) {
        camera.position.lerp(cv.lgLkPos, Math.min(1, 3.0 * dt));
        camera.lookAt(cv.lgLkLook);
    } else {
        camera.position.lerp(cv.lkPos, Math.min(1, 3.0 * dt));
        camera.lookAt(cv.lkLook);
    }
  } else {
    const isLandscape = isMobileRef.current && window.innerWidth > window.innerHeight;
    const camDist = isLandscape ? CAM_DIST_LS : CAM_DIST;
    const camHeight = isLandscape ? CAM_HEIGHT_LS : CAM_HEIGHT;
    const camLookY = isLandscape ? CAM_LOOK_Y_LS : CAM_LOOK_Y;
    const targetFov = isLandscape ? FOV_LANDSCAPE : FOV_PORTRAIT;

    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
      camera.updateProjectionMatrix();
    }

    const camAngle = camYawSmoothRef.current;
    const pitch = camPitchSmoothRef.current;
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const camX = px + Math.sin(camAngle) * camDist * cosPitch;
    const camY = py + camHeight + sinPitch * camDist;
    const camZ = pz + Math.cos(camAngle) * camDist * cosPitch;

    const minCamY = py + 0.5;
    camera.position.set(camX, Math.max(minCamY, camY), camZ);
    camera.lookAt(px, py + camLookY, pz);
  }
}