import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Sparkles, Disc3, Music4,
  Search, Play, Pause, SkipForward, Eye, Star, Zap,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer, requestAnalyser } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";

// ─── Visualizer styles ──────────────────────────────────────────
const STYLES = [
  { key: "cosmic",   label: "Cosmic Tunnel" },
  { key: "spectrum", label: "Spectrum Bars" },
  { key: "energy",   label: "Energy Rings" },
  { key: "waveform", label: "Waveform Glow" },
  { key: "particles",label: "Pulse Particles" },
];

function drawCosmic(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.3)";
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < bufferLength; i += 4) {
    const val = dataArray[i] / 255;
    const radius = 60 + i * 1.2 + Math.sin(t * 2 + i * 0.02) * 20;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${260 + val * 40}, 80%, ${50 + val * 30}%, ${val * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  glow.addColorStop(0, "rgba(155,126,255,0.3)");
  glow.addColorStop(1, "rgba(155,126,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpectrum(canvas, ctx, dataArray, bufferLength) {
  const { width, height } = canvas;
  ctx.fillStyle = "rgba(5,5,16,0.4)";
  ctx.fillRect(0, 0, width, height);
  const barWidth = width / bufferLength * 2.5;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const val = dataArray[i] / 255;
    const barHeight = val * height * 0.8;
    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
    gradient.addColorStop(0, "rgba(0,229,255,0.8)");
    gradient.addColorStop(0.5, "rgba(155,126,255,0.6)");
    gradient.addColorStop(1, "rgba(0,160,220,0.4)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    x += barWidth;
  }
}

function drawEnergyRings(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.3)";
  ctx.fillRect(0, 0, width, height);
  for (let r = 0; r < 5; r++) {
    const ringRadius = 40 + r * 60 + Math.sin(t * 1.5 + r) * 15;
    const slice = bufferLength / 5;
    ctx.beginPath();
    for (let i = 0; i < slice; i++) {
      const val = (dataArray[r * slice + i] || dataArray[i]) / 255;
      const angle = (i / slice) * Math.PI * 2;
      const rad = ringRadius + val * 25;
      if (i === 0) ctx.moveTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
      else ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${200 + r * 40}, 80%, ${55 + r * 5}%, 0.6)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawWaveform(canvas, ctx, dataArray, bufferLength) {
  const { width, height } = canvas;
  ctx.fillStyle = "rgba(5,5,16,0.5)";
  ctx.fillRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  const sliceWidth = width / bufferLength;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128 - 1;
    ctx.lineTo(i * sliceWidth, (v * height) / 2 + height / 2);
  }
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "rgba(155,126,255,0.8)");
  grad.addColorStop(0.5, "rgba(0,229,255,0.8)");
  grad.addColorStop(1, "rgba(155,126,255,0.8)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = "rgba(155,126,255,0.05)";
  ctx.fill();
}

function drawParticles(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  ctx.fillStyle = "rgba(5,5,16,0.15)";
  ctx.fillRect(0, 0, width, height);
  const particleCount = 80;
  for (let i = 0; i < particleCount; i++) {
    const val = dataArray[Math.floor((i / particleCount) * bufferLength)] / 255;
    const angle = (i / particleCount) * Math.PI * 2 + t * 0.5;
    const radius = 30 + val * 150 + Math.sin(t + i) * 20;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;
    const size = 2 + val * 6;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${260 + val * 40}, 80%, ${60 + val * 30}%, 0.8)`;
    ctx.fill();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
    glow.addColorStop(0, `rgba(155,126,255,${val * 0.4})`);
    glow.addColorStop(1, "rgba(155,126,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const starSize = 4 + Math.sin(t * 2) * 2;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, starSize, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,229,255,0.9)";
  ctx.fill();
}

const DRAW_FNS = { cosmic: drawCosmic, spectrum: drawSpectrum, energy: drawEnergyRings, waveform: drawWaveform, particles: drawParticles };

// ─── Affirmations & Manifestation data ──────────────────────────
const GENERAL_AFFIRMATIONS = [
  "I trust my future.",
  "My energy creates my reality.",
  "I am safe to receive success.",
  "My nervous system supports my growth.",
  "I am aligned with my highest self.",
  "Abundance flows to me naturally.",
  "I am worthy of deep peace.",
  "My frequency attracts miracles.",
  "I release what no longer serves me.",
  "I am becoming more every day.",
];

const MANIFESTATION_THEMES = [
  { id: "wealth",     label: "Wealth",      color: "#D4A843", glow: "rgba(212,168,67,0.3)", affirmations: [
    "Money flows to me with ease.", "I am a magnet for abundance.", "Wealth is my natural state.", "I attract financial freedom.", "My income grows beyond my expectations.", "I am worthy of unlimited prosperity.",
  ]},
  { id: "confidence", label: "Confidence",  color: "#C43BFF", glow: "rgba(196,59,255,0.3)", affirmations: [
    "I trust myself completely.", "I walk with purpose and power.", "My presence commands respect.", "I believe in my own greatness.", "I speak my truth with clarity.", "I own every room I enter.",
  ]},
  { id: "healing",    label: "Healing",     color: "#00D4F0", glow: "rgba(0,212,240,0.3)", affirmations: [
    "My body knows how to heal.", "I release all stored tension.", "Every breath restores me.", "I am safe in this present moment.", "My cells vibrate at perfect health.", "I choose peace over pain.",
  ]},
  { id: "love",       label: "Love",        color: "#FF4081", glow: "rgba(255,64,129,0.3)", affirmations: [
    "I am deeply loved and lovable.", "Love surrounds me everywhere.", "I give and receive love freely.", "My heart is open and expanding.", "I attract loving, healthy connections.", "I am love in its purest form.",
  ]},
  { id: "focus",      label: "Focus",       color: "#00E5FF", glow: "rgba(0,229,255,0.3)", affirmations: [
    "My mind is clear and sharp.", "I channel energy into what matters.", "I am fully present right now.", "Distractions have no power over me.", "I complete what I begin.", "Deep focus is my superpower.",
  ]},
  { id: "success",    label: "Success",     color: "#A078FF", glow: "rgba(160,120,255,0.3)", affirmations: [
    "I am built for success.", "Every action moves me forward.", "Opportunities find me effortlessly.", "I turn vision into reality.", "My dreams are valid and achievable.", "I succeed at everything I commit to.",
  ]},
];

// ─── Affirmation overlay (used by both Affirmation + Manifestation modes) ───
function AffirmationOverlay({ affirmations, themeColor = "#A078FF", themeGlow = "rgba(160,120,255,0.25)", beatRef }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setCurrentIdx(Math.floor(Math.random() * affirmations.length));
    setVisible(true);
  }, [affirmations]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIdx((i) => (i + 1) % affirmations.length);
        setVisible(true);
      }, 700);
    }, 5000);
    return () => clearInterval(interval);
  }, [affirmations.length]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6"
      style={{ zIndex: 5 }}>
      {/* Ambient energy rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.06 + i * 0.04, 1], opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
            className="absolute rounded-full"
            style={{
              width: `${160 + i * 80}px`,
              height: `${160 + i * 80}px`,
              border: `1px solid ${themeColor}`,
              boxShadow: `0 0 ${20 + i * 10}px ${themeGlow}`,
            }}
          />
        ))}
        {/* Center glow dot */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full"
          style={{ width: 40, height: 40, background: `radial-gradient(circle, ${themeColor}55 0%, transparent 70%)` }}
        />
      </div>

      {/* Affirmation text */}
      <AnimatePresence mode="wait">
        {visible && (
          <motion.p
            key={currentIdx}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center font-heading font-black leading-snug"
            style={{
              fontSize: "clamp(1.35rem, 4.5vw, 2.2rem)",
              color: "#ffffff",
              textShadow: `0 0 40px ${themeGlow}, 0 0 80px ${themeGlow}, 0 2px 12px rgba(0,0,0,0.8)`,
              maxWidth: "680px",
              letterSpacing: "-0.01em",
            }}
          >
            {affirmations[currentIdx]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────
const MODES = [
  { id: "visualizer",    label: "Visualizer",    icon: Eye },
  { id: "affirmation",   label: "Affirmations",  icon: Sparkles },
  { id: "manifestation", label: "Manifestation", icon: Star },
];

export default function VisualizerPanel({ open, onClose }) {
  const { currentTrack, isPlaying, playTrack, togglePlay, skipTrack } = usePlayer() || {};
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const styleIdx = useRef(0);
  const [styleKey, setStyleKey] = useState("cosmic");
  const [analyserData, setAnalyserData] = useState(null);
  const fallbackRef = useRef(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [quickTracks, setQuickTracks] = useState([]);
  const [songSearch, setSongSearch] = useState("");

  // Mode state
  const [activeMode, setActiveMode] = useState("visualizer");
  const [selectedTheme, setSelectedTheme] = useState(null); // for manifestation mode

  const handlePrev = useCallback(() => {
    styleIdx.current = (styleIdx.current - 1 + STYLES.length) % STYLES.length;
    setStyleKey(STYLES[styleIdx.current].key);
    setShowSongPicker(false);
  }, []);

  const handleNext = useCallback(() => {
    styleIdx.current = (styleIdx.current + 1) % STYLES.length;
    setStyleKey(STYLES[styleIdx.current].key);
    setShowSongPicker(false);
  }, []);

  // Analyser setup — never touches playback
  useEffect(() => {
    if (!open) return;
    const audioEl = document.querySelector("audio");
    if (audioEl && !analyserData) {
      const result = requestAnalyser(audioEl);
      if (result?.analyser) setAnalyserData(result.analyser);
      else fallbackRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!open || analyserData || fallbackRef.current) return;
    const timer = setTimeout(() => {
      const audioEl = document.querySelector("audio");
      if (audioEl) {
        const result = requestAnalyser(audioEl);
        if (result?.analyser) setAnalyserData(result.analyser);
        else fallbackRef.current = true;
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [open, analyserData]);

  // Canvas animation — only runs in visualizer mode
  useEffect(() => {
    if (!open || activeMode !== "visualizer") {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const bufferLength = analyserData ? analyserData.frequencyBinCount : 1024;
    const dataArray = new Uint8Array(bufferLength);
    let frame = 0;

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const t = frame * 0.016;
      if (analyserData) {
        analyserData.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 60 + Math.sin(t * 3 + i * 0.05) * 40 + Math.sin(t * 5 + i * 0.02) * 30;
        }
      }
      const drawFn = DRAW_FNS[styleKey] || DRAW_FNS.cosmic;
      drawFn(canvas, ctx, dataArray, bufferLength, t);
      frame++;
    };
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, activeMode, styleKey, analyserData]);

  // Load songs for picker
  useEffect(() => {
    if (!open) return;
    base44.entities.Track.filter({ status: "published" }, "-plays", 20).then(setQuickTracks);
  }, [open]);

  const filteredSongs = quickTracks
    .filter(t => !songSearch || t.title?.toLowerCase().includes(songSearch.toLowerCase()))
    .slice(0, 8);

  if (!open) return null;

  const currentTheme = selectedTheme ? MANIFESTATION_THEMES.find(t => t.id === selectedTheme) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[65] flex flex-col"
      style={{ background: "rgba(4,4,14,0.97)", pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Canvas background (always rendered in visualizer mode, subtle ambience otherwise) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          pointerEvents: "none",
          opacity: activeMode === "visualizer" ? 1 : 0.18,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Dark gradient for text modes */}
      {activeMode !== "visualizer" && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(20,10,40,0.6) 0%, rgba(4,4,14,0.85) 100%)" }} />
      )}

      {/* ── TOP BAR — Exit + mode selector ── */}
      <div
        className="relative z-20 flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        {/* Exit */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onTouchStart={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#7C3AED,#A078FF)",
            border: "1px solid rgba(160,120,255,0.5)",
            color: "#fff",
            minWidth: "44px", minHeight: "44px",
            touchAction: "manipulation",
          }}
        >
          <ChevronLeft className="w-4 h-4" /> Exit
        </button>

        {/* Mode tabs — pill selector */}
        <div className="flex items-center gap-1 rounded-2xl p-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={(e) => { e.stopPropagation(); setActiveMode(id); setShowSongPicker(false); }}
              onTouchStart={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-xl font-black transition-all"
              style={{
                background: activeMode === id ? "rgba(160,120,255,0.25)" : "transparent",
                border: `1px solid ${activeMode === id ? "rgba(160,120,255,0.4)" : "transparent"}`,
                color: activeMode === id ? "#A078FF" : "rgba(255,255,255,0.4)",
                padding: "6px 10px",
                fontSize: "10px",
                minHeight: "36px",
                touchAction: "manipulation",
              }}
            >
              <Icon style={{ width: 11, height: 11, flexShrink: 0 }} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Songs button (visualizer mode only) */}
        {activeMode === "visualizer" ? (
          <button
            onClick={(e) => { e.stopPropagation(); setShowSongPicker(!showSongPicker); }}
            onTouchStart={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/15"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
              minWidth: "44px", minHeight: "44px",
              touchAction: "manipulation",
            }}
          >
            <Music4 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div style={{ width: 44 }} />
        )}
      </div>

      {/* ── VISUALIZER MODE: style switcher ── */}
      {activeMode === "visualizer" && (
        <div className="relative z-20 flex justify-center items-center gap-2 py-1 flex-shrink-0">
          <button
            onClick={handlePrev}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/15"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black tracking-wider text-white/50 w-28 text-center">
            {STYLES.find(s => s.key === styleKey)?.label}
          </span>
          <button
            onClick={handleNext}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/15"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── AFFIRMATION MODE overlay ── */}
      {activeMode === "affirmation" && (
        <>
          <div className="relative z-10 flex-shrink-0 text-center pt-2 pb-1">
            <p className="text-[10px] font-black tracking-[0.2em] uppercase"
              style={{ color: "rgba(160,120,255,0.5)" }}>Frequency Room · Affirmations</p>
          </div>
          <AffirmationOverlay
            affirmations={GENERAL_AFFIRMATIONS}
            themeColor="#A078FF"
            themeGlow="rgba(160,120,255,0.3)"
          />
        </>
      )}

      {/* ── MANIFESTATION MODE ── */}
      {activeMode === "manifestation" && (
        <>
          <div className="relative z-10 flex-shrink-0 text-center pt-2 pb-1">
            <p className="text-[10px] font-black tracking-[0.2em] uppercase"
              style={{ color: "rgba(212,168,67,0.55)" }}>Frequency Room · Manifestation</p>
          </div>

          {!selectedTheme ? (
            /* Theme picker */
            <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
              <p className="font-heading font-black text-white/80 text-base mb-1 text-center">Choose Your Intention</p>
              <p className="text-[11px] text-white/35 mb-5 text-center">Select a theme to manifest with music</p>
              <div className="grid gap-2.5 w-full max-w-md"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {MANIFESTATION_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedTheme(theme.id); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl font-black transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${theme.color}33`,
                      color: theme.color,
                      padding: "14px 10px",
                      minHeight: 60,
                      touchAction: "manipulation",
                      boxShadow: `0 0 20px ${theme.glow}`,
                      fontSize: "13px",
                    }}
                  >
                    <Zap style={{ width: 16, height: 16, color: theme.color, flexShrink: 0 }} />
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active manifestation affirmations */
            <>
              {/* Back to theme picker */}
              <div className="relative z-20 flex justify-center flex-shrink-0 pb-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedTheme(null); }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] font-black tracking-wider transition-all hover:opacity-80"
                  style={{ color: currentTheme?.color || "#A078FF", touchAction: "manipulation", minHeight: 36 }}
                >
                  <ChevronLeft className="w-3 h-3" /> {currentTheme?.label} ·&nbsp;
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>change theme</span>
                </button>
              </div>
              <AffirmationOverlay
                affirmations={currentTheme?.affirmations || []}
                themeColor={currentTheme?.color || "#A078FF"}
                themeGlow={currentTheme?.glow || "rgba(160,120,255,0.3)"}
              />
            </>
          )}
        </>
      )}

      {/* ── Song picker (visualizer mode) ── */}
      <AnimatePresence>
        {showSongPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-30 left-3 right-3 rounded-2xl overflow-hidden"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 56px)",
              background: "rgba(12,10,24,0.97)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              maxHeight: "55vh",
              pointerEvents: "auto",
            }}
          >
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                <input
                  type="text"
                  placeholder="Search songs..."
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder-white/25 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    touchAction: "manipulation",
                    fontSize: "16px",
                  }}
                />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "40vh" }}>
              {filteredSongs.map((track) => (
                <button
                  key={track.id}
                  onClick={() => { playTrack?.(track, "song"); setShowSongPicker(false); }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/5 active:bg-white/10"
                  style={{ touchAction: "manipulation", minHeight: "44px" }}
                >
                  <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0">
                    <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full"
                      iconClassName="w-3 h-3" fallbackOpacityClass="text-white/20" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{track.title}</p>
                    <p className="text-[9px] text-white/30 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Now Playing bar (bottom — always visible, never intrudes on modes) ── */}
      {currentTrack && (
        <div className="relative z-20 flex justify-center px-4 flex-shrink-0 mt-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
              maxWidth: "360px",
              width: "100%",
            }}
          >
            <Disc3 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-white/35 truncate">{currentTrack.artist_display || "Upper Vibe Media"}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay?.(); }}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex items-center justify-center rounded-full transition-all hover:bg-white/15"
                style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", width: 40, height: 40, minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-[1px]" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); skipTrack?.(); }}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex items-center justify-center rounded-full transition-all hover:bg-white/15"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", width: 40, height: 40, minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}