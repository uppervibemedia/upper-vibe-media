/**
 * LiveUsersCard — real-time count of active non-admin visitors.
 * Polls every 5 seconds. A visitor is "live" if last_seen is within 30 seconds.
 * Deduped by persistent visitor_id (not session).
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, ChevronDown, ChevronUp, Bug } from "lucide-react";
import { base44 } from "@/api/base44Client";

const LIVE_WINDOW_MS = 30_000;   // 30 seconds
const POLL_INTERVAL  = 15_000;   // 15 seconds — avoid rate limits

function sanitizePageLabel(path, label) {
  if (!path) return label || "Unknown";
  if (path.includes("vibe-room") || path.includes("vibe_room")) return "Legacy / Removed Page";
  return label || path;
}

function timeAgo(isoStr) {
  if (!isoStr) return "unknown";
  const secs = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (secs < 5)  return "just now";
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

export default function LiveUsersCard() {
  const [liveVisitors,  setLiveVisitors]  = useState(null); // Map: visitor_id → record
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [debugOpen,     setDebugOpen]     = useState(false);

  const refresh = useCallback(async () => {
    try {
      const records = await base44.entities.LivePresence.filter(
        { is_admin: false },
        "-last_seen",
        200
      );

      const now = Date.now();

      // Keep only genuinely live, non-admin records
      const live = records.filter(r => {
        if (r.is_admin) return false;
        if (!r.last_seen) return false;
        return now - new Date(r.last_seen).getTime() <= LIVE_WINDOW_MS;
      });

      // Deduplicate by visitor_id — keep most-recent record per visitor
      const byVisitor = new Map();
      live.forEach(r => {
        const existing = byVisitor.get(r.visitor_id);
        if (!existing || r.last_seen > existing.last_seen) {
          byVisitor.set(r.visitor_id, r);
        }
      });

      setLiveVisitors(byVisitor);
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

  const visitorList = liveVisitors ? [...liveVisitors.values()] : [];
  const liveCount   = visitorList.length;

  // Page breakdown
  const pageMap = {};
  visitorList.forEach(r => {
    const label = sanitizePageLabel(r.page_path, r.page_label);
    pageMap[label] = (pageMap[label] || 0) + 1;
  });
  const pageBreakdown = Object.entries(pageMap)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count);

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
                {liveVisitors === null ? "—" : liveCount}
              </p>
            </div>
            <p className="text-xs text-white/40">Live Users Now</p>
            <p className="text-[10px] text-white/20 mt-0.5">non-admin · active within 30s · unique visitors</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/20">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading…"}
          </p>
          <p className="text-[10px] text-white/15">auto-refreshes every 5s</p>
        </div>
      </div>

      {/* Page breakdown chips */}
      {pageBreakdown.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/25 mb-2.5">Active Pages</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <AnimatePresence>
              {pageBreakdown.map(({ page, count }) => (
                <motion.div key={page}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: page === "Legacy / Removed Page" ? "rgba(255,200,0,0.06)" : "rgba(239,68,68,0.06)",
                    border:     page === "Legacy / Removed Page" ? "1px solid rgba(255,200,0,0.15)" : "1px solid rgba(239,68,68,0.12)",
                  }}>
                  <p className="text-[11px] text-white/60 truncate">{page}</p>
                  <span className="text-[11px] font-black text-white/80 flex-shrink-0">{count}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {liveCount === 0 && liveVisitors !== null && (
        <p className="text-xs text-white/20 mt-1">No active visitors right now.</p>
      )}

      {/* Per-visitor list (always shown when there are live visitors) */}
      {visitorList.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/25 mb-2">Visitor Details</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {visitorList
              .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
              .map(r => (
                <div key={r.visitor_id || r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-[11px]"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-white/50 truncate flex-1">{sanitizePageLabel(r.page_path, r.page_label)}</span>
                  <span className="text-white/30 flex-shrink-0">{r.device_type || "—"}</span>
                  <span className="text-red-400/70 font-bold flex-shrink-0 w-16 text-right">{timeAgo(r.last_seen)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Debug panel */}
      <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={() => setDebugOpen(v => !v)}
          className="flex items-center gap-2 text-[10px] text-white/25 hover:text-white/45 transition-colors"
        >
          <Bug className="w-3 h-3" />
          Debug live visitors
          {debugOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {debugOpen && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,100,100,0.15)" }}>
            {visitorList.length === 0 ? (
              <p className="px-4 py-3 text-[10px] text-white/30">No live visitors in the 30s window. Admin traffic excluded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-white/55" style={{ minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                      {["Visitor ID (truncated)", "Page URL", "Page Label", "Last Seen", "Device", "is_admin"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold text-white/30 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visitorList.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen)).map((r, i) => (
                      <tr key={r.visitor_id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                        className="hover:bg-white/[0.02]">
                        <td className="px-3 py-1.5 font-mono text-white/40">
                          {r.visitor_id ? r.visitor_id.slice(0, 12) + "…" : "—"}
                        </td>
                        <td className="px-3 py-1.5 max-w-[140px] truncate text-white/40" title={r.page_path}>
                          {r.page_path || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-white/60">{r.page_label || "—"}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-red-400/70 font-bold">
                          {r.last_seen ? `${timeAgo(r.last_seen)} (${new Date(r.last_seen).toLocaleTimeString()})` : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-white/40">{r.device_type || "—"}</td>
                        <td className="px-3 py-1.5">
                          {r.is_admin
                            ? <span className="text-red-400 font-bold">ADMIN</span>
                            : <span className="text-green-400/50">no</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="px-4 py-2 text-[9px] text-white/20 border-t border-white/5">
              Admin traffic excluded from count · Live window = 30s · Heartbeat every 10s · Deduped by visitor_id
            </p>
          </div>
        )}
      </div>
    </div>
  );
}