import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import AudioPlayer from "../player/AudioPlayer";
import { PlayerProvider } from "../../context/PlayerContext";
import { usePlayer } from "../../context/PlayerContext";
import { RadioProvider } from "../../context/RadioContext";
import { useAuth } from "@/lib/AuthContext";
import { User } from "lucide-react";
import EmailCaptureModal from "../shared/EmailCaptureModal";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";
import { useLivePresence } from "@/hooks/useLivePresence";

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  return null;
}

// Broadcasts a presence heartbeat every 30s for Live Users Now tracking
function PresenceBeacon() {
  useLivePresence();
  return null;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    // Scroll the window and any scrollable body containers to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);
  return null;
}

function TopRightAuth() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();

  if (isAuthenticated && user) {
    return (
      <Link to="/account"
        className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all hover:bg-white/[0.06]"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
          style={{ background: "rgba(0,229,255,0.15)", color: "#00E5FF" }}>
          {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
        </div>
        <span className="text-xs font-semibold text-white/70">Account</span>
      </Link>
    );
  }

  return (
    <button
      onClick={() => navigateToLogin(window.location.origin + window.location.pathname)}
      className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all hover:brightness-110"
      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000" }}>
      <User className="w-3.5 h-3.5" /> Log In
    </button>
  );
}

function LayoutContent() {
  const { currentTrack } = usePlayer();
  const location = useLocation();
  const isRadioPage = location.pathname === "/radio";
  const isStartPage = location.pathname === "/start";
  const isTikTokFeed = location.pathname === "/tiktok" || location.pathname === "/link-in-bio";

  const mainStyle = {
    paddingTop: isStartPage || isTikTokFeed ? "0px" : "calc(56px + env(safe-area-inset-top, 0px))",
    paddingBottom: isStartPage ? "0px" : !isRadioPage
      ? "calc(56px + 72px + env(safe-area-inset-bottom, 12px))"
      : "calc(56px + env(safe-area-inset-bottom, 12px))",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Persistent — never remounts */}
      {!isTikTokFeed && <Sidebar />}
      {!isTikTokFeed && (
        <div className="hidden lg:block fixed top-4 right-5 z-40">
          <TopRightAuth />
        </div>
      )}

      {/* Page content — no animation wrapper, no transforms, no stacking context */}
      <main className={isTikTokFeed ? "lg:pt-0" : "lg:ml-[72px] lg:pt-0"} style={mainStyle}>
        <Outlet />
      </main>

      {/* Persistent */}
      {!isRadioPage && <AudioPlayer />}
      <ScrollToTop />
      <PageViewTracker />
      <PresenceBeacon />
      <EmailCaptureModal />
    </div>
  );
}

export default function AppLayout() {
  return (
    <PlayerProvider>
      <RadioProvider>
        <LayoutContent />
      </RadioProvider>
    </PlayerProvider>
  );
}