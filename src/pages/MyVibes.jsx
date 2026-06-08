import React, { useState, useEffect, useMemo } from "react";
import { getPublishedTracks } from "@/lib/trackCache";
import { isNewTrack } from "@/lib/isNewTrack";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Music4, Tv2, Play, Pause, ArrowRight, Download, Home, Sparkles, CheckCircle2 } from "lucide-react";
import NewBadge from "@/components/shared/NewBadge";
import { Link, useNavigate } from "react-router-dom";

import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavoritesContext } from "@/context/FavoritesContext";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { useSavedItemsContext } from "@/context/SavedItemsContext";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import Footer from "../components/shared/Footer";
import { useTheme } from "../context/ThemeContext";
import RecentlyPlayedRow from "@/components/home/RecentlyPlayedRow";
import DailyRitualBanner from "@/components/home/DailyRitualBanner";

export default function MyVibes() {
  const { user, isPlus, isAdmin } = useAuth();
  const { isFaved } = useFavoritesContext();
  const { savedItems, isSaved } = useSavedItemsContext();
  const [tracks, setTracks] = useState([]);
  const [visualizers, setVisualizers] = useState([]);
  const [userDownloads, setUserDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("songs");
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isPremium = isPlus || isAdmin;
  const { accent } = useTheme();
  const rgb = accent.rgb;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    Promise.all([
      getPublishedTracks("-created_date", 500),
      base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 500),
      base44.entities.UserDownload.filter({ user_id: user.id }, "-downloaded_at", 200),
    ]).then(([t, v, dl]) => {
      setTracks(t);
      setVisualizers(v);
      setUserDownloads(dl);
      setLoading(false);
    });
  }, [user]);

  // Use new SavedItem system for Songs and Visualizers tabs
  const savedTracks = useMemo(() => {
    const songIds = new Set(savedItems.filter((s) => s.itemType === "song").map((s) => s.itemId));
    return tracks.filter((t) => songIds.has(String(t.id)));
  }, [tracks, savedItems]);
  const savedVisualizers = useMemo(() => {
    const vizIds = new Set(savedItems.filter((s) => s.itemType === "visualizer").map((s) => s.itemId));
    return visualizers.filter((v) => vizIds.has(String(v.id)));
  }, [visualizers, savedItems]);

  // Downloaded tab: join UserDownload records with full track data, sorted by download date
  const downloadedTracks = useMemo(() => {
    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    return userDownloads
      .map((dl) => ({ dl, track: trackMap.get(dl.song_id) }))
      .filter(({ track }) => !!track)
      .map(({ dl, track }) => ({ ...track, _downloaded_at: dl.downloaded_at }));
  }, [userDownloads, tracks]);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  const handleDownload = (track, e) => {
    e.stopPropagation();
    navigate(`/song/${track.id}?downloadIntent=true`);
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)" }}>
            <Heart className="w-8 h-8 fill-current" style={{ color: "#9B7EFF" }} />
          </div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-white mb-4">My Vibe Library</h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed mb-8">
            Create a free account to save songs and visualizers to your My Vibe Library.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => base44.auth.redirectToLogin(window.location.origin + "/my-vibes")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: `linear-gradient(135deg,rgba(${rgb},0.8),rgba(${rgb},1))`, color: "#fff", boxShadow: `0 0 24px rgba(${rgb},0.3)` }}>
              Create Free Account
            </button>
            <button onClick={() => base44.auth.redirectToLogin(window.location.origin + "/my-vibes")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
              Log In
            </button>
          </div>
          <Link to="/music" className="mt-5 flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors">
            Browse music <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Hero */}
      <div className="relative overflow-hidden pt-20 pb-6 px-6"
        style={{ background: `linear-gradient(180deg,rgba(${rgb},0.06) 0%,transparent 100%)` }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.05] blur-[90px] pointer-events-none"
          style={{ background: `radial-gradient(circle,${accent.hex},transparent)` }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/"
              className="flex items-center gap-1.5 mb-5 text-xs font-bold tracking-wide transition-all hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              <Home className="w-4 h-4" /> Home
            </Link>
            <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-1">My Vibe Library</h1>
            <p className="font-heading font-bold mb-2 leading-snug flex items-center gap-2"
              style={{ fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)", color: `rgb(${rgb})` }}>
              Your Saved Frequency <Heart className="w-4 h-4 fill-current flex-shrink-0" />
            </p>
            <p className="text-white/35 text-sm">
              {savedTracks.length} song{savedTracks.length !== 1 ? "s" : ""} · {savedVisualizers.length} visualizer{savedVisualizers.length !== 1 ? "s" : ""}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Daily Ritual Banner ── */}
      <DailyRitualBanner user={user} />

      {/* ── Latest Music ── */}
      {tracks.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${rgb})` }} />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: `rgb(${rgb})` }}>
                Latest Music
              </span>
            </div>
            <Link to="/music"
              className="text-[10px] font-bold tracking-wide transition-opacity hover:opacity-70"
              style={{ color: `rgba(${rgb},0.5)` }}>
              See All →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {[...tracks]
              .filter(t => t.audio_url && isNewTrack(t))
              .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
              .slice(0, 4)
              .map((track, i) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <motion.div key={track.id}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex-shrink-0 group"
                  style={{ width: 130, scrollSnapAlign: "start" }}>
                  <Link to={`/song/${track.id}`}>
                    <div className="relative rounded-xl overflow-hidden mb-1.5" style={{ width: 130, height: 130 }}>
                      {track.cover_url ? (
                        <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${rgb},0.08)` }}>
                          <Music4 className="w-8 h-8" style={{ color: `rgba(${rgb},0.3)` }} />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
                        style={{ background: "rgba(0,0,0,0.45)", opacity: isCurrent ? 1 : undefined }}>
                        <button
                          onClick={(e) => { e.preventDefault(); handlePlay(track); }}
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100"
                          style={{
                            background: `linear-gradient(135deg,rgb(${rgb}),rgba(${rgb},0.8))`,
                            boxShadow: `0 0 14px rgba(${rgb},0.5)`,
                            ...(isCurrent ? { opacity: 1 } : {}),
                          }}>
                          {isCurrent && isPlaying
                            ? <Pause className="w-3.5 h-3.5 fill-current text-black" />
                            : <Play className="w-3.5 h-3.5 fill-current text-black ml-0.5" />}
                        </button>
                      </div>
                      {/* NEW badge */}
                      <div className="absolute top-1.5 left-1.5 pointer-events-none">
                        <NewBadge track={track} />
                      </div>
                    </div>
                    <p className="text-xs font-bold truncate leading-snug" style={{ color: isCurrent ? `rgb(${rgb})` : "rgba(255,255,255,0.88)" }}>{track.title}</p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{track.artist_display || "Upper Vibe Media"}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recently Played ── */}
      <div className="max-w-5xl mx-auto pt-2 pb-2">
        <RecentlyPlayedRow
          user={user}
          allTracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          handlePlayTrack={handlePlay}
          themeColor={rgb}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">

        {/* Tabs — horizontally scrollable on small screens */}
        <div className="overflow-x-auto hide-scrollbar border-b mb-6" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex gap-1 min-w-max">
            {[
              { id: "songs", label: "Songs", icon: Music4, count: savedTracks.length },
              { id: "downloaded", label: "Downloaded", icon: Download, count: downloadedTracks.length },
              { id: "visualizers", label: "Visualizers", icon: Tv2, count: savedVisualizers.length },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap"
                style={tab === t.id
                  ? { borderColor: `rgb(${rgb})`, color: `rgb(${rgb})` }
                  : { borderColor: "transparent", color: "rgba(255,255,255,0.3)" }}>
                <t.icon className="w-4 h-4 flex-shrink-0" />
                <span>{t.label}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: tab === t.id ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.07)", color: tab === t.id ? `rgb(${rgb})` : "rgba(255,255,255,0.3)" }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 rounded-full animate-spin" style={{ border: `2px solid rgba(155,126,255,0.2)`, borderTopColor: "#9B7EFF" }} />
          </div>
        ) : (
          <>
            {/* Favorite Songs Tab */}
            {tab === "songs" && (
              <AnimatePresence mode="wait">
                {savedTracks.length === 0 ? (
                  <EmptyState icon={Music4} message="No favorite songs yet." link="/music" linkLabel="Browse Music" />
                ) : (
                  <motion.div key="songs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {savedTracks.map((track, i) => {
                      const isCurrentTrack = currentTrack?.id === track.id;
                      return (
                        <motion.div key={track.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-3 p-3 rounded-2xl group transition-all"
                          style={{
                            background: isCurrentTrack ? `rgba(${rgb},0.06)` : "rgba(255,255,255,0.025)",
                            border: `1px solid ${isCurrentTrack ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.06)"}`,
                          }}>
                          {/* Cover art */}
                          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
                            {track.cover_url ? (
                              <img src={track.cover_url} alt={track.title} width={48} height={48} loading="lazy" className="w-12 h-12 rounded-xl object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: `rgba(${rgb},0.08)` }}>
                                <Music4 className="w-5 h-5" style={{ color: `rgba(${rgb},0.4)` }} />
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: "rgba(0,0,0,0.6)" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" style={{ color: `rgb(${rgb})` }} /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                            </div>
                          </div>

                          {/* Title + artist */}
                          <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white truncate">{track.title}</p>
                              <NewBadge track={track} />
                            </div>
                            <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                          </Link>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Play */}
                            <button onClick={() => handlePlay(track)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:brightness-110 active:scale-95"
                              style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.3)", color: "#00A0DC" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                            </button>

                            {/* Download */}
                            <button onClick={(e) => handleDownload(track, e)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:brightness-110 active:scale-95"
                              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
                              title={isPremium ? "Download MP3" : "Upgrade to Plus to download"}>
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Heart / unfavorite */}
                            <SaveHeartButton
                              item={track.id}
                              itemType="song"
                              meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url, audio_url: track.audio_url }}
                              size="sm"
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Downloaded Tab */}
            {tab === "downloaded" && (
              <AnimatePresence mode="wait">
                {downloadedTracks.length === 0 ? (
                  <EmptyState icon={Download} message="No downloaded songs yet." link="/music" linkLabel="Browse Music" />
                ) : (
                  <motion.div key="downloaded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {downloadedTracks.map((track, i) => {
                      const isCurrentTrack = currentTrack?.id === track.id;
                      return (
                        <motion.div key={track.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-3 p-3 rounded-2xl group transition-all"
                          style={{
                            background: isCurrentTrack ? `rgba(${rgb},0.06)` : "rgba(255,255,255,0.025)",
                            border: `1px solid ${isCurrentTrack ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.06)"}`,
                          }}>
                          {/* Cover art */}
                          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
                            {track.cover_url ? (
                              <img src={track.cover_url} alt={track.title} width={48} height={48} loading="lazy" className="w-12 h-12 rounded-xl object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: `rgba(${rgb},0.08)` }}>
                                <Music4 className="w-5 h-5" style={{ color: `rgba(${rgb},0.4)` }} />
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: "rgba(0,0,0,0.6)" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" style={{ color: `rgb(${rgb})` }} /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                            </div>
                          </div>

                          {/* Title + artist */}
                          <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white truncate">{track.title}</p>
                              <NewBadge track={track} />
                            </div>
                            <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                          </Link>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Play */}
                            <button onClick={() => handlePlay(track)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:brightness-110 active:scale-95"
                              style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.3)", color: "#00A0DC" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                            </button>

                            {/* Downloaded status */}
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ADE80" }}
                              title="Downloaded">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>

                            {/* Heart / favorite */}
                            <SaveHeartButton
                              item={track.id}
                              itemType="song"
                              meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url, audio_url: track.audio_url }}
                              size="sm"
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Favorite Visualizers Tab */}
            {tab === "visualizers" && (
              <AnimatePresence mode="wait">
                {savedVisualizers.length === 0 ? (
                  <EmptyState icon={Tv2} message="No favorite visualizers yet." link="/visualizers" linkLabel="Browse Visualizers" />
                ) : (
                  <motion.div key="vizs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedVisualizers.map((viz, i) => (
                      <motion.div key={viz.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="aspect-video relative bg-black">
                          {viz.thumbnail_url ? (
                            <img src={viz.thumbnail_url} alt={viz.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ background: "rgba(0,229,255,0.05)" }}>
                              <Tv2 className="w-8 h-8 text-white/10" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex flex-col gap-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                              <p className="text-xs text-white/40">{viz.artist || "Upper Vibe Media"}</p>
                            </div>
                            <SaveHeartButton
                             item={viz.id}
                             itemType="visualizer"
                             meta={{ title: viz.title, artist: viz.artist, cover_url: viz.thumbnail_url }}
                             size="sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Link to="/visualizers"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                              style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)", color: "#9B7EFF" }}>
                              <Play className="w-3 h-3" /> Watch
                            </Link>
                            {viz.linked_song_id && (
                              <Link to={`/song/${viz.linked_song_id}`}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                                View Song
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

function EmptyState({ icon: Icon, message, link, linkLabel }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center">
      <Icon className="w-12 h-12 text-white/10 mx-auto mb-4" />
      <p className="text-white/25 font-medium mb-2">{message}</p>
      <p className="text-white/15 text-sm mb-6">Hit the heart icon on any item to save it here.</p>
      <Link to={link}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
        style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.2)", color: "#9B7EFF" }}>
        {linkLabel} <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}