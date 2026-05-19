import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import Footer from "../components/shared/Footer";

export default function DMCAPolicy() {
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: "#00E5FF" }}>Legal</p>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2 text-white">DMCA / Copyright Policy</h1>
          <p className="text-xs text-white/25 mb-12">Last updated: May 2026</p>

          <div className="rounded-xl p-5 mb-10 flex gap-4" style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.15)" }}>
            <ShieldAlert className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/50 leading-relaxed">
              Upper Vibe Media respects the intellectual property rights of others and expects users to do the same. We comply with the Digital Millennium Copyright Act (DMCA) and respond promptly to valid copyright takedown notices.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="font-heading font-bold text-lg mb-3" style={{ color: "#00E5FF" }}>Copyright Takedown Request Process</h2>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>If you believe that content available on Upper Vibe Media infringes your copyright, you may submit a DMCA takedown notice to us by email. We will review all valid notices and take appropriate action, which may include removing or disabling access to the allegedly infringing content.</p>
              <p>We will make reasonable efforts to notify the content uploader of the takedown. Repeat infringers may have their accounts terminated.</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-heading font-bold text-lg mb-3" style={{ color: "#00E5FF" }}>How to Submit a Copyright Claim</h2>
            <div className="text-sm text-white/50 leading-relaxed space-y-2">
              <p>Send your DMCA notice by email to:</p>
              <a
                href="mailto:uppervibemedia@gmail.com"
                className="inline-block font-bold text-cyan-400 hover:underline text-base"
              >
                uppervibemedia@gmail.com
              </a>
              <p className="mt-3">Use the subject line: <span className="text-white/70 font-semibold">DMCA Copyright Claim</span></p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-heading font-bold text-lg mb-3" style={{ color: "#00E5FF" }}>Required Information for a Valid Claim</h2>
            <div className="text-sm text-white/50 leading-relaxed">
              <p className="mb-3">Your notice must include all of the following:</p>
              <ol className="space-y-3 list-none">
                {[
                  "Your full legal name and contact information (email address, mailing address, and phone number).",
                  "A description of the copyrighted work you claim has been infringed.",
                  "The specific URL(s) on Upper Vibe Media where the allegedly infringing content is located.",
                  "A statement that you have a good faith belief that the use of the content is not authorized by the copyright owner, its agent, or the law.",
                  "A statement that the information in your notice is accurate, and under penalty of perjury, that you are the copyright owner or authorized to act on behalf of the copyright owner.",
                  "Your physical or electronic signature."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>{i + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-heading font-bold text-lg mb-3" style={{ color: "#00E5FF" }}>Counter-Notification</h2>
            <div className="text-sm text-white/50 leading-relaxed">
              <p>If you believe your content was removed in error, you may submit a counter-notification to the same email address with your full contact information, a description of the removed content, a statement under penalty of perjury that you have a good faith belief the content was removed in error, and your consent to jurisdiction.</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-white/25">All copyright inquiries: <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a></p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}