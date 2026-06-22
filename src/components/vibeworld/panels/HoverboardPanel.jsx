/**
 * HoverboardPanel — game HUD overlay for the Hoverboard Ring Run mini-game.
 * Shows: start prompt, in-game score/timer, end-game results, replay.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, RotateCcw, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";

const RING_COUNT = 8;
const GAME_DURATION = 45; // seconds
const RING_POINTS = [100, 150, 200, 250, 300, 350, 400, 500]; // per ring

export default function HoverboardPanel({
  visible,
  isMobile,
  user,
  onStartRide,
  onEndRide,
  nextRingIdx,       // which ring the player should target next (0-based)
  onRingCollected,   // called by parent when player passes a ring
}) {
  const [phase, setPhase] = useState("idle"); // idle | riding | finished
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [ringsHit, setRingsHit] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem("hb_highscore") || "0", 10); } catch { return 0; }
  });
  const [showFlash, setShowFlash] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const timerRef = useRef(null);
  const comboTimerRef = useRef(null);

  // Load high score from user account if available
  useEffect(() => {
    if (user?.hb_high_score) setHighScore(user.hb_high_score);
  }, [user?.hb_high_score]);

  const endGame = useCallback((finalScore) => {
    clearInterval(timerRef.current);
    clearTimeout(comboTimerRef.current);
    setPhase("finished");
    onEndRide?.();
    // Save high score
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("hb_highscore", String(finalScore));
      try {
        base44.auth.updateMe({ hb_high_score: finalScore });
      } catch {}
    }
  }, [highScore, onEndRide]);

  const startGame = useCallback(() => {
    setPhase("riding");
    setScore(0);
    setCombo(0);
    setRingsHit(0);
    setTimeLeft(GAME_DURATION);
    setShowFlash(false);
    onStartRide?.();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setScore((s) => { endGame(s); return s; });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [onStartRide, endGame]);

  // Parent calls this via onRingCollected prop when player hits a ring
  useEffect(() => {
    if (typeof onRingCollected !== "function") return;
    // Expose a collector fn on window for CityCanvas to call
    window.__hbCollectRing = (ringIdx) => {
      if (phase !== "riding") return;
      const pts = (RING_POINTS[ringIdx] || 100) * Math.max(1, combo);
      setLastPoints(pts);
      setScore((s) => s + pts);
      setCombo((c) => c + 1);
      setRingsHit((r) => {
        const next = r + 1;
        if (next >= RING_COUNT) {
          setScore((s) => { endGame(s); return s; });
        }
        return next;
      });
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 600);
      clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => setCombo(0), 3000);
    };
    return () => { window.__hbCollectRing = null; };
  }, [phase, combo, endGame, onRingCollected]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(comboTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  const PANEL_BOTTOM = isMobile
    ? "calc(140px + env(safe-area-inset-bottom, 0px))"
    : "80px";

  return (
    <AnimatePresence>
      {phase === "idle" && (
        <motion.div
          key="hb-idle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed z-[65] left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ bottom: PANEL_BOTTOM, maxWidth: 340, width: "90vw" }}
        >
          <div
            className="rounded-2xl px-5 py-4 flex flex-col gap-3"
            style={{
              background: "rgba(4,2,20,0.92)",
              border: "1px solid rgba(0,229,255,0.35)",
              boxShadow: "0 0 40px rgba(0,229,255,0.15)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 flex-shrink-0" style={{ color: "#00E5FF" }} />
              <span className="font-black text-white text-sm tracking-wider">HOVERBOARD RING RUN</span>
            </div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              Ride through {RING_COUNT} glowing rings to earn points. Combo streaks multiply your score!
            </p>
            {highScore > 0 && (
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#00E5FF" }}>
                <Trophy className="w-3 h-3" />
                <span>Best: {highScore.toLocaleString()} pts</span>
              </div>
            )}
            <button
              onClick={startGame}
              className="w-full py-3 rounded-full font-black text-sm tracking-widest transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                color: "#000",
                boxShadow: "0 0 24px rgba(0,229,255,0.4)",
              }}
            >
              ⚡ START RIDE
            </button>
            <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
              Desktop: WASD/Arrow Keys · Mobile: Joystick
            </p>
          </div>
        </motion.div>
      )}

      {phase === "riding" && (
        <motion.div
          key="hb-hud"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-[65] pointer-events-none"
          style={{ top: isMobile ? "calc(56px + env(safe-area-inset-top,0px) + 8px)" : 72, left: "50%", transform: "translateX(-50%)" }}
        >
          {/* Score bar */}
          <div
            className="flex items-center gap-4 px-5 py-2.5 rounded-full"
            style={{
              background: "rgba(4,2,20,0.85)",
              border: "1px solid rgba(0,229,255,0.3)",
              backdropFilter: "blur(10px)",
              whiteSpace: "nowrap",
            }}
          >
            {/* Score */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(0,229,255,0.6)" }}>SCORE</span>
              <span className="font-black text-white text-base leading-none">{score.toLocaleString()}</span>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
            {/* Rings */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(0,229,255,0.6)" }}>RINGS</span>
              <span className="font-black text-white text-base leading-none">{ringsHit}/{RING_COUNT}</span>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
            {/* Timer */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold tracking-widest" style={{ color: timeLeft <= 10 ? "#ff4455" : "rgba(0,229,255,0.6)" }}>TIME</span>
              <span className="font-black text-base leading-none" style={{ color: timeLeft <= 10 ? "#ff4455" : "#fff" }}>{timeLeft}s</span>
            </div>
            {combo >= 2 && (
              <>
                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: "#FFD700" }}>COMBO</span>
                  <span className="font-black text-base leading-none" style={{ color: "#FFD700" }}>x{combo}</span>
                </div>
              </>
            )}
          </div>

          {/* Points flash */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                key="flash"
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -30, scale: 1.3 }}
                exit={{}}
                transition={{ duration: 0.6 }}
                className="absolute left-1/2 font-black text-lg"
                style={{ color: "#00E5FF", top: 50, transform: "translateX(-50%)", textShadow: "0 0 20px #00E5FF", pointerEvents: "none" }}
              >
                +{lastPoints.toLocaleString()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next ring arrow */}
          <div className="text-center mt-2">
            <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
              Next → Ring {(nextRingIdx ?? 0) + 1}
            </span>
          </div>
        </motion.div>
      )}

      {phase === "finished" && (
        <motion.div
          key="hb-finish"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-[65] left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ bottom: PANEL_BOTTOM, maxWidth: 340, width: "90vw" }}
        >
          <div
            className="rounded-2xl px-5 py-5 flex flex-col gap-4"
            style={{
              background: "rgba(4,2,20,0.96)",
              border: "1px solid rgba(0,229,255,0.4)",
              boxShadow: "0 0 50px rgba(0,229,255,0.18)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" style={{ color: "#FFD700" }} />
              <span className="font-black text-white text-sm tracking-wider">RIDE COMPLETE!</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Score", value: score.toLocaleString(), color: "#00E5FF" },
                { label: "Rings", value: `${ringsHit}/${RING_COUNT}`, color: "#C43BFF" },
                { label: "Best", value: highScore.toLocaleString(), color: "#FFD700" },
              ].map((s) => (
                <div key={s.label}
                  className="flex flex-col items-center p-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
                  <span className="font-black text-sm mt-0.5" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {score >= highScore && score > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black"
                style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", color: "#FFD700" }}
              >
                🏆 New High Score!
              </div>
            )}

            {/* Orb reward */}
            {ringsHit > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
                style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.2)", color: "rgba(0,229,255,0.8)" }}
              >
                ✦ +{ringsHit} Vibe Orbs earned for the ride!
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={startGame}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}
              >
                <RotateCcw className="w-4 h-4" /> Replay
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