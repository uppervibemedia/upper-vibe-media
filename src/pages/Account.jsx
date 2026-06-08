import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Settings, LogOut, User, Check, Lock, Music4, ChevronRight, Download, CreditCard, Trash2, AlertTriangle, HelpCircle, Palette, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES, getPulseEnabled, setPulseEnabled } from "../components/radio/RadioThemePicker";

function ThemePicker() {
  const { accentId, setAccent } = useTheme();
  const [pulseOn, setPulseOn] = useState(getPulseEnabled);

  const handleTogglePulse = (v) => {
    setPulseOn(v);
    setPulseEnabled(v);
  };

  return (
    <div>
      <div className="flex gap-3 flex-wrap mb-5">
        {Object.values(RADIO_THEMES).map((t) => (
          <button
            key={t.id}
            onClick={() => setAccent(t.id)}
            title={t.label}
            className="flex flex-col items-center gap-1.5 transition-all"
            style={{ opacity: accentId === t.id ? 1 : 0.5 }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{
                background: t.swatch,
                boxShadow: accentId === t.id ? `0 0 16px ${t.swatch}aa` : "none",
                border: accentId === t.id ? `2px solid ${t.swatch}` : "2px solid transparent",
                outline: accentId === t.id ? `2px solid rgba(255,255,255,0.25)` : "none",
              }} />
            <span className="text-[9px] font-black tracking-wider uppercase text-white/50">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Pulse Effect Toggle */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <div>
          <p className="text-sm font-bold text-white">Pulse Effect</p>
          <p className="text-xs text-white/35">Glowing border animation on Radio page</p>
        </div>
        <button
          onClick={() => handleTogglePulse(!pulseOn)}
          style={{
            width: 44, height: 24, borderRadius: 12, flexShrink: 0,
            background: pulseOn ? "rgba(0,200,220,0.55)" : "rgba(255,255,255,0.12)",
            position: "relative", transition: "background 0.2s ease",
            border: "none", cursor: "pointer",
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: pulseOn ? 22 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s ease",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }} />
        </button>
      </div>
    </div>
  );
}

export default function Account() {
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtAmbient1 = radioTheme.vars["--rt-ambient1"];

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28 lg:pb-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `rgba(${rtPrimary},0.08)`, border: `1px solid rgba(${rtPrimary},0.2)` }}>
            <User className="w-8 h-8" style={{ color: `rgba(${rtPrimary},0.7)` }} />
          </div>
          <h1 className="font-heading font-black text-2xl text-white mb-3">Sign In to Your Account</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Create a free account to save songs, access your library, and unlock Upper Vibe Plus features.
          </p>
          <button onClick={navigateToLogin}
            className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.8),rgb(${rtPrimary}))`, color: "#000" }}>
            Sign In / Create Account
          </button>
        </motion.div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  // Use all known Plus indicators — mirrors AuthContext.isPlus
  const isPlus = isAdmin ||
    user?.isPlus === true ||
    user?.isPremium === true ||
    user?.tier === "plus" ||
    user?.tier === "premium" ||
    user?.plan === "plus" ||
    user?.plan === "premium" ||
    user?.subscriptionStatus === "active" ||
    user?.subscription_status === "active";
  const isPaid = !isAdmin && isPlus;

  // Cancelled but still within paid period
  const isCancelledWithAccess = !isAdmin && isPlus &&
    (user?.subscriptionStatus === "canceled" || user?.subscriptionStatus === "cancelled" ||
     user?.subscription_status === "canceled" || user?.subscription_status === "cancelled");

  // Format period end date if available
  const periodEnd = user?.currentPeriodEnd || user?.current_period_end;
  const periodEndFormatted = periodEnd
    ? new Date(typeof periodEnd === "number" ? periodEnd * 1000 : periodEnd)
        .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const tierLabel = isAdmin ? "Admin" : isPlus ? "Upper Vibe Plus" : "Free Listener";
  const tierBadge = isAdmin ? "👑 Admin" : isPlus ? "⭐ Plus" : "Free";
  // All tier colors now use active theme primary
  const tierColor = `rgb(${rtPrimary})`;

  const handlePortal = async () => {
    if (window.self !== window.top) {
      alert("The billing portal is only available from the published app.");
      return;
    }
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke("stripePortal", {
        returnUrl: `${window.location.origin}/account`,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch {
      alert("Could not open billing portal. Please try again.");
    }
    setPortalLoading(false);
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-8 pt-20 lg:pt-8 relative">
      {/* Animated theme ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.06, 0.04], scale: [0.9, 1.05, 1] }}
          transition={{ duration: 2.5, ease: "easeOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[160px]"
          style={{ background: rtAmbient1 }} />
        <motion.div
          animate={{ opacity: [0.02, 0.045, 0.02], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-1/4 right-0 w-[300px] h-[300px] rounded-full blur-[120px]"
          style={{ background: `rgb(${rtPrimary})` }} />
      </div>
      <div className="max-w-lg mx-auto px-6 relative z-10">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs mb-5 transition-colors"
          style={{ color: `rgba(${rtPrimary},0.6)` }}
          onMouseEnter={e => e.currentTarget.style.color = `rgb(${rtPrimary})`}
          onMouseLeave={e => e.currentTarget.style.color = `rgba(${rtPrimary},0.6)`}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-4">

          {/* Profile card */}
          <div className="rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-4">
              {/* Initials avatar */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-heading font-black text-xl flex-shrink-0"
                style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.15),rgba(${rtPrimary},0.05))`, border: `1px solid rgba(${rtPrimary},0.25)`, color: `rgb(${rtPrimary})` }}>
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="font-heading font-black text-white text-base leading-snug break-words"
                  style={{ wordBreak: "break-word" }}>
                  {user.full_name || "Member"}
                </p>
                <p className="text-white/40 text-xs mt-0.5 break-all">{user.email}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider"
                  style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}>
                  {tierBadge}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-white/20 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
              Avatar uses your initials.
            </p>
          </div>

          {/* Membership card */}
          <div className="rounded-3xl p-6"
            style={{
              background: isPlus ? `linear-gradient(135deg,rgba(${rtPrimary},0.07),rgba(${rtPrimary},0.02))` : "rgba(255,255,255,0.03)",
              border: `1px solid ${isPlus ? `rgba(${rtPrimary},0.3)` : "rgba(255,255,255,0.07)"}`,
              transition: "background 0.3s ease, border-color 0.3s ease",
            }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: tierColor }}>Membership</p>
                <h2 className="font-heading font-black text-white text-xl">{tierLabel}</h2>
                {user.billingCycle && isPlus && (
                  <p className="text-xs text-white/35 mt-0.5 capitalize">{user.billingCycle} billing</p>
                )}
                {isPlus && !isCancelledWithAccess && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400/70 font-semibold">Active</span>
                  </div>
                )}
                {isCancelledWithAccess && periodEndFormatted && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-xs text-yellow-400/70 font-semibold">Active until {periodEndFormatted}</span>
                  </div>
                )}
                {isCancelledWithAccess && !periodEndFormatted && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-xs text-yellow-400/70 font-semibold">Cancelled — access continues until period ends</span>
                  </div>
                )}
              </div>
              <Crown className="w-6 h-6 flex-shrink-0" style={{ color: isPlus || isAdmin ? `rgb(${rtPrimary})` : "rgba(255,255,255,0.15)", transition: "color 0.25s ease" }} />
            </div>

            <div className="space-y-2 mb-5">
              {isPlus || isAdmin ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-white/60"><Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${rtPrimary})` }} /> Download every available song</div>
                  <div className="flex items-center gap-2 text-sm text-white/60"><Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${rtPrimary})` }} /> Access premium Academy lessons</div>
                  <div className="flex items-center gap-2 text-sm text-white/60"><Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${rtPrimary})` }} /> Save 432 Hz music offline</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-white/50"><Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${rtPrimary})` }} /> Stream all songs free</div>
                  <div className="flex items-center gap-2 text-sm text-white/50"><Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${rtPrimary})` }} /> Upper Vibe Radio</div>
                  <div className="flex items-center gap-2 text-sm text-white/50"><Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${rtPrimary})` }} /> Save to My Vibe Library</div>
                  <div className="flex items-center gap-2 text-sm text-white/25"><Lock className="w-3.5 h-3.5 flex-shrink-0" /> Downloads (Plus only)</div>
                </>
              )}
            </div>

            {!isPlus && !isAdmin && (
              <>
                <Link to="/membership"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
                  style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.8),rgb(${rtPrimary}))`, color: "#000" }}>
                  <Crown className="w-4 h-4" /> Upgrade to Plus
                </Link>
                <p className="text-xs text-center mt-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Download every song for $4.99/month.
                </p>
              </>
            )}
            {isPaid && !isAdmin && (
              <>
                <button onClick={handlePortal} disabled={portalLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.12),rgba(${rtPrimary},0.06))`, border: `1px solid rgba(${rtPrimary},0.35)`, color: `rgb(${rtPrimary})` }}>
                  <CreditCard className="w-4 h-4" />
                  {portalLoading ? "Opening..." : "Manage Plus Subscription"}
                </button>
                <p className="text-xs text-center mt-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Cancel, update payment, or manage billing securely through Stripe.
                </p>
              </>
            )}
          </div>

          {/* Admin shortcut */}
          {isAdmin && (
            <Link to="/admin"
              className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all"
              style={{ background: `rgba(${rtPrimary},0.05)`, border: `1px solid rgba(${rtPrimary},0.18)`, transition: "all 0.2s ease" }}>
              <Settings className="w-5 h-5" style={{ color: `rgba(${rtPrimary},0.8)` }} />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Music Manager</p>
                <p className="text-xs text-white/35">Upload and manage all content</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </Link>
          )}

          <Link to="/my-vibes"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", transition: "all 0.2s ease" }}>
            <Music4 className="w-5 h-5" style={{ color: `rgba(${rtPrimary},0.65)` }} />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">My Vibe Library</p>
              <p className="text-xs text-white/35">Your saved songs and favorites</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </Link>

          <Link to="/downloads"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", transition: "all 0.2s ease" }}>
            <Download className="w-5 h-5" style={{ color: `rgba(${rtPrimary},0.55)` }} />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">My Downloads</p>
              <p className="text-xs text-white/35">Your downloaded tracks</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </Link>

          {/* Theme Picker */}
          <div className="rounded-3xl p-5"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-5 h-5" style={{ color: `rgba(${rtPrimary},0.7)` }} />
              <div>
                <p className="text-sm font-bold text-white">Vibe Color</p>
                <p className="text-xs text-white/35">Choose your vibe</p>
              </div>
            </div>
            <ThemePicker />
          </div>

          <Link to="/settings"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all hover:border-white/12"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Settings className="w-5 h-5 text-white/30" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Settings</p>
              <p className="text-xs text-white/35">Playback, appearance & notifications</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </Link>

          <Link to="/faq"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", transition: "all 0.2s ease" }}>
            <HelpCircle className="w-5 h-5" style={{ color: `rgba(${rtPrimary},0.45)` }} />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">FAQ</p>
              <p className="text-xs text-white/35">Common questions about Plus, Radio & more</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </Link>

          <button onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white/40 hover:text-white/70 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <LogOut className="w-4 h-4" /> Log Out
          </button>

          {/* Danger zone — visually separated */}
          <div className="pt-4">
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] hover:brightness-110"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", minHeight: 56 }}>
              <Trash2 className="w-4 h-4" /> Request Account Deletion
            </button>
          </div>

          {/* Delete Account Confirmation Dialog */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center px-6"
                style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  className="w-full max-w-sm rounded-3xl p-6"
                  style={{ background: "rgba(12,8,20,0.98)", border: "1px solid rgba(239,68,68,0.25)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="font-heading font-black text-white text-xl text-center mb-2">Request Account Deletion</h3>
                  <p className="text-white/40 text-sm text-center leading-relaxed mb-7">
                    This will send an account deletion request to our support team. We'll review and process it within a few business days. Your saved songs, vibe library, and personal data will be removed. Billing records may be retained as required by law.
                  </p>
                  <div className="flex flex-col gap-3">
                    <a
                      href="mailto:uppervibemedia@gmail.com?subject=Account Deletion Request"
                      className="w-full py-4 rounded-2xl font-black text-sm text-center transition-all hover:brightness-110"
                      style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", minHeight: 52 }}>
                      Send Deletion Request
                    </a>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="w-full py-4 rounded-2xl font-semibold text-sm text-white/50 hover:text-white/80 transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", minHeight: 52 }}>
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}