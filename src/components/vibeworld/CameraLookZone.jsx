import React, { useRef, useEffect } from "react";

/**
 * CameraLookZone — right-side GTA-style camera drag for iOS/Android.
 *
 * LEFT SIDE (<40vw): passes through untouched → joystick works.
 * RIGHT SIDE (≥40vw): claimed at window level → camera look works.
 * No button exemption — zone action buttons are bottom-center, clear of the
 * right-edge camera band. Top-right HUD icons are reachable via joystick gap.
 *
 * IMPORTANT — WHY IT BROKE BEFORE:
 * 1. Delta computed AFTER updating lastX (lines 66→70), so camDx was always 0.
 * 2. Button exemption (checking pointerEvents/tagName) prevented claiming
 *    touches that landed on HUD-adjacent coordinates.
 * 3. touchend was passive — claim not strictly needed but passive=false
 *    prevents iOS from delaying/disabling touch handling.
 */
export default function CameraLookZone({ mobileInputRef }) {
  const touchIdRef = useRef(null);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  useEffect(() => {
    const onStart = (e) => {
      if (touchIdRef.current !== null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      // Only claim right-side (≥40vw). Left side → joystick.
      if (t.clientX < window.innerWidth * 0.40) return;
      // Skip if touch targets an interactive element (button, anchor, input).
      // composedPath() reveals the real touch target even during capture phase
      // — without this, the capture listener claims EVERY right-side touch and
      // no buttons ever fire their handlers on iPhone.
      const path = e.composedPath?.() || [];
      for (const el of path) {
        if (el?.tagName === "BUTTON" || el?.tagName === "A" ||
            el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" ||
            el?.tagName === "SELECT" || el?.getAttribute?.("role") === "button") return;
      }
      e.preventDefault();
      touchIdRef.current = t.identifier;
      lastXRef.current = t.clientX;
      lastYRef.current = t.clientY;
    };

    const onMove = (e) => {
      if (touchIdRef.current === null) return;
      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;
      e.preventDefault();

      const dx = touch.clientX - lastXRef.current;
      const dy = touch.clientY - lastYRef.current;
      lastXRef.current = touch.clientX;
      lastYRef.current = touch.clientY;

      const sensitivity = 0.008;
      mobileInputRef.current._camActive = true;
      mobileInputRef.current.camDx = dx * sensitivity;
      mobileInputRef.current.camDy = dy * sensitivity;
    };

    const onEnd = (e) => {
      if (touchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null;
          mobileInputRef.current._camActive = false;
          mobileInputRef.current.camDx = 0;
          mobileInputRef.current.camDy = 0;
          return;
        }
      }
    };

    const onCancel = () => {
      touchIdRef.current = null;
      mobileInputRef.current._camActive = false;
      mobileInputRef.current.camDx = 0;
      mobileInputRef.current.camDy = 0;
    };

    // Mount ALL listeners on `window` at the CAPTURE phase so they fire before
    // any React synthetic and are immune to z-index / pointer-events DOM layering.
    window.addEventListener("touchstart", onStart, { passive: false, capture: true });
    window.addEventListener("touchmove", onMove, { passive: false, capture: true });
    window.addEventListener("touchend", onEnd, { passive: false, capture: true });
    window.addEventListener("touchcancel", onCancel, { passive: true, capture: true });

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, []);

  // Decorative overlay — no events route through it (pointerEvents:none).
  // Its z-index is irrelevant; kept so race conditions on first touch don't
  // land on random HUD buttons.
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