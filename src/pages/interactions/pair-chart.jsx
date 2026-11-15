import React, { useMemo } from "react";
import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { DataZoomComponent, GridComponent, ToolboxComponent, TooltipComponent } from "echarts/components";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { rgba } from "../../utils/chartStyle";
import { haloLabel, saveImageFeature, useChartTheme } from "../../utils/chartTheme";
import { escapeHtml } from "../../utils/escapeHtml";
import { svgToolboxFeature } from "../../utils/exporters";
import { expectedObservedPoints, kindLabel, sharedExtent } from "../../utils/interactions";
import { useNarrow } from "./parts";

echarts.use([ScatterChart, LineChart, GridComponent, TooltipComponent, DataZoomComponent, ToolboxComponent, CanvasRenderer]);

const LABELS_PER_SIDE = 8;

/**
 * One pair, gene by gene: the change the sum of the two single genes predicts
 * (x) against the change measured in the pair (y). Genes on the diagonal are
 * additive; genes that deviate at the FDR are coloured by the side they are on,
 * and the strongest of both sides are named.
 *
 *   pair  answer of `/interactions/{dataset}/pair`
 */
const PairChart = ({ pair, height = 480 }) => {
  const chart = useChartTheme();
  const { p } = chart;
  const narrow = useNarrow();

  const option = useMemo(() => {
    const groups = expectedObservedPoints(pair.points);
    const along = narrow ? 0.05 : 0.9;
    const unit = `${narrow ? "\n" : " "}(change, control SD)`;
    const { low, high, step } = sharedExtent(pair.points, { exclude: [pair.a, pair.b] });
    const details = {};
    [...(pair.above || []), ...(pair.below || [])].forEach((row) => {
      details[row.gene] = row;
    });
    const up = rgba(p.upRgb, 1);
    const down = rgba(p.downRgb, 1);
    const axis = (name, gap) => ({
      type: "value",
      name,
      nameLocation: "middle",
      nameGap: gap,
      nameTextStyle: { fontSize: 12.5 },
      min: low,
      max: high,
      interval: step,
      splitLine: { show: false },
    });
    const points = (id, data, color, size, opacity, z) => ({
      id,
      type: "scatter",
      data,
      symbolSize: size,
      itemStyle: { color, opacity },
      emphasis: { scale: 1.6, itemStyle: { opacity: 1 } },
      large: false,
      z,
    });
    // the strongest genes of a side, named on the side away from the line
    const named = (id, rows, position) => ({
      id,
      type: "scatter",
      data: rows.map((row) => [row.expected, row.observed, row.gene]),
      symbolSize: 7,
      itemStyle: { color: "transparent", borderColor: p.text, borderWidth: 1 },
      label: haloLabel(p, { show: true, position, distance: 5, fontSize: 11, formatter: (params) => params.data[2] }),
      labelLayout: { hideOverlap: true },
      emphasis: { scale: 1.2 },
      z: 5,
    });
    return {
      animation: false,
      grid: { left: narrow ? 66 : 58, right: 20, top: 30, bottom: narrow ? 62 : 50 },
      toolbox: {
        right: 4,
        top: 0,
        itemSize: 14,
        feature: {
          saveAsImage: saveImageFeature(p, `genesetr-interaction-${pair.a}-${pair.b}`),
          mySvg: svgToolboxFeature(`genesetr-interaction-${pair.a}-${pair.b}`),
        },
      },
      xAxis: axis(`Expected: ${pair.a} alone + ${pair.b} alone${unit}`, 30),
      yAxis: axis(`Observed: ${pair.a} + ${pair.b} together${unit}`, 38),
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        { type: "inside", yAxisIndex: 0, filterMode: "none" },
      ],
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const [expected, observed, gene] = params.data || [];
          if (typeof gene !== "string") return "";
          const row = details[gene];
          const lines = [`<strong>${escapeHtml(gene)}</strong>`, `Sum of the two genes ${expected.toFixed(2)} · pair ${observed.toFixed(2)}`];
          if (row) {
            lines.push(
              `${escapeHtml(kindLabel(row.kind))}`,
              `z: ${escapeHtml(pair.a)} ${row.zA}, ${escapeHtml(pair.b)} ${row.zB}, pair ${row.zPair}`,
              `Interaction z ${row.interactionZ}`
            );
          }
          return lines.join("<br/>");
        },
      },
      series: [
        {
          id: "diagonal",
          type: "line",
          data: [
            [low, low],
            [high, high],
          ],
          symbol: "none",
          silent: true,
          lineStyle: { color: p.axis, width: 1 },
          z: 1,
        },
        {
          // the name of the line, in an empty corner below it (the lower one where the plot is narrow)
          id: "diagonal-name",
          type: "scatter",
          silent: true,
          symbolSize: 0,
          data: [[low + along * (high - low), low + along * (high - low)]],
          label: haloLabel(p, { show: true, position: "right", distance: 8, formatter: "pair = sum", color: p.muted, fontSize: 11 }),
          z: 1,
        },
        points("rest", groups.rest, rgba(p.otherRgb, 1), 4, 0.5, 2),
        points("below", groups.below, down, 6, 0.9, 3),
        points("above", groups.above, up, 6, 0.9, 3),
        named("named-above", (pair.above || []).slice(0, LABELS_PER_SIDE), "left"),
        named("named-below", (pair.below || []).slice(0, LABELS_PER_SIDE), "right"),
      ],
    };
  }, [pair, p, narrow]);

  return <ReactEChartsCore echarts={echarts} theme={chart.theme} option={option} notMerge style={{ height, width: "100%" }} />;
};

export { PairChart };
