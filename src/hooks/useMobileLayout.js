/**
 * useMobileLayout — single source of truth for real iPhone viewport geometry.
 *
 * Uses window.visualViewport (the actual visible area, excluding iOS chrome)
 * plus CSS env() safe-area-inset values read at runtime.
 *
 * Returns a `layout` object that all mobile HUD elements should read from:
 *   - vw / vh         : real visual viewport dimensions
 *   - saTop / saBottom / saLeft / saRight  : safe-area inset px values
 *   - isLandscape      : true when wider than tall
 *   - joystick         : { cx, cy, r, size }  — joystick center & radius
 *   - playerBottom     : bottom px for mini-player (above joystick + gap)
 *   - playerLeft       : left px for mini-player
 *   - playerMaxWidth   : max-width for mini-player pill
 *   - actionBottom     : bottom px for zone action button rows (above player)
 *   - djCardBottom     : bottom px for DJ song card
 *   - launchHudBottom  : bottom px for Vibe Launch HUD
 */

import { useState, useEffect, useRef } from "react";

// Read a CSS env() safe-area value from the document
function getSafeArea(side) {
  try {
    // Use a hidden element approach — getComputedStyle on env() is unreliable cross-browser
    // Fallback: create a temp element and read padding set to the env value
    const el = document.getElementById(`__sa_${side}`);
    if (el) return parseInt(el.getBoundingClientRect().height || el.getBoundingClientRect().width || "0") || 0;
  } catch {}
  return 0;
}

function readSafeAreas() {
  // We inject a tiny invisible element for each side on first call
  const sides = ["top", "bottom", "left", "right"];
  const result = { top: 0, bottom: 0, left: 0, right: 0 };
  sides.forEach((side) => {
    let el = document.getElementById(`__sa_probe_${side}`);
    if (!el) {
      el = document.createElement("div");
      el.id = `__sa_probe_${side}`;
      el.style.cssText = `
        position: fixed; pointer-events: none; opacity: 0; z-index: -9999;
        ${side === "top" || side === "bottom" ? `
          left: 0; right: 0; height: env(safe-area-inset-${side}, 0px);
          ${side === "top" ? "top: 0" : "bottom: 0"};
        ` : `
          top: 0; bottom: 0; width: env(safe-area-inset-${side}, 0px);
          ${side === "left" ? "left: 0" : "right: 0"};
        `}
      `;
      document.body.appendChild(el);
    }
    const rect = el.getBoundingClientRect();
    result[side] = side === "top" || side === "bottom"
      ? Math.round(rect.height)
      : Math.round(rect.width);
  });
  return result;
}

function computeLayout() {
  const vvp = window.visualViewport;
  const vw = vvp ? vvp.width : window.innerWidth;
  const vh = vvp ? vvp.height : window.innerHeight;
  const isLandscape = vw > vh;
  const sa = readSafeAreas();

  // ── Joystick geometry ──────────────────────────────────────────
  // Portrait: larger joystick, lower on screen
  // Landscape: smaller joystick, pushed up further from home bar
  const joySize = isLandscape ? 76 : 84;
  const joyHalfSize = joySize / 2;

  // Center X: always left side, outside of safe-area notch
  const joyCX = Math.max(joyHalfSize + 16, sa.left + joyHalfSize + 16);

  // Center Y from bottom (distance from bottom of visual viewport):
  // We need: joystick top edge > playerBottom + playerHeight + gap
  // Player height = 52px, gap = 16px
  // In portrait: player is above joystick. Player bottom = sa.bottom + 16.
  // So player top = sa.bottom + 16 + 52 = sa.bottom + 68.
  // Joystick bottom edge must be > player top + gap(8) = sa.bottom + 76.
  // Joystick center from bottom = sa.bottom + 76 + joyHalfSize.
  // In landscape: player goes to center-bottom. Joystick still left side.
  // We place joystick higher in landscape: sa.bottom + 24 + joyHalfSize.
  // But we must ensure it clears any bottom-center player position too.

  // Joystick bottom edge sits just above the safe-area home bar with a small gap
  const joyCYFromBottom = isLandscape
    ? sa.bottom + 16 + joyHalfSize
    : sa.bottom + 12 + joyHalfSize;

  // Absolute cy from top of visual viewport
  const joyCYAbsolute = vh - joyCYFromBottom;

  // ── Mini player position ────────────────────────────────────────
  // Portrait: player sits bottom-LEFT but ABOVE the joystick with 24px gap.
  //   - Joystick top edge (from bottom) = joyCYFromBottom - joyHalfSize
  //   - Player bottom = joystick top edge + 24px gap
  //   - Player left = right of joystick + 12px (so it never overlaps)
  // Landscape: player goes center-bottom, clear of joystick (far left).
  const playerHeight = 52;
  const playerWidth = isLandscape ? 220 : 180;

  let playerLeft, playerBottom;

  if (isLandscape) {
    // In landscape: park player at bottom-left, clear of joystick.
    // Stage controls sit bottom-center at roughly sa.bottom+8 and are ~56px tall.
    // To avoid overlap, place player bottom-LEFT (joystick right edge + gap).
    const minLeft = joyCX + joyHalfSize + 12;
    playerLeft = minLeft;
    // Push up enough to clear a typical stage control bar (56px) + 12px gap
    playerBottom = sa.bottom + 76;
  } else {
    // Portrait: place player to the RIGHT of the joystick, vertically aligned
    // so it sits at the same bottom level as the joystick, not above it.
    // This avoids any vertical clash.
    const joyRightEdge = joyCX + joyHalfSize;
    playerLeft = joyRightEdge + 16;
    // Bottom-align with joystick center minus half player height (centered on joystick)
    const joyBottomEdge = joyCYFromBottom - joyHalfSize; // from bottom of viewport
    playerBottom = joyBottomEdge + (joySize - playerHeight) / 2; // vertically centered on joy
    // Clamp so player doesn't exceed right edge
    const maxLeft = vw - playerWidth - 8;
    playerLeft = Math.min(playerLeft, maxLeft);
  }

  // ── Zone action buttons ─────────────────────────────────────────
  // Must be above player + gap
  const actionBottom = playerBottom + playerHeight + 16;

  // ── DJ card ────────────────────────────────────────────────────
  const djCardBottom = playerBottom + playerHeight + 12;

  // ── Launch HUD ─────────────────────────────────────────────────
  const launchHudBottom = playerBottom + playerHeight + 12;

  return {
    vw,
    vh,
    isLandscape,
    sa,
    joystick: {
      cx: joyCX,
      cy: joyCYAbsolute,
      cyFromBottom: joyCYFromBottom,
      size: joySize,
      halfSize: joyHalfSize,
      maxR: Math.floor(joySize * 0.38),
    },
    playerBottom,
    playerLeft,
    playerMaxWidth: playerWidth,
    playerHeight,
    actionBottom,
    djCardBottom,
    launchHudBottom,
  };
}

export default function useMobileLayout(enabled = true) {
  const [layout, setLayout] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setLayout(computeLayout());
      }, 80);
    };

    // Initial
    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", update);
      window.visualViewport.addEventListener("scroll", update);
    }

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", update);
        window.visualViewport.removeEventListener("scroll", update);
      }
    };
  }, [enabled]);

  return layout;
}