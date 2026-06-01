import React from "react";
import { motion } from "framer-motion";
import Footer from "../components/shared/Footer";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-heading font-bold text-lg mb-3" style={{ color: "#00E5FF" }}>{title}</h2>
    <div className="text-sm text-white/50 leading-relaxed space-y-2">{children}</div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: "#00E5FF" }}>Legal</p>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2 text-white">Privacy Policy</h1>
          <p className="text-xs text-white/25 mb-12">Last updated: June 2026</p>

          <p className="text-sm text-white/40 leading-relaxed mb-10">
            Upper Vibe Media ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
          </p>

          <Section title="1. Account Data">
            <p>When you create an account, we collect your name, email address, and account credentials. This information is used to provide you access to the platform, manage your subscription, and communicate with you about your account.</p>
          </Section>

          <Section title="2. Email Collection">
            <p>We collect your email address for account authentication, subscription billing notifications, platform updates, and if you opt in, our newsletter. You may unsubscribe from marketing emails at any time by contacting us or clicking the unsubscribe link in any email.</p>
          </Section>

          <Section title="3. Cookies &amp; Analytics">
            <p>Upper Vibe Media uses cookies and similar tracking technologies to improve platform functionality, remember your preferences, and analyze usage patterns. We may use third-party analytics services to understand how users interact with our platform. You can configure your browser to refuse cookies, though some features may not function properly as a result.</p>
          </Section>

          <Section title="4. Payment Processing via Stripe">
            <p>All payment processing is handled securely by Stripe, a third-party payment processor. Upper Vibe Media does not store your credit card or payment information on our servers. When you make a payment, your data is transmitted directly to Stripe and governed by Stripe's Privacy Policy. We receive only a transaction confirmation and billing details necessary to manage your subscription.</p>
          </Section>

          <Section title="5. Device, Browser &amp; Media Permissions">
            <p>To deliver the best streaming experience, our platform may request access to your device's media session controls (for lock screen playback controls) and browser audio capabilities. We do not collect or store data from your microphone, camera, or other device sensors. Media session metadata is used only to display track information on your lock screen or notification area.</p>
          </Section>

          <Section title="6. Data Storage">
            <p>Your personal data is stored on secure servers provided by our platform infrastructure. We retain your data for as long as your account remains active or as necessary to fulfill our legal obligations. We implement reasonable technical and organizational measures to protect your data against unauthorized access, alteration, or destruction.</p>
          </Section>

          <Section title="7. Data Deletion Requests">
            <p>You may request deletion of your personal data at any time by emailing us at <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a>. Upon verified request, we will delete or anonymize your account data within a reasonable time, except where we are required by law to retain certain records.</p>
          </Section>

          <Section title="8. Third-Party Sharing">
            <p>We do not sell, rent, or trade your personal information to third parties. We may share data with trusted service providers (such as Stripe for payments) only as necessary to operate the platform, and those providers are bound by confidentiality obligations.</p>
          </Section>

          <Section title="9. Vibe Room Messages & Community Content">
            <p>When you post in the Vibe Room, your message content, your chosen display name (Vibe Name), and any avatar are stored in our database and visible to other Vibe Room users. We do not publicly display your account email address. Messages may be retained indefinitely unless removed by a moderator or deleted upon a verified account deletion request.</p>
          </Section>

          <Section title="10. Display Names & Avatars">
            <p>Your Vibe Name (chosen display name) and avatar are visible to other users in the Vibe Room. These are not tied to your real name or email in any public-facing display. Avatars currently display as initials by default.</p>
          </Section>

          <Section title="11. Analytics Events & Visitor Tracking">
            <p>Upper Vibe Media operates its own first-party analytics system to understand how users interact with the platform. We track events such as page views, song plays, song completions, and feature interactions. We assign each visitor a randomly generated visitor ID (stored in your browser's localStorage) to deduplicate page views. This ID rotates every 60 days and is not linked to your personal identity. Administrators are excluded from analytics tracking. We do not use Google Analytics or third-party advertising trackers.</p>
          </Section>

          <Section title="12. localStorage & sessionStorage">
            <p>We use your browser's localStorage and sessionStorage to store non-personal preferences and session data locally on your device. This includes your selected Vibe Color theme, radio pulse preference, age gate confirmation, Vibe Name, presence session data, and the anonymous visitor ID described above. This data does not leave your device except as part of normal platform usage, and it is not sold or shared with third parties.</p>
          </Section>

          <Section title="13. Email Signup & Marketing">
            <p>If you sign up for our email list, we store your email address and the page where you signed up. You will receive updates about new music, releases, and platform news from Upper Vibe Media. You may unsubscribe at any time by clicking the unsubscribe link in any email or by contacting us. We do not automatically enroll account holders into marketing emails without explicit opt-in.</p>
          </Section>

          <Section title="14. Account Deletion & Data Removal">
            <p>You may request deletion of your account and personal data by emailing <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a> with subject line "Account Deletion Request." Upon verified request, we will delete or anonymize your account data, Vibe Room messages, and personal information within a reasonable time. Billing and transaction records may be retained as required by applicable law. Stripe payment records are retained per Stripe's own data retention policies.</p>
          </Section>

          <div className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-white/25">For privacy inquiries, contact us at <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a></p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}