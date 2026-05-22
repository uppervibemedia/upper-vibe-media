import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Mic2, Ban, Flag, Music2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VibeAvatar from "./VibeAvatar";
import UserProfileCard from "./UserProfileCard";

const REACTIONS = [
  { key: "felt_that",   emoji: "⚡", label: "Felt That" },
  { key: "needed_this", emoji: "💎", label: "Needed This" },
  { key: "inspired",    emoji: "🔥", label: "Inspired" },
  { key: "gratitude",   emoji: "🙏", label: "Gratitude" },
];

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch (_) { return ""; }
}

export default function MessageBubble({ msg, isOwn, isAdmin, user, banStatus, onHide, onMute, onBan, onUnban, animDelay, onReactionLoginRequired }) {
  const reactions = msg.reactions || {};
  const [showProfile, setShowProfile] = useState(false);
  const [showModMenu, setShowModMenu] = useState(false);

  // Exclusive reaction: one per user across all types (free + premium can react)
  const handleReact = async (key) => {
    if (!user) {
      if (onReactionLoginRequired) onReactionLoginRequired();
      base44.analytics.track({ eventName: "vibe_room_free_reaction_clicked" });
      return;
    }
    base44.analytics.track({ eventName: "vibe_room_free_reaction_clicked" });
    const email = user.email;
    const updated = {};
    REACTIONS.forEach(({ key: k }) => {
      const arr = reactions[k] || [];
      if (k === key) {
        const alreadyOnThis = arr.includes(email);
        updated[k] = alreadyOnThis ? arr.filter((e) => e !== email) : [...arr, email];
      } else {
        updated[k] = arr.filter((e) => e !== email);
      }
    });
    await base44.entities.VibeRoomMessage.update(msg.id, { reactions: updated });
  };

  const handleReport = async () => {
    if (!user) return;
    const reportedBy = msg.reported_by || [];
    if (reportedBy.includes(user.email)) return; // already reported
    await base44.entities.VibeRoomMessage.update(msg.id, {
      report_count: (msg.report_count || 0) + 1,
      reported_by: [...reportedBy, user.email],
    });
    setShowModMenu(false);
  };

  const senderName = msg.user_name || msg.user_email?.split("@")[0] || "Vibe";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(animDelay * 0.008, 0.2), duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>

        {/* Avatar — tappable to show profile */}
        <div className="flex-shrink-0 self-end mb-1">
          <VibeAvatar
            name={senderName}
            avatarUrl={msg.user_avatar_url}
            size={34}
            onClick={() => setShowProfile(true)}
          />
        </div>

        {/* Message column */}
        <div className={`max-w-[75%] flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>

          {/* Username + time + listening badge */}
          <div className={`flex items-center gap-1.5 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
            {!isOwn && (
              <span className="text-[10px] font-bold text-white/40">{senderName}</span>
            )}
            {msg.is_listening && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-wide"
                style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                <Music2 style={{ width: 7, height: 7 }} /> LISTENING
              </span>
            )}
            <span className="text-[9px] text-white/20">{formatTime(msg.created_date)}</span>
          </div>

          {/* Bubble */}
          <div
            className="px-4 py-2.5 text-sm leading-relaxed relative"
            style={isOwn ? {
              background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(155,126,255,0.12))",
              border: "1px solid rgba(155,126,255,0.3)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "#ede8ff",
              borderRadius: "18px 18px 4px 18px",
              boxShadow: "0 2px 20px rgba(155,126,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.04)",
            } : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "rgba(255,255,255,0.88)",
              borderRadius: "18px 18px 18px 4px",
              boxShadow: "0 2px 14px rgba(0,0,0,0.25)",
            }}>
            {msg.content}
          </div>

          {/* Reactions — always 4 buttons */}
          <div className={`flex gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {REACTIONS.map(({ key, emoji, label }) => {
              const arr = reactions[key] || [];
              const hasReacted = user ? arr.includes(user.email) : false;
              const count = arr.length;
              return (
                <button
                  key={key}
                  onClick={() => handleReact(key)}
                  title={label}
                  disabled={!user}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all active:scale-90 disabled:cursor-default select-none"
                  style={{
                    background: hasReacted ? "rgba(155,126,255,0.2)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${hasReacted ? "rgba(155,126,255,0.45)" : "rgba(255,255,255,0.07)"}`,
                    color: hasReacted ? "#c4aaff" : count > 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
                    transition: "all 0.15s ease",
                  }}>
                  <span style={{ fontSize: "11px" }}>{emoji}</span>
                  {count > 0 && <span className="ml-0.5 tabular-nums">{count}</span>}
                </button>
              );
            })}

            {/* Report (regular users) — small quiet button */}
            {!isOwn && user && !isAdmin && (
              <button
                onClick={handleReport}
                title="Report message"
                className="flex items-center px-1.5 py-0.5 rounded-full text-[10px] transition-all active:scale-90 opacity-0 group-hover:opacity-100 hover:text-orange-400"
                style={{ color: "rgba(255,255,255,0.15)" }}>
                <Flag className="w-2.5 h-2.5" />
              </button>
            )}

            {/* Admin moderation menu */}
            {!isOwn && isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowModMenu((v) => !v)}
                  className="flex items-center px-1.5 py-0.5 rounded-full text-[10px] transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                  style={{ color: "rgba(255,255,255,0.15)" }}
                  title="Moderate">
                  <span style={{ fontSize: "11px" }}>···</span>
                </button>
                {showModMenu && (
                  <div
                    className="absolute bottom-full mb-1 left-0 z-20 rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(12,12,28,0.98)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      backdropFilter: "blur(20px)",
                      minWidth: 120,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                    <button
                      onClick={handleReport}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-orange-400 hover:bg-orange-500/10 transition-all">
                      <Flag className="w-3 h-3" /> Report
                    </button>
                    <button onClick={() => { onHide(msg); setShowModMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                    <button onClick={() => { onMute(msg.user_email); setShowModMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all">
                      <Mic2 className="w-3 h-3" /> Mute
                    </button>
                    <button onClick={() => { onBan(msg.user_email); setShowModMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-red-500 hover:bg-red-600/10 transition-all">
                      <Ban className="w-3 h-3" /> Ban
                    </button>
                    {banStatus && (
                      <button onClick={() => { onUnban(msg.user_email); setShowModMenu(false); }}
                        className="flex items-center gap-2 px-3 py-2 w-full text-xs text-white/50 hover:text-green-400 hover:bg-green-500/10 transition-all">
                        ✓ Unban
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Profile card popup */}
      {showProfile && (
        <UserProfileCard
          profile={{
            name: senderName,
            avatarUrl: msg.user_avatar_url,
            joinDate: msg.created_date,
            favoriteEmoji: null,
          }}
          currentlyPlaying={msg.is_listening ? msg.now_playing_title : null}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
}