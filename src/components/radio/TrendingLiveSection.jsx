import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Radio, Sparkles, Music4 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CoverImage from "@/components/shared/CoverImage";

export default function TrendingLiveSection({ themeVars }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("getTrendingTracks", {});
      const data = res?.data?.trending || [];
      setTrending(data);
      setLastUpdated(res?.data?.updated_at);
    } catch {
      // silent fail — section just remains empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
    const interval = setInterval(fetchTrending, 30000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  if (loading) {
    return (
      <div className="mt-10 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: `rgba(${themeVars["--rt-primary"]},0.2)`, borderTopColor: `rgb(${themeVars["--rt-primary"]})` }} />
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  const primary = `rgb(${themeVars["--rt-primary"]})`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, duration: 0.5 }}
      className="mt-10 mb-6"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: `rgba(${themeVars["--rt-primary"]},0.08)`, border: `1px solid rgba(${themeVars["--rt-primary"]},0.2)` }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
          <Radio className="w-3 h-3" style={{ color: primary }} />
          <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: primary }}>
            Live Broadcast
          </span>
        </div>
        <span className="text-[9px] text-white/20">Trending right now</span>
      </div>

      {/* Trend grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {trending.map((song, i) => (
          <Link
            key={song.song_id}
            to={`/song/${song.song_id}`}
            className="group"
          >
            <div
              className="rounded-xl p-2.5 transition-all hover:brightness-110"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Cover */}
              <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2">
                <CoverImage
                  src={song.cover_url}
                  alt={song.title}
                  className="w-full h-full"
                  iconClassName="w-6 h-6"
                />
                {/* Rank badge */}
                <div
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: i < 3
                      ? `linear-gradient(135deg,rgb(${themeVars["--rt-primary-dark"]}),rgb(${themeVars["--rt-primary"]}))`
                      : "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <span className="text-[9px] font-black text-white">{i + 1}</span>
                </div>
              </div>

              {/* Info */}
              <p className="text-[11px] font-bold text-white/80 truncate leading-tight">
                {song.title}
              </p>
              <p className="text-[9px] text-white/35 truncate mt-0.5">
                {song.artist}
              </p>

              {/* Listener count */}
              <div className="flex items-center gap-1 mt-1.5">
                <Sparkles className="w-2.5 h-2.5" style={{ color: primary, opacity: 0.6 }} />
                <span className="text-[9px] font-bold" style={{ color: primary, opacity: 0.7 }}>
                  {song.listener_count} {song.listener_count === 1 ? "listener" : "listeners"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}