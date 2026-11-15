/**
 * Shared pieces for the score scatter charts (expression analyzer, gene
 * signature): colours that read the same for red-green colour-blind users,
 * and stable pseudo-random numbers.
 */

/**
 * "r, g, b" of the two directions (orange = up / positive, purple = down /
 * negative) on a light background. Charts take the values of the current theme
 * from the palette instead (`useChartTheme().p.upRgb`, `.downRgb`,
 * `.highlightRgb`, `.controlRgb`, `.otherRgb`); these constants remain for code
 * that draws on a fixed light background.
 */
export const UP_RGB = "230, 97, 1";
export const DOWN_RGB = "94, 60, 153";
export const HIGHLIGHT_RGB = "39, 96, 245";
export const CONTROL_RGB = "216, 245, 39";
export const OTHER_RGB = "200, 200, 200";

export const rgba = (rgb, alpha = 1) => `rgba(${rgb}, ${alpha})`;

/**
 * A number in [0, 1) that depends only on the text (and the salt). The charts
 * thin out non-significant points and spread points vertically; with
 * Math.random() a different subset appeared, and every point jumped, whenever
 * an unrelated setting changed.
 */
export const stableUnit = (text, salt = 0) => {
  let hash = 2166136261 ^ salt;
  const value = String(text);
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Final mixing, so similar names ("RPL3", "RPL4") do not get similar numbers
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967296;
};
