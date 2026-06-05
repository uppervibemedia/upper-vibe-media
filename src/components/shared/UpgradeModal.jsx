import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Crown, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const TIER_INFO = {
  supporter: {
    icon: Sparkles,
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    label: "Supporter",
    price: "$4.99/mo",
    perks: ["Full 432 Hz catalog", "Exclusive playlists", "Early previews", "Members-only updates"],
  },
  premium: {
    icon: Crown,
    color: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/10",
    label: "Plus",
    price: "$4.99/mo",
    perks: ["Download tracks & listen offline", "Build your My Vibe Library", "Full Academy access", "Plus Chat in the Vibe Room"],
  },
};

export default function UpgradeModal({ isOpen, onClose, requiredTier = "supporter", trackTitle }) {
  const info = TIER_INFO[requiredTier] || TIER_INFO.supporter;
  const Icon = info.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className={`pointer-events-auto relative w-full max-w-md rounded-2xl bg-card border ${info.border} p-8 shadow-2xl`}>
              <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className={`w-14 h-14 rounded-2xl ${info.bg} flex items-center justify-center mb-5 mx-auto`}>
                <Lock className={`w-6 h-6 ${info.color}`} />
              </div>

              <div className="text-center mb-6">
                <p className={`text-xs font-bold tracking-widest uppercase ${info.color} mb-2`}>
                  {info.label} Content
                </p>
                <h2 className="font-heading font-extrabold text-2xl text-foreground mb-2">
                  {trackTitle ? `Unlock "${trackTitle}"` : "Unlock This Content"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  This track requires a <strong className={info.color}>{info.label}</strong> membership or above.
                </p>
              </div>

              <div className={`rounded-xl ${info.bg} border ${info.border} p-4 mb-6`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${info.color}`} />
                  <span className={`text-sm font-bold ${info.color}`}>{info.label} — {info.price}</span>
                </div>
                <ul className="space-y-1.5">
                  {info.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-xs text-foreground/80">
                      <Zap className={`w-3 h-3 ${info.color} flex-shrink-0`} />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to="/membership"
                  onClick={onClose}
                  className={`w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider uppercase text-center transition-all ${info.bg} border ${info.border} ${info.color} hover:brightness-125`}
                >
                  Upgrade to {info.label}
                </Link>
                {requiredTier === "premium" && (
                  <Link
                    to="/membership"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider uppercase text-center bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:brightness-125 transition-all"
                  >
                    View All Plans
                  </Link>
                )}
                <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}