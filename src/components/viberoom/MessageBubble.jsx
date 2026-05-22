import React from "react";
import { motion } from "framer-motion";
import { Trash2, Mic2, Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";

const REACTIONS = [
  { key: "felt_that", emoji: "⚡", label: "Felt That" },
  { key: "needed_this", emoji: "💎", label: "Needed This" },
  { key: "inspired", emoji: "🔥", label: "Inspired" },
  { key: "gratitude", emoji: "🙏", label: "Gratitude" },
];

export default function MessageBubble({ msg, isOwn, isAdmin, user, banStatus, onHide, onMute, onBan, onUnban, animDelay }) {
  const reactions = msg.reactions || {};

  // Exclusive reaction: remove from all other keys first, then toggle on clicked key
  const handleReact = async (key) => {
    if (!user) return;
    const email = user.email;

    // Build new reactions object
    const updated = {};
    REACTIONS.forEach(({ key: k }) => {
      const arr = reactions[k] || [];
      if (k === key) {
        // toggle: if already reacted on this key, remove; else add (and it's already cleared from others)
        const alreadyOnThis = arr.includes(email);
        updated[k] = alreadyOnThis ? arr.filter((e) => e !== email) : [...arr, email];
      } else {
        // always remove from other keys (exclusive)
        updated[k] = arr.filter((e) => e !== email);
      }
    });

    await base44.entities.VibeRoomMessage.update(msg.id, { reactions: updated });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(animDelay * 0.01, 0.25), duration: 0.3 }}
      className={`flex gap-2.5 items-end ${isOwn ? "flex-row-reverse" : ""}`}>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black self-end mb-0.5"
        style={{
          background: isOwn
            ? "linear-gradient(135deg,rgba(155,126,255,0.35),rgba(124,58,237,0.2))"
            : "linear-gradient(135deg,rgba(0,200,220,0.2),rgba(0,150,180,0.1))",
          border: `1px solid ${isOwn ? "rgba(155,126,255,0.4)" : "rgba(0,200,220,0.25)"}`,
          color: isOwn ? "#b899ff" : "#00C9E0",
        }}>
        {(msg.user_name || msg.user_email || "?")[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className={`max-w-[78%] group relative flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {/* Username */}
        {!isOwn && (
          <p className="text-[9px] font-bold text-white/30 mb-1 px-1">
            {msg.user_name || msg.user_email?.split("@")[0]}
          </p>
        )}

        {/* Bubble */}
        <div
          className="px-4 py-2.5 text-sm leading-relaxed"
          style={isOwn ? {
            background: "rgba(155,126,255,0.15)",
            border: "1px solid rgba(155,126,255,0.28)",
            backdropFilter: "blur(12px)",
            color: "#e8e0ff",
            borderRadius: "18px 18px 4px 18px",
            boxShadow: "0 2px 16px rgba(155,126,255,0.08)",
          } : {
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            color: "rgba(255,255,255,0.85)",
            borderRadius: "18px 18px 18px 4px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          }}>
          {msg.content}
        </div>

        {/* Reactions — always show all 4, clean and non-duplicated */}
        <div className={`flex gap-1 mt-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
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
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all active:scale-90 disabled:cursor-default"
                style={{
                  background: hasReacted
                    ? "rgba(155,126,255,0.22)"
                    : "rgba(255,255,255,0.03)",
                  border: hasReacted
                    ? "1px solid rgba(155,126,255,0.45)"
                    : "1px solid rgba(255,255,255,0.07)",
                  color: hasReacted ? "#c4aaff" : count > 0 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
                }}>
                <span style={{ fontSize: "11px" }}>{emoji}</span>
                {count > 0 && <span className="ml-0.5">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Admin moderation toolbar */}
        {isAdmin && !isOwn && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onHide(msg)} title="Remove message"
              className="p-1 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
            <button onClick={() => onMute(msg.user_email)} title="Mute user"
              className="p-1 rounded-lg text-white/25 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all">
              <Mic2 className="w-3 h-3" />
            </button>
            <button onClick={() => onBan(msg.user_email)} title="Ban user"
              className="p-1 rounded-lg text-white/25 hover:text-red-500 hover:bg-red-600/10 transition-all">
              <Ban className="w-3 h-3" />
            </button>
            {banStatus && (
              <button onClick={() => onUnban(msg.user_email)} title="Remove ban/mute"
                className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white/25 hover:text-green-400 hover:bg-green-500/10 transition-all">
                Unban
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}