import React, { useState, useEffect } from "react";
import { Sparkles, Edit2, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PROMPT = "What are you grateful for right now?";

export default function DailyPromptCard({ isAdmin }) {
  const [prompt, setPrompt] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

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
        background: "linear-gradient(135deg,rgba(212,168,67,0.06),rgba(155,126,255,0.04))",
        border: "1px solid rgba(212,168,67,0.18)",
      }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none"
        style={{ background: "#D4A843" }} />

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}>
              <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
            </div>
            <span className="text-[9px] font-black tracking-[0.3em] uppercase text-yellow-500/70">Today's Vibe</span>
          </div>
          {isAdmin && !editing && (
            <button
              onClick={() => { setEditText(promptText); setEditing(true); }}
              className="p-1.5 rounded-lg text-white/25 hover:text-yellow-400/70 transition-colors">
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
              style={{ borderColor: "rgba(212,168,67,0.3)" }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <button onClick={handleSave} className="text-yellow-400 hover:brightness-110 transition-colors">
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