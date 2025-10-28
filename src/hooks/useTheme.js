import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS, THEMES } from "../constants";

export function useTheme() {
  const getSystemPref = useCallback(() => {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? THEMES.DARK
      : THEMES.LIGHT;
  }, []);

  const readInitialTheme = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === THEMES.DARK || saved === THEMES.LIGHT) return saved;
    return getSystemPref();
  }, [getSystemPref]);

  const [theme, setTheme] = useState(() => readInitialTheme());

  const isDark = useMemo(() => theme === THEMES.DARK, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    if (!mq) return;

    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === THEMES.DARK || saved === THEMES.LIGHT) return;

    const handler = (e) => setTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
    mq.addEventListener
      ? mq.addEventListener("change", handler)
      : mq.addListener(handler);
    return () => {
      mq.removeEventListener
        ? mq.removeEventListener("change", handler)
        : mq.removeListener(handler);
    };
  }, [getSystemPref]);

  useEffect(() => {
    const onStorage = (e) => {
      if (
        e.key === STORAGE_KEYS.THEME &&
        (e.newValue === THEMES.DARK || e.newValue === THEMES.LIGHT)
      ) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }, []);

  return { isDark, toggleTheme };
}
