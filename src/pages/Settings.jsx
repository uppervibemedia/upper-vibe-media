import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Play, Zap, Moon, Sun, Cpu, Bell, Download, CreditCard, LogOut, Crown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const SETTINGS_KEY = "uvm_settings";

const DEFAULTS = {
  autoplay: true,
  backgroundAnimations: true,
  darkMode: true,
  reduceMotion: false,
  notifyNewMusic: true,
  notifyAcademy: false,
  notifyRadio: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
      style={{
        background: value ? "linear-gradient(135deg,#00A8C0,#00D4EE)" : "rgba(255,255,255,0.1)",
        border: value ? "1px solid rgba(0,200,220,0.4)" : "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: value ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="px-5 pt-4 pb-2 text-[10px] font-black tracking-[0.3em] uppercase text-white/30">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, description, right, border = true }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${border ? "border-t border-white/[0.05]" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white/80">{label}</p>
        {description && <p className="text-xs text-white/35 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

export default function Settings() {
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const [settings, setSettings] = useState(loadSettings);
  const [portalLoading, setPortalLoading] = useState(false);

  const set = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    saveSettings(next);
  };

  const isPlus = user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" ||
    user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";
  const isPaid = isAuthenticated && isPlus && user?.role !== "admin";

  const handlePortal = async () => {
    if (window.self !== window.top) { alert("Billing portal is only available from the published app."); return; }
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke("stripePortal", { returnUrl: `${window.location.origin}/settings` });
      if (res.data?.url) window.location.href = res.data.url;
    } catch { alert("Could not open billing portal. Please try again."); }
    setPortalLoading(false);
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-8 pt-20 lg:pt-8">
      <div className="max-w-lg mx-auto px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.18)" }}>
              <SettingsIcon className="w-5 h-5 text-cyan-400/70" />
            </div>
            <div>
              <h1 className="font-heading font-black text-2xl text-white">Settings</h1>
              <p className="text-white/35 text-xs">Customize your Upper Vibe experience</p>
            </div>
          </div>

          {/* Playback */}
          <Section title="Playback">
            <Row
              label="Autoplay"
              description="Automatically continue to next song"
              right={<Toggle value={settings.autoplay} onChange={(v) => set("autoplay", v)} />}
              border={false}
            />
            <Row
              label="Background Animations"
              description="Visualizer animations while playing"
              right={<Toggle value={settings.backgroundAnimations} onChange={(v) => set("backgroundAnimations", v)} />}
            />
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <Row
              label="Dark Mode"
              description="Dark theme (recommended)"
              right={<Toggle value={settings.darkMode} onChange={(v) => set("darkMode", v)} />}
              border={false}
            />
            <Row
              label="Reduce Motion"
              description="Minimize animations throughout the app"
              right={<Toggle value={settings.reduceMotion} onChange={(v) => set("reduceMotion", v)} />}
            />
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <Row
              label="New Music Releases"
              description="Get notified when new tracks drop"
              right={<Toggle value={settings.notifyNewMusic} onChange={(v) => set("notifyNewMusic", v)} />}
              border={false}
            />
            <Row
              label="Academy Uploads"
              description="New lessons added to Academy"
              right={<Toggle value={settings.notifyAcademy} onChange={(v) => set("notifyAcademy", v)} />}
            />
            <Row
              label="Radio Alerts"
              description="New radio features & announcements"
              right={<Toggle value={settings.notifyRadio} onChange={(v) => set("notifyRadio", v)} />}
            />
          </Section>

          {/* Account */}
          <Section title="Account">
            {!isAuthenticated ? (
              <Row
                border={false}
                label="Sign In"
                description="Log in to manage your membership"
                right={
                  <button onClick={navigateToLogin}
                    className="px-4 py-1.5 rounded-xl text-xs font-black tracking-wider"
                    style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000" }}>
                    Log In
                  </button>
                }
              />
            ) : (
              <>
                <Row
                  border={false}
                  label="Membership"
                  description={isPlus ? "Upper Vibe Plus — Active" : "Free Listener"}
                  right={
                    <span className="text-xs font-black px-2.5 py-1 rounded-full"
                      style={{
                        background: isPlus ? "rgba(212,168,67,0.12)" : "rgba(0,200,220,0.08)",
                        border: isPlus ? "1px solid rgba(212,168,67,0.3)" : "1px solid rgba(0,200,220,0.2)",
                        color: isPlus ? "#D4A843" : "#00C9E0"
                      }}>
                      {isPlus ? "⭐ Plus" : "Free"}
                    </span>
                  }
                />
                {!isPlus && (
                  <Row
                    label="Upgrade to Plus"
                    description="Unlock downloads & premium Academy"
                    right={
                      <Link to="/membership"
                        className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-xl"
                        style={{ background: "linear-gradient(135deg,#C8892A,#EDB84A)", color: "#000" }}>
                        <Crown className="w-3 h-3" /> Upgrade
                      </Link>
                    }
                  />
                )}
                {isPaid && (
                  <Row
                    label="Manage Subscription"
                    description="Change plan or cancel anytime"
                    right={
                      <button onClick={handlePortal} disabled={portalLoading}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors disabled:opacity-50">
                        <CreditCard className="w-3.5 h-3.5" />
                        {portalLoading ? "Loading..." : "Manage"}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    }
                  />
                )}
                <Row
                  label="Log Out"
                  right={
                    <button onClick={logout}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-400/60 hover:text-red-400 transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> Log Out
                    </button>
                  }
                />
              </>
            )}
          </Section>

          {/* Offline */}
          <Section title="Offline / Downloads">
            <Row
              border={false}
              label="Offline Mode"
              description="Save songs for offline listening"
              right={
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-wider"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                  Coming Soon
                </span>
              }
            />
          </Section>

          {/* FAQ link */}
          <Link to="/faq"
            className="flex items-center justify-between px-5 py-4 rounded-2xl transition-all hover:border-white/12 mb-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-sm font-semibold text-white/80">Frequently Asked Questions</p>
              <p className="text-xs text-white/35">Get answers about Plus, Radio, Academy & more</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
          </Link>

        </motion.div>
      </div>
    </div>
  );
}