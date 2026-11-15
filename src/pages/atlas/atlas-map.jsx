import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { DataZoomComponent, GridComponent, TooltipComponent } from "echarts/components";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { mapColorGroups, mapExtent, moduleColor, modulePoints, moduleSeries } from "../../utils/atlas";
import { rgba } from "../../utils/chartStyle";
import { haloLabel, useChartTheme } from "../../utils/chartTheme";
import { escapeHtml } from "../../utils/escapeHtml";

echarts.use([ScatterChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

/**
 * One map of the atlas as a scatter chart. The points are grouped into one
 * series per colour (the palette repeats over the modules), so no point
 * carries a style of its own; the members of the chosen module and the chosen
 * gene are drawn again on top.
 *
 *   map          answer of `/atlas/map/{axis}` (column arrays)
 *   geneIndex    index of the chosen gene, or -1
 *   moduleId     chosen module, or 0
 *   view         { x: [from, to], y: [from, to] } to show; a new object moves the chart there
 *   onPick       (index) => void, a point was clicked
 */
const AtlasMap = ({ map, geneIndex = -1, moduleId = 0, view = null, onPick, height = 600 }) => {
  const chart = useChartTheme();
  const { p } = chart;
  const chartRef = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const colors = useMemo(() => moduleSeries(p.series), [p.series]);
  const groups = useMemo(() => mapColorGroups(map, colors.length), [map, colors.length]);
  const whole = useMemo(() => mapExtent(map), [map]);
  const moduleNames = useMemo(() => {
    const names = {};
    (map.modules || []).forEach((entry) => {
      names[entry.id] = entry.name;
    });
    return names;
  }, [map]);

  const option = useMemo(() => {
    const none = rgba(p.otherRgb, 1);
    const dimmed = moduleId > 0;
    const background = groups.map((data, index) => ({
      id: `colour-${index}`,
      type: "scatter",
      data,
      symbolSize: 5,
      itemStyle: { color: index === 0 ? none : colors[index - 1], opacity: dimmed ? 0.28 : 0.78 },
      emphasis: { scale: 1.8, itemStyle: { opacity: 1 } },
      // only maps much larger than the present ones switch to the batched renderer
      large: true,
      largeThreshold: 4000,
      progressive: 3000,
      progressiveThreshold: 8000,
      z: 2,
    }));
    const members = {
      id: "module",
      type: "scatter",
      data: modulePoints(map, moduleId),
      symbolSize: 8,
      itemStyle: { color: moduleColor(moduleId, colors, none), borderColor: p.text, borderWidth: 0.6, opacity: 1 },
      emphasis: { scale: 1.4 },
      z: 3,
    };
    const gene = {
      id: "gene",
      type: "scatter",
      data: geneIndex >= 0 ? [[map.x[geneIndex], map.y[geneIndex], geneIndex]] : [],
      symbolSize: 16,
      itemStyle: { color: rgba(p.highlightRgb, 1), borderColor: p.bg, borderWidth: 2, opacity: 1 },
      label: haloLabel(p, {
        show: true,
        position: "top",
        distance: 6,
        fontSize: 13,
        fontWeight: 600,
        formatter: (params) => map.symbols[params.data[2]],
      }),
      z: 5,
    };
    const hidden = { show: false, type: "value", scale: true };
    return {
      animation: false,
      grid: { left: 4, right: 4, top: 4, bottom: 4 },
      xAxis: { ...hidden, min: whole.x[0], max: whole.x[1] },
      yAxis: { ...hidden, min: whole.y[0], max: whole.y[1] },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const index = params.data?.[2];
          if (typeof index !== "number") return "";
          const name = moduleNames[map.module[index]];
          return `<strong>${escapeHtml(map.symbols[index])}</strong><br/>${escapeHtml(name || "No module")}`;
        },
      },
      dataZoom: [
        { id: "zoom-x", type: "inside", xAxisIndex: 0, filterMode: "none" },
        { id: "zoom-y", type: "inside", yAxisIndex: 0, filterMode: "none" },
      ],
      series: [...background, members, gene],
    };
  }, [map, groups, colors, whole, moduleNames, moduleId, geneIndex, p]);

  // The chart is rebuilt when the events object changes: keep it the same
  const events = useMemo(
    () => ({
      click: (params) => {
        const index = params?.data?.[2];
        if (typeof index === "number" && pickRef.current) pickRef.current(index);
      },
    }),
    []
  );

  // Move to the requested part of the map. The zoom is not part of the option,
  // so that redrawing (another module, another gene) keeps where the user is.
  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance || !view) return;
    instance.dispatchAction({ type: "dataZoom", dataZoomId: "zoom-x", startValue: view.x[0], endValue: view.x[1] });
    instance.dispatchAction({ type: "dataZoom", dataZoomId: "zoom-y", startValue: view.y[0], endValue: view.y[1] });
  }, [view, chart.theme]);

  return (
    <ReactEChartsCore
      ref={chartRef}
      echarts={echarts}
      theme={chart.theme}
      option={option}
      onEvents={events}
      style={{ height, width: "100%" }}
    />
  );
};

export { AtlasMap };
