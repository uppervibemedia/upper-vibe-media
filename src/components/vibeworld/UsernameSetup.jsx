import React, { useState } from "react";
import { motion } from "framer-motion";
import { Compass, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const OFFENSIVE_PATTERNS = /fuck|shit|ass|bitch|dick|cock|pussy|cunt|nigger|fag|retard|kike|spic|chink|whore|slut|pedo/i;
const IMPERSONATION_PATTERNS = /upper.?vibe|admin|mod|moderator|support|staff|system|official|team/i;

export default function UsernameSetup({ onComplete }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const validate = (val) => {
    if (!val) return "";
    if (val.length < 3) return "Username must be at least 3 characters.";
    if (val.length > 20) return "Username must be 20 characters or less.";
    if (!USERNAME_REGEX.test(val)) return "Only letters, numbers, and underscores.";
    if (OFFENSIVE_PATTERNS.test(val)) return "This username contains offensive language.";
    if (IMPERSONATION_PATTERNS.test(val)) return "Cannot impersonate Upper Vibe Media, admins, or artists.";
    // Check if it looks like an email
    if (/@/.test(val)) return "Usernames cannot contain email addresses.";
    // Check if it looks like a phone number
    if (/^[\d\s\-+()]{7,}$/.test(val)) return "Usernames cannot be phone numbers.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    const validationError = validate(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setChecking(true);

    try {
      // Check uniqueness
      const existing = await base44.entities.User.filter({ world_username: trimmed });
      if (existing.length > 0) {
        setError("This username is already taken. Please choose another.");
        setChecking(false);
        return;
      }

      // Save username
      await base44.auth.updateMe({ world_username: trimmed });
      onComplete(trimmed);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setChecking(false);
    }
  };

  const currentError = error || validate(username);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-5"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-120px] left-[10%] w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle,#9B7EFF,transparent 70%)", opacity: 0.1 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-120px] right-[5%] w-[480px] h-[480px] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle,#00A0DC,transparent 70%)", opacity: 0.1 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.07, 0.13, 0.07] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-5"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "#9B7EFF" }} />
          <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
            Step 1 of 3
          </span>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white mb-3">
            Choose Your Username
          </h2>
          <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
            Choose a public username. Do not use your real full name, phone number, email, address, or private personal information.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Your username"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl text-white text-sm font-medium text-center placeholder-white/20 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: error
                  ? "1px solid rgba(239,68,68,0.5)"
                  : username && !currentError
                    ? "1px solid rgba(34,197,94,0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
              }}
            />
            {username && !currentError && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
            )}
          </div>

          {currentError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-xs text-red-400 px-2"
            >
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {currentError}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={!username || !!currentError || checking}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
              color: "#fff",
              boxShadow: "0 0 30px rgba(155,126,255,0.35)",
            }}
          >
            {checking ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
            ) : (
              <>Continue</>
            )}
          </button>
        </form>

        <p className="text-[10px] text-white/20 max-w-xs">
          3–20 characters. Letters, numbers, and underscores only. No offensive words or impersonation.
        </p>
      </motion.div>
    </div>
  );
}