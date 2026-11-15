import React, { useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, MarkLineComponent, ToolboxComponent, TooltipComponent } from "echarts/components";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { haloLabel, saveImageFeature, useChartTheme } from "../../utils/chartTheme";
import { escapeHtml } from "../../utils/escapeHtml";
import { svgToolboxFeature } from "../../utils/exporters";
import { CLASS_LABELS, CLASS_MARKS, INTERACTION_CLASSES, classColor } from "../../utils/interactions";
import { PLUS_PATH, useNarrow } from "./parts";

echarts.use([ScatterChart, GridComponent, TooltipComponent, MarkLineComponent, ToolboxComponent, CanvasRenderer]);

// classes drawn last lie on top: the many additive pairs go below the others
const DRAW_ORDER = ["weak", "additive", "buffering", "redundant", "epistatic", "neomorphic", "synergistic"];
const LABEL_ALL_BELOW = 30;
const LABEL_CLASS_BELOW = 10;
const floor10 = (value) => Math.floor(value * 10) / 10;
const ceil10 = (value) => Math.ceil(value * 10) / 10;

/**
 * Every pair of a dataset: how large its response is compared with the sum of
 * the two single genes (x) against how well the two single genes explain it
 * (y). One series per class (colour and mark); pairs outside the filter fade.
 *
 *   pairs    rows of `/interactions/{dataset}`
 *   visible  Set of the labels that pass the class filter and the search
 *   chosen   label of the chosen pair, or ""
 *   onPick   (index of the pair in `pairs`) => void, a point was clicked
 */
const OverviewChart = ({ pairs, visible, chosen = "", labels = CLASS_LABELS, onPick, height = 440 }) => {
  const chart = useChartTheme();
  const { p } = chart;
  const narrow = useNarrow();
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const option = useMemo(() => {
    // pair names: every visible pair when few are visible, else the pairs of the classes with few members
    const labelAll = visible.size <= LABEL_ALL_BELOW;
    const shownPerClass = {};
    pairs.forEach((pair) => {
      if (visible.has(pair.label)) shownPerClass[pair.class] = (shownPerClass[pair.class] || 0) + 1;
    });
    const picked = pairs.findIndex((pair) => pair.label === chosen);
    // the name of the chosen pair needs room: its closest neighbours go without a name
    const crowds = (pair) =>
      picked >= 0 && Math.abs(pair.magnitude - pairs[picked].magnitude) < 0.16 && Math.abs(pair.fit - pairs[picked].fit) < 0.07;
    const series = DRAW_ORDER.filter((id) => INTERACTION_CLASSES.includes(id)).map((id, order) => {
      const mark = CLASS_MARKS[id];
      const color = classColor(id, p);
      const quiet = id === "additive" || id === "weak";
      return {
        id,
        name: labels[id] || id,
        type: "scatter",
        symbol: mark.symbol === "plus" ? `path://${PLUS_PATH}` : mark.symbol,
        symbolRotate: mark.rotate || 0,
        symbolSize: quiet ? 8 : 11,
        itemStyle: mark.hollow
          ? { color: p.surface, borderColor: color, borderWidth: 1.6 }
          : { color, borderColor: p.surface, borderWidth: 1, opacity: quiet ? 0.75 : 1 },
        emphasis: { scale: 1.4 },
        label: haloLabel(p, { position: "top", distance: 4, fontSize: 10.5, formatter: (params) => pairs[params.data.value[2]].label }),
        labelLayout: { hideOverlap: true },
        z: 2 + order,
        data: pairs
          .map((pair, index) => ({ pair, index }))
          .filter(({ pair }) => pair.class === id)
          .map(({ pair, index }) => {
            const shown = visible.has(pair.label);
            return {
              value: [pair.magnitude, pair.fit, index],
              itemStyle: shown ? undefined : { opacity: 0.14 },
              label: { show: shown && !crowds(pair) && (labelAll || (!quiet && shownPerClass[id] <= LABEL_CLASS_BELOW)) },
            };
          }),
      };
    });
    const line = (extra) => ({ symbol: "none", silent: true, lineStyle: { color: p.axis, width: 1, type: "dashed" }, ...extra });
    const lineLabel = (text, extra = {}) => haloLabel(p, { formatter: text, color: p.muted, fontSize: 11, ...extra });
    return {
      animation: false,
      grid: { left: narrow ? 66 : 58, right: 20, top: 34, bottom: narrow ? 62 : 50 },
      toolbox: {
        right: 4,
        top: 0,
        itemSize: 14,
        feature: {
          saveAsImage: saveImageFeature(p, "genesetr-genetic-interactions"),
          mySvg: svgToolboxFeature("genesetr-genetic-interactions"),
        },
      },
      xAxis: {
        type: "value",
        name: `Magnitude: pair response /${narrow ? "\n" : " "}sum of the two single responses`,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { fontSize: 12.5 },
        min: (range) => Math.min(0.4, floor10(range.min - 0.05)),
        max: (range) => Math.max(1.7, ceil10(range.max + 0.05)),
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        name: `Fit: share explained${narrow ? "\n" : " "}by the two genes`,
        nameLocation: "middle",
        nameGap: 38,
        nameTextStyle: { fontSize: 12.5 },
        min: (range) => Math.min(0, floor10(range.min)),
        max: 1,
        splitLine: { show: false },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const pair = pairs[params.data?.value?.[2]];
          if (!pair) return "";
          return [
            `<strong>${escapeHtml(pair.a)} + ${escapeHtml(pair.b)}</strong>`,
            escapeHtml(labels[pair.class] || pair.class),
            `Magnitude ${pair.magnitude.toFixed(2)} · fit ${pair.fit.toFixed(2)}`,
            `Weights ${pair.coefficients.a.toFixed(2)} (${escapeHtml(pair.a)}), ${pair.coefficients.b.toFixed(2)} (${escapeHtml(pair.b)})`,
            `${pair.interactionGenes.toLocaleString("en-US")} genes off the sum`,
          ].join("<br/>");
        },
      },
      series: [
        {
          id: "guides",
          type: "scatter",
          data: [],
          silent: true,
          markLine: {
            animation: false,
            silent: true,
            symbol: "none",
            data: [
              line({ xAxis: 1, lineStyle: { color: p.axis, width: 1, type: "solid" }, label: lineLabel(narrow ? "sum" : "pair = sum", { position: "end" }) }),
              line({ xAxis: 0.7, label: lineLabel(narrow ? "0.7×" : "0.7 × sum", { position: "end" }) }),
              line({ xAxis: 1.3, label: lineLabel(narrow ? "1.3×" : "1.3 × sum", { position: "end" }) }),
              line({ yAxis: 0.5, label: lineLabel("fit 0.5", { position: "insideStartBottom" }) }),
            ],
          },
          z: 1,
        },
        ...series,
        {
          id: "chosen",
          type: "scatter",
          silent: true,
          symbol: "circle",
          symbolSize: 22,
          itemStyle: { color: "transparent", borderColor: p.text, borderWidth: 2 },
          label: haloLabel(p, {
            show: true,
            position: "top",
            distance: 6,
            fontSize: 12.5,
            fontWeight: 600,
            formatter: () => (picked >= 0 ? `${pairs[picked].a} + ${pairs[picked].b}` : ""),
          }),
          data: picked >= 0 ? [[pairs[picked].magnitude, pairs[picked].fit, picked]] : [],
          z: 20,
        },
      ],
    };
  }, [pairs, visible, chosen, labels, p, narrow]);

  // The chart is rebuilt when the events object changes: keep it the same
  const events = useMemo(
    () => ({
      click: (params) => {
        const index = params?.data?.value?.[2];
        if (typeof index === "number" && pickRef.current) pickRef.current(index);
      },
    }),
    []
  );

  return (
    <ReactEChartsCore echarts={echarts} theme={chart.theme} option={option} notMerge onEvents={events} style={{ height, width: "100%" }} />
  );
};

export { OverviewChart };
