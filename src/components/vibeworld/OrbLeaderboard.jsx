/**
 * OrbLeaderboard — small cyberpunk-styled panel showing top Vibe Orb collectors.
 * Shown when the player is near the Vibe Launch Zone.
 * Data comes from VibeWorldPresence.lifetime_orbs (live users) + a local cache
 * of previously seen players (persisted so scores don't disappear when they log off).
 */
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const CACHE_KEY = "vibeOrbLeaderboardCache";
const REFRESH_MS = 30_000; // re-fetch every 30s

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(map) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {}
}

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const RANK_ICONS  = ["👑", "⚡", "✦"];

export default function OrbLeaderboard({ visible, isMobile, currentUserId, currentUserOrbs, currentUsername }) {
  const [entries, setEntries] = useState([]);
  const cacheRef = useRef(loadCache());
  const fetchTimerRef = useRef(null);

  // Merge incoming active-user data with cache
  const mergeAndSort = (freshUsers) => {
    const cache = cacheRef.current;

    // Update cache with fresh data
    for (const u of freshUsers) {
      if (!u.user_id || !u.username) continue;
      const existing = cache[u.user_id];
      const orbs = u.lifetime_orbs ?? 0;
      if (!existing || orbs >= (existing.orbs ?? 0)) {
        cache[u.user_id] = { username: u.username, orbs };
      }
    }

    // Inject current user's score (always fresh from localStorage)
    if (currentUserId && currentUsername) {
      const myOrbs = currentUserOrbs ?? 0;
      const existing = cache[currentUserId];
      if (!existing || myOrbs >= (existing.orbs ?? 0)) {
        cache[currentUserId] = { username: currentUsername, orbs: myOrbs };
      }
    }

    cacheRef.current = cache;
    saveCache(cache);

    // Sort descending, top 10
    const sorted = Object.entries(cache)
      .map(([id, v]) => ({ id, username: v.username, orbs: v.orbs ?? 0 }))
      .filter(e => e.orbs > 0)
      .sort((a, b) => b.orbs - a.orbs)
      .slice(0, 6);

    setEntries(sorted);
  };

  // Fetch live presence data for orb scores
  const fetchScores = async () => {
    try {
      const users = await base44.entities.VibeWorldPresence.filter({ is_online: true });
      mergeAndSort(users);
    } catch {
      // Silently fail — use cached data
      mergeAndSort([]);
    }
  };

  // Refresh on mount and on interval
  useEffect(() => {
    fetchScores();
    fetchTimerRef.current = setInterval(fetchScores, REFRESH_MS);
    return () => clearInterval(fetchTimerRef.current);
  }, []);

  // Update own score in entries whenever it changes
  useEffect(() => {
    mergeAndSort([]);
  }, [currentUserOrbs, currentUserId]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="orb-leaderboard"
          initial={{ opacity: 0, x: 24, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed z-[62] pointer-events-none"
          style={{
            // Sit in the right side, well below the top bar and player controls
            // On mobile: pushed down further to avoid covering anything interactive
            top: isMobile ? "calc(env(safe-area-inset-top,0px) + 130px)" : "130px",
            right: isMobile ? "8px" : "14px",
            width: isMobile ? "136px" : "156px",
          }}
        >
          <div
            style={{
              background: "rgba(5,5,20,0.88)",
              border: "1px solid rgba(0,229,255,0.18)",
              borderRadius: "14px",
              backdropFilter: "blur(14px)",
              boxShadow: "0 0 24px rgba(0,184,212,0.12), 0 4px 20px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-1.5 px-3 py-2"
              style={{ borderBottom: "1px solid rgba(0,229,255,0.1)" }}
            >
              <span style={{ fontSize: "11px" }}>🏆</span>
              <span
                className="font-black tracking-wider uppercase"
                style={{ fontSize: "9px", color: "#00E5FF", letterSpacing: "0.15em" }}
              >
                Orb Leaders
              </span>
            </div>

            {/* Rows */}
            <div className="px-2 py-1.5 flex flex-col gap-0.5">
              {entries.length === 0 ? (
                <p className="text-center py-2 font-medium" style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>
                  No scores yet
                </p>
              ) : (
                entries.map((entry, idx) => {
                  const isMe = entry.id === currentUserId;
                  const rankColor = RANK_COLORS[idx] ?? "rgba(255,255,255,0.35)";
                  const rankIcon = RANK_ICONS[idx] ?? `#${idx + 1}`;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                      style={{
                        background: isMe
                          ? "rgba(0,229,255,0.08)"
                          : "rgba(255,255,255,0.025)",
                        border: isMe
                          ? "1px solid rgba(0,229,255,0.2)"
                          : "1px solid transparent",
                      }}
                    >
                      {/* Rank */}
                      <span
                        className="font-black flex-shrink-0"
                        style={{ fontSize: "9px", color: rankColor, minWidth: "14px", textAlign: "center" }}
                      >
                        {rankIcon}
                      </span>

                      {/* Username */}
                      <span
                        className="font-bold truncate flex-1"
                        style={{
                          fontSize: "9px",
                          color: isMe ? "#00E5FF" : "rgba(255,255,255,0.65)",
                          maxWidth: "80px",
                        }}
                      >
                        {isMe ? "You" : (entry.username?.split(" ")[0] ?? "Rider")}
                      </span>

                      {/* Score */}
                      <span
                        className="font-black flex-shrink-0"
                        style={{ fontSize: "9px", color: idx < 3 ? rankColor : "rgba(255,255,255,0.4)" }}
                      >
                        {entry.orbs.toLocaleString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer label */}
            <div
              className="px-3 py-1.5 text-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                LIFETIME VIBE ORBS
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}