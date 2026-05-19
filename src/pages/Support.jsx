import React from "react";
import { motion } from "framer-motion";
import { Mail, MessageCircle, Shield, CreditCard, Music } from "lucide-react";
import Footer from "../components/shared/Footer";

const SUPPORT_EMAIL = "uppervibemedia@gmail.com";

const topics = [
  { icon: MessageCircle, label: "General Support", desc: "Account help, login issues, platform questions" },
  { icon: Shield, label: "Copyright / DMCA", desc: "Copyright takedown requests and disputes" },
  { icon: CreditCard, label: "Payment Issues", desc: "Billing questions, subscription help, refunds" },
  { icon: Music, label: "Music & Content", desc: "Track issues, download problems, content requests" },
];

export default function Support() {
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: "#00E5FF" }}>Help</p>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-4 text-white">Contact Upper Vibe Media</h1>
          <p className="text-sm text-white/40 leading-relaxed mb-12 max-w-xl">
            For support, account help, copyright requests, or payment issues, contact Upper Vibe Media support.
          </p>

          {/* Primary email CTA */}
          <div
            className="rounded-2xl p-8 mb-12 text-center"
            style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              <Mail className="w-6 h-6" style={{ color: "#00E5FF" }} />
            </div>
            <p className="text-xs tracking-[0.25em] uppercase text-white/30 mb-2">Support Email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-heading font-bold text-xl md:text-2xl hover:opacity-80 transition-opacity"
              style={{ color: "#00E5FF" }}
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="text-xs text-white/25 mt-4">Tap to open your mail app</p>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 mt-6 px-8 py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}
            >
              <Mail className="w-4 h-4" />
              Email Support
            </a>
          </div>

          {/* Topic cards */}
          <h2 className="font-heading font-bold text-base text-white/60 mb-5 tracking-wider uppercase text-sm">What We Can Help With</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {topics.map(({ icon: Icon, label, desc }) => (
              <a
                key={label}
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(label)}`}
                className="rounded-xl p-5 flex gap-4 items-start transition-all hover:brightness-110 group"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,229,255,0.08)" }}
                >
                  <Icon className="w-4 h-4" style={{ color: "#00E5FF" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/70 group-hover:text-white/90 transition-colors">{label}</p>
                  <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </a>
            ))}
          </div>

          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs text-white/25 leading-relaxed">
              We typically respond within 1–3 business days. For urgent copyright or billing matters, please include relevant details in your subject line.
            </p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}