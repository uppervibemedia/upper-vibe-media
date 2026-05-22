import React, { useState } from "react";
import { Share2, X, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

/**
 * ShareVibeButton — reusable share sheet for Upper Vibe Media
 *
 * Props:
 *   type: "song" | "radio" | "viberoom" | "site"
 *   track: { title, artist_display, id, cover_url }  (only for type="song")
 *   size: "sm" | "md"  (default "md")
 *   className: extra classes
 *
 * SOCIAL SHARING STRATEGY:
 * Facebook/iMessage/Twitter crawlers cannot execute JavaScript, so they
 * see only the blank SPA shell at /song/<id> and show the generic homepage preview.
 * Fix: share the ogMeta backend URL which returns server-side HTML with full OG tags
 * + an instant JS redirect to the real song page for human visitors.
 * The og:url inside that HTML points to the canonical /song/<id> so Facebook
 * still shows uppervibemedia.com as the domain in the preview.
 */

// Base44 backend function public URL — ogMeta returns server-rendered OG HTML
// with a meta-refresh redirect to the real SPA page for human visitors.
function getSongShareUrl(trackId) {
  if (!trackId) return "https://uppervibemedia.com";
  // The ogMeta function URL — Base44 exposes functions at /api/<functionName>
  // relative to the app's public domain.
  const base = typeof window !== "undefined"
    ? `${window.location.origin}/api/ogMeta`
    : "https://uppervibemedia.com/api/ogMeta";
  return `${base}?type=track&id=${trackId}`;
}

export default function ShareVibeButton({ type = "site", track = null, size = "md", className = "" }) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);

  // Canonical display URL (shown in UI, used for copy)
  const canonicalSongUrl = track?.id ? `https://uppervibemedia.com/song/${track.id}` : "https://uppervibemedia.com";

  const getShareData = () => {
    switch (type) {
      case "song":
        return {
          title: track?.title && track?.artist_display
            ? `${track.title} by ${track.artist_display}`
            : `${track?.title || "Upper Vibe Music"} | Upper Vibe Media`,
          text: `🎧⚡ "${track?.title || "this track"}" by ${track?.artist_display || "Upper Vibe Media"} • Listening live on Upper Vibe Media`,
          // Share the ogMeta URL so Facebook/crawlers get server-side OG tags.
          // Human visitors clicking from Facebook get instantly redirected to /song/<id>.
          url: getSongShareUrl(track?.id),
          // Display URL shown in the UI (not the ogMeta redirect URL)
          displayUrl: canonicalSongUrl,
        };
      case "radio":
        return {
          title: "Upper Vibe Radio — Live Now",
          text: "🎧⚡ I'm listening live on Upper Vibe Radio — 432Hz high-vibe music streaming now",
          url: "https://uppervibemedia.com/radio",
          displayUrl: "https://uppervibemedia.com/radio",
        };
      case "viberoom":
        return {
          title: "Vibe Room — Upper Vibe Media",
          text: "🎧⚡ Join the positive 18+ Vibe Room community on Upper Vibe Media — listen together and raise the frequency",
          url: "https://uppervibemedia.com/vibe-room",
          displayUrl: "https://uppervibemedia.com/vibe-room",
        };
      default:
        return {
          title: "Upper Vibe Media",
          text: "🎧⚡ Upper Vibe Radio — 432Hz high-vibe music streaming now on Upper Vibe Media",
          url: "https://uppervibemedia.com",
          displayUrl: "https://uppervibemedia.com",
        };
    }
  };

  const shareData = getShareData();

  const handleShare = async () => {
    base44.analytics.track({ eventName: "share_button_clicked", properties: { share_type: type } });

    // Try native share sheet first (mobile — best for iOS)
    if (navigator.share) {
      try {
        await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
        base44.analytics.track({ eventName: "native_share_completed", properties: { share_type: type } });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }

    // Fallback: our custom bottom sheet
    setOpen(true);
  };

  const handleCopy = async () => {
    // Copy the clean canonical URL, not the ogMeta redirect URL
    await navigator.clipboard.writeText(shareData.displayUrl || shareData.url);
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
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.732-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: () => {
        const tweet = encodeURIComponent(`${shareData.text} ${shareData.displayUrl || shareData.url}`);
        window.open(`https://twitter.com/intent/tweet?text=${tweet}`, "_blank");
        base44.analytics.track({ eventName: "share_twitter_clicked", properties: { share_type: type } });
      },
      color: "rgba(255,255,255,0.05)",
      border: "rgba(255,255,255,0.12)",
      textColor: "rgba(255,255,255,0.7)",
    },
    {
      label: "Facebook",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      action: () => {
        // Pass the ogMeta URL — Facebook's crawler will fetch it and get real OG tags.
        // og:url inside that response points to the canonical song page.
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`, "_blank");
        base44.analytics.track({ eventName: "share_facebook_clicked", properties: { share_type: type } });
      },
      color: "rgba(59,89,152,0.15)",
      border: "rgba(59,89,152,0.3)",
      textColor: "#6b9bd2",
    },
  ];

  const iconSize   = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
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

      {/* iOS/PWA-safe bottom sheet modal */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Sheet — slides up from bottom, safe-area aware */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="relative w-full max-w-lg overflow-hidden"
              style={{
                background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
                border: "1px solid rgba(155,126,255,0.2)",
                borderBottom: "none",
                borderRadius: "24px 24px 0 0",
                boxShadow: "0 -8px 60px rgba(155,126,255,0.15), 0 -2px 40px rgba(0,0,0,0.7)",
                // Safe area: leave room for home indicator
                paddingBottom: "env(safe-area-inset-bottom, 16px)",
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 pb-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-heading font-black text-white text-base">Share The Vibe ⚡</p>
                  <p className="text-[11px] text-white/30 mt-0.5 truncate">{shareData.displayUrl || shareData.url}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Song preview card — with artwork if available */}
              {type === "song" && (
                <div className="mx-4 mt-4 rounded-2xl overflow-hidden flex gap-3 p-3"
                  style={{
                    background: "linear-gradient(135deg,rgba(0,200,220,0.07),rgba(155,126,255,0.05))",
                    border: "1px solid rgba(0,200,220,0.15)",
                  }}>
                  {track?.cover_url ? (
                    <img
                      src={track.cover_url}
                      alt={track?.title}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      style={{ boxShadow: "0 0 16px rgba(0,229,255,0.2)" }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}>
                      <span className="text-xl">🎧</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-black text-white truncate leading-snug">{track?.title}</p>
                    <p className="text-[11px] text-white/40 truncate mt-0.5">{track?.artist_display || "Upper Vibe Media"}</p>
                    <p className="text-[10px] text-cyan-400/60 mt-1 font-semibold">Listening live on Upper Vibe Media</p>
                  </div>
                </div>
              )}

              {/* Non-song preview */}
              {type !== "song" && (
                <div className="mx-4 mt-4 rounded-2xl p-3"
                  style={{
                    background: "linear-gradient(135deg,rgba(0,200,220,0.07),rgba(155,126,255,0.05))",
                    border: "1px solid rgba(0,200,220,0.15)",
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#00B8D4,#9B7EFF)" }}>
                      <span className="text-[7px] font-black text-white">UV</span>
                    </div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-cyan-400/70">Upper Vibe Media</span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">{shareData.text}</p>
                </div>
              )}

              {/* Share options */}
              <div className="px-4 pt-3 pb-4 flex flex-col gap-2.5">
                {SHARE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => { opt.action(); if (opt.label !== "Copy Link") setOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                    style={{
                      background: opt.color,
                      border: `1px solid ${opt.border}`,
                      color: opt.textColor,
                      minHeight: 48, // Apple HIG minimum tap target
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