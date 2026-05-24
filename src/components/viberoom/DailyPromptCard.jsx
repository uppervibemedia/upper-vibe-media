import React, { useState, useEffect } from "react";
import { Sparkles, Edit2, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

const DEFAULT_PROMPT = "What are you grateful for right now?";

export default function DailyPromptCard({ isAdmin }) {
  const [prompt, setPrompt] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const { accentId } = useTheme();
  const theme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = theme.vars["--rt-primary"];
  const p = (a) => `rgba(${rtPrimary},${a})`;

  useEffect(() => {
    base44.entities.VibeRoomPrompt.filter({ is_active: true }, "-created_date", 1)
      .then((results) => {
        if (results.length > 0) setPrompt(results[0]);
      });
  }, []);

  const handleSave = async () => {
    if (!editText.trim()) return;
    if (prompt) {
      const updated = await base44.entities.VibeRoomPrompt.update(prompt.id, { prompt_text: editText.trim() });
      setPrompt(updated);
    } else {
      const created = await base44.entities.VibeRoomPrompt.create({ prompt_text: editText.trim(), is_active: true });
      setPrompt(created);
    }
    setEditing(false);
  };

  const promptText = prompt?.prompt_text || DEFAULT_PROMPT;

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg,${p(0.07)},${p(0.03)})`,
        border: `1px solid ${p(0.25)}`,
      }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none"
        style={{ background: `rgb(${rtPrimary})` }} />

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: p(0.15), border: `1px solid ${p(0.3)}` }}>
              <Sparkles className="w-2.5 h-2.5" style={{ color: `rgb(${rtPrimary})` }} />
            </div>
            <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: p(0.8) }}>Today's Vibe</span>
          </div>
          {isAdmin && !editing && (
            <button
              onClick={() => { setEditText(promptText); setEditing(true); }}
              className="p-1.5 rounded-lg text-white/25 transition-colors" style={{ color: p(0.5) }}>
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex gap-2 mt-1">
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none border-b pb-1"
              style={{ borderColor: p(0.3) }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <button onClick={handleSave} style={{ color: `rgb(${rtPrimary})` }} className="hover:brightness-110 transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold text-white/80 leading-relaxed">{promptText}</p>
        )}
      </div>
    </div>
  );
}