import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause,
  Radio as RadioIcon, Waves, Music4, Sparkles,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import RadioThemePicker, { useRadioTheme, getPulseEnabled, setPulseEnabled } from "../components/radio/RadioThemePicker";
import RadioVisualizer, { MODES } from "../components/radio/RadioVisualizer";
import usePageVisible from "../hooks/usePageVisible";
import IOSTip from "../components/shared/iOSTip";
import TrendingLiveSection from "../components/radio/TrendingLiveSection";
import { LIVE_STREAM_URL, LIVE_STREAM_NAME, LIVE_STREAM_DESCRIPTION } from "@/lib/liveStreamConfig";

const NOW_PLAYING_URL = "https://s5.citrus3.com:2020/json/stream/upperviberadio";
const PREF_KEY = "uvm_radio_viz_v9";
const getSavedMode = () => { try { return localStorage.getItem(PREF_KEY) || "spectrum"; } catch { return "spectrum"; } };

export default function RadioPage() {
  const [vizMode, setVizMode] = useState(getSavedMode);
  const [pulseOn, setPulseOn] = useState(getPulseEnabled);
  const { themeId, theme, applyTheme } = useRadioTheme();
  const isPageVisible = usePageVisible();

  // ── Live stream state ────────────────────────────────────────────────────
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Now Playing metadata ─────────────────────────────────────────────────
  const [nowPlaying, setNowPlaying] = useState(null); // { title, artist, coverart }

  useEffect(() => {
    const fetchNowPlaying = async () => {
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
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10000);
    return () => clearInterval(interval);
  }, []);

  // Pause global player when live radio starts
  const { togglePlay: globalToggle, isPlaying: globalIsPlaying, audioRef: globalAudioRef } = usePlayer();

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "none";
      el.volume = 0.9;
      el.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      document.body.appendChild(el);
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const startStream = useCallback(() => {
    setError(null);
    setIsLoading(true);
    // Pause global player if playing
    if (globalIsPlaying) globalToggle();
    const el = getAudio();
    el.src = LIVE_STREAM_URL;
    el.load();
    el.play()
      .then(() => { setIsPlaying(true); setIsLoading(false); })
      .catch((err) => {
        setIsLoading(false);
        setError("Tap play to start the stream.");
        console.warn("[LiveRadio] play blocked:", err.message);
      });
  }, [getAudio, globalIsPlaying, globalToggle]);

  const stopStream = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.src = "";
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      stopStream();
    } else {
      startStream();
    }
  }, [isPlaying, startStream, stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.src = "";
        try { if (el.parentNode) el.parentNode.removeChild(el); } catch {}
      }
    };
  }, []);

  // Pause live stream if global player starts (single-source rule)
  useEffect(() => {
    if (globalIsPlaying && isPlaying) {
      stopStream();
    }
  }, [globalIsPlaying]);

  const handleTogglePulse = (v) => { setPulseOn(v); setPulseEnabled(v); };
  const handleCycleMode = (next) => {
    setVizMode(next);
    try { localStorage.setItem(PREF_KEY, next); } catch {}
  };
  const currentModeObj = MODES.find(m => m.id === vizMode) || MODES[0];

  // Build CSS variable style object from current theme
  const themeStyle = Object.entries(theme.vars).reduce((acc, [k, v]) => {
    acc[k] = v; return acc;
  }, { WebkitOverflowScrolling: "touch" });

  return (
    <div className="min-h-screen" style={themeStyle}>

      {/* ── Fixed ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ opacity: isPlaying ? 0.06 : 0.03 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: theme.vars["--rt-ambient1"] }}
        />
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.025 }}
            transition={{ duration: 2 }}
            className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full blur-[120px]"
            style={{ background: theme.vars["--rt-ambient2"] }}
          />
        )}
      </div>

      <div
        className="max-w-5xl mx-auto px-5 relative z-10"
        style={{
          paddingTop: "max(5rem, calc(3.5rem + env(safe-area-inset-top, 0px)))",
          paddingBottom: "calc(9rem + env(safe-area-inset-bottom, 16px))",
        }}
      >
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm mb-3"
            style={{ background: `rgba(${theme.vars["--rt-primary"]},0.06)`, border: `1px solid rgba(${theme.vars["--rt-primary"]},0.16)` }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: isPlaying ? "#ef4444" : `rgb(${theme.vars["--rt-primary"]})`,
                animation: isPlaying ? "pulse 1.5s infinite" : "none" }} />
            <RadioIcon className="w-3 h-3" style={{ color: `rgb(${theme.vars["--rt-primary"]})` }} />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: `rgb(${theme.vars["--rt-primary"]})` }}>
              {isPlaying ? "Live Now" : "Live Radio"}
            </span>
          </div>
          <h1 className="font-heading font-black text-white mb-1.5" style={{ fontSize: "clamp(1.6rem,5vw,2.6rem)" }}>
            {LIVE_STREAM_NAME}
          </h1>
          <p className="text-white/30 text-xs">{LIVE_STREAM_DESCRIPTION}</p>
        </motion.div>

        {/* ── Theme Picker + Viz Mode Picker ── */}
        <div className="flex justify-between items-center mb-2" style={{ maxWidth: 440, margin: "0 auto 8px" }}>
          <button
            onClick={() => handleCycleMode(MODES[(MODES.findIndex(m => m.id === vizMode) + 1) % MODES.length].id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 20,
              fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
              textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.2s ease", userSelect: "none", WebkitUserSelect: "none",
              background: `rgba(${theme.vars["--rt-primary"]},0.10)`,
              border: `1px solid rgba(${theme.vars["--rt-primary"]},0.45)`,
              color: `rgb(${theme.vars["--rt-primary"]})`,
              boxShadow: `0 0 8px rgba(${theme.vars["--rt-primary"]},0.12)`,
            }}>
            <span style={{ fontSize: 9, lineHeight: 1 }}>{currentModeObj.icon}</span>
            {currentModeObj.label}
          </button>
          <RadioThemePicker themeId={themeId} onSelect={applyTheme} pulseEnabled={pulseOn} onTogglePulse={handleTogglePulse} />
        </div>

        {/* ── Visualizer ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mb-5 rounded-3xl"
          style={{ maxWidth: 440 }}>
          {pulseOn && (
            <motion.div
              animate={{ scale: [1, 1.03, 1], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 5, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut" }}
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ border: `2px solid rgb(${theme.vars["--rt-primary"]})`, boxShadow: `0 0 30px rgba(${theme.vars["--rt-primary"]},0.5)` }}
            />
          )}
          {!pulseOn && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ border: `1px solid rgba(${theme.vars["--rt-primary"]},0.3)` }} />
          )}
          <div className="relative z-10 overflow-hidden rounded-3xl"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid rgba(${theme.vars["--rt-primary"]},0.15)` }}>
            <RadioVisualizer isPlaying={isPlaying} currentSong={null} themeColor={theme.vars["--rt-primary"]} mode={vizMode} onCycleMode={handleCycleMode} />
            <div className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(4,4,14,0.65) 100%)" }} />
          </div>
        </motion.div>

        {/* ── Player Card ── */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="w-full max-w-sm relative">
            {pulseOn && (
              <motion.div
                animate={{ scale: [1, 1.03, 1], opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 5, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut", delay: 0.4 }}
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ border: `2px solid rgb(${theme.vars["--rt-primary"]})`, boxShadow: `0 0 30px rgba(${theme.vars["--rt-primary"]},0.5)` }}
              />
            )}
            {!pulseOn && (
              <div className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ border: `1px solid rgba(${theme.vars["--rt-primary"]},0.3)` }} />
            )}
            <div className="relative z-10 rounded-3xl p-8 flex flex-col items-center gap-6"
              style={{ background: "rgba(255,255,255,0.028)", border: `1px solid rgba(${theme.vars["--rt-primary"]},0.12)` }}>

              {/* Cover art / station logo */}
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ border: `1px solid rgba(${theme.vars["--rt-primary"]},0.25)` }}>
                {nowPlaying?.coverart ? (
                  <img
                    src={nowPlaying.coverart}
                    alt={nowPlaying.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: `rgba(${theme.vars["--rt-primary"]},0.08)` }}>
                    <RadioIcon className="w-10 h-10" style={{ color: `rgb(${theme.vars["--rt-primary"]})` }} />
                  </div>
                )}
                {/* Live bars overlay when playing */}
                {isPlaying && (
                  <div className="absolute bottom-2 left-0 right-0 flex gap-0.5 items-end justify-center">
                    {[1,2,3,4,3].map((h, i) => (
                      <motion.div key={i}
                        animate={{ height: [`${h * 3}px`, `${h * 5}px`, `${h * 3}px`] }}
                        transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
                        className="w-1 rounded-full"
                        style={{ background: `rgb(${theme.vars["--rt-primary"]})`, opacity: 0.9 }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Station / now playing info */}
              <div className="text-center">
                {nowPlaying ? (
                  <>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Now Playing</p>
                    <h2 className="font-heading font-black text-white text-lg mb-0.5 leading-tight">{nowPlaying.title}</h2>
                    {nowPlaying.artist && <p className="text-white/50 text-sm">{nowPlaying.artist}</p>}
                  </>
                ) : (
                  <>
                    <h2 className="font-heading font-black text-white text-xl mb-1">{LIVE_STREAM_NAME}</h2>
                    <p className="text-white/40 text-sm">{LIVE_STREAM_DESCRIPTION}</p>
                  </>
                )}
                {error && <p className="text-yellow-400/70 text-xs mt-2">{error}</p>}
              </div>

              {/* Play/Pause button */}
              <motion.button
                onClick={handleToggle}
                whileTap={{ scale: 0.92 }}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:brightness-115"
                style={{
                  background: `linear-gradient(135deg,rgb(${theme.vars["--rt-primary-dark"]}),rgb(${theme.vars["--rt-primary"]}))`,
                  boxShadow: isPlaying
                    ? `0 0 36px rgba(${theme.vars["--rt-primary"]},0.4), 0 0 80px rgba(${theme.vars["--rt-primary"]},0.15)`
                    : `0 0 20px rgba(${theme.vars["--rt-primary"]},0.2)`,
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

              {/* Live badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: `rgba(${theme.vars["--rt-primary"]},0.08)`, border: `1px solid rgba(${theme.vars["--rt-primary"]},0.2)` }}>
                <Waves className="w-3 h-3" style={{ color: `rgb(${theme.vars["--rt-primary"]})` }} />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: `rgb(${theme.vars["--rt-primary"]})` }}>
                  Nonstop Live Stream
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Trending Live Broadcast ── */}
        <div className="mt-8">
          <TrendingLiveSection themeVars={theme.vars} />
        </div>

        <p className="text-center text-[10px] text-white/15 tracking-wide mt-8">
          Free to stream · 432 Hz high-vibe music
        </p>
      </div>

      <IOSTip trigger="always" />
    </div>
  );
}