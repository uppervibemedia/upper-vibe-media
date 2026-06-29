import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Music4, Search, Eye, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer, requestAnalyser } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";

const STYLES = [
  { key: "cosmic", label: "Cosmic Tunnel" },
  { key: "spectrum", label: "Spectrum Bars" },
  { key: "energy", label: "Energy Rings" },
  { key: "waveform", label: "Waveform Glow" },
  { key: "particles", label: "Pulse Particles" },
];

const MODES = [
  { id: "visualizer", label: "Visualizer", icon: Eye },
  { id: "affirmation", label: "Affirmations", icon: Sparkles },
  { id: "manifestation", label: "Manifestation", icon: Star },
];

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
  { id: "wealth", label: "Wealth", color: "#D4A843", glow: "rgba(212,168,67,0.3)", affirmations: ["Money flows to me with ease.", "I am a magnet for abundance.", "Wealth is my natural state."] },
  { id: "confidence", label: "Confidence", color: "#C43BFF", glow: "rgba(196,59,255,0.3)", affirmations: ["I trust myself completely.", "I walk with purpose and power.", "My presence commands respect."] },
  { id: "love", label: "Love", color: "#FF4081", glow: "rgba(255,64,129,0.3)", affirmations: ["I am deeply loved and lovable.", "Love surrounds me everywhere.", "My heart is open and expanding."] },
  { id: "healing", label: "Healing", color: "#00D4F0", glow: "rgba(0,212,240,0.3)", affirmations: ["My body knows how to heal.", "I release stored tension.", "Every breath restores me."] },
  { id: "peace", label: "Peace", color: "#80CBC4", glow: "rgba(128,203,196,0.28)", affirmations: ["Peace begins inside me.", "My breath brings me home.", "I choose calm in this moment."] },
  { id: "focus", label: "Focus", color: "#00E5FF", glow: "rgba(0,229,255,0.3)", affirmations: ["My mind is clear and sharp.", "I channel energy into what matters.", "Deep focus is my superpower."] },
  { id: "gratitude", label: "Gratitude", color: "#F59E0B", glow: "rgba(245,158,11,0.28)", affirmations: ["Gratitude expands my blessings.", "I notice the good around me.", "I receive this moment fully."] },
  { id: "protection", label: "Protection", color: "#60A5FA", glow: "rgba(96,165,250,0.28)", affirmations: ["My energy is protected.", "Only what serves me can enter.", "I am grounded and guided."] },
  { id: "success", label: "Success", color: "#A078FF", glow: "rgba(160,120,255,0.3)", affirmations: ["I am built for success.", "Every action moves me forward.", "I turn vision into reality."] },
  { id: "timeline", label: "New Timeline", color: "#34D399", glow: "rgba(52,211,153,0.28)", affirmations: ["I step into my new timeline now.", "My choices match my next level.", "The old story has released me."] },
];

function drawCosmic(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.3)";
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < bufferLength; i += 4) {
    const val = dataArray[i] / 255;
    const radius = 50 + i * 1.1 + Math.sin(t * 2 + i * 0.02) * 20;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${260 + val * 40}, 80%, ${50 + val * 30}%, ${val * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawSpectrum(canvas, ctx, dataArray, bufferLength) {
  const { width, height } = canvas;
  ctx.fillStyle = "rgba(5,5,16,0.4)";
  ctx.fillRect(0, 0, width, height);
  const step = Math.max(1, Math.floor(bufferLength / 160));
  const bars = Math.floor(bufferLength / step);
  const barWidth = width / bars;
  for (let i = 0; i < bars; i++) {
    const val = dataArray[i * step] / 255;
    const barHeight = val * height * 0.8;
    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
    gradient.addColorStop(0, "rgba(0,229,255,0.8)");
    gradient.addColorStop(0.5, "rgba(155,126,255,0.6)");
    gradient.addColorStop(1, "rgba(0,160,220,0.4)");
    ctx.fillStyle = gradient;
    ctx.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth - 1), barHeight);
  }
}

function drawEnergyRings(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.3)";
  ctx.fillRect(0, 0, width, height);
  const slice = Math.max(16, Math.floor(bufferLength / 5));
  for (let r = 0; r < 5; r++) {
    const ringRadius = Math.min(width, height) * (0.12 + r * 0.09) + Math.sin(t * 1.5 + r) * 15;
    ctx.beginPath();
    for (let i = 0; i < slice; i++) {
      const val = (dataArray[r * slice + i] || dataArray[i] || 0) / 255;
      const angle = (i / slice) * Math.PI * 2;
      const rad = ringRadius + val * 25;
      if (i === 0) ctx.moveTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
      else ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${200 + r * 40}, 80%, ${55 + r * 5}%, 0.65)`;
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
}

function drawParticles(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  ctx.fillStyle = "rgba(5,5,16,0.15)";
  ctx.fillRect(0, 0, width, height);
  const particleCount = Math.min(80, Math.max(36, Math.floor(width / 10)));
  for (let i = 0; i < particleCount; i++) {
    const val = dataArray[Math.floor((i / particleCount) * bufferLength)] / 255;
    const angle = (i / particleCount) * Math.PI * 2 + t * 0.5;
    const radius = 30 + val * Math.min(width, height) * 0.28 + Math.sin(t + i) * 20;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.arc(x, y, 2 + val * 6, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${260 + val * 40}, 80%, ${60 + val * 30}%, 0.8)`;
    ctx.fill();
  }
}

const DRAW_FNS = { cosmic: drawCosmic, spectrum: drawSpectrum, energy: drawEnergyRings, waveform: drawWaveform, particles: drawParticles };

function DomeTextScene({ eyebrow, title, text, themeColor, themeGlow }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-5" style={{ zIndex: 5 }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3].map((i) => (
          <motion.div key={i} animate={{ scale: [1, 1.06 + i * 0.04, 1], opacity: [0.08, 0.18, 0.08] }} transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }} className="absolute rounded-full" style={{ width: `min(${160 + i * 80}px, ${44 + i * 14}vw)`, height: `min(${160 + i * 80}px, ${44 + i * 14}vw)`, border: `1px solid ${themeColor}`, boxShadow: `0 0 ${20 + i * 10}px ${themeGlow}` }} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${title}-${text}`} initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -14, scale: 0.96 }} transition={{ duration: 0.35, ease: "easeOut" }} className="text-center" style={{ maxWidth: "min(720px, calc(100vw - 48px))" }}>
          <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-2" style={{ color: themeColor }}>{eyebrow}</p>
          {title && <p className="font-heading font-black text-white/70 text-sm mb-2">{title}</p>}
          <p className="font-heading font-black leading-snug" style={{ fontSize: "clamp(1.15rem, 4vw, 2.2rem)", color: "#fff", textShadow: `0 0 40px ${themeGlow}, 0 2px 12px rgba(0,0,0,0.8)` }}>
            {text}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function VisualizerPanel({ open, onClose }) {
  const { isPlaying, playTrack } = usePlayer() || {};
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [activeMode, setActiveMode] = useState("visualizer");
  const [styleIdx, setStyleIdx] = useState(0);
  const [affirmationIdx, setAffirmationIdx] = useState(0);
  const [manifestationId, setManifestationId] = useState(null);
  const [manifestationLineIdx, setManifestationLineIdx] = useState(0);
  const [analyserData, setAnalyserData] = useState(null);
  const fallbackRef = useRef(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [quickTracks, setQuickTracks] = useState([]);
  const [songSearch, setSongSearch] = useState("");

  const activeStyle = STYLES[styleIdx] || STYLES[0];
  const activeManifestation = MANIFESTATION_THEMES.find((theme) => theme.id === manifestationId) || null;
  const manifestationText = activeManifestation
    ? activeManifestation.affirmations[manifestationLineIdx % activeManifestation.affirmations.length]
    : "Choose a manifestation focus.";

  const setMode = useCallback((mode) => {
    setActiveMode(mode);
    setShowSongPicker(false);
  }, []);

  const handlePrev = useCallback((e) => {
    e?.stopPropagation?.();
    setShowSongPicker(false);
    if (activeMode === "visualizer") setStyleIdx((i) => (i - 1 + STYLES.length) % STYLES.length);
    if (activeMode === "affirmation") setAffirmationIdx((i) => (i - 1 + GENERAL_AFFIRMATIONS.length) % GENERAL_AFFIRMATIONS.length);
    if (activeMode === "manifestation" && activeManifestation) setManifestationLineIdx((i) => (i - 1 + activeManifestation.affirmations.length) % activeManifestation.affirmations.length);
  }, [activeMode, activeManifestation]);

  const handleNext = useCallback((e) => {
    e?.stopPropagation?.();
    setShowSongPicker(false);
    if (activeMode === "visualizer") setStyleIdx((i) => (i + 1) % STYLES.length);
    if (activeMode === "affirmation") setAffirmationIdx((i) => (i + 1) % GENERAL_AFFIRMATIONS.length);
    if (activeMode === "manifestation" && activeManifestation) setManifestationLineIdx((i) => (i + 1) % activeManifestation.affirmations.length);
  }, [activeMode, activeManifestation]);

  useEffect(() => {
    if (!open) return;
    const audioEl = document.querySelector("audio");
    if (audioEl && !analyserData) {
      const result = requestAnalyser(audioEl);
      if (result?.analyser) setAnalyserData(result.analyser);
      else fallbackRef.current = true;
    }
  }, [open, analyserData]);

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

  useEffect(() => {
    if (!open) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyserData ? analyserData.frequencyBinCount : 1024;
    const dataArray = new Uint8Array(bufferLength);
    let frame = 0;

    const syncCanvasSize = () => {
      const w = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
      const h = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      syncCanvasSize();
      const t = frame * 0.016;
      if (analyserData) analyserData.getByteFrequencyData(dataArray);
      else {
        for (let i = 0; i < bufferLength; i++) dataArray[i] = 60 + Math.sin(t * 3 + i * 0.05) * 40 + Math.sin(t * 5 + i * 0.02) * 30;
      }
      const visualKey = activeMode === "visualizer" ? activeStyle.key : activeMode === "affirmation" ? "energy" : "particles";
      DRAW_FNS[visualKey](canvas, ctx, dataArray, bufferLength, t);
      frame++;
    };
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, activeMode, activeStyle.key, analyserData]);

  useEffect(() => {
    if (!open || activeMode !== "affirmation") return;
    const timer = setInterval(() => {
      setAffirmationIdx((i) => (i + 1) % GENERAL_AFFIRMATIONS.length);
    }, isPlaying ? 4200 : 8500);
    return () => clearInterval(timer);
  }, [open, activeMode, isPlaying]);

  useEffect(() => {
    if (!open || activeMode !== "manifestation" || !activeManifestation) return;
    const timer = setInterval(() => {
      setManifestationLineIdx((i) => (i + 1) % activeManifestation.affirmations.length);
    }, isPlaying ? 4600 : 9000);
    return () => clearInterval(timer);
  }, [open, activeMode, isPlaying, activeManifestation]);

  useEffect(() => {
    if (!open) return;
    base44.entities.Track.filter({ status: "published" }, "-plays", 20).then(setQuickTracks);
  }, [open]);

  if (!open) return null;

  const filteredSongs = quickTracks.filter((track) => !songSearch || track.title?.toLowerCase().includes(songSearch.toLowerCase())).slice(0, 8);
  const modeTitle = activeMode === "visualizer" ? activeStyle.label : activeMode === "affirmation" ? `${affirmationIdx + 1}/${GENERAL_AFFIRMATIONS.length}` : activeManifestation?.label || "Manifestation";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[65] flex flex-col overflow-hidden"
      style={{
        background: "rgba(4,4,14,0.97)",
        pointerEvents: "auto",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        touchAction: "manipulation",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none", opacity: activeMode === "visualizer" ? 1 : 0.22, transition: "opacity 0.35s ease" }} />
      {activeMode !== "visualizer" && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(20,10,40,0.58) 0%, rgba(4,4,14,0.86) 100%)" }} />}

      <div className="relative z-30 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 flex-shrink-0" style={{ maxWidth: "calc(100vw - 8px)", pointerEvents: "auto" }}>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} onTouchStart={(e) => e.stopPropagation()} className="flex items-center gap-1.5 rounded-xl text-xs font-bold transition-all hover:brightness-110 active:scale-95" style={{ background: "linear-gradient(135deg,#7C3AED,#A078FF)", border: "1px solid rgba(160,120,255,0.5)", color: "#fff", minWidth: 54, minHeight: 44, padding: "0 12px", touchAction: "manipulation", pointerEvents: "auto" }} aria-label="Exit Visualizer Dome">
          <ChevronLeft className="w-4 h-4" /> <span>Exit</span>
        </button>

        <div className="flex justify-center min-w-0">
          <div className="flex items-center gap-1 rounded-2xl p-1 overflow-x-auto hide-scrollbar" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", maxWidth: "min(560px, 100%)", pointerEvents: "auto" }}>
            {MODES.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={(e) => { e.stopPropagation(); setMode(id); }} onTouchStart={(e) => e.stopPropagation()} className="flex items-center gap-1 rounded-xl font-black transition-all whitespace-nowrap" style={{ background: activeMode === id ? "rgba(160,120,255,0.25)" : "transparent", border: `1px solid ${activeMode === id ? "rgba(160,120,255,0.4)" : "transparent"}`, color: activeMode === id ? "#A078FF" : "rgba(255,255,255,0.5)", padding: "7px 8px", fontSize: 10, minHeight: 38, touchAction: "manipulation", pointerEvents: "auto" }}>
                <Icon style={{ width: 11, height: 11, flexShrink: 0 }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeMode === "visualizer" ? (
          <button onClick={(e) => { e.stopPropagation(); setShowSongPicker((v) => !v); }} onTouchStart={(e) => e.stopPropagation()} className="flex items-center justify-center rounded-xl transition-all hover:bg-white/15" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", width: 44, height: 44, minWidth: 44, touchAction: "manipulation", pointerEvents: "auto" }} aria-label="Choose Dome music">
            <Music4 className="w-3.5 h-3.5" />
          </button>
        ) : <div style={{ width: 44, height: 44 }} />}
      </div>

      <div className="relative z-20 flex justify-center items-center gap-2 py-1 flex-shrink-0" style={{ pointerEvents: "auto" }}>
        <button onClick={handlePrev} onTouchStart={(e) => e.stopPropagation()} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/15 active:scale-95" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", minWidth: 44, minHeight: 44, touchAction: "manipulation", pointerEvents: "auto" }} aria-label="Previous Dome item"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-[10px] sm:text-xs font-black tracking-wider text-white/60 text-center truncate" style={{ width: "min(220px, 44vw)" }}>{modeTitle}</span>
        <button onClick={handleNext} onTouchStart={(e) => e.stopPropagation()} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/15 active:scale-95" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", minWidth: 44, minHeight: 44, touchAction: "manipulation", pointerEvents: "auto" }} aria-label="Next Dome item"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {activeMode === "affirmation" && <DomeTextScene eyebrow="Frequency Room · Affirmations" text={GENERAL_AFFIRMATIONS[affirmationIdx]} themeColor="#A078FF" themeGlow="rgba(160,120,255,0.3)" />}
      {activeMode === "manifestation" && <DomeTextScene eyebrow="Frequency Room · Manifestation" title={activeManifestation?.label || "Select Focus"} text={manifestationText} themeColor={activeManifestation?.color || "#A078FF"} themeGlow={activeManifestation?.glow || "rgba(160,120,255,0.3)"} />}

      {activeMode === "manifestation" && (
        <div className="relative z-30 flex justify-center px-3 mt-auto mb-4 pointer-events-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 66px)" }}>
          <div className="rounded-2xl p-3" style={{ width: "min(560px, calc(100vw - 24px))", background: "rgba(10,8,24,0.86)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(18px)", boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.38)" }}>Manifestation Focus</p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))" }}>
              {MANIFESTATION_THEMES.map((theme) => (
                <button key={theme.id} onClick={(e) => { e.stopPropagation(); setManifestationId(theme.id); setManifestationLineIdx(0); }} onTouchStart={(e) => e.stopPropagation()} className="rounded-xl px-2 py-2 text-[10px] font-black transition-all active:scale-95" style={{ background: manifestationId === theme.id ? `${theme.color}28` : "rgba(255,255,255,0.055)", border: `1px solid ${manifestationId === theme.id ? theme.color + "88" : "rgba(255,255,255,0.08)"}`, color: manifestationId === theme.id ? theme.color : "rgba(255,255,255,0.68)", minHeight: 36, touchAction: "manipulation", pointerEvents: "auto" }}>
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showSongPicker && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute z-40 left-3 right-3 rounded-2xl overflow-hidden" style={{ top: "calc(env(safe-area-inset-top, 0px) + 58px)", background: "rgba(12,10,24,0.97)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", maxHeight: "min(55vh, 320px)", pointerEvents: "auto" }}>
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                <input type="text" placeholder="Search songs..." value={songSearch} onChange={(e) => setSongSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder-white/25 outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", touchAction: "manipulation", fontSize: 16 }} />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "40vh" }}>
              {filteredSongs.map((track) => (
                <button key={track.id} onClick={() => { playTrack?.(track, "song"); setShowSongPicker(false); }} onTouchStart={(e) => e.stopPropagation()} className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/5 active:bg-white/10" style={{ touchAction: "manipulation", minHeight: 44, pointerEvents: "auto" }}>
                  <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0"><CoverImage src={track.cover_url} alt={track.title} className="w-full h-full" iconClassName="w-3 h-3" fallbackOpacityClass="text-white/20" /></div>
                  <div className="min-w-0"><p className="text-[11px] font-bold text-white truncate">{track.title}</p><p className="text-[9px] text-white/30 truncate">{track.artist_display || "Upper Vibe Media"}</p></div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}