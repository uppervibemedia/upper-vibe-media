import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import AudioPlayer from "../player/AudioPlayer";
import { PlayerProvider } from "../../context/PlayerContext";
import { usePlayer } from "../../context/PlayerContext";
import { RadioProvider } from "../../context/RadioContext";
import { useAuth } from "@/lib/AuthContext";
import { User } from "lucide-react";
import IOSInstallBanner from "../shared/IOSInstallBanner";

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
      onClick={navigateToLogin}
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
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Top-right auth button — desktop only, fixed */}
      <div className="hidden lg:block fixed top-4 right-5 z-40">
        <TopRightAuth />
      </div>
      {/* pt-14 for mobile topbar, pb for mobile bottom nav + player */}
      <main className={`lg:ml-[72px] pt-14 lg:pt-0 ${currentTrack && !isRadioPage ? "pb-32 lg:pb-20" : "pb-16 lg:pb-0"} mb-safe`}>
        <Outlet />
      </main>
      {!isRadioPage && <AudioPlayer />}
      <IOSInstallBanner />
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