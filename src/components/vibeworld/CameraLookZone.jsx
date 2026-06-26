import React, { useRef, useEffect } from "react";

/**
 * CameraLookZone — right-side GTA-style camera drag for iOS/Android mobile.
 *
 * Design:
 * - Covers the full right half of the screen so the touch target is generous.
 * - Tracks touch by identifier (NOT movementX — that's unreliable on iOS Safari).
 * - Outputs incremental camDx / camDy into mobileInputRef each frame.
 * - CityCanvas reads camDx/camDy in the animation loop and applies them to
 *   camYawRef / camPitchRef with proper clamping already defined there.
 * - When the user drags AND the joystick is moving, CityCanvas smoothly pulls
 *   the camera behind the avatar (GTA follow behavior).
 */
export default function CameraLookZone({ mobileInputRef }) {
  const divRef = useRef(null);
  // Per-touch tracking: id → { lastX, lastY }
  const activeTouchRef = useRef(null); // { id, lastX, lastY }

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    const onStart = (e) => {
      if (activeTouchRef.current !== null) return; // already tracking one finger
      const t = e.changedTouches[0];
      if (!t) return;
      // Record start position to distinguish taps from drags
      activeTouchRef.current = { id: t.identifier, lastX: t.clientX, lastY: t.clientY, startX: t.clientX, startY: t.clientY, startTime: Date.now() };
      // Don't prevent default immediately — let short taps reach the canvas for avatar hit detection
    };

    const onMove = (e) => {
      if (!activeTouchRef.current) return;
      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchRef.current.id) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;

      const rawDx = touch.clientX - activeTouchRef.current.lastX;
      const rawDy = touch.clientY - activeTouchRef.current.lastY;

      // Only treat as a drag (camera move) if moved >8px from start — otherwise could be a tap on an avatar
      const totalDx = touch.clientX - activeTouchRef.current.startX;
      const totalDy = touch.clientY - activeTouchRef.current.startY;
      const isDrag = Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 8;

      if (isDrag) {
        e.preventDefault(); // only prevent default once confirmed as drag
        activeTouchRef.current.lastX = touch.clientX;
        activeTouchRef.current.lastY = touch.clientY;
        mobileInputRef.current._camActive = true;

        const sensitivity = 0.0072;
        mobileInputRef.current.camDx = rawDx * sensitivity;
        mobileInputRef.current.camDy = rawDy * sensitivity;
      }
    };

    const onEnd = (e) => {
      if (!activeTouchRef.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchRef.current.id) {
          // If it was a short tap (< 250ms, < 12px movement) — don't consume, let canvas handle it
          const elapsed = Date.now() - activeTouchRef.current.startTime;
          const dx = e.changedTouches[i].clientX - activeTouchRef.current.startX;
          const dy = e.changedTouches[i].clientY - activeTouchRef.current.startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          activeTouchRef.current = null;
          mobileInputRef.current._camActive = false;
          mobileInputRef.current.camDx = 0;
          mobileInputRef.current.camDy = 0;
          return;
        }
      }
    };

    el.addEventListener("touchstart",  onStart, { passive: true });  // passive = taps pass through
    el.addEventListener("touchmove",   onMove,  { passive: false }); // non-passive only for drags
    el.addEventListener("touchend",    onEnd,   { passive: true });
    el.addEventListener("touchcancel", onEnd,   { passive: true });

    return () => {
      el.removeEventListener("touchstart",  onStart);
      el.removeEventListener("touchmove",   onMove);
      el.removeEventListener("touchend",    onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []); // attach once — reads from refs only

  return (
    <div
      ref={divRef}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "55%",   // right 55% — generous touch target on all phone sizes
        height: "100%",
        zIndex: 45,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        // pointer-events: none so canvas raycasting (click/pointerdown) passes through
        // Touch drag is captured via addEventListener above (not pointer events)
        pointerEvents: "none",
        // Subtle indicator so user knows this area is interactive
        // (invisible in practice — opacity 0 — but keeps layout correct)
      }}
    />
  );
}