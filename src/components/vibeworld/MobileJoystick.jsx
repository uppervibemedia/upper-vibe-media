import React, { useRef, useState, useEffect, useCallback } from "react";
import useMobileLayout from "@/hooks/useMobileLayout";

/**
 * MobileJoystick — left-side movement thumbstick for mobile gameplay.
 *
 * iOS Safari note: PointerEvents are unreliable for continuous tracking.
 * This component uses native Touch Events exclusively via useEffect + direct
 * DOM listeners (passive:false) so preventDefault() actually works and
 * prevents scroll/rubber-band from stealing the touch.
 *
 * The joystick div is z-[62] — above the camera look zone (z-[45]) and
 * below panels (z-[65]+).
 */
export default function MobileJoystick({ onMove }) {
  const layout = useMobileLayout(true);

  const [thumbDX, setThumbDX] = useState(0);
  const [thumbDY, setThumbDY] = useState(0);
  const [active, setActive] = useState(false);

  const divRef = useRef(null);
  const activeIdRef = useRef(null);   // active touch identifier
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Reset state on orientation change
  useEffect(() => {
    activeIdRef.current = null;
    setActive(false);
    setThumbDX(0);
    setThumbDY(0);
    onMoveRef.current?.(0, 0);
  }, [layout?.isLandscape]);

  // Attach native (non-passive) touch listeners directly to the DOM node
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    const onStart = (e) => {
      if (activeIdRef.current !== null) return;
      e.preventDefault();
      e.stopPropagation();
      const t = e.changedTouches[0];
      if (!t) return;
      activeIdRef.current = t.identifier;
      try { navigator?.vibrate?.(10); } catch {}
    };

    const onMove = (e) => {
      if (activeIdRef.current === null) return;
      e.preventDefault();
      const L = layoutRef.current;
      if (!L) return;

      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;

      const cx = L.joystick.cx;
      const cy = L.joystick.cy;
      const halfSize = L.joystick.halfSize;

      let dx = (touch.clientX - cx) / halfSize;
      let dy = (cy - touch.clientY) / halfSize;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) { dx /= dist; dy /= dist; }

      setThumbDX(dx * L.joystick.maxR);
      setThumbDY(-dy * L.joystick.maxR);
      setActive(dist > 0.12);

      onMoveRef.current?.(dx, dy);
    };

    const onEnd = (e) => {
      if (activeIdRef.current === null) return;
      let found = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeIdRef.current) {
          found = true;
          break;
        }
      }
      if (!found) return;
      e.preventDefault();
      activeIdRef.current = null;
      setActive(false);
      setThumbDX(0);
      setThumbDY(0);
      onMoveRef.current?.(0, 0);
    };

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);  // attach once — handlers read from refs

  if (!layout) return null;

  const { joystick } = layout;

  return (
    <div
      ref={divRef}
      className="fixed z-[62]"
      style={{
        left: joystick.cx - joystick.halfSize,
        top: joystick.cy - joystick.halfSize,
        width: joystick.size,
        height: joystick.size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: active ? "0 0 18px rgba(0,180,220,0.25)" : "none",
        // touchAction none is handled by passive:false preventDefault in native listeners
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: joystick.maxR * 2 * 0.55,
          height: joystick.maxR * 2 * 0.55,
          borderRadius: "50%",
          pointerEvents: "none",
          background: active
            ? "linear-gradient(135deg, rgba(0,180,220,0.5), rgba(155,126,255,0.4))"
            : "rgba(255,255,255,0.14)",
          border: "2px solid rgba(255,255,255,0.3)",
          transform: `translate(${thumbDX}px, ${thumbDY}px)`,
          transition: active ? "none" : "transform 0.08s ease-out",
        }}
      />
    </div>
  );
}