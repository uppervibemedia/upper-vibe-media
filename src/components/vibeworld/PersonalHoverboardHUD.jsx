import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Ban, Flame } from 'lucide-react';

export default function PersonalHoverboardHUD({ isMobile, mobileLayout, onToggle, onJump, onEquipJetpack, onFly, personalHoverboardActive, canUsePersonalBoard, canUseJetpack = false, jetpackActive = false, jetpackStatus = null, vehicleMode = "hoverboard", lockPutAway = false }) {
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
  const vehicleActive = personalHoverboardActive || jetpackActive;
  const isJetpack = vehicleMode === "jetpack" || jetpackActive;
  if (!canUsePersonalBoard && !canUseJetpack && !vehicleActive) return null;

  const isPortraitMobile = isMobile && !isLandscape;
  const portraitPlayerRight = mobileLayout ? mobileLayout.playerLeft + mobileLayout.playerMaxWidth + 18 : 0;
  const portraitJumpWidth = isPortraitMobile && mobileLayout
    ? Math.max(52, Math.min(76, mobileLayout.vw - portraitPlayerRight - (mobileLayout.sa?.right || 0) - 12))
    : 76;
  const portraitJumpHeight = 52;
  const isSmallMobile = isMobile && window.innerWidth < 390;

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
          left: mobileLayout ? `${Math.min(portraitPlayerRight + 6, mobileLayout.vw - (mobileLayout.sa?.right || 0) - 6 - portraitJumpWidth)}px` : 'auto',
          right: mobileLayout ? 'auto' : 'calc(18px + env(safe-area-inset-right, 0px))',
          bottom: mobileLayout ? `${Math.max((mobileLayout.sa?.bottom || 0) + 10, mobileLayout.playerBottom + ((mobileLayout.playerHeight || 52) - portraitJumpHeight) / 2)}px` : 'calc(28px + env(safe-area-inset-bottom, 0px))',
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
        right: 'calc(10px + env(safe-area-inset-right, 0px))',
        top: 'calc(92px + env(safe-area-inset-top, 0px))',
        pointerEvents: 'auto',
      }
    : isMobile
      ? {
          position: 'fixed',
          right: 'calc(10px + env(safe-area-inset-right, 0px))',
          top: 'calc(106px + env(safe-area-inset-top, 0px))',
          pointerEvents: 'auto',
        }
      : {
          position: 'fixed',
          right: 'calc(6px + env(safe-area-inset-right, 0px))',
          top: 'calc(114px + env(safe-area-inset-top, 0px))',
          pointerEvents: 'auto',
          zIndex: 40,
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

  if (vehicleActive) {
    const cooldown = Math.max(0, jetpackStatus?.cooldownRemaining || 0);
    const flying = jetpackStatus?.mode === "flying";
    const falling = jetpackStatus?.mode === "falling";
    const flyDisabled = isJetpack && (cooldown > 0 || flying || falling);
    const primaryLabel = isJetpack ? "Fly" : `Jump${!isMobile ? " · Space" : ""}`;
    return (
      <>
        <motion.div
          key="personal-hb-jump"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={isPortraitMobile ? "z-[58]" : "z-[58] px-3"}
          style={jumpStyle}
        >
          <button
            onTouchStart={(e) => { e.stopPropagation(); if (!flyDisabled) (isJetpack ? onFly?.() : onJump?.()); }}
            onClick={() => { if (!flyDisabled) (isJetpack ? onFly?.() : onJump?.()); }}
            className="flex items-center justify-center gap-1.5 rounded-full font-black text-[11px] tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{
              width: isPortraitMobile ? portraitJumpWidth : (isMobile ? 118 : 140),
              height: isPortraitMobile ? portraitJumpHeight : (isMobile ? 54 : 54),
              background: flyDisabled ? "rgba(255,255,255,0.10)" : (isJetpack ? "linear-gradient(135deg,#FFD36E,#FF4FC3,#7C3AED)" : "linear-gradient(135deg,#00E5FF,#A078FF)"),
              border: flyDisabled ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,229,255,0.5)",
              color: "#fff",
              touchAction: "manipulation",
              boxShadow: "0 0 16px rgba(0,229,255,0.32)",
            }}
            disabled={flyDisabled}
            title={isJetpack && cooldown > 0 ? `Cooldown ${cooldown}s` : isJetpack ? "Fly" : "Jump (Spacebar)"}
          >
            {isJetpack ? <Flame className="w-3.5 h-3.5" /> : <span className="text-sm leading-none">↥</span>}
            {primaryLabel}
          </button>
        </motion.div>

        {!lockPutAway && (
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
                width: isMobile ? (isSmallMobile ? 96 : 110) : 110,
                height: isMobile ? (isSmallMobile ? 34 : 38) : 36,
                padding: '0 10px',
                opacity: 0.86,
                background: "rgba(255, 80, 80, 0.11)",
                border: "1px solid rgba(255, 80, 80, 0.28)",
                color: "#ff9a9a",
                fontSize: isMobile ? (isSmallMobile ? 11 : 12) : 12,
                touchAction: "manipulation",
                boxShadow: "0 0 8px rgba(255, 80, 80, 0.14)",
              }}
            >
              <Ban className="w-3 h-3" />
              Put Away
            </button>
          </motion.div>
        )}
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
      {canUsePersonalBoard && (
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
      )}
      {canUseJetpack && (
        <button
          onTouchStart={(e) => { e.stopPropagation(); onFly?.(); }}
          onClick={onFly}
          className="flex items-center justify-center gap-1.5 rounded-full font-black text-[11px] tracking-wider transition-all hover:brightness-110 active:scale-95"
          style={{
            width: isPortraitMobile ? portraitJumpWidth : (isMobile ? 118 : 140),
            height: isPortraitMobile ? portraitJumpHeight : (isMobile ? 54 : 54),
            background: "linear-gradient(135deg,#FFD36E,#FF4FC3,#7C3AED)",
            border: "1px solid rgba(255,211,110,0.45)",
            color: "#fff",
            touchAction: "manipulation",
            boxShadow: "0 0 16px rgba(255,79,195,0.28)",
          }}
        >
          <Flame className="w-3.5 h-3.5" />
          Fly
        </button>
      )}
    </motion.div>
  );
}