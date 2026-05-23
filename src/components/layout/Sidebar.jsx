import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Music,
  Settings,
  LogOut,
  Radio,
  User,
  Heart,
  GraduationCap,
  MessageCircle,
  Tv2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useTheme } from "@/context/ThemeContext";

const mainNavItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/radio", icon: Radio, label: "Radio" },
  { path: "/vibe-room", icon: MessageCircle, label: "Vibe Room" },
  { path: "/academy", icon: GraduationCap, label: "Academy" },
  { path: "/visualizers", icon: Tv2, label: "Visualizers" },
  { path: "/my-vibes", icon: Heart, label: "My Vibe Library" },
];

const bottomNavMobile = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/music", icon: Music, label: "Music" },
  { path: "/radio", icon: Radio, label: "Radio" },
  { path: "/vibe-room", icon: MessageCircle, label: "Vibe Room" },
  { path: "/account", icon: User, label: "Account" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const { isPlaying, sourceType } = usePlayer();
  const radioIsLive = isPlaying && sourceType === "radio";
  const { accent } = useTheme();
  const radioThemeColor = accent.rgb;

  const handleMobileNavTap = (e, path) => {
    if (location.pathname === path) {
      e.preventDefault();
      navigate(path, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const isAdmin = user?.role === "admin";

  const allNavItems = isAdmin
    ? [...mainNavItems, { path: "/admin", icon: Settings, label: "Music Manager" }]
    : mainNavItems;

  return (
    <>
      {/* ── Mobile top bar — sits above notch/Dynamic Island ── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-border/40"
        style={{
          background: "hsl(var(--background) / 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
      <div className="flex items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
            alt="UVM"
            className="w-7 h-7 object-contain"
          />
        </Link>
        <div className="flex items-center gap-2">
          {/* My Vibe Library shortcut */}
          <Link
            to="/my-vibes"
            onClick={(e) => { if (!isAuthenticated) { e.preventDefault(); navigateToLogin("/my-vibes"); } }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all hover:brightness-110"
            style={{
             background: `rgba(${radioThemeColor},0.12)`,
             borderColor: `rgba(${radioThemeColor},0.35)`,
             color: `rgb(${radioThemeColor})`,
             boxShadow: `0 0 12px rgba(${radioThemeColor},0.15)`,
           }}>
            <Heart className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold whitespace-nowrap">My Vibe Library</span>
            <span className="sm:hidden text-[11px] font-semibold whitespace-nowrap">Library</span>
          </Link>

          {/* Account / Login */}
          {isAuthenticated && user ? (
            <Link to="/account" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all hover:brightness-110"
              style={{
                background: `rgba(${radioThemeColor},0.12)`,
                borderColor: `rgba(${radioThemeColor},0.35)`,
                color: `rgb(${radioThemeColor})`,
                boxShadow: `0 0 12px rgba(${radioThemeColor},0.15)`,
              }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: `rgba(${radioThemeColor},0.18)`, color: `rgb(${radioThemeColor})` }}>
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-[11px] font-semibold">Account</span>
            </Link>
          ) : (
            <button onClick={navigateToLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-[11px] tracking-wide"
              style={{ background: `linear-gradient(135deg,rgba(${radioThemeColor},0.7),rgb(${radioThemeColor}))`, color: "#000" }}>
              Log In
            </button>
          )}
        </div>
      </div>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40"
        style={{
          background: "hsl(var(--background) / 0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
      >
        <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
          {bottomNavMobile.map((item) => {
            const isActive = location.pathname === item.path;
            const isRadioItem = item.path === "/radio";
            const glowing = isRadioItem && radioIsLive;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleMobileNavTap(e, item.path)}
                className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all"
              >
                <div
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    background: isActive ? `rgba(${radioThemeColor},0.15)` : "transparent",
                    boxShadow: glowing ? `0 0 10px rgba(${radioThemeColor},0.35)` : "none",
                  }}
                >
                  <item.icon
                    className="w-[18px] h-[18px] transition-colors"
                    style={{
                      color: isActive || glowing ? `rgb(${radioThemeColor})` : "hsl(var(--muted-foreground) / 0.6)",
                      filter: glowing && !isActive ? `drop-shadow(0 0 4px rgba(${radioThemeColor},0.7))` : "none",
                    }}
                  />
                  {glowing && !isActive && (
                    <span className="block w-1 h-1 rounded-full mx-auto mt-0.5 animate-pulse"
                      style={{ background: `rgb(${radioThemeColor})` }} />
                  )}
                </div>
                <span
                  className="text-[8px] font-semibold tracking-wide uppercase"
                  style={{
                     color: isActive || glowing ? `rgb(${radioThemeColor})` : "hsl(var(--muted-foreground) / 0.5)",
                   }}
                >
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
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col border-r border-border/40"
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-[70px] px-5 border-b border-border/30 flex-shrink-0 overflow-hidden">
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
                <p className="font-heading font-black text-xs tracking-[0.22em] whitespace-nowrap" style={{ color: "#F5A800" }}>UPPER VIBE</p>
                <p className="text-[9px] tracking-[0.15em] uppercase font-black whitespace-nowrap" style={{ color: "#2B9FE8" }}>MEDIA</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-hidden">
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isRadioItem = item.path === "/radio";
            const accentColor = isRadioItem ? radioThemeColor : null;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!expanded ? item.label : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group overflow-hidden ${
                  isActive ? "" : "hover:bg-muted/50"
                }`}
                style={isActive ? {
                  background: `rgba(${radioThemeColor},0.1)`,
                  boxShadow: `inset 0 0 0 1px rgba(${radioThemeColor},0.2)`,
                } : {}}
              >
                {isActive && (
                   <div
                     className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                     style={{ background: `rgb(${radioThemeColor})` }}
                   />
                 )}
                <item.icon
                   className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${!isActive ? "text-muted-foreground/50 group-hover:text-foreground/70" : ""}`}
                   style={isActive ? { color: `rgb(${radioThemeColor})` } : {}}
                 />
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`text-[13px] font-medium whitespace-nowrap ${
                         !isActive ? "text-muted-foreground group-hover:text-foreground/80" : ""
                       }`}
                       style={isActive ? { color: `rgb(${radioThemeColor})` } : {}}
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
        <div className="border-t border-border/30 px-3 py-3 flex-shrink-0">
          {isAuthenticated && user ? (
            <Link to="/account" className="flex items-center gap-3 overflow-hidden rounded-xl px-2 py-1.5 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-bold text-xs" style={{ background: `rgba(${radioThemeColor},0.15)`, border: `1px solid rgba(${radioThemeColor},0.3)`, color: `rgb(${radioThemeColor})` }}>
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/80 truncate">{user.full_name || "Member"}</p>
                    <p className="text-[9px] truncate text-secondary/80">
                      {user.role === "admin" ? "👑 Admin" : (user.role === "premium" || user.tier === "premium") ? "⭐ Premium" : "Free Listener"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {expanded && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); logout(); }}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0 p-1">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </Link>
          ) : (
            <button
              onClick={navigateToLogin}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-colors overflow-hidden" style={{ background: `rgba(${radioThemeColor},0.08)`, border: `1px solid rgba(${radioThemeColor},0.2)` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${radioThemeColor},0.15)`, border: `1px solid rgba(${radioThemeColor},0.3)`, color: `rgb(${radioThemeColor})` }}>
                <User className="w-4 h-4" />
              </div>
              <AnimatePresence>
                {expanded && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-xs whitespace-nowrap font-black tracking-wide" style={{ color: `rgb(${radioThemeColor})` }}>
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