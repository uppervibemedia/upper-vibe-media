import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, CheckCircle2, AlertCircle, Loader2, Wrench, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StripeRepairPanel() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = async (action) => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await base44.functions.invoke("adminStripeSync", {
        userEmail: email.trim().toLowerCase(),
        action,
      });
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Unknown error");
    }
    setLoading(false);
  };

  const sub = result?.subscription;
  const appUser = result?.appUser;
  const isActive = sub?.status === "active" || sub?.status === "trialing";
  const isRepaired = result?.repaired === true;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Search box */}
      <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">User Email</p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run("check")}
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/30 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={() => run("check")}
            disabled={loading || !email.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "rgba(0,160,220,0.15)", border: "1px solid rgba(0,160,220,0.3)", color: "#00A0DC" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Check
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400"
          style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Repair success banner */}
            {isRepaired && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-green-400"
                style={{ background: "rgba(50,220,100,0.08)", border: "1px solid rgba(50,220,100,0.25)" }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {result.message}
              </div>
            )}

            {/* App user record */}
            <div className="p-4 rounded-2xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">App User Record</p>
              {appUser && Object.entries(appUser).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-xs gap-4">
                  <span className="text-white/40 font-mono">{k}</span>
                  <span className={`font-mono font-bold truncate max-w-[60%] text-right ${
                    v === true ? "text-green-400" : v === false ? "text-red-400" : "text-white/70"
                  }`}>{String(v ?? "—")}</span>
                </div>
              ))}
            </div>

            {/* Stripe data */}
            {result.stripeCustomer && (
              <div className="p-4 rounded-2xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">Stripe</p>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-mono">customer_id</span>
                  <span className="text-white/70 font-mono">{result.stripeCustomer.id}</span>
                </div>
                {sub ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40 font-mono">subscription</span>
                      <span className={`font-mono font-bold ${isActive ? "text-green-400" : "text-red-400"}`}>{sub.status}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40 font-mono">amount</span>
                      <span className="text-white/70 font-mono">${(sub.amount / 100).toFixed(2)}/mo</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40 font-mono">renews</span>
                      <span className="text-white/70 font-mono">{new Date(sub.current_period_end).toLocaleDateString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-red-400 font-mono">No subscription found</div>
                )}
              </div>
            )}

            {/* Repair button */}
            {result.stripeCustomer && !isRepaired && (
              <button
                onClick={() => run("repair")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 disabled:opacity-50"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg,#D4A843,#F0C060)"
                    : "rgba(255,255,255,0.06)",
                  color: isActive ? "#000" : "rgba(255,255,255,0.3)",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                  cursor: isActive ? "pointer" : "not-allowed",
                }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                {isActive ? "Repair — Grant Plus Access" : "No Active Subscription to Repair"}
              </button>
            )}

            {/* Re-check after repair */}
            {isRepaired && (
              <button
                onClick={() => run("check")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white/40 hover:text-white/70 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <RefreshCw className="w-3.5 h-3.5" /> Re-check
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}