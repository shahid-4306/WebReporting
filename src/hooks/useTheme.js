import { useEffect, useState } from "react";

const STORAGE_KEY = "erp-theme";

// Accent palettes — each overrides the primary/ring/sidebar-primary tokens.
export const ACCENTS = {
  slate: { primary: "0 0% 9%", primaryForeground: "0 0% 98%", ring: "0 0% 9%", sidebarPrimary: "240 5.9% 10%" },
  blue: { primary: "221 83% 53%", primaryForeground: "0 0% 100%", ring: "221 83% 53%", sidebarPrimary: "221 83% 53%" },
  green: { primary: "142 71% 45%", primaryForeground: "0 0% 100%", ring: "142 71% 45%", sidebarPrimary: "142 71% 45%" },
  purple: { primary: "263 70% 50%", primaryForeground: "0 0% 100%", ring: "263 70% 50%", sidebarPrimary: "263 70% 50%" },
  orange: { primary: "24 95% 53%", primaryForeground: "0 0% 100%", ring: "24 95% 53%", sidebarPrimary: "24 95% 53%" },
  rose: { primary: "347 77% 50%", primaryForeground: "0 0% 100%", ring: "347 77% 50%", sidebarPrimary: "347 77% 50%" },
};

export const ACCENT_LIST = [
  { key: "slate", label: "Slate", color: "#0f172a" },
  { key: "blue", label: "Blue", color: "#2563eb" },
  { key: "green", label: "Green", color: "#16a34a" },
  { key: "purple", label: "Purple", color: "#7c3aed" },
  { key: "orange", label: "Orange", color: "#ea580c" },
  { key: "rose", label: "Rose", color: "#e11d48" },
];

function applyTheme({ mode, accent }) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  const a = ACCENTS[accent] || ACCENTS.slate;
  root.style.setProperty("--primary", a.primary);
  root.style.setProperty("--primary-foreground", a.primaryForeground);
  root.style.setProperty("--ring", a.ring);
  root.style.setProperty("--sidebar-primary", a.sidebarPrimary);
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { mode: "light", accent: "slate" };
    } catch {
      return { mode: "light", accent: "slate" };
    }
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch {}
  }, [theme]);

  const setMode = (mode) => setTheme((t) => ({ ...t, mode }));
  const setAccent = (accent) => setTheme((t) => ({ ...t, accent }));

  return { ...theme, setMode, setAccent, setTheme };
}