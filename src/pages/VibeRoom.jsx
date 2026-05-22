import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, ShieldCheck, Zap, Ban, Mic2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import AgeGateModal, { hasConfirmedAge } from "../components/viberoom/AgeGateModal";
import VibeNameSetup, { getSavedVibeName, canChangeVibeName } from "../components/viberoom/VibeNameSetup";
import NowPlayingCard from "../components/viberoom/NowPlayingCard";
import DailyPromptCard from "../components/viberoom/DailyPromptCard";
import MessageBubble from "../components/viberoom/MessageBubble";

// How tall the bottom nav is on mobile (px)
const BOTTOM_NAV_H = 56;
// Approx mini player height on mobile
const PLAYER_H = 68;
// Extra breathing room above everything
const INPUT_EXTRA = 8;

export default function VibeRoom() {
  const { user } = useAuth();
  const { currentTrack } = usePlayer();
  const isAdmin = user?.role === "admin";

  // ── Age gate ──────────────────────────────────────────────────────────────
  const [ageConfirmed, setAgeConfirmed] = useState(() => hasConfirmedAge(user));
  const [showGate, setShowGate] = useState(!hasConfirmedAge(user));

  // ── Vibe name — resolved from profile, then localStorage, then ask ────────
  const [vibeName, setVibeName] = useState(() => getSavedVibeName(user));
  const [needsVibeName, setNeedsVibeName] = useState(false);

  // When user auth resolves (may be async), re-check
  useEffect(() => {
    if (!ageConfirmed) return;
    const saved = getSavedVibeName(user);
    if (saved) {
      setVibeName(saved);
      setNeedsVibeName(false);
    } else if (user) {
      // Logged in but no vibe name saved anywhere
      setNeedsVibeName(true);
    }
    // Guests without a name can still watch; we only ask when they try to send
  }, [user, ageConfirmed]);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [bans, setBans]         = useState([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const isBanned = bans.some((b) => b.user_email === user?.email && b.action === "banned");
  const isMuted  = bans.some((b) => b.user_email === user?.email && b.action === "muted");

  // ── Load messages + bans once age confirmed ───────────────────────────────
  useEffect(() => {
    if (!ageConfirmed) return;
    setLoading(true);
    Promise.all([
      base44.entities.VibeRoomMessage.filter({ is_hidden: false }, "created_date", 100),
      base44.entities.VibeRoomBan.list("created_date", 200),
    ]).then(([msgs, banList]) => {
      setMessages(msgs);
      setBans(banList);
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

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending || isBanned || isMuted) return;

    // Guest without a name — ask them to set one first
    if (!vibeName) { setNeedsVibeName(true); return; }

    const text = input.trim();
    setInput("");
    setSending(true);
    await base44.entities.VibeRoomMessage.create({
      user_email: user?.email || "guest@vibe.room",
      user_name: vibeName,
      content: text,
      is_hidden: false,
      reactions: { felt_that: [], needed_this: [], inspired: [], gratitude: [] },
    });
    setSending(false);
    inputRef.current?.focus();
  }, [input, sending, isBanned, isMuted, vibeName, user]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Admin actions ─────────────────────────────────────────────────────────
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

  // ── Layout: compute bottom offset for input bar ───────────────────────────
  // Mobile stacking from bottom up:
  //   [bottom nav: 56px] + [safe-area] + [player: 68px if active] + [gap: 8px]
  const hasPlayer = !!currentTrack;
  // CSS calc string for the input bar's bottom position on mobile
  const inputBottom = hasPlayer
    ? `calc(${BOTTOM_NAV_H + PLAYER_H + INPUT_EXTRA}px + env(safe-area-inset-bottom, 12px))`
    : `calc(${BOTTOM_NAV_H + INPUT_EXTRA}px + env(safe-area-inset-bottom, 12px))`;

  // Height of the fixed input zone — used as padding-bottom on the scroll area
  const INPUT_BAR_H = 64; // px, approximate
  const scrollPaddingBottom = hasPlayer
    ? `calc(${BOTTOM_NAV_H + PLAYER_H + INPUT_BAR_H + INPUT_EXTRA + 16}px + env(safe-area-inset-bottom, 12px))`
    : `calc(${BOTTOM_NAV_H + INPUT_BAR_H + INPUT_EXTRA + 16}px + env(safe-area-inset-bottom, 12px))`;

  // ── Age gate screen ───────────────────────────────────────────────────────
  if (showGate) {
    return (
      <AgeGateModal
        open={true}
        user={user}
        onConfirm={() => { setAgeConfirmed(true); setShowGate(false); }}
      />
    );
  }

  // ── Vibe name setup — only for users without a name yet ──────────────────
  if (ageConfirmed && needsVibeName) {
    return (
      <VibeNameSetup
        onComplete={(name) => { setVibeName(name); setNeedsVibeName(false); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: "#9B7EFF" }} />
        <div className="absolute bottom-40 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.025]"
          style={{ background: "#00C9E0" }} />
      </div>

      {/* ── Header ── */}
      <section className="relative flex-shrink-0 z-10"
        style={{
          background: "linear-gradient(180deg,rgba(155,126,255,0.06) 0%,transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
        <div className="max-w-2xl mx-auto px-5 relative z-10"
          style={{ paddingTop: "max(4rem, calc(2.5rem + env(safe-area-inset-top, 0px)))", paddingBottom: "1rem" }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
                style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#9B7EFF" }} />
                <span className="text-[9px] font-black tracking-[0.35em] uppercase text-purple-400"
                  style={{ fontFamily: "var(--font-heading)" }}>Live Chat</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.15)" }}>
                <ShieldCheck className="w-2.5 h-2.5 text-purple-400/70" />
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-purple-300/60">18+ Positive Community</span>
              </div>
            </div>

            <h1 className="font-heading font-black text-white leading-none mb-0.5"
              style={{ fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)" }}>
              Vibe Room
            </h1>
            <p className="text-white/30 text-xs tracking-wide">Listen together. Raise the frequency.</p>

            {/* Now Playing card — always shown but adapts to state */}
            <div className="mt-3">
              <NowPlayingCard />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Scrollable chat area ── */}
      <div
        className="flex-1 relative z-10 overflow-y-auto"
        style={{ paddingBottom: scrollPaddingBottom }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 flex flex-col gap-3">

          {/* Daily Prompt */}
          <DailyPromptCard isAdmin={isAdmin} />

          {/* Messages */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
                style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.15)" }}>
                <Zap className="w-7 h-7 text-purple-400/40" />
              </div>
              <p className="font-heading font-black text-white/50 text-base mb-1">Be the first to raise the frequency.</p>
              <p className="text-white/25 text-xs max-w-xs leading-relaxed">
                Drop a positive message for the next listener.
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
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
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Chat input — fixed, stacked above player + bottom nav ── */}
      <div
        className="fixed left-0 right-0 z-30 lg:left-[72px]"
        style={{ bottom: inputBottom }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-5">
          {isBanned ? (
            <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm text-red-400"
              style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)" }}>
              <Ban className="w-4 h-4" /> You have been banned from Vibe Room.
            </div>
          ) : isMuted ? (
            <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm text-yellow-400"
              style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <Mic2 className="w-4 h-4" /> You have been muted by a moderator.
            </div>
          ) : (
            <div
              className="flex items-center gap-2.5"
              style={{
                background: "rgba(8,8,22,0.96)",
                border: "1px solid rgba(155,126,255,0.25)",
                borderRadius: "1.25rem",
                padding: "0.5rem 0.5rem 0.5rem 1.1rem",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                boxShadow: "0 0 24px rgba(155,126,255,0.1), 0 8px 32px rgba(0,0,0,0.5)",
              }}>
              {/* Vibe name tag */}
              {vibeName && (
                <span
                  className="text-[9px] font-black tracking-wide flex-shrink-0 px-2 py-1 rounded-full"
                  style={{
                    background: "rgba(155,126,255,0.12)",
                    color: "#9B7EFF",
                    border: "1px solid rgba(155,126,255,0.2)",
                    whiteSpace: "nowrap",
                  }}>
                  {vibeName}
                </span>
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
                  // Scroll to bottom so input stays visible when keyboard opens
                  setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
                }}
              />
              <button
                onClick={vibeName ? handleSend : () => setNeedsVibeName(true)}
                disabled={vibeName ? (!input.trim() || sending) : false}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-35 active:scale-90"
                style={{
                  background: (vibeName && input.trim()) ? "linear-gradient(135deg,#7C3AED,#9B7EFF)" : "rgba(155,126,255,0.1)",
                  color: "#fff",
                  boxShadow: (vibeName && input.trim()) ? "0 0 16px rgba(155,126,255,0.35)" : "none",
                }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}