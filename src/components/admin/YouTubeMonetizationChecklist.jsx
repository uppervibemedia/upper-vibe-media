import React, { useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, Youtube, ExternalLink, Info } from "lucide-react";

const CHECKLIST = [
  {
    section: "Channel Setup",
    items: [
      { id: "channel_owned", label: "Video is uploaded to YOUR YouTube channel (not a re-upload from someone else's)" },
      { id: "channel_monetized", label: "Your YouTube channel is monetized (YouTube Partner Program enabled)" },
      { id: "channel_1k", label: "Channel has 1,000+ subscribers and 4,000+ watch hours (YPP requirement)" },
    ],
  },
  {
    section: "Per-Video Settings",
    items: [
      { id: "video_monetize_on", label: 'Monetization is ON for this specific video (YouTube Studio → Content → click video → Monetization tab → "On")' },
      { id: "video_public", label: "Video is set to Public or Unlisted (private videos cannot serve ads in embeds)" },
      { id: "video_embedding", label: 'Embedding is ALLOWED on the video (YouTube Studio → Content → click video → More options → "Allow embedding" checked)' },
      { id: "video_advertiser_friendly", label: "Video content is advertiser-friendly (no excessive profanity, violence, or controversial topics that trigger limited ads)" },
      { id: "video_no_copyright", label: "No copyright claims blocking monetization (check Content ID status in YouTube Studio)" },
      { id: "video_midrolls", label: "Mid-roll ads enabled if video is 8+ minutes (YouTube Studio → Monetization → Mid-rolls → On)" },
    ],
  },
  {
    section: "Embed Setup (Vibe City)",
    items: [
      { id: "embed_official", label: "Using official youtube.com/embed/ iframe — ✅ confirmed in code" },
      { id: "embed_no_controls0", label: "Not using controls=0 (would suppress YouTube's ad UI) — ✅ confirmed in code" },
      { id: "embed_no_sandbox", label: "No restrictive sandbox attribute on iframe — ✅ confirmed in code" },
      { id: "embed_no_overlay", label: "No transparent overlay covering YouTube's player — ✅ confirmed in code" },
      { id: "embed_allow", label: "iframe allow includes autoplay, encrypted-media, picture-in-picture, fullscreen — ✅ confirmed in code" },
      { id: "embed_autohide", label: "Vibe City controls auto-hide after 3s so YouTube ad controls are never covered — ✅ confirmed in code" },
    ],
  },
  {
    section: "Ad Serving Reality Check",
    items: [
      { id: "reality_not_every_view", label: "Understood: YouTube decides whether to serve an ad — not every view gets one" },
      { id: "reality_premium", label: "Understood: YouTube Premium subscribers never see ads (by design)" },
      { id: "reality_low_demand", label: "Understood: Ads may not show if ad demand is low for your content/audience geography" },
      { id: "reality_testing", label: "Testing with a logged-out non-Premium browser to verify ad eligibility" },
      { id: "reality_compared_yt", label: "Compared: ad shows on the direct YouTube watch page for the same video" },
    ],
  },
];

const TESTING_STEPS = [
  "Open an incognito/private browser window (logged out)",
  "Go to the direct YouTube watch page for one of your stage videos",
  "Check if a pre-roll or mid-roll ad appears",
  "If YES on YouTube → open Vibe City in the same incognito window and Watch Stage",
  "If ads show on YouTube but not Vibe City → inspect iframe overlays and parameters",
  "If ads don't show on YouTube either → the issue is YouTube monetization/ad demand, not Vibe City",
  "Test on desktop Chrome, then iPhone Safari",
];

export default function YouTubeMonetizationChecklist() {
  const [checked, setChecked] = useState({});

  const toggle = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalItems = CHECKLIST.flatMap((s) => s.items).length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((checkedCount / totalItems) * 100);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 rounded-2xl border"
        style={{ background: "rgba(255,50,50,0.06)", borderColor: "rgba(255,50,50,0.15)" }}>
        <Youtube className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground mb-1">YouTube Ad Setup — Action Required</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vibe City's embed code is correct — YouTube's ad system is fully unblocked. However, ads will only appear if
            <strong className="text-foreground"> your channel is monetized</strong> and <strong className="text-foreground">each video has monetization enabled</strong>.
            Work through this checklist for every stage video.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "linear-gradient(90deg,#22c55e,#16a34a)" : "linear-gradient(90deg,#00B8D4,#7C3AED)",
            }}
          />
        </div>
        <span className="text-sm font-bold text-foreground whitespace-nowrap">{checkedCount}/{totalItems} checked</span>
      </div>

      {/* Checklist sections */}
      {CHECKLIST.map((section) => (
        <div key={section.section}>
          <h4 className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">{section.section}</h4>
          <div className="space-y-2">
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className="w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all border"
                style={{
                  background: checked[item.id] ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
                  borderColor: checked[item.id] ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)",
                }}
              >
                {checked[item.id]
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  : <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                }
                <span className={`text-sm leading-relaxed ${checked[item.id] ? "text-muted-foreground line-through" : "text-foreground/90"}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Testing steps */}
      <div className="p-5 rounded-2xl border" style={{ background: "rgba(0,184,212,0.05)", borderColor: "rgba(0,184,212,0.15)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-cyan-400" />
          <h4 className="font-heading font-bold text-sm text-foreground">How to Test Ad Eligibility</h4>
        </div>
        <ol className="space-y-2">
          {TESTING_STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: "rgba(0,184,212,0.15)", color: "#00B8D4" }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl border"
        style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.18)" }}>
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Do not expect ads every time.</strong> YouTube controls all ad decisions based on viewer eligibility,
          geography, ad demand, session history, and video content rating. This checklist only confirms that Vibe City
          does not block ads — YouTube still decides whether to serve them.
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "rgba(255,50,50,0.12)", border: "1px solid rgba(255,50,50,0.2)", color: "#f87171" }}>
          <ExternalLink className="w-3 h-3" />
          YouTube Studio
        </a>
        <a href="https://support.google.com/youtube/answer/72857" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
          <ExternalLink className="w-3 h-3" />
          YouTube Monetization Docs
        </a>
        <a href="https://support.google.com/youtube/answer/6162278" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
          <ExternalLink className="w-3 h-3" />
          Advertiser-Friendly Guidelines
        </a>
      </div>
    </div>
  );
}