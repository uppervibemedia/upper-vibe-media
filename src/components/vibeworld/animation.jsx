import { animateCosmicSky } from "./CosmicSkySystem";
import { animateFerrisWheel, getRiderCameraTransform } from "./FerrisWheel";
import { animateZenBeach } from "./ZenBeach";
import { animateDanceFloor } from "./DanceFloor";
import { animateJukebox } from "./Jukebox";
import { animateLaunchZone, triggerLandingPulse, collectNearbyOrbs } from "./VibeLaunchZone";
import { animateHoverboardZone } from "./HoverboardRingRun";
import { animateCrystalZone } from "./CrystalZone";
import { updateAvatarAnimation } from "./AvatarModel.jsx";
import { updateMixamoAvatarAnimation } from "./AvatarModelMixamo";
import { resolveCollisions } from "./collisions";
import * as THREE from 'three';

export function animateScene(animationState, callbacks) {
    const { scene, camera, renderer, avatar, avatarPos, velocity, avatarRot, isMobile } = animationState;
    if (!scene || !camera || !renderer) return;

    const now = performance.now() * 0.001;
    if (animationState.lastTime === 0) animationState.lastTime = now;
    let dt = now - animationState.lastTime;
    animationState.lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 0.016;

    const t = now;

    const keys = animationState.keys;
    const mouse = animationState.mouse;
    let [px, py, pz] = animationState.avatarPos;
    let rot = animationState.avatarRot;
    const vel = animationState.velocity;

    let inputFwd = 0;
    let inputStrafe = 0;

    if (animationState.locked) {
        vel.x = 0;
        vel.z = 0;
    } else if (isMobile) {
        const joy = animationState.mobileInput;
        if (Math.abs(joy.y) > 0.08) inputFwd = joy.y;
        if (Math.abs(joy.x) > 0.08) inputStrafe = joy.x;
    } else {
        if (keys.w || keys.arrowup)    inputFwd =  1;
        if (keys.s || keys.arrowdown)  inputFwd = -1;
        if (keys.a || keys.arrowleft)  inputStrafe = -1;
        if (keys.d || keys.arrowright) inputStrafe =  1;
    }

    const isMoving = Math.abs(inputFwd) > 0.08 || Math.abs(inputStrafe) > 0.08;
    let moveX = 0, moveZ = 0;

    if (isMobile) {
        if (isMoving) {
            const moveFwdAngle = animationState.camYaw + Math.PI;
            const moveRightAngle = moveFwdAngle - Math.PI / 2;
            moveX = Math.sin(moveFwdAngle) * inputFwd + Math.sin(moveRightAngle) * inputStrafe;
            moveZ = Math.cos(moveFwdAngle) * inputFwd + Math.cos(moveRightAngle) * inputStrafe;
            const travelAngle = Math.atan2(moveX, moveZ);
            let rotDiff = travelAngle - rot;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            rot += rotDiff * Math.min(1, 4.0 * dt);
        }
    } else {
        const kbStrafe = inputStrafe * 0.6;
        moveX = Math.sin(rot) * inputFwd + Math.cos(rot) * kbStrafe;
        moveZ = Math.cos(rot) * inputFwd - Math.sin(rot) * kbStrafe;
    }

    if (isMoving) {
        const targetSpeed = 4.5;
        vel.x += (moveX * targetSpeed - vel.x) * Math.min(1, 14.0 * dt);
        vel.z += (moveZ * targetSpeed - vel.z) * Math.min(1, 14.0 * dt);
    } else {
        vel.x += (0 - vel.x) * Math.min(1, 11.0 * dt);
        vel.z += (0 - vel.z) * Math.min(1, 11.0 * dt);
    }

    px += vel.x * dt;
    pz += vel.z * dt;

    [px, pz] = resolveCollisions(px, pz, 0.3, animationState.hbRiding);
    
    py = animationState.avatarPos[1]; // Keep Y position from launch logic etc.

    animationState.avatarRot = rot;
    animationState.avatarPos = [px, py, pz, rot];
    if (avatar) {
        avatar.position.set(px, py, pz);
        avatar.rotation.y = rot;
    }

    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const avatarEntry = animationState.avatarEntry;
    if (avatarEntry) {
        if (avatarEntry._isMixamo) {
            const emoteId = animationState.isDancing ? (animationState.activeEmote?.id || "dance") : null;
            updateMixamoAvatarAnimation(avatarEntry, speed, animationState.isDancing, dt, animationState.hbRiding, emoteId);
        } else {
            updateAvatarAnimation(avatarEntry, speed, animationState.isDancing, dt, animationState.hbRiding);
        }
    }


    scene.userData._ferrisLookingAtBeach = animationState.ferrisRiding && (scene.userData._camVecs?.rLookSmooth?.z > 10);
    animateCosmicSky(scene, camera, t, dt);
    animateFerrisWheel(scene, t, callbacks.audioBeatRef?.current ?? 0, avatarPos[0], avatarPos[2], animationState.tvSmooth);
    // ... (other animation calls)

    if (animationState.ferrisRiding) {
        if (!animationState.rideState) animationState.rideState = { yaw: 0, pitch: 0, rt: 0 };
        const rl = animationState.rideState;
        const joy = animationState.mobileInput;
        const rcdx = joy.camDx || 0, rcdy = joy.camDy || 0;
        joy.camDx = 0; joy.camDy = 0;

        if (Math.abs(rcdx) > 0.0002 || Math.abs(rcdy) > 0.0002) {
            rl.yaw += rcdx * 0.65; rl.pitch += rcdy * 0.65; rl.rt = 0;
        } else { rl.rt += dt; }

        const MY = (40*Math.PI)/180, MP = (20*Math.PI)/180;
        rl.yaw   = Math.max(-MY, Math.min(MY, rl.yaw));
        rl.pitch = Math.max(-MP, Math.min(MP, rl.pitch));

        if (rl.rt > 1.2) {
            rl.yaw   -= Math.sign(rl.yaw)   * Math.min(Math.abs(rl.yaw),   0.8*dt);
            rl.pitch -= Math.sign(rl.pitch) * Math.min(Math.abs(rl.pitch), 0.8*dt);
        }

        const rider = getRiderCameraTransform(t, rl.yaw, rl.pitch);
        if (!scene.userData._camVecs) scene.userData._camVecs = { cabinPos: new THREE.Vector3(), nLook: new THREE.Vector3(), rLookSmooth: new THREE.Vector3() };
        const cv = scene.userData._camVecs;
        cv.cabinPos.set(rider.camPos.x, rider.camPos.y, rider.camPos.z);
        cv.nLook.set(rider.lookAt.x, rider.lookAt.y, rider.lookAt.z);

        if (!cv.rLookInitialized) { cv.rLookSmooth.copy(cv.nLook); cv.rLookInitialized = true; }
        else { cv.rLookSmooth.lerp(cv.nLook, Math.min(1, dt * 1.1)); }

        const rFov = 62 + rider.atTop * 4;
        if (Math.abs(camera.fov - rFov) > 0.5) { camera.fov += (rFov - camera.fov) * Math.min(1, dt*4.0); camera.updateProjectionMatrix(); }

        camera.position.lerp(cv.cabinPos, Math.min(1, 8.0 * dt));
        camera.lookAt(cv.rLookSmooth);
        
        if(animationState.avatar) animationState.avatar.visible = false;
    } else {
        const isLandscape = isMobile && window.innerWidth > window.innerHeight;
        const camDist   = isLandscape ? 3.5 : 5.5;
        const camHeight = isLandscape ? 1.75 : 2.4;
        const camLookY  = isLandscape ? 1.35 : 0.9;
        const targetFov = isLandscape ? 60 : 52;

        if (Math.abs(camera.fov - targetFov) > 0.1) {
            camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
            camera.updateProjectionMatrix();
        }

        if (isMoving && !animationState.userTouchingCam) {
            const targetYaw = rot + Math.PI;
            let yawDelta = targetYaw - animationState.camYaw;
            while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
            while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
            animationState.camYaw += yawDelta * Math.min(1, dt * (isMobile ? 0.8 : 2.5));
        }

        let yawDiff = animationState.camYaw - animationState.camYawSmooth;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        animationState.camYawSmooth += yawDiff * Math.min(1, dt * (isMobile ? 6.0 : 10.0));
        animationState.camPitchSmooth += (animationState.camPitch - animationState.camPitchSmooth) * Math.min(1, dt * 8.0);

        const camAngle = animationState.camYawSmooth;
        const pitch = animationState.camPitchSmooth;
        const cosPitch = Math.cos(pitch);
        const sinPitch = Math.sin(pitch);
        const camX = px + Math.sin(camAngle) * camDist * cosPitch;
        const camY = py + camHeight + sinPitch * camDist;
        const camZ = pz + Math.cos(camAngle) * camDist * cosPitch;

        camera.position.set(camX, Math.max(py + 0.5, camY), camZ);
        camera.lookAt(px, py + camLookY, pz);
    }

    renderer.render(scene, camera);
    animationState.frame++;

    if (animationState.frame === 3 && callbacks.onLoaded) callbacks.onLoaded();
}