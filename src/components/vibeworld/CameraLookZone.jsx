import React, { useEffect, useRef } from "react";

/**
 * CameraLookZone — right-side touch region for iOS camera look controls.
 *
 * Uses native addEventListener with { passive: false } so preventDefault()
 * works on iOS Safari (React synthetic onTouchMove is passive by default
 * and cannot stop scroll, causing drift and missed inputs).
 *
 * Sensitivity tuned to match joystick feel:
 *   camDx: 0.0025 per px (horizontal yaw)
 *   camDy: 0.003  per px (vertical pitch, clamped)
 */
export default function CameraLookZone({ mobileInputRef, mobileLayout }) {
  const zoneRef = useRef(null);

  // Zone geometry derived from mobileLayout (recalculated on layout change)
  const zoneStyle = {
    position: "fixed",
    right: 0,
    top: 0,
    width: mobileLayout
      ? `${Math.round(mobileLayout.vw - (mobileLayout.joystick.cx + mobileLayout.joystick.halfSize + 12))}px`
      : "60%",
    height: mobileLayout
      ? `${mobileLayout.joystick.cy - mobileLayout.joystick.halfSize - 24}px`
      : "58%",
    zIndex: 45,
    // Transparent — purely an interaction surface
    background: "transparent",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      mobileInputRef.current._camBaseX = t.clientX;
      mobileInputRef.current._camBaseY = t.clientY;
      mobileInputRef.current._camActive = true;
      // Zero out any residual delta from previous frame
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    };

    const onTouchMove = (e) => {
      e.preventDefault(); // must be non-passive for this to work on iOS
      if (!mobileInputRef.current._camActive) return;
      const t = e.touches[0];
      if (!t) return;

      if (mobileInputRef.current._camBaseX !== undefined) {
        const dx = t.clientX - mobileInputRef.current._camBaseX;
        // drag RIGHT (+dx) = camera turns right = positive camDx
        mobileInputRef.current.camDx = Math.max(-0.055, Math.min(0.055, dx * 0.0025));
        mobileInputRef.current._camBaseX = t.clientX;
      }

      if (mobileInputRef.current._camBaseY !== undefined) {
        const dy = t.clientY - mobileInputRef.current._camBaseY;
        // drag UP (-dy) = look up = positive camDy; drag DOWN = look down
        mobileInputRef.current.camDy = Math.max(-0.025, Math.min(0.025, -dy * 0.003));
        mobileInputRef.current._camBaseY = t.clientY;
      }
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      mobileInputRef.current._camActive = false;
      mobileInputRef.current._camBaseX = undefined;
      mobileInputRef.current._camBaseY = undefined;
      // Zero out deltas — CityCanvas will decay residual naturally via its 0.7 factor
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    };

    // { passive: false } is critical on iOS — without it, preventDefault() is ignored
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
  }, [mobileInputRef]); // re-attach only if ref identity changes (never in practice)

  return <div ref={zoneRef} style={zoneStyle} />;
}