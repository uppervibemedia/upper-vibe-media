import React, { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * MobileControls — virtual joystick (left) + touch camera drag (right).
 * Left side: virtual joystick for movement.
 * Right side: swipe/drag to look around.
 */

export default function MobileControls({ onInput, interactionLocked }) {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const leftTouchId = useRef(null);
  const rightTouchId = useRef(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const lastInput = useRef({ forward: false, backward: false, left: false, right: false, lookX: 0, lookY: 0 });

  // Throttle input updates
  const rafRef = useRef(null);
  const dirtyRef = useRef(false);

  const flushInput = useCallback(() => {
    dirtyRef.current = false;
    onInput(lastInput.current);
  }, [onInput]);

  const scheduleFlush = useCallback(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      rafRef.current = requestAnimationFrame(flushInput);
    }
  }, [flushInput]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleLeftStart = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (!t || rightTouchId.current === t.identifier) return;
    leftTouchId.current = t.identifier;
    const rect = leftRef.current.getBoundingClientRect();
    joystickCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const handleLeftMove = useCallback((e) => {
    e.preventDefault();
    if (leftTouchId.current === null) return;
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === leftTouchId.current) { touch = e.touches[i]; break; }
    }
    if (!touch) return;

    const dx = touch.clientX - joystickCenter.current.x;
    const dy = touch.clientY - joystickCenter.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 40;

    const clampedX = dist > maxDist ? (dx / dist) * maxDist : dx;
    const clampedY = dist > maxDist ? (dy / dist) * maxDist : dy;

    const normX = clampedX / maxDist;
    const normY = -clampedY / maxDist;

    lastInput.current.forward = normY > 0.25;
    lastInput.current.backward = normY < -0.25;
    lastInput.current.right = normX > 0.25;
    lastInput.current.left = normX < -0.25;

    scheduleFlush();
  }, [scheduleFlush]);

  const handleLeftEnd = useCallback(() => {
    leftTouchId.current = null;
    lastInput.current.forward = false;
    lastInput.current.backward = false;
    lastInput.current.left = false;
    lastInput.current.right = false;
    scheduleFlush();
  }, [scheduleFlush]);

  const handleRightStart = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (!t || leftTouchId.current === t.identifier) return;
    rightTouchId.current = t.identifier;
  }, []);

  const handleRightMove = useCallback((e) => {
    e.preventDefault();
    if (rightTouchId.current === null || interactionLocked) return;
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === rightTouchId.current) { touch = e.touches[i]; break; }
    }
    if (!touch) return;

    // Use small increments (these get multiplied by delta in the controller)
    lastInput.current.lookX = touch.movementX || 0;
    lastInput.current.lookY = touch.movementY || 0;

    scheduleFlush();
  }, [scheduleFlush, interactionLocked]);

  const handleRightEnd = useCallback(() => {
    rightTouchId.current = null;
    lastInput.current.lookX = 0;
    lastInput.current.lookY = 0;
    scheduleFlush();
  }, [scheduleFlush]);

  return (
    <>
      {/* Left: Joystick zone */}
      <div
        ref={leftRef}
        className="absolute bottom-0 left-0 z-40"
        style={{
          width: "50%",
          height: "50%",
          touchAction: "none",
          pointerEvents: "auto",
        }}
        onTouchStart={handleLeftStart}
        onTouchMove={handleLeftMove}
        onTouchEnd={handleLeftEnd}
        onTouchCancel={handleLeftEnd}
      >
        <div className="absolute bottom-8 left-8 flex items-center justify-center opacity-40 pointer-events-none">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 90,
              height: 90,
              background: "rgba(0,160,220,0.12)",
              border: "2px solid rgba(0,160,220,0.3)",
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: 40,
                height: 40,
                background: "rgba(0,160,220,0.25)",
                border: "1px solid rgba(0,160,220,0.5)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: Camera drag zone */}
      <div
        ref={rightRef}
        className="absolute bottom-0 right-0 z-40"
        style={{
          width: "50%",
          height: "50%",
          touchAction: "none",
          pointerEvents: "auto",
        }}
        onTouchStart={handleRightStart}
        onTouchMove={handleRightMove}
        onTouchEnd={handleRightEnd}
        onTouchCancel={handleRightEnd}
      >
        <div className="absolute bottom-8 right-8 opacity-25 pointer-events-none">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 60,
              height: 60,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 rounded-full border-2 border-dashed"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}