/**
 * Radio.jsx — Upper Vibe Media
 *
 * All audio is controlled through radioAudioManager (one audio element, one source of truth).
 * This component only reads state and sends commands — never touches audio directly.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Radio as RadioIcon, AudioLines, Music4, Sparkles,
  SkipForward, SkipBack, Heart, ThumbsDown, Download, Lock,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "@/hooks/useFavorite";
import { hasPlusAccess } from "@/lib/tierAccess";
import RadioThemePicker, { useRadioTheme, getPulseEnabled, setPulseEnabled } from "../components/radio/RadioThemePicker";
import RadioVisualizer, { MODES } from "../components/radio/RadioVisualizer";
import usePageVisible from "../hooks/usePageVisible";
import IOSTip from "../components/shared/iOSTip";
import TrendingLiveSection from "../components/radio/TrendingLiveSection";
import { Link, useNavigate } from "react-router-dom";
import SongMiniSheet from "@/components/radio/SongMiniSheet";
import {
  subscribe as ramSubscribe,
  getState as ramGetState,
  playUpperVibeRadio,
  pauseUpperVibeRadio,
  resumeUpperVibeRadio,
  playMyVibeTrack,
  pauseMyVibe,
  recoverMyVibeRadioPlayback,
  getAudioElementRef,
  setMyVibeCallbacks,
} from "@/lib/radioAudioManager";
import { useRadio } from "../context/RadioContext";
import { usePlayer } from "../context/PlayerContext";
import { base44 } from "@/api/base44Client";

const NOW_PLAYING_URL = "https://s5.citrus3.com:2020/json/stream/upperviberadio";
const VIZ_PREF_KEY = "uvm_radio_viz_v9";
const TAB_KEY = "uvm_radio_tab";

const getSavedMode = () => { try { return localStorage.getItem(VIZ_PREF_KEY) || "spectrum"; } catch { return "spectrum"; } };
const getSavedTab = () => { try { return localStorage.getItem(TAB_KEY) || "live"; } catch { return "live"; } };

const LIVE_BADGES = ["Live 24/7", "432 Hz", "High Vibe Music", "Shared Stream"];
const MYVIBE_BADGES = ["Personalized", "432 Hz", "High Vibe Music", "Built for You"];

// Stable audio element ref for visualizer (doesn't change)
const VIZ_AUDIO_REF = getAudioElementRef();

export default function RadioPage() {
  const [activeTab, setActiveTab] = useState(getSavedTab);
  const [vizMode, setVizMode] = useState(getSavedMode);
  const [pulseOn, setPulseOn] = useState(getPulseEnabled);
  const { themeId, theme, applyTheme } = useRadioTheme();
  const isPageVisible = usePageVisible();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPlus = hasPlusAccess(user);

  const { isFaved, toggle: toggleFav } = useFavorites(user?.id, user?.email);

  // ── RadioAudioManager state ───────────────────────────────────────────────
  const [ramState, setRamState] = useState(ramGetState);

  // Log on Radio page mount to confirm My Vibe state survived city navigation
  useEffect(() => {
    const s = ramGetState();
    console.log("[Radio] 📻 Radio page mounted | mode:", s.activeMode, "| track:", s.currentTrack?.title || "none", "| playing:", s.isPlaying, "| intended:", s.intendedToPlay);
  }, []);

  useEffect(() => {
    const unsub = ramSubscribe((state) => {
      setRamState(state);
    });
    return unsub;
  }, []);

  // ── RadioContext (queue/curator) ──────────────────────────────────────────
  const {
    currentRadioSong,
    nextRadioSong,
    handleNextNatural,
    prevRadioSong,
    hasPrev,
    curatorRecordLike,
    allTracks,
    startMyVibeQueue,
    tracksLoaded,
  } = useRadio();
  const playerCtx = usePlayer();

  // Wire RadioContext callbacks to RadioAudioManager
  useEffect(() => {
    setMyVibeCallbacks({
      onEnded: (track) => {
        console.log("[Radio] My Vibe track ended naturally:", track?.title);
        // Natural end — use handleNextNatural (fromSkip=false) so host drop logic fires
        if (handleNextNatural) handleNextNatural();
        else nextRadioSong(); // fallback
      },
      onError: (track) => {
        console.warn("[Radio] My Vibe track error:", track?.title, "→ skip");
        nextRadioSong(); // error = skip signal
      },
    });
  }, [nextRadioSong, handleNextNatural]);

  // When RadioContext picks a new song (from queue advance), play it via RAM
  const prevSongIdRef = useRef(null);
  useEffect(() => {
    if (!currentRadioSong) return;
    if (currentRadioSong.id === prevSongIdRef.current) return;
    prevSongIdRef.current = currentRadioSong.id;

    // Only auto-play if we're in myVibeRadio mode and intendedToPlay
    const s = ramGetState();
    if (s.activeMode === "myVibeRadio" && s.intendedToPlay) {
      console.log("[Radio] Auto-advancing to next My Vibe song:", currentRadioSong.title);
      playMyVibeTrack(currentRadioSong);
    }
  }, [currentRadioSong]);

  // ── Now Playing poll (live radio metadata) ────────────────────────────────
  const [nowPlaying, setNowPlaying] = useState(null);
  useEffect(() => {
    const fetchNP = async () => {
      try {
        const res = await fetch(NOW_PLAYING_URL);
        const data = await res.json();
        if (data?.nowplaying) {
          const parts = data.nowplaying.split(" - ");
          const artist = parts.length > 1 ? parts[0] : "";
          const title = parts.length > 1 ? parts.slice(1).join(" - ") : parts[0];
          setNowPlaying({ title, artist, coverart: data.coverart || null });
        }
      } catch {}
    };
    fetchNP();
    const iv = setInterval(fetchNP, 10000);
    return () => clearInterval(iv);
  }, []);

  // ── Per-track feedback state ──────────────────────────────────────────────
  const [playLessIds, setPlayLessIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("uvm_play_less") || "[]"); } catch { return []; }
  });
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("uvm_radio_saved") || "[]"); } catch { return []; }
  });

  const myVibeTrack = ramState.activeMode === "myVibeRadio" ? ramState.currentTrack : currentRadioSong;
  const isLiked = myVibeTrack ? isFaved("track", myVibeTrack.id) : false;
  const isPlayLess = myVibeTrack ? playLessIds.includes(myVibeTrack.id) : false;
  const isSaved = myVibeTrack ? savedIds.includes(myVibeTrack.id) : false;

  const handleLike = useCallback(async () => {
    if (!myVibeTrack || !user) return;
    const nowLiked = !isLiked;
    await toggleFav("track", myVibeTrack.id, {
      title: myVibeTrack.title,
      artist: myVibeTrack.artist_display,
      cover_url: myVibeTrack.cover_url,
    });
    curatorRecordLike(myVibeTrack.id, nowLiked);
  }, [myVibeTrack, isLiked, toggleFav, curatorRecordLike, user]);

  const handleSave = useCallback(async () => {
    if (!myVibeTrack || !user) return;
    const id = myVibeTrack.id;
    const next = isSaved ? savedIds.filter((x) => x !== id) : [...savedIds, id];
    setSavedIds(next);
    try { localStorage.setItem("uvm_radio_saved", JSON.stringify(next)); } catch {}
    curatorRecordLike(myVibeTrack.id, !isSaved);
  }, [myVibeTrack, isSaved, savedIds, curatorRecordLike, user]);

  // Combined like+save: pressing heart also saves the track
  const handleLikeAndSave = useCallback(async () => {
    if (!myVibeTrack || !user) return;
    await handleLike();
    // Also save if not already saved
    if (!isSaved) await handleSave();
  }, [myVibeTrack, user, handleLike, handleSave, isSaved]);

  const handlePlayLess = useCallback(() => {
    if (!myVibeTrack) return;
    const id = myVibeTrack.id;
    const already = playLessIds.includes(id);
    const next = already ? playLessIds.filter((x) => x !== id) : [...playLessIds, id];
    setPlayLessIds(next);
    try { localStorage.setItem("uvm_play_less", JSON.stringify(next)); } catch {}
    import("@/lib/radioCurator").then(({ recordDislike }) => {
      recordDislike(id, !already, allTracks);
    });
    if (!already) {
      setTimeout(() => {
        console.log("[Radio] Play Less → skipping to next");
        nextRadioSong();
      }, 600);
    }
  }, [myVibeTrack, playLessIds, allTracks, nextRadioSong]);

  const handleSkip = useCallback(() => {
    console.log("[Radio] Skip button pressed");
    nextRadioSong();
  }, [nextRadioSong]);

  // ── Tab switching (cosmetic only — does not touch audio) ──────────────────
  const switchTab = useCallback((tab) => {
    if (tab === activeTab) return;
    console.log("[Radio] Tab switched to:", tab);
    setActiveTab(tab);
    try { localStorage.setItem(TAB_KEY, tab); } catch {}
  }, [activeTab]);

  // ── Upper Vibe Radio controls ─────────────────────────────────────────────
  const handleLiveToggle = useCallback(() => {
    const s = ramGetState();
    const isLivePlaying = s.activeMode === "upperVibeRadio" && s.isPlaying;
    const isLiveIntended = s.activeMode === "upperVibeRadio" && s.intendedToPlay;

    console.log("[Radio] handleLiveToggle | mode:", s.activeMode, "isPlaying:", s.isPlaying, "intended:", s.intendedToPlay);

    if (isLivePlaying || isLiveIntended) {
      pauseUpperVibeRadio();
    } else if (s.activeMode === "upperVibeRadio" && !s.intendedToPlay) {
      // Paused in live mode — resume
      resumeUpperVibeRadio();
    } else {
      // Fresh start or switching from myVibe — must call in gesture
      playUpperVibeRadio();
    }
  }, []);

  // ── My Vibe Radio controls ────────────────────────────────────────────────
  const handleMyVibeToggle = useCallback(() => {
    const s = ramGetState();
    console.log("[Radio] handleMyVibeToggle | mode:", s.activeMode, "isPlaying:", s.isPlaying, "intended:", s.intendedToPlay);

    if (s.activeMode === "myVibeRadio" && s.isPlaying) {
      pauseMyVibe();
      return;
    }

    playerCtx?.stopPlaying?.();

    if (s.activeMode === "myVibeRadio" && !s.isPlaying && s.currentTrack) {
      recoverMyVibeRadioPlayback(s.currentTrack);
      return;
    }

    // Switching from live or fresh start
    // Must start playback synchronously (gesture) — get the track first
    const track = currentRadioSong || s.lastTrack;
    if (track) {
      console.log("[Radio] Starting My Vibe with existing song:", track.title);
      playMyVibeTrack(track);
    } else if (tracksLoaded && allTracks.length > 0) {
      // No current song — ask RadioContext to pick one, then play it
      console.log("[Radio] Starting My Vibe — initializing queue");
      startMyVibeQueue((firstTrack) => {
        if (firstTrack) playMyVibeTrack(firstTrack);
      });
    } else {
      console.warn("[Radio] My Vibe — no tracks loaded yet");
    }
  }, [currentRadioSong, tracksLoaded, allTracks, startMyVibeQueue, playerCtx]);

  // ── When nextRadioSong is called externally (skip/end), pick new song from RAM ──
  // RadioContext's nextRadioSong updates currentRadioSong → the useEffect above fires playMyVibeTrack

  // ── Song mini-sheet ───────────────────────────────────────────────────────
  const [sheetTrack, setSheetTrack] = useState(null);
  const [sheetDownloadIntent, setSheetDownloadIntent] = useState(false);
  const openSheet = useCallback((track, downloadIntent = false) => {
    setSheetTrack(track);
    setSheetDownloadIntent(downloadIntent);
  }, []);
  const closeSheet = useCallback(() => {
    setSheetTrack(null);
    setSheetDownloadIntent(false);
  }, []);

  const handleTogglePulse = (v) => { setPulseOn(v); setPulseEnabled(v); };
  const handleCycleMode = (next) => {
    setVizMode(next);
    try { localStorage.setItem(VIZ_PREF_KEY, next); } catch {}
  };
  const currentModeObj = MODES.find(m => m.id === vizMode) || MODES[0];

  // Derived display state
  const liveIsPlaying = ramState.activeMode === "upperVibeRadio" && ramState.isPlaying;
  const liveIsLoading = ramState.activeMode === "upperVibeRadio" && ramState.audioStatus === "loading";
  const liveError = ramState.activeMode === "upperVibeRadio" ? ramState.lastError : null;
  const myVibeIsPlaying = ramState.activeMode === "myVibeRadio" && ramState.isPlaying;
  const anyPlaying = ramState.isPlaying;

  const p = theme.vars["--rt-primary"];
  const themeStyle = Object.entries(theme.vars).reduce((acc, [k, v]) => { acc[k] = v; return acc; }, { WebkitOverflowScrolling: "touch" });
  const badges = activeTab === "live" ? LIVE_BADGES : MYVIBE_BADGES;

  return (
    <div className="min-h-screen" style={themeStyle}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ opacity: anyPlaying ? 0.06 : 0.03 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: theme.vars["--rt-ambient1"] }}
        />
      </div>

      <div
        className="max-w-2xl mx-auto px-4 sm:px-6 relative z-10"
        style={{
          paddingTop: "max(5rem, calc(3.5rem + env(safe-area-inset-top, 0px)))",
          paddingBottom: "calc(9rem + env(safe-area-inset-bottom, 16px))",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm mb-3"
            style={{ background: `rgba(${p},0.06)`, border: `1px solid rgba(${p},0.16)` }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: anyPlaying ? "#ef4444" : `rgb(${p})`, animation: anyPlaying ? "pulse 1.5s infinite" : "none" }} />
            <RadioIcon className="w-3 h-3" style={{ color: `rgb(${p})` }} />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: `rgb(${p})` }}>
              Upper Vibe Radio
            </span>
          </div>
          <h1 className="font-heading font-black text-white mb-1.5" style={{ fontSize: "clamp(1.5rem,5vw,2.4rem)" }}>
            Upper Vibe Radio
          </h1>
          <p className="text-white/35 text-xs max-w-xs mx-auto leading-relaxed">
            Choose the live 24/7 Upper Vibe stream or play a personal station built from your vibe.
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          className="flex rounded-2xl p-1 mb-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { id: "live", label: "Upper Vibe Live Radio", shortLabel: "Live Radio", icon: <RadioIcon className="w-3.5 h-3.5 flex-shrink-0" />, badge: "LIVE", isPlaying: liveIsPlaying },
            { id: "myvibe", label: "My Vibe Radio", shortLabel: "My Vibe", icon: <Music4 className="w-3.5 h-3.5 flex-shrink-0" />, badge: "PERSONAL", isPlaying: myVibeIsPlaying },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black tracking-wide transition-all relative"
                style={{
                  background: isActive ? `rgba(${p},0.15)` : "transparent",
                  color: isActive ? `rgb(${p})` : "rgba(255,255,255,0.4)",
                  border: isActive ? `1px solid rgba(${p},0.35)` : "1px solid transparent",
                  boxShadow: isActive ? `0 0 16px rgba(${p},0.12)` : "none",
                }}>
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" style={{ animation: "pulse 1.5s infinite" }} />
                )}
                {isActive && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full hidden xs:inline"
                    style={{ background: `rgba(${p},0.2)`, color: `rgb(${p})` }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Cross-tab now-playing banners */}
        <AnimatePresence>
          {activeTab === "myvibe" && liveIsPlaying && (
            <motion.div key="live-banner"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: `rgba(${p},0.08)`, border: `1px solid rgba(${p},0.2)` }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" style={{ animation: "pulse 1.5s infinite" }} />
                  <RadioIcon className="w-3 h-3 flex-shrink-0" style={{ color: `rgb(${p})` }} />
                  <span className="text-[10px] font-black tracking-wider uppercase" style={{ color: `rgb(${p})` }}>Live Radio Still Playing</span>
                </div>
                <button onClick={pauseUpperVibeRadio} className="text-[9px] font-black opacity-60 hover:opacity-100 transition-opacity uppercase tracking-wider" style={{ color: `rgb(${p})` }}>Stop</button>
              </div>
            </motion.div>
          )}
          {activeTab === "live" && myVibeIsPlaying && (
            <motion.div key="myvibe-banner"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: `rgba(${p},0.08)`, border: `1px solid rgba(${p},0.2)` }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Music4 className="w-3 h-3 flex-shrink-0" style={{ color: `rgb(${p})` }} />
                  <span className="text-[10px] font-black tracking-wider uppercase truncate" style={{ color: `rgb(${p})` }}>
                    My Vibe Playing{myVibeTrack ? `: ${myVibeTrack.title}` : ""}
                  </span>
                </div>
                <button onClick={pauseMyVibe} className="text-[9px] font-black opacity-60 hover:opacity-100 transition-opacity uppercase tracking-wider flex-shrink-0 ml-2" style={{ color: `rgb(${p})` }}>Pause</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viz mode + theme picker */}
        <div className="flex justify-between items-center mb-2" style={{ maxWidth: 440, margin: "0 auto 8px" }}>
          <button
            onClick={() => handleCycleMode(MODES[(MODES.findIndex(m => m.id === vizMode) + 1) % MODES.length].id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 20,
              fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
              textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.2s ease", userSelect: "none", WebkitUserSelect: "none",
              background: `rgba(${p},0.10)`, border: `1px solid rgba(${p},0.45)`, color: `rgb(${p})`,
            }}>
            <span style={{ fontSize: 9, lineHeight: 1 }}>{currentModeObj.icon}</span>
            {currentModeObj.label}
          </button>
          <RadioThemePicker themeId={themeId} onSelect={applyTheme} pulseEnabled={pulseOn} onTogglePulse={handleTogglePulse} />
        </div>

        {/* Visualizer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mb-5 rounded-3xl"
          style={{ maxWidth: 440 }}>
          {pulseOn ? (
            <motion.div
              animate={{ scale: [1, 1.03, 1], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 5, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut" }}
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ border: `2px solid rgb(${p})`, boxShadow: `0 0 30px rgba(${p},0.5)` }}
            />
          ) : (
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ border: `1px solid rgba(${p},0.3)` }} />
          )}
          <div className="relative z-10 overflow-hidden rounded-3xl"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid rgba(${p},0.15)` }}>
            <RadioVisualizer
              isPlaying={anyPlaying}
              currentSong={activeTab === "myvibe" ? myVibeTrack : null}
              themeColor={p}
              mode={vizMode}
              onCycleMode={handleCycleMode}
              radioAudioRef={VIZ_AUDIO_REF}
              isLiveStream={activeTab === "live"}
            />
            <div className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(4,4,14,0.65) 100%)" }} />
          </div>
        </motion.div>

        {/* Player Cards */}
        <AnimatePresence mode="wait">
          {activeTab === "live" ? (
            <motion.div key="live"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center mb-6">
              <LivePlayerCard
                isPlaying={liveIsPlaying}
                isLoading={liveIsLoading}
                error={liveError}
                nowPlaying={nowPlaying}
                onToggle={handleLiveToggle}
                theme={theme}
                p={p}
                pulseOn={pulseOn}
                isPageVisible={isPageVisible}
              />
            </motion.div>
          ) : (
            <motion.div key="myvibe"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center mb-6">
              <MyVibePlayerCard
                isPlaying={myVibeIsPlaying}
                track={myVibeTrack}
                onToggle={handleMyVibeToggle}
                onNext={handleSkip}
                onPrev={hasPrev ? prevRadioSong : null}
                onLike={handleLikeAndSave}
                onPlayLess={handlePlayLess}
                isLiked={isLiked || isSaved}
                isPlayLess={isPlayLess}
                theme={theme}
                p={p}
                pulseOn={pulseOn}
                isPageVisible={isPageVisible}
                isPlus={isPlus}
                isLoggedIn={!!user}
                navigate={navigate}
                onOpenSheet={openSheet}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {badges.map((label) => (
            <span key={label} className="text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5 rounded-full"
              style={{ background: `rgba(${p},0.07)`, border: `1px solid rgba(${p},0.2)`, color: `rgb(${p})` }}>
              {label}
            </span>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "live" && (
          <div className="mt-2">
            <TrendingLiveSection themeVars={theme.vars} />
          </div>
        )}
        {activeTab === "myvibe" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="rounded-2xl p-5 text-center"
            style={{ background: `rgba(${p},0.04)`, border: `1px solid rgba(${p},0.12)` }}>
            <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: `rgba(${p},0.6)` }} />
            <p className="text-white/50 text-xs leading-relaxed max-w-xs mx-auto">
              My Vibe Radio learns from your likes, saves, replays, and listening history — getting better every session.{" "}
              <Link to="/music" className="underline" style={{ color: `rgb(${p})` }}>Browse the library</Link> to discover more.
            </p>
          </motion.div>
        )}

        <p className="text-center text-[10px] text-white/15 tracking-wide mt-8">
          Free to stream · 432 Hz high-vibe music
        </p>
      </div>

      <IOSTip trigger="always" />

      {/* Song Mini Sheet */}
      <AnimatePresence>
        {sheetTrack && (
          <SongMiniSheet
            track={sheetTrack}
            isPlus={isPlus}
            p={p}
            theme={theme}
            downloadIntent={sheetDownloadIntent}
            onClose={closeSheet}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Live Player Card ──────────────────────────────────────────────────────────
function LivePlayerCard({ isPlaying, isLoading, error, nowPlaying, onToggle, theme, p, pulseOn, isPageVisible }) {
  return (
    <div className="w-full max-w-sm relative">
      {pulseOn ? (
        <motion.div
          animate={{ scale: [1, 1.03, 1], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 5, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut", delay: 0.4 }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ border: `2px solid rgb(${p})`, boxShadow: `0 0 30px rgba(${p},0.5)` }}
        />
      ) : (
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ border: `1px solid rgba(${p},0.3)` }} />
      )}
      <div className="relative z-10 rounded-3xl p-8 flex flex-col items-center gap-5"
        style={{ background: "rgba(255,255,255,0.028)", border: `1px solid rgba(${p},0.12)` }}>

        <div className="relative w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0"
          style={{ border: `1px solid rgba(${p},0.25)` }}>
          {nowPlaying?.coverart ? (
            <img src={nowPlaying.coverart} alt={nowPlaying.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${p},0.08)` }}>
              <RadioIcon className="w-10 h-10" style={{ color: `rgb(${p})` }} />
            </div>
          )}
          {isPlaying && (
            <div className="absolute bottom-2 left-0 right-0 flex gap-0.5 items-end justify-center">
              {[1,2,3,4,3].map((h, i) => (
                <motion.div key={i}
                  animate={{ height: [`${h * 3}px`, `${h * 5}px`, `${h * 3}px`] }}
                  transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
                  className="w-1 rounded-full"
                  style={{ background: `rgb(${p})`, opacity: 0.9 }} />
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-white/35 text-[10px] uppercase tracking-widest mb-1">
            {isPlaying ? "Now Playing · Upper Vibe Live Radio" : "Upper Vibe Live Radio"}
          </p>
          {nowPlaying ? (
            <>
              <h2 className="font-heading font-black text-white text-base mb-0.5 leading-tight">{nowPlaying.title}</h2>
              {nowPlaying.artist && <p className="text-white/45 text-sm">{nowPlaying.artist}</p>}
            </>
          ) : (
            <>
              <h2 className="font-heading font-black text-white text-lg mb-0.5">Upper Vibe Live Radio</h2>
              <p className="text-white/35 text-sm">432 Hz high-vibe music, nonstop</p>
            </>
          )}
          {error && <p className="text-yellow-400/70 text-xs mt-2">{error}</p>}
        </div>

        <motion.button
          onClick={onToggle}
          whileTap={{ scale: 0.92 }}
          className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:brightness-115"
          style={{
            background: `linear-gradient(135deg,rgb(${theme.vars["--rt-primary-dark"]}),rgb(${p}))`,
            boxShadow: isPlaying ? `0 0 36px rgba(${p},0.4), 0 0 80px rgba(${p},0.15)` : `0 0 20px rgba(${p},0.2)`,
            transition: "box-shadow 0.8s ease",
          }}>
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-8 h-8 text-black fill-current" />
          ) : (
            <Play className="w-8 h-8 text-black fill-current ml-1" />
          )}
        </motion.button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: `rgba(${p},0.08)`, border: `1px solid rgba(${p},0.2)` }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-500" style={{ animation: "pulse 1.5s infinite" }} />
          <AudioLines className="w-3 h-3" style={{ color: `rgb(${p})` }} />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: `rgb(${p})` }}>
            {isPlaying ? "Listen Live" : "Live Radio"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── My Vibe Player Card ───────────────────────────────────────────────────────
function MyVibePlayerCard({
  isPlaying, track, onToggle, onNext, onPrev,
  onLike, onPlayLess,
  isLiked, isPlayLess,
  theme, p, pulseOn, isPageVisible,
  isPlus, isLoggedIn, navigate, onOpenSheet,
}) {
  const handleCoverClick = () => {
    if (!track?.id || !onOpenSheet) return;
    onOpenSheet(track);
  };

  const handleDownload = () => {
    if (!track?.id || !onOpenSheet) return;
    onOpenSheet(track, true);
  };

  return (
    <div className="w-full max-w-sm relative">
      {pulseOn ? (
        <motion.div
          animate={{ scale: [1, 1.03, 1], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 5, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut", delay: 0.4 }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ border: `2px solid rgb(${p})`, boxShadow: `0 0 30px rgba(${p},0.5)` }}
        />
      ) : (
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ border: `1px solid rgba(${p},0.3)` }} />
      )}
      <div className="relative z-10 rounded-3xl p-6 flex flex-col items-center gap-4"
        style={{ background: "rgba(255,255,255,0.028)", border: `1px solid rgba(${p},0.12)` }}>

        {/* Clickable cover — opens mini sheet, does NOT pause radio */}
        <div
          onClick={handleCoverClick}
          className="relative w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 group"
          style={{ border: `1px solid rgba(${p},0.25)`, cursor: track ? "pointer" : "default" }}>
          {track?.cover_url ? (
            <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${p},0.08)` }}>
              <Music4 className="w-10 h-10" style={{ color: `rgb(${p})` }} />
            </div>
          )}
          {track && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
              <Music4 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute bottom-2 left-0 right-0 flex gap-0.5 items-end justify-center group-hover:opacity-0 transition-opacity">
              {[1,2,3,4,3].map((h, i) => (
                <motion.div key={i}
                  animate={{ height: [`${h * 3}px`, `${h * 5}px`, `${h * 3}px`] }}
                  transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
                  className="w-1 rounded-full"
                  style={{ background: `rgb(${p})`, opacity: 0.9 }} />
              ))}
            </div>
          )}
        </div>

        {track && (
          <button onClick={handleCoverClick}
            className="text-[9px] font-black tracking-[0.15em] uppercase -mt-2 transition-opacity hover:opacity-80"
            style={{ color: `rgba(${p},0.5)` }}>
            Song Details ↑
          </button>
        )}

        <div className="text-center -mt-1">
          <p className="text-white/35 text-[10px] uppercase tracking-widest mb-1">
            {isPlaying ? "Now Playing · My Vibe Radio" : "My Vibe Radio"}
          </p>
          {track ? (
            <>
              <h2 className="font-heading font-black text-white text-base mb-0.5 leading-tight">{track.title}</h2>
              <p className="text-white/45 text-sm">{track.artist_display || "Upper Vibe Media"}</p>
            </>
          ) : (
            <>
              <h2 className="font-heading font-black text-white text-lg mb-0.5">My Vibe Radio</h2>
              <p className="text-white/35 text-sm">Personalized to your listening history</p>
            </>
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-5">
          <button
            onClick={onPrev || undefined}
            disabled={!onPrev}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{
              background: `rgba(${p},0.08)`,
              border: `1px solid rgba(${p},${onPrev ? 0.25 : 0.08})`,
              color: onPrev ? `rgb(${p})` : `rgba(${p},0.25)`,
              cursor: onPrev ? "pointer" : "default",
            }}>
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.92 }}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:brightness-115"
            style={{
              background: `linear-gradient(135deg,rgb(${theme.vars["--rt-primary-dark"]}),rgb(${p}))`,
              boxShadow: isPlaying ? `0 0 36px rgba(${p},0.4), 0 0 80px rgba(${p},0.15)` : `0 0 20px rgba(${p},0.2)`,
              transition: "box-shadow 0.8s ease",
            }}>
            {isPlaying ? (
              <Pause className="w-8 h-8 text-black fill-current" />
            ) : (
              <Play className="w-8 h-8 text-black fill-current ml-1" />
            )}
          </motion.button>

          <button
            onClick={onNext}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:brightness-125"
            style={{ background: `rgba(${p},0.08)`, border: `1px solid rgba(${p},0.25)`, color: `rgb(${p})` }}>
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Feedback buttons */}
        {track && (
          <div className="flex items-center justify-center gap-2 flex-wrap w-full">
            {/* Heart — like + save combined, turns violet purple when active */}
            <button onClick={isLoggedIn ? onLike : undefined}
              title={isLoggedIn ? (isLiked ? "Saved & Liked" : "Like & Save") : "Log in to like"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              style={isLiked ? {
                background: "rgba(155,126,255,0.18)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF",
              } : {
                background: `rgba(${p},0.07)`, border: `1px solid rgba(${p},0.22)`, color: `rgba(${p},0.75)`,
              }}>
              <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
              <span>{isLiked ? "Saved" : "Save"}</span>
            </button>

            {/* Play Less */}
            <button onClick={onPlayLess}
              title={isPlayLess ? "Undo Play Less" : "Play Less Like This"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              style={isPlayLess ? {
                background: "rgba(251,146,60,0.18)", border: "1px solid rgba(251,146,60,0.4)", color: "#fb923c",
              } : {
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)",
              }}>
              <ThumbsDown className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{isPlayLess ? "Undone" : "Play Less"}</span>
              <span className="xs:hidden">{isPlayLess ? "✓" : "Less"}</span>
            </button>

            {/* Download */}
            <button onClick={handleDownload}
              title={isPlus ? "Download" : "Unlock Downloads (Plus)"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              style={isPlus ? {
                background: `rgba(${p},0.12)`, border: `1px solid rgba(${p},0.35)`, color: `rgb(${p})`,
              } : {
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)",
              }}>
              {isPlus ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{isPlus ? "Download" : "Unlock"}</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: `rgba(${p},0.08)`, border: `1px solid rgba(${p},0.2)` }}>
          <Music4 className="w-3 h-3" style={{ color: `rgb(${p})` }} />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: `rgb(${p})` }}>
            {isPlaying ? "Playing My Vibe" : "Play My Vibe"}
          </span>
        </div>
      </div>
    </div>
  );
}