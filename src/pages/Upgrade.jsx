import React from "react";
import { motion } from "framer-motion";
import { Crown, Check, Waves, Download, Radio, Heart, Music4, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const BENEFITS = [
  { icon: Download, text: "Download every song" },
  { icon: Waves, text: "Stream all songs free" },
  { icon: Music4, text: "Save 432 Hz music offline" },
  { icon: Radio, text: "Use Upper Vibe Radio" },
  { icon: Heart, text: "Save songs to My Vibe Library" },
  { icon: Crown, text: "Access new downloadable releases" },
  { icon: Check, text: "Support Upper Vibe Media" },
];

const FREE_FEATURES = [
  { included: true, text: "Stream all songs" },
  { included: true, text: "Use Upper Vibe Radio" },
  { included: true, text: "Watch visualizers" },
  { included: true, text: "Browse artists" },
  { included: true, text: "Save to My Vibe Library" },
  { included: false, text: "Download songs" },
];

export default function Upgrade() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.role === "premium" || user?.tier === "premium" || user?.role === "admin";

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    // Stripe integration placeholder
    alert("Stripe checkout coming soon! For now, contact support to upgrade.");
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-12 pt-20 lg:pt-12">
      <div className="max-w-4xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
            style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] font-black tracking-[0.35em] uppercase text-yellow-400">Premium Downloads</span>
          </div>

          <h1 className="font-heading font-black text-white mb-4 leading-tight"
            style={{ fontSize: "clamp(2rem,5vw,3.5rem)" }}>
            Unlock Premium<br />
            <span style={{
              background: "linear-gradient(120deg,#C9943A 0%,#EDB84A 50%,#C9943A 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
            }}>Downloads</span>
          </h1>

          <p className="text-white/45 text-base leading-relaxed max-w-lg mx-auto">
            Stream every 432 Hz song for free. Upgrade to download Upper Vibe Media tracks and save them offline.
          </p>
        </motion.div>

        {/* Already premium */}
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center p-8 rounded-3xl mb-10"
            style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.25)" }}
          >
            <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
            <h2 className="font-heading font-black text-white text-xl mb-2">You're Already Premium</h2>
            <p className="text-white/45 text-sm mb-6">You have full access to all downloads and features.</p>
            <Link to="/music"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
              Browse Music
            </Link>
          </motion.div>
        )}

        {/* Pricing comparison */}
        {!isPremium && (
          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto mb-12">

            {/* Free tier */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl p-6"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30 mb-2">Free Listener</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="font-heading font-black text-3xl text-white">$0</span>
                <span className="text-white/30 text-sm mb-1">/month</span>
              </div>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm">
                    {f.included
                      ? <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      : <X className="w-4 h-4 text-white/20 flex-shrink-0" />}
                    <span className={f.included ? "text-white/65" : "text-white/25"}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-center text-xs text-white/25 font-semibold">Current Plan</div>
            </motion.div>

            {/* Premium tier */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl p-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(145deg,rgba(212,168,67,0.1),rgba(212,168,67,0.04))",
                border: "1px solid rgba(212,168,67,0.3)"
              }}
            >
              {/* Glow */}
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-20 pointer-events-none"
                style={{ background: "#D4A843" }} />

              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-yellow-400">Premium Downloads</p>
                <Crown className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex items-end gap-1 mb-6">
                <span className="font-heading font-black text-3xl text-white">$4.99</span>
                <span className="text-white/40 text-sm mb-1">/month</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {BENEFITS.map((b) => (
                  <li key={b.text} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-white/70">{b.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleUpgrade}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}
              >
                Upgrade To Premium
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full mt-3 py-2.5 text-sm font-semibold text-white/30 hover:text-white/60 transition-colors"
              >
                Keep Listening Free
              </button>
            </motion.div>
          </div>
        )}

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-white/20"
        >
          All plans include free streaming. Cancel premium anytime.
        </motion.p>
      </div>
    </div>
  );
}