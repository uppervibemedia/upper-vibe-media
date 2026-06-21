import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, UserCircle, Palette, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AvatarSetup from "@/components/vibeworld/AvatarSetup";

/**
 * RPMAvatarCreator
 *
 * Ready Player Me requires a registered subdomain from studio.readyplayer.me.
 * Until an RPM_SUBDOMAIN is configured in this app, we fall back to the
 * built-in AvatarSetup (CSS-drawn human avatar) so the world always works.
 *
 * To enable RPM:
 *   1. Go to https://studio.readyplayer.me and create a free application.
 *   2. Copy your subdomain (e.g. "myvibespace").
 *   3. Set RPM_SUBDOMAIN below to that value.
 */

// ── Set this to your RPM subdomain to enable the real creator ──────────────
const RPM_SUBDOMAIN = ""; // e.g. "uppervibe" — leave empty to use fallback
// ───────────────────────────────────────────────────────────────────────────

const RPM_CONFIGURED = RPM_SUBDOMAIN.trim().length > 0;
const RPM_URL = RPM_CONFIGURED
  ? `https://${RPM_SUBDOMAIN.trim()}.readyplayer.me/avatar?frameApi&clearCache`
  : null;

export default function RPMAvatarCreator({ onComplete, existingUrl, existingType, existingTone }) {
  // If RPM is not configured, go straight to AvatarSetup fallback
  if (!RPM_CONFIGURED) {
    return <AvatarSetup onComplete={onComplete} existingType={existingType || null} existingTone={existingTone || null} />;
  }

  return (
    <RPMIframeCreator
      onComplete={onComplete}
      existingUrl={existingUrl}
    />
  );
}

// ── The real RPM iframe — only rendered when RPM_SUBDOMAIN is set ───────────
function RPMIframeCreator({ onComplete, existingUrl }) {
  const iframeRef = useRef(null);
  const [phase, setPhase] = useState("loading"); // loading | creating | saving | done | error
  const loadTimeoutRef = useRef(null);

  // If the iframe hasn't sent a "ready" message within 10s, show error UI
  useEffect(() => {
    loadTimeoutRef.current = setTimeout(() => {
      if (phase === "loading") {
        console.error("[RPMAvatarCreator] Timed out waiting for RPM iframe to load:", RPM_URL);
        setPhase("error");
      }
    }, 10000);
    return () => clearTimeout(loadTimeoutRef.current);
  }, []);

  // ── Subscribe to RPM postMessage events ──────────────────────
  useEffect(() => {
    function onMessage(event) {
      if (!event.origin.includes("readyplayer.me")) return;
      try {
        const json = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (json?.source === "readyplayerme" && json?.eventName === "v1.frame.ready") {
          clearTimeout(loadTimeoutRef.current);
          setPhase("creating");
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ target: "readyplayerme", type: "subscribe", eventName: "v1.**" }),
            "*"
          );
        }

        if (json?.source === "readyplayerme" && json?.eventName === "v1.avatar.exported") {
          const url = json.data?.url;
          if (url) {
            setPhase("saving");
            saveAndComplete(url);
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function saveAndComplete(url) {
    try {
      await base44.auth.updateMe({
        rpm_avatar_url: url,
        avatar_type: "rpm",
        skin_tone: "medium",
      });
    } catch (err) {
      console.error("[RPMAvatarCreator] save error:", err);
    }
    setPhase("done");
    setTimeout(() => onComplete({ rpmAvatarUrl: url, avatarType: "rpm", skinTone: "medium" }), 800);
  }

  function handleIframeError() {
    console.error("[RPMAvatarCreator] iframe failed to load:", RPM_URL);
    setPhase("error");
  }

  // ── Error state: RPM iframe failed ───────────────────────────
  if (phase === "error") {
    return (
      <div
        className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
      >
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
            <AlertCircle className="w-7 h-7" style={{ color: "#9B7EFF" }} />
          </div>
          <h2 className="font-heading font-black text-xl text-white">Avatar Creator Unavailable</h2>
          <p className="text-sm text-white/50 leading-relaxed">
            The Ready Player Me avatar creator could not load. Using the built-in Vibe World avatar instead.
          </p>
          <button
            onClick={() => onComplete({ avatarType: "neutral", skinTone: "medium" })}
            className="px-6 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{ background: "linear-gradient(135deg,#9B7EFF,#A078FF)", color: "#fff" }}
          >
            Continue with Default Avatar
          </button>
        </div>
      </div>
    );
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
          <span className="text-xs text-white/35 font-medium">Customize — then click Save</span>
        )}
        {phase === "saving" && (
          <span className="text-xs text-white/50 font-medium">Saving avatar...</span>
        )}
        {phase === "done" && (
          <span className="text-xs font-bold" style={{ color: "#00E5FF" }}>Avatar saved!</span>
        )}
      </div>

      {/* Loading overlay */}
      {phase === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
          style={{ background: "#080818" }}>
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          <p className="text-sm text-white/50 font-medium">Loading avatar creator...</p>
        </div>
      )}

      {/* Saving/done overlay */}
      {(phase === "saving" || phase === "done") && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
          style={{ background: "rgba(5,5,16,0.92)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          {phase === "saving" ? (
            <>
              <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
              <p className="text-sm font-bold text-white">Saving your avatar...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,229,255,0.15)" }}>
                <Sparkles className="w-7 h-7" style={{ color: "#00E5FF" }} />
              </div>
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
        onError={handleIframeError}
        style={{ background: "#080818" }}
      />

      <div
        className="flex items-center justify-center py-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(155,126,255,0.10)" }}
      >
        <p className="text-[10px] text-white/20 font-medium text-center">
          Powered by Ready Player Me · Your avatar stays with you across apps
        </p>
      </div>
    </div>
  );
}