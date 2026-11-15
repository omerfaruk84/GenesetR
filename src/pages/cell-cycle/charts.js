/**
 * ECharts options of the cell-cycle page. Colours: phases from phaseColors(p),
 * significance in the accent colour, the rest in the neutral grey.
 */
import { pdfToolboxFeature, svgToolboxFeature } from "../../utils/exporters";
import { saveImageFeature } from "../../utils/chartTheme";
import { FDR_CUTOFF, PHASES, formatFdr, isNum, phaseColors } from "../../utils/cellCycle";

const toolbox = (p, name) => ({
  top: 0,
  right: 0,
  itemSize: 13,
  feature: {
    saveAsImage: saveImageFeature(p, `genesetr_${name}`, { pixelRatio: 2 }),
    mySvg: svgToolboxFeature(`genesetr-${name}`),
    myPdf: pdfToolboxFeature(`genesetr-${name}`),
  },
});

const pct = (v) => (isNum(v) ? Math.round(v * 1000) / 10 : null);

/**
 * Phase-shift map: every perturbation at (Δ S share, Δ G2/M share) in percentage points.
 * Δ G1 is minus their sum, so the lower left holds G1 accumulation, the right S, the top G2/M.
 */
export const shiftMapOption = (rows, p, { selected, minCells = 0, labels = 12 } = {}) => {
  const colors = phaseColors(p);
  const usable = rows.filter((r) => isNum(r.delta_s) && isNum(r.delta_g2m) && (r.n_cells || 0) >= minCells);
  const sig = [];
  const rest = [];
  usable.forEach((r) => {
    const point = {
      value: [pct(r.delta_s), pct(r.delta_g2m), r.n_cells, r.fdr_phase],
      name: r.target,
    };
    if (isNum(r.fdr_phase) && r.fdr_phase < FDR_CUTOFF) sig.push(point);
    else rest.push(point);
  });
  // label the strongest significant shifts
  const strength = (pt) => Math.hypot(pt.value[0], pt.value[1], -(pt.value[0] + pt.value[1]));
  const labelled = new Set([...sig].sort((a, b) => strength(b) - strength(a)).slice(0, labels).map((pt) => pt.name));
  const sel = usable.find((r) => r.target === selected);
  const extent = Math.max(
    5,
    ...usable.map((r) => Math.max(Math.abs(pct(r.delta_s)), Math.abs(pct(r.delta_g2m))))
  );
  const lim = Math.min(100, Math.ceil((extent * 1.05) / 5) * 5); // round limit: no stray tick at the edge
  const size = (n) => Math.max(4, Math.min(16, 2.2 * Math.log2((n || 1) + 1)));

  return {
    animation: false,
    toolbox: toolbox(p, "cell-cycle-shift-map"),
    grid: { top: 30, left: 56, right: 18, bottom: 50 },
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const [ds, dg, n, fdr] = params.value;
        const dg1 = -(ds + dg);
        const f = (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} pp`;
        return `<b>${params.name}</b><br/>Δ G1 ${f(dg1)} · Δ S ${f(ds)} · Δ G2/M ${f(dg)}<br/>${n} cells · FDR ${
          formatFdr(fdr)
        }`;
      },
    },
    xAxis: {
      type: "value",
      name: "Δ share of cells in S (percentage points)",
      nameLocation: "middle",
      nameGap: 30,
      min: -lim,
      max: lim,
    },
    yAxis: {
      type: "value",
      name: "Δ share in G2/M (pp)",
      nameLocation: "middle",
      nameGap: 38,
      min: -lim,
      max: lim,
    },
    series: [
      {
        name: "Not significant",
        type: "scatter",
        data: rest,
        // large mode (many points) needs a fixed size
        symbolSize: rest.length > 4000 ? 4 : (v) => size(v[2]),
        itemStyle: { color: `rgba(${p.otherRgb}, 0.45)` },
        large: rest.length > 4000,
        largeThreshold: 4000,
        z: 1,
      },
      {
        name: `FDR < ${FDR_CUTOFF}`,
        type: "scatter",
        data: sig,
        symbolSize: (v) => size(v[2]),
        itemStyle: {
          color: (params) => {
            const [ds, dg] = params.value;
            const dg1 = -(ds + dg);
            const best = Math.max(ds, dg, dg1);
            return best === dg ? colors.g2m : best === ds ? colors.s : colors.g1;
          },
          opacity: 0.85,
          borderColor: p.surface,
          borderWidth: 0.5,
        },
        label: {
          show: true,
          position: "right",
          fontSize: 10.5,
          color: p.text,
          formatter: (params) => (labelled.has(params.name) ? params.name : ""),
        },
        labelLayout: { hideOverlap: true },
        z: 2,
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: p.axis, type: "dashed", width: 1 },
          label: { show: false },
          data: [{ xAxis: 0 }, { yAxis: 0 }, [{ coord: [lim, -lim] }, { coord: [-lim, lim] }]],
        },
        markArea: {
          silent: true,
          itemStyle: { color: "transparent" },
          label: { color: p.muted, fontSize: 11 },
          data: [
            [{ name: "G2/M ↑", coord: [-lim, lim * 0.82] }, { coord: [-lim * 0.6, lim] }],
            [{ name: "S ↑", coord: [lim * 0.78, -lim * 0.08] }, { coord: [lim, lim * 0.08] }],
            [{ name: "G1 ↑", coord: [-lim, -lim] }, { coord: [-lim * 0.6, -lim * 0.82] }],
          ],
        },
      },
      ...(sel
        ? [
            {
              name: "Selected",
              type: "scatter",
              data: [{ value: [pct(sel.delta_s), pct(sel.delta_g2m), sel.n_cells, sel.fdr_phase], name: sel.target }],
              symbolSize: 18,
              itemStyle: { color: "transparent", borderColor: p.text, borderWidth: 2 },
              label: { show: true, position: "top", formatter: "{b}", fontWeight: 600, color: p.text },
              z: 3,
            },
          ]
        : []),
    ],
  };
};

/** Signature map for datasets without phase calls: S signature vs G2/M signature (robust z). */
export const signatureMapOption = (rows, p, { selected, labels = 12, drug = false } = {}) => {
  const colors = phaseColors(p);
  const usable = rows.filter((r) => isNum(r.rz_s) && isNum(r.rz_g2m));
  const strength = (r) => Math.hypot(r.rz_s, r.rz_g2m);
  const labelled = new Set([...usable].sort((a, b) => strength(b) - strength(a)).slice(0, labels).map((r) => r.target));
  const sel = usable.find((r) => r.target === selected);
  const ext = Math.max(4, ...usable.map((r) => Math.max(Math.abs(r.rz_s), Math.abs(r.rz_g2m))));
  const lim = Math.ceil((Math.min(ext, 40) * 1.05) / 2) * 2;
  return {
    animation: false,
    toolbox: toolbox(p, "cell-cycle-signature-map"),
    grid: { top: 30, left: 56, right: 18, bottom: 50 },
    tooltip: {
      trigger: "item",
      formatter: (params) =>
        `<b>${params.name}</b><br/>S signature ${params.value[0].toFixed(1)} · G2/M signature ${params.value[1].toFixed(1)} (robust z)`,
    },
    xAxis: { type: "value", name: "S-phase gene signature (robust z)", nameLocation: "middle", nameGap: 30, min: -lim, max: lim },
    yAxis: { type: "value", name: "G2/M gene signature (robust z)", nameLocation: "middle", nameGap: 38, min: -lim, max: lim },
    series: [
      {
        type: "scatter",
        name: drug ? "Treatments" : "Perturbations",
        data: usable.map((r) => ({ value: [r.rz_s, r.rz_g2m], name: r.target })),
        symbolSize: 5,
        // large mode draws one colour; per-point colours need the normal mode
        large: false,
        itemStyle: {
          color: (params) => {
            const [a, b] = params.value;
            if (Math.max(Math.abs(a), Math.abs(b)) < 3) return `rgba(${p.otherRgb}, 0.45)`;
            if (a < 0 && b < 0) return colors.g1;
            return b > a ? colors.g2m : colors.s;
          },
        },
        label: {
          show: true,
          position: "right",
          fontSize: 10.5,
          color: p.text,
          formatter: (params) => (labelled.has(params.name) ? params.name : ""),
        },
        labelLayout: { hideOverlap: true },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: p.axis, type: "dashed", width: 1 },
          label: { show: false },
          data: [{ xAxis: 0 }, { yAxis: 0 }],
        },
      },
      ...(sel
        ? [
            {
              type: "scatter",
              name: "Selected",
              data: [{ value: [sel.rz_s, sel.rz_g2m], name: sel.target }],
              symbolSize: 16,
              itemStyle: { color: "transparent", borderColor: p.text, borderWidth: 2 },
              label: { show: true, position: "top", formatter: "{b}", fontWeight: 600, color: p.text },
            },
          ]
        : []),
    ],
  };
};

/** Phase composition of the perturbation next to its batch-matched controls (100 % stacked bars). */
export const compositionOption = (row, p) => {
  if (!row || !isNum(row.frac_g1)) return null;
  const colors = phaseColors(p);
  const cats = ["Matched controls", "Perturbation"];
  return {
    animation: false,
    toolbox: toolbox(p, `cell-cycle-composition-${row.target}`),
    legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11.5 } },
    grid: { top: 30, left: 110, right: 24, bottom: 26 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${v} %` },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value} %" } },
    yAxis: { type: "category", data: cats, inverse: true },
    series: PHASES.map(({ key, label }) => ({
      name: label,
      type: "bar",
      stack: "phase",
      barWidth: 22,
      itemStyle: { color: colors[key] },
      label: { show: true, color: "#fff", fontSize: 11, formatter: (v) => (v.value >= 8 ? `${v.value}` : "") },
      data: [pct(row[`exp_${key}`]), pct(row[`frac_${key}`])],
    })),
  };
};

/** Score density of the perturbation (above the axis) against controls (below), one score. */
export const densityOption = (density, scoreKey, p, title) => {
  const t = density?.target?.[scoreKey];
  const c = density?.control?.[scoreKey];
  if (!t?.x?.length) return null;
  const color = phaseColors(p)[scoreKey];
  const ymax = Math.max(1e-9, ...t.y, ...(c?.y || [0])) * 1.1;
  return {
    animation: false,
    toolbox: toolbox(p, `cell-cycle-${scoreKey}-density`),
    title: { text: title, left: 0, top: 0, textStyle: { fontSize: 12.5, fontWeight: 600 } },
    grid: { top: 30, left: 18, right: 12, bottom: 26 },
    tooltip: { trigger: "axis", valueFormatter: (v) => (isNum(v) ? Math.abs(v).toFixed(2) : "–") },
    xAxis: { type: "value", scale: true, axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", min: -ymax, max: ymax, axisLabel: { show: false }, splitLine: { show: false } },
    series: [
      {
        name: "Perturbation",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: t.x.map((x, i) => [x, t.y[i]]),
        lineStyle: { width: 1.3, color },
        areaStyle: { color, opacity: 0.35 },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: p.axis, type: "solid" },
          data: [{ yAxis: 0 }],
        },
      },
      ...(c?.x?.length
        ? [
            {
              name: "Controls",
              type: "line",
              smooth: true,
              showSymbol: false,
              data: c.x.map((x, i) => [x, -c.y[i]]),
              lineStyle: { width: 1.3, color: `rgb(${p.otherRgb})` },
              areaStyle: { color: `rgb(${p.otherRgb})`, opacity: 0.35 },
            },
          ]
        : []),
    ],
  };
};

/** Gene across datasets: Δ share per phase, one group of bars per dataset with phase calls. */
export const geneAcrossOption = (items, p) => {
  const withPhase = items.filter((i) => i.has_phase && isNum(i.values?.delta_g1));
  if (withPhase.length === 0) return null;
  const colors = phaseColors(p);
  const names = withPhase.map((i) => i.name || i.dataset_id);
  return {
    animation: false,
    toolbox: toolbox(p, "cell-cycle-gene-across-datasets"),
    legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 8 },
    grid: { top: 30, left: 12, right: 20, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const item = withPhase[params[0].dataIndex];
        const fdr = item.values.fdr_phase;
        return `<b>${params[0].name}</b> · ${item.values.n_cells} cells · FDR ${formatFdr(fdr)}<br/>${params
          .map((x) => `${x.marker}${x.seriesName} ${x.value > 0 ? "+" : ""}${x.value} pp`)
          .join("<br/>")}`;
      },
    },
    xAxis: { type: "value", name: "Δ share of cells (pp)", nameLocation: "middle", nameGap: 26 },
    yAxis: {
      type: "category",
      data: names,
      inverse: true,
      axisLabel: {
        fontSize: 11.5,
        formatter: (v, idx) => {
          const fdr = withPhase[idx]?.values?.fdr_phase;
          return isNum(fdr) && fdr < FDR_CUTOFF ? `{sig|${v} ●}` : v;
        },
        rich: { sig: { fontWeight: 600, color: p.text } },
      },
    },
    series: PHASES.map(({ key, label }) => ({
      name: label,
      type: "bar",
      barGap: "10%",
      barMaxWidth: 10,
      itemStyle: { color: colors[key] },
      data: withPhase.map((i) => pct(i.values[`delta_${key}`])),
    })),
  };
};
