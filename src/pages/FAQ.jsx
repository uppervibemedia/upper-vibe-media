import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const faqs = [
  {
    category: "Upper Vibe Plus",
    items: [
      {
        q: "What is Upper Vibe Plus?",
        a: "Upper Vibe Plus is our premium membership that unlocks downloads, full Academy lesson access, and early releases. Plans start at $4.99/month or $49.99/year.",
      },
      {
        q: "How do I upgrade to Plus?",
        a: "Go to Account → Upgrade to Plus, or visit the Membership page. You can choose a monthly or annual plan and pay securely via Stripe.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. You can cancel your subscription at any time from Account → Manage Subscription. You'll keep access until the end of your billing period.",
      },
      {
        q: "Is there a free trial?",
        a: "We currently offer a free streaming tier with no time limit. You can listen to all music and use the Radio for free — Plus unlocks downloads and Academy content.",
      },
    ],
  },
  {
    category: "Downloads",
    items: [
      {
        q: "Who can download songs?",
        a: "Downloads are exclusive to Upper Vibe Plus members. Free listeners can stream everything but cannot download.",
      },
      {
        q: "What format are the downloads?",
        a: "Songs are downloaded in high-quality MP3 format. Some releases include lossless versions — check individual track pages for details.",
      },
      {
        q: "Where are my downloads saved?",
        a: "Downloads go directly to your device's default download folder via your browser. The Downloads page in the app also keeps a record of everything you've saved.",
      },
    ],
  },
  {
    category: "Radio",
    items: [
      {
        q: "How does Upper Vibe Radio work?",
        a: "Radio shuffles through all published 432 Hz Upper Vibe Media songs in a weighted random order. Songs you've liked appear more often in your rotation.",
      },
      {
        q: "Can I skip songs on Radio?",
        a: "Yes — use the Next button to skip to the next song. You can also go back to the previous song using the Prev button.",
      },
      {
        q: "Why did the music pause when I locked my phone?",
        a: "For stability, the player pauses when the screen locks or the app goes to the background. Press Play on your lock screen or return to the app to resume from where you left off.",
      },
    ],
  },
  {
    category: "Academy",
    items: [
      {
        q: "What is the Upper Vibe Academy?",
        a: "The Academy is a video library of lessons on 432 Hz music, manifestation, mindset, music business, and artist development — all from the Upper Vibe Media team.",
      },
      {
        q: "Is Academy content free?",
        a: "Some lessons have a free preview. Full access to all Academy videos requires an Upper Vibe Plus membership.",
      },
      {
        q: "How do I track my progress?",
        a: "The Academy automatically tracks which lessons you've started and completed. Your progress is saved to your account.",
      },
    ],
  },
  {
    category: "Account & Subscription",
    items: [
      {
        q: "How do I create an account?",
        a: "Tap Log In on the top bar or Account page, then choose \"Create Account\". You can sign up with email — no app store required.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "On the login page, tap \"Forgot password?\" and enter your email. You'll receive a reset link within a few minutes.",
      },
      {
        q: "How do I manage my billing?",
        a: "Go to Account → Manage Subscription (or Settings → Account → Manage Subscription). This opens your secure Stripe billing portal where you can update your card, change plans, or cancel.",
      },
      {
        q: "Can I use one account on multiple devices?",
        a: "Yes. Your account, library, and downloads are all linked to your email and accessible on any device you log in with.",
      },
    ],
  },
  {
    category: "Playback Tips",
    items: [
      {
        q: "Why does my music pause when I switch apps?",
        a: "The app pauses audio when it goes to the background to ensure stable, glitch-free playback. Tap Play on your lock screen or return to the app to resume.",
      },
      {
        q: "Can I use the lock screen controls?",
        a: "Yes. When a song is playing, your device's lock screen and Control Center will show the track info with Play, Pause, Next, and Previous buttons.",
      },
      {
        q: "What is 432 Hz music?",
        a: "432 Hz is an alternative tuning for music (vs. the standard 440 Hz). Many listeners report it feels warmer, more natural, and more relaxing. All Upper Vibe Media originals are tuned to 432 Hz.",
      },
      {
        q: "How do I add this app to my iPhone home screen?",
        a: "In Safari, tap the Share button (the box with an arrow) → \"Add to Home Screen\". This installs the app as a PWA for a full-screen experience.",
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white/80 leading-snug">{q}</span>
        <ChevronDown
          className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-white/45 leading-relaxed pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen pb-28 lg:pb-8 pt-20 lg:pt-8">
      <div className="max-w-lg mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link to="/account" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/8 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronLeft className="w-4 h-4 text-white/50" />
            </Link>
            <div>
              <h1 className="font-heading font-black text-2xl text-white">FAQ & Help</h1>
              <p className="text-xs text-white/35 mt-0.5">Answers to common questions</p>
            </div>
          </div>

          <div className="space-y-6">
            {faqs.map((section) => (
              <div key={section.category}>
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30 mb-3 px-1">
                  {section.category}
                </p>
                <div
                  className="rounded-2xl px-5"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {section.items.map((item) => (
                    <FAQItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl px-5 py-5 text-center"
            style={{ background: "rgba(0,200,220,0.04)", border: "1px solid rgba(0,200,220,0.12)" }}>
            <p className="text-sm font-semibold text-white/60 mb-1">Still have questions?</p>
            <p className="text-xs text-white/35 mb-4">We're happy to help. Reach out directly.</p>
            <Link to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black tracking-wide transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#009CB8,#00C8E0)", color: "#000" }}>
              Contact Us
            </Link>
          </div>

        </motion.div>
      </div>
    </div>
  );
}