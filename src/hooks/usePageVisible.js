import { useState, useEffect } from "react";

/**
 * usePageVisible — returns true when the page/tab is visible, false when hidden.
 *
 * Used to pause infinite animation loops when the tab is backgrounded,
 * reducing GPU/CPU/battery drain on iOS PWA and desktop without removing animations.
 *
 * Animations resume instantly when the tab becomes active again because
 * framer-motion re-reads the `repeat` prop on the next render.
 */
export default function usePageVisible() {
  const [visible, setVisible] = useState(
    () => typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true
  );

  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible;
}