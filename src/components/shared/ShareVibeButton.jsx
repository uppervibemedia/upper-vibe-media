import React, { useState } from "react";
import { Share2, X, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

/**
 * ShareVibeButton — reusable share sheet for Upper Vibe Media
 *
 * Props:
 *   type: "song" | "radio" | "viberoom" | "site"
 *   track: { title, artist_display, id }  (only for type="song")
 *   size: "sm" | "md"  (default "md")
 *   className: extra classes
 */
export default function ShareVibeButton({ type = "site", track = null, size = "md", className = "" }) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);

  const getShareData = () => {
    switch (type) {
      case "song":
        return {
          title: `${track?.title || "Upper Vibe Music"} — Upper Vibe Media`,
          text: `🎧⚡ "${track?.title || "this track"}" by ${track?.artist_display || "Upper Vibe Media"} — 432 Hz high-vibe music streaming now on Upper Vibe Media`,
          url: track?.id
            ? `https://uppervibemedia.com/song/${track.id}`
            : "https://uppervibemedia.com",
        };
      case "radio":
        return {
          title: "Upper Vibe Radio — Live Now",
          text: "🎧⚡ I'm listening live on Upper Vibe Radio — 432Hz high-vibe music streaming now",
          url: "https://uppervibemedia.com/radio",
        };
      case "viberoom":
        return {
          title: "Vibe Room — Upper Vibe Media",
          text: "🎧⚡ Join the positive 18+ Vibe Room community on Upper Vibe Media — listen together and raise the frequency",
          url: "https://uppervibemedia.com/vibe-room",
        };
      default:
        return {
          title: "Upper Vibe Media",
          text: "🎧⚡ Upper Vibe Radio — 432Hz high-vibe music streaming now on Upper Vibe Media",
          url: "https://uppervibemedia.com",
        };
    }
  };

  const shareData = getShareData();

  const handleShare = async () => {
    base44.analytics.track({ eventName: "share_button_clicked", properties: { share_type: type } });

    // Try native share sheet first (mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        base44.analytics.track({ eventName: "native_share_completed", properties: { share_type: type } });
        return;
      } catch (e) {
        // User cancelled — fall through to modal
        if (e.name === "AbortError") return;
      }
    }

    // Fallback: open our own share sheet
    setOpen(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SHARE_OPTIONS = [
    {
      label: "Copy Link",
      icon: copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />,
      action: handleCopy,
      color: "rgba(0,200,220,0.12)",
      border: "rgba(0,200,220,0.25)",
      textColor: "#00C9E0",
    },
    {
      label: "Twitter / X",
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.732-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
      action: () => {
        const tweet = encodeURIComponent(`${shareData.text} ${shareData.url}`);
        window.open(`https://twitter.com/intent/tweet?text=${tweet}`, "_blank");
        base44.analytics.track({ eventName: "share_twitter_clicked", properties: { share_type: type } });
      },
      color: "rgba(255,255,255,0.05)",
      border: "rgba(255,255,255,0.12)",
      textColor: "rgba(255,255,255,0.7)",
    },
    {
      label: "Facebook",
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`, "_blank");
        base44.analytics.track({ eventName: "share_facebook_clicked", properties: { share_type: type } });
      },
      color: "rgba(59,89,152,0.15)",
      border: "rgba(59,89,152,0.3)",
      textColor: "#6b9bd2",
    },
  ];

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const btnPadding = size === "sm" ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-xs";

  return (
    <>
      <button
        onClick={handleShare}
        className={`flex items-center gap-1.5 rounded-full font-black tracking-wide transition-all hover:brightness-115 active:scale-95 ${btnPadding} ${className}`}
        style={{
          background: "rgba(155,126,255,0.1)",
          border: "1px solid rgba(155,126,255,0.25)",
          color: "#c4aaff",
        }}
      >
        <Share2 className={iconSize} />
        Share
      </button>

      {/* Fallback share sheet modal */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
                border: "1px solid rgba(155,126,255,0.2)",
                boxShadow: "0 0 60px rgba(155,126,255,0.15), 0 24px 80px rgba(0,0,0,0.7)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p className="font-heading font-black text-white text-base">Share The Vibe ⚡</p>
                  <p className="text-xs text-white/35 mt-0.5 truncate max-w-[220px]">{shareData.url}</p>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Share card preview */}
              <div className="mx-5 my-4 rounded-2xl p-4"
                style={{
                  background: "linear-gradient(135deg,rgba(0,200,220,0.08),rgba(155,126,255,0.06))",
                  border: "1px solid rgba(0,200,220,0.15)",
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#00B8D4,#9B7EFF)" }}>
                    <span className="text-[8px] font-black text-white">UV</span>
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-cyan-400/70">Upper Vibe Media</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{shareData.text}</p>
                <p className="text-[10px] text-white/30 mt-2">{shareData.url}</p>
              </div>

              {/* Share options */}
              <div className="px-5 pb-5 flex flex-col gap-2">
                {SHARE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => { opt.action(); if (opt.label !== "Copy Link") setOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-bold text-sm transition-all hover:brightness-115 active:scale-[0.98]"
                    style={{
                      background: opt.color,
                      border: `1px solid ${opt.border}`,
                      color: opt.textColor,
                    }}
                  >
                    {opt.icon}
                    {opt.label === "Copy Link" && copied ? "Copied!" : opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}