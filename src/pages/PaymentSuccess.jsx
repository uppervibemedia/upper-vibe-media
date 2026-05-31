import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const MAX_RETRIES = 8;
const RETRY_INTERVAL_MS = 2500;

// Keys used to store return destination before checkout
const RETURN_URL_KEY = "checkoutReturnUrl";

export function saveCheckoutReturnUrl(url) {
  try { sessionStorage.setItem(RETURN_URL_KEY, url); } catch {}
}

function consumeCheckoutReturnUrl() {
  try {
    const url = sessionStorage.getItem(RETURN_URL_KEY);
    sessionStorage.removeItem(RETURN_URL_KEY);
    return url;
  } catch { return null; }
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { checkAppState, isPlus, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("activating"); // "activating" | "ready" | "timeout"
  const [retryCount, setRetryCount] = useState(0);
  const hasStarted = useRef(false);
  const returnUrl = useRef(consumeCheckoutReturnUrl());

  const isTestMode = searchParams.get("test_mode") === "true";

  // Determine where Continue should go
  const getContinueUrl = () => {
    if (returnUrl.current) return returnUrl.current;
    if (isAdmin) return "/admin";
    return "/my-vibe-library";
  };

  useEffect(() => {
    // Guard: only run once even if component re-renders
    if (hasStarted.current) return;
    hasStarted.current = true;

    let attempt = 0;
    let cancelled = false;

    const tryRefresh = async () => {
      if (cancelled) return;
      await checkAppState();
      attempt++;
      setRetryCount(attempt);
    };

    // First refresh after 2s (give webhook time to fire)
    const initialTimer = setTimeout(async () => {
      await tryRefresh();

      // Poll every RETRY_INTERVAL_MS until Plus is confirmed or max retries hit
      const interval = setInterval(async () => {
        if (cancelled) { clearInterval(interval); return; }
        await tryRefresh();
        if (attempt >= MAX_RETRIES) {
          clearInterval(interval);
          setPhase("timeout");
        }
      }, RETRY_INTERVAL_MS);

      return () => clearInterval(interval);
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once Plus is confirmed, advance to ready
  useEffect(() => {
    if ((isPlus || isAdmin) && phase === "activating") {
      setPhase("ready");
    }
  }, [isPlus, isAdmin, phase]);

  const handleContinue = () => {
    navigate(getContinueUrl());
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pb-28 lg:pb-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md w-full"
      >
        {/* Icon */}
        <div className="relative inline-flex mb-8">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.15),rgba(212,168,67,0.06))", border: "1px solid rgba(212,168,67,0.3)" }}>
            <CheckCircle2 className="w-12 h-12 text-yellow-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,200,220,0.15)", border: "1px solid rgba(0,200,220,0.3)" }}>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-heading font-black text-white mb-3"
          style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)" }}>
          Welcome to<br />
          <span style={{
            background: "linear-gradient(120deg,#C9943A,#EDB84A,#C9943A)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>Upper Vibe Plus</span>
        </h1>

        <p className="text-white/45 text-base leading-relaxed mb-8">
          Your Plus membership is active. Download music, access the full Academy, and unlock Plus features.
        </p>

        {isTestMode && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-yellow-400">Test Mode — No Real Charge</span>
          </div>
        )}

        {/* Activation status */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)" }}>
          {phase === "activating" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-yellow-400/70">Activating Plus Access…</span>
            </>
          ) : phase === "ready" ? (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[11px] font-black tracking-[0.3em] uppercase text-yellow-400">Plus Active</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-yellow-400/70">Payment Received</span>
            </>
          )}
        </div>

        {phase === "timeout" && (
          <p className="text-xs text-white/35 mb-6 leading-relaxed max-w-xs mx-auto">
            Payment received. Your Plus access is still activating — it may take a moment to sync. Tap Continue and refresh your account if needed.
          </p>
        )}

        {/* Continue button — always shown */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
            <Sparkles className="w-4 h-4" />
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/music")}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white/50 hover:text-white/80 transition-colors text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            Browse All Music
          </button>
        </div>

        <p className="mt-8 text-xs text-white/20">
          A receipt has been sent to your email.
        </p>
      </motion.div>
    </div>
  );
}