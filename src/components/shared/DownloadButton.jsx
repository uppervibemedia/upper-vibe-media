import React from "react";
import { Download, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Reusable download button.
 * Routes to the song detail page with ?downloadIntent=true.
 * The song page is the ONLY place where actual downloads happen.
 *
 * Props:
 *   item      — content record (must have .id)
 *   isPremium — whether user has Plus/Admin
 *   size      — "sm" | "md" (default: "sm")
 *   className — extra classes
 */
export default function DownloadButton({
  item,
  isPremium = false,
  size = "sm",
  className = "",
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!item?.id) return;
    navigate(`/song/${item.id}?downloadIntent=true`);
  };

  const sizeClasses = size === "sm"
    ? "w-7 h-7 rounded-lg"
    : "px-3 py-2 rounded-xl gap-2 text-xs font-semibold tracking-wide";

  return (
    <button
      onClick={handleClick}
      title={isPremium ? "Download on song page" : "Upgrade to Plus to download"}
      className={`flex items-center justify-center transition-all border ${
        isPremium
          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
          : "border-border/30 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-primary/60"
      } ${sizeClasses} ${className}`}
    >
      {isPremium
        ? <Download className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        : <Lock className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      {size !== "sm" && <span>Download</span>}
    </button>
  );
}