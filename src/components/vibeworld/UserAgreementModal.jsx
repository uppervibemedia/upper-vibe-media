import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, AlertTriangle, Sparkles } from "lucide-react";

const AGREEMENT_TEXT = `By entering Upper Vibe City, you agree to follow the community rules and use the world respectfully. Upper Vibe City is a public digital space where usernames, chat messages, reactions, and interactions may be visible to other users.

Do not share personal information inside Upper Vibe City. This includes your real full name, home address, phone number, email address, passwords, payment information, private social media accounts, school, workplace, or location.

Do not ask other users for personal information.

Chat is only available for users who confirm they are 18 or older.

Upper Vibe Media may moderate, remove, mute, suspend, or restrict users who violate the rules, create unsafe behavior, or misuse the platform.

By continuing, you agree to follow these rules and understand that your access may be limited or removed if you violate them.`;

export default function UserAgreementModal({ open, onAccept, onDecline, chatAgeConfirmed, onChatAgeChange }) {
  const [checked1, setChecked1] = useState(false); // Rules
  const [checked2, setChecked2] = useState(false); // Personal info
  const [checked3, setChecked3] = useState(false); // Chat is public
  const [checked4, setChecked4] = useState(false); // 18+

  const allRequired = checked1 && checked2 && checked3;

  const handleAccept = () => {
    onAccept({
      rulesAccepted: checked1,
      noPersonalInfo: checked2,
      chatPublic: checked3,
      chatAgeConfirmed: checked4,
    });
  };

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
              border: "1px solid rgba(0,160,220,0.15)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,160,220,0.12)", border: "1px solid rgba(0,160,220,0.25)" }}
              >
                <FileText className="w-7 h-7" style={{ color: "#00A0DC" }} />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.2)" }}>
                <Sparkles className="w-3 h-3" style={{ color: "#00A0DC" }} />
                <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#00A0DC" }}>
                  Step 3 of 3
                </span>
              </div>

              <div>
                <h2 className="font-heading font-black text-2xl text-white mb-2">
                  Upper Vibe City User Agreement
                </h2>
                <p className="text-sm text-white/40">Please read and accept to continue.</p>
              </div>

              {/* Agreement text */}
              <div
                className="w-full text-left px-4 py-4 rounded-lg max-h-48 overflow-y-auto"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {AGREEMENT_TEXT.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-white/55 leading-relaxed mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>

              {/* Checkboxes */}
              <div className="w-full flex flex-col gap-3">
                <label className="flex items-start gap-3 cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={checked1}
                    onChange={(e) => setChecked1(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-sm text-white/50 text-left">
                    I agree to the Upper Vibe City Community Rules.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={checked2}
                    onChange={(e) => setChecked2(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-sm text-white/50 text-left">
                    I understand I should not share personal information.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={checked3}
                    onChange={(e) => setChecked3(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-sm text-white/50 text-left">
                    I understand chat is public.
                  </span>
                </label>

                {/* 18+ checkbox */}
                <label
                  className="flex items-start gap-3 cursor-pointer px-1 py-2 rounded-lg"
                  style={{
                    background: checked4 ? "rgba(0,160,220,0.06)" : "rgba(245,168,0,0.04)",
                    border: checked4
                      ? "1px solid rgba(0,160,220,0.2)"
                      : "1px solid rgba(245,168,0,0.15)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked4}
                    onChange={(e) => setChecked4(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-cyan-500"
                  />
                  <div className="text-left">
                    <span className="text-sm text-white/60">
                      I confirm I am 18 or older and understand that chat is public.
                    </span>
                    {!checked4 && (
                      <p className="text-[11px] text-white/30 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#F5A800" }} />
                        Chat will be disabled if not confirmed.
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 w-full pt-1">
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
                  onClick={handleAccept}
                  disabled={!allRequired}
                  className="flex-1 px-4 py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg,#0080B8,#00A0DC)",
                    color: "#fff",
                    boxShadow: "0 0 30px rgba(0,160,220,0.35)",
                  }}
                >
                  {checked4 ? "Enter Upper Vibe City" : "Enter (Chat Disabled)"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}