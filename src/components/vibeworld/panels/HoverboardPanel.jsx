/**
 * HoverboardPanel — beach launch pad HUD.
 * Beach Vibe Coins: collected this ride, added to Vibe Coin wallet.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, Wind, Star, Coins } from "lucide-react";


export default function HoverboardPanel({ visible, isMobile, mobileLayout, user, onStartRide, onEndRide, onCoinsEarned }) {
  const [phase, setPhase] = useState("idle");
  const [sessionCoins, setSessionCoins] = useState(0);
  const [sessionBest, setSessionBest] = useState(() => {
    try { return parseInt(localStorage.getItem("uvc_hoverboard_best") || "0", 10); } catch { return 0; }
  });
  const [boostFlash, setBoostFlash] = useState(false);
  const [launchFlash, setLaunchFlash] = useState(false);
  const [collectFlashes, setCollectFlashes] = useState([]);
  const flashIdRef = useRef(0);

  const phaseRef = useRef("idle");
  const sessionRef = useRef(0);
  const onEndRideRef = useRef(onEndRide);
  const onStartRideRef = useRef(onStartRide);
  const onCoinsEarnedRef = useRef(onCoinsEarned);
  useEffect(() => { onEndRideRef.current = onEndRide; }, [onEndRide]);
  useEffect(() => { onStartRideRef.current = onStartRide; }, [onStartRide]);
  useEffect(() => { onCoinsEarnedRef.current = onCoinsEarned; }, [onCoinsEarned]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const startRide = useCallback(() => {
    sessionRef.current = 0;
    setSessionCoins(0);
    setCollectFlashes([]);
    setBoostFlash(false);
    phaseRef.current = "riding";
    setPhase("riding");
    window.__hbResetRings = true;
    onStartRideRef.current?.();
  }, []);

  const exitRide = useCallback(() => {
    phaseRef.current = "idle";
    setPhase("idle");
    onEndRideRef.current?.();

    const earned = sessionRef.current;
    if (earned > 0) {
      // Save personal best
      try {
        const prev = parseInt(localStorage.getItem("uvc_hoverboard_best") || "0", 10);
        if (earned > prev) { localStorage.setItem("uvc_hoverboard_best", String(earned)); setSessionBest(earned); }
      } catch {}
      // Coins were already credited per-coin via vibeCoinsCollected events during the ride
    }
  }, []);

  useEffect(() => {
    window.__hbCollectOrb = (orbId) => {
      if (phaseRef.current !== "riding") return;
      // Find coin value from BEACH_ORBS config via the mesh userData
      // CityCanvas passes orbId from BEACH_ORBS array — we look it up there
      // The value is stored on the mesh group.userData.coinValue
      const scene = window.__hbScene;
      const orbs = scene?.userData?.hbOrbMeshes;
      const coinEntry = orbs ? orbs.find(o => o.id === orbId) : null;
      const coinValue = coinEntry?.value ?? 1;

      sessionRef.current += coinValue;
      setSessionCoins(c => c + coinValue);

      // Coin collect flash popup
      const id = ++flashIdRef.current;
      const label = coinValue >= 5 ? `+${coinValue} Vibe Coins ✦` : `+${coinValue} Vibe Coin`;
      setCollectFlashes(prev => [...prev, { id, label, bonus: coinValue >= 5 }]);
      setTimeout(() => setCollectFlashes(prev => prev.filter(f => f.id !== id)), 1400);

      // Dispatch vibeCoinsCollected — one unique ID per coin unit so wallet deduplication works
      const ts = Date.now();
      const coinIds = Array.from({ length: coinValue }, (_, i) => `beach_${orbId}_${ts}_${i}`);
      window.dispatchEvent(new CustomEvent("vibeCoinsCollected", {
        detail: { coinIds, source: "hoverboard_orb" }
      }));

      onCoinsEarnedRef.current?.(coinValue);
    };

    window.__hbBoostTriggered = () => {
      if (phaseRef.current !== "riding") return;
      setBoostFlash(true);
      setTimeout(() => setBoostFlash(false), 900);
    };
    window.__hbLaunchTriggered = () => {
      if (phaseRef.current !== "riding") return;
      setLaunchFlash(true);
      setTimeout(() => setLaunchFlash(false), 1200);
    };
    return () => { window.__hbCollectOrb = null; window.__hbBoostTriggered = null; window.__hbLaunchTriggered = null; };
  }, []);

  if (!visible) return null;

  const PANEL_BOTTOM = isMobile && mobileLayout
    ? mobileLayout.actionBottom
    : isMobile
      ? "calc(140px + env(safe-area-inset-bottom, 0px))"
      : "80px";
  const HUD_TOP = isMobile && mobileLayout
    ? mobileLayout.sa.top + 56
    : isMobile
      ? "calc(env(safe-area-inset-top, 0px) + 56px)"
      : "68px";

  return (
    <AnimatePresence mode="wait">

      {/* ── IDLE: invite card ── */}
      {phase === "idle" && (
        <motion.div
          key="hb-idle"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="fixed z-[65] left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ bottom: PANEL_BOTTOM, maxWidth: 340, width: "88vw" }}
        >
          <div className="rounded-2xl px-5 py-4 flex flex-col gap-3"
            style={{
              background: "rgba(4,2,20,0.94)",
              border: "1px solid rgba(0,229,255,0.35)",
              boxShadow: "0 0 50px rgba(0,229,255,0.14)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 flex-shrink-0" style={{ color: "#00E5FF" }} />
              <div>
                <span className="font-black text-white text-sm tracking-wider">BEACH LAUNCH PAD</span>
                <div style={{ fontSize: "9px", color: "rgba(0,229,255,0.5)", marginTop: "1px" }}>Hoverboard route · Vibe Coin run</div>
              </div>
            </div>

            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              Ride the beach and collect <strong style={{ color: "#FFD700" }}>Vibe Coins</strong> along the way. Gold coins are worth +5!
            </p>

            {/* Best session */}
            {sessionBest > 0 && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(0,229,255,0.7)" }}>
                <Trophy className="w-3 h-3" />
                <span>Best ride: <strong>{sessionBest} Vibe Coins</strong></span>
              </div>
            )}

            <button
              onClick={startRide}
              className="w-full py-3 rounded-full font-black text-sm tracking-widest transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                color: "#000",
                boxShadow: "0 0 28px rgba(0,229,255,0.4)",
              }}
            >
              START HOVERBOARD RUN
            </button>

            <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.18)" }}>
              WASD / Arrow Keys &nbsp;·&nbsp; Mobile: Joystick
            </p>
          </div>
        </motion.div>
      )}

      {/* ── RIDING: compact top-right corner HUD ── */}
      {phase === "riding" && (
        <motion.div
          key="hb-riding"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[65] pointer-events-none"
          style={{ top: HUD_TOP, right: isMobile ? "8px" : "14px", width: isMobile ? "148px" : "164px" }}
        >
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(4,2,20,0.88)",
              border: "1px solid rgba(0,229,255,0.28)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 20px rgba(0,184,212,0.12)",
            }}
          >
            {/* Session coins */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span style={{ fontSize: "14px", lineHeight: 1 }}>✦</span>
              <div className="flex flex-col flex-1">
                <span className="font-black tracking-widest" style={{ fontSize: "7px", color: "rgba(255,215,0,0.55)" }}>VIBE COINS</span>
                <span className="font-black text-white leading-none" style={{ fontSize: "18px" }}>{sessionCoins}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-3 pb-1.5" style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
              <span>this ride</span>
            </div>

            {/* Exit button */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
              onClick={exitRide}
              className="w-full flex items-center justify-center gap-1.5 py-2 pointer-events-auto transition-all hover:bg-white/5 active:scale-[0.97]"
              style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em" }}
              >
              <X className="w-3 h-3" /> END RUN
              </button>
            </div>
          </div>

          {/* Coin collect flash popups */}
          <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
            <AnimatePresence>
              {collectFlashes.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -32, scale: 1.15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.3, ease: "easeOut" }}
                  style={{
                    fontWeight: 900,
                    fontSize: f.bonus ? "14px" : "12px",
                    color: f.bonus ? "#FFD700" : "#00E5FF",
                    textShadow: f.bonus ? "0 0 12px rgba(255,215,0,0.7)" : "0 0 10px rgba(0,229,255,0.6)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.label}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Boost flash */}
          <AnimatePresence>
            {boostFlash && (
              <motion.div key="boost" initial={{ opacity: 1, scale: 1, y: 0 }} animate={{ opacity: 0, scale: 1.4, y: -36 }} exit={{}} transition={{ duration: 0.9 }}
                className="absolute right-0 font-black pointer-events-none"
                style={{ top: -8, fontSize: "13px", color: "#00FF88", textShadow: "0 0 20px #00FF88", whiteSpace: "nowrap" }}
              >
                ⚡ SPEED!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Launch flash */}
          <AnimatePresence>
            {launchFlash && (
              <motion.div key="launch" initial={{ opacity: 1, scale: 1, y: 0 }} animate={{ opacity: 0, scale: 1.4, y: -40 }} exit={{}} transition={{ duration: 1.2 }}
                className="absolute right-0 font-black pointer-events-none"
                style={{ top: -8, fontSize: "13px", color: "#FF9900", textShadow: "0 0 20px #FF6600", whiteSpace: "nowrap" }}
              >
                🚀 LAUNCH!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

    </AnimatePresence>
  );
}