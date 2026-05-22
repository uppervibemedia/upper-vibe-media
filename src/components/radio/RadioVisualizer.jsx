import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * RadioVisualizer — animated visualizer for the Radio page.
 * On iOS, AudioContext is skipped (AirPlay compatible), so we use a
 * purely CSS/framer-motion reactive animation driven by isPlaying state.
 */
export default function RadioVisualizer({ isPlaying }) {
  const BAR_COUNT = 32;

  return (
    <div
      className="w-full flex items-end justify-center gap-[2px] px-4"
      style={{ height: 120, background: "transparent" }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const delay = (i / BAR_COUNT) * 0.8;
        const minH = 4 + Math.sin(i * 0.6) * 4;
        const maxH = isPlaying
          ? 30 + Math.sin(i * 0.4) * 40 + Math.cos(i * 0.7) * 20
          : minH;

        return (
          <motion.div
            key={i}
            className="rounded-full flex-shrink-0"
            style={{
              width: 5,
              background:
                i % 3 === 0
                  ? "rgba(0,200,220,0.7)"
                  : i % 3 === 1
                  ? "rgba(155,126,255,0.6)"
                  : "rgba(0,200,220,0.35)",
            }}
            animate={{
              height: isPlaying
                ? [minH, maxH, minH * 1.5, maxH * 0.7, minH]
                : [minH, minH + 2, minH],
            }}
            transition={{
              duration: isPlaying ? 0.8 + Math.random() * 0.4 : 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
          />
        );
      })}
    </div>
  );
}