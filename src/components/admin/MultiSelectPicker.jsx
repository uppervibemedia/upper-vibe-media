import React, { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export default function MultiSelectPicker({ label, options, selected = [], onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  };

  const remove = (value, e) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const selectedLabels = options.filter((o) => selected.includes(o.value));

  return (
    <div className="relative">
      {label && (
        <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-card/40 border border-border/30 hover:border-border/60 text-left flex items-center gap-2 flex-wrap transition-all"
      >
        {selectedLabels.length === 0 ? (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        ) : (
          selectedLabels.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary font-medium"
            >
              {opt.label}
              <button type="button" onClick={(e) => remove(opt.value, e)} className="hover:text-primary/60">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl bg-card border border-border/40 shadow-2xl overflow-y-auto max-h-60">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${selected.includes(opt.value) ? "bg-primary border-primary" : "border-border/50"}`}>
                {selected.includes(opt.value) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <div>
                <p className="text-sm text-foreground">{opt.label}</p>
                {opt.description && <p className="text-[10px] text-muted-foreground">{opt.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}