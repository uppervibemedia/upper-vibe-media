import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GraduationCap, Play, Maximize, ArrowLeft, Tv, Film, Volume2, Crown, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CoverImage from "@/components/shared/CoverImage";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = [
  { key: "manifest_mode_tv", label: "Manifest Mode TV", emoji: "📺", color: "#7C3AED" },
  { key: "mindset", label: "Mindset Lessons", emoji: "🧠", color: "#00D4F0" },
  { key: "frequency", label: "Frequency Learning", emoji: "🎵", color: "#00E676" },
  { key: "creator", label: "Creator Academy", emoji: "🎬", color: "#FF9800" },
  { key: "tutorials", label: "Vibe World Tutorials", emoji: "🌍", color: "#E040FB" },
  { key: "featured", label: "Featured Lessons", emoji: "⭐", color: "#FFD700" },
];

export default function AcademyPanel({ open, onClose, isMobile }) {
  const [lessons, setLessons] = useState([]);
  const [activeCategory, setActiveCategory] = useState("manifest_mode_tv");
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [viewingLesson, setViewingLesson] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [academyMuted, setAcademyMuted] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const iframeRef = useRef(null);
  const { user, isAuthenticated, navigateToLogin } = useAuth();

  // ── Plus membership check ────────────────────────────────────
  const isPlus = user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" || user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";

  // ── Handle Plus upgrade checkout ────────────────────────────
  const handleUpgrade = async () => {
    if (!isAuthenticated) { navigateToLogin(); return; }
    if (window.self !== window.top) { setUpgradeError("Checkout is only available from the published app."); return; }
    setUpgradeError("");
    setUpgradeLoading(true);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan: "plus",
        billingCycle: "monthly",
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/vibe-world`,
      });
      if (res.data?.url) window.location.href = res.data.url;
      else setUpgradeError("Something went wrong. Please try again.");
    } catch (e) { setUpgradeError(e?.response?.data?.error || "Something went wrong. Please try again."); }
    setUpgradeLoading(false);
  };

  // ── Load academy lessons ──────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    base44.entities.AcademyLesson.filter({ status: "published" }, "-display_order", 30)
      .then(setLessons)
      .catch(() => {});
  }, [open]);

  // ── Pause global music when video plays with audio ───────────
  useEffect(() => {
    if (!viewingLesson) return;
    // Try to pause global music player
    try {
      const audioEl = document.querySelector("audio");
      if (audioEl) {
        audioEl.pause();
      }
    } catch {}
  }, [viewingLesson]);

  // ── Keyboard: Escape closes ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (viewingLesson) {
          setViewingLesson(null);
          setFullScreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, viewingLesson, onClose]);

  // ── Filter lessons by active category ────────────────────────
  const filteredLessons = activeCategory === "manifest_mode_tv"
    ? lessons // Show all in Manifest Mode TV
    : lessons.filter((l) => {
        const labels = l.labels || [];
        return labels.some((lb) => lb.toLowerCase().includes(activeCategory.toLowerCase()));
      }).slice(0, activeCategory === "featured" ? lessons.filter(l => l.is_featured).length : undefined);

  // ── Build embed URL matching StageFullScreen exactly ──
  const getEmbedUrl = useCallback((lesson) => {
    const ytId = lesson?.youtube_video_id;
    if (!ytId) return null;
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`;
  }, []);

  // ── Handle close ─────────────────────────────────────────────
  const handleClose = () => {
    setViewingLesson(null);
    setFullScreen(false);
    onClose();
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
        zIndex: 72,
        height: isMobile ? "90dvh" : "80vh",
        background: "rgba(10,8,20,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(124,58,237,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
    >
      {fullScreen && viewingLesson ? (
        /* ── Full-screen theater view ─────────────────────── */
        <div className="flex-1 flex flex-col bg-black relative">
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)" }}>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { setFullScreen(false); setAcademyMuted(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] text-white/70"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
            <p className="text-xs font-bold text-white truncate mx-2">{viewingLesson.title}</p>
            <div className="w-16" />
          </div>
          <iframe
            src={getEmbedUrl(viewingLesson) || ""}
            className="flex-1 w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ border: "none" }}
          />
        </div>
      ) : viewingLesson ? (
        /* ── Theater-style viewing mode ───────────────────── */
        <div className="flex-1 flex flex-col">
          {/* Back bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { setViewingLesson(null); setAcademyMuted(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] text-white/60"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Academy
            </button>
            <p className="text-xs font-bold text-white/50 truncate mx-2">{viewingLesson.title}</p>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setFullScreen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px]"
              style={{ background: "rgba(0,212,240,0.15)", border: "1px solid rgba(0,212,240,0.25)", color: "#00D4F0" }}
            >
              <Maximize className="w-3 h-3" />
              Full Screen
            </button>
          </div>

          {/* Theater screen area */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative"
            style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.1) 0%, transparent 70%)" }}>
            {/* Theater-style frame */}
            <div className="w-full max-w-3xl relative rounded-2xl overflow-hidden"
              style={{
                border: "2px solid rgba(124,58,237,0.3)",
                boxShadow: "0 0 60px rgba(124,58,237,0.15), 0 0 120px rgba(0,212,240,0.08)",
              }}>
              {/* Curtain top */}
              <div className="absolute top-0 left-0 right-0 h-[30px] z-10 pointer-events-none"
                style={{ background: "linear-gradient(180deg, rgba(10,8,20,0.95) 0%, transparent 100%)" }} />
              <div className="aspect-video w-full bg-black">
                <iframe
                  ref={iframeRef}
                  src={getEmbedUrl(viewingLesson)}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{ border: "none" }}
                />
              </div>
            </div>

            {/* Mute/Unmute toggle */}
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => {
                setAcademyMuted(m => {
                  const next = !m;
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
                      "*"
                    );
                  }
                  return next;
                });
              }}
              className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs tracking-wide transition-all hover:brightness-110 active:scale-95"
              style={{
                background: academyMuted ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: academyMuted ? "rgba(255,255,255,0.6)" : "#fff",
                minWidth: 44,
                minHeight: 44,
                touchAction: "manipulation",
              }}
            >
              {academyMuted ? <Volume2 className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {academyMuted ? "Unmute Audio" : "Audio On"}
            </button>

            {/* Glowing seat indicators — theater vibe */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 opacity-30">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i}
                  className="w-2 h-1.5 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${i % 2 === 0 ? "#7C3AED" : "#00D4F0"}, transparent)`,
                    boxShadow: `0 0 8px ${i % 2 === 0 ? "rgba(124,58,237,0.4)" : "rgba(0,212,240,0.4)"}`,
                    transform: `scale(${1 - i * 0.12})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Academy browsing mode ───────────────────────── */
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" />
              <h3 className="font-heading font-black text-lg text-white">Vibe Academy</h3>
            </div>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex-shrink-0 px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar border-b border-white/5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all active:scale-95"
                style={{
                  background: activeCategory === cat.key
                    ? `${cat.color}15`
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${activeCategory === cat.key
                    ? `${cat.color}30`
                    : "rgba(255,255,255,0.08)"}`,
                  color: activeCategory === cat.key ? cat.color : "rgba(255,255,255,0.4)",
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Plus Membership Card */}
          {!isPlus ? (
            <div className="flex-shrink-0 px-4 py-3 mx-4 mt-2 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(200,137,42,0.12), rgba(237,184,74,0.06))",
                border: "1px solid rgba(212,168,67,0.25)",
              }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}>
                    <Crown className="w-3.5 h-3.5" style={{ color: "#EDB84A" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-wide" style={{ color: "#EDB84A" }}>
                      Upgrade to Plus — $4.99/month
                    </p>
                    <p className="text-[9px] text-white/30 line-clamp-1">
                      Unlock premium content, full songs, videos, downloads, and member features.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={handleUpgrade}
                    disabled={upgradeLoading}
                    className="px-3 py-1.5 rounded-full font-black text-[10px] tracking-wide transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg,#C8892A,#EDB84A)",
                      color: "#000",
                      minHeight: "32px",
                      touchAction: "manipulation",
                    }}
                  >
                    {upgradeLoading ? "Loading..." : "Join Plus"}
                  </button>
                </div>
              </div>
              {upgradeError && (
                <p className="text-[9px] text-red-400 mt-1.5 ml-0">{upgradeError}</p>
              )}
            </div>
          ) : (
            <div className="flex-shrink-0 px-4 py-1.5 mx-4 mt-2 rounded-full flex items-center gap-1.5 justify-center"
              style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)" }}>
              <Sparkles className="w-3 h-3" style={{ color: "#EDB84A" }} />
              <span className="text-[9px] font-black tracking-wider" style={{ color: "rgba(237,184,74,0.7)" }}>
                Your Plus Access Is Active
              </span>
            </div>
          )}

          {/* Video grid */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {filteredLessons.length === 0 ? (
              <p className="text-center text-xs text-white/20 mt-12">
                No lessons available yet. Check back soon.
              </p>
            ) : (
              <div className="grid gap-3" style={{
                gridTemplateColumns: isMobile
                  ? "repeat(auto-fill, minmax(140px, 1fr))"
                  : "repeat(auto-fill, minmax(200px, 1fr))",
              }}>
                {filteredLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="rounded-xl overflow-hidden transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer group"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    onClick={() => setViewingLesson(lesson)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video relative overflow-hidden bg-black/40">
                      <CoverImage
                        src={lesson.thumbnail_url}
                        alt={lesson.title}
                        className="w-full h-full"
                        iconClassName="w-6 h-6"
                      />
                      {/* Play overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.4)" }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(124,58,237,0.8)", color: "#fff" }}>
                          <Play className="w-4 h-4 ml-0.5" />
                        </div>
                      </div>
                      {/* Category badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider"
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          color: CATEGORIES.find(c => c.key === activeCategory)?.color || "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}>
                        {CATEGORIES.find(c => c.key === activeCategory)?.emoji} {CATEGORIES.find(c => c.key === activeCategory)?.label}
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-2.5">
                      <p className="text-[11px] font-bold text-white leading-snug line-clamp-2">
                        {lesson.title}
                      </p>
                      {lesson.description && (
                        <p className="text-[9px] text-white/30 mt-1 line-clamp-1">
                          {lesson.description.substring(0, 60)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Close button always visible in browsing mode */}
      {!(viewingLesson || fullScreen) && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 flex items-center justify-center">
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
              minHeight: 44,
              touchAction: "manipulation",
            }}
          >
            Close Academy
          </button>
        </div>
      )}
    </motion.div>
  );
}