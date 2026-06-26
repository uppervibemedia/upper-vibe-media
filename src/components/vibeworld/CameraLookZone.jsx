import React, { useRef, useEffect } from "react";

/**
 * CameraLookZone — right-side GTA-style camera drag for iOS/Android.
 *
 * HOW THIS WORKS (the pointer-events safari gotcha):
 * Even with pointer-events:none on the div AND addEventListener('touchstart'),
 * iOS Safari 17+ DOES NOT dispatch touchstart/touchmove events to elements
 * that have pointer-events:none. The div would be invisible to hit-testing.
 *
 * FIX: Listeners are mounted on `window` instead. We filter clientX < 40vw
 * so left-side touches still reach the joystick, and only right 60% captures
 * get consumed. This makes the camera completely z-index agnostic.
 *
 * LEFT SIDE: passes through untouched → joystick works.
 * RIGHT SIDE: captured at window level → camera look works, no overlay can block.
 */
export default function CameraLookZone({ mobileInputRef }) {
  // Track the active touch by identifier for proper multitouch isolation
  const activeTouchRef = useRef(null);

  useEffect(() => {
    const onStart = (e) => {
      if (activeTouchRef.current !== null) return; // already tracking one finger
      const t = e.changedTouches[0];
      if (!t) return;
      // Let touches landing on buttons through — only claim camera-drag gestures.
      // Uses pointer-events to check whether the real target is interactive.
      if (t && t.target) {
        const pe = window.getComputedStyle(t.target).pointerEvents;
        if (pe === "auto" && ["BUTTON","A","INPUT","SELECT","TEXTAREA"].includes(t.target.tagName)) return;
      }
      // Only capture right-side (>40vw). Left side → joystick.
      if (t.clientX < window.innerWidth * 0.40) return;
      // Claim the right-side gesture so Safari doesn't do rubber-banding / scroll
      e.preventDefault();
      activeTouchRef.current = {
        id: t.identifier,
        lastX: t.clientX,
        lastY: t.clientY,
        startX: t.clientX,
        startY: t.clientY,
        startTime: Date.now(),
      };
    };

    const onMove = (e) => {
      const track = activeTouchRef.current;
      if (!track) return;
      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === track.id) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;

      const isDrag = Math.hypot(
        touch.clientX - track.startX,
        touch.clientY - track.startY,
      ) > 8;

      if (isDrag) {
        e.preventDefault(); // claim the gesture so safari never delays
        track.lastX = touch.clientX;
        track.lastY = touch.clientY;
        mobileInputRef.current._camActive = true;

        const sensitivity = 0.008; // slightly increased from 0.0072
        mobileInputRef.current.camDx = (touch.clientX - track.lastX) * sensitivity;
        mobileInputRef.current.camDy = (touch.clientY - track.lastY) * sensitivity;
        track.lastX = touch.clientX;
        track.lastY = touch.clientY;
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

    const onCancel = () => {
      activeTouchRef.current = null;
      mobileInputRef.current._camActive = false;
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    };

    // ── Mount ALL listeners on `window` at the CAPTURE phase ──
    // This guarantees they fire before any React synthetic event and
    // are immune to any z-index / pointer-events layering in the DOM.
    window.addEventListener("touchstart", onStart, { passive: false, capture: true });
    window.addEventListener("touchmove", onMove, { passive: false, capture: true });
    window.addEventListener("touchend", onEnd, { passive: true, capture: true });
    window.addEventListener("touchcancel", onCancel, { passive: true, capture: true });

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, []); // reads only refs

  // The div is now purely decorative — no events come through it.
  // Its z-index is irrelevant. Keep it as an invisible overlay so race
  // conditions on first click don't land on random HUD buttons.
  return (
    <div
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