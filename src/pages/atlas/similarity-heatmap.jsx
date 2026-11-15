import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { saveAs } from "file-saver";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { FaDownload } from "react-icons/fa";
import { ToolbarButton } from "../../components/ui";
import { rgba } from "../../utils/chartStyle";
import { useChartTheme } from "../../utils/chartTheme";
import { escapeHtml } from "../../utils/escapeHtml";
import { optionToSvg, saveJpegAsPdf } from "../../utils/exporters";
import { fmt } from "./parts";
import styles from "./atlas-page.module.scss";

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const TOP = 50; // room for the colour scale
const RIGHT = 14;

/**
 * Size of the picture for `count` genes: the names are drawn while a square is
 * large enough to hold one; a square never gets smaller than `cellMin` pixels
 * (the picture then scrolls sideways inside its frame) nor larger than `cellMax`.
 */
const layoutFor = (count, symbols) => {
  const labels = count <= 70;
  const cellMin = count <= 40 ? 14 : count <= 70 ? 10 : count <= 150 ? 5 : 2;
  const cellMax = count <= 40 ? 28 : count <= 70 ? 16 : count <= 150 ? 8 : 4;
  const fontSize = count <= 40 ? 11 : 9.5;
  const longest = symbols.reduce((length, name) => Math.max(length, String(name).length), 0);
  const margin = labels ? Math.min(120, 16 + Math.ceil(longest * fontSize * 0.62)) : 12;
  return {
    labels,
    fontSize,
    margin,
    minWidth: count * cellMin + margin + RIGHT,
    maxWidth: Math.max(320, count * cellMax + margin + RIGHT),
  };
};

/** Width of an element, followed while it changes. */
const useWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => setWidth(Math.round(node.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

const dataUrlBlob = (dataUrl, type) => {
  const binary = atob(String(dataUrl).split(",")[1] || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

/**
 * Consensus similarity among the genes of a list as a heatmap: rows and
 * columns in the clustered order, colours on a diverging scale around zero.
 *
 *   heat      result of `similarityHeatmap` ({ symbols, cells, limit })
 *   pairText  what a positive value means, for the tooltip
 *   filename  name of the saved pictures (without date and extension)
 */
const SimilarityHeatmap = ({ heat, pairText = "Mean correlation", filename = "genesetr-atlas-similarity" }) => {
  const chart = useChartTheme();
  const { p } = chart;
  const chartRef = useRef(null);
  const [frameRef, width] = useWidth();
  const { symbols, cells, limit } = heat;
  const count = symbols.length;
  const layout = useMemo(() => layoutFor(count, symbols), [count, symbols]);
  const height = Math.max(0, width - layout.margin - RIGHT) + TOP + layout.margin;

  const option = useMemo(() => {
    const axis = {
      type: "category",
      data: symbols,
      axisTick: { show: false },
      axisLine: { show: false },
      splitLine: { show: false },
      axisLabel: { show: layout.labels, interval: 0, fontSize: layout.fontSize, color: p.text, margin: 5 },
    };
    return {
      animation: false,
      grid: { left: layout.margin, right: RIGHT, top: TOP, bottom: layout.margin },
      xAxis: { ...axis, axisLabel: { ...axis.axisLabel, rotate: 90 } },
      yAxis: { ...axis, inverse: true },
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: (params) => {
          const [column, row, r, score, datasets] = params.data || [];
          if (typeof column !== "number") return "";
          return [
            `<strong>${escapeHtml(symbols[row])}</strong> and <strong>${escapeHtml(symbols[column])}</strong>`,
            `${escapeHtml(pairText)}: ${fmt(r, 3)}`,
            `Evidence score: ${fmt(score, 1)}`,
            `Datasets with both: ${datasets}`,
          ].join("<br/>");
        },
      },
      visualMap: {
        type: "continuous",
        dimension: 2,
        min: -limit,
        max: limit,
        orient: "horizontal",
        left: "center",
        top: 6,
        itemWidth: 12,
        itemHeight: Math.max(80, Math.min(170, width - 170)),
        calculable: false,
        hoverLink: false,
        text: [`r = +${limit.toFixed(2)}`, `r = −${limit.toFixed(2)}`],
        textStyle: { color: p.text, fontSize: 11.5 },
        inRange: { color: [rgba(p.downRgb, 1), p.surface, rgba(p.upRgb, 1)] },
      },
      series: [
        {
          id: "similarity",
          type: "heatmap",
          data: cells,
          itemStyle: { borderColor: p.surface, borderWidth: count <= 70 ? 1 : 0 },
          emphasis: { itemStyle: { borderColor: p.text, borderWidth: 1 } },
        },
      ],
    };
  }, [symbols, cells, limit, count, layout, width, p, pairText]);

  const save = (kind) => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance) return;
    try {
      if (kind === "svg") {
        const svg = optionToSvg({ ...instance.getOption(), backgroundColor: p.bg }, instance.getWidth(), instance.getHeight());
        saveAs(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}-${stamp()}.svg`);
      } else if (kind === "pdf") {
        const url = instance.getDataURL({ type: "jpeg", pixelRatio: 3, backgroundColor: p.bg });
        saveJpegAsPdf(url, instance.getWidth(), instance.getHeight(), filename);
      } else {
        const url = instance.getDataURL({ type: "png", pixelRatio: 3, backgroundColor: p.bg });
        saveAs(dataUrlBlob(url, "image/png"), `${filename}-${stamp()}.png`);
      }
    } catch (error) {
      toast({ message: { type: "Error", icon: true, content: "The picture could not be saved", details: error?.message || "" }, autoClose: 4000 });
    }
  };

  const button = (kind, label, title) => (
    <ToolbarButton size="sm" icon={<FaDownload size={11} aria-hidden="true" />} onClick={() => save(kind)} title={title} disabled={width === 0}>
      {label}
    </ToolbarButton>
  );

  return (
    <>
      <div className={styles.heatScroll} data-testid="atlas-similarity-heatmap" data-genes={symbols.join(",")}>
        <div ref={frameRef} style={{ minWidth: layout.minWidth, maxWidth: layout.maxWidth }}>
          {width > 0 && (
            <ReactEChartsCore
              ref={chartRef}
              echarts={echarts}
              theme={chart.theme}
              option={option}
              notMerge
              style={{ height, width: "100%" }}
            />
          )}
        </div>
      </div>
      <div className={styles.row} data-testid="atlas-similarity-picture">
        <span className={styles.muted}>Save the picture:</span>
        {button("png", "PNG", "Picture at three times the screen resolution")}
        {button("svg", "SVG", "Vector graphics, for figures")}
        {button("pdf", "PDF", "One page of the size of the picture")}
      </div>
    </>
  );
};

export { SimilarityHeatmap };
