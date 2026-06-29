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
    ? { right: "max(14px, env(safe-area-inset-right, 0px))", top: "50%", transform: "translateY(-50%)", width: 188 }
    : { left: "50%", bottom: "calc(92px + env(safe-area-inset-bottom, 0px))", transform: "translateX(-50%)", width: "min(260px, calc(100vw - 44px))" };

  return (
    <div className="absolute z-30 pointer-events-auto" style={wrapperStyle}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((value) => !value); }}
        onTouchStart={(e) => e.stopPropagation()}
        className="w-full rounded-full px-3 py-2 flex items-center justify-between gap-2 active:scale-95 transition-all"
        style={{ background: "rgba(10,8,24,0.82)", border: `1px solid ${active ? active.color + "88" : "rgba(255,255,255,0.16)"}`, color: active?.color || "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", boxShadow: `0 10px 30px rgba(0,0,0,0.28), 0 0 18px ${active?.glow || "rgba(160,120,255,0.18)"}` }}
      >
        <span className="min-w-0 text-left">
          <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-white/42">Manifestation Focus</span>
          <span className="block text-[11px] font-black truncate">Focus: {active?.label || "Choose"}</span>
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: landscape ? 0 : 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: landscape ? 0 : 8, scale: 0.97 }} transition={{ duration: 0.16 }} className="mt-2 rounded-2xl p-2" style={{ maxHeight: landscape ? "calc(100dvh - 96px)" : "min(230px, 30dvh)", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "rgba(8,7,22,0.9)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(18px)", boxShadow: "0 16px 34px rgba(0,0,0,0.36)" }}>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: landscape ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
              {themes.map((theme) => (
                <button key={theme.id} onClick={(e) => { e.stopPropagation(); onSelect(theme.id); setOpen(false); }} onTouchStart={(e) => e.stopPropagation()} className="rounded-xl px-2 py-1.5 text-[10px] font-black transition-all active:scale-95" style={{ minHeight: 32, background: activeId === theme.id ? `${theme.color}30` : "rgba(255,255,255,0.06)", border: `1px solid ${activeId === theme.id ? theme.color + "99" : "rgba(255,255,255,0.09)"}`, color: activeId === theme.id ? theme.color : "rgba(255,255,255,0.72)" }}>
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