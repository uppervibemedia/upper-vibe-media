import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import {
  Download, Play, Pause, Waves, Lock, Crown, Music4, ExternalLink,
  Tv2, ChevronLeft, Tag, User
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";

function toEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function toWatchUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : url;
}

const CATEGORY_LABELS = {
  hiphop: "Hip Hop / Rap",
  rnb: "R&B",
  electronic: "Electronic",
  meditation: "Meditation / 432 Hz",
  car: "Car Music",
};

export default function SongPage() {
  const { id } = useParams();
  const [track, setTrack] = useState(null);
  const [visualizer, setVisualizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [vizPlaying, setVizPlaying] = useState(false);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";

  useEffect(() => {
    if (!id) return;
    Promise.all([
      base44.entities.Track.filter({ id }, "-created_date", 1).then((r) => r[0] || null),
    ]).then(([t]) => {
      setTrack(t);
      if (t) {
        // Find linked visualizer
        base44.entities.Visualizer.filter({ linked_song_id: t.id, status: "published" }, "display_order", 1)
          .then((v) => { if (v[0]) setVisualizer(v[0]); });
      }
      setLoading(false);
    });
  }, [id]);

  const handlePlay = () => {
    if (!track) return;
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  const isCurrentTrack = currentTrack?.id === track?.id;
  const embedUrl = visualizer ? toEmbedUrl(visualizer.embed_url || visualizer.video_url) : null;
  const watchUrl = visualizer ? toWatchUrl(visualizer.video_url || visualizer.embed_url) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <Music4 className="w-12 h-12 text-white/10" />
        <p className="text-white/40 text-sm">Song not found.</p>
        <Link to="/music" className="text-primary text-sm hover:underline">← Back to Music</Link>
      </div>
    );
  }

  const freq = track.frequency_type === "432hz" ? "432 Hz" : track.frequency_type === "528hz" ? "528 Hz" : track.frequency_type || "";

  return (
    <div className="min-h-screen">
      {/* Back nav */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <Link to="/music" className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors mb-6">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Music
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-20">
        {/* Hero section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-8 mb-10">
          {/* Cover art */}
          <div className="flex-shrink-0">
            {track.cover_url ? (
              <img src={track.cover_url} alt={track.title}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover mx-auto sm:mx-0"
                style={{ boxShadow: "0 0 40px rgba(0,229,255,0.15)" }} />
            ) : (
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl mx-auto sm:mx-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.08),rgba(212,168,67,0.05))", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Music4 className="w-16 h-16 text-white/10" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col justify-center text-center sm:text-left">
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-3">
              {freq && (
                <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00E5FF" }}>
                  <Waves className="w-2.5 h-2.5" /> {freq}
                </span>
              )}
              {track.category_ids?.length > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                  <Tag className="w-2.5 h-2.5" /> {track.album || "Upper Vibe"}
                </span>
              )}
              {track.is_featured && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(212,168,67,0.2)", color: "#D4A843" }}>Featured</span>
              )}
            </div>

            <h1 className="font-heading font-black text-3xl sm:text-4xl text-white mb-2 leading-tight">{track.title}</h1>
            <p className="text-white/50 text-sm mb-1 flex items-center gap-1.5 justify-center sm:justify-start">
              <User className="w-3.5 h-3.5" /> {track.artist_display || "Upper Vibe Media"}
            </p>
            {track.album && <p className="text-white/25 text-xs mb-4">{track.album}</p>}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-2">
              {/* Play */}
              <button onClick={handlePlay}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
                {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                {isCurrentTrack && isPlaying ? "Pause" : "Play Song"}
              </button>

              {/* Download — premium gated */}
              {isPremium ? (
                track.audio_url ? (
                  <a href={track.audio_url} download={`${track.title}.mp3`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
                    style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.25),rgba(212,168,67,0.15))", border: "1px solid rgba(212,168,67,0.4)", color: "#D4A843" }}>
                    <Download className="w-4 h-4" /> Download Song
                  </a>
                ) : (
                  <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm opacity-40 cursor-not-allowed"
                    style={{ border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                    <Download className="w-4 h-4" /> Coming Soon
                  </span>
                )
              ) : (
                <button onClick={() => setUpgradeModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
                  style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                  <Lock className="w-4 h-4" /> Download Song
                  <Crown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Paywall message for free users */}
            {!isPremium && (
              <p className="text-[11px] text-white/25 mt-3 max-w-sm mx-auto sm:mx-0 leading-relaxed">
                Premium members can download Upper Vibe Media songs, mixes, and exclusive music packs.{" "}
                <button onClick={() => setUpgradeModal(true)} className="text-yellow-400/60 hover:text-yellow-400 transition-colors underline underline-offset-2">
                  Upgrade to unlock
                </button>.
              </p>
            )}

            {/* Streaming links */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
              {track.audio_url && (
                <a href={toWatchUrl(track.audio_url) || "#"} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                  <ExternalLink className="w-3 h-3" /> Stream
                </a>
              )}
              {watchUrl && (
                <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                  style={{ background: "rgba(255,0,0,0.07)", border: "1px solid rgba(255,0,0,0.2)", color: "#FF6B6B" }}>
                  <ExternalLink className="w-3 h-3" /> YouTube
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Description */}
        {track.description && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="mb-8 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-white/50 leading-relaxed">{track.description}</p>
          </motion.div>
        )}

        {/* Linked Visualizer */}
        {visualizer && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="mb-8">
            <h2 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Tv2 className="w-4 h-4 text-primary" /> Music Visualizer
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* 16:9 ratio */}
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <div className="absolute inset-0">
                  {vizPlaying && embedUrl ? (
                    <iframe
                      src={`${embedUrl}?autoplay=1&rel=0`}
                      title={visualizer.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full cursor-pointer group relative" onClick={() => setVizPlaying(true)}>
                      {visualizer.thumbnail_url ? (
                        <img src={visualizer.thumbnail_url} alt={visualizer.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.07),rgba(0,0,0,0.5))" }}>
                          <Tv2 className="w-12 h-12 text-white/10" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.4)" }}>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                          style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", boxShadow: "0 0 32px rgba(0,229,255,0.4)" }}>
                          <Play className="w-7 h-7 text-black ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-4"
                style={{ background: "rgba(0,0,0,0.4)" }}>
                <div>
                  <p className="text-sm font-bold text-white">{visualizer.title}</p>
                  <p className="text-xs text-white/35">{visualizer.artist || "Upper Vibe Media"}</p>
                </div>
                {watchUrl && (
                  <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all hover:brightness-110"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                    <ExternalLink className="w-3 h-3" /> Watch on YouTube
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Lyrics */}
        {track.lyrics && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-8">
            <h2 className="font-heading font-bold text-lg text-white mb-4">Lyrics</h2>
            <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <pre className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap font-body">{track.lyrics}</pre>
            </div>
          </motion.div>
        )}

        {/* Back to visualizers */}
        <div className="flex gap-3 flex-wrap">
          <Link to="/visualizers"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
            <Tv2 className="w-3.5 h-3.5" /> All Visualizers
          </Link>
          <Link to="/music"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            <Music4 className="w-3.5 h-3.5" /> All Music
          </Link>
        </div>
      </div>

      <Footer />
      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
    </div>
  );
}