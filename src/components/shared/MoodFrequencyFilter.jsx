import React from "react";
import { motion } from "framer-motion";

// Preset sonic vibes — each maps to mood_tags values OR frequency_type values on Track
export const MOOD_VIBES = [
  { id: "all",        label: "All Vibes",    emoji: "✨", matchMoods: [],                  matchFreq: [] },
  { id: "focus",      label: "Focus",        emoji: "🎯", matchMoods: ["focus","study","concentration","work"], matchFreq: [] },
  { id: "meditation", label: "Meditation",   emoji: "🧘", matchMoods: ["meditation","calm","peaceful","mindful","zen","relax","relaxation"], matchFreq: ["binaural"] },
  { id: "high_energy",label: "High Energy",  emoji: "⚡", matchMoods: ["energy","hype","motivation","workout","power","hustle","grind"], matchFreq: [] },
  { id: "manifestation", label: "Manifest",  emoji: "🌙", matchMoods: ["manifestation","manifest","abundance","law of attraction","affirmations"], matchFreq: ["528hz"] },
  { id: "healing",    label: "Healing",      emoji: "💫", matchMoods: ["healing","cleanse","restore","528","432","repair"], matchFreq: ["432hz","528hz"] },
  { id: "sleep",      label: "Sleep",        emoji: "🌊", matchMoods: ["sleep","deep sleep","rest","night","soothing","lofi","lo-fi"], matchFreq: ["binaural"] },
  { id: "vibes",      label: "High Vibe",    emoji: "🔥", matchMoods: ["vibe","vibes","high vibe","elevated","positive","uplift","uplifting"], matchFreq: [] },
];

/**
 * MoodFrequencyFilter — horizontal scrollable mood/frequency vibe selector
 *
 * Props:
 *   activeMood: string (id from MOOD_VIBES)
 *   onChange: (id) => void
 */
export default function MoodFrequencyFilter({ activeMood, onChange }) {
  return (
    <div className="overflow-x-auto pb-1 hide-scrollbar">
      <div className="flex gap-2" style={{ width: "max-content", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
        {MOOD_VIBES.map((vibe) => {
          const isActive = activeMood === vibe.id;
          return (
            <motion.button
              key={vibe.id}
              onClick={() => onChange(vibe.id)}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold tracking-wide border transition-all flex-shrink-0 whitespace-nowrap"
              style={isActive ? {
                background: "linear-gradient(135deg,rgba(155,126,255,0.2),rgba(0,200,220,0.12))",
                borderColor: "rgba(155,126,255,0.45)",
                color: "#c4aaff",
                boxShadow: "0 0 14px rgba(155,126,255,0.2)",
              } : {
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              <span style={{ fontSize: "13px" }}>{vibe.emoji}</span>
              {vibe.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * filterByMood — utility to apply mood filter to a tracks array
 * Matches against track.mood_tags (array) and track.frequency_type (string)
 */
export function filterByMood(tracks, moodId) {
  if (!moodId || moodId === "all") return tracks;
  const vibe = MOOD_VIBES.find((v) => v.id === moodId);
  if (!vibe) return tracks;

  return tracks.filter((track) => {
    const tags = (track.mood_tags || []).map((t) => t.toLowerCase());
    const freq = (track.frequency_type || "").toLowerCase();

    // Check mood_tags match (any tag contains any match keyword)
    const moodMatch = vibe.matchMoods.length > 0 && vibe.matchMoods.some((keyword) =>
      tags.some((tag) => tag.includes(keyword) || keyword.includes(tag))
    );

    // Check frequency_type match
    const freqMatch = vibe.matchFreq.length > 0 && vibe.matchFreq.includes(freq);

    return moodMatch || freqMatch;
  });
}