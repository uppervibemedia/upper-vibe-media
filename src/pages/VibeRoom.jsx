import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Zap, Ban, Mic2, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import AgeGateModal, { hasConfirmedAge } from "@/components/viberoom/AgeGateModal";
import VibeNameSetup, { getSavedVibeName, getSavedVibeAvatar, canChangeVibeName } from "@/components/viberoom/VibeNameSetup";
import AvatarUpload from "@/components/viberoom/AvatarUpload";
import PremiumUpgradePrompt from "@/components/viberoom/PremiumUpgradePrompt";
import VibeFeedCard from "@/components/viberoom/VibeFeedCard";
import VibeComposer from "@/components/viberoom/VibeComposer";
import NowVibingBanner from "@/components/viberoom/NowVibingBanner";

// Layout constants — kept in sync with AppLayout / AudioPlayer
const BOTTOM_NAV_H = 56;
const PLAYER_H = 68;
const COMPOSER_H = 160; // approx composer height including padding
const EXTRA = 10;

function isPremiumUser(user) {
  return user?.role === "admin" || user?.role === "premium" || user?.tier === "premium" || user?.subscription_status === "active";
}

export default function VibeRoom() {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const isAdmin = user?.role === "admin";
  const isPremium = isPremiumUser(user);

  // ── Age gate ──────────────────────────────────────────────────────────────
  const [ageConfirmed, setAgeConfirmed] = useState(() => hasConfirmedAge(user));
  const [showGate, setShowGate] = useState(!hasConfirmedAge(user));

  // ── Identity ──────────────────────────────────────────────────────────────
  const [vibeName, setVibeName]     = useState(() => getSavedVibeName(user));
  const [vibeAvatar, setVibeAvatar] = useState(() => getSavedVibeAvatar(user));
  const [needsVibeName, setNeedsVibeName] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // ── Feed state ────────────────────────────────────────────────────────────
  const [posts, setPosts]   = useState([]);
  const [bans, setBans]     = useState([]);
  const [loading, setLoading] = useState(false);
  const feedTopRef = useRef(null);

  const isBanned = bans.some(b => b.user_email === user?.email && b.action === "banned");
  const isMuted  = bans.some(b => b.user_email === user?.email && b.action === "muted");
  const hasPlayer = !!currentTrack;

  // ── Analytics on load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ageConfirmed) return;
    base44.analytics.track({ eventName: "vibe_room_opened" });
  }, [ageConfirmed]);

  // ── Sync identity ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ageConfirmed) return;
    const savedName   = getSavedVibeName(user);
    const savedAvatar = getSavedVibeAvatar(user);
    if (savedName) { setVibeName(savedName); setNeedsVibeName(false); }
    else if (user && isPremium) { setNeedsVibeName(true); }
    if (savedAvatar) setVibeAvatar(savedAvatar);
  }, [user, ageConfirmed, isPremium]);

  // ── Load feed ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ageConfirmed) return;
    setLoading(true);
    Promise.all([
      base44.entities.VibeRoomMessage.filter({ is_hidden: false }, "-created_date", 60),
      base44.entities.VibeRoomBan.list("created_date", 200),
    ]).then(([feedPosts, banList]) => {
      // Sort: pinned first, then chronological desc
      const sorted = [...feedPosts].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
      setPosts(sorted);
      setBans(banList);
      setLoading(false);
    });
  }, [ageConfirmed]);

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!ageConfirmed) return;
    const unsub = base44.entities.VibeRoomMessage.subscribe((event) => {
      if (event.type === "create" && !event.data?.is_hidden) {
        setPosts(prev => {
          const next = [event.data, ...prev];
          return next.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.created_date) - new Date(a.created_date);
          });
        });
      } else if (event.type === "update") {
        setPosts(prev => {
          let next = event.data?.is_hidden
            ? prev.filter(p => p.id !== event.id)
            : prev.map(p => p.id === event.id ? event.data : p);
          return next.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.created_date) - new Date(a.created_date);
          });
        });
      } else if (event.type === "delete") {
        setPosts(prev => prev.filter(p => p.id !== event.id));
      }
    });
    return unsub;
  }, [ageConfirmed]);

  // ── Moderation handlers ───────────────────────────────────────────────────
  const handleHide = async (post) => {
    await base44.entities.VibeRoomMessage.update(post.id, { is_hidden: true });
  };
  const handlePin = async (post) => {
    // Unpin all others first
    const pinned = posts.filter(p => p.is_pinned && p.id !== post.id);
    await Promise.all(pinned.map(p => base44.entities.VibeRoomMessage.update(p.id, { is_pinned: false })));
    await base44.entities.VibeRoomMessage.update(post.id, { is_pinned: !post.is_pinned });
  };
  const handleMute = async (email) => {
    const existing = bans.find(b => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.update(existing.id, { action: "muted" });
      setBans(prev => prev.map(b => b.id === existing.id ? { ...b, action: "muted" } : b));
    } else {
      const nb = await base44.entities.VibeRoomBan.create({ user_email: email, action: "muted", applied_by: user.email });
      setBans(prev => [...prev, nb]);
    }
  };
  const handleBan = async (email) => {
    const existing = bans.find(b => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.update(existing.id, { action: "banned" });
      setBans(prev => prev.map(b => b.id === existing.id ? { ...b, action: "banned" } : b));
    } else {
      const nb = await base44.entities.VibeRoomBan.create({ user_email: email, action: "banned", applied_by: user.email });
      setBans(prev => [...prev, nb]);
    }
  };
  const handleUnban = async (email) => {
    const existing = bans.find(b => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.delete(existing.id);
      setBans(prev => prev.filter(b => b.id !== existing.id));
    }
  };

  // ── Play a shared track from feed ─────────────────────────────────────────
  const handlePlayTrack = useCallback(async (post) => {
    if (!post.track_id) return;
    // Fetch the full track record to get the audio_url
    const results = await base44.entities.Track.filter({ id: post.track_id }, "created_date", 1).catch(() => []);
    const track = results[0] || {
      id: post.track_id,
      title: post.track_title,
      artist_display: post.track_artist,
      cover_url: post.track_cover_url,
      frequency_type: post.track_frequency_type,
    };
    playTrack(track, "song");
  }, [playTrack]);

  // ── Layout offsets ────────────────────────────────────────────────────────
  const composerBottom = hasPlayer
    ? `calc(${BOTTOM_NAV_H + PLAYER_H + EXTRA}px + env(safe-area-inset-bottom, 12px))`
    : `calc(${BOTTOM_NAV_H + EXTRA}px + env(safe-area-inset-bottom, 12px))`;

  const feedPaddingBottom = hasPlayer
    ? `calc(${BOTTOM_NAV_H + PLAYER_H + COMPOSER_H + EXTRA + 24}px + env(safe-area-inset-bottom, 12px))`
    : `calc(${BOTTOM_NAV_H + COMPOSER_H + EXTRA + 24}px + env(safe-area-inset-bottom, 12px))`;

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
          base44.analytics.track({ eventName: "username_created" });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] rounded-full blur-[140px] opacity-[0.03]"
          style={{ background: "#9B7EFF" }} />
        <div className="absolute bottom-1/3 right-0 w-[260px] h-[260px] rounded-full blur-[100px] opacity-[0.015]"
          style={{ background: "#00C9E0" }} />
      </div>

      {/* ── Page Header ── */}
      <section className="relative flex-shrink-0 z-10"
        style={{
          background: "linear-gradient(180deg,rgba(155,126,255,0.055) 0%,transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
        <div className="max-w-2xl mx-auto px-5 relative z-10"
          style={{ paddingTop: "max(4rem, calc(2.5rem + env(safe-area-inset-top, 0px)))", paddingBottom: "1.25rem" }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

            <div className="flex items-start justify-between gap-3 mb-3">
              {/* Left: badges + title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#9B7EFF" }} />
                    <span className="text-[9px] font-black tracking-[0.3em] uppercase text-purple-400">Social Feed</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(155,126,255,0.05)", border: "1px solid rgba(155,126,255,0.12)" }}>
                    <ShieldCheck className="w-2.5 h-2.5 text-purple-400/60" />
                    <span className="text-[9px] font-black tracking-[0.2em] uppercase text-purple-300/50">18+ Positive Community</span>
                  </div>
                </div>
                <h1 className="font-heading font-black text-foreground leading-none mb-0.5"
                  style={{ fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)" }}>
                  Vibe Room
                </h1>
                <p className="text-muted-foreground/60 text-xs tracking-wide">
                  See what the community is listening to
                </p>
              </div>

              {/* Right: avatar + name */}
              {vibeName && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <AvatarUpload
                    name={vibeName}
                    currentAvatarUrl={vibeAvatar}
                    onUploaded={(url) => { setVibeAvatar(url); base44.analytics.track({ eventName: "profile_photo_added" }); }}
                  />
                  <span className="text-[9px] font-bold text-purple-400/60 max-w-[64px] truncate text-center">
                    {vibeName}
                  </span>
                  {canChangeVibeName() && (
                    <button onClick={() => setNeedsVibeName(true)}
                      className="text-[8px] text-muted-foreground/30 hover:text-purple-400/50 transition-colors">
                      change name
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Now vibing banner */}
            <NowVibingBanner />
          </motion.div>
        </div>
      </section>

      {/* ── Scrollable Feed ── */}
      <div className="flex-1 relative z-10 overflow-y-auto" style={{ paddingBottom: feedPaddingBottom }}>
        <div ref={feedTopRef} />
        <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-5 flex flex-col gap-3">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.15)" }}>
                <Zap className="w-7 h-7 text-purple-400/35" />
              </div>
              <p className="font-heading font-black text-muted-foreground/60 text-base mb-1">The feed is quiet.</p>
              <p className="text-muted-foreground/40 text-xs max-w-xs leading-relaxed">
                {isPremium ? "Share a track or post a listener thought to start the vibe." : "Premium members can post to the Vibe Room feed."}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {posts.map((post, i) => (
                <VibeFeedCard
                  key={post.id}
                  post={post}
                  isOwn={post.user_email === user?.email}
                  isAdmin={isAdmin}
                  user={user}
                  banStatus={bans.find(b => b.user_email === post.user_email)}
                  onHide={handleHide}
                  onPin={handlePin}
                  onMute={handleMute}
                  onBan={handleBan}
                  onUnban={handleUnban}
                  animDelay={i}
                  onPlayTrack={handlePlayTrack}
                  onLoginRequired={() => setShowUpgradePrompt(true)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Fixed Composer / Status Bar ── */}
      <div
        className="fixed left-0 right-0 z-30 lg:left-[72px]"
        style={{ bottom: composerBottom }}>
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
            <VibeComposer
              user={user}
              vibeName={vibeName}
              vibeAvatar={vibeAvatar}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              isBanned={isBanned}
              isMuted={isMuted}
              onNeedsVibeName={() => setNeedsVibeName(true)}
              onUpgradeRequired={() => setShowUpgradePrompt(true)}
              onPosted={() => feedTopRef.current?.scrollIntoView({ behavior: "smooth" })}
            />
          ) : (
            /* ── Free users: read-only prompt ── */
            <button
              onClick={() => { base44.analytics.track({ eventName: "vibe_room_upgrade_clicked" }); setShowUpgradePrompt(true); }}
              className="w-full flex items-center gap-3 text-left"
              style={{
                background: "rgba(6,6,18,0.95)",
                border: "1px solid rgba(212,168,67,0.18)",
                borderRadius: "1.25rem",
                padding: "0.85rem 1rem",
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                boxShadow: "0 0 24px rgba(212,168,67,0.05), 0 12px 40px rgba(0,0,0,0.55)",
              }}>
              <Crown className="w-4 h-4 flex-shrink-0 text-yellow-500/50" />
              <span className="text-sm text-muted-foreground/60 flex-1">Premium members can post to the Vibe Room</span>
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