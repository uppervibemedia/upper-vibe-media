import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQS = [
  {
    category: "Upper Vibe Plus",
    items: [
      {
        q: "What is Upper Vibe Plus?",
        a: "Upper Vibe Plus is the premium membership that unlocks song downloads, all Academy lessons, and early access to new releases. It starts at $4.99/month or $49.99/year."
      },
      {
        q: "How do I upgrade to Plus?",
        a: "Tap 'Upgrade to Plus' on your Account or Settings page. You'll be taken to a secure checkout where you can choose monthly or annual billing."
      },
      {
        q: "Can I cancel my Plus subscription?",
        a: "Yes, anytime. Go to Account → Manage Subscription to cancel. You'll keep access until the end of your billing period."
      },
      {
        q: "Is there a free trial?",
        a: "All streaming is free — you can listen to every track without a Plus membership. Plus is only required for downloads and premium Academy content."
      },
    ]
  },
  {
    category: "Downloads",
    items: [
      {
        q: "Can I download songs?",
        a: "Yes — Upper Vibe Plus members can download any available track directly from the Music library or the song page."
      },
      {
        q: "What format are downloads in?",
        a: "Songs are downloaded as MP3 files, tuned to 432 Hz."
      },
      {
        q: "Where do my downloads save?",
        a: "Downloads go to your device's default Downloads folder (or the location your browser chooses). Check your Downloads page in the app to see your history."
      },
      {
        q: "Why can't I download a song?",
        a: "Downloads require an active Upper Vibe Plus membership. If you have Plus and still can't download, make sure you're logged in."
      },
    ]
  },
  {
    category: "Radio",
    items: [
      {
        q: "What is Upper Vibe Radio?",
        a: "Radio shuffles through all published Upper Vibe Media songs in a weighted random order. Tracks you've favorited appear more often."
      },
      {
        q: "Is Radio free?",
        a: "Yes — Radio is completely free to stream for all listeners."
      },
      {
        q: "Does Radio work in the background / lock screen?",
        a: "Yes. Use your lock screen media controls to play, pause, skip forward, or go back. The app is optimized for background playback on iOS and Android."
      },
      {
        q: "Why did the song speed up after I unlocked my phone?",
        a: "This is a known iOS/Safari issue we've worked hard to fix. Make sure your app is up to date. If it happens, pause and press play again to reset the playback rate."
      },
    ]
  },
  {
    category: "Academy",
    items: [
      {
        q: "What is Upper Vibe Academy?",
        a: "Academy is a collection of educational videos covering 432 Hz music, manifestation, mindset, music business, and artist development."
      },
      {
        q: "Is Academy content free?",
        a: "Some lessons have a free preview. Full Academy access requires an Upper Vibe Plus membership."
      },
      {
        q: "How do I track my progress?",
        a: "Your watch history is saved automatically while you're logged in. A full progress tracker is coming soon."
      },
    ]
  },
  {
    category: "Account & Subscription",
    items: [
      {
        q: "How do I create an account?",
        a: "Tap 'Log In / Create Account' on the Account page. You can sign up with your email address — no payment required for a free account."
      },
      {
        q: "How do I change my password?",
        a: "On the login page, tap 'Forgot Password' to receive a reset link by email."
      },
      {
        q: "How do I delete my account?",
        a: "Go to Account → Delete Account. You'll be directed to contact our support team at support@uppervibemusic.com and we'll process your request within 48 hours."
      },
      {
        q: "My subscription isn't showing up — what do I do?",
        a: "Make sure you're logged in with the same email used during checkout. If the issue persists, contact support@uppervibemusic.com with your receipt."
      },
    ]
  },
  {
    category: "Playback Tips",
    items: [
      {
        q: "How do I get the best sound quality?",
        a: "Use wired headphones or quality Bluetooth earbuds for the cleanest 432 Hz listening experience. Avoid Bluetooth compression on older devices if possible."
      },
      {
        q: "The audio is sped up or sounds distorted — what should I do?",
        a: "Pause the track, wait a moment, then press play again. This resets the AudioContext and clears any buffering artifacts, especially common on iOS after returning from the lock screen."
      },
      {
        q: "Can I use the app while doing other things on my phone?",
        a: "Yes. Music continues in the background. Use your lock screen media controls or notification controls to manage playback."
      },
      {
        q: "How do I install the app on my iPhone?",
        a: "In Safari, tap the Share button (the box with an arrow), then tap 'Add to Home Screen'. The app will behave like a native app with full-screen playback."
      },
    ]
  },
];

function FAQItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="border-b border-white/[0.05] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white/80 leading-snug">{q}</span>
        <ChevronDown
          className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-white/45 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openKey, setOpenKey] = useState(null);

  const toggle = (key) => setOpenKey((prev) => (prev === key ? null : key));

  return (
    <div className="min-h-screen pb-28 lg:pb-8 pt-20 lg:pt-8">
      <div className="max-w-2xl mx-auto px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.18)" }}>
              <HelpCircle className="w-5 h-5 text-cyan-400/70" />
            </div>
            <div>
              <h1 className="font-heading font-black text-2xl text-white">FAQ</h1>
              <p className="text-white/35 text-xs">Answers to common questions</p>
            </div>
          </div>

          {FAQS.map((section) => (
            <div key={section.category} className="mb-5">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30 mb-2 px-1">
                {section.category}
              </p>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {section.items.map((item, i) => (
                  <FAQItem
                    key={i}
                    q={item.q}
                    a={item.a}
                    isOpen={openKey === `${section.category}-${i}`}
                    onToggle={() => toggle(`${section.category}-${i}`)}
                  />
                ))}
              </div>
            </div>
          ))}

          <p className="text-center text-xs text-white/20 mt-8 pb-4">
            Still need help?{" "}
            <a href="mailto:support@uppervibemusic.com" className="text-cyan-400/60 underline">
              support@uppervibemusic.com
            </a>
          </p>

        </motion.div>
      </div>
    </div>
  );
}