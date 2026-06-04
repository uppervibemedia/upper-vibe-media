import React, { useState } from "react";
import { ThumbsDown } from "lucide-react";
import { useDislike } from "@/hooks/useDislike";
import { recordDislike } from "@/lib/radioCurator";
import { base44 } from "@/api/base44Client";

/**
 * ThumbsDownButton — marks a track as "play less often".
 *
 * Props:
 *   track     — track object { id, title }
 *   user      — current user object (null = logged out)
 *   size      — "sm" | "md" (default "sm")
 *   onLogin   — callback when user is logged out and taps the button
 */
export default function ThumbsDownButton({ track, user, size = "sm", onLogin }) {
  const { isDisliked, toggle } = useDislike(user?.email);
  const [busy, setBusy] = useState(false);

  if (!track) return null;

  const active = isDisliked(track.id);
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const btnSize  = size === "md" ? "w-9 h-9" : "w-7 h-7";

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) { onLogin?.(); return; }
    if (busy) return;
    setBusy(true);
    const nowDisliked = !active;
    // Update local curator weight immediately (no wait)
    recordDislike(track.id, nowDisliked, []);
    await toggle(track.id, { title: track.title });
    setBusy(false);
  };

  return (
    <button
      onClick={handleClick}
      title={active ? "Remove dislike" : "Play this less"}
      className={`${btnSize} rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 flex-shrink-0`}
      style={active ? {
        background: "rgba(239,68,68,0.15)",
        border: "1px solid rgba(239,68,68,0.45)",
        color: "#EF4444",
      } : {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.3)",
      }}
    >
      <ThumbsDown className={`${iconSize} ${active ? "fill-current" : ""}`} />
    </button>
  );
}