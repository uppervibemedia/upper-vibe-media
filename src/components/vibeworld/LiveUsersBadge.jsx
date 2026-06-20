/**
 * LiveUsersBadge — Phase 1 presence indicator for Vibe World.
 *
 * Shows:
 *  - Live user count badge (always visible)
 *  - Expandable list of usernames + zones (tap to toggle)
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X } from "lucide-react";

export default function LiveUsersBadge({ activeUsers, userCount, isBroadcasting, isMobile }) {
  const [expanded, setExpanded] = useState(false);

  const hapticTap = () => { try { navigator?.vibrate?.(10); } catch {} };

  const handleToggle = useCallback(() => {
    hapticTap();
    setExpanded((p) => !p);
  }, []);

  if (!isBroadcasting) return null;

  const hasUsers = userCount > 0;

  return (
    <>
      {/* Badge */}
      <button
        onClick={handleToggle}
        onTouchStart={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-bold text-[10px] tracking-wider transition-all active:scale-95"
        style={{
          background: hasUsers
            ? "rgba(0,229,255,0.15)"
            : "rgba(255,255,255,0.06)",
          border: hasUsers
            ? "1px solid rgba(0,229,255,0.3)"
            : "1px solid rgba(255,255,255,0.1)",
          color: hasUsers ? "rgba(0,229,255,0.9)" : "rgba(255,255,255,0.4)",
          minHeight: "32px",
          touchAction: "manipulation",
          pointerEvents: "auto",
        }}
      >
        <Users className="w-3 h-3" />
        <span>{userCount} online</span>
      </button>

      {/* Expanded list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-56 max-h-56 overflow-y-auto rounded-xl"
            style={{
              background: "rgba(10,8,24,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              pointerEvents: "auto",
              zIndex: 58,
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] font-black tracking-wider text-white/60">
                LIVE IN VIBE CITY
              </span>
              <button
                onClick={handleToggle}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                  touchAction: "manipulation",
                }}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>

            {hasUsers ? (
              <div className="py-1">
                {activeUsers.map((u) => (
                  <div
                    key={u.user_id || u.id}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#00E5FF", boxShadow: "0 0 6px rgba(0,229,255,0.5)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white/80 truncate">
                        {u.username || "Anonymous"}
                      </p>
                      {u.current_zone && (
                        <p className="text-[9px] text-white/30 truncate">
                          {u.current_zone}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-[10px] text-white/30">You're the only one here</p>
                <p className="text-[9px] text-white/15 mt-1">Invite friends to hang out</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}