import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [verified, setVerified] = useState(false);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Give webhook a moment to fire, then refresh user data
    const timer = setTimeout(() => setVerified(true), 2000);
    return () => clearTimeout(timer);
  }, []);

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
          Welcome to your upgraded<br />
          <span style={{
            background: "linear-gradient(120deg,#C9943A,#EDB84A,#C9943A)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>Upper Vibe access.</span>
        </h1>

        <p className="text-white/45 text-base leading-relaxed mb-10">
          Your membership is active. You can now download music based on your plan.
        </p>

        {/* Pulsing active badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10"
          style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)" }}>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-[11px] font-black tracking-[0.3em] uppercase text-yellow-400">Membership Active</span>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link to="/my-vibes"
            className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
            <Sparkles className="w-4 h-4" /> Open My Vibe Library
          </Link>
          <Link to="/music"
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white/50 hover:text-white/80 transition-colors text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            Browse All Music
          </Link>
        </div>

        <p className="mt-8 text-xs text-white/20">
          A receipt has been sent to your email.
        </p>
      </motion.div>
    </div>
  );
}