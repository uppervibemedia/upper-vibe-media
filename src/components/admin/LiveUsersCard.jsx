/**
 * LiveUsersCard — shows real-time count of active non-admin visitors.
 * Polls every 15 seconds. A visitor is "live" if last_seen is within 90 seconds.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";

const LIVE_WINDOW_MS  = 90_000;  // 90 seconds
const POLL_INTERVAL   = 15_000;  // 15 seconds

// Map legacy/removed page paths to a clear label
function sanitizePageLabel(path, label) {
  if (!path) return label || "Unknown";
  if (path.includes("vibe-room") || path.includes("vibe_room")) return "Legacy / Removed Page";
  return label || path;
}

export default function LiveUsersCard() {
  const [liveCount,    setLiveCount]    = useState(null);
  const [pageBreakdown, setPageBreakdown] = useState([]);
  const [lastUpdated,  setLastUpdated]  = useState(null);

  const refresh = useCallback(async () => {
    try {
      // Fetch all presence records updated in the last 5 minutes (wide window for safety)
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const records = await base44.entities.LivePresence.filter(
        { is_admin: false },
        "-last_seen",
        200
      );

      const now = Date.now();
      // Filter to genuinely live (within 90s) non-admin records
      const live = records.filter(r => {
        if (r.is_admin) return false;
        if (!r.last_seen) return false;
        return now - new Date(r.last_seen).getTime() <= LIVE_WINDOW_MS;
      });

      // De-duplicate by visitor_id — one person = one count regardless of tabs
      const uniqueVisitors = new Map(); // visitor_id → most-recent record
      live.forEach(r => {
        const existing = uniqueVisitors.get(r.visitor_id);
        if (!existing || r.last_seen > existing.last_seen) {
          uniqueVisitors.set(r.visitor_id, r);
        }
      });

      setLiveCount(uniqueVisitors.size);

      // Page breakdown — count unique visitors per page
      const pageMap = {};
      uniqueVisitors.forEach(r => {
        const label = sanitizePageLabel(r.page_path, r.page_label);
        pageMap[label] = (pageMap[label] || 0) + 1;
      });
      const breakdown = Object.entries(pageMap)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count);

      setPageBreakdown(breakdown);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn("[LiveUsersCard] fetch error:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [refresh]);

  const dotColor = liveCount > 0 ? "#ef4444" : "rgba(255,255,255,0.2)";

  return (
    <div className="rounded-2xl p-5 col-span-2"
      style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <Radio className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ opacity: liveCount > 0 ? [1, 0.3, 1] : 1 }}
                transition={{ duration: 1.5, repeat: liveCount > 0 ? Infinity : 0 }}
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: dotColor }} />
              <p className="text-2xl font-heading font-black text-white">
                {liveCount === null ? "—" : liveCount}
              </p>
            </div>
            <p className="text-xs text-white/40">Live Users Now</p>
            <p className="text-[10px] text-white/20 mt-0.5">non-admin · active within 90s · unique visitors</p>
          </div>
        </div>
        <div className="text-[10px] text-white/20">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading…"}
          <span className="ml-2 text-white/15">· auto-refreshes every 15s</span>
        </div>
      </div>

      {/* Page breakdown */}
      {pageBreakdown.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/25 mb-2.5">
            Active Pages
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <AnimatePresence>
              {pageBreakdown.map(({ page, count }) => (
                <motion.div
                  key={page}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: page === "Legacy / Removed Page"
                      ? "rgba(255,200,0,0.06)"
                      : "rgba(239,68,68,0.06)",
                    border: page === "Legacy / Removed Page"
                      ? "1px solid rgba(255,200,0,0.15)"
                      : "1px solid rgba(239,68,68,0.12)",
                  }}>
                  <p className="text-[11px] text-white/60 truncate">{page}</p>
                  <span className="text-[11px] font-black text-white/80 flex-shrink-0">{count}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {liveCount === 0 && (
        <p className="text-xs text-white/20 mt-1">No active visitors right now.</p>
      )}
    </div>
  );
}