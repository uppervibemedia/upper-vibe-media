import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Settings,
  LogOut,
  Radio,
  User,
  Users,
  Heart,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const mainNavItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/radio", icon: Radio, label: "Radio" },
  { path: "/artists", icon: Users, label: "Artists" },
  { path: "/my-vibes", icon: Heart, label: "My Vibe Library" },
];

const bottomNavMobile = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/radio", icon: Radio, label: "Radio" },
  { path: "/artists", icon: Users, label: "Artists" },
  { path: "/my-vibes", icon: Heart, label: "Library" },
  { path: "/account", icon: User, label: "Account" },
];

export default function Sidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const isAdmin = user?.role === "admin";

  const allNavItems = isAdmin
    ? [...mainNavItems, { path: "/admin", icon: Settings, label: "Music Manager" }]
    : mainNavItems;

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: "rgba(4,4,8,0.92)", backdropFilter: "blur(24px)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
            alt="UVM"
            className="w-7 h-7 object-contain"
          />
          <span className="font-heading font-black text-sm tracking-[0.22em] text-white">UPPER VIBE</span>
        </Link>
        {isAuthenticated && user ? (
          <Link to="/account" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
              style={{ background: "rgba(0,229,255,0.15)", color: "#00E5FF" }}>
              {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-[11px] font-semibold text-white/60">Account</span>
          </Link>
        ) : (
          <button onClick={navigateToLogin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-[11px] tracking-wide"
            style={{ background: "linear-gradient(135deg,#009CB8,#00C8E0)", color: "#000" }}>
            Log In
          </button>
        )}
      </div>

      {/* ── Mobile bottom navigation ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 pb-safe"
        style={{ background: "rgba(4,4,8,0.95)", backdropFilter: "blur(24px)" }}>
        <div className="flex items-center justify-around px-2 pt-2 pb-3">
          {bottomNavMobile.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
              >
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-cyan-400/15" : ""}`}>
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-cyan-400" : "text-white/40"}`} />
                </div>
                <span className={`text-[9px] font-semibold tracking-wider uppercase ${isActive ? "text-cyan-400" : "text-white/30"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Desktop sidebar ── */}
      <motion.aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        animate={{ width: expanded ? 220 : 72 }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col border-r border-white/[0.06]"
        style={{ background: "linear-gradient(180deg,#060610 0%,#080818 60%,#040408 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-[70px] px-5 border-b border-white/[0.06] flex-shrink-0 overflow-hidden">
          <img
            src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
            alt="Upper Vibe Media"
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="font-heading font-black text-xs tracking-[0.22em] text-white whitespace-nowrap">UPPER VIBE</p>
                <p className="text-[9px] tracking-[0.15em] uppercase text-yellow-400/60 whitespace-nowrap">Media</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-hidden">
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!expanded ? item.label : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group overflow-hidden ${
                  isActive ? "" : "hover:bg-white/[0.04]"
                }`}
                style={isActive ? {
                  background: "linear-gradient(135deg,rgba(0,229,255,0.12),rgba(0,229,255,0.04))",
                  boxShadow: "inset 0 0 0 1px rgba(0,229,255,0.15), 0 0 16px rgba(0,229,255,0.08)"
                } : {}}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                    style={{ background: "linear-gradient(180deg,#00E5FF,#00B8D4)" }} />
                )}
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                  isActive ? "text-cyan-400" : "text-white/35 group-hover:text-white/65"
                }`} />
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`text-[13px] font-medium whitespace-nowrap ${
                        isActive ? "text-cyan-300" : "text-white/50 group-hover:text-white/80"
                      }`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* spacer */}

        {/* User area */}
        <div className="border-t border-white/[0.06] px-3 py-3 flex-shrink-0">
          {isAuthenticated && user ? (
            <Link to="/account" className="flex items-center gap-3 overflow-hidden rounded-xl px-2 py-1.5 hover:bg-white/[0.04] transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-bold text-xs"
                style={{ background: "linear-gradient(135deg,#00E5FF22,#00E5FF08)", border: "1px solid rgba(0,229,255,0.25)", color: "#00E5FF" }}>
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">{user.full_name || "Member"}</p>
                    <p className="text-[9px] truncate" style={{
                      color: user.role === "admin" ? "#D4A843" : (user.role === "premium" || user.tier === "premium") ? "#D4A843" : "#00C9E0"
                    }}>
                      {user.role === "admin" ? "👑 Admin" : (user.role === "premium" || user.tier === "premium") ? "⭐ Premium" : "Free Listener"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {expanded && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); logout(); }}
                  className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0 p-1">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </Link>
          ) : (
            <button
              onClick={navigateToLogin}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-colors overflow-hidden"
              style={{ background: "rgba(0,180,210,0.08)", border: "1px solid rgba(0,180,210,0.2)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)" }}>
                <User className="w-4 h-4 text-cyan-400/70" />
              </div>
              <AnimatePresence>
                {expanded && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-xs text-cyan-400 whitespace-nowrap font-black tracking-wide">
                    Log In
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}