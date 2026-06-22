import React, { useEffect, useRef } from "react";

/**
 * CameraLookZone — right-side touch region for iOS camera look controls.
 *
 * Uses native addEventListener with { passive: false } so preventDefault()
 * works on iOS Safari (React synthetic onTouchMove is passive by default
 * and cannot stop scroll, causing drift and missed inputs).
 *
 * Sensitivity:
 *   camDx: 0.0025 per px (horizontal yaw)
 *   camDy: 0.003  per px (vertical pitch)
 *
 * Touch identifier tracking: we lock to the specific touch ID that started
 * on this zone so the joystick finger on the left side never hijacks the camera.
 */
export default function CameraLookZone({ mobileInputRef, mobileLayout }) {
  const zoneRef = useRef(null);
  const activeTouchIdRef = useRef(null);

  const zoneStyle = {
    position: "fixed",
    right: 0,
    top: 0,
    width: mobileLayout
      ? `${Math.round(mobileLayout.vw - (mobileLayout.joystick.cx + mobileLayout.joystick.halfSize + 8))}px`
      : "62%",
    height: mobileLayout ? `${mobileLayout.vh}px` : "100%",
    zIndex: 45,
    background: "transparent",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;

    // Reset any stuck state whenever we re-attach (layout change / mount)
    activeTouchIdRef.current = null;
    if (mobileInputRef.current) {
      mobileInputRef.current._camActive = false;
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    }

    const onTouchStart = (e) => {
      e.preventDefault();
      if (activeTouchIdRef.current !== null) return; // already tracking a touch
      const t = e.changedTouches[0];
      if (!t) return;
      activeTouchIdRef.current = t.identifier;
      mobileInputRef.current._camBaseX = t.clientX;
      mobileInputRef.current._camBaseY = t.clientY;
      mobileInputRef.current._camActive = true;
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (activeTouchIdRef.current === null) return;
      // Find our specific touch — ignore joystick finger on the left side
      let t = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchIdRef.current) { t = e.touches[i]; break; }
      }
      if (!t) return;

      const dx = t.clientX - mobileInputRef.current._camBaseX;
      mobileInputRef.current.camDx = Math.max(-0.055, Math.min(0.055, dx * 0.0025));
      mobileInputRef.current._camBaseX = t.clientX;

      const dy = t.clientY - mobileInputRef.current._camBaseY;
      // drag UP (-dy) = look up = positive camDy
      mobileInputRef.current.camDy = Math.max(-0.018, Math.min(0.018, -dy * 0.003));
      mobileInputRef.current._camBaseY = t.clientY;
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      let found = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchIdRef.current) { found = true; break; }
      }
      if (!found) return;
      activeTouchIdRef.current = null;
      mobileInputRef.current._camActive = false;
      mobileInputRef.current._camBaseX = undefined;
      mobileInputRef.current._camBaseY = undefined;
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [mobileInputRef, mobileLayout]); // re-attach when layout changes

  return <div ref={zoneRef} style={zoneStyle} />;
}