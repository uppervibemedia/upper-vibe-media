import React from "react";
import { isNewTrack } from "@/lib/isNewTrack";

/**
 * NewBadge — renders a "NEW" pill badge if the track was released in the last 7 days.
 *
 * Usage:
 *   <NewBadge track={track} />                     // auto-hides after 7 days
 *   <NewBadge track={track} className="..." />      // extra positioning class
 *
 * Returns null if the track is not new.
 */
export default function NewBadge({ track, className = "" }) {
  if (!isNewTrack(track)) return null;

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: "9px",
        fontWeight: 900,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: "linear-gradient(135deg, rgba(0,160,220,0.9), rgba(0,200,240,0.95))",
        color: "#000",
        boxShadow: "0 0 8px rgba(0,160,220,0.45)",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      NEW
    </span>
  );
}

/**
 * NewBadgeOverlay — positioned absolute for use inside a cover art container.
 * Renders at top-left of the parent (which should be position:relative).
 */
export function NewBadgeOverlay({ track }) {
  if (!isNewTrack(track)) return null;

  return (
    <div className="absolute top-2 left-2 z-10 pointer-events-none">
      <NewBadge track={track} />
    </div>
  );
}