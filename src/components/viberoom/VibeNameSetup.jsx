import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PROFANITY_LIST = ["fuck", "shit", "bitch", "ass", "cunt", "dick", "pussy", "nigger", "nigga", "faggot"];
const VIBE_NAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function containsProfanity(str) {
  const lower = str.toLowerCase();
  return PROFANITY_LIST.some((word) => lower.includes(word));
}

export default function VibeNameSetup({ onComplete }) {
  const [vibeName, setVibeName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const validate = (name) => {
    if (!VIBE_NAME_REGEX.test(name)) {
      return "3–20 characters, letters, numbers, and underscores only.";
    }
    if (containsProfanity(name)) {
      return "That name isn't allowed. Please choose a positive vibe name.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = vibeName.trim();
    const err = validate(trimmed);
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");
    try {
      await base44.auth.updateMe({ vibe_name: trimmed });
      onComplete(trimmed);
    } catch (_) {
      setError("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  const isValid = VIBE_NAME_REGEX.test(vibeName.trim()) && !containsProfanity(vibeName.trim());

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
          border: "1px solid rgba(155,126,255,0.3)",
          boxShadow: "0 0 60px rgba(155,126,255,0.12)",
        }}>
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-[50px] opacity-20 pointer-events-none"
          style={{ background: "#9B7EFF" }} />

        <div className="relative p-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.3)" }}>
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>

          <h2 className="font-heading font-black text-xl text-white text-center mb-1">
            Create Your Vibe Name
          </h2>
          <p className="text-white/40 text-sm text-center leading-relaxed mb-6">
            This is how people will see you in the Vibe Room.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={vibeName}
                onChange={(e) => { setVibeName(e.target.value); setError(""); }}
                placeholder="e.g. HighVibeKing"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none pr-10"
                style={{
                  background: "rgba(155,126,255,0.08)",
                  border: `1px solid ${error ? "rgba(239,68,68,0.4)" : isValid ? "rgba(155,126,255,0.4)" : "rgba(155,126,255,0.2)"}`,
                }}
              />
              {isValid && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <p className="text-[10px] text-white/25 leading-relaxed">
              3–20 characters · Letters, numbers & underscores only · No profanity
            </p>

            <button
              type="submit"
              disabled={!vibeName.trim() || saving}
              className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(155,126,255,0.3)",
                letterSpacing: "0.05em",
              }}>
              {saving ? "Setting vibe..." : "Enter the Room ✦"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}