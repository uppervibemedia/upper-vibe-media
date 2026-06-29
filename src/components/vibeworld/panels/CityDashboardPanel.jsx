import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, UserCircle, ShoppingBag, MessageCircle, Users, Tv2, Settings, LogOut } from "lucide-react";

const items = [
  ["avatar", UserCircle, "Edit Avatar", "Pick style and colors"],
  ["inventory", ShoppingBag, "Inventory", "Wear and equip items"],
  ["chat", MessageCircle, "Chat", "Messages and requests"],
  ["users", Users, "Online Users", "See who is here"],
  ["tv", Tv2, "TV / Media", "Screen viewing mode"],
  ["settings", Settings, "Settings", "Account settings"],
  ["exit", LogOut, "Exit City", "Return to app"],
];

export default function CityDashboardPanel({ open, onClose, onAction, isMobile }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-end p-3 pt-safe" style={{ pointerEvents: "auto" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose} aria-label="Close dashboard" />
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.96 }} className="relative rounded-3xl overflow-hidden" style={{ width: isMobile ? "min(92vw, 340px)" : 360, background: "rgba(6,6,18,0.94)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(22px)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="font-heading font-black text-white text-sm">City Dashboard</p>
                <p className="text-[10px] text-white/35">Quick access anywhere</p>
              </div>
              <button onClick={onClose} className="rounded-full flex items-center justify-center" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", touchAction: "manipulation" }}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {items.map(([id, Icon, label, sub]) => (
                <button key={id} onClick={() => onAction?.(id)} className="text-left rounded-2xl p-3 transition-all active:scale-[0.98]" style={{ minHeight: 74, background: id === "avatar" ? "rgba(155,126,255,0.14)" : "rgba(255,255,255,0.055)", border: id === "avatar" ? "1px solid rgba(155,126,255,0.32)" : "1px solid rgba(255,255,255,0.08)", touchAction: "manipulation" }}>
                  <Icon className="w-4 h-4 mb-2" style={{ color: id === "avatar" ? "#c4aaff" : "rgba(255,255,255,0.55)" }} />
                  <p className="text-[11px] font-black text-white leading-tight">{label}</p>
                  <p className="text-[9px] text-white/35 mt-0.5 leading-tight">{sub}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}