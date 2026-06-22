/**
 * HoverboardPanel — Free-ride Hoverboard Beach Zone HUD.
 * Simple: Start Ride / Exit Ride, orb counter, boost flash, high score.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, Wind, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function HoverboardPanel({ visible, isMobile, user, onStartRide, onEndRide }) {
  const [phase, setPhase] = useState("idle"); // idle | riding
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [totalOrbs, setTotalOrbs] = useState(() => {
    try { return parseInt(localStorage.getItem("hb_total_orbs") || "0", 10); } catch { return 0; }
  });
  const [boostFlash, setBoostFlash] = useState(false);
  const [trailUnlocked, setTrailUnlocked] = useState(false);

  const phaseRef = useRef("idle");
  const orbsRef = useRef(0);
  const onEndRideRef = useRef(onEndRide);
  const onStartRideRef = useRef(onStartRide);
  useEffect(() => { onEndRideRef.current = onEndRide; }, [onEndRide]);
  useEffect(() => { onStartRideRef.current = onStartRide; }, [onStartRide]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Load saved total from user account
  useEffect(() => {
    if (user?.hb_total_orbs) setTotalOrbs(user.hb_total_orbs);
  }, [user?.hb_total_orbs]);

  const startRide = useCallback(() => {
    orbsRef.current = 0;
    setOrbsCollected(0);
    setBoostFlash(false);
    phaseRef.current = "riding";
    setPhase("riding");
    window.__hbResetRings = true; // triggers resetOrbs in CityCanvas
    onStartRideRef.current?.();
  }, []);

  const exitRide = useCallback(() => {
    phaseRef.current = "idle";
    setPhase("idle");
    onEndRideRef.current?.();

    // Save orbs
    const newTotal = totalOrbs + orbsRef.current;
    setTotalOrbs(newTotal);
    try { localStorage.setItem("hb_total_orbs", String(newTotal)); } catch {}

    // Unlock trail boost at 5 orbs collected in one ride
    const didUnlock = orbsRef.current >= 5;
    if (didUnlock) {
      setTrailUnlocked(true);
      try { base44.auth.updateMe({ trail_boost_unlocked: true, hb_total_orbs: newTotal }); } catch {}
    } else {
      try { base44.auth.updateMe({ hb_total_orbs: newTotal }); } catch {}
    }
  }, [totalOrbs]);

  // Register orb collector once — reads phaseRef so no stale closure
  useEffect(() => {
    window.__hbCollectOrb = (orbId) => {
      if (phaseRef.current !== "riding") return;
      orbsRef.current += 1;
      setOrbsCollected(c => c + 1);
    };
    window.__hbBoostTriggered = () => {
      if (phaseRef.current !== "riding") return;
      setBoostFlash(true);
      setTimeout(() => setBoostFlash(false), 800);
    };
    return () => { window.__hbCollectOrb = null; window.__hbBoostTriggered = null; };
  }, []);

  if (!visible) return null;

  const PANEL_BOTTOM = isMobile
    ? "calc(140px + env(safe-area-inset-bottom, 0px))"
    : "80px";

  return (
    <AnimatePresence mode="wait">

      {/* ── IDLE: Beach zone invitation panel ── */}
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
          <div className="rounded-2xl px-5 py-5 flex flex-col gap-3"
            style={{
              background: "rgba(4,2,20,0.94)",
              border: "1px solid rgba(0,229,255,0.35)",
              boxShadow: "0 0 50px rgba(0,229,255,0.14)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 flex-shrink-0" style={{ color: "#00E5FF" }} />
              <span className="font-black text-white text-sm tracking-wider">HOVERBOARD BEACH ZONE</span>
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Cruise the beach freely on your hoverboard.
              Collect <span style={{ color: "#00E5FF", fontWeight: 700 }}>energy orbs</span> and
              hit <span style={{ color: "#FFD700", fontWeight: 700 }}>boost pads</span> for extra thrills!
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Style", value: "Free Ride", color: "#00E5FF" },
                { label: "Orbs", value: "12 spots", color: "#C43BFF" },
                { label: "Trail Boost", value: "5+ orbs", color: "#FFD700" },
              ].map(s => (
                <div key={s.label}
                  className="flex flex-col items-center py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
                  <span className="font-black text-[11px] mt-0.5" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {totalOrbs > 0 && (
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#FFD700" }}>
                <Trophy className="w-3 h-3" />
                <span>Total orbs collected: <strong>{totalOrbs}</strong></span>
              </div>
            )}

            {trailUnlocked && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black"
                style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700" }}
              >
                <Wind className="w-3 h-3" /> Trail Boost active!
              </div>
            )}

            <button
              onClick={startRide}
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

      {/* ── RIDING: minimal HUD with orb counter and exit button ── */}
      {phase === "riding" && (
        <motion.div
          key="hb-riding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-[65] pointer-events-none"
          style={{
            top: isMobile ? "calc(56px + env(safe-area-inset-top,0px) + 8px)" : 68,
            left: "50%",
            transform: "translateX(-50%)",
            width: isMobile ? "96vw" : 420,
          }}
        >
          {/* Exit button */}
          <div className="flex justify-end mb-1.5 pointer-events-auto">
            <button
              onClick={exitRide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all hover:bg-white/10 active:scale-[0.97]"
              style={{
                background: "rgba(4,2,20,0.82)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(10px)",
              }}
            >
              <X className="w-3 h-3" /> EXIT RIDE
            </button>
          </div>

          {/* HUD bar */}
          <div
            className="flex items-center justify-center gap-4 px-5 py-2.5 rounded-2xl"
            style={{
              background: "rgba(4,2,20,0.88)",
              border: "1px solid rgba(0,229,255,0.28)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" style={{ color: "#00E5FF" }} />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold tracking-widest" style={{ color: "rgba(0,229,255,0.55)" }}>ORBS</span>
                <span className="font-black text-white text-lg leading-none">{orbsCollected}</span>
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.09)" }} />

            <div className="text-center">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                🏄 Free Riding the Beach
              </span>
            </div>

            {orbsCollected >= 5 && (
              <>
                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.09)" }} />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)" }}
                >
                  <Wind className="w-3 h-3" style={{ color: "#FFD700" }} />
                  <span className="text-[9px] font-black" style={{ color: "#FFD700" }}>TRAIL BOOST!</span>
                </div>
              </>
            )}
          </div>

          {/* Boost flash */}
          <AnimatePresence>
            {boostFlash && (
              <motion.div
                key="boost"
                initial={{ opacity: 1, scale: 1, y: 0 }}
                animate={{ opacity: 0, scale: 1.5, y: -40 }}
                exit={{}}
                transition={{ duration: 0.8 }}
                className="absolute left-1/2 font-black text-xl pointer-events-none"
                style={{
                  top: 70,
                  transform: "translateX(-50%)",
                  color: "#FFD700",
                  textShadow: "0 0 24px #FFD700",
                  whiteSpace: "nowrap",
                }}
              >
                ⚡ BOOST!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

    </AnimatePresence>
  );
}