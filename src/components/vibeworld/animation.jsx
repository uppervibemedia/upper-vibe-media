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

    // ... (movement, collision, animation update logic would be here)

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
        // standard camera logic
    }

    renderer.render(scene, camera);
    animationState.frame++;

    if (animationState.frame === 3 && callbacks.onLoaded) callbacks.onLoaded();
}