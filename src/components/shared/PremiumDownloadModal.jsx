import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Waves, Download, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BENEFITS = [
  "Download every song",
  "Stream all songs free",
  "Save 432 Hz music offline",
  "Access new downloadable releases",
  "Support Upper Vibe Media",
];

export default function PremiumDownloadModal({ open, onClose }) {
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(145deg,#0a0a1e,#0d0d1f)", border: "1px solid rgba(212,168,67,0.25)" }}
          >
            {/* Close */}
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white/70 transition-colors z-10">
              <X className="w-4 h-4" />
            </button>

            {/* Header glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-[60px] opacity-30 pointer-events-none"
              style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />

            <div className="relative p-8">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.3)" }}>
                <Crown className="w-7 h-7 text-yellow-400" />
              </div>

              {/* Title & description */}
              <h2 className="font-heading font-black text-2xl text-white text-center mb-3">
                Unlock Premium Downloads
              </h2>
              <p className="text-white/45 text-sm text-center leading-relaxed mb-6">
                You can stream every 432 Hz song for free. Premium members can download Upper Vibe Media tracks and save them offline.
              </p>

              {/* Plan card */}
              <div className="p-4 rounded-2xl mb-6"
                style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.2)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-heading font-black text-white text-base">Premium Downloads</p>
                    <p className="text-xs text-white/40">Monthly membership</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-black text-yellow-400 text-xl">$4.99</p>
                    <p className="text-[10px] text-white/30">/month</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-white/60">
                      <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { onClose(); navigate("/upgrade"); }}
                  className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
                  Upgrade To Premium
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-white/40 hover:text-white/70 transition-colors">
                  Keep Listening Free
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}