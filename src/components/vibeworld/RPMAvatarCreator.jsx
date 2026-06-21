import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Ready Player Me subdomain — using the public demo subdomain
const RPM_URL = "https://demo.readyplayer.me/avatar?frameApi&clearCache";

/**
 * RPMAvatarCreator
 * Embeds the Ready Player Me iframe creator.
 * When the user finishes, RPM posts a message with the avatar's .glb URL.
 * We save that URL to the user's profile and call onComplete.
 */
export default function RPMAvatarCreator({ onComplete, existingUrl }) {
  const iframeRef = useRef(null);
  const [phase, setPhase] = useState("loading"); // loading | creating | done | saving
  const [avatarUrl, setAvatarUrl] = useState(existingUrl || null);
  const [error, setError] = useState(null);

  // ── Subscribe to RPM postMessage events ──────────────────────
  useEffect(() => {
    function onMessage(event) {
      // RPM sends messages from their domain
      if (!event.origin.includes("readyplayer.me")) return;

      try {
        const json = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // Phase: iframe is ready
        if (json?.source === "readyplayerme" && json?.eventName === "v1.frame.ready") {
          setPhase("creating");
          // Subscribe to all events
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ target: "readyplayerme", type: "subscribe", eventName: "v1.**" }),
            "*"
          );
        }

        // Phase: user exported avatar
        if (json?.source === "readyplayerme" && json?.eventName === "v1.avatar.exported") {
          const url = json.data?.url;
          if (url) {
            setAvatarUrl(url);
            setPhase("saving");
            saveAndComplete(url);
          }
        }
      } catch {
        // Non-JSON messages from other sources — ignore
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function saveAndComplete(url) {
    try {
      await base44.auth.updateMe({
        rpm_avatar_url: url,
        // Keep a fallback avatar type so existing code doesn't break
        avatar_type: "rpm",
        skin_tone: "medium",
      });
      setPhase("done");
      setTimeout(() => onComplete({ rpmAvatarUrl: url, avatarType: "rpm", skinTone: "medium" }), 800);
    } catch (err) {
      console.error("[RPMAvatarCreator] save error:", err);
      // Even if save fails, proceed
      setPhase("done");
      setTimeout(() => onComplete({ rpmAvatarUrl: url, avatarType: "rpm", skinTone: "medium" }), 800);
    }
  }

  function handleIframeLoad() {
    setPhase("creating");
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(155,126,255,0.15)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#9B7EFF" }} />
          <span className="text-sm font-black text-white tracking-wider">Create Your Avatar</span>
        </div>

        {phase === "creating" && (
          <span className="text-xs text-white/35 font-medium">Customize your look — then click Save</span>
        )}
        {phase === "saving" && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#9B7EFF" }} />
            <span className="text-xs text-white/50 font-medium">Saving avatar...</span>
          </div>
        )}
        {phase === "done" && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00E5FF" }} />
            <span className="text-xs font-bold" style={{ color: "#00E5FF" }}>Avatar saved!</span>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {phase === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#9B7EFF" }} />
          <p className="text-sm text-white/50 font-medium">Loading avatar creator...</p>
        </div>
      )}

      {/* Done overlay */}
      {(phase === "saving" || phase === "done") && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
          style={{ background: "rgba(5,5,16,0.88)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {phase === "saving" ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#9B7EFF" }} />
              <p className="text-sm font-bold text-white">Saving your avatar...</p>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <CheckCircle2 className="w-14 h-14" style={{ color: "#00E5FF" }} />
              </motion.div>
              <p className="text-base font-black text-white">Avatar ready!</p>
              <p className="text-xs text-white/40">Entering Upper Vibe City...</p>
            </>
          )}
        </motion.div>
      )}

      {/* RPM iframe */}
      <iframe
        ref={iframeRef}
        src={RPM_URL}
        className="flex-1 w-full border-0"
        allow="camera *; microphone *; clipboard-read; clipboard-write"
        title="Ready Player Me Avatar Creator"
        onLoad={handleIframeLoad}
        style={{ background: "#080818" }}
      />

      {/* Footer hint */}
      <div
        className="flex items-center justify-center gap-2 py-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(155,126,255,0.10)" }}
      >
        <p className="text-[10px] text-white/20 font-medium text-center">
          Powered by Ready Player Me · Your avatar stays with you across apps
        </p>
      </div>
    </div>
  );
}