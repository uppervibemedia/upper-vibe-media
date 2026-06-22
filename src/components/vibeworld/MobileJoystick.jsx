import React, { useRef, useState, useEffect, useCallback } from "react";
import useMobileLayout from "@/hooks/useMobileLayout";

/**
 * MobileJoystick — left-side movement thumbstick for mobile gameplay.
 * Consumes useMobileLayout for real iPhone visual-viewport geometry.
 */
export default function MobileJoystick({ onMove }) {
  const layout = useMobileLayout(true);

  // Thumb position relative to center
  const [thumbDX, setThumbDX] = useState(0);
  const [thumbDY, setThumbDY] = useState(0);
  const [active, setActive] = useState(false);

  const activePtrId = useRef(null);
  const activeRef = useRef(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Reset on orientation change (layout will update, just clear active state)
  useEffect(() => {
    activePtrId.current = null;
    activeRef.current = false;
    setActive(false);
    setThumbDX(0);
    setThumbDY(0);
    onMove?.(0, 0);
  }, [layout?.isLandscape, onMove]);

  const haptic = useCallback(() => {
    try { navigator?.vibrate?.(10); } catch {}
  }, []);

  const handleDown = useCallback((e) => {
    if (activePtrId.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    const ptr = e.nativeEvent?.pointerId ?? e.changedTouches?.[0]?.identifier ?? 0;
    activePtrId.current = ptr;
    haptic();
  }, [haptic]);

  const handleMove = useCallback((e) => {
    if (activePtrId.current === null) return;
    e.preventDefault();
    const L = layoutRef.current;
    if (!L) return;

    let clientX, clientY;
    if (e.nativeEvent?.pointerId !== undefined) {
      const ptrs = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
      const ourPtr = [...ptrs].find(p => p.pointerId === activePtrId.current);
      if (!ourPtr) return;
      clientX = ourPtr.clientX;
      clientY = ourPtr.clientY;
    } else {
      const touch = [...e.touches].find(t => t.identifier === activePtrId.current);
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    // joystick center in screen coords (from top-left)
    const cx = L.joystick.cx;
    const cy = L.joystick.cy;
    const halfSize = L.joystick.halfSize;

    let dx = (clientX - cx) / halfSize;
    let dy = (cy - clientY) / halfSize;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) { dx /= dist; dy /= dist; }

    setThumbDX(dx * L.joystick.maxR);
    setThumbDY(-dy * L.joystick.maxR);

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
    if (e.nativeEvent?.pointerId !== undefined) {
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

  if (!layout) return null;

  const { joystick } = layout;

  return (
    <div
      className="fixed z-[60]"
      style={{
        // Position the joystick ring: top-left corner of the bounding box
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