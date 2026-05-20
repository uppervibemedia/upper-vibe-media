import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Image, Moon, Zap, Bell, Download, Crown, LogOut, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

function SettingToggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex-1 pr-4">
        <p className="text-sm font-semibold text-white/80">{label}</p>
        {description && <p className="text-xs text-white/35 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all duration-200"
        style={{
          background: value
            ? "linear-gradient(135deg,#009CB8,#00C8E0)"
            : "rgba(255,255,255,0.1)",
          border: value ? "none" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
          style={{ left: value ? "calc(100% - 22px)" : "2px" }}
        />
      </button>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30 px-1 mb-2 mt-6 first:mt-0">
      {title}
    </p>
  );
}

function SettingCard({ children }) {
  return (
    <div
      className="rounded-2xl px-5 divide-y"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        divideColor: "rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  // Playback
  const [autoplay, setAutoplay] = useState(() => {
    try { return localStorage.getItem("uvm_autoplay") !== "false"; } catch { return true; }
  });
  const [bgAnimations, setBgAnimations] = useState(() => {
    try { return localStorage.getItem("uvm_bg_animations") !== "false"; } catch { return true; }
  });

  // Appearance
  const [reduceMotion, setReduceMotion] = useState(() => {
    try { return localStorage.getItem("uvm_reduce_motion") === "true"; } catch { return false; }
  });

  // Notifications (UI only — stored in localStorage)
  const [notifNewMusic, setNotifNewMusic] = useState(() => {
    try { return localStorage.getItem("uvm_notif_music") !== "false"; } catch { return true; }
  });
  const [notifAcademy, setNotifAcademy] = useState(() => {
    try { return localStorage.getItem("uvm_notif_academy") !== "false"; } catch { return true; }
  });
  const [notifRadio, setNotifRadio] = useState(() => {
    try { return localStorage.getItem("uvm_notif_radio") === "true"; } catch { return false; }
  });

  const toggle = (key, setter) => (val) => {
    try { localStorage.setItem(key, String(val)); } catch {}
    setter(val);
  };

  const isAdmin = user?.role === "admin";
  const isPlus = isAdmin || user?.isPlus || user?.tier === "plus" || user?.tier === "premium" || user?.isPremium || user?.role === "premium";
  const isPaid = !isAdmin && isPlus;
  const tierLabel = isAdmin ? "Admin" : isPlus ? "Upper Vibe Plus" : "Free Listener";
  const tierColor = isAdmin ? "#D4A843" : isPlus ? "#D4A843" : "#00C9E0";

  const handlePortal = async () => {
    if (window.self !== window.top) {
      alert("The billing portal is only available from the published app.");
      return;
    }
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke("stripePortal", { returnUrl: `${window.location.origin}/settings` });
      if (res.data?.url) window.location.href = res.data.url;
    } catch {
      alert("Could not open billing portal. Please try again.");
    }
    setPortalLoading(false);
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-8 pt-20 lg:pt-8">
      <div className="max-w-lg mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link to="/account" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/8 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronLeft className="w-4 h-4 text-white/50" />
            </Link>
            <h1 className="font-heading font-black text-2xl text-white">Settings</h1>
          </div>

          {/* Playback */}
          <SectionHeader title="Playback" />
          <SettingCard>
            <SettingToggle
              label="Autoplay"
              description="Automatically play the next song when one ends"
              value={autoplay}
              onChange={toggle("uvm_autoplay", setAutoplay)}
            />
            <SettingToggle
              label="Background Animations"
              description="Ambient glow effects behind the player"
              value={bgAnimations}
              onChange={toggle("uvm_bg_animations", setBgAnimations)}
            />
          </SettingCard>

          {/* Account */}
          <SectionHeader title="Account" />
          <SettingCard>
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/80">Membership</p>
                <p className="text-xs mt-0.5 font-bold" style={{ color: tierColor }}>{tierLabel}</p>
              </div>
              <Crown className={`w-5 h-5 flex-shrink-0 ${isPlus ? "text-yellow-400" : "text-white/15"}`} />
            </div>
            {isPaid && (
              <div className="py-3.5">
                <button onClick={handlePortal} disabled={portalLoading}
                  className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white/90 transition-colors disabled:opacity-50">
                  <CreditCard className="w-4 h-4" />
                  {portalLoading ? "Opening..." : "Manage Subscription"}
                </button>
              </div>
            )}
            {!isPlus && !isAdmin && isAuthenticated && (
              <div className="py-3.5">
                <Link to="/membership" className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "#D4A843" }}>
                  <Crown className="w-4 h-4" />
                  Upgrade to Upper Vibe Plus
                </Link>
              </div>
            )}
            {isAuthenticated && (
              <div className="py-3.5">
                <button onClick={logout}
                  className="flex items-center gap-2 text-sm font-semibold text-white/40 hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}
          </SettingCard>

          {/* Appearance */}
          <SectionHeader title="Appearance" />
          <SettingCard>
            <SettingToggle
              label="Reduce Motion"
              description="Minimize animations and transitions"
              value={reduceMotion}
              onChange={toggle("uvm_reduce_motion", setReduceMotion)}
            />
          </SettingCard>

          {/* Notifications */}
          <SectionHeader title="Notifications" />
          <SettingCard>
            <SettingToggle
              label="New Music Releases"
              description="Get notified when new songs drop"
              value={notifNewMusic}
              onChange={toggle("uvm_notif_music", setNotifNewMusic)}
            />
            <SettingToggle
              label="New Academy Uploads"
              description="Be the first to watch new lessons"
              value={notifAcademy}
              onChange={toggle("uvm_notif_academy", setNotifAcademy)}
            />
            <SettingToggle
              label="Radio Alerts"
              description="Notify when special radio events go live"
              value={notifRadio}
              onChange={toggle("uvm_notif_radio", setNotifRadio)}
            />
          </SettingCard>

          {/* Offline / Downloads */}
          <SectionHeader title="Offline & Downloads" />
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Download className="w-5 h-5 text-white/20 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white/40">Offline Downloads</p>
              <p className="text-xs text-white/25 mt-0.5">Save music to listen without internet</p>
            </div>
            <span className="text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
              Coming Soon
            </span>
          </div>

          <p className="text-center text-[11px] text-white/15 tracking-wide mt-8">
            Upper Vibe Media · v1.0
          </p>

        </motion.div>
      </div>
    </div>
  );
}