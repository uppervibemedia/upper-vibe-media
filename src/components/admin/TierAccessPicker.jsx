import React from "react";
import { Users, Crown, Sparkles, Globe } from "lucide-react";
import { TIER_ACCESS_OPTIONS, presetToAccess, accessToPreset } from "@/lib/tierAccess";

const ICONS = {
  free: Globe,
  supporter: Users,
  "supporter+premium": Sparkles,
  premium: Crown,
};

const BORDER = {
  free: "border-border/50 hover:border-border",
  supporter: "border-purple-500/30 hover:border-purple-500/60",
  "supporter+premium": "border-purple-400/40 hover:border-purple-400/70",
  premium: "border-primary/30 hover:border-primary/60",
};

const SELECTED_BG = {
  free: "bg-muted/40 border-border text-foreground",
  supporter: "bg-purple-500/10 border-purple-500/60 text-purple-400",
  "supporter+premium": "bg-purple-400/10 border-purple-400/70 text-purple-300",
  premium: "bg-primary/10 border-primary/60 text-primary",
};

export default function TierAccessPicker({ value, onChange }) {
  // value is a tier_access array, we display as preset
  const preset = accessToPreset(value);

  const handleSelect = (optValue) => {
    onChange(presetToAccess(optValue));
  };

  return (
    <div>
      <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2 block">
        Access Tier
      </label>
      <div className="grid grid-cols-2 gap-2">
        {TIER_ACCESS_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.value];
          const isSelected = preset === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? SELECTED_BG[opt.value]
                  : `bg-card/30 ${BORDER[opt.value]} text-muted-foreground`
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? "" : "opacity-60"}`} />
              <div>
                <p className="text-xs font-bold tracking-wide">{opt.label}</p>
                <p className={`text-[10px] mt-0.5 ${isSelected ? "opacity-80" : "text-muted-foreground/60"}`}>
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}