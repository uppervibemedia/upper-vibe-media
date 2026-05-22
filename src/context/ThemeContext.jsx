import React, { createContext, useContext, useState, useEffect } from "react";

const THEME_KEY = "uvm_theme";

const ThemeContext = createContext({ solarMode: false, setSolarMode: () => {} });

export function ThemeProvider({ children }) {
  const [solarMode, setSolarModeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "solar"; } catch { return false; }
  });

  const setSolarMode = (val) => {
    setSolarModeState(val);
    try { localStorage.setItem(THEME_KEY, val ? "solar" : "dark"); } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    if (solarMode) {
      root.classList.add("solar");
    } else {
      root.classList.remove("solar");
    }
  }, [solarMode]);

  return (
    <ThemeContext.Provider value={{ solarMode, setSolarMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}