import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Ban } from 'lucide-react';

export default function PersonalHoverboardHUD({ isMobile, mobileLayout, onToggle, onJump, personalHoverboardActive, canUsePersonalBoard }) {
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);

  useEffect(() => {
    const onResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Hide until an equipped board can be used, but keep the put-away control visible while riding.
  if (!canUsePersonalBoard && !personalHoverboardActive) return null;

  const ridingLayout = personalHoverboardActive;
  const containerStyle = ridingLayout
    ? isMobile && isLandscape
      ? {
          position: 'fixed',
          right: 'calc(24px + env(safe-area-inset-right, 0px))',
          bottom: 'calc(36px + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'auto',
        }
      : isMobile
        ? {
            position: 'fixed',
            right: 'calc(18px + env(safe-area-inset-right, 0px))',
            bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))',
            pointerEvents: 'auto',
          }
        : {
            position: 'fixed',
            right: 'calc(24px + env(safe-area-inset-right, 0px))',
            bottom: 'calc(130px + env(safe-area-inset-bottom, 0px))',
            pointerEvents: 'auto',
          }
    : {
        position: 'absolute',
        right: 0,
        bottom: 0,
        paddingBottom: isMobile && mobileLayout
          ? `${mobileLayout.actionBottom + 60}px`
          : isMobile
            ? `calc(env(safe-area-inset-bottom, 0px) + 308px)`
            : `calc(env(safe-area-inset-bottom, 0px) + 12rem)`,
        pointerEvents: 'auto',
      };

  return (
    <motion.div
      key="personal-hb-hud"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="z-[58] flex flex-col items-end px-3"
      style={{
        ...containerStyle,
        gap: personalHoverboardActive ? 10 : 8,
      }}
    >
      {personalHoverboardActive && (
        <button
          onTouchStart={(e) => { e.stopPropagation(); onJump?.(); }}
          onClick={onJump}
          className="flex items-center justify-center gap-1.5 rounded-full font-black text-[11px] tracking-wider transition-all hover:brightness-110 active:scale-95"
          style={{
            width: isMobile ? 118 : 140,
            height: isMobile ? 54 : 54,
            background: "linear-gradient(135deg,#00E5FF,#A078FF)",
            border: "1px solid rgba(0,229,255,0.5)",
            color: "#fff",
            touchAction: "manipulation",
            boxShadow: "0 0 16px rgba(0,229,255,0.32)",
          }}
          title="Jump (Spacebar)"
        >
          <span className="text-sm leading-none">↥</span>
          Jump{!isMobile ? " · Space" : ""}
        </button>
      )}
      <button
        onTouchStart={(e) => e.stopPropagation()}
        onClick={onToggle}
        className="flex items-center justify-center gap-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
        style={{
          width: personalHoverboardActive ? (isMobile ? 132 : 164) : 'auto',
          height: personalHoverboardActive ? (isMobile ? 42 : 48) : undefined,
          padding: personalHoverboardActive ? '0 12px' : '6px 12px',
          opacity: personalHoverboardActive ? 0.9 : 1,
          background: personalHoverboardActive ? "rgba(255, 80, 80, 0.13)" : "linear-gradient(135deg,#00B8D488,#00D4F088)",
          border: personalHoverboardActive ? "1px solid rgba(255, 80, 80, 0.32)" : "1px solid rgba(0,212,240,0.4)",
          color: personalHoverboardActive ? "#ff9a9a" : "#fff",
          fontSize: personalHoverboardActive && isMobile ? 13 : undefined,
          minHeight: personalHoverboardActive ? undefined : (isMobile ? 36 : 40),
          touchAction: "manipulation",
          boxShadow: personalHoverboardActive ? "0 0 10px rgba(255, 80, 80, 0.18)" : "0 0 14px rgba(0,212,240,0.25)",
        }}
      >
        {personalHoverboardActive ? <Ban className="w-3 h-3" /> : <Rocket className="w-3 h-3" />}
        {personalHoverboardActive ? "Put Away Board" : "Ride Hoverboard"}
      </button>
    </motion.div>
  );
}