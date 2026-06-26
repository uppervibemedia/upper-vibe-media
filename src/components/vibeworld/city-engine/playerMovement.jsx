/**
 * playerMovement.js — Handles avatar movement, collision, and animation state.
 */
import { SPAWN, COLLISION_BOXES, MOVE_SPEED, ACCELERATION, DECELERATION, ROTATION_SMOOTH, SKYLINE_NORTH, SKYLINE_EAST, SKYLINE_WEST, SKYLINE_BEACH_START, BEACH_MAX_Z, BEACH_HOVERBOARD_MAX_Z, BEACH_PROGRESS_LIMIT, BEACH_X_LIMIT_BASE, BEACH_X_LIMIT_NARROW } from './cityConfig';

function circleVsCircle(x1, z1, r1, x2, z2, r2) {
  const dx = x1 - x2, dz = z1 - z2;
  return dx * dx + dz * dz < (r1 + r2) * (r1 + r2);
}

function resolveCollisions(px, pz, r, isHoverboarding = false) {
  let x = px, z = pz;
  for (const [bx, bz, br] of COLLISION_BOXES) {
    if (!circleVsCircle(x, z, r, bx, bz, br)) continue;
    const dx = x - bx, dz = z - bz;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const overlap = r + br - dist;
    x += (dx / dist) * overlap;
    z += (dz / dist) * overlap;
  }

  if (z < SKYLINE_NORTH + r) z = SKYLINE_NORTH + r;
  if (x > SKYLINE_EAST - r)  x = SKYLINE_EAST - r;
  if (x < SKYLINE_WEST + r)  x = SKYLINE_WEST + r;

  if (z >= SKYLINE_BEACH_START) {
    const beachProgress = Math.min(1, (z - SKYLINE_BEACH_START) / BEACH_PROGRESS_LIMIT);
    const beachXLimit = BEACH_X_LIMIT_BASE - beachProgress * (BEACH_X_LIMIT_BASE - BEACH_X_LIMIT_NARROW);
    if (x > beachXLimit) x = beachXLimit;
    if (x < -beachXLimit) x = -beachXLimit;
  }

  const maxZ = isHoverboarding ? BEACH_HOVERBOARD_MAX_Z : BEACH_MAX_Z;
  if (z > maxZ) z = maxZ;

  return [x, z];
}

export function updatePlayerMovement(refs, dt) {
  const { keysRef, mouseRef, avatarPosRef, velocityRef, avatarRotRef, isMobileRef, mobileInputRef, camYawRef, lockedRef, hbRidingRef, speedBoostUntilRef, launchStateRef } = refs;
  const t = performance.now() * 0.001;

  let [px, py, pz] = avatarPosRef.current;
  let rot = avatarRotRef.current;
  const vel = velocityRef.current;
  const keys = keysRef.current;
  const mouse = mouseRef.current;

  let inputFwd = 0, inputStrafe = 0;
  if (lockedRef.current) {
    vel.x = 0; vel.z = 0;
  } else if (isMobileRef.current) {
    const joy = mobileInputRef.current;
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

  if (isMobileRef.current) {
    if (isMoving) {
      const moveFwdAngle = camYawRef.current + Math.PI;
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
    const boosting = hbRidingRef.current && performance.now() < speedBoostUntilRef.current;
    const targetSpeed = boosting ? MOVE_SPEED * 3.0 : MOVE_SPEED;
    vel.x += (moveX * targetSpeed - vel.x) * Math.min(1, ACCELERATION * dt);
    vel.z += (moveZ * targetSpeed - vel.z) * Math.min(1, ACCELERATION * dt);
  } else {
    vel.x += (0 - vel.x) * Math.min(1, DECELERATION * dt);
    vel.z += (0 - vel.z) * Math.min(1, DECELERATION * dt);
  }

  px += vel.x * dt;
  pz += vel.z * dt;

  [px, pz] = resolveCollisions(px, pz, 0.3, hbRidingRef.current);
  
  const hbLift = hbRidingRef.current ? (0.18 + Math.sin(t * 3.0) * 0.04) : 0;
  py = SPAWN[1] + hbLift;

  avatarRotRef.current = rot;
  avatarPosRef.current = [px, py, pz, rot];

  return {
    position: [px, py, pz],
    rotation: rot,
    speed: Math.sqrt(vel.x * vel.x + vel.z * vel.z),
    isMoving,
  };
}