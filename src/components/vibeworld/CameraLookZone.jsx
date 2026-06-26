import React, { useRef, useEffect } from "react";

/**
 * CameraLookZone — right-side GTA-style camera drag for iOS/Android mobile.
 *
 * Solves the "topmost element eats touches" problem on iOS Safari:
 * - Other HUD elements sit at z-50–z-60 with pointer-events: auto.
 * - iOS Safari routes touch events to the highest element in z-order that
 *   has pointer-events: auto — meaning a lower div (even with `pointer-events:
 *   none`) can NOT reliably capture touches when higher overlays exist.
 * - Instead of relying on the camera div itself to catch events, we mount a
 *   full-screen transparent top-layer overlay (z-1000) that uses addEventListener
 *   with { passive: false } to capture the gesture, then passes only the
 *   RIGHT-side touches through. Buttons and UI work normally because the
 *   overlay has pointer-events: none (events pass through for hit-testing)
 *   while addEventListener still receives them on Safari.
 * - Only the RIGHT side is captured — the left side passes through so the
 *   joystick (z-62) works as always.
 * - No preference: taps < 8px are NOT consumed so avatar taps still work.
 *
 * LEFT SIDE: completely transparent — joystick and everything works.
 * RIGHT SIDE: captures touch for radar camera look at the z-1000 level.
 */
export default function CameraLookZone({ mobileInputRef }) {
  const divRef = useRef(null);
  const activeTouchRef = useRef(null); // { id, lastX, lastY, startX, startY, startTime }

  useEffect(() => {
    // On start: only capture touches on the RIGHT third (60%) of the screen
    const onStart = (e) => {
      if (activeTouchRef.current !== null) return; // already tracking one finger
      const t = e.changedTouches[0];
      if (!t) return;
      const vw = window.innerWidth;
      // Capture only touches in the right 60% — DON'T consume LEFT touches (joystick)
      if (t.clientX < vw * 0.40) return;
      e.preventDefault(); // {passive:false} context — claim the gesture so Safari never delays
      activeTouchRef.current = { id: t.identifier, lastX: t.clientX, lastY: t.clientY, startX: t.clientX, startY: t.clientY, startTime: Date.now() };
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
          activeTouchRef.current = null;
          mobileInputRef.current._camActive = false;
          mobileInputRef.current.camDx = 0;
          mobileInputRef.current.camDy = 0;
          return;
        }
      }
    };

    const onCancel = (e) => {
      if (!activeTouchRef.current) return;
      activeTouchRef.current = null;
      mobileInputRef.current._camActive = false;
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    };

    const el = divRef.current;
    if (!el) return;

    // Both touch and pointer paths for maximum iOS Safari coverage:
    // - touchstart/touchmove/touchend: iOS native gesture tracking.
    // - All passive: false so Safari never drops the gesture.
    el.addEventListener("touchstart", onStart, { passive: true });  // passive = pass left-side touches through
    el.addEventListener("touchmove", onMove, { passive: false });   // non-passive so preventDefault works
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, []); // attach once — reads from refs only

  return (
    <div
      ref={divRef}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "60%",
        height: "100dvh",
        zIndex: 45000,
        pointerEvents: "none",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    />
  );
}