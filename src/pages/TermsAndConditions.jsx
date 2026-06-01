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
          <p className="text-xs text-white/25 mb-12">Last updated: June 2026</p>

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

          <Section title="11. Minimum Age Requirement">
            <p>You must be at least 13 years of age to create an account on Upper Vibe Media. The Vibe Room community chat and any 18+ designated areas require you to be at least 18 years of age. By using the platform, you confirm that you meet the applicable age requirements. Upper Vibe Media does not knowingly collect data from children under 13. If we become aware that a user is under 13, we will delete their account and data promptly.</p>
          </Section>

          <Section title="12. User-Generated Content & Vibe Room">
            <p>When you post messages, reactions, or other content in the Vibe Room, you retain ownership of your content but grant Upper Vibe Media a non-exclusive, royalty-free license to display and store that content as part of the platform. You are solely responsible for the content you post. You agree not to post content that violates our Community Guidelines, which are incorporated into these Terms by reference. Upper Vibe Media may remove any content at its sole discretion without prior notice.</p>
          </Section>

          <Section title="13. Community Guidelines">
            <p>All use of the Vibe Room and community features is subject to our Community Guidelines. These include prohibitions on harassment, spam, hate speech, explicit content, impersonation, and sharing private information. Violations may result in content removal, account muting, or a permanent ban. Please review the full Community Guidelines at <a href="/community-guidelines" className="text-cyan-400 hover:underline">uppervibemedia.com/community-guidelines</a>.</p>
          </Section>

          <Section title="14. Subscription Billing & Auto-Renewal">
            <p>Upper Vibe Plus subscriptions are recurring and will automatically renew at the end of each billing period (monthly or annually) unless you cancel before the renewal date. By subscribing, you authorize Upper Vibe Media to charge your payment method on a recurring basis at the then-current subscription price. You may cancel at any time through the Manage Subscription option in your Account page. Cancellation takes effect at the end of your current billing period — you retain Plus access until then. Please also review our Refund Policy.</p>
          </Section>

          <Section title="15. Changes to These Terms">
            <p>Upper Vibe Media may update these Terms from time to time. We will indicate the "Last updated" date at the top of this page. For significant changes, we will make reasonable efforts to notify you (such as via email or a notice on the platform). Your continued use of Upper Vibe Media after changes are posted constitutes your acceptance of the updated Terms. If you do not agree to updated Terms, you may cancel your account by contacting support.</p>
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