import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, ShieldCheck, Zap, Ban, Mic2, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../components/radio/RadioThemePicker";
import AgeGateModal, { hasConfirmedAge } from "../components/viberoom/AgeGateModal";
import { usePageMeta } from "@/hooks/usePageMeta";
import usePageVisible from "@/hooks/usePageVisible";
import VibeNameSetup, { getSavedVibeName, getSavedVibeAvatar, canChangeVibeName } from "../components/viberoom/VibeNameSetup";
import NowPlayingCard from "../components/viberoom/NowPlayingCard";
import DailyPromptCard from "../components/viberoom/DailyPromptCard";
import MessageBubble from "../components/viberoom/MessageBubble";
import VibeAvatar from "../components/viberoom/VibeAvatar";
import AvatarUpload from "../components/viberoom/AvatarUpload";
import PremiumUpgradePrompt from "../components/viberoom/PremiumUpgradePrompt";

// Layout constants
const BOTTOM_NAV_H = 56;
const PLAYER_H = 68;
const INPUT_EXTRA = 8;
const INPUT_BAR_H = 64;

function isPremiumUser(user) {
  return user?.role === "admin" || user?.role === "premium" || user?.tier === "premium" || user?.subscription_status === "active";
}

export default function VibeRoom() {
  const { user } = useAuth();
  const { currentTrack, isPlaying } = usePlayer();
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtAmbient1 = radioTheme.vars["--rt-ambient1"];
  const rtAmbient2 = radioTheme.vars["--rt-ambient2"];
  const isAdmin = user?.role === "admin";
  const isPremium = isPremiumUser(user);
  const isPageVisible = usePageVisible();

  // ── Age gate ──────────────────────────────────────────────────────────────
  const [ageConfirmed, setAgeConfirmed] = useState(() => hasConfirmedAge(user));
  const [showGate, setShowGate] = useState(!hasConfirmedAge(user));

  // ── Identity: vibe name + avatar (premium only) ───────────────────────────
  const [vibeName, setVibeName]     = useState(() => getSavedVibeName(user));
  const [vibeAvatar, setVibeAvatar] = useState(() => getSavedVibeAvatar(user));
  const [needsVibeName, setNeedsVibeName] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  usePageMeta({
    title:       "Vibe Room — Live Community Chat",
    description: "Join the Upper Vibe Media community. Stream music together, share reactions, and raise the frequency in real time.",
    pageUrl:     `${window.location.origin}/vibe-room`,
  });

  // Analytics: track view once
  useEffect(() => {
    if (!ageConfirmed) return;
    base44.analytics.track({ eventName: isPremium ? "vibe_room_viewed_premium" : "vibe_room_viewed_free" });
  }, [ageConfirmed, isPremium]);

  // When user auth resolves, sync identity from profile (premium only)
  useEffect(() => {
    if (!ageConfirmed || !isPremium) return;
    const savedName   = getSavedVibeName(user);
    const savedAvatar = getSavedVibeAvatar(user);
    if (savedName) {
      setVibeName(savedName);
      setNeedsVibeName(false);
    } else if (user) {
      setNeedsVibeName(true);
    }
    if (savedAvatar) setVibeAvatar(savedAvatar);
  }, [user, ageConfirmed, isPremium]);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages]       = useState([]);
  const [seededMessages, setSeeded]   = useState([]);
  const [bans, setBans]               = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const isBanned = bans.some((b) => b.user_email === user?.email && b.action === "banned");
  const isMuted  = bans.some((b) => b.user_email === user?.email && b.action === "muted");
  const hasPlayer = !!currentTrack;

  // ── Load messages + bans + seeded ────────────────────────────────────────
  useEffect(() => {
    if (!ageConfirmed) return;
    setLoading(true);
    Promise.all([
      base44.entities.VibeRoomMessage.filter({ is_hidden: false }, "created_date", 100),
      base44.entities.VibeRoomBan.list("created_date", 200),
      base44.entities.VibeRoomSeededMessage.filter({ is_active: true }, "display_order", 20),
    ]).then(([msgs, banList, seeded]) => {
      setMessages(msgs);
      setBans(banList);
      setSeeded(seeded);
      setLoading(false);
    });
  }, [ageConfirmed]);

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!ageConfirmed) return;
    const unsub = base44.entities.VibeRoomMessage.subscribe((event) => {
      if (event.type === "create" && !event.data?.is_hidden) {
        setMessages((prev) => [...prev, event.data]);
      } else if (event.type === "update") {
        setMessages((prev) =>
          event.data?.is_hidden
            ? prev.filter((m) => m.id !== event.id)
            : prev.map((m) => (m.id === event.id ? event.data : m))
        );
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
      }
    });
    return unsub;
  }, [ageConfirmed]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build combined feed: seeded shown only when real messages < 3
  const showSeeded = messages.length < 3;
  const combinedFeed = showSeeded
    ? [...seededMessages.map((s) => ({ ...s, _seeded: true })), ...messages]
    : messages;

  // ── Send message (premium only) ───────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!isPremium) { setShowUpgradePrompt(true); return; }
    if (!input.trim() || sending || isBanned || isMuted) return;
    if (!vibeName) { setNeedsVibeName(true); return; }

    const text = input.trim();
    setInput("");
    setSending(true);
    await base44.entities.VibeRoomMessage.create({
      user_email: user?.email || "guest@vibe.room",
      user_name: vibeName,
      user_avatar_url: vibeAvatar || null,
      content: text,
      is_hidden: false,
      is_listening: !!(currentTrack && isPlaying),
      now_playing_title: (currentTrack && isPlaying) ? currentTrack.title : null,
      reactions: { felt_that: [], needed_this: [], inspired: [], gratitude: [] },
    });
    base44.analytics.track({ eventName: "vibe_room_premium_message_posted" });
    setSending(false);
    inputRef.current?.focus();
  }, [isPremium, input, sending, isBanned, isMuted, vibeName, vibeAvatar, user, currentTrack, isPlaying]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleLockedInputClick = () => {
    base44.analytics.track({ eventName: "vibe_room_chat_locked_clicked" });
    setShowUpgradePrompt(true);
  };

  // ── Admin / moderation ────────────────────────────────────────────────────
  const handleHide = async (msg) => {
    await base44.entities.VibeRoomMessage.update(msg.id, { is_hidden: true });
  };
  const handleMute = async (email) => {
    const existing = bans.find((b) => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.update(existing.id, { action: "muted" });
      setBans((prev) => prev.map((b) => b.id === existing.id ? { ...b, action: "muted" } : b));
    } else {
      const nb = await base44.entities.VibeRoomBan.create({ user_email: email, action: "muted", applied_by: user.email });
      setBans((prev) => [...prev, nb]);
    }
  };
  const handleBan = async (email) => {
    const existing = bans.find((b) => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.update(existing.id, { action: "banned" });
      setBans((prev) => prev.map((b) => b.id === existing.id ? { ...b, action: "banned" } : b));
    } else {
      const nb = await base44.entities.VibeRoomBan.create({ user_email: email, action: "banned", applied_by: user.email });
      setBans((prev) => [...prev, nb]);
    }
  };
  const handleUnban = async (email) => {
    const existing = bans.find((b) => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.delete(existing.id);
      setBans((prev) => prev.filter((b) => b.id !== existing.id));
    }
  };

  // ── Layout offsets ────────────────────────────────────────────────────────
  const inputBottom = hasPlayer
    ? `calc(${BOTTOM_NAV_H + PLAYER_H + INPUT_EXTRA}px + env(safe-area-inset-bottom, 12px))`
    : `calc(${BOTTOM_NAV_H + INPUT_EXTRA}px + env(safe-area-inset-bottom, 12px))`;

  const scrollPaddingBottom = hasPlayer
    ? `calc(${BOTTOM_NAV_H + PLAYER_H + INPUT_BAR_H + INPUT_EXTRA + 20}px + env(safe-area-inset-bottom, 12px))`
    : `calc(${BOTTOM_NAV_H + INPUT_BAR_H + INPUT_EXTRA + 20}px + env(safe-area-inset-bottom, 12px))`;

  // ── Gates ─────────────────────────────────────────────────────────────────
  if (showGate) {
    return (
      <AgeGateModal
        open={true}
        user={user}
        onConfirm={() => { setAgeConfirmed(true); setShowGate(false); }}
      />
    );
  }

  if (ageConfirmed && isPremium && needsVibeName) {
    return (
      <VibeNameSetup
        onComplete={({ name, avatarUrl }) => {
          setVibeName(name);
          if (avatarUrl) setVibeAvatar(avatarUrl);
          setNeedsVibeName(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>

      {/* Animated theme-colored ambient background */}
      {/* Infinite loops pause when tab is hidden to save GPU/battery on iOS PWA */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ opacity: [0.04, 0.07, 0.04], scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] rounded-full blur-[150px]"
          style={{ background: rtAmbient1 }} />
        <motion.div
          animate={{ opacity: [0.02, 0.04, 0.02], scale: [1, 1.12, 1] }}
          transition={{ duration: 14, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-48 right-0 w-[280px] h-[280px] rounded-full blur-[110px]"
          style={{ background: rtAmbient2 }} />
      </div>

      {/* Header */}
      <section className="relative flex-shrink-0 z-10"
        style={{
          background: `linear-gradient(180deg,rgba(${rtPrimary},0.055) 0%,transparent 100%)`,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
        <div className="max-w-2xl mx-auto px-5 relative z-10"
          style={{ paddingTop: "max(4rem, calc(2.5rem + env(safe-area-inset-top, 0px)))", paddingBottom: "1rem" }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

            <div className="flex items-start justify-between gap-3 mb-2">
              {/* Left: badges + title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
                    style={{ background: `rgba(${rtPrimary},0.08)`, border: `1px solid rgba(${rtPrimary},0.22)` }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `rgb(${rtPrimary})` }} />
                    <span className="text-[9px] font-black tracking-[0.35em] uppercase"
                      style={{ fontFamily: "var(--font-heading)", color: `rgb(${rtPrimary})` }}>Live Chat</span>
                  </div>
                  {/* Premium badge */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}>
                    <Crown className="w-2.5 h-2.5 text-yellow-400/70" />
                    <span className="text-[9px] font-black tracking-[0.2em] uppercase text-yellow-400/70">
                      {isPremium ? "Premium" : "Premium 🔒"}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(155,126,255,0.05)", border: "1px solid rgba(155,126,255,0.12)" }}>
                    <ShieldCheck className="w-2.5 h-2.5 text-purple-400/60" />
                    <span className="text-[9px] font-black tracking-[0.2em] uppercase text-purple-300/50">18+ Community</span>
                  </div>
                </div>
                <h1 className="font-heading font-black text-foreground leading-none mb-0.5"
                  style={{ fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)" }}>
                  Vibe Room
                </h1>
                <p className="text-muted-foreground/60 text-xs tracking-wide">Listen together. Raise the frequency.</p>
              </div>

              {/* Right: avatar + name (premium only) */}
              {isPremium && vibeName && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <AvatarUpload
                    name={vibeName}
                    currentAvatarUrl={vibeAvatar}
                    onUploaded={(url) => setVibeAvatar(url)}
                  />
                  <span className="text-[9px] font-bold max-w-[64px] truncate text-center"
                    style={{ color: `rgba(${rtPrimary},0.7)`, transition: "color 0.25s ease" }}>
                    {vibeName}
                  </span>
                  {canChangeVibeName() && (
                    <button
                      onClick={() => setNeedsVibeName(true)}
                      className="text-[8px] text-white/20 transition-colors"
                      style={{ "--hover-color": `rgba(${rtPrimary},0.5)` }}
                      onMouseEnter={e => e.currentTarget.style.color = `rgba(${rtPrimary},0.5)`}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>
                      change name
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Now Playing */}
            <div className="mt-2">
              <NowPlayingCard />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Scrollable chat area */}
      <div
        className="flex-1 relative z-10 overflow-y-auto"
        style={{ paddingBottom: scrollPaddingBottom }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 flex flex-col gap-1">

          <DailyPromptCard isAdmin={isAdmin} />

          <div className="mt-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 rounded-full animate-spin" style={{ border: `2px solid rgba(${rtPrimary},0.2)`, borderTopColor: `rgb(${rtPrimary})` }} />
              </div>
            ) : combinedFeed.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: `rgba(${rtPrimary},0.07)`, border: `1px solid rgba(${rtPrimary},0.15)` }}>
                  <Zap className="w-7 h-7" style={{ color: `rgba(${rtPrimary},0.45)` }} />
                </div>
                <p className="font-heading font-black text-muted-foreground/60 text-base mb-1">The vibe is waiting.</p>
                <p className="text-muted-foreground/40 text-xs max-w-xs leading-relaxed">
                  Premium members can start the conversation.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {combinedFeed.map((msg, i) =>
                  msg._seeded ? (
                    <SeededMessageBubble key={`seeded-${msg.id}`} msg={msg} animDelay={i} user={user} onReactionLoginRequired={() => setShowUpgradePrompt(true)} />
                  ) : (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.user_email === user?.email}
                      isAdmin={isAdmin}
                      user={user}
                      banStatus={bans.find((b) => b.user_email === msg.user_email)}
                      onHide={handleHide}
                      onMute={handleMute}
                      onBan={handleBan}
                      onUnban={handleUnban}
                      animDelay={i}
                      onReactionLoginRequired={() => setShowUpgradePrompt(true)}
                    />
                  )
                )}
              </div>
            )}
          </div>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Fixed chat input — stacked above player + bottom nav */}
      <div
        className="fixed left-0 right-0 z-30 lg:left-[72px]"
        style={{ bottom: inputBottom }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-5">
          {isBanned ? (
            <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm text-red-400"
              style={{ background: "rgba(220,50,50,0.07)", border: "1px solid rgba(220,50,50,0.18)" }}>
              <Ban className="w-4 h-4" /> You have been banned from Vibe Room.
            </div>
          ) : isMuted ? (
            <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm text-yellow-400"
              style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.18)" }}>
              <Mic2 className="w-4 h-4" /> You have been muted by a moderator.
            </div>
          ) : isPremium ? (
            /* ── Premium input ── */
            <div
              className="flex items-center gap-2.5"
              style={{
                background: "rgba(6,6,18,0.97)",
                border: `1px solid rgba(${rtPrimary},0.25)`,
                borderRadius: "1.25rem",
                padding: "0.45rem 0.45rem 0.45rem 0.9rem",
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                boxShadow: `0 0 28px rgba(${rtPrimary},0.1), 0 12px 40px rgba(0,0,0,0.55)`,
              }}>
              {vibeName && (
                <div className="flex-shrink-0">
                  <VibeAvatar name={vibeName} avatarUrl={vibeAvatar} size={28} />
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={vibeName ? "Send a vibe..." : "Set a vibe name to chat..."}
                maxLength={500}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none min-w-0"
                onFocus={() => {
                  setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
                }}
              />
              <button
                onClick={vibeName ? handleSend : () => setNeedsVibeName(true)}
                disabled={vibeName ? (!input.trim() || sending) : false}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 active:scale-90"
                style={{
                  background: (vibeName && input.trim()) ? `linear-gradient(135deg,rgba(${rtPrimary},0.7),rgb(${rtPrimary}))` : `rgba(${rtPrimary},0.08)`,
                  boxShadow: (vibeName && input.trim()) ? `0 0 18px rgba(${rtPrimary},0.4)` : "none",
                  transition: "all 0.2s ease",
                }}>
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            /* ── Locked input for free users ── */
            <button
              onClick={handleLockedInputClick}
              className="w-full flex items-center gap-3 text-left"
              style={{
                background: "rgba(6,6,18,0.95)",
                border: "1px solid rgba(212,168,67,0.18)",
                borderRadius: "1.25rem",
                padding: "0.75rem 1rem",
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                boxShadow: "0 0 24px rgba(212,168,67,0.05), 0 12px 40px rgba(0,0,0,0.55)",
              }}>
              <Crown className="w-4 h-4 flex-shrink-0 text-yellow-500/50" />
              <span className="text-sm text-muted-foreground/60 flex-1">Premium members can post in the Vibe Room</span>
              <span className="text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "rgba(212,168,67,0.7)" }}>
                Upgrade
              </span>
            </button>
          )}
        </div>
      </div>

      <PremiumUpgradePrompt open={showUpgradePrompt} onClose={() => setShowUpgradePrompt(false)} />
    </div>
  );
}

const SEEDED_REACTIONS = [
  { key: "felt_that",   emoji: "⚡", label: "Felt That" },
  { key: "needed_this", emoji: "💎", label: "Needed This" },
  { key: "inspired",    emoji: "🔥", label: "Inspired" },
  { key: "gratitude",   emoji: "🙏", label: "Gratitude" },
];

// ── Seeded (community inspiration) message bubble ─────────────────────────
function SeededMessageBubble({ msg, animDelay, user, onReactionLoginRequired }) {
  const [localReactions, setLocalReactions] = useState(
    msg.reactions || { felt_that: [], needed_this: [], inspired: [], gratitude: [] }
  );
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];

  const handleReact = async (key) => {
    if (!user) {
      if (onReactionLoginRequired) onReactionLoginRequired();
      base44.analytics.track({ eventName: "vibe_room_free_reaction_clicked" });
      return;
    }
    base44.analytics.track({ eventName: "vibe_room_free_reaction_clicked" });
    const email = user.email;
    const updated = {};
    SEEDED_REACTIONS.forEach(({ key: k }) => {
      const arr = localReactions[k] || [];
      if (k === key) {
        updated[k] = arr.includes(email) ? arr.filter(e => e !== email) : [...arr, email];
      } else {
        updated[k] = arr.filter(e => e !== email);
      }
    });
    setLocalReactions(updated);
    // Seeded messages live in VibeRoomSeededMessage entity — update reactions there
    await base44.entities.VibeRoomSeededMessage.update(msg.id, { reactions: updated });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(animDelay * 0.008, 0.2), duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-2.5 flex-row">
      {/* Generic community avatar */}
      <div className="flex-shrink-0 self-end mb-1 w-[34px] h-[34px] rounded-full flex items-center justify-center text-xs font-black"
        style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.2),rgba(${rtPrimary},0.05))`, border: `1px solid rgba(${rtPrimary},0.25)`, color: `rgb(${rtPrimary})`, fontSize: "11px", transition: "all 0.25s ease" }}>
        {msg.user_name?.[0]?.toUpperCase() || "V"}
      </div>
      <div className="max-w-[75%] flex flex-col gap-1 items-start">
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] font-bold text-white/30">{msg.user_name}</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold text-white/20"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            Community
          </span>
        </div>
        <div className="px-4 py-2.5 text-sm leading-relaxed italic"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.55)",
            borderRadius: "18px 18px 18px 4px",
          }}>
          {msg.content}
        </div>
        {/* Reactions — same 4 buttons as real messages */}
        <div className="flex gap-1">
          {SEEDED_REACTIONS.map(({ key, emoji, label }) => {
            const arr = localReactions[key] || [];
            const hasReacted = user ? arr.includes(user.email) : false;
            const count = arr.length;
            return (
              <button
                key={key}
                onClick={() => handleReact(key)}
                title={label}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all active:scale-90 select-none"
                style={{
                  background: hasReacted ? `rgba(${rtPrimary},0.22)` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hasReacted ? `rgba(${rtPrimary},0.5)` : "rgba(255,255,255,0.07)"}`,
                  color: hasReacted ? `rgb(${rtPrimary})` : count > 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
                  transition: "all 0.2s ease",
                  boxShadow: hasReacted ? `0 0 8px rgba(${rtPrimary},0.25)` : "none",
                }}>
                <span style={{ fontSize: "11px" }}>{emoji}</span>
                {count > 0 && <span className="ml-0.5 tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}