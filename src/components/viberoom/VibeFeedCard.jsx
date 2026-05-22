import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Trash2, Mic2, Ban, Flag, Music2, Pin, PinOff, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VibeAvatar from "@/components/viberoom/VibeAvatar";

const REACTIONS = [
  { key: "felt_that",   emoji: "⚡", label: "Felt That" },
  { key: "needed_this", emoji: "💎", label: "Needed This" },
  { key: "inspired",    emoji: "🔥", label: "Inspired" },
  { key: "gratitude",   emoji: "🙏", label: "Gratitude" },
];

function formatTimeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function VibeFeedCard({
  post, isOwn, isAdmin, user, banStatus,
  onHide, onMute, onBan, onUnban, onPin,
  animDelay, onPlayTrack, onLoginRequired,
}) {
  const reactions = post.reactions || {};
  const [showMenu, setShowMenu] = useState(false);
  const senderName = post.user_name || post.user_email?.split("@")[0] || "Vibe";
  const isPinned = post.is_pinned;

  const handleReact = async (key) => {
    if (!user) { onLoginRequired?.(); return; }
    base44.analytics.track({ eventName: "vibe_post_reacted" });
    const email = user.email;
    const updated = {};
    REACTIONS.forEach(({ key: k }) => {
      const arr = reactions[k] || [];
      if (k === key) {
        updated[k] = arr.includes(email) ? arr.filter(e => e !== email) : [...arr, email];
      } else {
        updated[k] = arr.filter(e => e !== email);
      }
    });
    await base44.entities.VibeRoomMessage.update(post.id, { reactions: updated });
  };

  const handleReport = async () => {
    if (!user) return;
    const reportedBy = post.reported_by || [];
    if (reportedBy.includes(user.email)) return;
    base44.analytics.track({ eventName: "vibe_post_reported" });
    await base44.entities.VibeRoomMessage.update(post.id, {
      report_count: (post.report_count || 0) + 1,
      reported_by: [...reportedBy, user.email],
    });
    setShowMenu(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(animDelay * 0.06, 0.4), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: isPinned
          ? "linear-gradient(135deg,rgba(212,168,67,0.08),rgba(212,168,67,0.03))"
          : "rgba(255,255,255,0.03)",
        border: isPinned
          ? "1px solid rgba(212,168,67,0.28)"
          : "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>

      {/* Featured of the Day banner */}
      {isPinned && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
          <Star className="w-3 h-3 text-yellow-400/80" fill="currentColor" />
          <span className="text-[9px] font-black tracking-[0.3em] uppercase text-yellow-400/70">
            Featured Vibe of the Day
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Header row: avatar + name + time + menu */}
        <div className="flex items-start gap-3 mb-3">
          <VibeAvatar name={senderName} avatarUrl={post.user_avatar_url} size={38} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground/90">{senderName}</span>
              {post.is_listening && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-wide"
                  style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                  <Music2 style={{ width: 7, height: 7 }} /> LISTENING
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/50">{formatTimeAgo(post.created_date)}</span>
          </div>

          {/* Options menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-white/5 transition-all text-lg leading-none"
              aria-label="Options">
              ···
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-1 z-30 rounded-xl overflow-hidden min-w-[130px]"
                style={{ background: "rgba(12,12,28,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                {user && !isOwn && (
                  <button onClick={handleReport}
                    className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-orange-400 hover:bg-orange-500/10 transition-all">
                    <Flag className="w-3 h-3" /> Report
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button onClick={() => { onHide(post); setShowMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                    <button onClick={() => { onPin(post); setShowMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all">
                      {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                      {isPinned ? "Unpin" : "Pin as Featured"}
                    </button>
                    <button onClick={() => { onMute(post.user_email); setShowMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all">
                      <Mic2 className="w-3 h-3" /> Mute User
                    </button>
                    <button onClick={() => { onBan(post.user_email); setShowMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-red-500 hover:bg-red-600/10 transition-all">
                      <Ban className="w-3 h-3" /> Ban User
                    </button>
                    {banStatus && (
                      <button onClick={() => { onUnban(post.user_email); setShowMenu(false); }}
                        className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-green-400 hover:bg-green-500/10 transition-all">
                        ✓ Unban
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Thought text */}
        {post.content && (
          <p className="text-sm leading-relaxed text-foreground/85 mb-3">{post.content}</p>
        )}

        {/* Track share card */}
        {post.post_type === "track_share" && post.track_title && (
          <div className="flex items-center gap-3 rounded-xl p-3 mb-3"
            style={{ background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.15)" }}>
            {post.track_cover_url ? (
              <img src={post.track_cover_url} alt={post.track_title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(155,126,255,0.15)" }}>
                <Music2 className="w-5 h-5 text-purple-400/60" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground/90 truncate">{post.track_title}</p>
              <p className="text-xs text-muted-foreground/60 truncate">{post.track_artist}</p>
              {post.track_frequency_type && post.track_frequency_type !== "standard" && (
                <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-full mt-1 inline-block"
                  style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                  {post.track_frequency_type.toUpperCase()}
                </span>
              )}
            </div>
            {post.track_id && (
              <button
                onClick={() => { onPlayTrack?.(post); base44.analytics.track({ eventName: "now_vibing_track_played" }); }}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#7C3AED,#9B7EFF)", boxShadow: "0 0 18px rgba(155,126,255,0.4)" }}>
                <Play className="w-4 h-4 text-white" fill="white" />
              </button>
            )}
          </div>
        )}

        {/* Reactions row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {REACTIONS.map(({ key, emoji, label }) => {
            const arr = reactions[key] || [];
            const hasReacted = user ? arr.includes(user.email) : false;
            const count = arr.length;
            return (
              <button
                key={key}
                onClick={() => handleReact(key)}
                title={label}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all active:scale-90 select-none"
                style={{
                  background: hasReacted ? "rgba(155,126,255,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${hasReacted ? "rgba(155,126,255,0.45)" : "rgba(255,255,255,0.08)"}`,
                  color: hasReacted ? "#c4aaff" : count > 0 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
                  transition: "all 0.15s ease",
                }}>
                <span style={{ fontSize: "12px" }}>{emoji}</span>
                {count > 0 && <span className="tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}