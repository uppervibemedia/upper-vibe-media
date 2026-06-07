import React, { useState, useEffect, useMemo } from "react";
import { getPublishedTracks } from "@/lib/trackCache";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Music4, Tv2, Play, Pause, Waves, ArrowRight,
  Download, Clock, UserCircle2
} from "lucide-react";
import NewBadge from "@/components/shared/NewBadge";
import ShareVibeButton from "@/components/shared/ShareVibeButton";
import DashboardHeader from "@/components/myvibes/DashboardHeader";
import DownloadsTab from "@/components/myvibes/DownloadsTab";
import RecentActivityTab from "@/components/myvibes/RecentActivityTab";
import { Link, useNavigate } from "react-router-dom";

import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../hooks/useFavorite";
import Footer from "../components/shared/Footer";
import { useTheme } from "../context/ThemeContext";

const TABS = [
  { id: "songs",      label: "Saved Songs",    icon: Music4 },
  { id: "visualizers",label: "Saved Videos",   icon: Tv2 },
  { id: "downloads",  label: "My Downloads",   icon: Download },
  { id: "activity",   label: "Recent Activity",icon: Clock },
];

export default function MyVibes() {
  const { user, isPlus, isAdmin } = useAuth();
  const { isFaved, toggle } = useFavorites(user?.email);
  const [tracks, setTracks] = useState([]);
  const [visualizers, setVisualizers] = useState([]);
  const [downloadCount, setDownloadCount] = useState(0);
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
      user?.id ? base44.entities.UserDownload.filter({ user_id: user.id }, "-downloaded_at", 1) : Promise.resolve([]),
    ]).then(([t, v, d]) => {
      setTracks(t);
      setVisualizers(v);
      setDownloadCount(d.length > 0 ? d[0]?.count ?? d.length : 0);
      setLoading(false);
    });
    // Get accurate download count
    if (user?.id) {
      base44.entities.UserDownload.filter({ user_id: user.id }, "-downloaded_at", 200)
        .then(d => setDownloadCount(d.length))
        .catch(() => {});
    }
  }, [user]);

  const savedTracks = useMemo(() => tracks.filter((t) => isFaved("track", t.id)), [tracks, isFaved]);
  const savedVisualizers = useMemo(() => visualizers.filter((v) => isFaved("visualizer", v.id)), [visualizers, isFaved]);

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
            <UserCircle2 className="w-8 h-8" style={{ color: "#9B7EFF" }} />
          </div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-white mb-4">Member Dashboard</h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed mb-8">
            Log in to access your saved songs, downloads, and listening history.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => base44.auth.redirectToLogin(window.location.origin + "/my-vibes")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: `linear-gradient(135deg,rgba(${rgb},0.8),rgba(${rgb},1))`, color: "#fff", boxShadow: `0 0 24px rgba(${rgb},0.3)` }}>
              Log In
            </button>
            <button
              onClick={() => base44.auth.redirectToLogin(window.location.origin + "/my-vibes")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
              Create Free Account
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

  const tabCounts = {
    songs: savedTracks.length,
    visualizers: savedVisualizers.length,
    downloads: downloadCount,
    activity: null,
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        user={user}
        savedCount={savedTracks.length}
        downloadCount={downloadCount}
        isPlus={isPlus}
        isAdmin={isAdmin}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        {/* Tab nav */}
        <div
          className="flex gap-1 overflow-x-auto hide-scrollbar border-b mb-8 -mx-4 sm:mx-0 px-4 sm:px-0"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap flex-shrink-0"
              style={tab === t.id
                ? { borderColor: `rgb(${rgb})`, color: `rgb(${rgb})` }
                : { borderColor: "transparent", color: "rgba(255,255,255,0.3)" }}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[t.label.split(" ").length - 1]}</span>
              {tabCounts[t.id] !== null && tabCounts[t.id] !== undefined && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                  style={{
                    background: tab === t.id ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.07)",
                    color: tab === t.id ? `rgb(${rgb})` : "rgba(255,255,255,0.3)",
                  }}
                >
                  {tabCounts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 rounded-full animate-spin"
              style={{ border: `2px solid rgba(${rgb},0.2)`, borderTopColor: `rgb(${rgb})` }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── Saved Songs ── */}
            {tab === "songs" && (
              <motion.div key="songs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {savedTracks.length === 0 ? (
                  <EmptyState icon={Music4} message="No saved songs yet." link="/music" linkLabel="Browse Music" rgb={rgb} />
                ) : (
                  <div className="space-y-2">
                    {savedTracks.map((track, i) => {
                      const isCurrentTrack = currentTrack?.id === track.id;
                      return (
                        <motion.div key={track.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                          style={{
                            background: isCurrentTrack ? `rgba(${rgb},0.06)` : "rgba(255,255,255,0.025)",
                            border: `1px solid ${isCurrentTrack ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.06)"}`,
                          }}>
                          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
                            {track.cover_url ? (
                              <img src={track.cover_url} alt={track.title} width={48} height={48} loading="lazy" className="w-12 h-12 rounded-xl object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `rgba(${rgb},0.08)` }}>
                                <Music4 className="w-5 h-5" style={{ color: `rgba(${rgb},0.4)` }} />
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.6)" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" style={{ color: `rgb(${rgb})` }} /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                            </div>
                          </div>

                          <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white truncate">{track.title}</p>
                              <NewBadge track={track} />
                            </div>
                            <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: "rgba(0,160,220,0.1)", color: "#00A0DC" }}>
                                <Waves className="w-2.5 h-2.5" /> 432 Hz
                              </span>
                            </div>
                          </Link>

                          {track.duration && <p className="text-xs text-white/25 hidden sm:block flex-shrink-0">{track.duration}</p>}

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => handlePlay(track)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                              style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.3)", color: "#00A0DC" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                              <span className="hidden sm:inline">{isCurrentTrack && isPlaying ? "Pause" : "Play"}</span>
                            </button>
                            <button onClick={(e) => handleDownload(track, e)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                              <Download className="w-3 h-3" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                            <ShareVibeButton type="song" track={track} size="sm" />
                            <button onClick={() => toggle("track", track.id)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.3)", color: "#9B7EFF" }}
                              title="Remove from Saved">
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Saved Visualizers ── */}
            {tab === "visualizers" && (
              <motion.div key="visualizers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {savedVisualizers.length === 0 ? (
                  <EmptyState icon={Tv2} message="No saved visualizers yet." link="/visualizers" linkLabel="Browse Visualizers" rgb={rgb} />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                            <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(0,229,255,0.05)" }}>
                              <Tv2 className="w-8 h-8 text-white/10" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                              <p className="text-xs text-white/40">{viz.artist || "Upper Vibe Media"}</p>
                            </div>
                            <button onClick={() => toggle("visualizer", viz.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                              style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.3)", color: "#9B7EFF" }}
                              title="Remove from Saved">
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                          <div className="flex gap-2 flex-wrap">
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
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Downloads Tab ── */}
            {tab === "downloads" && (
              <motion.div key="downloads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DownloadsTab user={user} isPlus={isPlus} isAdmin={isAdmin} />
              </motion.div>
            )}

            {/* ── Recent Activity Tab ── */}
            {tab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RecentActivityTab user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <Footer />
    </div>
  );
}

function EmptyState({ icon: Icon, message, link, linkLabel, rgb }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center">
      <Icon className="w-12 h-12 text-white/10 mx-auto mb-4" />
      <p className="text-white/25 font-medium mb-2">{message}</p>
      <p className="text-white/15 text-sm mb-6">Hit the heart icon on any item to save it here.</p>
      <Link to={link}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
        style={{ background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}>
        {linkLabel} <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}