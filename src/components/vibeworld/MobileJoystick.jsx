import React, { useRef, useState, useEffect, useCallback } from "react";

/**
 * MobileJoystick — left-side movement thumbstick for mobile gameplay.
 *
 * Fixed HUD element. Uses Pointer Events with iOS touch fallback.
 * Orientation-aware sizing/positioning. Feeds normalized vector (-1..1)
 * into the same movement controller used by desktop WASD.
 */

// ── Layout helpers ──────────────────────────────────────────────
function getLayout() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const saLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-left)").trim()) || 0;
  const saBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)").trim()) || 0;

  if (isLandscape) {
    return {
      joySize: 76,
      knobSize: 30,
      maxR: 30,
      left: Math.max(105, saLeft + 105),
      bottom: Math.max(75, saBottom + 75),
    };
  }
  return {
    joySize: 82,
    knobSize: 36,
    maxR: 32,
    left: Math.max(65, saLeft + 65),
    bottom: Math.max(135, saBottom + 135),
  };
}

export default function MobileJoystick({ onMove }) {
  const [layout, setLayout] = useState(getLayout);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Thumb position relative to center
  const [thumbDX, setThumbDX] = useState(0);
  const [thumbDY, setThumbDY] = useState(0);
  const [active, setActive] = useState(false);

  const activePtrId = useRef(null);
  const activeRef = useRef(false);

  const haptic = useCallback(() => {
    try { navigator?.vibrate?.(10); } catch {}
  }, []);

  // ── Orientation reset ────────────────────────────────────────
  useEffect(() => {
    let t;
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const L = getLayout();
        setLayout(L);
        layoutRef.current = L;
        // Hard reset all state
        activePtrId.current = null;
        activeRef.current = false;
        setActive(false);
        setThumbDX(0);
        setThumbDY(0);
        onMove?.(0, 0);
      }, 120);
    };
    window.addEventListener("resize", reset);
    window.addEventListener("orientationchange", reset);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", reset);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", reset);
      window.removeEventListener("orientationchange", reset);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", reset);
    };
  }, [onMove]);

  // ── Pointer handlers ──────────────────────────────────────────
  const handleDown = useCallback((e) => {
    if (activePtrId.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    const ptr = e.nativeEvent.pointerId ?? e.changedTouches?.[0]?.identifier;
    activePtrId.current = ptr;
    haptic();
  }, [haptic]);

  const handleMove = useCallback((e) => {
    if (activePtrId.current === null) return;
    e.preventDefault();

    const L = layoutRef.current;
    let clientX, clientY;

    if (e.nativeEvent.pointerId !== undefined) {
      // Pointer event
      const ptrs = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
      const ourPtr = [...ptrs].find(p => p.pointerId === activePtrId.current);
      if (!ourPtr) return;
      clientX = ourPtr.clientX;
      clientY = ourPtr.clientY;
    } else {
      // Touch fallback
      const touch = [...e.touches].find(t => t.identifier === activePtrId.current);
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    // Calculate delta from joystick center (bottom-left anchored)
    const cx = L.left;
    const cy = window.innerHeight - L.bottom;
    let dx = (clientX - cx) / (L.joySize / 2);
    let dy = (cy - clientY) / (L.joySize / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) { dx /= dist; dy /= dist; }

    setThumbDX(dx * L.maxR);
    setThumbDY(-dy * L.maxR);

    if (dist > 0.15 && !activeRef.current) {
      activeRef.current = true;
      setActive(true);
      haptic();
    }
    if (dist <= 0.15 && activeRef.current) {
      activeRef.current = false;
      setActive(false);
    }

    onMove?.(dx, dy);
  }, [onMove, haptic]);

  const handleUp = useCallback((e) => {
    if (activePtrId.current === null) return;

    let found = false;
    if (e.nativeEvent.pointerId !== undefined) {
      found = e.nativeEvent.pointerId === activePtrId.current;
    } else {
      found = [...e.changedTouches].some(t => t.identifier === activePtrId.current);
    }
    if (!found) return;

    e.preventDefault();
    activePtrId.current = null;
    activeRef.current = false;
    setActive(false);
    setThumbDX(0);
    setThumbDY(0);
    onMove?.(0, 0);
  }, [onMove]);

  const L = layout;

  return (
    <div
      className="fixed z-[60]"
      style={{
        left: L.left - L.joySize / 2,
        bottom: L.bottom - L.joySize / 2,
        width: L.joySize,
        height: L.joySize,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active
          ? "rgba(255,255,255,0.12)"
          : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: active ? "0 0 18px rgba(0,180,220,0.25)" : "none",
        pointerEvents: "auto",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
      onTouchCancel={handleUp}
    >
      {/* Knob */}
      <div
        style={{
          width: L.knobSize,
          height: L.knobSize,
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