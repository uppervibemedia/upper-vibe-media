import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music2, Calendar } from "lucide-react";
import VibeAvatar from "./VibeAvatar";

export default function UserProfileCard({ profile, onClose, currentlyPlaying }) {
  if (!profile) return null;

  const joinDate = profile.joinDate
    ? new Date(profile.joinDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}
        />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xs rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg,#0d0d22,#080818)",
            border: "1px solid rgba(155,126,255,0.25)",
            boxShadow: "0 0 60px rgba(155,126,255,0.12), 0 24px 60px rgba(0,0,0,0.6)",
          }}>
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-[50px] opacity-20 pointer-events-none"
            style={{ background: "#9B7EFF" }} />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-xl text-white/30 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>

          <div className="relative p-6 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="mb-4">
              <VibeAvatar
                name={profile.name}
                avatarUrl={profile.avatarUrl}
                size={72}
              />
            </div>

            {/* Name */}
            <h3 className="font-heading font-black text-xl text-white mb-0.5">{profile.name}</h3>

            {/* Favorite emoji */}
            {profile.favoriteEmoji && (
              <p className="text-2xl mb-2">{profile.favoriteEmoji}</p>
            )}

            {/* Join date */}
            {joinDate && (
              <div className="flex items-center gap-1.5 text-white/30 text-xs mb-3">
                <Calendar className="w-3 h-3" />
                Vibing since {joinDate}
              </div>
            )}

            {/* Currently listening */}
            {currentlyPlaying && (
              <div className="w-full mt-1 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
                style={{
                  background: "rgba(0,200,220,0.06)",
                  border: "1px solid rgba(0,200,220,0.15)",
                }}>
                <div className="flex items-end gap-0.5 flex-shrink-0">
                  {[3, 5, 4].map((h, i) => (
                    <div key={i} className="w-[2px] rounded-full animate-pulse"
                      style={{ height: `${h}px`, background: "#00E5FF", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-black tracking-wider uppercase text-cyan-400/60">Now Listening</p>
                  <p className="text-xs font-bold text-white/80 truncate">{currentlyPlaying}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}