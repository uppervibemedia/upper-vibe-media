import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import WorldAccessScreen from "@/components/vibeworld/WorldAccessScreen";
import UsernameSetup from "@/components/vibeworld/UsernameSetup";
import AvatarSetup from "@/components/vibeworld/AvatarSetup";
import RPMAvatarCreator from "@/components/vibeworld/RPMAvatarCreator";
import CommunityRulesModal from "@/components/vibeworld/CommunityRulesModal";
import UserAgreementModal from "@/components/vibeworld/UserAgreementModal";

const UVC_AGREEMENT_VERSION = "1.0";

// Flow steps
const STEP = {
  LOADING: "loading",
  NOT_AUTHED: "not_authed",
  SETUP_USERNAME: "setup_username",
  SETUP_AVATAR: "setup_avatar",
  SHOW_RULES: "show_rules",
  SHOW_AGREEMENT: "show_agreement",
  READY: "ready",
};

export default function WorldGate({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [step, setStep] = useState(STEP.LOADING);
  const [chatAgeConfirmed, setChatAgeConfirmed] = useState(false);

  // ── Check user state ──────────────────────────────────────────
  useEffect(() => {
    if (isLoadingAuth) return;

    // NOT authenticated → show login (WorldAccessScreen)
    if (!isAuthenticated || !user) {
      setStep(STEP.NOT_AUTHED);
      return;
    }

    // User IS authenticated — use their profile data directly from auth.me()
    // (includes custom fields like world_username, uvc_rules_accepted, etc.)
    if (!user.world_username) {
      setStep(STEP.SETUP_USERNAME);
    } else if (!user.avatar_type && !user.rpm_avatar_url) {
      setStep(STEP.SETUP_AVATAR);
    } else if (
      !user.uvc_rules_accepted ||
      !user.uvc_agreement_accepted ||
      user.uvc_agreement_version !== UVC_AGREEMENT_VERSION
    ) {
      setStep(STEP.SHOW_RULES);
    } else {
      setChatAgeConfirmed(!!user.uvc_chat_age_confirmed);
      setStep(STEP.READY);
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  // ── Callbacks ──────────────────────────────────────────────────
  const handleUsernameComplete = useCallback(() => {
    setStep(STEP.SETUP_AVATAR);
  }, []);

  const handleAvatarComplete = useCallback(() => {
    setStep(STEP.SHOW_RULES);
  }, []);

  const handleRulesAccepted = useCallback(() => {
    setStep(STEP.SHOW_AGREEMENT);
  }, []);

  const handleAgreementAccepted = useCallback(async (opts) => {
    try {
      await base44.auth.updateMe({
        uvc_rules_accepted: true,
        uvc_agreement_accepted: true,
        uvc_chat_age_confirmed: opts.chatAgeConfirmed,
        uvc_accepted_date: new Date().toISOString(),
        uvc_agreement_version: UVC_AGREEMENT_VERSION,
      });
      setChatAgeConfirmed(opts.chatAgeConfirmed);
      setStep(STEP.READY);
    } catch (err) {
      // If update fails, still let them enter
      setChatAgeConfirmed(opts.chatAgeConfirmed);
      setStep(STEP.READY);
    }
  }, []);

  const handleDecline = useCallback(() => {
    // Send them back to home on decline
    window.location.href = "/";
  }, []);

  // ── Render ────────────────────────────────────────────────────
  if (step === STEP.LOADING) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050510" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          <p className="text-xs text-purple-200/50 font-medium tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  if (step === STEP.NOT_AUTHED) {
    return <WorldAccessScreen />;
  }

  if (step === STEP.SETUP_USERNAME) {
    return <UsernameSetup onComplete={handleUsernameComplete} />;
  }

  if (step === STEP.SETUP_AVATAR) {
    return (
      <RPMAvatarCreator
        onComplete={handleAvatarComplete}
        existingUrl={user?.rpm_avatar_url || null}
        existingType={user?.avatar_type || null}
        existingTone={user?.skin_tone || null}
        existingStyle={user?.avatar_style || null}
      />
    );
  }

  if (step === STEP.SHOW_RULES) {
    return (
      <>
        <CommunityRulesModal
          open={true}
          onAccept={handleRulesAccepted}
          onDecline={handleDecline}
        />
        {/* Show a backdrop behind the modal */}
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050510" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="text-xs text-purple-200/50 font-medium tracking-wider">Preparing Upper Vibe City...</p>
          </div>
        </div>
      </>
    );
  }

  if (step === STEP.SHOW_AGREEMENT) {
    return (
      <>
        <UserAgreementModal
          open={true}
          onAccept={handleAgreementAccepted}
          onDecline={handleDecline}
          chatAgeConfirmed={chatAgeConfirmed}
        />
        {/* Show a backdrop behind the modal */}
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050510" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="text-xs text-purple-200/50 font-medium tracking-wider">Preparing Upper Vibe City...</p>
          </div>
        </div>
      </>
    );
  }

  // READY — render children with chat age context
  if (step === STEP.READY) {
    // Clone children and inject chatAgeConfirmed prop
    return React.cloneElement(children, { chatAgeConfirmed });
  }

  return null;
}