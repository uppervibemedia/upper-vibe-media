/**
 * ResumeMusicButton — shown on iPhone Safari when the global player was
 * started programmatically but Safari blocked autoplay.
 * Tapping it re-tries playback inside a user gesture so Safari allows it.
 */
import React from "react";
import { Play } from "lucide-react";

export default function ResumeMusicButton({ isMobile, onResume }) {
  return (
    <button
      onTouchStart={(e) => e.stopPropagation()}
      onClick={onResume}
      className="flex items-center gap-2 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95 fixed z-[200]"
      style={{
        background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
        color: "#fff",
        boxShadow: "0 0 20px rgba(155,126,255,0.5)",
        border: "1px solid rgba(155,126,255,0.3)",
        padding: isMobile ? "8px 14px" : "10px 18px",
        minHeight: isMobile ? 40 : 48,
        touchAction: "manipulation",
        pointerEvents: "auto",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <Play className="w-4 h-4" />
      Tap to Play
    </button>
  );
}