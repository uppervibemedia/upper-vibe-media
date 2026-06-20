import React from "react";
import { motion } from "framer-motion";
import { Compass, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

export default function WorldAccessScreen() {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-5"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-120px] left-[10%] w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle,#00A0DC,transparent 70%)", opacity: 0.12 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.16, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-120px] right-[5%] w-[480px] h-[480px] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle,#9B7EFF,transparent 70%)", opacity: 0.12 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-6"
      >
        {/* Icon */}
        <motion.div
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 30% 30%,rgba(0,160,220,0.4),rgba(155,126,255,0.25))",
            border: "1px solid rgba(155,126,255,0.4)",
            boxShadow: "0 0 50px rgba(0,160,220,0.35)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Compass className="w-9 h-9 text-white" />
        </motion.div>

        {/* Headline */}
        <div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-white mb-3">
            Upper Vibe <span style={{ color: "#00A0DC" }}>City</span>
          </h1>
          <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto">
            Log in or create an Upper Vibe Media account to enter Upper Vibe City.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#0080B8,#00A0DC)",
              color: "#fff",
              boxShadow: "0 0 30px rgba(0,160,220,0.4)",
            }}
          >
            <LogIn className="w-4 h-4" /> Log In
          </Link>

          <Link
            to="/register"
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(155,126,255,0.3)",
              color: "#9B7EFF",
            }}
          >
            <UserPlus className="w-4 h-4" /> Create Account
          </Link>
        </div>

        <Link
          to="/"
          className="text-xs font-bold transition-colors hover:text-white/60"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          ← Back to Home
        </Link>
      </motion.div>
    </div>
  );
}