import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, X, Gauge, Coins, Trophy, Flame } from "lucide-react";

export default function HoverboardMusicDashHUD({
  active,
  stats,
  results,
  onStart,
  onExit,
  onCloseResults,
  isMobile,
  worldMode,
  blocked,
  gameMode = "hoverboard",
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

  const isJetpack = gameMode === "jetpack";
  const buttonLabel = isJetpack ? "Sky Dash" : "Hover Dash";
  const activeTitle = isJetpack ? "Sky Ring Dash" : "Hoverboard Dash";
  const resultTitle = isJetpack ? "Jetpack Sky Dash" : "Hoverboard Dash";
  const Icon = isJetpack ? Flame : Rocket;

  const slotStyle = isMobile
    ? {
        position: "fixed",
        right: "calc(12px + env(safe-area-inset-right, 0px))",
        top: isLandscape ? "calc(106px + env(safe-area-inset-top, 0px))" : "calc(122px + env(safe-area-inset-top, 0px))",
        zIndex: 58,
        pointerEvents: "auto",
      }
    : {
        position: "fixed",
        right: "calc(22px + env(safe-area-inset-right, 0px))",
        top: "calc(132px + env(safe-area-inset-top, 0px))",
        zIndex: 58,
        pointerEvents: "auto",
      };

  const panelStyle = {
    ...slotStyle,
    width: isMobile ? (isLandscape ? 210 : 188) : 250,
  };

  return (
    <>
      <AnimatePresence>
        {!active && !blocked && gameMode && (
          <motion.div key="gear-game-start" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} style={slotStyle}>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onStart}
              className="flex items-center justify-center gap-1.5 rounded-full font-black tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                width: isMobile ? 112 : 128,
                height: isMobile ? 38 : 42,
                background: isJetpack ? "linear-gradient(135deg,#FFD36E,#FF4FC3,#7C3AED)" : "linear-gradient(135deg,#00E5FF,#7C3AED)",
                border: "1px solid rgba(255,255,255,0.24)",
                color: "#fff",
                boxShadow: isJetpack ? "0 0 18px rgba(255,79,195,0.25)" : "0 0 18px rgba(0,229,255,0.25)",
                touchAction: "manipulation",
                cursor: "pointer",
              }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] leading-tight">{buttonLabel}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && (
          <motion.div key="gear-game-active" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={panelStyle}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(4,6,18,0.84)", border: "1px solid rgba(0,229,255,0.24)", backdropFilter: "blur(18px)", boxShadow: "0 0 22px rgba(0,229,255,0.14)" }}>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[0.18em] uppercase truncate" style={{ color: "#00E5FF" }}>{activeTitle}</p>
                  <p className="text-[9px] text-white/42 truncate">Music stays on.</p>
                </div>
                <button onTouchStart={(e) => e.stopPropagation()} onClick={onExit} className="rounded-full flex items-center gap-1 px-2 py-1.5 text-[8px] font-black uppercase active:scale-95" style={{ background: "rgba(255,80,80,0.14)", border: "1px solid rgba(255,80,80,0.32)", color: "#FF9A9A", touchAction: "manipulation" }}>
                  <X className="w-3 h-3" /> {isJetpack ? "Exit Sky" : "Exit"}
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
          <motion.div key="gear-game-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[86] flex items-center justify-center px-4 pointer-events-auto" style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)" }} onClick={onCloseResults}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }} className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "rgba(5,6,18,0.96)", border: "1px solid rgba(0,229,255,0.25)", boxShadow: "0 0 50px rgba(0,229,255,0.18)" }} onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 text-center" style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.14),rgba(196,59,255,0.10))", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Trophy className="w-7 h-7 mx-auto mb-2" style={{ color: "#FFD36E" }} />
                <h3 className="font-heading font-black text-white text-lg">{resultTitle}</h3>
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
    <div className="rounded-xl px-1 py-1.5 text-center" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-heading font-black text-[11px] text-white leading-none">{value}</p>
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