/**
 * HoverboardPanel — HUD for the expanded 16-ring Hoverboard Ring Run.
 * Features: score, combo streaks, ring progress bar, trail-boost reward.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, RotateCcw, Star, Wind } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { HOVERBOARD_RINGS } from "../HoverboardRingRun";

const RING_COUNT = 10;
const GAME_DURATION = 60; // seconds

// Points per ring
const RING_POINTS = [
  100, 150, 100, 200, 100, // out leg
  100, 200, 150, 200, 400, // return leg (last ring = bonus)
];

// Ring colors for the progress bar
const RING_COLORS = [
  "#00E5FF","#C43BFF","#00E5FF","#FFD700","#C43BFF",
  "#00E5FF","#FFD700","#C43BFF","#00E5FF","#FFD700",
];

export default function HoverboardPanel({
  visible,
  isMobile,
  user,
  onStartRide,
  onEndRide,
}) {
  const [phase, setPhase] = useState("idle"); // idle | riding | finished
  const [score, setScore]       = useState(0);
  const [combo, setCombo]       = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [ringsHit, setRingsHit] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem("hb_highscore") || "0", 10); } catch { return 0; }
  });
  const [showFlash, setShowFlash] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [trailUnlocked, setTrailUnlocked] = useState(false);
  const timerRef     = useRef(null);
  const comboTimerRef = useRef(null);
  const scoreRef     = useRef(0); // always in sync for endGame closure
  const ringsRef     = useRef(0);
  const comboRef     = useRef(0);

  useEffect(() => { if (user?.hb_high_score) setHighScore(user.hb_high_score); }, [user?.hb_high_score]);

  const endGame = useCallback((finalScore, finalRings) => {
    clearInterval(timerRef.current);
    clearTimeout(comboTimerRef.current);
    setPhase("finished");
    onEndRide?.();
    const didUnlock = finalRings >= 6;
    setTrailUnlocked(didUnlock);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("hb_highscore", String(finalScore));
      try { base44.auth.updateMe({ hb_high_score: finalScore, trail_boost_unlocked: didUnlock || undefined }); } catch {}
    } else if (didUnlock) {
      try { base44.auth.updateMe({ trail_boost_unlocked: true }); } catch {}
    }
  }, [highScore, onEndRide]);

  const startGame = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(comboTimerRef.current);
    scoreRef.current = 0;
    ringsRef.current = 0;
    comboRef.current = 0;
    setPhase("riding");
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setRingsHit(0);
    setTimeLeft(GAME_DURATION);
    setShowFlash(false);
    setTrailUnlocked(false);
    window.__hbResetRings = true; // tell CityCanvas to reset ring collected flags
    onStartRide?.();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endGame(scoreRef.current, ringsRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [onStartRide, endGame]);

  // Expose ring collector on window so CityCanvas render loop can call it
  useEffect(() => {
    window.__hbCollectRing = (ringIdx) => {
      if (phase !== "riding") return;
      const basePoints = RING_POINTS[ringIdx] ?? 100;
      const currentCombo = comboRef.current;
      const multiplier = currentCombo >= 5 ? 3 : currentCombo >= 3 ? 2 : 1;
      const pts = basePoints * multiplier;

      scoreRef.current += pts;
      ringsRef.current = ringIdx + 1;
      comboRef.current += 1;

      setLastPoints(pts);
      setScore(scoreRef.current);
      setRingsHit(ringIdx + 1);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 700);

      clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => { setCombo(0); comboRef.current = 0; }, 4000);

      // All 16 rings collected — finish!
      if (ringIdx + 1 >= RING_COUNT) {
        clearInterval(timerRef.current);
        setTimeout(() => endGame(scoreRef.current, ringsRef.current), 500);
      }
    };
    return () => { window.__hbCollectRing = null; };
  }, [phase, endGame]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(comboTimerRef.current);
  }, []);

  if (!visible) return null;

  const PANEL_BOTTOM = isMobile
    ? "calc(140px + env(safe-area-inset-bottom, 0px))"
    : "80px";

  const comboMultiplier = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
  const timeWarning = timeLeft <= 15;
  const timePct = timeLeft / GAME_DURATION;

  return (
    <AnimatePresence mode="wait">

      {/* ── IDLE: approach prompt ── */}
      {phase === "idle" && (
        <motion.div
          key="hb-idle"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="fixed z-[65] left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ bottom: PANEL_BOTTOM, maxWidth: 360, width: "92vw" }}
        >
          <div
            className="rounded-2xl px-5 py-5 flex flex-col gap-3"
            style={{
              background: "rgba(4,2,20,0.94)",
              border: "1px solid rgba(0,229,255,0.35)",
              boxShadow: "0 0 50px rgba(0,229,255,0.14)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 flex-shrink-0" style={{ color: "#00E5FF" }} />
              <span className="font-black text-white text-sm tracking-wider">HOVERBOARD RING RUN</span>
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Surf through <span style={{ color: "#00E5FF", fontWeight: 700 }}>10 glowing rings</span> along the coastline.
              Chain rings for combos · Reach the finish portal for max rewards.
            </p>

            {/* Course highlights */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Rings", value: "10", color: "#00E5FF" },
                { label: "Time", value: "60s", color: "#C43BFF" },
                { label: "Trail Boost", value: "6+ rings", color: "#FFD700" },
              ].map((s) => (
                <div key={s.label}
                  className="flex flex-col items-center py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
                  <span className="font-black text-[12px] mt-0.5" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {highScore > 0 && (
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#FFD700" }}>
                <Trophy className="w-3 h-3" />
                <span>Personal best: <strong>{highScore.toLocaleString()}</strong> pts</span>
              </div>
            )}

            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-full font-black text-sm tracking-widest transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                color: "#000",
                boxShadow: "0 0 28px rgba(0,229,255,0.4)",
              }}
            >
              ⚡ START RIDE
            </button>

            <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.18)" }}>
              Desktop: WASD / Arrow Keys &nbsp;·&nbsp; Mobile: Joystick
            </p>
          </div>
        </motion.div>
      )}

      {/* ── RIDING: in-game HUD ── */}
      {phase === "riding" && (
        <motion.div
          key="hb-hud"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-[65] pointer-events-none"
          style={{
            top: isMobile ? "calc(56px + env(safe-area-inset-top,0px) + 8px)" : 68,
            left: "50%",
            transform: "translateX(-50%)",
            width: isMobile ? "96vw" : 480,
          }}
        >
          {/* Main HUD bar */}
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
            style={{
              background: "rgba(4,2,20,0.88)",
              border: "1px solid rgba(0,229,255,0.28)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Score */}
            <div className="flex flex-col items-center min-w-[56px]">
              <span className="text-[8px] font-bold tracking-widest" style={{ color: "rgba(0,229,255,0.55)" }}>SCORE</span>
              <span className="font-black text-white leading-none" style={{ fontSize: isMobile ? 15 : 18 }}>
                {score.toLocaleString()}
              </span>
            </div>

            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.09)", flexShrink: 0 }} />

            {/* Ring progress */}
            <div className="flex flex-col items-center min-w-[44px]">
              <span className="text-[8px] font-bold tracking-widest" style={{ color: "rgba(196,59,255,0.7)" }}>RINGS</span>
              <span className="font-black text-white leading-none" style={{ fontSize: isMobile ? 15 : 18 }}>
                {ringsHit}<span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>/{RING_COUNT}</span>
              </span>
            </div>

            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.09)", flexShrink: 0 }} />

            {/* Timer */}
            <div className="flex flex-col items-center min-w-[36px]">
              <span className="text-[8px] font-bold tracking-widest" style={{ color: timeWarning ? "#ff4455" : "rgba(0,229,255,0.55)" }}>TIME</span>
              <span className="font-black leading-none" style={{ fontSize: isMobile ? 15 : 18, color: timeWarning ? "#ff4455" : "#fff" }}>
                {timeLeft}s
              </span>
            </div>

            {/* Combo — shown when active */}
            <AnimatePresence>
              {combo >= 2 && (
                <motion.div
                  key="combo"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="flex flex-col items-center"
                  style={{ minWidth: 52 }}
                >
                  <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.09)", position: "absolute", left: 0 }} />
                  <span className="text-[8px] font-bold tracking-widest" style={{ color: "#FFD700" }}>COMBO</span>
                  <span className="font-black leading-none" style={{ fontSize: isMobile ? 15 : 18, color: "#FFD700" }}>
                    x{combo}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Multiplier badge */}
            {comboMultiplier > 1 && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[10px] flex-shrink-0"
                style={{
                  background: comboMultiplier >= 3 ? "rgba(255,60,60,0.2)" : "rgba(255,215,0,0.15)",
                  border: `1px solid ${comboMultiplier >= 3 ? "rgba(255,60,60,0.5)" : "rgba(255,215,0,0.4)"}`,
                  color: comboMultiplier >= 3 ? "#ff6060" : "#FFD700",
                }}
              >
                {comboMultiplier >= 3 ? "🔥" : "⚡"} {comboMultiplier}×
              </div>
            )}
          </div>

          {/* Ring progress dots */}
          <div className="flex gap-1 mt-1.5 justify-center flex-wrap px-2">
            {HOVERBOARD_RINGS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i < ringsHit ? 7 : 5,
                  height: i < ringsHit ? 7 : 5,
                  background: i < ringsHit ? RING_COLORS[i] : "rgba(255,255,255,0.18)",
                  boxShadow: i < ringsHit ? `0 0 6px ${RING_COLORS[i]}` : "none",
                  marginTop: i < ringsHit ? 0 : 1,
                }}
              />
            ))}
          </div>

          {/* Time bar */}
          <div
            className="mt-1.5 mx-1 rounded-full overflow-hidden"
            style={{ height: 3, background: "rgba(255,255,255,0.08)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${timePct * 100}%`,
                background: timeWarning
                  ? "linear-gradient(90deg,#ff4455,#ff6060)"
                  : "linear-gradient(90deg,#00B8D4,#00E5FF)",
                transition: "width 1s linear",
              }}
            />
          </div>

          {/* Points flash */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                key={`flash-${lastPoints}`}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -40, scale: 1.4 }}
                exit={{}}
                transition={{ duration: 0.7 }}
                className="absolute left-1/2 font-black"
                style={{
                  top: 60,
                  color: comboMultiplier >= 3 ? "#ff6060" : comboMultiplier >= 2 ? "#FFD700" : "#00E5FF",
                  fontSize: comboMultiplier >= 2 ? 22 : 18,
                  transform: "translateX(-50%)",
                  textShadow: `0 0 24px currentColor`,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                +{lastPoints.toLocaleString()} {comboMultiplier >= 2 ? `x${comboMultiplier}` : ""}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── FINISHED: results panel ── */}
      {phase === "finished" && (
        <motion.div
          key="hb-finish"
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed z-[65] left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ bottom: PANEL_BOTTOM, maxWidth: 360, width: "92vw" }}
        >
          <div
            className="rounded-2xl px-5 py-5 flex flex-col gap-3.5"
            style={{
              background: "rgba(4,2,20,0.97)",
              border: "1px solid rgba(0,229,255,0.4)",
              boxShadow: "0 0 60px rgba(0,229,255,0.16)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 flex-shrink-0" style={{ color: "#FFD700" }} />
              <span className="font-black text-white text-sm tracking-wider">
                {ringsHit >= RING_COUNT ? "🏆 PERFECT RUN!" : ringsHit >= 12 ? "⚡ GREAT RIDE!" : "RIDE COMPLETE!"}
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Score",     value: score.toLocaleString(), color: "#00E5FF" },
                { label: "Rings Hit", value: `${ringsHit} / ${RING_COUNT}`, color: "#C43BFF" },
                { label: "Best Combo",value: `x${maxCombo}`, color: "#FFD700" },
                { label: "High Score",value: highScore.toLocaleString(), color: "#FFD700" },
              ].map((s) => (
                <div key={s.label}
                  className="flex flex-col items-center p-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
                  <span className="font-black text-sm mt-0.5" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* New high score badge */}
            {score >= highScore && score > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black"
                style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", color: "#FFD700" }}
              >
                🏆 New Personal Best!
              </div>
            )}

            {/* Trail boost unlock */}
            {trailUnlocked && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)" }}
              >
                <Wind className="w-4 h-4 flex-shrink-0" style={{ color: "#FFD700" }} />
                <div>
                  <p className="text-[11px] font-black" style={{ color: "#FFD700" }}>⚡ Trail Boost Unlocked!</p>
                  <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,215,0,0.6)" }}>Active in Avatar Customizer — keep riding to maintain it</p>
                </div>
              </motion.div>
            )}

            {/* Orb reward */}
            {ringsHit > 0 && !trailUnlocked && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
                style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.18)", color: "rgba(0,229,255,0.8)" }}
              >
                ✦ +{ringsHit} Vibe Orbs earned — ride 6+ rings to unlock Trail Boost!
              </div>
            )}

            <div className="flex gap-2 mt-0.5">
              <button
                onClick={startGame}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}
              >
                <RotateCcw className="w-4 h-4" /> Ride Again
              </button>
              <button
                onClick={() => setPhase("idle")}
                className="flex items-center justify-center w-12 rounded-full transition-all hover:bg-white/10 active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}