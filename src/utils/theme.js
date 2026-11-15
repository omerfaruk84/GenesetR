/**
 * Light / dark theme.
 *
 * The colour tokens in global.scss switch on `data-gs-theme` of <html>; the UI
 * library switches its own variables on `data-theme`, so both are set. Code
 * that needs colour values (charts, canvas, the MUI theme) reads them from
 * utils/palette.js through usePalette() / useChartTheme().
 */
import { useSyncExternalStore } from "react";
import { paletteOf } from "./palette";

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
  const root = document.documentElement;
  if (current === "dark") {
    root.setAttribute("data-gs-theme", "dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-gs-theme");
    root.removeAttribute("data-theme");
  }
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

/** Colour values of the current theme (see utils/palette.js). */
export const usePalette = () => paletteOf(useTheme());
