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

  const jumpStyle = isMobile && isLandscape
    ? {
        position: 'fixed',
        right: 'calc(24px + env(safe-area-inset-right, 0px))',
        bottom: 'calc(36px + env(safe-area-inset-bottom, 0px))',
        pointerEvents: 'auto',
      }
    : isMobile
      ? {
          position: 'fixed',
          right: mobileLayout ? `${Math.max(10, (mobileLayout.sa?.right || 0) + 10)}px` : 'calc(18px + env(safe-area-inset-right, 0px))',
          bottom: mobileLayout ? `${Math.max((mobileLayout.sa?.bottom || 0) + 10, mobileLayout.playerBottom + ((mobileLayout.playerHeight || 52) - 54) / 2)}px` : 'calc(28px + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'auto',
        }
      : {
          position: 'fixed',
          right: 'calc(24px + env(safe-area-inset-right, 0px))',
          bottom: 'calc(130px + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'auto',
        };

  const putAwayStyle = isMobile && isLandscape
    ? {
        position: 'fixed',
        right: 'calc(22px + env(safe-area-inset-right, 0px))',
        top: 'calc(72px + env(safe-area-inset-top, 0px))',
        pointerEvents: 'auto',
      }
    : isMobile
      ? {
          position: 'fixed',
          right: 'calc(18px + env(safe-area-inset-right, 0px))',
          top: 'calc(88px + env(safe-area-inset-top, 0px))',
          pointerEvents: 'auto',
        }
      : {
          position: 'fixed',
          right: 'calc(24px + env(safe-area-inset-right, 0px))',
          top: 'calc(96px + env(safe-area-inset-top, 0px))',
          pointerEvents: 'auto',
        };

  const rideStyle = {
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

  if (personalHoverboardActive) {
    return (
      <>
        <motion.div
          key="personal-hb-jump"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="z-[58] px-3"
          style={jumpStyle}
        >
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
        </motion.div>

        <motion.div
          key="personal-hb-put-away"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="z-[57] px-3"
          style={putAwayStyle}
        >
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={onToggle}
            className="flex items-center justify-center gap-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{
              width: isMobile ? 104 : 128,
              height: isMobile ? 34 : 38,
              padding: '0 10px',
              opacity: 0.86,
              background: "rgba(255, 80, 80, 0.11)",
              border: "1px solid rgba(255, 80, 80, 0.28)",
              color: "#ff9a9a",
              fontSize: isMobile ? 11 : 12,
              touchAction: "manipulation",
              boxShadow: "0 0 8px rgba(255, 80, 80, 0.14)",
            }}
          >
            <Ban className="w-3 h-3" />
            Put Away
          </button>
        </motion.div>
      </>
    );
  }

  return (
    <motion.div
      key="personal-hb-hud"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="z-[58] flex flex-col items-end px-3"
      style={{
        ...rideStyle,
        gap: 8,
      }}
    >
      <button
        onTouchStart={(e) => e.stopPropagation()}
        onClick={onToggle}
        className="flex items-center justify-center gap-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
        style={{
          width: 'auto',
          padding: '6px 12px',
          opacity: 1,
          background: "linear-gradient(135deg,#00B8D488,#00D4F088)",
          border: "1px solid rgba(0,212,240,0.4)",
          color: "#fff",
          minHeight: isMobile ? 36 : 40,
          touchAction: "manipulation",
          boxShadow: "0 0 14px rgba(0,212,240,0.25)",
        }}
      >
        <Rocket className="w-3 h-3" />
        Ride Hoverboard
      </button>
    </motion.div>
  );
}