import React from "react";
import { CheckCircle2, Flame, Gift, HelpCircle, Sparkles, Target, Users, X, Zap } from "lucide-react";

const TYPE_ICONS = {
  intention: Target,
  quest: Zap,
  boost: Sparkles,
  mystery: HelpCircle,
  reflection: Sparkles,
  community: Users,
  streak: Flame,
};

export default function SymbolActivatorCard({
  activeCard,
  isMobile,
  mobileLayout,
  onClose,
  onChooseIntention,
  onStartQuest,
  onClaimBoost,
  onClaimMystery,
  onAnswerReflection,
  onContributeEnergy,
  onClaimStreak,
}) {
  if (!activeCard) return null;
  const type = activeCard.activation?.type || "lesson";
  const Icon = TYPE_ICONS[type] || Sparkles;
  const isLandscape = !!(isMobile && mobileLayout?.isLandscape);
  const panelTop = isMobile ? `calc(env(safe-area-inset-top, 0px) + ${isLandscape ? 42 : 68}px)` : "auto";
  const panelBottom = isMobile ? `calc(env(safe-area-inset-bottom, 0px) + ${isLandscape ? 14 : 96}px)` : 190;
  const headline = activeCard.reward
    ? activeCard.statusTitle || "Reward Activated"
    : activeCard.alreadyActivated
      ? "Daily Reward Saved"
      : activeCard.activation?.label || activeCard.zone || "Frequency Activator";

  return (
    <div
      className="fixed z-[220] pointer-events-auto overflow-hidden"
      data-camera-scroll-lock="true"
      style={{ left: isMobile ? "env(safe-area-inset-left, 0px)" : "50%", right: isMobile ? "env(safe-area-inset-right, 0px)" : "auto", transform: isMobile ? "none" : "translateX(-50%)", top: isMobile ? "0" : panelTop, bottom: isMobile ? "0" : panelBottom, width: isMobile ? "auto" : 380, maxHeight: isMobile ? "none" : "50vh", borderRadius: isMobile ? 0 : 24, paddingTop: isMobile ? "env(safe-area-inset-top, 0px)" : 0, paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: "rgba(5,6,18,0.97)", border: "1px solid rgba(0,229,255,0.24)", backdropFilter: "blur(22px)", boxShadow: "0 18px 60px rgba(0,0,0,0.52), 0 0 34px rgba(0,229,255,0.16)" }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}><Icon className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: activeCard.reward ? "#4ADE80" : activeCard.alreadyActivated ? "#C4AAFF" : "#00E5FF" }}>{headline}</p>
          <h3 className="font-heading font-black text-white text-base mt-1">{activeCard.title}</h3>
          {activeCard.theme && <p className="text-[10px] text-white/34 mt-1">Today’s theme: {activeCard.theme}</p>}
          {activeCard.teaching && <p className="text-[12px] leading-relaxed text-white/66 mt-2">{activeCard.teaching}</p>}
          {activeCard.action && <p className="text-[11px] leading-relaxed mt-2" style={{ color: "#FFD36E" }}><b>Action:</b> {activeCard.action}</p>}

          {!activeCard.alreadyActivated && type === "intention" && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {activeCard.activation.choices.map((choice) => (
                <button key={choice.id} onClick={() => onChooseIntention(activeCard, choice)} className="rounded-xl px-3 py-2 text-[10px] font-black active:scale-95" style={{ background: `${choice.color}18`, border: `1px solid ${choice.color}40`, color: choice.color, touchAction: "manipulation" }}>{choice.label}</button>
              ))}
            </div>
          )}

          {!activeCard.alreadyActivated && type === "quest" && (
            <div className="mt-3 rounded-2xl p-3" style={{ background: "rgba(255,211,110,0.08)", border: "1px solid rgba(255,211,110,0.18)" }}>
              <p className="text-xs font-black text-white">{activeCard.activation.quest.label}</p>
              <p className="text-[10px] text-white/42 mt-1">{activeCard.questStarted ? activeCard.questStatus || "Quest started — complete it today." : "Start this mini quest for a daily reward."}</p>
              {!activeCard.questStarted && <button onClick={() => onStartQuest(activeCard)} className="mt-2 px-4 py-2 rounded-full text-[10px] font-black" style={{ background: "linear-gradient(135deg,#FFD36E,#00E5FF)", color: "#021018", touchAction: "manipulation" }}>Start Quest</button>}
            </div>
          )}

          {!activeCard.alreadyActivated && type === "boost" && (
            <button onClick={() => onClaimBoost(activeCard)} className="mt-3 px-4 py-2 rounded-full text-[10px] font-black" style={{ background: "linear-gradient(135deg,#7C3AED,#00E5FF)", color: "#fff", touchAction: "manipulation" }}>Activate 10-Min Boost</button>
          )}

          {!activeCard.alreadyActivated && type === "mystery" && (
            <button onClick={() => onClaimMystery(activeCard)} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black" style={{ background: "linear-gradient(135deg,#C43BFF,#FFD36E)", color: "#120016", touchAction: "manipulation" }}><Gift className="w-3 h-3" /> Reveal Mystery</button>
          )}

          {!activeCard.alreadyActivated && type === "reflection" && (
            <div className="grid gap-2 mt-3">
              {activeCard.activation.answers.map((answer) => (
                <button key={answer.id} onClick={() => onAnswerReflection(activeCard, answer)} className="rounded-xl px-3 py-2 text-left text-[11px] font-bold active:scale-[0.98]" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)", touchAction: "manipulation" }}>{answer.label}</button>
              ))}
            </div>
          )}

          {!activeCard.alreadyActivated && type === "community" && (
            <div className="mt-3">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, ((activeCard.communityEnergy || 0) / (activeCard.communityGoal || 500)) * 100)}%`, background: "linear-gradient(90deg,#00E5FF,#FFD36E)" }} /></div>
              <p className="text-[10px] text-white/40 mt-1">{activeCard.communityEnergy || 0}/{activeCard.communityGoal || 500} city energy today</p>
              <button onClick={() => onContributeEnergy(activeCard)} className="mt-2 px-4 py-2 rounded-full text-[10px] font-black" style={{ background: "rgba(0,229,255,0.16)", border: "1px solid rgba(0,229,255,0.34)", color: "#DFFBFF", touchAction: "manipulation" }}>Contribute Energy</button>
            </div>
          )}

          {!activeCard.alreadyActivated && type === "streak" && (
            <button onClick={() => onClaimStreak(activeCard)} className="mt-3 px-4 py-2 rounded-full text-[10px] font-black" style={{ background: "linear-gradient(135deg,#FF8A3D,#FFD36E)", color: "#1A0800", touchAction: "manipulation" }}>Claim Streak Reward</button>
          )}
        </div>
        <button onClick={onClose} className="w-10 h-10 min-w-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", touchAction: "manipulation" }}><X className="w-4 h-4" /></button>
      </div>
      {(activeCard.reward || activeCard.alreadyActivated) && <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border-t border-white/5" style={{ color: activeCard.alreadyActivated ? "#C4AAFF" : "#4ADE80" }}><CheckCircle2 className="w-3 h-3" /> {activeCard.cooldownMessage || activeCard.rewardMessage || "Daily reward saved — come back tomorrow"}</div>}
    </div>
  );
}