import React, { useState } from "react";
import { Download, Lock, Check, Loader2 } from "lucide-react";
import { canDownloadContent, saveDownloadRecord, recordUserDownload, triggerBrowserDownload } from "@/lib/downloadService";
import { toast } from "sonner";

/**
 * Reusable download button.
 * 
 * Props:
 *   item         — content record (track, lesson, playlist)
 *   contentType  — "track" | "video" | "playlist"
 *   userTier     — "free" | "supporter" | "premium"
 *   userEmail    — current user email
 *   onUpgrade    — callback to show upgrade modal (for non-premium)
 *   size         — "sm" | "md" (default: "sm")
 *   className    — extra classes
 */
export default function DownloadButton({
  item,
  contentType = "track",
  userTier = "free",
  userEmail,
  user,
  onUpgrade,
  size = "sm",
  className = "",
}) {
  const [status, setStatus] = useState("idle"); // idle | downloading | done

  const isPremium = userTier === "premium";
  const isDownloadable = canDownloadContent(userTier, item);

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isPremium) {
      onUpgrade?.();
      return;
    }

    if (!item?.is_downloadable) {
      toast.error("This content is not available for download.");
      return;
    }

    const fileUrl = item.audio_url || item.video_url || item.file_url;
    if (!fileUrl) {
      toast.error("No downloadable file found for this item.");
      return;
    }

    setStatus("downloading");
    try {
      // Save to legacy Download entity
      if (userEmail) {
        await saveDownloadRecord(userEmail, contentType, item);
      }
      // Save to UserDownload entity (for My Downloads page)
      if (user && contentType === "track") {
        await recordUserDownload(user, item);
      }
      // Trigger browser download
      triggerBrowserDownload(fileUrl, `${item.title || item.name || "download"}`);
      setStatus("done");
      toast.success(`"${item.title || item.name}" saved to your downloads!`);
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("idle");
      toast.error("Download failed. Please try again.");
    }
  };

  const sizeClasses = size === "sm"
    ? "w-7 h-7 rounded-lg"
    : "px-3 py-2 rounded-xl gap-2 text-xs font-semibold tracking-wide";

  if (!isPremium) {
    // Locked state — shows for upsell
    return (
      <button
        onClick={handleClick}
        title="Premium only — Upgrade to download"
        className={`flex items-center justify-center transition-all border border-border/30 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-primary/60 ${sizeClasses} ${className}`}
      >
        <Lock className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {size !== "sm" && <span>Download</span>}
      </button>
    );
  }

  if (!item?.is_downloadable) return null;

  return (
    <button
      onClick={handleClick}
      disabled={status === "downloading"}
      title={status === "done" ? "Downloaded!" : "Download"}
      className={`flex items-center justify-center transition-all border ${
        status === "done"
          ? "border-green-500/40 bg-green-500/10 text-green-400"
          : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
      } ${sizeClasses} ${className}`}
    >
      {status === "downloading" ? (
        <Loader2 className={`animate-spin ${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      ) : status === "done" ? (
        <Check className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      ) : (
        <Download className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
      {size !== "sm" && <span>{status === "done" ? "Saved!" : "Download"}</span>}
    </button>
  );
}