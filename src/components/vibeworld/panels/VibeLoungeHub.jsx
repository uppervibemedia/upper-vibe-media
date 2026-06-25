/**
 * VibeLoungeHub — Vibe Lounge panel.
 * Tabs: Sit & Chill, Nearby, Lounge Chat, Manifest.
 * Lounge Chat uses LoungeMessage entity via useLoungeChat hook.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Sparkles, Users, Coffee, RefreshCw, Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import CoverImage from "@/components/shared/CoverImage";
import { base44 } from "@/api/base44Client";

const VIBE_STATUSES = [
  { key: "chilling",        label: "Chilling",        emoji: "🌊", color: "#00D4F0" },
  { key: "manifesting",     label: "Manifesting",     emoji: "✨", color: "#C43BFF" },
  { key: "networking",      label: "Networking",      emoji: "🤝", color: "#A078FF" },
  { key: "listening",       label: "Listening",       emoji: "🎵", color: "#9B4FFF" },
  { key: "open_to_connect", label: "Open to Connect", emoji: "💜", color: "#E040FB" },
  { key: "do_not_disturb",  label: "Do Not Disturb",  emoji: "🔕", color: "rgba(255,255,255,0.3)" },
];

const QUICK_MESSAGES = [
  "I'm just chilling 🌊",
  "432Hz vibes 🔮",
  "What are you manifesting? ✨",
  "Sending good energy 💜",
  "Meet me at the stage 🎤",
  "Open to connect 🤝",
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

const LOUNGE_SEATS = [
  { id: 0, label: "Seat A", x: -23.8, z: -27.5 },
  { id: 1, label: "Seat B", x: -22.0, z: -28.8 },
  { id: 2, label: "Seat C", x: -20.2, z: -27.5 },
  { id: 3, label: "Seat D", x: -19.5, z: -25.5 },
  { id: 4, label: "Seat E", x: -24.5, z: -25.5 },
];

const TABS = [
  { id: "sit",      label: "Sit & Chill", icon: Coffee },
  { id: "nearby",   label: "Nearby",      icon: Users },
  { id: "chat",     label: "Lounge Chat", icon: MessageCircle },
  { id: "manifest", label: "Manifest",    icon: Sparkles },
];

function StatusBadge({ statusKey }) {
  const s = VIBE_STATUSES.find((v) => v.key === statusKey);
  if (!s) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full font-black"
      style={{ background: `${s.color}18`, border: `1px solid ${s.color}44`, color: s.color, padding: "1px 6px", fontSize: "8px", letterSpacing: "0.06em" }}>
      {s.emoji} {s.label}
    </span>
  );
}

export default function VibeLoungeHub({
  open,
  onClose,
  isMobile,
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
  // iOS keyboard-safe: track keyboard height via visualViewport
  const [panelBottom, setPanelBottom] = useState(0);
  useEffect(() => {
    if (!isMobile || !open) { setPanelBottom(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kh = window.innerHeight - vv.height - vv.offsetTop;
      setPanelBottom(Math.max(0, kh));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [isMobile, open]);
  const { currentTrack, isPlaying, togglePlay } = usePlayer() || {};
  const { user } = useAuth();
  const displayName = user?.world_username || "New User";
  const [activeTab, setActiveTab] = useState("sit");
  const [vibeStatus, setVibeStatus] = useState(() => {
    try { return sessionStorage.getItem("uvc_lounge_status") || null; } catch { return null; }
  });
  const [isSeated, setIsSeated] = useState(isSeatedExternal);
  const [chosenSeat, setChosenSeat] = useState(null);
  const [manifestIdx, setManifestIdx] = useState(() => Math.floor(Math.random() * MANIFEST_PROMPTS.length));

  useEffect(() => { setIsSeated(isSeatedExternal); if (!isSeatedExternal) setChosenSeat(null); }, [isSeatedExternal]);

  const loungeUsers = (activeUsers || []).filter((u) => u.user_id !== currentUserId && u.current_zone === "lounge");

  const handleSetStatus = useCallback(async (key) => {
    setVibeStatus(key);
    try { sessionStorage.setItem("uvc_lounge_status", key); } catch {}
    if (user?.id) { try { await base44.auth.updateMe({ lounge_status: key }); } catch {} }
  }, [user?.id]);

  const handleSit = useCallback((seat) => {
    setIsSeated(true); setChosenSeat(seat); handleSetStatus("chilling"); onSeatChange?.(true, seat);
  }, [handleSetStatus, onSeatChange]);

  const handleStandUp = useCallback(() => {
    setIsSeated(false); setChosenSeat(null); onSeatChange?.(false, null);
  }, [onSeatChange]);

  const handleSharePrompt = useCallback(() => {
    setActiveTab("manifest");
  }, []);

  if (!open) return null;

  const isBlocked = (uid) => !!(blockedUsers[uid]);

  const renderTabContent = () => {
    // SIT & CHILL
    if (activeTab === "sit") return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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

    // NEARBY
    if (activeTab === "nearby") return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-[10px] font-black text-white/30 tracking-wider uppercase">{loungeUsers.length} in Vibe Lounge</p>
        {loungeUsers.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">🌊</div>
            <p className="text-xs text-white/25">No one else in the lounge right now.</p>
          </div>
        ) : loungeUsers.map((u) => {
          if (isBlocked(u.user_id)) return null;
          return (
            <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.3),rgba(0,200,220,0.2))", color: "#c4aaff" }}>
                {(u.username || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate">{u.username || "User"}</p>
              </div>
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { try { navigator?.vibrate?.(10); } catch {}; onSelectUser?.(u); }}
                className="px-3 py-1.5 rounded-full font-black text-[9px] tracking-wider transition-all active:scale-95"
                style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)", color: "#c4aaff", minHeight: 32, touchAction: "manipulation" }}>
                View
              </button>
            </div>
          );
        })}
      </div>
    );

    // LOUNGE CHAT — temporarily disabled
    if (activeTab === "chat") return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <div className="text-3xl">🔧</div>
        <p className="text-sm font-black text-white/60">Lounge Chat</p>
        <p className="text-xs text-white/25 max-w-xs">
          Group chat is coming soon. Use direct messages to connect with nearby users.
        </p>
      </div>
    );

    // MANIFEST
    if (activeTab === "manifest") return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col items-center text-center space-y-5">
        <div className="text-4xl">🔮</div>
        <p className="text-[10px] font-black text-white/30 tracking-wider uppercase">Manifest Prompt</p>
        <div className="w-full rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg,rgba(196,59,255,0.08),rgba(155,126,255,0.06))", border: "1px solid rgba(155,126,255,0.2)" }}>
          <p className="text-base font-black text-white/90 leading-snug">"{MANIFEST_PROMPTS[manifestIdx]}"</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button onClick={() => setManifestIdx((i) => (i + 1) % MANIFEST_PROMPTS.length)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", minHeight: 44, touchAction: "manipulation" }}>
            <RefreshCw className="w-3.5 h-3.5" /> New Prompt
          </button>

        </div>
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
      className="fixed inset-x-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 70,
        bottom: panelBottom,
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
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(155,126,255,0.18)", border: "1px solid rgba(155,126,255,0.3)" }}>
            <span className="text-sm">🛋️</span>
          </div>
          <div>
            <h3 className="font-heading font-black text-base text-white leading-none">Vibe Lounge</h3>
            {vibeStatus && <div className="mt-0.5"><StatusBadge statusKey={vibeStatus} /></div>}
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

      {/* Tab bar */}
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
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>

      {/* Seated bar */}
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