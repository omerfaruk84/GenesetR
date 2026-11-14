/**
 * Light / dark theme.
 *
 * The colour tokens in global.scss switch on `data-gs-theme` of <html>. The
 * top bar and the token-based pages (gene page, dataset catalog, ...) follow
 * the theme. The analysis pages draw their charts with fixed light colours, so
 * their sidebar and result area stay on a light "paper" in dark mode.
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "genesetr_theme";
const listeners = new Set();

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch (e) {
    return "light";
  }
};

let current = readStored();

const apply = () => {
  if (typeof document === "undefined") return;
  if (current === "dark") document.documentElement.setAttribute("data-gs-theme", "dark");
  else document.documentElement.removeAttribute("data-gs-theme");
};

// Applied as soon as this module loads, so the page does not flash light first
apply();

export const getTheme = () => current;

export const setTheme = (theme) => {
  current = theme === "dark" ? "dark" : "light";
  apply();
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch (e) {
    // not remembered when storage is unavailable
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Current theme ("light" | "dark"); re-renders the component when it changes. */
export const useTheme = () => useSyncExternalStore(subscribe, getTheme, getTheme);
