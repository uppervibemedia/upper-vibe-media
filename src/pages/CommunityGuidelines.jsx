import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Flag, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/shared/Footer";

const Rule = ({ emoji, title, children }) => (
  <div className="flex gap-4 mb-6">
    <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
    <div>
      <h3 className="font-heading font-bold text-white text-sm mb-1">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{children}</p>
    </div>
  </div>
);

export default function CommunityGuidelines() {
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: "#00E5FF" }}>Community</p>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2 text-white">Community Guidelines</h1>
          <p className="text-xs text-white/25 mb-4">Last updated: June 2026</p>
          <p className="text-sm text-white/40 leading-relaxed mb-12 max-w-xl">
            The Vibe Room is a space for conscious listeners to connect, share energy, and raise the frequency together. To keep it safe and positive for everyone, all members agree to these guidelines.
          </p>

          {/* The Rules */}
          <div className="rounded-2xl p-7 mb-10" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-heading font-bold text-base mb-6" style={{ color: "#00E5FF" }}>Vibe Room Rules</h2>

            <Rule emoji="✊" title="Keep It Respectful">
              Treat every member with respect. Disagreements happen — but personal attacks, insults, and disrespectful language are not allowed.
            </Rule>
            <Rule emoji="🚫" title="No Harassment or Threats">
              Harassment, bullying, threatening language, or targeting any individual or group is strictly prohibited and may result in an immediate ban.
            </Rule>
            <Rule emoji="🔇" title="No Spam">
              Do not flood the chat with repeated messages, promotions, or links. Promotional content and self-advertising are not permitted.
            </Rule>
            <Rule emoji="❌" title="No Hate Speech">
              Content that attacks, demeans, or promotes hatred based on race, ethnicity, religion, gender, sexual orientation, disability, or any other characteristic is not allowed.
            </Rule>
            <Rule emoji="🔞" title="No Explicit or Illegal Content">
              Do not share explicit sexual content, illegal material, or content that glorifies violence or illegal activity.
            </Rule>
            <Rule emoji="👤" title="No Impersonation">
              Do not impersonate other members, artists, Upper Vibe Media staff, or public figures.
            </Rule>
            <Rule emoji="🔒" title="Protect Private Information">
              Do not share your own or anyone else's private information (phone numbers, addresses, emails, financial details) in the chat.
            </Rule>
            <Rule emoji="🎵" title="Keep It on Topic">
              The Vibe Room is about music, energy, and community. Keep the conversation aligned with the Upper Vibe frequency.
            </Rule>
          </div>

          {/* Moderation */}
          <div className="rounded-2xl p-7 mb-10" style={{ background: "rgba(0,160,220,0.04)", border: "1px solid rgba(0,160,220,0.15)" }}>
            <div className="flex items-center gap-3 mb-5">
              <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <h2 className="font-heading font-bold text-base text-white">Moderation</h2>
            </div>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Upper Vibe Media moderators may remove messages, mute, or ban members who violate these guidelines — at any time and without prior notice. Decisions are final.</p>
              <p>Repeat offenders or those engaging in serious violations may be permanently removed from the Vibe Room without refund of any subscription payments.</p>
            </div>
          </div>

          {/* AI Guide */}
          <div className="rounded-2xl p-7 mb-10" style={{ background: "rgba(155,126,255,0.04)", border: "1px solid rgba(155,126,255,0.15)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Bot className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <h2 className="font-heading font-bold text-base text-white">Vibe Guide — AI Moderator</h2>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              The Vibe Guide is an <strong className="text-white/70">AI-powered moderation assistant</strong>, not a human. It may provide prompts, reminders, and community support. Any AI-generated content in the Vibe Room is clearly labeled. The Vibe Guide does not replace human moderation.
            </p>
          </div>

          {/* Reporting */}
          <div className="rounded-2xl p-7 mb-10" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Flag className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <h2 className="font-heading font-bold text-base text-white">How to Report Content</h2>
            </div>
            <div className="text-sm text-white/50 leading-relaxed space-y-2">
              <p>You can report any message in the Vibe Room by tapping the flag (🚩) icon on the message. Reports are reviewed by our moderation team.</p>
              <p>For urgent concerns or to report a user not visible in chat, contact us directly:</p>
              <a href="mailto:uppervibemedia@gmail.com?subject=Vibe Room Report"
                className="inline-block font-bold text-cyan-400 hover:underline mt-1">
                uppervibemedia@gmail.com
              </a>
            </div>
          </div>

          {/* Agreement */}
          <div className="text-sm text-white/30 leading-relaxed mb-10">
            By using the Vibe Room or any community features of Upper Vibe Media, you agree to these guidelines and our{" "}
            <Link to="/terms" className="text-cyan-400 hover:underline">Terms & Conditions</Link>. Violations may result in account suspension or termination.
          </div>

          <div className="mt-10 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-white/25">Questions? Contact us at <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a></p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}