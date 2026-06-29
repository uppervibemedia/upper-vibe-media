import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function ManifestationFocusSelector({ themes, activeId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const active = themes.find((theme) => theme.id === activeId);

  useEffect(() => {
    const update = () => setLandscape(window.innerWidth > window.innerHeight && window.innerHeight < 560);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const wrapperStyle = landscape
    ? { right: "max(14px, env(safe-area-inset-right, 0px))", top: "calc(18px + env(safe-area-inset-top, 0px))", width: 210 }
    : { left: "50%", top: "calc(136px + env(safe-area-inset-top, 0px))", transform: "translateX(-50%)", width: "min(280px, calc(100vw - 44px))" };

  return (
    <div className="absolute z-30 pointer-events-auto" style={wrapperStyle}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((value) => !value); }}
        onTouchStart={(e) => e.stopPropagation()}
        className="w-full rounded-full px-3 py-2 flex items-center justify-between gap-2 active:scale-95 transition-all"
        style={{ background: active ? `linear-gradient(135deg, ${active.color}40, rgba(160,120,255,0.32), rgba(0,229,255,0.18))` : "linear-gradient(135deg, rgba(160,120,255,0.32), rgba(0,229,255,0.18))", border: `1px solid ${active ? active.color + "cc" : "rgba(255,255,255,0.22)"}`, color: "#fff", backdropFilter: "blur(18px)", boxShadow: `0 10px 30px rgba(0,0,0,0.28), 0 0 24px ${active?.glow || "rgba(160,120,255,0.28)"}` }}
      >
        <span className="min-w-0 text-left">
          <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-white/70">Manifestation Focus</span>
          <span className="block text-[11px] font-black truncate">Focus: {active?.label || "Choose"}</span>
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.16 }} className="mt-2 rounded-2xl p-2" style={{ maxHeight: landscape ? "calc(100dvh - 88px)" : "min(230px, 34dvh)", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "linear-gradient(160deg, rgba(12,9,32,0.94), rgba(34,14,58,0.9), rgba(0,80,110,0.76))", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(18px)", boxShadow: "0 16px 34px rgba(0,0,0,0.36), 0 0 24px rgba(0,229,255,0.14)" }}>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: landscape ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
              {themes.map((theme) => (
                <button key={theme.id} onClick={(e) => { e.stopPropagation(); onSelect(theme.id); setOpen(false); }} onTouchStart={(e) => e.stopPropagation()} className="rounded-xl px-2 py-1.5 text-[10px] font-black transition-all active:scale-95" style={{ minHeight: 32, background: activeId === theme.id ? `linear-gradient(135deg, ${theme.color}66, ${theme.color}22)` : `linear-gradient(135deg, ${theme.color}2f, rgba(255,255,255,0.055))`, border: `1px solid ${activeId === theme.id ? theme.color + "dd" : theme.color + "55"}`, color: activeId === theme.id ? "#fff" : "rgba(255,255,255,0.82)", boxShadow: activeId === theme.id ? `0 0 14px ${theme.glow}` : "none" }}>
                  {theme.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}