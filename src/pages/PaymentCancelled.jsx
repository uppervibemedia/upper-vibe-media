import React from "react";
import { motion } from "framer-motion";
import { XCircle, Waves } from "lucide-react";
import { Link } from "react-router-dom";

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 pb-28 lg:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md w-full"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <XCircle className="w-10 h-10 text-white/30" />
        </div>

        <h1 className="font-heading font-black text-white text-3xl mb-3">Payment Cancelled</h1>
        <p className="text-white/40 text-base leading-relaxed mb-10">
          No worries. You can still stream every 432 Hz song for free.
        </p>

        {/* Free streaming reminder */}
        <div className="p-5 rounded-2xl mb-8 text-left"
          style={{ background: "rgba(0,200,220,0.05)", border: "1px solid rgba(0,200,220,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-black text-cyan-400 tracking-wide">Free Access Includes</span>
          </div>
          <ul className="space-y-1.5 text-sm text-white/50">
            <li>✓ Stream all 432 Hz songs</li>
            <li>✓ Upper Vibe Radio</li>
            <li>✓ Browse artists & visualizers</li>
            <li>✓ Save to My Vibe Library</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/membership"
            className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 text-center"
            style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
            Return to Membership
          </Link>
          <Link to="/music"
            className="w-full py-3 rounded-2xl font-semibold text-sm text-white/40 hover:text-white/70 transition-colors text-center"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            Keep Listening Free
          </Link>
        </div>
      </motion.div>
    </div>
  );
}