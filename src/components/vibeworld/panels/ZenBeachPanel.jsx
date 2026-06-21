import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Waves, Timer, Wind, Music4, Sparkles } from "lucide-react";

const OPTIONS = [
  { id: "1min", label: "1 Minute Reset", icon: Timer, duration: 60, desc: "Quick mental reset" },
  { id: "3min", label: "3 Minute Calm", icon: Waves, duration: 180, desc: "Find your center" },
  { id: "5min", label: "5 Minute Deep Vibe", icon: Sparkles, duration: 300, desc: "Full immersion" },
];

export default function ZenBeachPanel({ open, onClose, isMobile }) {
  const [activeMode, setActiveMode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [breathing, setBreathing] = useState(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!open) { setActiveMode(null); setBreathing(null); return; }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  const startTimer = (duration, mode) => {
    setActiveMode(mode);
    setTimeLeft(duration);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); setActiveMode(null); setBreathing(null); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const startBreathing = () => {
    setActiveMode("breathing");
    setBreathing("in");
    let phase = 0;
    const cycle = () => {
      phase = (phase + 1) % 4;
      setBreathing(phase === 0 ? "in" : phase === 1 ? "hold" : phase === 2 ? "out" : "hold");
      const delay = phase === 0 || phase === 2 ? 4000 : 2000;
      timerRef.current = setTimeout(cycle, delay);
    };
    timerRef.current = setTimeout(cycle, 0);
  };

  const stopActive = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setActiveMode(null);
    setBreathing(null);
    setTimeLeft(0);
  };

  const playCalmMusic = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; return; }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 432;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      audioRef.current = { ctx, osc, gain };
    } catch {}
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 72,
        height: isMobile ? "88dvh" : "75vh",
        background: "rgba(6,10,20,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(0,212,240,0.15)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-cyan-400" />
          <h3 className="font-heading font-black text-lg text-white">Zen Beach</h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{
            color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44,
            touchAction: "manipulation", pointerEvents: "auto",
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {activeMode ? (
          <div className="flex flex-col items-center py-8">
            {breathing && (
              <motion.div
                className="rounded-full flex items-center justify-center mb-6"
                style={{
                  width: 120, height: 120,
                  background: breathing === "in" ? "rgba(0,212,240,0.12)" : breathing === "out" ? "rgba(160,120,255,0.12)" : "rgba(0,212,240,0.06)",
                  border: `2px solid ${breathing === "in" ? "rgba(0,212,240,0.5)" : breathing === "out" ? "rgba(160,120,255,0.5)" : "rgba(255,255,255,0.15)"}`,
                }}
                animate={{ scale: breathing === "in" ? 1.15 : breathing === "out" ? 0.92 : 1 }}
                transition={{ duration: breathing === "hold" ? 2 : 4, ease: "easeInOut" }}
              >
                <span className="text-sm font-black text-white/70 uppercase tracking-wider">
                  {breathing === "in" ? "Inhale" : breathing === "out" ? "Exhale" : "Hold"}
                </span>
              </motion.div>
            )}
            {timeLeft > 0 && (
              <div className="text-center mb-6">
                <p className="font-heading font-black text-5xl text-white mb-1">{formatTime(timeLeft)}</p>
                <p className="text-xs text-white/30">remaining</p>
                <div className="w-48 h-1 mt-4 rounded-full mx-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${(timeLeft / (activeMode === "1min" ? 60 : activeMode === "3min" ? 180 : 300)) * 100}%`,
                      background: "linear-gradient(90deg,#00D4F0,#A078FF)",
                    }} />
                </div>
              </div>
            )}
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={stopActive}
              className="px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)", minHeight: 44, touchAction: "manipulation",
              }}
            >
              Exit Session
            </button>
          </div>
        ) : (
          <>
            <div className="text-center py-2">
              <Waves className="w-8 h-8 mx-auto mb-2 text-cyan-400/60" />
              <p className="text-sm text-white/40 leading-relaxed">
                A calm space to reset, breathe, and connect with the ocean energy.
              </p>
            </div>
            <div className="space-y-2.5">
              {OPTIONS.map((opt) => (
                <button key={opt.id}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => startTimer(opt.duration, opt.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    minHeight: 52, touchAction: "manipulation",
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,212,240,0.1)", border: "1px solid rgba(0,212,240,0.2)" }}>
                    <opt.icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/80">{opt.label}</p>
                    <p className="text-[10px] text-white/30">{opt.desc}</p>
                  </div>
                  <Timer className="w-4 h-4 text-white/20" />
                </button>
              ))}
            </div>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={startBreathing}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "rgba(160,120,255,0.06)", border: "1px solid rgba(160,120,255,0.15)",
                minHeight: 52, touchAction: "manipulation",
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(160,120,255,0.1)", border: "1px solid rgba(160,120,255,0.2)" }}>
                <Wind className="w-4 h-4 text-purple-300" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold text-white/80">Breathing Mode</p>
                <p className="text-[10px] text-white/30">Guided inhale / exhale cycle</p>
              </div>
            </button>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={playCalmMusic}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "rgba(237,184,74,0.06)", border: "1px solid rgba(237,184,74,0.15)",
                minHeight: 52, touchAction: "manipulation",
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(237,184,74,0.1)", border: "1px solid rgba(237,184,74,0.2)" }}>
                <Music4 className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold text-white/80">Calm Music</p>
                <p className="text-[10px] text-white/30">Gentle 432Hz background tone</p>
              </div>
            </button>
          </>
        )}
      </div>
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 flex items-center justify-center">
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", minHeight: 44, touchAction: "manipulation",
          }}>
          Close Zen Beach
        </button>
      </div>
    </motion.div>
  );
}