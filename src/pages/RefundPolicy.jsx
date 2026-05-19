import React from "react";
import { motion } from "framer-motion";
import Footer from "../components/shared/Footer";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-heading font-bold text-lg mb-3" style={{ color: "#00E5FF" }}>{title}</h2>
    <div className="text-sm text-white/50 leading-relaxed space-y-2">{children}</div>
  </div>
);

export default function RefundPolicy() {
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: "#00E5FF" }}>Legal</p>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2 text-white">Refund Policy</h1>
          <p className="text-xs text-white/25 mb-12">Last updated: May 2026</p>

          <p className="text-sm text-white/40 leading-relaxed mb-10">
            Upper Vibe Media strives to provide a quality experience for all members. Please read our refund policy carefully before making any purchase.
          </p>

          <Section title="1. Subscription Billing">
            <p>Upper Vibe Plus subscriptions are billed automatically on a monthly or annual cycle. We do not offer refunds for partial subscription periods. If you cancel your subscription, you will retain access to Plus features until the end of your current billing cycle, after which your account will revert to free access.</p>
            <p>If you believe you were charged in error (e.g., charged after cancelling, double-charged), please contact us within 7 days of the charge and we will investigate and issue a refund if applicable.</p>
          </Section>

          <Section title="2. Digital Downloads">
            <p>All digital download purchases are final and non-refundable due to the nature of digital goods. Once a file has been delivered, we are unable to issue a refund. If you experience a technical issue with a download (e.g., corrupted file, failed delivery), please contact support and we will resolve it promptly.</p>
          </Section>

          <Section title="3. Support / Tip Payments">
            <p>Support contributions and tips made to artists through Upper Vibe Media are voluntary and non-refundable. These payments are made directly to support creative work and cannot be reversed once processed.</p>
          </Section>

          <Section title="4. When Refunds May Be Available">
            <p>We may consider refunds in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>You were charged after successfully cancelling your subscription</li>
              <li>A duplicate charge occurred due to a technical error</li>
              <li>A download was purchased but never delivered due to a platform error</li>
              <li>Required by applicable consumer protection law in your jurisdiction</li>
            </ul>
          </Section>

          <Section title="5. When Refunds Are Not Available">
            <p>We do not issue refunds in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>You changed your mind after subscribing or purchasing</li>
              <li>You forgot to cancel before a renewal date</li>
              <li>You did not use your subscription during the billing period</li>
              <li>Your account was terminated due to a violation of our Terms &amp; Conditions</li>
              <li>Support / tip payments under any circumstances</li>
            </ul>
          </Section>

          <Section title="6. How to Request a Refund">
            <p>To request a refund, email us at <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a> with the subject line <span className="text-white/70 font-semibold">Refund Request</span>. Include your account email, a description of the charge, and the reason for your request. We aim to respond within 3–5 business days.</p>
          </Section>

          <div className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-white/25">For billing questions, contact us at <a href="mailto:uppervibemedia@gmail.com" className="text-cyan-400 hover:underline">uppervibemedia@gmail.com</a></p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}