import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MessageCircle, Sparkles, Users, BookOpen, Coffee,
  Play, Pause, Radio, RefreshCw, Send, ArrowLeft
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import CoverImage from "@/components/shared/CoverImage";

// ── Constants ────────────────────────────────────────────────
const VIBE_STATUSES = [
  { key: "chilling",        label: "Chilling",        emoji: "🌊", color: "#00D4F0" },
  { key: "manifesting",     label: "Manifesting",     emoji: "✨", color: "#C43BFF" },
  { key: "networking",      label: "Networking",      emoji: "🤝", color: "#A078FF" },
  { key: "listening",       label: "Listening",       emoji: "🎵", color: "#9B4FFF" },
  { key: "open_to_connect", label: "Open to Connect", emoji: "💜", color: "#E040FB" },
  { key: "do_not_disturb",  label: "Do Not Disturb",  emoji: "🔕", color: "rgba(255,255,255,0.3)" },
];

const QUICK_PROMPTS = [
  "What are you manifesting? ✨",
  "What song are you vibing to? 🎵",
  "What goal are you locked in on? 🔒",
  "Sending good energy 💜",
  "Meet me at the stage 🎤",
  "Add me if you're building something 🤝",
  "I'm just chilling 🌊",
  "432Hz vibes 🔮",
];

const MANIFEST_PROMPTS = [
  "What version of you are you becoming?",
  "What are you calling in today?",
  "What habit are you upgrading?",
  "What energy are you leaving behind?",
  "What does your future self need from you?",
  "What would you do if you knew you couldn't fail?",
  "What boundary are you ready to set?",
  "What abundance are you open to receiving?",
];

const TABS = [
  { id: "sit",      label: "Sit & Chill", icon: Coffee },
  { id: "nearby",   label: "Nearby",      icon: Users },
  { id: "chat",     label: "Vibe Chat",   icon: MessageCircle },
  { id: "manifest", label: "Manifest",    icon: Sparkles },
  { id: "friends",  label: "Friends",     icon: BookOpen },
];

// ── Seat positions (lounge seating spots in 3D world coords) ──
const LOUNGE_SEATS = [
  { id: 0, label: "Seat A", x: -23.8, z: -27.5 },
  { id: 1, label: "Seat B", x: -22.0, z: -28.8 },
  { id: 2, label: "Seat C", x: -20.2, z: -27.5 },
  { id: 3, label: "Seat D", x: -19.5, z: -25.5 },
  { id: 4, label: "Seat E", x: -24.5, z: -25.5 },
];

// ── Helper: status badge ─────────────────────────────────────
function StatusBadge({ statusKey, small }) {
  const s = VIBE_STATUSES.find((v) => v.key === statusKey);
  if (!s) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-black"
      style={{
        background: `${s.color}18`,
        border: `1px solid ${s.color}44`,
        color: s.color,
        padding: small ? "1px 6px" : "2px 8px",
        fontSize: small ? "8px" : "10px",
        letterSpacing: "0.06em",
      }}
    >
      {s.emoji} {s.label}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────
export default function VibeLoungeHub({
  open,
  onClose,
  isMobile,
  chatAgeConfirmed = false,
  onInputFocus,
  blockedUsers = {},
  activeUsers = [],
  currentUserId,
  onSelectUser,
  onRequestChat,
  followSystem,
  isSeatedExternal = false,
  onSeatChange,
}) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer() || {};
  const { user } = useAuth();
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Anon";

  const [activeTab, setActiveTab] = useState("sit");
  const [vibeStatus, setVibeStatus] = useState(() => {
    try { return sessionStorage.getItem("uvc_lounge_status") || null; } catch { return null; }
  });
  const [isSeated, setIsSeated] = useState(isSeatedExternal);
  const [chosenSeat, setChosenSeat] = useState(null);

  // Sync external seated state (e.g. sitting from the world "Sit" prompt)
  useEffect(() => {
    setIsSeated(isSeatedExternal);
    if (!isSeatedExternal) setChosenSeat(null);
  }, [isSeatedExternal]);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Manifest state
  const [manifestIdx, setManifestIdx] = useState(() => Math.floor(Math.random() * MANIFEST_PROMPTS.length));

  // Friends list (accepted follows who are online)
  const [friends, setFriends] = useState([]);

  // Orientation
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);

  // ── Load lounge messages ─────────────────────────────────
  useEffect(() => {
    if (!open || !user?.id) return;
    base44.entities.ZoneChatMessage.filter({ zone_id: "lounge" }, "-created_date", 60)
      .then((msgs) => setMessages((msgs || []).reverse()))
      .catch(() => {});
  }, [open, user?.id]);

  // ── Subscribe to real-time lounge chat ──────────────────
  useEffect(() => {
    if (!open || !user?.id) return;
    const unsub = base44.entities.ZoneChatMessage.subscribe((event) => {
      if (event.type === "create" && event.data?.zone_id === "lounge") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      }
    });
    return () => unsub();
  }, [open, user?.id]);

  // ── Auto-scroll chat ─────────────────────────────────────
  useEffect(() => {
    if (activeTab === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  // ── Load friends (online users who are followed) ─────────
  useEffect(() => {
    if (!open || !currentUserId || !followSystem) return;
    followSystem.loadMyFollows?.();
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open || !activeUsers || !followSystem) return;
    const myFollowing = followSystem.following || [];
    const friendIds = new Set(myFollowing.map((f) => f.following_user_id));
    const onlineFriends = activeUsers.filter(
      (u) => u.user_id !== currentUserId && friendIds.has(u.user_id)
    );
    setFriends(onlineFriends);
  }, [open, activeUsers, followSystem?.following]);

  // ── Nearby lounge users ──────────────────────────────────
  const loungeUsers = (activeUsers || []).filter(
    (u) => u.user_id !== currentUserId && u.current_zone === "lounge"
  );

  // ── Persist vibe status ──────────────────────────────────
  const handleSetStatus = useCallback(async (key) => {
    setVibeStatus(key);
    try { sessionStorage.setItem("uvc_lounge_status", key); } catch {}
    if (user?.id) {
      try {
        await base44.auth.updateMe({ lounge_status: key });
      } catch {}
    }
  }, [user?.id]);

  // ── Sit & Stand ─────────────────────────────────────────
  const handleSit = useCallback((seat) => {
    setIsSeated(true);
    setChosenSeat(seat);
    handleSetStatus("chilling");
    onSeatChange?.(true, seat);
  }, [handleSetStatus, onSeatChange]);

  const handleStandUp = useCallback(() => {
    setIsSeated(false);
    setChosenSeat(null);
    onSeatChange?.(false, null);
  }, [onSeatChange]);

  // ── Send lounge chat message ─────────────────────────────
  const handleSend = useCallback(async (text) => {
    const msg = (text || chatInput).trim();
    if (!msg || !user?.id || sending) return;
    setSending(true);
    setChatInput("");
    const optimisticId = `opt_${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: optimisticId, zone_id: "lounge",
      user_id: user.id, username: displayName,
      message: msg, created_date: new Date().toISOString(),
    }]);
    try {
      await base44.entities.ZoneChatMessage.create({
        zone_id: "lounge", user_id: user.id, username: displayName, message: msg,
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
    setSending(false);
  }, [chatInput, user, sending, displayName]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // ── Share manifest prompt to lounge chat ─────────────────
  const handleSharePrompt = useCallback(() => {
    const prompt = MANIFEST_PROMPTS[manifestIdx];
    handleSend(`💭 "${prompt}"`);
    setActiveTab("chat");
  }, [manifestIdx, handleSend]);

  if (!open) return null;

  const isBlocked = (uid) => !!(blockedUsers[uid]);

  // ── Tab content renderer ─────────────────────────────────
  const renderTabContent = () => {
    // SIT & CHILL
    if (activeTab === "sit") return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Current song */}
        {currentTrack && (
          <div className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.15)" }}>
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-full h-full" iconClassName="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black tracking-wider text-purple-400/60 uppercase mb-0.5">Now Playing</p>
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[9px] text-white/30 truncate">{currentTrack.artist_display || "Upper Vibe Media"}</p>
            </div>
            <button onClick={togglePlay}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
              style={{ background: "rgba(155,126,255,0.2)", color: "#c4aaff", minWidth: 32, minHeight: 32, touchAction: "manipulation" }}>
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        )}

        {/* Seated status */}
        {isSeated ? (
          <div className="rounded-2xl p-4 text-center space-y-3"
            style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.08),rgba(0,212,240,0.06))", border: "1px solid rgba(155,126,255,0.2)" }}>
            <div className="text-2xl">🛋️</div>
            <p className="text-xs font-black text-white/80">Chilling in Vibe Lounge</p>
            {chosenSeat && <p className="text-[9px] text-white/35">{chosenSeat.label}</p>}
            <button onClick={handleStandUp}
              className="px-5 py-2 rounded-full font-black text-[11px] tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", minHeight: 36, touchAction: "manipulation" }}>
              Stand Up
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/30 tracking-wider uppercase px-1">Choose a Seat</p>
            {LOUNGE_SEATS.map((seat) => (
              <button key={seat.id} onClick={() => handleSit(seat)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:brightness-110 active:scale-[0.98] text-left"
                style={{ background: "rgba(155,126,255,0.05)", border: "1px solid rgba(155,126,255,0.12)", minHeight: 48, touchAction: "manipulation" }}>
                <span className="text-lg">💺</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white/70">{seat.label}</p>
                  <p className="text-[9px] text-white/25">Lounge seating</p>
                </div>
                <span className="text-[9px] font-black text-purple-400/50 tracking-wider">SIT</span>
              </button>
            ))}
          </div>
        )}

        {/* Vibe Status */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-white/30 tracking-wider uppercase px-1">Your Vibe Status</p>
          <div className="grid grid-cols-2 gap-2">
            {VIBE_STATUSES.map((s) => (
              <button key={s.key} onClick={() => handleSetStatus(s.key)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-black text-[10px] tracking-wider transition-all active:scale-95"
                style={{
                  background: vibeStatus === s.key ? `${s.color}18` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${vibeStatus === s.key ? s.color + "44" : "rgba(255,255,255,0.08)"}`,
                  color: vibeStatus === s.key ? s.color : "rgba(255,255,255,0.4)",
                  minHeight: 40, touchAction: "manipulation",
                }}>
                <span>{s.emoji}</span>
                <span className="truncate">{s.label}</span>
                {vibeStatus === s.key && <span className="ml-auto text-[8px]">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    // NEARBY USERS
    if (activeTab === "nearby") return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-[10px] font-black text-white/30 tracking-wider uppercase">
          {loungeUsers.length} in Vibe Lounge
        </p>
        {loungeUsers.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">🌊</div>
            <p className="text-xs text-white/25">No one else in the lounge right now.</p>
            <p className="text-[9px] text-white/15 mt-1">Be the first to chill here.</p>
          </div>
        ) : loungeUsers.map((u) => {
          if (isBlocked(u.user_id)) return null;
          const status = VIBE_STATUSES.find((s) => s.key === u.lounge_status);
          return (
            <div key={u.user_id}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.3),rgba(0,200,220,0.2))", color: "#c4aaff" }}>
                {(u.username || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate">{u.username || "User"}</p>
                {status && <StatusBadge statusKey={u.lounge_status} small />}
              </div>
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { try { navigator?.vibrate?.(10); } catch {}; onSelectUser?.(u); }}
                className="px-3 py-1.5 rounded-full font-black text-[9px] tracking-wider transition-all active:scale-95"
                style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)", color: "#c4aaff", minHeight: 30, touchAction: "manipulation" }}>
                View
              </button>
            </div>
          );
        })}
        {/* All online users not in lounge */}
        {loungeUsers.length === 0 && activeUsers.filter((u) => u.user_id !== currentUserId).length > 0 && (
          <div className="mt-4">
            <p className="text-[9px] font-black text-white/20 tracking-wider uppercase mb-2">Others in the City</p>
            {activeUsers.filter((u) => u.user_id !== currentUserId && !isBlocked(u.user_id)).slice(0, 5).map((u) => (
              <div key={u.user_id}
                className="flex items-center gap-2 p-2.5 rounded-xl mb-1.5"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[11px]"
                  style={{ background: "rgba(155,126,255,0.15)", color: "#c4aaff" }}>
                  {(u.username || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-white/60 truncate">{u.username || "User"}</p>
                  <p className="text-[8px] text-white/20 truncate">{u.current_zone ? `In ${u.current_zone}` : "Exploring"}</p>
                </div>
                <button onClick={() => onSelectUser?.(u)}
                  className="px-2 py-1 rounded-full font-black text-[8px]"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", touchAction: "manipulation", minHeight: 24 }}>
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    // VIBE CHAT
    if (activeTab === "chat") return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Quick prompts */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/5">
          <p className="text-[9px] font-black text-white/20 tracking-wider uppercase mb-2">Quick Messages</p>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => handleSend(p)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full font-bold text-[9px] transition-all active:scale-95"
                style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.18)", color: "rgba(196,160,255,0.7)", whiteSpace: "nowrap", touchAction: "manipulation", minHeight: 28 }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
          {messages.length === 0 && (
            <p className="text-center text-xs text-white/20 mt-8">No messages yet. Start the vibe. 🌊</p>
          )}
          {messages.map((msg) => {
            if (isBlocked(msg.user_id)) return null;
            const isMe = msg.user_id === currentUserId;
            const time = msg.created_date
              ? new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] px-3 py-2 rounded-2xl"
                  style={{
                    background: isMe ? "rgba(0,160,220,0.12)" : "rgba(155,126,255,0.08)",
                    border: `1px solid ${isMe ? "rgba(0,160,220,0.2)" : "rgba(155,126,255,0.15)"}`,
                  }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-[9px] font-black"
                      style={{ color: isMe ? "rgba(0,160,220,0.6)" : "rgba(155,126,255,0.6)" }}>
                      {msg.username || "Anon"}
                    </p>
                    {time && <span className="text-[8px] text-white/20">{time}</span>}
                  </div>
                  <p className="text-xs text-white/75">{msg.message}</p>
                </div>
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
                type="text"
                placeholder="Share your vibe..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => onInputFocus?.(true)}
                onBlur={() => onInputFocus?.(false)}
                onTouchStart={(e) => e.stopPropagation()}
                maxLength={250}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  minHeight: "44px",
                  fontSize: "16px", // 16px prevents iOS Safari auto-zoom
                }}
              />
              <button
                onClick={() => handleSend()}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleSend(); }}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                style={{
                  background: chatInput.trim() ? "rgba(155,126,255,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${chatInput.trim() ? "rgba(155,126,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                  color: chatInput.trim() ? "#c4aaff" : "rgba(255,255,255,0.2)",
                  minWidth: 44, minHeight: 44, touchAction: "manipulation",
                }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-center px-4 py-3 rounded-xl"
              style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.15)" }}>
              <p className="text-[11px] font-bold text-yellow-400/70">18+ chat — verify age to chat</p>
            </div>
          )}
        </div>
      </div>
    );

    // MANIFEST PROMPT
    if (activeTab === "manifest") return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col items-center text-center space-y-5">
        <div className="text-4xl">🔮</div>
        <p className="text-[10px] font-black text-white/30 tracking-wider uppercase">Manifest Prompt</p>
        <div className="w-full rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg,rgba(196,59,255,0.08),rgba(155,126,255,0.06))", border: "1px solid rgba(155,126,255,0.2)" }}>
          <p className="text-base font-black text-white/90 leading-snug">
            "{MANIFEST_PROMPTS[manifestIdx]}"
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button onClick={() => setManifestIdx((i) => (i + 1) % MANIFEST_PROMPTS.length)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", minHeight: 44, touchAction: "manipulation" }}>
            <RefreshCw className="w-3.5 h-3.5" /> New Prompt
          </button>
          {chatAgeConfirmed && (
            <button onClick={handleSharePrompt}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg,rgba(196,59,255,0.18),rgba(155,126,255,0.14))", border: "1px solid rgba(155,126,255,0.3)", color: "#c4aaff", minHeight: 44, touchAction: "manipulation" }}>
              <Send className="w-3.5 h-3.5" /> Share to Lounge Chat
            </button>
          )}
        </div>
        <p className="text-[9px] text-white/20 max-w-xs">
          Sit with this question. Let it guide your energy in the lounge.
        </p>
      </div>
    );

    // FRIENDS
    if (activeTab === "friends") return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-[10px] font-black text-white/30 tracking-wider uppercase">
          {friends.length} Friend{friends.length !== 1 ? "s" : ""} Online
        </p>
        {friends.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">💜</div>
            <p className="text-xs text-white/25">No friends online right now.</p>
            <p className="text-[9px] text-white/15 mt-1">Follow people to see them here when they're online.</p>
          </div>
        ) : friends.map((u) => {
          if (isBlocked(u.user_id)) return null;
          return (
            <div key={u.user_id}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: "rgba(155,126,255,0.05)", border: "1px solid rgba(155,126,255,0.12)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.35),rgba(0,200,220,0.25))", color: "#c4aaff" }}>
                {(u.username || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate">{u.username || "User"}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <p className="text-[8px] text-white/30 truncate">
                    {u.current_zone ? `In ${u.current_zone}` : "Online"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onRequestChat?.(u.user_id, u.username)}
                  className="px-2.5 py-1.5 rounded-full font-black text-[9px] transition-all active:scale-95"
                  style={{ background: "rgba(0,160,220,0.12)", border: "1px solid rgba(0,160,220,0.25)", color: "#00D4F0", minHeight: 30, touchAction: "manipulation" }}>
                  Chat
                </button>
                <button onClick={() => onSelectUser?.(u)}
                  className="px-2.5 py-1.5 rounded-full font-black text-[9px] transition-all active:scale-95"
                  style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.2)", color: "#c4aaff", minHeight: 30, touchAction: "manipulation" }}>
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );

    return null;
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
        height: isMobile ? "min(82dvh, 100dvh)" : "70vh",
        maxHeight: "100dvh",
        background: "rgba(10,8,22,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(155,126,255,0.18)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(155,126,255,0.18)", border: "1px solid rgba(155,126,255,0.3)" }}>
            <span className="text-sm">🛋️</span>
          </div>
          <div>
            <h3 className="font-heading font-black text-base text-white leading-none">Vibe Lounge</h3>
            {vibeStatus && <div className="mt-0.5"><StatusBadge statusKey={vibeStatus} small /></div>}
          </div>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); if (isSeated) handleStandUp(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20"
          style={{ color: "rgba(255,255,255,0.5)", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
          aria-label="Exit Vibe Lounge">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex border-b border-white/5 overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 transition-all"
              style={{
                background: active ? "rgba(155,126,255,0.08)" : "transparent",
                borderBottom: active ? "2px solid #c4aaff" : "2px solid transparent",
                color: active ? "#c4aaff" : "rgba(255,255,255,0.3)",
                minHeight: 52,
                touchAction: "manipulation",
              }}>
              <Icon style={{ width: 14, height: 14 }} />
              <span className="text-[8px] font-black tracking-wider whitespace-nowrap">{tab.label}</span>
              {tab.id === "nearby" && loungeUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full font-black flex items-center justify-center text-[7px]"
                  style={{ background: "#c4aaff", color: "#000" }}>
                  {loungeUsers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>

      {/* Seated status bar at bottom */}
      {isSeated && (
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-t border-purple-500/20"
          style={{ background: "rgba(155,126,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">🛋️</span>
            <p className="text-[10px] font-black text-purple-300/70">Chilling in Vibe Lounge</p>
          </div>
          <button onClick={handleStandUp}
            className="px-3 py-1 rounded-full font-black text-[9px] transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", minHeight: 28, touchAction: "manipulation" }}>
            Stand Up
          </button>
        </div>
      )}
    </motion.div>
  );
}