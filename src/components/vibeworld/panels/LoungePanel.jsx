import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, MessageCircle, Disc3, Play, Pause, ThumbsUp, Sparkles } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";

const MOODS = [
  { key: "vibing", label: "Vibing", emoji: "🎵" },
  { key: "locked_in", label: "Locked In", emoji: "🔒" },
  { key: "relaxing", label: "Relaxing", emoji: "🌊" },
  { key: "manifesting", label: "Manifesting", emoji: "✨" },
  { key: "energized", label: "Energized", emoji: "⚡" },
];

export default function LoungePanel({ open, onClose, isMobile, chatAgeConfirmed = false }) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer() || {};
  const [activeMood, setActiveMood] = useState(null);
  const [messages, setMessages] = useState([
    { id: 1, user: "UV Radio", text: "Welcome to the Vibe Lounge! Tap a mood to share how you're feeling.", isBot: true },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), user: "You", text: input.trim(), isBot: false }]);
    setInput("");

    // Bot response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        user: "UV Radio",
        text: ["Vibes received! 🌊", "Keep the energy flowing! ✨", "That's the spirit! 🙌", "Music connects us all 🎵"][Math.floor(Math.random() * 4)],
        isBot: true,
      }]);
    }, 600);
  };

  const handleMood = (mood) => {
    setActiveMood(mood.key);
    setMessages(prev => [...prev, {
      id: Date.now(),
      user: "You",
      text: `${mood.emoji} ${mood.label}`,
      isBot: false,
    }]);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 70,
        height: isMobile ? "80dvh" : "65vh",
        background: "rgba(12,10,24,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-400" />
          <h3 className="font-heading font-black text-lg text-white">Vibe Lounge</h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20"
          style={{
            color: "rgba(255,255,255,0.6)",
            minWidth: 44,
            minHeight: 44,
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
          aria-label="Close lounge"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
          <div
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              <CoverImage
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full"
                iconClassName="w-4 h-4"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black tracking-wider text-purple-400/60 uppercase mb-0.5">
                Now Playing in Lounge
              </p>
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-white/30 truncate">
                {currentTrack.artist_display || "Upper Vibe Media"}
              </p>
            </div>
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(155,126,255,0.2)", color: "#c4aaff" }}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Mood buttons */}
      <div className="flex-shrink-0 px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar border-b border-white/5">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            onClick={() => handleMood(mood)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all active:scale-95"
            style={{
              background: activeMood === mood.key
                ? "rgba(155,126,255,0.15)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeMood === mood.key
                ? "rgba(155,126,255,0.3)"
                : "rgba(255,255,255,0.08)"}`,
              color: activeMood === mood.key ? "#c4aaff" : "rgba(255,255,255,0.4)",
            }}
          >
            {mood.emoji} {mood.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}>
            <div
              className="max-w-[80%] px-3 py-2 rounded-2xl"
              style={{
                background: msg.isBot
                  ? "rgba(155,126,255,0.08)"
                  : "rgba(0,160,220,0.12)",
                border: `1px solid ${msg.isBot
                  ? "rgba(155,126,255,0.15)"
                  : "rgba(0,160,220,0.2)"}`,
              }}
            >
              <p className="text-[10px] font-black tracking-wider mb-0.5"
                style={{ color: msg.isBot ? "rgba(155,126,255,0.6)" : "rgba(0,160,220,0.6)" }}>
                {msg.user}
              </p>
              <p className="text-xs text-white/70">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input or age-restricted message */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5">
        {chatAgeConfirmed ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Share your vibe..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              onTouchStart={(e) => e.stopPropagation()}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                pointerEvents: "auto",
                touchAction: "manipulation",
                minHeight: "44px",
                fontSize: "16px",
              }}
            />
            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
              style={{
                background: "rgba(155,126,255,0.15)",
                border: "1px solid rgba(155,126,255,0.25)",
                color: "#c4aaff",
              }}
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className="text-center px-4 py-3 rounded-xl"
            style={{
              background: "rgba(245,168,0,0.06)",
              border: "1px solid rgba(245,168,0,0.15)",
            }}
          >
            <p className="text-[11px] font-bold text-yellow-400/70">
              Chat is only available for users 18 and older.
            </p>
            <p className="text-[10px] text-white/25 mt-1">
              You can still view the lounge and use mood reactions.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}