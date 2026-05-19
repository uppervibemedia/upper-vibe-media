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
          <p className="text-xs text-white/25 mb-12">Last updated: May 2026</p>

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

          <div className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-white/25">For privacy inquiries, contact us at <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a></p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}