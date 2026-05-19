import React from "react";
import { motion } from "framer-motion";
import Footer from "../components/shared/Footer";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-heading font-bold text-lg text-white mb-3" style={{ color: "#00E5FF" }}>{title}</h2>
    <div className="text-sm text-white/50 leading-relaxed space-y-2">{children}</div>
  </div>
);

export default function TermsAndConditions() {
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: "#00E5FF" }}>Legal</p>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2 text-white">Terms &amp; Conditions</h1>
          <p className="text-xs text-white/25 mb-12">Last updated: May 2026</p>

          <Section title="1. Personal Use Only">
            <p>All music, audio content, visualizers, and educational materials available on Upper Vibe Media are licensed for personal, non-commercial use only. You may stream and download content for your own enjoyment but may not resell, redistribute, broadcast, or commercially exploit any content without express written permission from Upper Vibe Media.</p>
          </Section>

          <Section title="2. No Unauthorized Redistribution">
            <p>You agree not to copy, share, upload to third-party platforms, or redistribute any music, audio files, video content, or educational materials from Upper Vibe Media without prior written authorization. Violations may result in immediate account termination and legal action.</p>
          </Section>

          <Section title="3. Subscription Rules">
            <p>Upper Vibe Plus subscriptions are billed on a monthly or annual basis. Your subscription renews automatically unless cancelled before the renewal date. By subscribing, you authorize Upper Vibe Media to charge your payment method on a recurring basis. You may cancel your subscription at any time through your account settings or by contacting support.</p>
          </Section>

          <Section title="4. Download Rules">
            <p>Downloads are available to Upper Vibe Plus subscribers and, where applicable, through one-time purchase. Downloaded files are for personal use only. You may not distribute, resell, or share downloaded files with others. Downloaded content may not be used in derivative works, remixes, or productions without written permission.</p>
          </Section>

          <Section title="5. Support / Tip Payment Rules">
            <p>Support payments and tips made through Upper Vibe Media are voluntary contributions to support the artists and creators. These payments are non-refundable except in cases of clear billing error. Support payments do not grant any license, ownership, or entitlement to additional content or services beyond what is otherwise provided.</p>
          </Section>

          <Section title="6. Account Termination">
            <p>Upper Vibe Media reserves the right to suspend or terminate any account at its sole discretion for violations of these Terms, abuse of the platform, fraudulent activity, chargebacks, or behavior deemed harmful to the Upper Vibe community. In the event of termination, remaining subscription time is forfeited and no refund will be issued unless required by applicable law.</p>
          </Section>

          <Section title="7. Copyright Ownership">
            <p>All music, artwork, audio productions, educational content, and branding on Upper Vibe Media are owned by Upper Vibe Media or its respective artists and licensors. All rights are reserved. Nothing in these Terms grants you any intellectual property rights beyond the limited personal use license described herein.</p>
          </Section>

          <Section title="8. User Conduct">
            <p>You agree to use Upper Vibe Media in a lawful and respectful manner. You may not engage in harassment, abuse, fraud, hacking, or any activity that could disrupt or harm the platform, its users, or its creators. Violation of this conduct standard may result in immediate account suspension.</p>
          </Section>

          <Section title="9. Website Availability">
            <p>Upper Vibe Media makes no guarantee of uninterrupted or error-free service. We may perform maintenance, upgrades, or experience technical outages. We reserve the right to modify, suspend, or discontinue any part of the platform at any time without notice or liability.</p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Upper Vibe Media and its owners, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the platform or its content. Your sole remedy for dissatisfaction with the platform is to discontinue use.</p>
          </Section>

          <div className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-white/25">For questions about these Terms, contact us at <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a></p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}