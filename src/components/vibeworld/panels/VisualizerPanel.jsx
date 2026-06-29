import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Eye, Star, Radio } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";
import useDomeAudioAnalysis from "@/components/vibeworld/panels/useDomeAudioAnalysis";
import ManifestationFocusSelector from "@/components/vibeworld/panels/ManifestationFocusSelector";

const STYLES = [
  { key: "cosmic", label: "Cosmic Tunnel" },
  { key: "spectrum", label: "Spectrum Bars" },
  { key: "energy", label: "Energy Rings" },
  { key: "waveform", label: "Waveform Glow" },
  { key: "particles", label: "Pulse Particles" },
  { key: "mandala", label: "Sacred Mandala" },
  { key: "aurora", label: "Aurora Flow" },
  { key: "orbit", label: "Orbital Pulse" },
  { key: "lotus", label: "Lotus Bloom" },
  { key: "rain", label: "Neon Rain" },
];

const MODES = [
  { id: "visualizer", label: "Visualizer", icon: Eye },
  { id: "affirmation", label: "Affirmations", icon: Sparkles },
  { id: "manifestation", label: "Manifestation", icon: Star },
];

const GENERAL_AFFIRMATIONS = ["I trust my future.", "My energy creates my reality.", "I am safe to receive success.", "My nervous system supports my growth.", "I am aligned with my highest self.", "Abundance flows to me naturally.", "I am worthy of deep peace.", "My frequency attracts miracles.", "I release what no longer serves me.", "I am becoming more every day."];

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

function fallbackData(bufferLength, t) {
  const dataArray = new Uint8Array(bufferLength);
  for (let i = 0; i < bufferLength; i++) dataArray[i] = 60 + Math.sin(t * 3 + i * 0.05) * 40 + Math.sin(t * 5 + i * 0.02) * 30;
  return dataArray;
}

function drawCosmic(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const bass = a?.bassEnergy || 0;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = `rgba(5,5,16,${0.22 - Math.min(0.1, bass * 0.08)})`;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < bufferLength; i += 4) {
    const val = dataArray[i] / 255;
    const radius = 50 + i * 1.1 + Math.sin(t * (2 + bass) + i * 0.02) * 20 + beat * (22 + val * 34);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${260 + val * 40 + beat * 22}, 85%, ${50 + val * 30 + beat * 14}%, ${Math.min(0.9, val * 0.5 + beat * 0.24)})`;
    ctx.lineWidth = 1.4 + beat * 2.2;
    ctx.stroke();
  }
}

function drawSpectrum(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const bass = a?.bassEnergy || 0;
  ctx.fillStyle = "rgba(5,5,16,0.34)";
  ctx.fillRect(0, 0, width, height);
  const step = Math.max(1, Math.floor(bufferLength / 160));
  const bars = Math.floor(bufferLength / step);
  const barWidth = width / bars;
  for (let i = 0; i < bars; i++) {
    const val = dataArray[i * step] / 255;
    const barHeight = val * height * 0.72 * (1 + bass * 0.45 + beat * 0.35);
    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
    gradient.addColorStop(0, `rgba(0,229,255,${0.55 + beat * 0.35})`);
    gradient.addColorStop(0.5, `rgba(155,126,255,${0.45 + val * 0.25})`);
    gradient.addColorStop(1, `rgba(0,160,220,${0.32 + beat * 0.22})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth - 1), barHeight);
  }
}

function drawEnergyRings(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const bass = a?.bassEnergy || 0;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.26)";
  ctx.fillRect(0, 0, width, height);
  const slice = Math.max(16, Math.floor(bufferLength / 5));
  for (let r = 0; r < 5; r++) {
    const ringRadius = Math.min(width, height) * (0.12 + r * 0.09) + Math.sin(t * (1.5 + bass) + r) * 15 + beat * (16 + r * 9);
    ctx.beginPath();
    for (let i = 0; i < slice; i++) {
      const val = (dataArray[r * slice + i] || dataArray[i] || 0) / 255;
      const angle = (i / slice) * Math.PI * 2;
      const rad = ringRadius + val * (25 + beat * 28);
      if (i === 0) ctx.moveTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
      else ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${200 + r * 40 + beat * 18}, 85%, ${55 + r * 5 + beat * 12}%, ${0.45 + beat * 0.4})`;
    ctx.lineWidth = 1.8 + beat * 3;
    ctx.stroke();
  }
}

function drawWaveform(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  ctx.fillStyle = "rgba(5,5,16,0.42)";
  ctx.fillRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  const sliceWidth = width / bufferLength;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128 - 1;
    ctx.lineTo(i * sliceWidth, (v * height * (1 + beat * 0.18)) / 2 + height / 2);
  }
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, `rgba(155,126,255,${0.65 + beat * 0.25})`);
  grad.addColorStop(0.5, `rgba(0,229,255,${0.7 + beat * 0.25})`);
  grad.addColorStop(1, `rgba(155,126,255,${0.65 + beat * 0.25})`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.5 + beat * 4;
  ctx.stroke();
}

function drawParticles(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const volume = a?.smoothedVolume || 0;
  ctx.fillStyle = "rgba(5,5,16,0.12)";
  ctx.fillRect(0, 0, width, height);
  const particleCount = Math.min(82, Math.max(36, Math.floor(width / 10)));
  for (let i = 0; i < particleCount; i++) {
    const val = dataArray[Math.floor((i / particleCount) * bufferLength)] / 255;
    const angle = (i / particleCount) * Math.PI * 2 + t * (0.5 + volume * 0.7);
    const radius = 30 + val * Math.min(width, height) * (0.26 + beat * 0.08) + Math.sin(t + i) * 20 + beat * 24;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.arc(x, y, 2 + val * 6 + beat * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${260 + val * 40 + beat * 30}, 88%, ${60 + val * 30 + beat * 12}%, ${0.55 + beat * 0.35})`;
    ctx.fill();
  }
}

function drawMandala(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const bass = a?.bassEnergy || 0;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.2)";
  ctx.fillRect(0, 0, width, height);
  const petals = 18;
  for (let layer = 0; layer < 4; layer++) {
    const base = Math.min(width, height) * (0.09 + layer * 0.075) + beat * 22;
    ctx.beginPath();
    for (let i = 0; i <= petals * 2; i++) {
      const idx = Math.floor((i / (petals * 2)) * bufferLength);
      const val = (dataArray[idx] || 0) / 255;
      const angle = (i / (petals * 2)) * Math.PI * 2 + t * (0.15 + layer * 0.04);
      const r = base + Math.sin(angle * petals * 0.5) * (18 + bass * 24) + val * 36;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${285 + layer * 18 + beat * 28}, 90%, ${58 + beat * 12}%, ${0.34 + beat * 0.32})`;
    ctx.lineWidth = 1.5 + beat * 2.4;
    ctx.stroke();
  }
}

function drawAurora(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const volume = a?.smoothedVolume || 0;
  ctx.fillStyle = "rgba(5,5,16,0.16)";
  ctx.fillRect(0, 0, width, height);
  for (let ribbon = 0; ribbon < 5; ribbon++) {
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 18) {
      const idx = Math.floor((x / width) * bufferLength);
      const val = (dataArray[idx] || 0) / 255;
      const y = height * (0.28 + ribbon * 0.11) + Math.sin(t * (1.2 + volume) + x * 0.012 + ribbon) * (28 + beat * 24) + val * 42;
      if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${180 + ribbon * 28 + beat * 25}, 90%, ${54 + beat * 16}%, ${0.22 + beat * 0.22})`;
    ctx.lineWidth = 12 + beat * 10;
    ctx.stroke();
  }
}

function drawOrbit(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.18)";
  ctx.fillRect(0, 0, width, height);
  for (let ring = 0; ring < 6; ring++) {
    const val = (dataArray[(ring * 53) % bufferLength] || 0) / 255;
    const rx = Math.min(width, height) * (0.12 + ring * 0.055) + val * 22 + beat * 18;
    const ry = rx * (0.42 + ring * 0.035);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * (0.12 + ring * 0.025));
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, ring * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${205 + ring * 22}, 90%, ${58 + beat * 14}%, ${0.32 + beat * 0.28})`;
    ctx.lineWidth = 1.5 + beat * 2;
    ctx.stroke();
    const dotA = t * (0.8 + ring * 0.16);
    ctx.beginPath();
    ctx.arc(Math.cos(dotA) * rx, Math.sin(dotA) * ry, 3 + val * 4 + beat * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,229,255,${0.55 + beat * 0.35})`;
    ctx.fill();
    ctx.restore();
  }
}

function drawLotus(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  const bass = a?.bassEnergy || 0;
  const cx = width / 2, cy = height / 2;
  ctx.fillStyle = "rgba(5,5,16,0.18)";
  ctx.fillRect(0, 0, width, height);
  for (let layer = 0; layer < 4; layer++) {
    const petals = 8 + layer * 4;
    const base = Math.min(width, height) * (0.1 + layer * 0.055) + beat * 14;
    for (let p = 0; p < petals; p++) {
      const val = (dataArray[(p * 17 + layer * 31) % bufferLength] || 0) / 255;
      const angle = (p / petals) * Math.PI * 2 + t * 0.08 * (layer + 1);
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * base * 0.2, cy + Math.sin(angle) * base * 0.2);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(base * 0.42, 0, 18 + val * 20 + beat * 8, base * (0.3 + bass * 0.08), 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${300 + layer * 16}, 88%, ${60 + val * 18}%, ${0.12 + beat * 0.18 + val * 0.1})`;
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawNeonRain(canvas, ctx, dataArray, bufferLength, t, a) {
  const { width, height } = canvas;
  const beat = a?.beatStrength || 0;
  ctx.fillStyle = "rgba(5,5,16,0.2)";
  ctx.fillRect(0, 0, width, height);
  const cols = Math.max(24, Math.floor(width / 18));
  for (let i = 0; i < cols; i++) {
    const val = dataArray[Math.floor((i / cols) * bufferLength)] / 255;
    const x = (i / cols) * width;
    const y = ((t * (80 + val * 120 + beat * 80) + i * 41) % (height + 140)) - 70;
    const len = 34 + val * 80 + beat * 35;
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, `rgba(0,229,255,0)`);
    g.addColorStop(0.5, `rgba(0,229,255,${0.22 + beat * 0.35})`);
    g.addColorStop(1, `rgba(160,120,255,0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 + val * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }
}

const DRAW_FNS = { cosmic: drawCosmic, spectrum: drawSpectrum, energy: drawEnergyRings, waveform: drawWaveform, particles: drawParticles, mandala: drawMandala, aurora: drawAurora, orbit: drawOrbit, lotus: drawLotus, rain: drawNeonRain };

function DomeTextScene({ eyebrow, title, text, themeColor, themeGlow }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6" style={{ zIndex: 5, paddingBottom: "clamp(120px, 20vh, 190px)", paddingTop: "clamp(110px, 18vh, 170px)" }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3].map((i) => (
          <motion.div key={i} animate={{ scale: [1, 1.06 + i * 0.04, 1], opacity: [0.14, 0.3, 0.14] }} transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }} className="absolute rounded-full" style={{ width: `min(${170 + i * 82}px, ${46 + i * 13}vw)`, height: `min(${170 + i * 82}px, ${46 + i * 13}vw)`, border: `1px solid ${themeColor}`, boxShadow: `0 0 calc(${30 + i * 12}px + var(--dome-beat, 0) * 52px) ${themeGlow}`, transform: "scale(calc(1 + var(--dome-beat, 0) * 0.045))" }} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${title}-${text}`} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.97 }} transition={{ duration: 0.35, ease: "easeOut" }} className="text-center" style={{ maxWidth: "min(620px, 80vw)", transform: "scale(calc(1 + var(--dome-beat, 0) * 0.012))", filter: "drop-shadow(0 0 calc(8px + var(--dome-beat, 0) * 22px) rgba(160,120,255,0.32))" }}>
          <p className="text-[9px] sm:text-[10px] font-black tracking-[0.22em] uppercase mb-2" style={{ color: themeColor }}>{eyebrow}</p>
          {title && <p className="font-heading font-black text-white/65 text-xs sm:text-sm mb-2">{title}</p>}
          <p className="font-heading font-black" style={{ fontSize: "clamp(1.25rem, 3.15vw, 2rem)", lineHeight: 1.06, color: "#fff", textShadow: `0 0 calc(22px + var(--dome-beat, 0) * 28px) ${themeGlow}, 0 2px 10px rgba(0,0,0,0.82)` }}>
            {text}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ConnectedBadge({ track, isPlaying }) {
  const coverSrc = track?.cover_url || track?.coverArt || track?.image || track?.artwork || null;
  return (
    <div className="relative z-20 flex justify-center px-3 flex-shrink-0 pointer-events-none">
      <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2" style={{ width: "min(380px, calc(100vw - 32px))", background: "rgba(5,4,18,0.74)", border: "1px solid rgba(0,229,255,0.16)", backdropFilter: "blur(16px)", boxShadow: "0 0 calc(16px + var(--dome-beat, 0) * 20px) rgba(0,229,255,0.12)" }}>
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
          <CoverImage src={coverSrc} alt={track?.title || "Current My Vibe song"} className="w-full h-full" iconClassName="w-4 h-4" fallbackOpacityClass="text-white/20" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Radio className="w-3 h-3 text-cyan-300/80 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/70 truncate">Connected to My Vibe Radio</p>
          </div>
          <p className="text-xs font-black text-white/90 truncate">{track?.title || "My Vibe Frequency"}</p>
          <p className="text-[10px] text-white/45 truncate">{track?.artist_display || track?.artist || "Upper Vibe Media"}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: isPlaying ? "#34D399" : "rgba(255,255,255,0.32)", boxShadow: isPlaying ? "0 0 10px #34D399" : "none" }} />
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: isPlaying ? "#34D399" : "rgba(255,255,255,0.36)" }}>{isPlaying ? "Playing" : "Paused"}</span>
        </div>
      </div>
    </div>
  );
}

export default function VisualizerPanel({ open, onClose, currentTrack, isTrackPlaying }) {
  const isPlaying = !!isTrackPlaying;
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analysisRef = useDomeAudioAnalysis(open);
  const [activeMode, setActiveMode] = useState("visualizer");
  const [styleIdx, setStyleIdx] = useState(0);
  const [affirmationIdx, setAffirmationIdx] = useState(0);
  const [manifestationId, setManifestationId] = useState(null);
  const [manifestationLineIdx, setManifestationLineIdx] = useState(0);

  const activeStyle = STYLES[styleIdx] || STYLES[0];
  const activeManifestation = MANIFESTATION_THEMES.find((theme) => theme.id === manifestationId) || null;
  const manifestationText = activeManifestation ? activeManifestation.affirmations[manifestationLineIdx % activeManifestation.affirmations.length] : "Choose a manifestation focus.";

  const setMode = useCallback((mode) => { setActiveMode(mode); }, []);
  const handlePrev = useCallback((e) => {
    e?.stopPropagation?.();
    setStyleIdx((i) => (i - 1 + STYLES.length) % STYLES.length);
  }, []);
  const handleNext = useCallback((e) => {
    e?.stopPropagation?.();
    setStyleIdx((i) => (i + 1) % STYLES.length);
  }, []);

  useEffect(() => {
    if (!open) { if (animRef.current) cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    const syncCanvasSize = () => {
      const w = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
      const h = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      syncCanvasSize();
      const analysis = analysisRef.current || {};
      rootRef.current?.style.setProperty("--dome-beat", String(Math.min(1, analysis.beatStrength || analysis.pulse || 0)));
      rootRef.current?.style.setProperty("--dome-bass", String(Math.min(1, analysis.bassEnergy || 0)));
      const t = analysis.audioTime || frame * 0.016;
      const data = analysis.frequencyData || fallbackData(1024, t);
      const visualKey = activeStyle.key;
      DRAW_FNS[visualKey](canvas, ctx, data, data.length, t, analysis);
      frame++;
    };
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, activeMode, activeStyle.key, analysisRef]);

  useEffect(() => {
    if (!open || activeMode !== "affirmation") return;
    const timer = setInterval(() => setAffirmationIdx((i) => (i + 1) % GENERAL_AFFIRMATIONS.length), isPlaying ? 4200 : 8500);
    return () => clearInterval(timer);
  }, [open, activeMode, isPlaying]);
  useEffect(() => {
    if (!open || activeMode !== "manifestation" || !activeManifestation) return;
    const timer = setInterval(() => setManifestationLineIdx((i) => (i + 1) % activeManifestation.affirmations.length), isPlaying ? 4600 : 9000);
    return () => clearInterval(timer);
  }, [open, activeMode, isPlaying, activeManifestation]);

  if (!open) return null;
  const modeTitle = activeStyle.label;

  return (
    <motion.div ref={rootRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[65] flex flex-col overflow-hidden" style={{ background: "rgba(4,4,14,0.97)", pointerEvents: "auto", height: "100dvh", minHeight: "100dvh", boxSizing: "border-box", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)", paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)", touchAction: "manipulation" }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none", opacity: activeMode === "visualizer" ? 1 : 0.66, transition: "opacity 0.35s ease" }} />
      {activeMode !== "visualizer" && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(20,10,40,0.34) 0%, rgba(4,4,14,0.62) 100%)" }} />}

      <div className="relative z-30 flex flex-col gap-2 px-3 pt-2 pb-1 flex-shrink-0" style={{ maxWidth: "100vw", pointerEvents: "auto" }}>
        <div className="flex items-center justify-between">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} onTouchStart={(e) => e.stopPropagation()} className="flex items-center gap-1.5 rounded-xl text-[11px] font-bold transition-all hover:brightness-110 active:scale-95" style={{ background: "linear-gradient(135deg,#7C3AED,#A078FF)", border: "1px solid rgba(160,120,255,0.5)", color: "#fff", minWidth: 50, minHeight: 38, padding: "0 10px", touchAction: "manipulation", pointerEvents: "auto" }} aria-label="Exit Visualizer Dome"><ChevronLeft className="w-4 h-4" /> <span>Exit</span></button>
        </div>
        <div className="flex justify-center min-w-0"><div className="flex items-center gap-1 rounded-2xl p-1 overflow-x-auto hide-scrollbar" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", maxWidth: "calc(100vw - 32px)", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity", pointerEvents: "auto" }}>{MODES.map(({ id, label, icon: Icon }) => (<button key={id} onClick={(e) => { e.stopPropagation(); e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); setMode(id); }} onTouchStart={(e) => e.stopPropagation()} className="flex items-center gap-1 rounded-xl font-black transition-all whitespace-nowrap flex-shrink-0" style={{ background: activeMode === id ? "rgba(160,120,255,0.25)" : "transparent", border: `1px solid ${activeMode === id ? "rgba(160,120,255,0.4)" : "transparent"}`, color: activeMode === id ? "#A078FF" : "rgba(255,255,255,0.5)", padding: "6px 7px", fontSize: 9.5, minHeight: 34, scrollSnapAlign: "center", touchAction: "manipulation", pointerEvents: "auto" }}><Icon style={{ width: 10, height: 10, flexShrink: 0 }} /><span>{label}</span></button>))}</div></div>
      </div>

      {activeMode !== "manifestation" && <ConnectedBadge track={currentTrack} isPlaying={isPlaying} />}

      <div className="relative z-20 flex justify-center items-center gap-2 py-1 flex-shrink-0" style={{ pointerEvents: "auto" }}><button onClick={handlePrev} onTouchStart={(e) => e.stopPropagation()} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/15 active:scale-95" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", minWidth: 44, minHeight: 44, touchAction: "manipulation", pointerEvents: "auto" }} aria-label="Previous Dome item"><ChevronLeft className="w-5 h-5" /></button><span className="text-[10px] sm:text-xs font-black tracking-wider text-white/60 text-center truncate" style={{ width: "min(220px, 44vw)" }}>{modeTitle}</span><button onClick={handleNext} onTouchStart={(e) => e.stopPropagation()} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/15 active:scale-95" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", minWidth: 44, minHeight: 44, touchAction: "manipulation", pointerEvents: "auto" }} aria-label="Next Dome item"><ChevronRight className="w-5 h-5" /></button></div>


      {activeMode === "affirmation" && <DomeTextScene eyebrow="Frequency Room · Affirmations" text={GENERAL_AFFIRMATIONS[affirmationIdx]} themeColor="#A078FF" themeGlow="rgba(160,120,255,0.3)" />}
      {activeMode === "manifestation" && <DomeTextScene eyebrow="Frequency Room · Manifestation" title={activeManifestation?.label || "Select Focus"} text={manifestationText} themeColor={activeManifestation?.color || "#A078FF"} themeGlow={activeManifestation?.glow || "rgba(160,120,255,0.3)"} />}

      {activeMode === "manifestation" && (
        <ManifestationFocusSelector
          themes={MANIFESTATION_THEMES}
          activeId={manifestationId}
          onSelect={(id) => { setManifestationId(id); setManifestationLineIdx(0); }}
        />
      )}
    </motion.div>
  );
}