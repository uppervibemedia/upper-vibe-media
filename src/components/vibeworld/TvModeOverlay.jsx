/**
 * TvModeOverlay — AirPlay/Screen Mirroring instructions + TV Mode controls.
 * iOS cannot programmatically open Screen Mirroring — we show instructions instead.
 */
import React, { useState } from "react";

export default function TvModeOverlay({ onConfirm, onCancel, defaultQuality = "smooth" }) {
  const [quality, setQuality] = useState(defaultQuality);
  // Detect landscape so we can switch to a centered modal layout instead of bottom sheet
  const isLandscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{
        zIndex: 500,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        // In landscape: center vertically instead of anchoring to bottom
        alignItems: isLandscape ? "center" : "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full flex flex-col"
        style={{
          background: "linear-gradient(180deg,#0d0b1e 0%,#080616 100%)",
          border: "1px solid rgba(0,229,255,0.18)",
          // Portrait: bottom sheet. Landscape: centered card with rounded corners on all sides.
          borderRadius: isLandscape ? "20px" : "20px 20px 0 0",
          maxWidth: isLandscape ? "520px" : "100%",
          margin: isLandscape ? "0 auto" : "0",
          maxHeight: isLandscape
            ? "calc(100dvh - env(safe-area-inset-top, 20px) - env(safe-area-inset-bottom, 20px) - 24px)"
            : "calc(100dvh - env(safe-area-inset-top, 20px) - 16px)",
          paddingTop: isLandscape ? "0" : "calc(env(safe-area-inset-top, 0px))",
          paddingBottom: isLandscape ? "0" : "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          paddingLeft: isLandscape ? "calc(env(safe-area-inset-left, 0px))" : "0",
          paddingRight: isLandscape ? "calc(env(safe-area-inset-right, 0px))" : "0",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <span style={{ fontSize: 28 }}>📺</span>
          <div>
            <h2 className="font-heading font-black text-white text-lg leading-tight">Mirror to TV</h2>
            <p className="text-white/50 text-xs mt-0.5">Use iPhone Screen Mirroring to cast</p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(0,229,255,0.12)", margin: "0 20px" }} />

        {/* Steps */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-white/60 text-xs uppercase tracking-widest font-black mb-3">How to mirror</p>
          {[
            "Swipe down from the top-right corner of your iPhone.",
            "Tap Screen Mirroring.",
            "Select your TV or Apple TV.",
            "Return to Upper Vibe City.",
            "TV Mode will hide phone controls for a cleaner view.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-2.5">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 font-black text-xs"
                style={{
                  width: 22, height: 22,
                  background: "rgba(0,229,255,0.15)",
                  border: "1px solid rgba(0,229,255,0.35)",
                  color: "#00E5FF",
                  marginTop: 1,
                }}
              >
                {i + 1}
              </div>
              <p className="text-white/75 text-sm leading-snug">{step}</p>
            </div>
          ))}
        </div>

        {/* Lag tip */}
        <div
          className="mx-5 rounded-xl px-4 py-3 mb-4"
          style={{ background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.18)" }}
        >
          <p className="text-[11px] text-yellow-200/70 leading-relaxed">
            <span className="font-black text-yellow-300/90">Tip for smoother TV play:</span> use strong Wi-Fi, enable TV Game Mode, close other apps, or use an HDMI adapter for lowest lag.
          </p>
        </div>

        {/* Quality setting */}
        <div className="px-5 mb-5">
          <p className="text-white/50 text-xs uppercase tracking-widest font-black mb-2">TV Mode Quality</p>
          <div className="flex gap-2">
            {["smooth", "normal"].map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className="flex-1 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all"
                style={{
                  background: quality === q ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.05)",
                  border: quality === q ? "1.5px solid rgba(0,229,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  color: quality === q ? "#00E5FF" : "rgba(255,255,255,0.45)",
                  touchAction: "manipulation",
                }}
              >
                {q === "smooth" ? "🔵 Smooth" : "⚪ Normal"}
              </button>
            ))}
          </div>
          <p className="text-white/30 text-[10px] mt-1.5">
            {quality === "smooth" ? "Reduces particle effects and pulsing lights for smoother mirroring." : "Standard quality — all effects enabled."}
          </p>
        </div>

        {/* Buttons */}
        <div className="px-5 pb-2 flex flex-col gap-2">
          <button
            onClick={() => onConfirm(quality)}
            className="w-full py-3.5 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#00B8D4,#007AFF)",
              color: "#fff",
              touchAction: "manipulation",
            }}
          >
            📺 Turn On TV Mode
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.55)",
              touchAction: "manipulation",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}