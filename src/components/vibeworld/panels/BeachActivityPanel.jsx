import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Waves, Timer, Gem, Sparkles, Flame, Music4, Wind } from "lucide-react";

const CONFIG = {
  surf: { title: "Surf Zone", start: "Start Surf Challenge", active: "Surf Challenge", icon: Waves, color: "#68D7E8", steps: 5, task: "Ride through surf checkpoints" },
  dive: { title: "Dive Zone", start: "Start Dive Adventure", active: "Dive Adventure", icon: Gem, color: "#42DDF2", steps: 6, task: "Collect pearls, shells, crystals, and open the chest" },
  coaster: { title: "Vibe Coaster", start: "Ride Vibe Coaster", active: "Private Coaster Ride", icon: Wind, color: "#7DEBFF", steps: 35, task: "Enjoy a smooth private coaster loop" },
  zen: { title: "Zen Beach", start: "Start Zen Reset", active: "Zen Reset", icon: Sparkles, color: "#B58CFF", steps: 4, task: "Breathe, reset, and return calm" },
  frequency: { title: "Frequency Cove", start: "Enter Frequency Cove", active: "Frequency Cove", icon: Music4, color: "#B58CFF", steps: 3, task: "Choose affirmation, manifestation, or visualizer mode" },
  bonfire: { title: "Bonfire Beach", start: "Relax by Bonfire", active: "Bonfire Relax", icon: Flame, color: "#FFB347", steps: 3, task: "Chill by the fire with your music still playing" },
};

export default function BeachActivityPanel({ type, open, onClose, isMobile, mobileLayout }) {
  const config = CONFIG[type] || CONFIG.zen;
  const Icon = config.icon;
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState("affirmation");
  const awardedRef = useRef(false);
  const complete = progress >= config.steps;

  useEffect(() => {
    if (!open) { setStarted(false); setProgress(0); setMode("affirmation"); awardedRef.current = false; }
  }, [open, type]);

  useEffect(() => {
    if (!open || !started || type !== "coaster" || complete) return;
    const id = setInterval(() => setProgress((p) => Math.min(config.steps, p + 1)), 1000);
    return () => clearInterval(id);
  }, [open, started, type, complete, config.steps]);

  const statusText = useMemo(() => {
    if (!started) return config.task;
    if (complete) return "Complete — reward added.";
    if (type === "coaster") return `${Math.max(0, config.steps - progress)}s remaining`;
    if (type === "surf") return `${progress}/${config.steps} checkpoints`;
    if (type === "dive") return `${progress}/${config.steps} discoveries`;
    if (type === "frequency") return `${progress}/${config.steps} frequency steps`;
    return `${progress}/${config.steps} calm steps`;
  }, [config, complete, progress, started, type]);

  const completeActivity = () => {
    setProgress(config.steps);
    if (awardedRef.current) return;
    awardedRef.current = true;
    window.dispatchEvent(new CustomEvent("beachActivityCompleted", { detail: { type } }));
  };

  useEffect(() => {
    if (open && started && complete) completeActivity();
  }, [open, started, complete]);

  const nextProgress = () => {
    setProgress((p) => {
      const next = Math.min(config.steps, p + 1);
      if (next >= config.steps) setTimeout(completeActivity, 0);
      return next;
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-[75] rounded-t-3xl overflow-hidden pointer-events-auto"
        style={{
          height: isMobile ? "min(78dvh, 560px)" : "min(62vh, 520px)",
          maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 8px)",
          background: "linear-gradient(180deg, rgba(8,18,28,0.98), rgba(5,8,18,0.98))",
          border: `1px solid ${config.color}33`,
          borderBottom: "none",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${config.color}18`, border: `1px solid ${config.color}33` }}>
              <Icon className="w-4 h-4" style={{ color: config.color }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-white text-base leading-tight">{started ? config.active : config.title}</h3>
              <p className="text-[10px] text-white/40 truncate">{statusText}</p>
            </div>
          </div>
          <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ color: "rgba(255,255,255,0.62)", touchAction: "manipulation" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-76px)]">
          <div className="rounded-2xl p-4" style={{ background: `${config.color}0f`, border: `1px solid ${config.color}24` }}>
            {type === "frequency" && started ? (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {["affirmation", "manifest", "visualizer"].map((item) => (
                  <button key={item} onClick={() => setMode(item)} className="rounded-xl py-2 text-[10px] font-black capitalize" style={{ background: mode === item ? `${config.color}2a` : "rgba(255,255,255,0.05)", color: mode === item ? config.color : "rgba(255,255,255,0.5)", touchAction: "manipulation" }}>{item}</button>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-white/68 leading-relaxed">
              {type === "surf" && "Ride a real surfboard path through the shoreline checkpoint flow. Use normal movement while the challenge HUD tracks your progress."}
              {type === "dive" && "Enter a lightweight underwater discovery mode: collect pearls, shells, glowing crystals, coral finds, and the treasure chest reward."}
              {type === "coaster" && "Start a private coaster session. Your avatar stays safe while the ride timer runs and you can exit at any time."}
              {type === "zen" && "Begin a calm reset with soft breathing steps. Leave whenever you want — no camera lock."}
              {type === "frequency" && `Frequency Cove ${mode} mode is active with beach sanctuary visuals and music-friendly pacing.`}
              {type === "bonfire" && "Relax in the social fire circle. You can still move away normally after closing."}
            </p>
          </div>

          {started && (
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (progress / config.steps) * 100)}%`, background: `linear-gradient(90deg, ${config.color}, #FFD36E)` }} />
            </div>
          )}

          {!started ? (
            <button onTouchStart={(e) => e.stopPropagation()} onClick={() => setStarted(true)} className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider active:scale-[0.98]" style={{ background: `linear-gradient(135deg, ${config.color}, #FFD36E)`, color: "#071018", minHeight: 52, touchAction: "manipulation" }}>
              {config.start}
            </button>
          ) : complete ? (
            <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", minHeight: 52, touchAction: "manipulation" }}>
              Exit {config.title}
            </button>
          ) : type === "coaster" ? (
            <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", minHeight: 52, touchAction: "manipulation" }}>
              Exit Ride
            </button>
          ) : (
            <button onTouchStart={(e) => e.stopPropagation()} onClick={nextProgress} className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider active:scale-[0.98]" style={{ background: `linear-gradient(135deg, ${config.color}, #00E5FF)`, color: "#061018", minHeight: 52, touchAction: "manipulation" }}>
              {type === "surf" ? "Ride Next Checkpoint" : type === "dive" ? "Collect Discovery" : type === "frequency" ? "Continue Cove Session" : type === "bonfire" ? "Keep Relaxing" : "Next Breath"}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}