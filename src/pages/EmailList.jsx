import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Footer from "../components/shared/Footer";
import { trackEmailSignup } from "@/lib/analytics";

export default function EmailList() {
  const [form, setForm] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) return;
    setSaving(true);
    // Check for duplicate before inserting
    const existing = await base44.entities.EmailSubscriber.filter({ email: form.email }, "-created_date", 1);
    if (existing.length === 0) {
      await base44.entities.EmailSubscriber.create({
        email: form.email,
        source_page: "/email-list",
        referrer:    document.referrer || "",
        subscribed_status: "active",
      });
      trackEmailSignup(); // only fires after confirmed DB write
    }
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
            <Mail className="w-3 h-3" /> Join The List
          </div>

          {!submitted ? (
            <>
              <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-4 leading-tight">
                Get Notified When<br />
                <span style={{ color: "#D4A843" }}>New Music Drops</span>
              </h1>
              <p className="text-white/40 text-sm leading-relaxed mb-10 max-w-md">
                Join the Upper Vibe Media list for new 432 Hz songs, visualizers, exclusive drops, and high-vibe updates.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(0,229,255,0.35)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Your email address *"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full px-5 py-4 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(0,229,255,0.35)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", boxShadow: "0 0 32px rgba(0,229,255,0.25)" }}>
                  {saving ? "Locking you in..." : "Notify Me"}
                </button>
              </form>

              <p className="text-white/20 text-xs mt-5 text-center leading-relaxed">
                By joining, you agree to receive updates from Upper Vibe Media. Unsubscribe anytime.{" "}
                See our{" "}
                <a href="/privacy" className="underline underline-offset-2 hover:text-white/50 transition-colors">Privacy Policy</a>.
              </p>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)" }}>
                <CheckCircle2 className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="font-heading font-black text-3xl text-white mb-3">You're locked in.</h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">
                New Upper Vibe drops will hit your inbox first. Stay tuned — high-vibe music is coming.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-8 text-[10px] font-black tracking-widest uppercase" style={{ color: "#00E5FF" }}>
                <Waves className="w-3 h-3" /> Upper Vibe Media
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}