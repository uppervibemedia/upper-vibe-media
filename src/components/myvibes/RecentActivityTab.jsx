import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Music4, Play, Pause, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useTheme } from "@/context/ThemeContext";
import { formatDistanceToNow } from "date-fns";

const LOCAL_HISTORY_KEY = "uv_play_history";

function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function RecentActivityTab({ user }) {
  const [streams, setStreams] = useState([]);
  const [localHistory, setLocalHistory] = useState([]);
  const [tracks, setTracks] = useState({});
  const [loading, setLoading] = useState(true);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { accent } = useTheme();
  const rgb = accent.rgb;

  useEffect(() => {
    // Load local play history (always available)
    const history = getLocalHistory();
    setLocalHistory(history);

    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Load server-side stream history for logged-in users
    base44.entities.SongStream.filter({ user_id: user.id }, "-created_date", 30)
      .then(async (s) => {
        setStreams(s);
        // Fetch track details for streams that need them
        const ids = [...new Set(s.map(st => st.song_id).filter(Boolean))];
        if (ids.length > 0) {
          const trackData = await base44.entities.Track.filter({ status: "published" }, "-created_date", 200);
          const map = {};
          trackData.forEach(t => { map[t.id] = t; });
          setTracks(map);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handlePlay = (track) => {
    if (!track) return;
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: `2px solid rgba(${rgb},0.2)`, borderTopColor: `rgb(${rgb})` }} />
      </div>
    );
  }

  // Merge server streams + local history, dedupe by song_id, show most recent 30
  const serverItems = streams.map(s => ({
    id: s.id,
    song_id: s.song_id,
    title: s.song_title || tracks[s.song_id]?.title || "Unknown",
    artist: s.artist_name || tracks[s.song_id]?.artist_display || "Upper Vibe Media",
    cover_url: tracks[s.song_id]?.cover_url || "",
    audio_url: tracks[s.song_id]?.audio_url || "",
    date: s.created_date || s.updated_date,
    completed: s.completed,
    source: "server",
  }));

  // Local history items not already in server streams
  const serverSongIds = new Set(streams.map(s => s.song_id));
  const localItems = localHistory
    .filter(h => !serverSongIds.has(h.id))
    .slice(0, 20)
    .map(h => ({
      id: `local_${h.id}`,
      song_id: h.id,
      title: h.title || "Unknown",
      artist: h.artist_display || h.artist || "Upper Vibe Media",
      cover_url: h.cover_url || "",
      audio_url: h.audio_url || "",
      date: h.playedAt || h.created_date,
      completed: false,
      source: "local",
    }));

  const allItems = [...serverItems, ...localItems]
    .filter(item => item.song_id)
    .slice(0, 30);

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
        <p className="text-white/30 font-medium mb-2">No listening history yet</p>
        <p className="text-white/15 text-sm mb-6">Start listening and your activity will appear here.</p>
        <Link
          to="/music"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
          style={{ background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}
        >
          Browse Music
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {allItems.map((item, i) => {
        const track = tracks[item.song_id] || {
          id: item.song_id,
          title: item.title,
          artist_display: item.artist,
          cover_url: item.cover_url,
          audio_url: item.audio_url,
        };
        const isCurrentTrack = currentTrack?.id === item.song_id;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025 }}
            className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
            style={{
              background: isCurrentTrack ? `rgba(${rgb},0.06)` : "rgba(255,255,255,0.025)",
              border: `1px solid ${isCurrentTrack ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {/* Cover */}
            <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
              {item.cover_url ? (
                <img src={item.cover_url} alt={item.title} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `rgba(${rgb},0.08)` }}>
                  <Music4 className="w-5 h-5" style={{ color: `rgba(${rgb},0.4)` }} />
                </div>
              )}
              <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.6)" }}>
                {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{item.title}</p>
              <p className="text-xs text-white/40 truncate">{item.artist}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,160,220,0.1)", color: "#00A0DC" }}>
                  <Waves className="w-2 h-2" /> 432 Hz
                </span>
                {item.completed && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(74,222,128,0.1)", color: "rgba(74,222,128,0.7)" }}>
                    Completed
                  </span>
                )}
              </div>
            </div>

            {/* Date + actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.date && (
                <p className="text-[10px] text-white/20 hidden sm:block text-right">
                  {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                </p>
              )}
              <Link
                to={`/song/${item.song_id}`}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:brightness-110"
                style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}
              >
                <Play className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}