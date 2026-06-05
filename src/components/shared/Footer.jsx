import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Waves, Mail, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { trackEmailSignup } from "@/lib/analytics";

const footerLinks = [
  {
    title: "Music",
    links: [
      { label: "All Music", to: "/music" },
      { label: "Categories", to: "/categories" },
      { label: "Downloads", to: "/downloads" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Join Email List", to: "/email-list" },
      { label: "Contact / Support", to: "/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "DMCA / Copyright", to: "/dmca" },
      { label: "Refund Policy", to: "/refunds" },
      { label: "Community Guidelines", to: "/community-guidelines" },
    ],
  },
];

function FooterEmailSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    // Check for duplicate before inserting
    const existing = await base44.entities.EmailSubscriber.filter({ email }, "-created_date", 1);
    if (existing.length === 0) {
      await base44.entities.EmailSubscriber.create({
        email,
        source_page: "footer",
        referrer:    document.referrer || "",
        subscribed_status: "active",
      });
      trackEmailSignup(); // only fires after confirmed DB write
    }
    setSaving(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-xs text-cyan-400">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        You're on the list!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      />
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg font-black text-[10px] tracking-wider transition-all hover:brightness-110 flex-shrink-0 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff" }}>
        {saving ? "..." : "Notify Me"}
      </button>
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="border-t mt-10" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(4,4,14,0.8)" }}>
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
                alt="Upper Vibe Media"
                className="w-8 h-8 object-contain"
              />
              <div>
                <p className="font-heading font-black text-xs tracking-[0.2em] text-white">UPPER VIBE</p>
                <p className="text-[9px] tracking-wider text-yellow-400/50 uppercase">Media</p>
              </div>
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">
              A private high-vibration music vault and learning hub for conscious listeners.
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold tracking-widest uppercase"
              style={{ color: "#00A0DC" }}>
              <Waves className="w-3 h-3" /> Stream The Frequency
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-xs text-white/40 hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Email signup column */}
          <div className="col-span-2 md:col-span-1 hidden md:block">
            <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 mb-4 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Stay Updated
            </h4>
            <p className="text-xs text-white/30 mb-3 leading-relaxed">
              New 432 Hz drops, visualizers & exclusive releases — straight to your inbox.
            </p>
            <FooterEmailSignup />
            <p className="text-[10px] text-white/20 mt-2 leading-relaxed">
              By joining, you agree to receive updates from Upper Vibe Media. Unsubscribe anytime. See our{" "}
              <Link to="/privacy" className="text-white/35 hover:text-white/60 underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[10px] text-white/20">
            © 2026 Upper Vibe Media. All rights reserved.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/terms" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Terms</Link>
            <Link to="/privacy" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Privacy</Link>
            <Link to="/dmca" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">DMCA</Link>
            <Link to="/refunds" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Refunds</Link>
            <Link to="/support" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Support</Link>
            <Link to="/community-guidelines" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Guidelines</Link>
            <Link to="/forgot-password" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Reset Password</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}