import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AvatarUpload from "./AvatarUpload";

const PROFANITY_LIST = ["fuck", "shit", "bitch", "ass", "cunt", "dick", "pussy", "nigger", "nigga", "faggot"];
const VIBE_NAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const LOCALSTORAGE_KEY = "uv_vibe_name";
const LOCALSTORAGE_AVATAR_KEY = "uv_vibe_avatar";
const LOCALSTORAGE_SET_DATE_KEY = "uv_vibe_name_set_date";

function containsProfanity(str) {
  const lower = str.toLowerCase();
  return PROFANITY_LIST.some((word) => lower.includes(word));
}

/** Returns saved vibe name for a user — checks profile first, then localStorage */
export function getSavedVibeName(user) {
  if (user?.vibe_name) return user.vibe_name;
  return localStorage.getItem(LOCALSTORAGE_KEY) || null;
}

/** Returns saved avatar URL — checks profile first, then localStorage */
export function getSavedVibeAvatar(user) {
  if (user?.vibe_avatar_url) return user.vibe_avatar_url;
  return localStorage.getItem(LOCALSTORAGE_AVATAR_KEY) || null;
}

/** Returns true if user can change their vibe name (30-day cooldown) */
export function canChangeVibeName() {
  const setDate = localStorage.getItem(LOCALSTORAGE_SET_DATE_KEY);
  if (!setDate) return true;
  const daysSince = (Date.now() - parseInt(setDate, 10)) / (1000 * 60 * 60 * 24);
  return daysSince >= 30;
}

export default function VibeNameSetup({ onComplete, isChange = false, initialAvatar = null }) {
  const [vibeName, setVibeName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const validate = (name) => {
    if (!VIBE_NAME_REGEX.test(name)) return "3–20 characters, letters, numbers, and underscores only.";
    if (containsProfanity(name)) return "That name isn't allowed. Please choose a positive vibe name.";
    return null;
  };

  const handleAvatarUploaded = (url) => {
    setAvatarUrl(url);
    localStorage.setItem(LOCALSTORAGE_AVATAR_KEY, url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = vibeName.trim();
    const err = validate(trimmed);
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, trimmed);
      localStorage.setItem(LOCALSTORAGE_SET_DATE_KEY, Date.now().toString());
      if (avatarUrl) localStorage.setItem(LOCALSTORAGE_AVATAR_KEY, avatarUrl);

      try {
        const updates = { vibe_name: trimmed };
        if (avatarUrl) updates.vibe_avatar_url = avatarUrl;
        await base44.auth.updateMe(updates);
      } catch (_) {
        // Not logged in or update failed — localStorage fallback is set
      }

      onComplete({ name: trimmed, avatarUrl });
    } catch (_) {
      setError("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  const isValid = VIBE_NAME_REGEX.test(vibeName.trim()) && !containsProfanity(vibeName.trim());

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
          border: "1px solid rgba(155,126,255,0.3)",
          boxShadow: "0 0 80px rgba(155,126,255,0.15), 0 32px 80px rgba(0,0,0,0.7)",
        }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-[50px] opacity-20 pointer-events-none"
          style={{ background: "#9B7EFF" }} />

        <div className="relative p-8">
          {/* Avatar upload at top */}
          <div className="flex flex-col items-center mb-5">
            <AvatarUpload
              name={vibeName || "?"}
              currentAvatarUrl={avatarUrl}
              onUploaded={handleAvatarUploaded}
            />
            <p className="text-[10px] text-white/25 mt-2">Tap camera to add photo</p>
          </div>

          <h2 className="font-heading font-black text-xl text-white text-center mb-1">
            {isChange ? "Change Your Vibe Name" : "Create Your Vibe Name"}
          </h2>
          <p className="text-white/35 text-sm text-center leading-relaxed mb-5">
            This is how you'll appear in the Vibe Room.
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
                  border: `1px solid ${error ? "rgba(239,68,68,0.4)" : isValid ? "rgba(155,126,255,0.5)" : "rgba(155,126,255,0.2)"}`,
                  transition: "border-color 0.15s ease",
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

            <p className="text-[10px] text-white/20 leading-relaxed">
              3–20 chars · Letters, numbers & underscores · No profanity
              {isChange && " · 30-day cooldown between changes"}
            </p>

            <button
              type="submit"
              disabled={!vibeName.trim() || saving}
              className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                color: "#fff",
                boxShadow: "0 4px 24px rgba(155,126,255,0.35)",
                letterSpacing: "0.05em",
              }}>
              {saving ? "Entering..." : isChange ? "Update Name ✦" : "Enter the Room ✦"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}