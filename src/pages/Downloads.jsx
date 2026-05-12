import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music4, Play, Pause, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import Footer from "../components/shared/Footer";

export default function Downloads() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  useEffect(() => {
    base44.entities.Track.filter({ status: "published", is_downloadable: true }, "-created_date", 200)
      .then((t) => { setTracks(t); setLoading(false); });
  }, []);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
            <Download className="w-3 h-3" /> Available Downloads
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">Downloads</h1>
          <p className="text-white/35 text-sm">Songs available to download — free to keep.</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-24">
            <Download className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 font-medium">No downloadable songs yet.</p>
            <p className="text-white/15 text-sm mt-1">Check back soon as we add more content.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-white/25 mb-4">{tracks.length} song{tracks.length !== 1 ? "s" : ""} available</p>
            <AnimatePresence>
              {tracks.map((track, i) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                return (
                  <motion.div
                    key={track.id}
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
                    <div className="relative flex-shrink-0">
                      {track.cover_url ? (
                        <img src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(212,168,67,0.08)" }}>
                          <Music4 className="w-5 h-5 text-yellow-400/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{track.title}</p>
                      <p className="text-xs text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {track.frequency_type && track.frequency_type !== "standard" && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                            <Waves className="w-2.5 h-2.5" /> {track.frequency_type.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(212,168,67,0.1)", color: "#D4A843" }}>
                          Free Download
                        </span>
                      </div>
                    </div>

                    {track.duration && <p className="text-xs text-white/25 hidden sm:block">{track.duration}</p>}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlay(track)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                        {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      {track.audio_url && (
                        <a
                          href={track.audio_url}
                          download={`${track.title}.mp3`}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110"
                          style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.1))", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}
                          onClick={(e) => e.stopPropagation()}>
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}