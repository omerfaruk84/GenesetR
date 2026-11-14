import { useSyncExternalStore } from "react";

/**
 * Colour range of the heatmap on screen (see ClusterHeatmap.getRangeInfo), or
 * null when no cluster heatmap is drawn. It lets the settings panel offer a
 * range slider that fits the data. Kept out of the Redux settings on purpose:
 * it describes a result, so it must not travel in permalinks.
 */
let current = null;
const listeners = new Set();

export const setHeatmapRangeInfo = (info) => {
  current = info || null;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useHeatmapRangeInfo = () => useSyncExternalStore(subscribe, () => current, () => current);

/** A step that gives a slider about 40 positions over `span`. */
export const sliderStep = (span) =>
  [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].find((step) => span / step <= 40) || 100;

/**
 * Slider limits for a data range: rounded outwards to the step, and symmetric
 * around zero when the data has both signs.
 */
export const sliderBounds = (dataMin, dataMax) => {
  const lo = Math.min(dataMin, dataMax);
  const hi = Math.max(dataMin, dataMax);
  const step = sliderStep(hi - lo || 1);
  const digits = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  const snap = (value, round) => Number((round(value / step) * step).toFixed(digits));
  let min = snap(lo, Math.floor);
  let max = snap(hi, Math.ceil);
  if (min < 0 && max > 0) {
    const extent = Math.max(-min, max);
    min = -extent;
    max = extent;
  }
  if (!(min < max)) max = Number((min + step).toFixed(digits));
  return { min, max, step, digits };
};
