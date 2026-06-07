import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Music4, Play, Pause, ExternalLink, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { triggerBrowserDownload } from "@/lib/downloadService";
import { usePlayer } from "@/context/PlayerContext";
import { useTheme } from "@/context/ThemeContext";
import { format } from "date-fns";

export default function DownloadsTab({ user, isPlus, isAdmin }) {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { accent } = useTheme();
  const rgb = accent.rgb;
  const isPremium = isPlus || isAdmin;

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    base44.entities.UserDownload.filter({ user_id: user.id }, "-downloaded_at", 100)
      .then((d) => { setDownloads(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const handleRedownload = async (dl) => {
    if (!dl.song_id) return;
    setDownloading(dl.song_id);
    await triggerBrowserDownload(dl.song_id, dl.song_title);
    setDownloading(null);
  };

  const handlePlay = (dl) => {
    if (!dl.file_url) return;
    const trackObj = {
      id: dl.song_id,
      title: dl.song_title,
      artist_display: dl.artist_name,
      cover_url: dl.artwork_url,
      audio_url: dl.file_url,
    };
    if (currentTrack?.id === dl.song_id) togglePlay();
    else playTrack(trackObj);
  };

  if (!isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}
        >
          <Crown className="w-7 h-7" style={{ color: "#D4A843" }} />
        </div>
        <h3 className="font-heading font-black text-xl text-white mb-2">Plus Members Only</h3>
        <p className="text-white/40 text-sm max-w-xs mb-6">
          Upgrade to Upper Vibe Plus to download tracks and access them offline.
        </p>
        <Link
          to="/upgrade"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.8),rgba(212,168,67,1))", color: "#000" }}
        >
          <Crown className="w-4 h-4" /> Upgrade to Plus
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid rgba(212,168,67,0.2)", borderTopColor: "#D4A843" }} />
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Download className="w-12 h-12 text-white/10 mx-auto mb-4" />
        <p className="text-white/30 font-medium mb-2">No downloads yet</p>
        <p className="text-white/15 text-sm mb-6">Download any track from the music library to find it here.</p>
        <Link
          to="/music"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}
        >
          Browse Music
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {downloads.map((dl, i) => {
        const isCurrentTrack = currentTrack?.id === dl.song_id;
        return (
          <motion.div
            key={dl.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
            style={{
              background: isCurrentTrack ? "rgba(212,168,67,0.06)" : "rgba(255,255,255,0.025)",
              border: `1px solid ${isCurrentTrack ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {/* Cover */}
            <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(dl)}>
              {dl.artwork_url ? (
                <img src={dl.artwork_url} alt={dl.song_title} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,168,67,0.08)" }}>
                  <Music4 className="w-5 h-5" style={{ color: "rgba(212,168,67,0.4)" }} />
                </div>
              )}
              <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.6)" }}>
                {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{dl.song_title || "Unknown Track"}</p>
              <p className="text-xs text-white/40 truncate">{dl.artist_name || "Upper Vibe Media"}</p>
              {dl.downloaded_at && (
                <p className="text-[9px] text-white/20 mt-0.5">
                  Downloaded {format(new Date(dl.downloaded_at), "MMM d, yyyy")}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {dl.song_id && (
                <Link
                  to={`/song/${dl.song_id}`}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:brightness-110"
                  style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}
                  title="View song"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                onClick={() => handleRedownload(dl)}
                disabled={downloading === dl.song_id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
                title="Re-download"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">{downloading === dl.song_id ? "Downloading…" : "Download"}</span>
              </button>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}