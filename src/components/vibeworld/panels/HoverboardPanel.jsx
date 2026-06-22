/**
 * HoverboardPanel — Neon Surf Beach zone HUD.
 * - Session Orbs: collected this ride
 * - Total Orb Bank: shared lifetime currency (written via orbBank.js)
 * - Zone best: beach personal record
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, Wind, Star, Coins } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getOrbBank, addToOrbBank, updateZoneBest, getZoneBests, syncBankToAccount } from "@/lib/orbBank";

export default function HoverboardPanel({ visible, isMobile, user, onStartRide, onEndRide }) {
  const [phase, setPhase] = useState("idle");
  const [sessionOrbs, setSessionOrbs] = useState(0);
  const [orbBank, setOrbBank] = useState(() => getOrbBank());
  const [zoneBest, setZoneBest] = useState(() => getZoneBests().beach ?? 0);
  const [boostFlash, setBoostFlash] = useState(false);
  const [launchFlash, setLaunchFlash] = useState(false);
  const [trailUnlocked, setTrailUnlocked] = useState(false);

  const phaseRef = useRef("idle");
  const sessionRef = useRef(0);
  const onEndRideRef = useRef(onEndRide);
  const onStartRideRef = useRef(onStartRide);
  useEffect(() => { onEndRideRef.current = onEndRide; }, [onEndRide]);
  useEffect(() => { onStartRideRef.current = onStartRide; }, [onStartRide]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Sync bank total from user account on mount
  useEffect(() => {
    if (user?.hb_total_orbs) {
      const stored = getOrbBank();
      if (user.hb_total_orbs > stored) {
        try { localStorage.setItem("uvc_orb_bank_total", String(user.hb_total_orbs)); } catch {}
        setOrbBank(user.hb_total_orbs);
      }
    }
  }, [user?.hb_total_orbs]);

  const startRide = useCallback(() => {
    sessionRef.current = 0;
    setSessionOrbs(0);
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
      const newBank = addToOrbBank(earned);
      setOrbBank(newBank);
      const best = updateZoneBest("beach", earned);
      setZoneBest(best);

      const didUnlock = newBank >= 5 || earned >= 5;
      syncBankToAccount(base44, didUnlock ? { trail_boost_unlocked: true } : {});
      if (didUnlock) setTrailUnlocked(true);
    }
  }, []);

  useEffect(() => {
    window.__hbCollectOrb = (orbId) => {
      if (phaseRef.current !== "riding") return;
      sessionRef.current += 1;
      setSessionOrbs(c => c + 1);
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

  const PANEL_BOTTOM = isMobile
    ? "calc(140px + env(safe-area-inset-bottom, 0px))"
    : "80px";
  const HUD_TOP = isMobile
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
              <span className="font-black text-white text-sm tracking-wider">NEON SURF BEACH</span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#FFD700" }}>
                <Coins className="w-3 h-3" />
                <span>Bank: <strong>{orbBank}</strong></span>
              </div>
              {zoneBest > 0 && (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(0,229,255,0.7)" }}>
                  <Trophy className="w-3 h-3" />
                  <span>Best: <strong>{zoneBest}</strong></span>
                </div>
              )}
            </div>

            {trailUnlocked && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black"
                style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700" }}
              >
                <Wind className="w-3 h-3" /> Trail Boost active!
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
              ⚡ START RIDE
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
          style={{ top: HUD_TOP, right: isMobile ? "8px" : "14px", width: isMobile ? "136px" : "152px" }}
        >
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(4,2,20,0.88)",
              border: "1px solid rgba(0,229,255,0.28)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 20px rgba(0,184,212,0.12)",
            }}
          >
            {/* Session orbs */}
            <div className="flex items-center gap-2 px-3 py-2">
              <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00E5FF" }} />
              <div className="flex flex-col flex-1">
                <span className="font-black tracking-widest" style={{ fontSize: "7px", color: "rgba(0,229,255,0.55)" }}>SESSION</span>
                <span className="font-black text-white leading-none" style={{ fontSize: "18px" }}>{sessionOrbs}</span>
              </div>
              {trailUnlocked && <Wind className="w-3 h-3 flex-shrink-0" style={{ color: "#FFD700" }} />}
            </div>

            {/* Bank row */}
            <div className="flex items-center gap-1.5 px-3 pb-1.5">
              <Coins className="w-3 h-3 flex-shrink-0" style={{ color: "#FFD700" }} />
              <div className="flex flex-col flex-1">
                <span className="font-black tracking-widest" style={{ fontSize: "6px", color: "rgba(255,215,0,0.5)" }}>BANK</span>
                <span className="font-black" style={{ fontSize: "12px", color: "#FFD700" }}>{orbBank + sessionOrbs}</span>
              </div>
            </div>

            {/* Trail Boost badge */}
            {sessionOrbs >= 5 && (
              <div
                className="mx-2 mb-1.5 flex items-center justify-center gap-1 rounded-lg py-0.5"
                style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)" }}
              >
                <span className="font-black" style={{ fontSize: "8px", color: "#FFD700" }}>TRAIL BOOST!</span>
              </div>
            )}

            {/* Exit button */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={exitRide}
                className="w-full flex items-center justify-center gap-1.5 py-2 pointer-events-auto transition-all hover:bg-white/5 active:scale-[0.97]"
                style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em" }}
              >
                <X className="w-3 h-3" /> EXIT RIDE
              </button>
            </div>
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