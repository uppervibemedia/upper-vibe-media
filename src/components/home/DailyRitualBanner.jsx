import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Flame, Sparkles, ChevronRight, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

const DISMISS_KEY = "uvm_ritual_dismissed_";
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function DailyRitualBanner({ user }) {
  const [visible, setVisible] = useState(false);
  const [streak, setStreak] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const p = radioTheme.vars["--rt-primary"];

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const dismissKey = DISMISS_KEY + todayStr();
    if (sessionStorage.getItem(dismissKey)) { setLoading(false); return; }

    const load = async () => {
      const all = await base44.entities.VibeCheckIn.filter({ user_id: user.id }, "-check_in_date", 30);
      const today = all.find((c) => c.check_in_date === todayStr());
      setCheckedIn(!!today);

      const dates = [...new Set(all.map((c) => c.check_in_date))].sort().reverse();
      let s = 0;
      let expected = today ? todayStr() : (() => { const y = new Date(); y.setDate(y.getDate() - 1); return y.toISOString().slice(0, 10); })();
      for (const d of dates) {
        if (d === expected) {
          s++;
          const prev = new Date(expected); prev.setDate(prev.getDate() - 1);
          expected = prev.toISOString().slice(0, 10);
        } else if (d < expected) break;
      }
      setStreak(Math.max(s, today ? 1 : 0));
      setVisible(true);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY + todayStr(), "1");
    setVisible(false);
  };

  if (loading || !user || !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          key="daily-ritual"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-7xl mx-auto px-4 sm:px-6 pb-4 pt-2"
        >
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: checkedIn
                ? `linear-gradient(135deg, rgba(74,222,128,0.07) 0%, rgba(${p},0.05) 100%)`
                : `linear-gradient(135deg, rgba(${p},0.1) 0%, rgba(155,126,255,0.08) 100%)`,
              border: checkedIn
                ? "1px solid rgba(74,222,128,0.22)"
                : `1px solid rgba(${p},0.28)`,
              boxShadow: checkedIn
                ? "0 0 40px rgba(74,222,128,0.06)"
                : `0 0 40px rgba(${p},0.09)`,
            }}
          >
            {/* Ambient glow + scan lines */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[60px]"
                style={{ background: checkedIn ? "rgba(74,222,128,0.12)" : `rgba(${p},0.14)` }} />
              <div className="absolute inset-0 opacity-[0.025]"
                style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 32px)" }} />
            </div>

            {/* Main row */}
            <Link to="/vibe-check" className="relative z-10 flex items-center gap-4 px-5 py-4 block group">
              {/* Icon */}
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: checkedIn ? "rgba(74,222,128,0.12)" : `rgba(${p},0.12)`,
                  border: checkedIn ? "1px solid rgba(74,222,128,0.3)" : `1px solid rgba(${p},0.3)`,
                  boxShadow: checkedIn ? "0 0 16px rgba(74,222,128,0.15)" : `0 0 16px rgba(${p},0.15)`,
                }}>
                {checkedIn ? <span className="text-lg">✅</span> : <Flame className="w-5 h-5" style={{ color: `rgb(${p})` }} />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-[9px] font-black tracking-[0.3em] uppercase"
                    style={{ color: checkedIn ? "rgba(74,222,128,0.8)" : `rgba(${p},0.8)` }}>
                    Daily Ritual
                  </p>
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(245,168,0,0.1)", border: "1px solid rgba(245,168,0,0.25)", color: "#F5A800" }}>
                      <Flame className="w-2.5 h-2.5" /> {streak} day streak
                    </span>
                  )}
                  {!checkedIn && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)", color: "#c4aaff" }}>
                      <Sparkles className="w-2.5 h-2.5" /> Not done yet
                    </span>
                  )}
                </div>
                <p className="font-heading font-black text-white text-sm sm:text-base leading-tight">
                  {checkedIn ? "Vibe Check complete — great work today 💎" : "Complete your Vibe Check — reveal your score for today"}
                </p>
                <p className="text-white/35 text-xs mt-0.5 leading-snug">
                  {checkedIn ? "Come back tomorrow to keep your streak going." : "8 questions · takes under 2 minutes · free feature"}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: checkedIn ? "rgb(74,222,128)" : `rgb(${p})` }} />
            </Link>

            {/* Bottom action row — only for not-checked-in state */}
            {!checkedIn && (
              <div className="relative z-10 flex items-center gap-3 px-5 pb-3 pt-0">
                <div className="h-px flex-1" style={{ background: `rgba(${p},0.1)` }} />
                <button
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Progress strip */}
            {!checkedIn && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, rgba(${p},0.5), rgba(155,126,255,0.4), transparent)` }} />
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}