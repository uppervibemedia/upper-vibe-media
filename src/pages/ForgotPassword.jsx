import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
      setSent(true);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg,hsl(240 50% 2%),hsl(240 40% 4%))" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <img
            src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
            alt="Upper Vibe Media"
            className="w-9 h-9 object-contain"
          />
          <div>
            <p className="font-heading font-black text-sm tracking-[0.2em] text-white">UPPER VIBE</p>
            <p className="text-[9px] tracking-wider text-yellow-400/50 uppercase">Media</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-8 text-center"
              style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}
            >
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: "#00E5FF" }} />
              <h2 className="font-heading font-bold text-xl text-white mb-2">Check Your Email</h2>
              <p className="text-sm text-white/45 leading-relaxed mb-6">
                We sent a password reset link to <span className="text-white/70 font-semibold">{email}</span>. Click the link in that email to create a new password.
              </p>
              <p className="text-xs text-white/25 mb-6">Didn't receive it? Check your spam folder or try again.</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Upper Vibe
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h1 className="font-heading font-extrabold text-2xl text-white mb-1">Forgot Password?</h1>
                <p className="text-sm text-white/35 mb-7 leading-relaxed">
                  Enter the email address linked to your account and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="Your email address"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-xs text-red-400"
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
              </div>

              <div className="mt-5 text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Upper Vibe
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}