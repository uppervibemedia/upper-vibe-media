import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, ArrowLeft, Sparkles, Waves } from "lucide-react";

const INTENTION_WORDS = ["calm", "focus", "confidence", "discipline", "gratitude", "peace"];

const EXERCISES = [
  {
    id: "reset",
    title: "60-Second Reset",
    purpose: "Quick calm-down reset for when you feel overstimulated.",
    instructions: "Take one minute to reset your energy. Relax your face, drop your shoulders, and follow the breathing circle.",
    steps: ["Inhale slowly", "Hold briefly", "Exhale longer than you inhale", "Repeat until the timer ends"],
    timer: 60,
    completion: "Reset complete. Your body is calmer now.",
  },
  {
    id: "stress",
    title: "Release Stress",
    purpose: "Body relaxation for when you're holding tension.",
    instructions: "Scan your body and release tension one area at a time.",
    steps: ["Relax your jaw", "Drop your shoulders", "Soften your chest", "Unclench your hands", "Release your stomach", "Let your body feel heavier and safer"],
    timer: 120,
    completion: "Stress released. Your body has more space now.",
  },
  {
    id: "clear",
    title: "Clear Your Mind",
    purpose: "Mental clarity for when racing thoughts won't stop.",
    instructions: "Let your thoughts slow down. You do not have to solve everything right now.",
    steps: ["Notice the thought", "Let it pass", "Return to the breath", "Focus on one calm word: clear", "Repeat gently"],
    timer: 120,
    completion: "Your mind is clearer. Move from calm, not pressure.",
  },
  {
    id: "intention",
    title: "Set Your Intention",
    purpose: "Choose your energy before returning to the world.",
    instructions: "Choose the energy you want to move with next.",
    steps: ["Breathe in slowly", "Ask: What energy am I choosing?", "Pick one word", "Hold that word while breathing"],
    timer: 120,
    completion: "Intention set. Move with that energy.",
  },
  {
    id: "gratitude",
    title: "Gratitude Shift",
    purpose: "Raise your mood and shift attention to what's working.",
    instructions: "Think of three things you are grateful for right now.",
    steps: ["Name one thing you have", "Name one thing you are learning", "Name one thing that is still possible", "Breathe and let your mood shift"],
    timer: 120,
    completion: "Gratitude activated. Your frequency has shifted.",
  },
  {
    id: "deep",
    title: "Deep Vibe Session",
    purpose: "A longer full reset for deeper calm.",
    instructions: "Use this session to calm your body, clear your mind, and return to your center.",
    steps: ["Start with slow breathing", "Release body tension", "Clear mental noise", "Set one intention", "End with gratitude"],
    timer: 300,
    completion: "Deep Vibe complete. You are centered and ready.",
  },
];

export default function ZenBeachPanel({ open, onClose, isMobile }) {
  const [phase, setPhase] = useState("menu"); // "menu" | "breathing" | "pause" | "done"
  const [exercise, setExercise] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [breathStep, setBreathStep] = useState(null); // "in" | "hold" | "out" | null
  const [bodyStep, setBodyStep] = useState(0);
  const [intentionWord, setIntentionWord] = useState(null);
  const timerRef = useRef(null);
  const breathRef = useRef(null);

  const resetAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (breathRef.current) clearTimeout(breathRef.current);
    setPhase("menu");
    setExercise(null);
    setTimeLeft(0);
    setTotalTime(0);
    setBreathStep(null);
    setBodyStep(0);
    setIntentionWord(null);
  }, []);

  useEffect(() => {
    if (!open) { resetAll(); return; }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathRef.current) clearTimeout(breathRef.current);
    };
  }, [open, resetAll]);

  // Breath cycle for Reset (4s in, 2s hold, 6s out)
  const runBreathCycle = useCallback(() => {
    setBreathStep("in");
    const cycle = () => {
      setBreathStep((prev) => {
        if (prev === "in") {
          breathRef.current = setTimeout(cycle, 4000);
          return "hold";
        }
        if (prev === "hold") {
          breathRef.current = setTimeout(cycle, 2000);
          return "out";
        }
        // out → in
        breathRef.current = setTimeout(cycle, 6000);
        return "in";
      });
    };
    breathRef.current = setTimeout(cycle, 0);
  }, []);

  // Body scan step rotation for Release Stress
  const runBodyScan = useCallback(() => {
    const exerciseData = EXERCISES.find((e) => e.id === "stress");
    const steps = exerciseData.steps;
    setBodyStep(0);
    let idx = 0;
    const interval = Math.floor((exerciseData.timer * 1000) / steps.length);
    const rotate = () => {
      idx++;
      if (idx < steps.length) {
        setBodyStep(idx);
        breathRef.current = setTimeout(rotate, interval);
      }
    };
    breathRef.current = setTimeout(rotate, interval);
  }, []);

  const startExercise = useCallback((ex) => {
    setExercise(ex);
    setTimeLeft(ex.timer);
    setTotalTime(ex.timer);
    setPhase("breathing");
    setBreathStep(null);
    setBodyStep(0);
    setIntentionWord(null);

    if (ex.id === "reset") runBreathCycle();
    if (ex.id === "stress") runBodyScan();

    // Countdown timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (breathRef.current) clearTimeout(breathRef.current);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [runBreathCycle, runBodyScan]);

  const backToMenu = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (breathRef.current) clearTimeout(breathRef.current);
    setPhase("menu");
    setExercise(null);
    setBreathStep(null);
    setBodyStep(0);
    setIntentionWord(null);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open) return null;

  const progressPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

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
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          {phase !== "menu" ? (
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={backToMenu}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.5)", minWidth: 36, minHeight: 36, touchAction: "manipulation" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Waves className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          )}
          <h3 className="font-heading font-black text-lg text-white truncate">
            {phase === "done" ? "Complete" : phase === "menu" ? "Zen Beach" : exercise?.title || "Session"}
          </h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); resetAll(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{
            color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44,
            touchAction: "manipulation", pointerEvents: "auto",
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {phase === "menu" && (
          <div className="space-y-4">
            <div className="text-center pb-2">
              <Waves className="w-8 h-8 mx-auto mb-2 text-cyan-400/60" />
              <p className="text-sm text-white/35 leading-relaxed max-w-xs mx-auto">
                A calm space to reset, breathe, and reconnect with your energy.
              </p>
            </div>
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => startExercise(ex)}
                className="w-full text-left px-4 py-3.5 rounded-2xl transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  minHeight: 52,
                  touchAction: "manipulation",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white/85">{ex.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{ex.purpose}</p>
                  </div>
                  <span className="text-[10px] font-black text-white/20 flex-shrink-0">
                    {Math.floor(ex.timer / 60)}:{String(ex.timer % 60).padStart(2, "0")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {phase === "breathing" && exercise && (
          <div className="flex flex-col items-center">
            {/* Timer */}
            <div className="text-center mb-6">
              <p className="font-heading font-black text-5xl text-white mb-1">{formatTime(timeLeft)}</p>
              <p className="text-xs text-white/25">remaining</p>
              <div className="w-48 h-1 mt-4 rounded-full mx-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg,#00D4F0,#A078FF)",
                  }} />
              </div>
            </div>

            {/* Exercise-specific visual */}
            {exercise.id === "reset" && breathStep && (
              <motion.div
                className="rounded-full flex items-center justify-center mb-5"
                style={{
                  width: 100, height: 100,
                  background: breathStep === "out" ? "rgba(160,120,255,0.1)" : "rgba(0,212,240,0.1)",
                  border: `2px solid ${breathStep === "out" ? "rgba(160,120,255,0.5)" : "rgba(0,212,240,0.45)"}`,
                }}
                animate={{ scale: breathStep === "in" ? 1.12 : breathStep === "out" ? 0.9 : 1 }}
                transition={{ duration: breathStep === "hold" ? 2 : breathStep === "in" ? 4 : 6, ease: "easeInOut" }}
              >
                <span className="text-xs font-black text-white/60 uppercase tracking-wider">
                  {breathStep === "in" ? "Inhale" : breathStep === "hold" ? "Hold" : "Exhale"}
                </span>
              </motion.div>
            )}

            {exercise.id === "intention" && intentionWord && (
              <div className="mb-5 px-5 py-3 rounded-2xl"
                style={{ background: "rgba(160,120,255,0.08)", border: "1px solid rgba(160,120,255,0.2)" }}>
                <p className="text-xs text-white/40 mb-1 text-center">Your Intention</p>
                <p className="text-xl font-heading font-black text-purple-300 text-center capitalize">{intentionWord}</p>
              </div>
            )}

            {/* Instructions */}
            <p className="text-xs text-white/40 text-center max-w-xs mb-4 leading-relaxed">
              {exercise.instructions}
            </p>

            {/* Steps */}
            <div className="space-y-1.5 w-full max-w-xs">
              {exercise.steps.map((step, i) => {
                const isActive =
                  exercise.id === "stress" ? i === bodyStep :
                  exercise.id === "intention" ? i === 2 : i === 0;
                return (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: isActive ? "rgba(0,212,240,0.06)" : "transparent",
                      border: isActive ? "1px solid rgba(0,212,240,0.15)" : "1px solid transparent",
                    }}>
                    <Sparkles className="w-3 h-3 flex-shrink-0"
                      style={{ color: isActive ? "#00D4F0" : "rgba(255,255,255,0.15)" }} />
                    <span className="text-[11px] font-medium"
                      style={{ color: isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Intention word picker */}
            {exercise.id === "intention" && !intentionWord && (
              <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-xs">
                {INTENTION_WORDS.map((w) => (
                  <button
                    key={w}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => setIntentionWord(w)}
                    className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide capitalize transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: "rgba(160,120,255,0.1)",
                      border: "1px solid rgba(160,120,255,0.25)",
                      color: "rgba(255,255,255,0.6)",
                      minHeight: 32,
                      touchAction: "manipulation",
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}

            {/* Exit button */}
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={backToMenu}
              className="mt-6 px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)", minHeight: 44, touchAction: "manipulation",
              }}
            >
              Exit Session
            </button>
          </div>
        )}

        {phase === "done" && exercise && (
          <div className="flex flex-col items-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: "rgba(0,212,240,0.1)", border: "2px solid rgba(0,212,240,0.3)" }}
            >
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <p className="text-lg font-heading font-black text-white mb-2">{exercise.title}</p>
            <p className="text-sm text-white/50 text-center max-w-xs leading-relaxed mb-6">
              {exercise.completion}
            </p>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={backToMenu}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,240,0.15), rgba(160,120,255,0.15))",
                border: "1px solid rgba(0,212,240,0.25)",
                color: "#00D4F0",
                minHeight: 44,
                touchAction: "manipulation",
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Zen Beach
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 flex items-center justify-center">
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); resetAll(); onClose(); }}
          className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", minHeight: 44, touchAction: "manipulation",
          }}
        >
          Close Zen Beach
        </button>
      </div>
    </motion.div>
  );
}