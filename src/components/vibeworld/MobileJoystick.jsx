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
  const visualFrameRef = useRef(null);

  const scheduleVisual = useCallback((dx, dy, isActive) => {
    if (visualFrameRef.current) cancelAnimationFrame(visualFrameRef.current);
    visualFrameRef.current = requestAnimationFrame(() => {
      setThumbDX(dx);
      setThumbDY(dy);
      setActive(isActive);
      visualFrameRef.current = null;
    });
  }, []);

  useEffect(() => () => {
    if (visualFrameRef.current) cancelAnimationFrame(visualFrameRef.current);
  }, []);

  // Reset state on orientation change
  useEffect(() => {
    activeIdRef.current = null;
    scheduleVisual(0, 0, false);
    onMoveRef.current?.(0, 0);
  }, [layout?.isLandscape, scheduleVisual]);

  // Native capture listeners claim the whole left movement zone, not just the visible knob.
  // This keeps landscape/PWA movement working even when transparent HUD layers sit above the canvas.
  useEffect(() => {
    const isInteractive = (e) => {
      const path = e.composedPath?.() || [];
      return path.some((el) => {
        if (!el?.tagName) return false;
        if (el.closest?.('[data-camera-scroll-lock="true"]')) return true;
        const tag = el.tagName;
        return tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.getAttribute?.("role") === "button";
      });
    };

    const updateFromTouch = (touch) => {
      const L = layoutRef.current;
      if (!L || !touch) return;

      const cx = L.joystick.cx;
      const cy = L.joystick.cy;
      const halfSize = L.joystick.halfSize;

      let dx = (touch.clientX - cx) / halfSize;
      let dy = (cy - touch.clientY) / halfSize;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) { dx /= dist; dy /= dist; }

      onMoveRef.current?.(dx, dy);
      scheduleVisual(dx * L.joystick.maxR, -dy * L.joystick.maxR, dist > 0.12);
    };

    const onStart = (e) => {
      if (activeIdRef.current !== null) return;
      const L = layoutRef.current;
      const t = e.changedTouches[0];
      if (!L || !t) return;
      const leftEnd = L.controlZones?.leftEnd ?? (L.vw * 0.44);
      if (t.clientX > leftEnd || isInteractive(e)) return;
      e.preventDefault();
      e.stopPropagation();
      activeIdRef.current = t.identifier;
      updateFromTouch(t);
      try { navigator?.vibrate?.(10); } catch {}
    };

    const onMove = (e) => {
      if (activeIdRef.current === null) return;
      e.preventDefault();
      e.stopPropagation();

      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;
      updateFromTouch(touch);
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
      e.stopPropagation();
      activeIdRef.current = null;
      scheduleVisual(0, 0, false);
      onMoveRef.current?.(0, 0);
    };

    const reset = () => {
      activeIdRef.current = null;
      scheduleVisual(0, 0, false);
      onMoveRef.current?.(0, 0);
    };

    window.addEventListener("touchstart", onStart, { passive: false, capture: true });
    window.addEventListener("touchmove", onMove, { passive: false, capture: true });
    window.addEventListener("touchend", onEnd, { passive: false, capture: true });
    window.addEventListener("touchcancel", onEnd, { passive: false, capture: true });
    window.addEventListener("orientationchange", reset, { passive: true });
    window.visualViewport?.addEventListener("resize", reset, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onStart, true);
      window.removeEventListener("touchmove", onMove, true);
      window.removeEventListener("touchend", onEnd, true);
      window.removeEventListener("touchcancel", onEnd, true);
      window.removeEventListener("orientationchange", reset);
      window.visualViewport?.removeEventListener("resize", reset);
    };
  }, [scheduleVisual]);  // attach once — handlers read from refs

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