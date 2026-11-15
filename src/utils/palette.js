/**
 * The colour tokens of global.scss as plain values, for code that cannot read
 * CSS variables: ECharts options, canvas drawing and the MUI theme. Keep the
 * two files in step.
 */
const LIGHT = {
  mode: "light",
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f3f5f8",
  hover: "#eef1f5",
  selected: "#e6f0fb",
  text: "#1f2733",
  muted: "#5d6877",
  faint: "#8a94a3",
  border: "#e1e5ea",
  borderStrong: "#c4c9d0",
  link: "#1565c0",
  accent: "#a63648",
  accentHover: "#8f2d3d",
  onAccent: "#ffffff",
  focus: "#1976d2",
  // "r, g, b" of the two directions, the highlight and the rest (see chartStyle.js)
  upRgb: "230, 97, 1",
  downRgb: "94, 60, 153",
  highlightRgb: "39, 96, 245",
  controlRgb: "150, 170, 20",
  otherRgb: "170, 176, 186",
  // chart furniture
  grid: "#e6e9ee",
  axis: "#9aa3af",
  tooltipBg: "rgba(255, 255, 255, 0.97)",
  // series colours for categories (Okabe-Ito order, colour-blind safe)
  series: ["#0072b2", "#e69f00", "#009e73", "#cc79a7", "#56b4e9", "#d55e00", "#8c6bb1", "#7f7f7f", "#b8a500", "#17a398"],
};

const DARK = {
  mode: "dark",
  bg: "#14181d",
  surface: "#1c2128",
  surfaceAlt: "#232a33",
  hover: "#2b333e",
  selected: "#233549",
  text: "#e6eaf0",
  muted: "#9aa5b3",
  faint: "#6f7b8a",
  border: "#313a46",
  borderStrong: "#45505e",
  link: "#7ab8ff",
  accent: "#e0667a",
  accentHover: "#ea8394",
  onAccent: "#14181d",
  focus: "#7ab8ff",
  upRgb: "246, 160, 77",
  downRgb: "179, 154, 232",
  highlightRgb: "110, 168, 255",
  controlRgb: "216, 245, 39",
  otherRgb: "120, 130, 144",
  grid: "#2a323d",
  axis: "#5b6675",
  tooltipBg: "rgba(28, 33, 40, 0.97)",
  series: ["#4da3e0", "#f0b429", "#2fc79a", "#e495c1", "#7cc8f2", "#f2854a", "#b39ae8", "#a3abb6", "#d9c93a", "#3fc9bd"],
};

export const PALETTES = { light: LIGHT, dark: DARK };

/** Palette of a theme name ("light" | "dark"). */
export const paletteOf = (theme) => (theme === "dark" ? DARK : LIGHT);
