/**
 * One look for every ECharts chart, in both themes.
 *
 *   const chart = useChartTheme();
 *   <ReactEChartsCore echarts={echarts} theme={chart.theme} option={option} />
 *
 * The registered themes set text, axis, grid-line, legend, tooltip and toolbox
 * colours, so options only need to state what is specific to the chart. For
 * colours an option computes itself (per-point colours, mark lines) use
 * `chart.p` (the palette) and the helpers below.
 */
import * as echarts from "echarts/core";
import { PALETTES } from "./palette";
import { useTheme } from "./theme";

const FONT = "Inter, 'Noto Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const axis = (p, { split = true } = {}) => ({
  axisLine: { show: true, lineStyle: { color: p.axis } },
  axisTick: { show: true, lineStyle: { color: p.axis } },
  axisLabel: { color: p.muted, fontSize: 12 },
  nameTextStyle: { color: p.text, fontSize: 13, fontWeight: 500 },
  splitLine: { show: split, lineStyle: { color: p.grid, type: "solid" } },
  splitArea: { show: false },
});

const pointerLabel = (p) => ({
  backgroundColor: p.mode === "dark" ? "#3a4553" : "#4a5462",
  color: "#fff",
});

const buildTheme = (p) => ({
  color: p.series,
  backgroundColor: "transparent",
  textStyle: { color: p.text, fontFamily: FONT },
  title: {
    textStyle: { color: p.text, fontSize: 15, fontWeight: 600 },
    subtextStyle: { color: p.muted, fontSize: 12 },
  },
  legend: {
    textStyle: { color: p.text, fontSize: 12 },
    inactiveColor: p.faint,
    pageTextStyle: { color: p.muted },
    pageIconColor: p.muted,
    pageIconInactiveColor: p.border,
  },
  tooltip: {
    backgroundColor: p.tooltipBg,
    borderColor: p.borderStrong,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: p.text, fontSize: 12.5 },
    extraCssText: "box-shadow: 0 6px 20px rgba(0,0,0,0.18); border-radius: 6px;",
    axisPointer: {
      lineStyle: { color: p.axis },
      crossStyle: { color: p.axis },
      label: pointerLabel(p),
    },
  },
  axisPointer: {
    lineStyle: { color: p.axis },
    label: pointerLabel(p),
  },
  categoryAxis: axis(p, { split: false }),
  valueAxis: axis(p),
  logAxis: axis(p),
  timeAxis: axis(p),
  toolbox: {
    iconStyle: { borderColor: p.muted },
    emphasis: { iconStyle: { borderColor: p.accent } },
  },
  dataZoom: {
    borderColor: p.border,
    backgroundColor: "transparent",
    dataBackgroundColor: p.border,
    fillerColor: p.mode === "dark" ? "rgba(122, 184, 255, 0.14)" : "rgba(21, 101, 192, 0.10)",
    handleColor: p.axis,
    handleStyle: { color: p.surface, borderColor: p.axis },
    moveHandleStyle: { color: p.axis },
    textStyle: { color: p.muted },
    brushStyle: { color: p.mode === "dark" ? "rgba(122, 184, 255, 0.2)" : "rgba(21, 101, 192, 0.15)" },
  },
  visualMap: { textStyle: { color: p.text } },
  graph: {
    color: p.series,
    label: { color: p.text },
    lineStyle: { color: p.axis },
  },
  markLine: { label: { color: p.text }, lineStyle: { color: p.axis } },
  markPoint: { label: { color: p.text } },
});

echarts.registerTheme("gs-light", buildTheme(PALETTES.light));
echarts.registerTheme("gs-dark", buildTheme(PALETTES.dark));

export const chartThemeName = (theme) => (theme === "dark" ? "gs-dark" : "gs-light");

/** `{ theme, p, isDark }`: ECharts theme name and palette of the current theme. */
export const useChartTheme = () => {
  const theme = useTheme();
  const isDark = theme === "dark";
  return { theme: chartThemeName(theme), p: isDark ? PALETTES.dark : PALETTES.light, isDark };
};

/**
 * Label drawn on top of chart marks: text in the page colour with a halo in the
 * background colour, readable over points and lines in both themes.
 */
export const haloLabel = (p, extra = {}) => ({
  color: p.text,
  textBorderColor: p.bg,
  textBorderWidth: 2.5,
  ...extra,
});

/** "Save as image" of the toolbox: an opaque figure in the page colour. */
export const saveImageFeature = (p, name = "genesetr-chart", extra = {}) => ({
  show: true,
  title: "Save as PNG",
  name,
  pixelRatio: 3,
  backgroundColor: p.bg,
  ...extra,
});
