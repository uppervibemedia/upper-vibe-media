import React, { useState, useRef } from "react";
import { Send, Music2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VibeAvatar from "@/components/viberoom/VibeAvatar";

export default function VibeComposer({
  user, vibeName, vibeAvatar,
  currentTrack, isPlaying,
  isBanned, isMuted,
  onNeedsVibeName, onUpgradeRequired,
  onPosted,
}) {
  const [thought, setThought] = useState("");
  const [attachTrack, setAttachTrack] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const MAX = 280;
  const remaining = MAX - thought.length;

  const canPost = !isBanned && !isMuted;
  const hasTrack = !!currentTrack;
  const willAttachTrack = attachTrack && hasTrack;
  const canSend = canPost && (thought.trim().length > 0 || willAttachTrack) && !sending;

  const handlePost = async () => {
    if (!canSend) return;
    if (!vibeName) { onNeedsVibeName?.(); return; }

    setSending(true);
    const post_type = willAttachTrack ? "track_share" : "thought";
    const payload = {
      user_email: user?.email || "guest@vibe.room",
      user_name: vibeName,
      user_avatar_url: vibeAvatar || null,
      post_type,
      content: thought.trim() || null,
      is_listening: !!(currentTrack && isPlaying),
      now_playing_title: currentTrack?.title || null,
      reactions: { felt_that: [], needed_this: [], inspired: [], gratitude: [] },
      is_hidden: false,
      is_pinned: false,
    };

    if (willAttachTrack) {
      payload.track_id = currentTrack.id;
      payload.track_title = currentTrack.title;
      payload.track_artist = currentTrack.artist_display || "Upper Vibe Media";
      payload.track_cover_url = currentTrack.cover_url || null;
      payload.track_frequency_type = currentTrack.frequency_type || null;
    }

    await base44.entities.VibeRoomMessage.create(payload);

    base44.analytics.track({
      eventName: willAttachTrack ? "vibe_track_shared" : "vibe_thought_posted"
    });

    setThought("");
    setAttachTrack(false);
    setSending(false);
    onPosted?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(6,6,18,0.97)",
        border: "1px solid rgba(155,126,255,0.2)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        boxShadow: "0 0 28px rgba(155,126,255,0.07), 0 12px 40px rgba(0,0,0,0.55)",
      }}>

      {/* Top: avatar + textarea */}
      <div className="flex gap-3 p-4 pb-2">
        <div className="flex-shrink-0 mt-0.5">
          <VibeAvatar name={vibeName || "?"} avatarUrl={vibeAvatar} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            ref={inputRef}
            value={thought}
            onChange={e => setThought(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            placeholder="What is this song making you feel?"
            rows={2}
            disabled={!canPost}
            className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
            style={{ minHeight: 44 }}
          />
        </div>
      </div>

      {/* Attach track pill */}
      {hasTrack && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setAttachTrack(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
            style={{
              background: attachTrack ? "rgba(155,126,255,0.18)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${attachTrack ? "rgba(155,126,255,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: attachTrack ? "#c4aaff" : "rgba(255,255,255,0.35)",
              transition: "all 0.15s ease",
            }}>
            <Music2 className="w-3 h-3" />
            {attachTrack ? (
              <span className="flex items-center gap-1">
                Sharing: <span className="font-black truncate max-w-[120px]">{currentTrack?.title}</span>
                <X className="w-3 h-3 ml-0.5 opacity-60" />
              </span>
            ) : (
              <span>Share This Vibe <span className="opacity-60 ml-1 truncate max-w-[120px]">· {currentTrack?.title}</span></span>
            )}
          </button>
        </div>
      )}

      {/* Bottom: char count + send */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-white/[0.04]">
        <span className={`text-[10px] tabular-nums transition-colors ${remaining < 30 ? "text-red-400/70" : "text-white/15"}`}>
          {remaining}
        </span>
        <button
          onClick={handlePost}
          disabled={!canSend}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all active:scale-95 disabled:opacity-30"
          style={{
            background: canSend ? "linear-gradient(135deg,#7C3AED,#9B7EFF)" : "rgba(155,126,255,0.08)",
            boxShadow: canSend ? "0 0 16px rgba(155,126,255,0.35)" : "none",
            color: "#fff",
            transition: "all 0.2s ease",
          }}>
          {sending ? (
            <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          Post
        </button>
      </div>
    </div>
  );
}