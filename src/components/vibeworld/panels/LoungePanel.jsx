import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Disc3, Play, Pause, ThumbsUp, Sparkles, Radio, Flag, UserX } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import CoverImage from "@/components/shared/CoverImage";
import VoiceLoungePanel from "@/components/vibeworld/panels/VoiceLoungePanel";

const MOODS = [
  { key: "vibing", label: "Vibing", emoji: "🎵" },
  { key: "locked_in", label: "Locked In", emoji: "🔒" },
  { key: "relaxing", label: "Relaxing", emoji: "🌊" },
  { key: "manifesting", label: "Manifesting", emoji: "✨" },
  { key: "energized", label: "Energized", emoji: "⚡" },
];

const RECENT_MESSAGE_LIMIT = 50;

export default function LoungePanel({
  open, onClose, isMobile, chatAgeConfirmed = false,
  onInputFocus, onVoiceActive, blockedUsers,
}) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer() || {};
  const { user } = useAuth();
  const [activeMood, setActiveMood] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevVoiceActive = useRef(false);

  // Derive a display name for the current user
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Anon";

  // ── Track orientation ─────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // ── Load recent lounge messages ────────────────────────────
  useEffect(() => {
    if (!open || !user?.id) return;
    base44.entities.VibeRoomMessage.list("-created_date", RECENT_MESSAGE_LIMIT)
      .then((msgs) => {
        // Reverse to show oldest first
        setMessages((msgs || []).reverse());
      })
      .catch(() => {});
  }, [open, user?.id]);

  // ── Subscribe to real-time lounge messages ──────────────────
  useEffect(() => {
    if (!open || !user?.id) return;
    const unsubscribe = base44.entities.VibeRoomMessage.subscribe((event) => {
      if (event.type === "create" && event.data) {
        setMessages((prev) => {
          // Deduplicate by id
          if (prev.some((m) => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      }
    });
    return () => unsubscribe();
  }, [open, user?.id]);

  // ── Auto-scroll to bottom on new messages ───────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Voice active tracking for audio ducking ─────────────────
  useEffect(() => {
    if (onVoiceActive && prevVoiceActive.current !== voiceOpen) {
      prevVoiceActive.current = voiceOpen;
      onVoiceActive(voiceOpen);
    }
  }, [voiceOpen, onVoiceActive]);

  // ── Focus tracking for movement lock ────────────────────────
  const handleInputFocus = useCallback(() => {
    onInputFocus?.(true);
  }, [onInputFocus]);

  const handleInputBlur = useCallback(() => {
    onInputFocus?.(false);
  }, [onInputFocus]);

  // ── Send a message ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !user?.id || sending) return;
    setSending(true);
    setInput("");

    // Optimistic local add
    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      user_name: displayName,
      user_email: user.email,
      content: text,
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await base44.entities.VibeRoomMessage.create({
        user_email: user.email,
        user_name: displayName,
        content: text,
      });
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
    setSending(false);
  }, [input, user, sending, displayName]);

  // ── Keyboard handler ────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Mood reaction ───────────────────────────────────────────
  const handleMood = useCallback(async (mood) => {
    setActiveMood(mood.key);
    if (!user?.id) return;
    try {
      await base44.entities.VibeRoomMessage.create({
        user_email: user.email,
        user_name: displayName,
        content: `${mood.emoji} ${mood.label}`,
      });
    } catch {}
  }, [user, displayName]);

  // ── Block user from chat ────────────────────────────────────
  const handleBlockUser = useCallback((msg) => {
    if (!msg?.user_email) return;
    // Block by email — can be enhanced
    try { navigator?.vibrate?.(20); } catch {}
  }, []);

  // ── Report message ──────────────────────────────────────────
  const handleReport = useCallback((msg) => {
    try { navigator?.vibrate?.(20); } catch {}
  }, []);

  // Clear input when panel closes
  useEffect(() => {
    if (!open) setInput("");
  }, [open]);

  if (!open) return null;

  const isBlocked = (msg) => {
    if (!blockedUsers || !msg?.user_email) return false;
    return !!blockedUsers[msg.user_email];
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 70,
        height: isMobile ? "min(80dvh, 100dvh)" : "65vh",
        maxHeight: "100dvh",
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
        <div className="flex items-center gap-2">
          {/* Voice Lounge button — only for 18+ users */}
          {chatAgeConfirmed && (
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setVoiceOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(0,230,118,0.1)",
                border: "1px solid rgba(0,230,118,0.2)",
                color: "#00E676",
                minHeight: 36,
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <Radio className="w-3 h-3" />
              Voice
            </button>
          )}
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
      </div>

      {/* ── LANDSCAPE: two-column layout ─────────────────── */}
      {isLandscape ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left column: Now Playing → Moods → Chat → Input */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-white/5">
            {currentTrack && (
              <div className="flex-shrink-0 px-3 py-2 border-b border-white/5">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0">
                    <CoverImage
                      src={currentTrack.cover_url}
                      alt={currentTrack.title}
                      className="w-full h-full"
                      iconClassName="w-3 h-3"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-white truncate">{currentTrack.title}</p>
                    <p className="text-[8px] text-white/25 truncate">
                      {currentTrack.artist_display || "Upper Vibe Media"}
                    </p>
                  </div>
                  <button
                    onClick={togglePlay}
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(155,126,255,0.2)", color: "#c4aaff" }}
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Mood buttons — compact row */}
            <div className="flex-shrink-0 px-3 py-1.5 flex gap-1.5 overflow-x-auto hide-scrollbar border-b border-white/5">
              {MOODS.map((mood) => (
                <button
                  key={mood.key}
                  onClick={() => handleMood(mood)}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black tracking-wider transition-all active:scale-95"
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

            {/* Live Chat Feed */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              <p className="text-[9px] font-black tracking-wider text-white/15 uppercase px-1">Live Chat</p>
              {messages.length === 0 && (
                <p className="text-center text-[10px] text-white/20 mt-6">
                  No messages yet. Start the vibe.
                </p>
              )}
              {messages.map((msg) => {
                if (isBlocked(msg)) return null;
                const isMe = msg.user_email === user?.email;
                const timeStr = msg.created_date
                  ? new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";

                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                    <div
                      className="max-w-[85%] px-2.5 py-1.5 rounded-xl"
                      style={{
                        background: isMe
                          ? "rgba(0,160,220,0.12)"
                          : "rgba(155,126,255,0.08)",
                        border: `1px solid ${isMe
                          ? "rgba(0,160,220,0.2)"
                          : "rgba(155,126,255,0.15)"}`,
                      }}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <p className="text-[9px] font-black tracking-wider"
                          style={{ color: isMe ? "rgba(0,160,220,0.6)" : "rgba(155,126,255,0.6)" }}>
                          {msg.user_name || "Anon"}
                        </p>
                        {timeStr && <span className="text-[8px] text-white/20">{timeStr}</span>}
                      </div>
                      <p className="text-[10px] text-white/70">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 py-2 border-t border-white/5">
              {chatAgeConfirmed ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Share your vibe..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onTouchStart={(e) => e.stopPropagation()}
                    maxLength={300}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/25 outline-none"
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
                    disabled={!input.trim() || sending}
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                    style={{
                      background: input.trim()
                        ? "rgba(155,126,255,0.15)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${input.trim()
                        ? "rgba(155,126,255,0.25)"
                        : "rgba(255,255,255,0.08)"}`,
                      color: input.trim() ? "#c4aaff" : "rgba(255,255,255,0.2)",
                      minWidth: 44,
                      minHeight: 44,
                      touchAction: "manipulation",
                      pointerEvents: "auto",
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center px-3 py-2 rounded-lg"
                  style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.15)" }}>
                  <p className="text-[10px] font-bold text-yellow-400/70">18+ chat only</p>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Voice controls + info */}
          <div className="w-[45%] max-w-[220px] flex-shrink-0 flex flex-col p-3 gap-3">
            <p className="text-[9px] font-black tracking-wider text-white/15 uppercase px-1">Voice Lounge</p>

            {/* Voice Lounge controls */}
            {chatAgeConfirmed ? (
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setVoiceOpen(true); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "rgba(0,230,118,0.1)",
                  border: "1px solid rgba(0,230,118,0.2)",
                  color: "#00E676",
                  minHeight: 44,
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}
              >
                <Radio className="w-3.5 h-3.5" />
                Join Voice Chat
              </button>
            ) : (
              <div className="rounded-xl p-3" style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.15)" }}>
                <p className="text-[10px] text-yellow-400/70 text-center font-bold">18+ only</p>
              </div>
            )}

            {/* Now Playing — compact version in right column */}
            {currentTrack && (
              <div
                className="rounded-xl p-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-[8px] font-black tracking-wider text-purple-400/60 uppercase mb-1">Now Playing</p>
                <div className="w-full aspect-square rounded-lg overflow-hidden mb-2">
                  <CoverImage
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full h-full"
                    iconClassName="w-5 h-5"
                  />
                </div>
                <p className="text-[10px] font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-[9px] text-white/25 truncate mb-1.5">
                  {currentTrack.artist_display || "Upper Vibe Media"}
                </p>
                <button
                  onClick={togglePlay}
                  className="w-full py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-all active:scale-95"
                  style={{ background: "rgba(155,126,255,0.15)", color: "#c4aaff" }}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                  {isPlaying ? "Pause" : "Play"}
                </button>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            <p className="text-[8px] text-white/15 text-center">
              Be respectful. No personal info.
            </p>
          </div>
        </div>
      ) : (
        /* ── PORTRAIT: vertical stack ─────────────────────── */
        <>
          {/* Compact Now Playing */}
          {currentTrack && (
            <div className="flex-shrink-0 px-4 py-2 border-b border-white/5">
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                  <CoverImage
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full h-full"
                    iconClassName="w-3.5 h-3.5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black tracking-wider text-purple-400/60 uppercase mb-0.5">
                    Now Playing in Lounge
                  </p>
                  <p className="text-[11px] font-bold text-white truncate">{currentTrack.title}</p>
                  <p className="text-[9px] text-white/30 truncate">
                    {currentTrack.artist_display || "Upper Vibe Media"}
                  </p>
                </div>
                <button
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(155,126,255,0.2)", color: "#c4aaff" }}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Mood buttons */}
          <div className="flex-shrink-0 px-4 py-2.5 flex gap-2 overflow-x-auto hide-scrollbar border-b border-white/5">
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

          {/* Live Chat Feed */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
            <p className="text-[10px] font-black tracking-wider text-white/15 uppercase">Live Chat</p>
            {messages.length === 0 && (
              <p className="text-center text-xs text-white/20 mt-8">
                No messages yet. Start the vibe.
              </p>
            )}
            {messages.map((msg) => {
              if (isBlocked(msg)) return null;
              const isMe = msg.user_email === user?.email;
              const timeStr = msg.created_date
                ? new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                  <div
                    className="max-w-[80%] px-3 py-2 rounded-2xl"
                    style={{
                      background: isMe
                        ? "rgba(0,160,220,0.12)"
                        : "rgba(155,126,255,0.08)",
                      border: `1px solid ${isMe
                        ? "rgba(0,160,220,0.2)"
                        : "rgba(155,126,255,0.15)"}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[10px] font-black tracking-wider"
                        style={{ color: isMe ? "rgba(0,160,220,0.6)" : "rgba(155,126,255,0.6)" }}>
                        {msg.user_name || "Anon"}
                      </p>
                      {timeStr && (
                        <span className="text-[9px] text-white/20">{timeStr}</span>
                      )}
                    </div>
                    <p className="text-xs text-white/70">{msg.content}</p>
                  </div>

                  {!isMe && (
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1 self-end">
                      <button
                        onClick={() => handleReport(msg)}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}
                        title="Report"
                      >
                        <Flag className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => handleBlockUser(msg)}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}
                        title="Block"
                      >
                        <UserX className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-white/5">
            {chatAgeConfirmed ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Share your vibe..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onTouchStart={(e) => e.stopPropagation()}
                  maxLength={300}
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
                  disabled={!input.trim() || sending}
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                  style={{
                    background: input.trim()
                      ? "rgba(155,126,255,0.15)"
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${input.trim()
                      ? "rgba(155,126,255,0.25)"
                      : "rgba(255,255,255,0.08)"}`,
                    color: input.trim() ? "#c4aaff" : "rgba(255,255,255,0.2)",
                    minWidth: 44,
                    minHeight: 44,
                    touchAction: "manipulation",
                    pointerEvents: "auto",
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
        </>
      )}

      {/* Voice Lounge overlay */}
      <VoiceLoungePanel
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        isMobile={isMobile}
      />
    </motion.div>
  );
}