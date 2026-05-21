import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import {
  Download, Play, Pause, Waves, Lock, Crown, Music4,
  Tv2, ChevronLeft, Tag, User, Heart, Zap
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import SupportModal from "../components/shared/SupportModal";
import { useFavorites } from "../hooks/useFavorite";
import { recordPlay } from "../components/home/DiscoverTab";
import { recordUserDownload } from "@/lib/downloadService";

function toEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function MoreSongsPanel({ currentTrackId, currentTrack, allTracks, onPlay }) {
  const { isFaved } = useFavorites(null);

  const related = useMemo(() => {
    if (!allTracks.length || !currentTrack) return [];
    const others = allTracks.filter((t) => t.id !== currentTrackId && t.status === "published");

    // Score: same artist or overlapping category_ids
    const scored = others.map((t) => {
      let score = 0;
      if (t.primary_artist_id && t.primary_artist_id === currentTrack.primary_artist_id) score += 5;
      if (t.artist_display && t.artist_display === currentTrack.artist_display) score += 3;
      const curCats = new Set(currentTrack.category_ids || []);
      (t.category_ids || []).forEach((c) => { if (curCats.has(c)) score += 2; });
      if (t.is_featured) score += 1;
      return { ...t, _score: score };
    });

    scored.sort((a, b) => b._score - a._score || new Date(b.release_date || 0) - new Date(a.release_date || 0));
    return scored.slice(0, 5);
  }, [allTracks, currentTrackId, currentTrack]);

  if (!related.length) return null;

  return (
    <div className="rounded-3xl p-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="font-heading font-black text-white text-sm tracking-wide uppercase mb-4 flex items-center gap-2">
        <Music4 className="w-4 h-4 text-cyan-400" /> More Songs
      </h3>
      <div className="space-y-2">
        {related.map((song) => (
          <div key={song.id}
            className="flex items-center gap-3 p-2.5 rounded-2xl group cursor-pointer transition-all hover:border-white/15"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            onClick={() => onPlay(song)}>
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-black">
              {song.cover_url ? (
                <img src={song.cover_url} alt={song.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "rgba(0,229,255,0.06)" }}>
                  <Music4 className="w-5 h-5 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link to={`/song/${song.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-bold text-white leading-snug line-clamp-2 block group-hover:text-cyan-300 transition-colors">
                {song.title}
              </Link>
              <p className="text-[10px] text-white/35 truncate mt-0.5">{song.artist_display || "Upper Vibe Media"}</p>
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full mt-1"
                style={{ background: "rgba(0,229,255,0.08)", color: "#00C9E0" }}>
                <Waves className="w-2 h-2" /> 432 Hz
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SongPage() {
  const { id } = useParams();
  const [track, setTrack] = useState(null);
  const [allTracks, setAllTracks] = useState([]);
  const [visualizer, setVisualizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [vizPlaying, setVizPlaying] = useState(false);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isPlus = user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" || user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [supportModal, setSupportModal] = useState(false);
  const [showSupportedBanner, setShowSupportedBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("supported") === "1") {
      setShowSupportedBanner(true);
      // Remove param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("supported");
      window.history.replaceState({}, "", url.toString());
      setTimeout(() => setShowSupportedBanner(false), 6000);
    }
  }, []);
  const { isFaved, toggle } = useFavorites(user?.email);

  useEffect(() => {
    if (!id) return;
    setVisualizer(null);
    setVizPlaying(false);
    Promise.all([
      base44.entities.Track.filter({ id }, "-created_date", 1).then((r) => r[0] || null),
      base44.entities.Track.filter({ status: "published" }, "-release_date", 50),
    ]).then(([t, tracks]) => {
      setTrack(t);
      setAllTracks(tracks);
      if (t) {
        base44.entities.Visualizer.filter({ linked_song_id: t.id, status: "published" }, "display_order", 1)
          .then((v) => {
            // Only set if the visualizer is explicitly linked to this exact song
            const match = v.find((viz) => viz.linked_song_id === t.id);
            if (match) setVisualizer(match);
          });
      }
      setLoading(false);
    });
  }, [id]);

  const handlePlay = (t) => {
    if (!t) return;
    if (currentTrack?.id === t.id) togglePlay();
    else { playTrack(t); recordPlay(t); }
  };

  const handleDownload = async () => {
    if (!track?.audio_url) return;
    // Record to UserDownload (no-duplicate guard inside)
    if (user) recordUserDownload(user, track).catch(() => {});
    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeName = `${track.title || "song"}${track.artist_display ? " - " + track.artist_display : ""}.mp3`.replace(/[/\\?%*:|"<>]/g, "");
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement("a");
      a.href = track.audio_url;
      a.download = `${track.title || "song"}.mp3`;
      a.target = "_self";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const isCurrentTrack = currentTrack?.id === track?.id;
  // Only use visualizer if it's explicitly linked to this exact song
  const linkedVisualizer = visualizer?.linked_song_id === track?.id ? visualizer : null;
  const embedUrl = linkedVisualizer ? toEmbedUrl(linkedVisualizer.embed_url || linkedVisualizer.video_url) : null;

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
  const releaseYear = track.release_date ? new Date(track.release_date).getFullYear() : null;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 420 }}>
        {track.cover_url && (
          <div className="absolute inset-0 scale-110"
            style={{ backgroundImage: `url(${track.cover_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(60px) brightness(0.18)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(4,4,14,0.3) 0%,rgba(4,4,14,0.95) 100%)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-10">
          <Link to="/music" className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors mb-8">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Music
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-8 items-start sm:items-end">

            {/* Album Cover */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              {track.cover_url ? (
                <img src={track.cover_url} alt={track.title}
                  className="w-52 h-52 sm:w-64 sm:h-64 rounded-2xl object-cover"
                  style={{ boxShadow: "0 8px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,229,255,0.12)" }} />
              ) : (
                <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-2xl mx-auto sm:mx-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.1),rgba(212,168,67,0.06))", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Music4 className="w-20 h-20 text-white/10" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left pb-2">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
                {freq && (
                  <span className="flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF" }}>
                    <Waves className="w-2.5 h-2.5" /> {freq}
                  </span>
                )}
                {track.album && (
                  <span className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                    <Tag className="w-2.5 h-2.5" /> {track.album}
                  </span>
                )}
                {releaseYear && (
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                    {releaseYear}
                  </span>
                )}
                {track.is_featured && (
                  <span className="text-[9px] font-black px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(212,168,67,0.2)", color: "#D4A843" }}>Featured</span>
                )}
              </div>

              <h1 className="font-heading font-black text-4xl sm:text-5xl text-white mb-2 leading-tight">{track.title}</h1>
              <p className="text-white/50 text-sm mb-5 flex items-center gap-1.5 justify-center sm:justify-start">
                <User className="w-3.5 h-3.5" /> {track.artist_display || "Upper Vibe Media"}
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <button onClick={() => handlePlay(track)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", boxShadow: "0 0 24px rgba(0,229,255,0.3)" }}>
                  {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  {isCurrentTrack && isPlaying ? "Pause" : "Play Song"}
                </button>

                {isPlus ? (
                  track.audio_url ? (
                    <button onClick={handleDownload}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 hover:scale-[1.02]"
                      style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000", boxShadow: "0 0 24px rgba(212,168,67,0.3)" }}>
                      <Download className="w-4 h-4" /> Download MP3
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm opacity-40 cursor-not-allowed"
                      style={{ border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                      <Download className="w-4 h-4" /> Coming Soon
                    </span>
                  )
                ) : (
                  <button onClick={() => setUpgradeModal(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110"
                    style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.15),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.35)", color: "#D4A843" }}>
                    <Lock className="w-4 h-4" /> Download MP3
                    <Crown className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    if (!user) { setLoginPrompt(true); return; }
                    toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url });
                  }}
                  title={isFaved("track", track.id) ? "Saved to Favorites" : "Save to Favorites"}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:scale-[1.02]"
                  style={isFaved("track", track.id) ? {
                    background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.4)", color: "#ec4899"
                  } : {
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)"
                  }}>
                  <Heart className={`w-4 h-4 ${isFaved("track", track.id) ? "fill-current" : ""}`} />
                  {isFaved("track", track.id) ? "Saved" : "Save"}
                </button>

                <button
                  onClick={() => setSupportModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.28)", color: "#D4A843" }}>
                  <Zap className="w-4 h-4" />
                  Support
                </button>
              </div>

              {!isPlus && (
                <div className="mt-4 flex items-start gap-2 max-w-sm mx-auto sm:mx-0 p-3 rounded-xl"
                  style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)" }}>
                  <Crown className="w-3.5 h-3.5 text-yellow-400/60 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/35 leading-relaxed">
                    Plus members can download every song.{" "}
                    <button onClick={() => setUpgradeModal(true)} className="text-yellow-400/70 hover:text-yellow-400 transition-colors underline underline-offset-2">
                      Upgrade to Plus
                    </button>{" "}to unlock downloads.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main content + sidebar */}
      <div className="max-w-6xl mx-auto px-6 pb-20 pt-6">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">

          {/* ── Left: main content ── */}
          <div>
            {track.description && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="mb-8 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm text-white/50 leading-relaxed">{track.description}</p>
              </motion.div>
            )}

            {/* Linked Visualizer — only shown if explicitly linked to this song */}
            {linkedVisualizer && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="mb-8">
                <h2 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
                  <Tv2 className="w-4 h-4 text-primary" /> Music Visualizer
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                    <div className="absolute inset-0">
                      {vizPlaying && embedUrl ? (
                        <iframe
                          src={`${embedUrl}?autoplay=1&rel=0`}
                          title={linkedVisualizer.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full cursor-pointer group relative" onClick={() => setVizPlaying(true)}>
                          {linkedVisualizer.thumbnail_url ? (
                            <img src={linkedVisualizer.thumbnail_url} alt={linkedVisualizer.title} className="w-full h-full object-cover" />
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
                  <div className="px-5 py-4" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <p className="text-sm font-bold text-white">{linkedVisualizer.title}</p>
                    <p className="text-xs text-white/35">{linkedVisualizer.artist || "Upper Vibe Media"}</p>
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

          {/* ── Right: More Songs sidebar ── */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <MoreSongsPanel
              currentTrackId={id}
              currentTrack={track}
              allTracks={allTracks}
              onPlay={handlePlay}
            />
          </motion.div>

        </div>
      </div>

      <Footer />
      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <SupportModal open={supportModal} onClose={() => setSupportModal(false)} track={track} />

      {/* Support success banner */}
      <AnimatePresence>
        {showSupportedBanner && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl"
            style={{ background: "linear-gradient(135deg,rgba(0,180,210,0.95),rgba(0,229,255,0.9))", color: "#000", backdropFilter: "blur(12px)" }}>
            <Zap className="w-5 h-5 fill-current" />
            <div>
              <p className="font-black text-sm">Thank you for the boost! 🙏</p>
              <p className="text-xs opacity-70">You're helping keep the vibe alive.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLoginPrompt(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-sm rounded-2xl p-7 text-center"
            style={{ background: "#0a0a1e", border: "1px solid rgba(236,72,153,0.25)" }}>
            <Heart className="w-8 h-8 text-pink-400 fill-current mx-auto mb-3" />
            <h3 className="font-heading font-black text-lg text-white mb-2">Save Your Favorites</h3>
            <p className="text-sm text-white/45 leading-relaxed mb-5">
              Create a free account to save your favorite Upper Vibe Media songs and visualizers.
            </p>
            <button onClick={() => base44.auth.redirectToLogin()}
              className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff" }}>
              Create Free Account
            </button>
            <button onClick={() => base44.auth.redirectToLogin()}
              className="mt-2 w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
              Log In
            </button>
            <button onClick={() => setLoginPrompt(false)}
              className="mt-2 w-full py-2 text-sm text-white/30 hover:text-white/60 transition-colors">
              Not now
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}