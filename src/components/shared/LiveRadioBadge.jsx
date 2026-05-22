import React from "react";
import { Radio } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * LiveRadioBadge
 * Props:
 *   isLive: bool — true = "LIVE RADIO" (red pulse), false = "RADIO READY" (static cyan)
 *   showListenButton: bool — show "Listen Live" link to /radio
 *   size: "sm" | "md"
 */
export default function LiveRadioBadge({ isLive = false, showListenButton = false, size = "md" }) {
  const isSmall = size === "sm";

  return (
    <div className={`inline-flex items-center gap-2 ${isSmall ? "flex-col sm:flex-row" : ""}`}>
      {/* Badge */}
      <div
        className="inline-flex items-center gap-1.5 rounded-full"
        style={{
          padding: isSmall ? "4px 10px" : "5px 12px",
          background: isLive
            ? "rgba(239,68,68,0.08)"
            : "rgba(0,200,220,0.06)",
          border: isLive
            ? "1px solid rgba(239,68,68,0.28)"
            : "1px solid rgba(0,200,220,0.2)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Live dot */}
        <span
          className="live-dot flex-shrink-0"
          style={{
            width: isSmall ? 6 : 7,
            height: isSmall ? 6 : 7,
            borderRadius: "50%",
            background: isLive ? "#ef4444" : "#00C9E0",
            flexShrink: 0,
          }}
        />
        <Radio
          style={{
            width: isSmall ? 10 : 12,
            height: isSmall ? 10 : 12,
            color: isLive ? "#ef4444" : "#00C9E0",
          }}
        />
        <span
          className="font-black tracking-[0.3em] uppercase"
          style={{
            fontSize: isSmall ? 8 : 9,
            color: isLive ? "#ef4444" : "#00C9E0",
            letterSpacing: "0.3em",
          }}
        >
          {isLive ? "Live Radio" : "Radio Ready"}
        </span>
      </div>

      {/* Optional "Listen Live" button */}
      {showListenButton && (
        <Link
          to="/radio"
          className="inline-flex items-center gap-1.5 rounded-full font-black transition-all hover:brightness-115 active:scale-95"
          style={{
            padding: isSmall ? "4px 12px" : "5px 14px",
            fontSize: isSmall ? 9 : 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            background: "rgba(0,200,220,0.1)",
            border: "1px solid rgba(0,200,220,0.25)",
            color: "#00C9E0",
          }}
        >
          <Radio style={{ width: 10, height: 10 }} />
          Listen Live
        </Link>
      )}

      {/* Pulse animation — respects prefers-reduced-motion */}
      <style>{`
        @keyframes liveDotPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .live-dot[style*="239,68,68"] {
            animation: liveDotPulse 1.8s ease-in-out infinite;
          }
        }
      `}</style>
    </div>
  );
}