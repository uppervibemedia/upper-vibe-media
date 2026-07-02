import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, X, Gauge, Coins, Trophy } from "lucide-react";

export default function HoverboardMusicDashHUD({
  active,
  stats,
  results,
  onStart,
  onExit,
  onCloseResults,
  isMobile,
  mobileLayout,
  worldMode,
  blocked,
}) {
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);

  useEffect(() => {
    const onResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  if (worldMode !== "city") return null;

  const startStyle = isMobile
    ? {
        position: "fixed",
        right: "calc(10px + env(safe-area-inset-right, 0px))",
        top: isLandscape ? "calc(58px + env(safe-area-inset-top, 0px))" : "calc(150px + env(safe-area-inset-top, 0px))",
        zIndex: 58,
        pointerEvents: "auto",
      }
    : {
        position: "fixed",
        right: "calc(20px + env(safe-area-inset-right, 0px))",
        top: "calc(170px + env(safe-area-inset-top, 0px))",
        zIndex: 58,
        pointerEvents: "auto",
      };

  const activeStyle = isMobile
    ? {
        position: "fixed",
        left: isLandscape ? "calc(112px + env(safe-area-inset-left, 0px))" : "calc(10px + env(safe-area-inset-left, 0px))",
        right: isLandscape ? "auto" : "calc(10px + env(safe-area-inset-right, 0px))",
        top: "calc(56px + env(safe-area-inset-top, 0px))",
        width: isLandscape ? 260 : "auto",
        zIndex: 58,
        pointerEvents: "auto",
      }
    : {
        position: "fixed",
        right: "calc(20px + env(safe-area-inset-right, 0px))",
        top: "calc(170px + env(safe-area-inset-top, 0px))",
        width: 300,
        zIndex: 58,
        pointerEvents: "auto",
      };

  return (
    <>
      <AnimatePresence>
        {!active && !blocked && (
          <motion.div key="dash-start" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} style={startStyle}>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onStart}
              className="flex items-center gap-2 rounded-full font-black tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                minHeight: isMobile ? 40 : 46,
                padding: isMobile ? "8px 12px" : "10px 16px",
                maxWidth: isMobile && !isLandscape ? 150 : 220,
                background: "linear-gradient(135deg,#00E5FF,#7C3AED,#FF4FC3)",
                border: "1px solid rgba(255,255,255,0.24)",
                color: "#fff",
                boxShadow: "0 0 24px rgba(0,229,255,0.28), 0 0 34px rgba(196,59,255,0.18)",
                touchAction: "manipulation",
              }}
            >
              <Rocket className="w-4 h-4 flex-shrink-0" />
              <span className="text-[10px] leading-tight">Hoverboard Music Dash</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && (
          <motion.div key="dash-active" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={activeStyle}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(4,6,18,0.84)", border: "1px solid rgba(0,229,255,0.24)", backdropFilter: "blur(18px)", boxShadow: "0 0 24px rgba(0,229,255,0.14)" }}>
              <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color: "#00E5FF" }}>Music Dash</p>
                  <p className="text-[10px] text-white/45 truncate">Ride freely. Music stays on.</p>
                </div>
                <button onTouchStart={(e) => e.stopPropagation()} onClick={onExit} className="rounded-full flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase active:scale-95" style={{ background: "rgba(255,80,80,0.14)", border: "1px solid rgba(255,80,80,0.32)", color: "#FF9A9A", touchAction: "manipulation" }}>
                  <X className="w-3 h-3" /> Exit Dash
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1 px-2 py-2">
                <Stat label="Rings" value={`${stats?.ringsCollected || 0}/${stats?.totalRings || 0}`} />
                <Stat label="Combo" value={stats?.combo || 0} />
                <Stat label="Coins" value={stats?.coinsEarned || 0} />
                <Stat label="Time" value={`${stats?.remaining ?? 75}s`} />
              </div>
              <div className="h-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, ((stats?.remaining ?? 75) / 75) * 100))}%`, background: stats?.boostActive ? "linear-gradient(90deg,#FFD36E,#FF4FC3)" : "linear-gradient(90deg,#00E5FF,#7C3AED)" }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {results && (
          <motion.div key="dash-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[86] flex items-center justify-center px-4 pointer-events-auto" style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)" }} onClick={onCloseResults}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }} className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "rgba(5,6,18,0.96)", border: "1px solid rgba(0,229,255,0.25)", boxShadow: "0 0 50px rgba(0,229,255,0.18)" }} onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 text-center" style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.14),rgba(196,59,255,0.10))", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Trophy className="w-7 h-7 mx-auto mb-2" style={{ color: "#FFD36E" }} />
                <h3 className="font-heading font-black text-white text-lg">Hoverboard Music Dash</h3>
                <p className="text-[10px] text-white/35 mt-1">Vibe Coins are in-app reward points only and have no real-world cash value.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4">
                <Result label="Rings Collected" value={`${results.ringsCollected}/${results.totalRings}`} />
                <Result label="Longest Combo" value={results.longestCombo} />
                <Result label="Distance" value={`${results.distance}m`} icon={Gauge} />
                <Result label="Coins Earned" value={results.coinsEarned} icon={Coins} />
                <Result label="Score" value={results.score} />
                <Result label="Best Score" value={results.bestScore} />
              </div>
              <div className="px-4 pb-4">
                <button onClick={onCloseResults} className="w-full rounded-full py-3 text-xs font-black tracking-wider active:scale-95" style={{ background: "linear-gradient(135deg,#00E5FF,#7C3AED)", color: "#fff", touchAction: "manipulation" }}>Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl px-1.5 py-1.5 text-center" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-heading font-black text-xs text-white leading-none">{value}</p>
      <p className="text-[7px] text-white/30 font-black uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function Result({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-1.5 text-[9px] text-white/35 uppercase font-black tracking-wider mb-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <p className="font-heading font-black text-xl text-white leading-none">{value}</p>
    </div>
  );
}