import React, { createContext, useContext, useState, useEffect } from "react";

const THEME_KEY      = "uvm_theme";
const RADIO_THEME_KEY = "uvm_radio_theme_v1";

// RGB string values for each accent
export const ACCENT_THEMES = {
  cyan:   { id: "cyan",   label: "Cosmic Cyan",    rgb: "0,229,255",   hex: "#00E5FF" },
  violet: { id: "violet", label: "Deep Violet",    rgb: "168,85,247",  hex: "#A855F7" },
  amber:  { id: "amber",  label: "Midnight Amber", rgb: "245,158,11",  hex: "#F59E0B" },
};

const ThemeContext = createContext({
  solarMode: false,
  setSolarMode: () => {},
  accentId: "cyan",
  accent: ACCENT_THEMES.cyan,
  setAccent: () => {},
});

export function ThemeProvider({ children }) {
  const [solarMode, setSolarModeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "solar"; } catch { return false; }
  });

  const [accentId, setAccentId] = useState(() => {
    try { return localStorage.getItem(RADIO_THEME_KEY) || "cyan"; } catch { return "cyan"; }
  });

  const accent = ACCENT_THEMES[accentId] || ACCENT_THEMES.cyan;

  const setSolarMode = (val) => {
    setSolarModeState(val);
    try { localStorage.setItem(THEME_KEY, val ? "solar" : "dark"); } catch {}
  };

  const setAccent = (id) => {
    const t = ACCENT_THEMES[id] || ACCENT_THEMES.cyan;
    setAccentId(t.id);
    try { localStorage.setItem(RADIO_THEME_KEY, t.id); } catch {}
  };

  // Apply solar class
  useEffect(() => {
    const root = document.documentElement;
    if (solarMode) root.classList.add("solar");
    else root.classList.remove("solar");
  }, [solarMode]);

  // Apply accent CSS variables to :root so Tailwind's hsl(var(--primary)) etc. pick it up
  useEffect(() => {
    const root = document.documentElement;
    // Map rgb → hsl for CSS vars (used by Tailwind tokens)
    const hslMap = {
      cyan:   { primary: "191 100% 50%", ring: "191 100% 50%", sidebar: "185 100% 50%" },
      violet: { primary: "271 83% 65%",  ring: "271 83% 65%",  sidebar: "271 83% 65%" },
      amber:  { primary: "38 92% 50%",   ring: "38 92% 50%",   sidebar: "38 92% 50%"  },
    };
    const hsl = hslMap[accentId] || hslMap.cyan;
    root.style.setProperty("--primary",         hsl.primary);
    root.style.setProperty("--ring",             hsl.ring);
    root.style.setProperty("--sidebar-primary",  hsl.sidebar);
    root.style.setProperty("--sidebar-ring",     hsl.sidebar);
    root.style.setProperty("--chart-1",          hsl.primary);
    // Also expose as plain rgb for components that use rgba(var(--rt-primary),...)
    root.style.setProperty("--accent-rgb", accent.rgb);
  }, [accentId, accent.rgb]);

  return (
    <ThemeContext.Provider value={{ solarMode, setSolarMode, accentId, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}