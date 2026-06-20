import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";

const RULES = [
  "Be respectful to other users.",
  "No harassment, bullying, hate speech, threats, or intimidation.",
  "No sexual content or explicit messages.",
  "No spam, scams, fake giveaways, or misleading links.",
  "Do not share your personal information.",
  "Do not ask other users for personal information.",
  "Do not share phone numbers, addresses, passwords, payment info, private emails, or login details.",
  "Do not impersonate Upper Vibe Media, artists, moderators, or other users.",
  "Keep chat positive, safe, and high-vibe.",
  "Upper Vibe Media can remove users, mute users, suspend accounts, or restrict chat access for rule violations.",
];

export default function CommunityRulesModal({ open, onAccept, onDecline }) {
  const [checked, setChecked] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-end md:items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(5,5,16,0.85)", backdropFilter: "blur(8px)" }}
            onClick={onDecline}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl px-6 py-8 md:py-8"
            style={{
              background: "linear-gradient(180deg,#0d0d22 0%,#0a0a1a 100%)",
              border: "1px solid rgba(155,126,255,0.15)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)" }}
              >
                <Shield className="w-7 h-7" style={{ color: "#9B7EFF" }} />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.2)" }}>
                <Sparkles className="w-3 h-3" style={{ color: "#9B7EFF" }} />
                <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
                  Step 2 of 3
                </span>
              </div>

              <div>
                <h2 className="font-heading font-black text-2xl text-white mb-2">
                  Upper Vibe City Community Rules
                </h2>
                <p className="text-sm text-white/40">All users must follow these rules.</p>
              </div>

              {/* Rules list */}
              <div className="w-full text-left space-y-2.5">
                {RULES.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                      style={{ background: "rgba(155,126,255,0.2)", color: "#9B7EFF" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/60 leading-relaxed">{rule}</span>
                  </div>
                ))}
              </div>

              {/* Checkbox + buttons */}
              <div className="w-full flex flex-col gap-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-white/50 text-left">
                    I have read and agree to follow the Upper Vibe City Community Rules.
                  </span>
                </label>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={onDecline}
                    className="flex-1 px-4 py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => checked && onAccept()}
                    disabled={!checked}
                    className="flex-1 px-4 py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
                      color: "#fff",
                    }}
                  >
                    Accept & Continue
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}