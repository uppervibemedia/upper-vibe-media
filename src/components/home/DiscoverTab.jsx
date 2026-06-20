import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Tv2, Waves, Sparkles, Heart, Compass, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../../hooks/useFavorite";

// ─── Local play history (localStorage) ───────────────────────────────────────
const HISTORY_KEY = "uvm_play_history";
export function recordPlay(track) {
  const raw = localStorage.getItem(HISTORY_KEY);
  const history = raw ? JSON.parse(raw) : [];
  // keep unique, most recent first, max 30
  const filtered = history.filter((t) => t.id !== track.id);
  const updated = [{ id: track.id, title: track.title, artist: track.artist_display, cover_url: track.cover_url, mood_tags: track.mood_tags || [], category_ids: track.category_ids || [] }, ...filtered].slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
export function getHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

// ─── Algorithm ────────────────────────────────────────────────────────────────
function buildRecommendations(allTracks, allVizualizers, favorites, history) {
  const favTrackIds = new Set(favorites.filter((f) => f.type === "track").map((f) => f.track_id));
  const favVizIds = new Set(favorites.filter((f) => f.type === "visualizer").map((f) => f.visualizer_id));
  const historyIds = new Set(history.map((h) => h.id));

  // Collect signals: mood_tags + category_ids from favorites & recent history
  const signalTracks = [
    ...allTracks.filter((t) => favTrackIds.has(t.id)),
    ...allTracks.filter((t) => historyIds.has(t.id)).slice(0, 10),
  ];
  const moodPool = signalTracks.flatMap((t) => t.mood_tags || []);
  const catPool = signalTracks.flatMap((t) => t.category_ids || []);

  const moodFreq = {};
  moodPool.forEach((m) => { moodFreq[m] = (moodFreq[m] || 0) + 1; });
  const catFreq = {};
  catPool.forEach((c) => { catFreq[c] = (catFreq[c] || 0) + 1; });

  function scoreTrack(t) {
    if (favTrackIds.has(t.id) || historyIds.has(t.id)) return -1; // already seen/faved → skip
    let score = 0;
    (t.mood_tags || []).forEach((m) => { score += (moodFreq[m] || 0) * 2; });
    (t.category_ids || []).forEach((c) => { score += (catFreq[c] || 0) * 1.5; });
    if (t.is_featured) score += 3;
    if (t.is_new_release) score += 2;
    return score;
  }

  function scoreViz(v) {
    if (favVizIds.has(v.id)) return -1;
    let score = 0;
    if (v.is_featured) score += 3;
    // boost if linked song is in fav/history
    if (v.linked_song_id && (favTrackIds.has(v.linked_song_id) || historyIds.has(v.linked_song_id))) score += 5;
    return score;
  }

  const suggestedTracks = allTracks
    .map((t) => ({ ...t, _score: scoreTrack(t) }))
    .filter((t) => t._score >= 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 8);

  const suggestedViz = allVizualizers
    .map((v) => ({ ...v, _score: scoreViz(v) }))
    .filter((v) => v._score >= 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 6);

  // "Because you listened to..." — take up to 3 recent history items that have similar tracks
  const becauseOf = history.slice(0, 5).map((h) => {
    const seedTrack = allTracks.find((t) => t.id === h.id);
    if (!seedTrack) return null;
    const related = allTracks
      .filter((t) => t.id !== h.id && !historyIds.has(t.id) && !favTrackIds.has(t.id))
      .map((t) => {
        let score = 0;
        (t.mood_tags || []).forEach((m) => { if ((seedTrack.mood_tags || []).includes(m)) score += 2; });
        (t.category_ids || []).forEach((c) => { if ((seedTrack.category_ids || []).includes(c)) score += 1.5; });
        if (t.artist_display === seedTrack.artist_display) score += 4;
        return { ...t, _score: score };
      })
      .filter((t) => t._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 4);
    if (related.length === 0) return null;
    return { seed: seedTrack, related };
  }).filter(Boolean).slice(0, 3);

  const hasSignals = signalTracks.length > 0 || history.length > 0;
  return { suggestedTracks, suggestedViz, becauseOf, hasSignals };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TrackRow({ track, index }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const handlePlay = (e) => {
    e.preventDefault();
    if (isCurrent) togglePlay();
    else { playTrack(track); recordPlay(track); }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 p-3 rounded-2xl group transition-all cursor-pointer"
      style={{
        background: isCurrent ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrent ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.06)"}`,
      }}
      onClick={handlePlay}
    >
      <div className="relative flex-shrink-0">
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="w-11 h-11 rounded-xl object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.08)" }}>
            <Music4 className="w-4 h-4 text-cyan-400/30" />
          </div>
        )}
        <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          {isCurrent && isPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{track.title}</p>
        <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(0,160,220,0.1)", color: "#00A0DC" }}>
          <Waves className="w-2 h-2" /> 432
        </span>
        {track.duration && <p className="text-[10px] text-white/25">{track.duration}</p>}
      </div>
    </motion.div>
  );
}

function VizCard({ viz, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden group"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="aspect-video relative overflow-hidden">
        {viz.thumbnail_url ? (
          <img src={viz.thumbnail_url} alt={viz.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(155,126,255,0.06)" }}>
            <Tv2 className="w-7 h-7 text-white/10" />
          </div>
        )}
        <Link to="/visualizers"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(155,126,255,0.9)" }}>
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </Link>
      </div>
      <div className="p-3">
        <p className="text-sm font-bold text-white truncate">{viz.title}</p>
        <p className="text-xs text-white/35 truncate">{viz.artist || "Upper Vibe Media"}</p>
      </div>
    </motion.div>
  );
}

// ─── Main DiscoverTab ─────────────────────────────────────────────────────────
export default function DiscoverTab() {
  const { user } = useAuth();
  const { favorites } = useFavorites(user?.email);
  const [allTracks, setAllTracks] = useState([]);
  const [allViz, setAllViz] = useState([]);
  const [loading, setLoading] = useState(true);
  const history = useMemo(() => getHistory(), []);

  useEffect(() => {
    // Sequenced to avoid rate limiting
    (async () => {
      const t = await base44.entities.Track.filter({ status: "published" }, "-created_date", 300);
      const v = await base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 200);
      return [t, v];
    })().then(([t, v]) => { setAllTracks(t); setAllViz(v); setLoading(false); });
  }, []);

  const { suggestedTracks, suggestedViz, becauseOf, hasSignals } = useMemo(
    () => buildRecommendations(allTracks, allViz, favorites, history),
    [allTracks, allViz, favorites, history]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  // No signals yet — cold start
  if (!hasSignals) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.2)" }}>
          <Compass className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="font-heading font-black text-2xl text-white mb-3">Your Discover Feed</h3>
        <p className="text-white/40 text-sm max-w-md leading-relaxed mb-8">
          Start listening and saving favorites — we'll build a personalized 432 Hz recommendation feed just for you.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/music"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff" }}>
            <Play className="w-4 h-4" /> Start Listening
          </Link>
          <Link to="/favorites"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wider transition-all"
            style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", color: "#ec4899" }}>
            <Heart className="w-4 h-4" /> Save Favorites
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-14">

      {/* Because you listened to... */}
      {becauseOf.length > 0 && becauseOf.map((item, bi) => (
        <section key={item.seed.id}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {item.seed.cover_url && (
                <img src={item.seed.cover_url} alt={item.seed.title}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              )}
              <div>
                <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-0.5" style={{ color: "#9B7EFF" }}>
                  Because you listened to
                </p>
                <p className="font-heading font-black text-white text-base leading-tight truncate max-w-xs">
                  {item.seed.title}
                </p>
              </div>
            </div>
            <Link to="/music" className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
              More <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {item.related.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))}
          </div>
        </section>
      ))}

      {/* Suggested Tracks */}
      {suggestedTracks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-1" style={{ color: "#00A0DC" }}>
                <Sparkles className="w-3 h-3 inline mr-1" />Picked For You
              </p>
              <h3 className="font-heading font-black text-xl text-white">Recommended Songs</h3>
            </div>
            <Link to="/music" className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
              All Music <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {suggestedTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Suggested Visualizers */}
      {suggestedViz.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-1" style={{ color: "#9B7EFF" }}>
                Visual Frequency
              </p>
              <h3 className="font-heading font-black text-xl text-white">Visualizers You Might Like</h3>
            </div>
            <Link to="/visualizers" className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
              All Visualizers <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {suggestedViz.map((viz, i) => (
              <VizCard key={viz.id} viz={viz} index={i} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}