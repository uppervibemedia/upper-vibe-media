import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Radio as RadioIcon, Waves, Download, Music4, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Radio() {
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [premiumModal, setPremiumModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [started, setStarted] = useState(false);

  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then((res) => {
      setTracks(res);
      setLoading(false);
    });
  }, []);

  const buildQueue = useCallback((allTracks) => {
    return shuffleArray(allTracks);
  }, []);

  const startRadio = () => {
    if (tracks.length === 0) return;
    const shuffled = buildQueue(tracks);
    setQueue(shuffled);
    setQueueIndex(0);
    setStarted(true);
    playTrack(shuffled[0]);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    const next = (queueIndex + 1) % queue.length;
    setQueueIndex(next);
    playTrack(queue[next]);
  };

  const playPrev = () => {
    if (queue.length === 0) return;
    const prev = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prev);
    playTrack(queue[prev]);
  };

  const handlePlayPause = () => {
    if (!started) { startRadio(); return; }
    togglePlay();
  };

  const handleDownload = () => {
    if (!user) { setLoginModal(true); return; }
    const isPremium = user?.role === "premium" || user?.tier === "premium";
    if (!isPremium) { setPremiumModal(true); return; }
    const track = currentTrack;
    if (track?.audio_url) window.open(track.audio_url, "_blank");
  };

  // Auto-advance: when global player's current track ends, play next
  // We detect this by watching currentTrack changes vs queue
  const prevTrackId = useRef(null);
  useEffect(() => {
    if (!started || queue.length === 0) return;
    if (currentTrack?.id && currentTrack.id !== prevTrackId.current) {
      const idx = queue.findIndex((t) => t.id === currentTrack.id);
      if (idx !== -1) setQueueIndex(idx);
      prevTrackId.current = currentTrack.id;
    }
  }, [currentTrack, queue, started]);

  const displayTrack = started ? (currentTrack || queue[queueIndex]) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      {/* Background ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.04]"
          style={{ background: "#00C9E0" }} />
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-20 lg:pt-14 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
            style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.16)" }}>
            <RadioIcon className="w-3 h-3" style={{ color: "#00C9E0" }} />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: "#00C9E0" }}>
              Live Radio
            </span>
          </div>
          <h1 className="font-heading font-black text-white mb-3" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
            Upper Vibe Radio
          </h1>
          <p className="text-white/40 text-sm">Shuffle through all 432 Hz Upper Vibe Media songs</p>
        </motion.div>

        {tracks.length === 0 ? (
          <div className="text-center py-20">
            <Music4 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No songs available for radio yet.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>

            {/* Current song card */}
            <div className="rounded-3xl p-8 mb-8 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {displayTrack ? (
                <>
                  {/* Cover */}
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    {displayTrack.cover_url ? (
                      <img src={displayTrack.cover_url} alt={displayTrack.title}
                        className="w-full h-full rounded-2xl object-cover"
                        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
                    ) : (
                      <div className="w-full h-full rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.15)" }}>
                        <Music4 className="w-16 h-16 text-cyan-400/20" />
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)" }}>
                        <Waves className="w-4 h-4 text-black animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <h2 className="font-heading font-black text-white text-xl mb-1 truncate px-4">{displayTrack.title}</h2>
                  <p className="text-white/40 text-sm mb-3">{displayTrack.artist_display || "Upper Vibe Media"}</p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full mb-6"
                    style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                    <Waves className="w-2.5 h-2.5" /> 432 Hz
                  </span>
                </>
              ) : (
                <div className="py-8">
                  <div className="w-48 h-48 mx-auto rounded-2xl mb-6 flex items-center justify-center"
                    style={{ background: "rgba(0,200,220,0.05)", border: "1px solid rgba(0,200,220,0.1)" }}>
                    <RadioIcon className="w-16 h-16 text-cyan-400/15" />
                  </div>
                  <p className="text-white/20 text-sm">Press Play to start the radio</p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-5 mb-6">
                <button
                  onClick={playPrev}
                  disabled={!started}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/8 disabled:opacity-30"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <SkipBack className="w-5 h-5 text-white/60" />
                </button>

                {/* Main play/pause */}
                <button
                  onClick={handlePlayPause}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", boxShadow: "0 0 24px rgba(0,200,220,0.2)" }}>
                  {isPlaying && started ? (
                    <Pause className="w-7 h-7 text-black fill-current" />
                  ) : (
                    <Play className="w-7 h-7 text-black fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={playNext}
                  disabled={!started}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/8 disabled:opacity-30"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <SkipForward className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Download button */}
              {displayTrack && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110"
                  style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", color: "#C89432" }}>
                  <Download className="w-3.5 h-3.5" />
                  Download Song
                  {(!user || (user?.role !== "premium" && user?.tier !== "premium")) && (
                    <Crown className="w-3 h-3 text-yellow-400/60" />
                  )}
                </button>
              )}
            </div>

            {/* Note */}
            <p className="text-center text-[11px] text-white/20 tracking-wide">
              Free to stream. Premium members unlock downloads.
            </p>

            {/* Queue preview */}
            {started && queue.length > 0 && (
              <div className="mt-10">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/25 mb-4">Up Next</p>
                <div className="space-y-2">
                  {queue.slice(queueIndex + 1, queueIndex + 4).map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      {t.cover_url ? (
                        <img src={t.cover_url} alt={t.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background: "rgba(0,200,220,0.06)" }}>
                          <Music4 className="w-4 h-4 text-white/15" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/50 truncate">{t.title}</p>
                        <p className="text-[10px] text-white/25 truncate">{t.artist_display || "Upper Vibe Media"}</p>
                      </div>
                      <span className="text-[9px] text-white/15">#{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}