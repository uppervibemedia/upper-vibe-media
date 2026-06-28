import React from "react";
import { AudioLines } from "lucide-react";

/**
 * Standard 432 Hz / frequency badge — used everywhere on the site.
 * Same height, font, icon, padding, and border radius across all contexts.
 */
export default function FreqBadge({ label = "432 Hz", color = "0,160,220", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-black ${className}`}
      style={{
        fontSize: "11px",
        lineHeight: 1,
        padding: "5px 10px",
        background: `rgba(${color},0.12)`,
        border: `1px solid rgba(${color},0.35)`,
        color: `rgb(${color})`,
        whiteSpace: "nowrap",
      }}
    >
      <AudioLines style={{ width: 11, height: 11, flexShrink: 0 }} />
      {label}
    </span>
  );
}