import React, { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, ExternalLink, CheckCircle2, AlertCircle, Loader2, Copy, CreditCard, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const TEST_CARD = "4242 4242 4242 4242";
const TEST_CARD_EXP = "12/29";
const TEST_CARD_CVC = "424";

export default function StripeTestPanel() {
  const { user, checkAppState } = useAuth();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [copied, setCopied]     = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const handleTestCheckout = async () => {
    if (window.self !== window.top) {
      alert("Test checkout must be run from the published app, not the builder preview.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("stripeCheckoutTest", {
        billingCycle,
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&test_mode=true`,
        cancelUrl:  `${window.location.origin}/payment-cancelled?test_mode=true`,
      });
      const data = res.data;

      if (data.error) {
        setResult({ ok: false, error: data.error });
        return;
      }

      // Verify it's a test session
      const isTestSession = data.sessionId?.startsWith("cs_test_");
      setResult({
        ok:        isTestSession,
        sessionId: data.sessionId,
        url:       data.url,
        isTest:    isTestSession,
        livemode:  data.livemode,
      });

      if (isTestSession) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      setResult({ ok: false, error: err.message });
    }
    setLoading(false);
  };

  const handleRefreshAuth = async () => {
    setRefreshing(true);
    await checkAppState();
    setRefreshing(false);
  };

  const isAdmin = user?.role === "admin";
  const isPlus  = isAdmin || user?.isPlus === true || user?.tier === "plus" || user?.tier === "premium";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
        <FlaskConical className="w-5 h-5 text-yellow-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-black text-yellow-300">TEST MODE — No Real Charges</p>
          <p className="text-xs text-yellow-400/60 mt-0.5">Uses Stripe test keys only. Requires <code className="text-yellow-300/80">STRIPE_TEST_SECRET_KEY</code> to be set.</p>
        </div>
      </div>

      {/* Test Card Info */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 space-y-3">
        <p className="text-xs font-black tracking-[0.2em] uppercase text-white/30 mb-4">Stripe Test Card</p>
        {[
          { label: "Card Number", value: TEST_CARD, key: "card" },
          { label: "Expiry",      value: TEST_CARD_EXP, key: "exp" },
          { label: "CVC",         value: TEST_CARD_CVC, key: "cvc" },
          { label: "ZIP",         value: "Any 5 digits", key: "zip", noCopy: true },
        ].map(({ label, value, key, noCopy }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-xs text-white/35 w-24 flex-shrink-0">{label}</span>
            <div className="flex items-center gap-2 flex-1">
              <code className="text-sm font-bold text-white/80 font-mono">{value}</code>
              {!noCopy && (
                <button
                  onClick={() => handleCopy(value.replace(/\s/g, ""), key)}
                  className="ml-auto p-1.5 rounded-lg transition-colors"
                  style={{ background: copied === key ? "rgba(0,200,100,0.1)" : "rgba(255,255,255,0.05)" }}>
                  {copied === key
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    : <Copy className="w-3.5 h-3.5 text-white/30" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Billing Cycle Selector */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <p className="text-xs font-black tracking-[0.2em] uppercase text-white/30 mb-4">Billing Cycle to Test</p>
        <div className="flex gap-3">
          {["monthly", "yearly"].map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className="flex-1 py-3 rounded-xl text-sm font-black tracking-wider uppercase transition-all"
              style={{
                background: billingCycle === cycle ? "rgba(0,160,220,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${billingCycle === cycle ? "rgba(0,160,220,0.4)" : "rgba(255,255,255,0.07)"}`,
                color: billingCycle === cycle ? "rgb(0,160,220)" : "rgba(255,255,255,0.4)",
              }}>
              {cycle === "monthly" ? "$4.99 / month" : "$49.99 / year"}
            </button>
          ))}
        </div>
      </div>

      {/* Launch Test Checkout */}
      <button
        onClick={handleTestCheckout}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm tracking-wider transition-all disabled:opacity-60 hover:brightness-110"
        style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.8),rgba(245,158,11,1))", color: "#000" }}>
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating test session...</>
          : <><CreditCard className="w-4 h-4" /> Launch TEST Checkout</>}
      </button>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-5 space-y-3"
          style={{
            background: result.ok ? "rgba(0,200,100,0.05)" : "rgba(239,68,68,0.07)",
            borderColor: result.ok ? "rgba(0,200,100,0.2)" : "rgba(239,68,68,0.25)",
          }}>
          <div className="flex items-center gap-2">
            {result.ok
              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
              : <AlertCircle className="w-4 h-4 text-red-400" />}
            <p className="text-sm font-black" style={{ color: result.ok ? "#4ade80" : "#f87171" }}>
              {result.ok ? "Test session created — Stripe checkout opened" : "Error"}
            </p>
          </div>

          {result.error && (
            <p className="text-xs text-red-300/70 font-mono bg-red-900/20 rounded-lg px-3 py-2">{result.error}</p>
          )}

          {result.sessionId && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30 w-24 flex-shrink-0">Session ID</span>
                <code className="text-xs font-mono text-white/60 truncate">{result.sessionId}</code>
                {result.isTest
                  ? <span className="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">cs_test_ ✓</span>
                  : <span className="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 flex-shrink-0">⚠ LIVE!</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30 w-24 flex-shrink-0">Mode</span>
                <span className={`text-xs font-bold ${result.livemode ? "text-red-400" : "text-green-400"}`}>
                  {result.livemode ? "⚠ LIVE MODE" : "✓ Test Mode"}
                </span>
              </div>
              {result.url && (
                <a href={result.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors mt-2">
                  <ExternalLink className="w-3 h-3" /> Re-open checkout URL
                </a>
              )}
            </div>
          )}

          {result.error === "Test mode not configured. Set STRIPE_TEST_SECRET_KEY." && (
            <div className="text-xs text-yellow-300/70 mt-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
              <p className="font-bold mb-1">Setup Required:</p>
              <ol className="list-decimal list-inside space-y-1 text-yellow-400/60">
                <li>Go to Stripe Dashboard → Developers → API Keys</li>
                <li>Copy your <strong>test secret key</strong> (starts with <code>sk_test_</code>)</li>
                <li>Add it as <code>STRIPE_TEST_SECRET_KEY</code> in Base44 secrets</li>
                <li>Return here and click Launch TEST Checkout again</li>
              </ol>
            </div>
          )}
        </motion.div>
      )}

      {/* Current user status + refresh */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black tracking-[0.2em] uppercase text-white/30">Current User Status</p>
          <button
            onClick={handleRefreshAuth}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
            style={{ background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.2)", color: "rgb(0,160,220)" }}>
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Auth
          </button>
        </div>
        <div className="space-y-2">
          <Row label="Email"   value={user?.email} />
          <Row label="Role"    value={user?.role} />
          <Row label="isPlus"  value={String(isPlus)}   highlight={isPlus ? "green" : "red"} />
          <Row label="tier"    value={user?.tier || "—"} />
          <Row label="status"  value={user?.subscriptionStatus || "—"} />
          <Row label="testSub" value={user?.testSubscription ? "true" : "false"} />
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <p className="text-xs font-black tracking-[0.2em] uppercase text-white/30 mb-4">Test Checklist</p>
        <div className="space-y-2">
          {[
            "Session ID starts with cs_test_",
            "Checkout page shows 'Upper Vibe Plus [TEST]' or correct product",
            "Price shows $4.99/month or $49.99/year",
            "No 'Premium' wording on checkout page",
            "After payment: success page loads at /payment-success",
            "After payment: click 'Refresh Auth' above — isPlus turns green",
            "Downloads section accessible at /downloads",
            "My Vibe Library accessible at /my-vibes",
            "Account page shows 'Upper Vibe Plus' membership",
            "Account → Manage Subscription opens Stripe portal",
            "Cancel flow: /payment-cancelled loads, isPlus stays false",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-white/40">
              <div className="w-4 h-4 rounded border border-white/10 flex-shrink-0 mt-0.5" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  const color = highlight === "green" ? "text-green-400" : highlight === "red" ? "text-red-400" : "text-white/60";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/25 w-16 flex-shrink-0">{label}</span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value || "—"}</span>
    </div>
  );
}