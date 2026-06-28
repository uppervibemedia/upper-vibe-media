import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Download, Play, Pause, Waves, Lock, Crown, Music4,
  Tv2, ChevronLeft, Tag, User, Heart, Zap

} from "lucide-react";
import FreqBadge from "@/components/shared/FreqBadge";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import SupportModal from "../components/shared/SupportModal";
import ShareVibeButton from "../components/shared/ShareVibeButton";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import { recordPlay } from "../components/home/DiscoverTab";
import { recordUserDownload, triggerBrowserDownload, isRestrictedInAppBrowser, logDownloadEnv } from "@/lib/downloadService";
import InAppBrowserDownloadModal from "../components/shared/InAppBrowserDownloadModal";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getPublishedTracks } from "@/lib/trackCache";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import IOSTip from "@/components/shared/iOSTip";
import NewBadge from "@/components/shared/NewBadge";
import StreamingPlatformLinks from "@/components/shared/StreamingPlatformLinks";
import CoverImage from "@/components/shared/CoverImage";
import PageErrorBoundary from "@/components/shared/PageErrorBoundary";

function toEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function MoreSongsPanel({ currentTrackId, currentTrack, allTracks, onPlay }) {
  const { accentId: mspAccentId } = useTheme();
  const mspTheme = RADIO_THEMES[mspAccentId] || RADIO_THEMES.cyan;
  const mspRtp = mspTheme.vars["--rt-primary"];

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
        <Music4 className="w-4 h-4" style={{ color: `rgb(${mspRtp})` }} /> More Songs
      </h3>
      <div className="space-y-2">
        {related.map((song) => (
          <div key={song.id}
            className="flex items-center gap-3 p-2.5 rounded-2xl group cursor-pointer transition-all hover:border-white/15"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            onClick={() => onPlay(song)}>
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
              <CoverImage
                src={song.cover_url}
                alt={song.title}
                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                iconClassName="w-5 h-5"
                fallbackOpacityClass="text-white/20"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link to={`/song/${song.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-bold text-white leading-snug line-clamp-2 block transition-colors"
                style={{ ["--hover-color"]: `rgb(${mspRtp})` }}
                onMouseEnter={e => e.currentTarget.style.color = `rgb(${mspRtp})`}
                onMouseLeave={e => e.currentTarget.style.color = ""}>
                {song.title}
              </Link>
              <p className="text-[10px] text-white/35 truncate mt-0.5">{song.artist_display || "Upper Vibe Media"}</p>
              <FreqBadge label="432 Hz" color={mspRtp} className="mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SongPageInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [allTracks, setAllTracks] = useState([]);
  const [visualizer, setVisualizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [vizPlaying, setVizPlaying] = useState(false);
  const [downloadIntent, setDownloadIntent] = useState(false);
  // Determine origin from URL param — captured once at mount via useState initializer
  const [songOrigin] = useState(() => new URLSearchParams(window.location.search).get("source") || "");
  const [returnPath] = useState(() => new URLSearchParams(window.location.search).get("returnPath") || "");
  const CITY_ORIGINS = ["upperVibeCity", "djSongCard", "stage", "cityMusicLibrary"];
  const [showCityReturn] = useState(() => {
    const src = new URLSearchParams(window.location.search).get("source") || "";
    const legacyCity = (() => { try { return sessionStorage.getItem("vibeworld_return") === "1"; } catch { return false; } })();
    return legacyCity || CITY_ORIGINS.includes(src);
  });
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user, isPlus: isAuthPlus, isAdmin: isAuthAdmin } = useAuth();
  const isPlus = isAuthPlus || isAuthAdmin;
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [supportModal, setSupportModal] = useState(false);
  const [showSupportedBanner, setShowSupportedBanner] = useState(false);
  const [inAppBrowserModal, setInAppBrowserModal] = useState(false);
  const [downloadIntentActive, setDownloadIntentActive] = useState(false);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = radioTheme.vars["--rt-primary"];    // e.g. "0,229,255"
  const rts = radioTheme.vars["--rt-secondary"];  // e.g. "155,126,255"
  // Fixed colors (independent of theme)
  const CYAN    = "0,160,220";      // electric blue — Support + Share default
  const PURPLE  = "91,33,182";      // deep violet — Save/heart
  const AMBER   = "212,168,67";     // midnight amber — music buttons

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("supported") === "1") {
      setShowSupportedBanner(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("supported");
      window.history.replaceState({}, "", url.toString());
      setTimeout(() => setShowSupportedBanner(false), 6000);
    }
    if (params.get("downloadIntent") === "true") {
      setDownloadIntentActive(true);
      // Clean param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("downloadIntent");
      window.history.replaceState({}, "", url.toString());
      // Scroll to Download button after page settles
      setTimeout(() => {
        const el = document.getElementById("download-btn");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 800);
      // Remove pulse after 5s
      setTimeout(() => setDownloadIntentActive(false), 5000);
    }
  }, []);
  // Scroll to top whenever the song changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setVisualizer(null);
    setVizPlaying(false);
    Promise.all([
      base44.entities.Track.filter({ id }, "-created_date", 1).then((r) => r[0] || null),
      getPublishedTracks("-release_date", 500),
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

    logDownloadEnv(track.id, isPlus);

    // Block restricted in-app browsers (TikTok, Instagram, Facebook) before any URL navigation
    if (isRestrictedInAppBrowser()) {
      setInAppBrowserModal(true);
      return;
    }

    if (user) recordUserDownload(user, track).catch(() => {});
    const filename = `${track.title || "song"}${track.artist_display ? " - " + track.artist_display : ""}`;
    const result = await triggerBrowserDownload(track.id, filename);
    if (result === "blob") {
      toast.success("Download started");
    } else if (result === "restricted_browser") {
      setInAppBrowserModal(true);
    } else {
      toast.error("Download failed. Please try again.");
    }
  };

  // ── Dynamic OG / page meta ───────────────────────────────────────────────
  const artist = track?.artist_display || "Upper Vibe Media";
  const freq   = track?.frequency_type === "432hz" ? "432 Hz" : track?.frequency_type === "528hz" ? "528 Hz" : "";
  usePageMeta(track ? {
    title:       `${track.title} by ${artist}`,
    description: `Stream "${track.title}" on Upper Vibe Media. 432 Hz high-vibe music.`,
    imageUrl:    track.cover_url || undefined,
    pageUrl:     `https://uppervibemedia.com/song/${id}`,
    type:        "music.song",
  } : null);

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

  const releaseYear = track.release_date ? new Date(track.release_date).getFullYear() : null;

  return (
    <div className="min-h-screen">
      {/* ── Header area — tight, above-the-fold on all devices ── */}
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            onClick={() => {
              // If a specific return path was passed, use it
              if (returnPath) {
                navigate(returnPath);
              } else if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/music");
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors active:scale-95">
            <ChevronLeft className="w-3.5 h-3.5" />
            {songOrigin === "myVibeRadio" ? "Back to My Vibe Radio"
              : songOrigin === "upperVibeRadio" ? "Back to Radio"
              : songOrigin === "musicLibrary" ? "Back to Music"
              : songOrigin === "home" ? "Back to Home"
              : "Back"}
          </button>
          {showCityReturn && (
            <button
              onClick={() => {
                let returnUrl = "/vibe-world";
                try {
                  const saved = sessionStorage.getItem("vibeworld_return_url");
                  if (saved) returnUrl = saved;
                  sessionStorage.removeItem("vibeworld_return");
                  sessionStorage.removeItem("vibeworld_return_url");
                } catch {}
                navigate(returnUrl.replace(window.location.origin, "") || "/vibe-world");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,rgba(0,184,212,0.2),rgba(155,126,255,0.15))",
                border: "1px solid rgba(0,212,240,0.3)",
                color: "#00D4F0",
              }}
            >
              🌆 Back to Upper Vibe City
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout: streaming-platform style */}
      {/* v4 — compact above-the-fold, desktop side-by-side */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row gap-5 md:gap-8">

          {/* ── Left: Cover Art (fixed square ratio) ── */}
          <div className="flex-shrink-0 mx-auto md:mx-0 w-[180px] sm:w-[240px] md:w-[280px] lg:w-[320px]">
            <div className="relative aspect-square">
              <motion.div
                animate={{ scale: [1, 1.02, 1], opacity: [0.25, 0.75, 0.25] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ border: `2px solid rgb(${rtp})`, boxShadow: `0 0 24px rgba(${rtp},0.4)` }}
              />
              <CoverImage
                src={track.cover_url}
                alt={track.title}
                className="relative z-10 rounded-2xl overflow-hidden w-full h-full"
                eager
                iconClassName="w-14 h-14"
                fallbackOpacityClass="text-white/10"
                fallbackBgClass="bg-gradient-to-br from-cyan-400/10 to-amber-400/6 border border-white/10"
              />
            </div>
          </div>

          {/* ── Right: Info + Controls ── */}
          <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mb-2.5">
              {freq && <FreqBadge label={freq} color={rtp} />}
              {track.album && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                  <Tag className="w-2.5 h-2.5" /> {track.album}
                </span>
              )}
              {releaseYear && (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                  {releaseYear}
                </span>
              )}
              {track.is_featured && (
                <span className="text-[9px] font-black px-2 py-1 rounded-full"
                  style={{ background: "rgba(212,168,67,0.2)", color: "#D4A843" }}>Featured</span>
              )}
              <NewBadge track={track} />
            </div>

            <h1 className="font-heading font-black text-white mb-1 leading-tight"
              style={{ fontSize: "clamp(1.3rem, 3vw, 2.2rem)", wordBreak: "break-word" }}>
              {track.title}
            </h1>
            <p className="text-white/40 text-sm mb-4 flex items-center gap-1.5 justify-center md:justify-start">
              <User className="w-3 h-3" /> {track.artist_display || "Upper Vibe Media"}
            </p>

            {/* Action buttons */}
            <div className="space-y-2">
              {/* Row 1: Play + Download */}
              <div className="flex gap-2.5 justify-center md:justify-start">
                <button onClick={() => handlePlay(track)}
                  className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{ background: `linear-gradient(135deg,rgba(${rtp},0.8),rgb(${rtp}))`, color: "#000", boxShadow: `0 0 20px rgba(${rtp},0.25)` }}>
                  {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  {isCurrentTrack && isPlaying ? "Pause" : "Play"}
                </button>

                {isPlus ? (
                  track.audio_url ? (
                    <div className="relative">
                      {downloadIntentActive && (
                        <p className="absolute -top-5 left-0 right-0 text-center text-[10px] font-black tracking-wide text-yellow-400 whitespace-nowrap">
                          Tap to save ↓
                        </p>
                      )}
                      <button id="download-btn" onClick={handleDownload}
                        className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                        style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000", boxShadow: downloadIntentActive ? "0 0 0 2px rgba(212,168,67,0.5), 0 0 20px rgba(212,168,67,0.4)" : "0 0 16px rgba(212,168,67,0.25)", animation: downloadIntentActive ? "pulse-glow 1.2s ease-in-out infinite" : "none" }}>
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 py-2.5 px-5 rounded-xl font-black text-sm opacity-40 cursor-not-allowed"
                      style={{ border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                      <Download className="w-4 h-4" /> Soon
                    </span>
                  )
                ) : (
                  <button onClick={() => { setDownloadIntentActive(false); setUpgradeModal(true); }}
                    className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.15),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.35)", color: "#D4A843" }}>
                    <Lock className="w-4 h-4" /> Download
                    <Crown className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Row 2: Save + Share + Support */}
              <div className="flex gap-2.5 justify-center md:justify-start items-center">
                <SaveHeartButton
                  item={track.id}
                  itemType="song"
                  meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url, audio_url: track.audio_url }}
                  size="md"
                  onNeedLogin={() => setLoginPrompt(true)}
                />
                <ShareVibeButton type="song" track={track} size="sm" />
                <button onClick={() => setSupportModal(true)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-black text-xs tracking-wide transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{ background: `rgba(${CYAN},0.12)`, border: `1px solid rgba(${CYAN},0.3)`, color: `rgb(${CYAN})` }}>
                  <Zap className="w-3.5 h-3.5" /> Support
                </button>
              </div>
            </div>

            {!isPlus && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl"
                style={{ background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.12)" }}>
                <Crown className="w-3 h-3 text-yellow-400/50 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Plus members can download every song.{" "}
                  <button onClick={() => setUpgradeModal(true)} className="text-yellow-400/60 hover:text-yellow-400 transition-colors underline underline-offset-2">
                    Upgrade to Plus
                  </button>{" "}to unlock downloads.
                </p>
              </div>
            )}

            {/* Streaming links — in-column on desktop, below on mobile */}
            <div className="mt-3">
              <StreamingPlatformLinks track={track} mode="song" />
            </div>

            {/* Short description — in-column when available */}
            {track.description && (
              <p className="mt-3 text-xs text-white/35 leading-relaxed line-clamp-3">{track.description}</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Visualizer, Lyrics, Full Description (below fold) ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-20">

        {/* ── Full description (if truncated above) ── */}
        {track.description && track.description.length > 200 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-white/50 leading-relaxed">{track.description}</p>
          </motion.div>
        )}

        {(linkedVisualizer || track.lyrics) && (
          <div className="mb-6">

            {/* Linked Visualizer */}
            {linkedVisualizer && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="mb-6">
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
                              style={{ background: "linear-gradient(135deg,rgba(0,160,220,0.07),rgba(0,0,0,0.5))" }}>
                              <Tv2 className="w-12 h-12 text-white/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.4)" }}>
                            <div className="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                              style={{ background: `linear-gradient(135deg,rgba(${rtp},0.8),rgb(${rtp}))`, boxShadow: `0 0 32px rgba(${rtp},0.4)` }}>
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
                className="mb-6">
                <h2 className="font-heading font-bold text-lg text-white mb-4">Lyrics</h2>
                <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <pre className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap font-body">{track.lyrics}</pre>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Nav links: All Visualizers / All Music ── */}
        <div className="flex gap-3 flex-wrap mt-5 mb-8">
          <Link to="/visualizers"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: `rgba(${rtp},0.08)`, border: `1px solid rgba(${rtp},0.2)`, color: `rgb(${rtp})` }}>
            <Tv2 className="w-3.5 h-3.5" /> All Visualizers
          </Link>
          <Link to="/music"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: `rgba(${AMBER},0.08)`, border: `1px solid rgba(${AMBER},0.25)`, color: `rgb(${AMBER})` }}>
            <Music4 className="w-3.5 h-3.5" /> All Music
          </Link>
        </div>

        {/* ── More Songs ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <MoreSongsPanel
            currentTrackId={id}
            currentTrack={track}
            allTracks={allTracks}
            onPlay={handlePlay}
          />
        </motion.div>

      </div>

      <Footer />
      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <SupportModal open={supportModal} onClose={() => setSupportModal(false)} track={track} />
      <InAppBrowserDownloadModal
        open={inAppBrowserModal}
        onClose={() => setInAppBrowserModal(false)}
        songUrl={`https://uppervibemedia.com/song/${id}`}
      />
      <IOSTip trigger="always" />



      {/* Support success banner */}
      <AnimatePresence>
        {showSupportedBanner && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl"
            style={{ background: "linear-gradient(135deg,rgba(0,120,175,0.95),rgba(0,160,220,0.9))", color: "#fff", backdropFilter: "blur(12px)" }}>
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
            style={{ background: "#0a0a1e", border: `1px solid rgba(${PURPLE},0.25)` }}>
            <Heart className="w-8 h-8 fill-current mx-auto mb-3" style={{ color: `rgb(${PURPLE})` }} />
            <h3 className="font-heading font-black text-lg text-white mb-2">Save Your Favorites</h3>
            <p className="text-sm text-white/45 leading-relaxed mb-5">
              Create a free account to save your favorite Upper Vibe Media songs and visualizers.
            </p>
            <button onClick={() => base44.auth.redirectToLogin()}
              className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: `linear-gradient(135deg,rgba(${PURPLE},0.7),rgb(${PURPLE}))`, color: "#fff" }}>
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

export default function SongPage() {
  return (
    <PageErrorBoundary>
      <SongPageInner />
    </PageErrorBoundary>
  );
}