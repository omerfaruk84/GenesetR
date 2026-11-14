/**
 * Exports shared by tables, charts and networks.
 *
 *  - tables:   CSV (with a UTF-8 mark so Excel opens it correctly) and TSV
 *  - charts:   SVG of any ECharts chart, as an extra toolbox button
 *  - networks: GraphML and Cytoscape JSON of an ECharts graph series or of a
 *              plain { nodes, links } object
 */
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { saveAs } from "file-saver";
import { toast } from "@oliasoft-open-source/react-ui-library";

echarts.use([SVGRenderer]);

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

const notifyError = (content, details) => toast({ message: { type: "Error", icon: true, content, details }, autoClose: 4000 });

// ---------------------------------------------------------------- tables --

const cellText = (value) => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(cellText).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const delimited = (rows, columns, separator) => {
  const quote = (value) => {
    const text = cellText(value);
    if (separator === "\t") return text.replace(/[\t\r\n]+/g, " ");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    columns.map((column) => quote(column.label)).join(separator),
    ...rows.map((row) => columns.map((column) => quote(column.value(row))).join(separator)),
  ].join("\r\n");
};

/**
 * Columns for an export. `columns` may be material-react-table column
 * definitions ({ accessorKey | accessorFn | id, header }) or omitted, in which
 * case the keys of the first rows are used.
 */
const exportColumns = (rows, columns) => {
  if (Array.isArray(columns) && columns.length > 0) {
    return columns
      .filter((column) => column.accessorKey || column.accessorFn || column.key)
      .map((column) => {
        const key = column.accessorKey || column.key || column.id;
        const label = typeof column.header === "string" ? column.header : column.label || key || "";
        const value = column.accessorFn ? (row) => column.accessorFn(row) : (row) => row?.[key];
        return { label, value };
      });
  }
  const keys = [];
  rows.slice(0, 50).forEach((row) => Object.keys(row || {}).forEach((key) => !keys.includes(key) && keys.push(key)));
  return keys.map((key) => ({ label: key, value: (row) => row?.[key] }));
};

/** Download rows as "csv" or "tsv". Returns false when there is nothing to export. */
export const downloadTable = (rows, { columns = null, filename = "genesetr-table", format = "csv" } = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const cols = exportColumns(rows, columns);
  const tsv = format === "tsv";
  const text = delimited(rows, cols, tsv ? "\t" : ",");
  const blob = new Blob([tsv ? text : `﻿${text}`], {
    type: tsv ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8",
  });
  saveAs(blob, `${filename}-${stamp()}.${tsv ? "tsv" : "csv"}`);
  return true;
};

// ---------------------------------------------------------------- charts --

/** SVG text of a chart described by an ECharts option. */
export const optionToSvg = (option, width, height) => {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  try {
    chart.setOption({ ...option, animation: false, toolbox: { show: false } });
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
};

/**
 * Extra ECharts toolbox button "Save as SVG" (vector graphics for figures):
 *   toolbox: { feature: { saveAsImage: {...}, mySvg: svgToolboxFeature("name") } }
 * 3D (WebGL) charts cannot be drawn as SVG; the user is told so.
 */
export const svgToolboxFeature = (name = "genesetr-chart") => ({
  show: true,
  title: "Save as SVG",
  icon: "path://M4 2h10l6 6v14H4z M14 2v6h6 M8 17l2.5-5 2.5 5 M8.8 15.5h3.4",
  onclick: (ecModel, api) => {
    try {
      const svg = optionToSvg(ecModel.getOption(), api.getWidth(), api.getHeight());
      saveAs(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${name}-${stamp()}.svg`);
    } catch (error) {
      notifyError("This chart could not be saved as SVG", "3D charts are only available as PNG. " + (error?.message || ""));
    }
  },
});

// -------------------------------------------------------------- networks --

const xml = (value) =>
  String(value ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));

const endpoint = (value) => (value && typeof value === "object" ? value.id ?? value.name : value);

const isPlain = (value) => ["string", "number", "boolean"].includes(typeof value);

/**
 * Normalise a network to { nodes: [{ id, ...attributes }], edges: [{ source,
 * target, ...attributes }] }. Accepts { nodes, links|edges } with ids or
 * names; only simple attribute values are kept.
 */
export const normaliseNetwork = (network) => {
  const rawNodes = network?.nodes || network?.data || [];
  const rawEdges = network?.links || network?.edges || [];
  const attributes = (item, skip) =>
    Object.fromEntries(Object.entries(item || {}).filter(([key, value]) => !skip.includes(key) && isPlain(value)));
  const nodes = rawNodes
    .map((node) => ({ id: String(node?.id ?? node?.name ?? ""), ...attributes(node, ["id", "x", "y", "vx", "vy", "fx", "fy", "index"]) }))
    .filter((node) => node.id);
  const known = new Set(nodes.map((node) => node.id));
  const edges = rawEdges
    .map((edge) => ({
      source: String(endpoint(edge?.source) ?? ""),
      target: String(endpoint(edge?.target) ?? ""),
      ...attributes(edge, ["source", "target", "index"]),
    }))
    .filter((edge) => edge.source && edge.target);
  // Edges may name nodes that were not listed
  edges.forEach((edge) =>
    [edge.source, edge.target].forEach((id) => {
      if (!known.has(id)) {
        known.add(id);
        nodes.push({ id });
      }
    })
  );
  return { nodes, edges };
};

export const networkToGraphML = (network) => {
  const { nodes, edges } = normaliseNetwork(network);
  const keysOf = (items, skip) => {
    const types = new Map();
    items.forEach((item) =>
      Object.entries(item).forEach(([key, value]) => {
        if (skip.includes(key)) return;
        const type = typeof value === "number" ? "double" : typeof value === "boolean" ? "boolean" : "string";
        if (!types.has(key) || types.get(key) !== type) types.set(key, types.has(key) ? "string" : type);
      })
    );
    return [...types.entries()];
  };
  const nodeKeys = keysOf(nodes, ["id"]);
  const edgeKeys = keysOf(edges, ["source", "target"]);
  const data = (item, keys, prefix) =>
    keys
      .filter(([key]) => item[key] !== undefined)
      .map(([key]) => `<data key="${prefix}_${xml(key)}">${xml(item[key])}</data>`)
      .join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    ...nodeKeys.map(([key, type]) => `  <key id="n_${xml(key)}" for="node" attr.name="${xml(key)}" attr.type="${type}"/>`),
    ...edgeKeys.map(([key, type]) => `  <key id="e_${xml(key)}" for="edge" attr.name="${xml(key)}" attr.type="${type}"/>`),
    '  <graph id="GeneSetR" edgedefault="directed">',
    ...nodes.map((node) => `    <node id="${xml(node.id)}">${data(node, nodeKeys, "n")}</node>`),
    ...edges.map((edge, index) => `    <edge id="e${index}" source="${xml(edge.source)}" target="${xml(edge.target)}">${data(edge, edgeKeys, "e")}</edge>`),
    "  </graph>",
    "</graphml>",
  ].join("\n");
};

/** Cytoscape.js JSON (File > Import > Network from File in Cytoscape). */
export const networkToCytoscapeJson = (network) => {
  const { nodes, edges } = normaliseNetwork(network);
  return JSON.stringify(
    {
      format_version: "1.0",
      generated_by: "GeneSetR",
      elements: {
        nodes: nodes.map((node) => ({ data: { ...node, name: node.name ?? node.id } })),
        edges: edges.map((edge, index) => ({ data: { id: `e${index}`, ...edge } })),
      },
    },
    null,
    1
  );
};

/** Download a network as "graphml" or "cyjs". Returns false when it is empty. */
export const downloadNetwork = (network, { format = "graphml", filename = "genesetr-network" } = {}) => {
  const { nodes } = normaliseNetwork(network);
  if (nodes.length === 0) return false;
  if (format === "cyjs") {
    saveAs(new Blob([networkToCytoscapeJson(network)], { type: "application/json" }), `${filename}-${stamp()}.cyjs`);
  } else {
    saveAs(new Blob([networkToGraphML(network)], { type: "application/xml" }), `${filename}-${stamp()}.graphml`);
  }
  return true;
};

/**
 * Extra ECharts toolbox button for charts with a graph series: saves the
 * network that is drawn (after filters) as GraphML.
 */
export const graphmlToolboxFeature = (name = "genesetr-network") => ({
  show: true,
  title: "Save network as GraphML (Cytoscape, Gephi)",
  icon: "path://M5 5a2 2 0 1 0 0.01 0z M19 5a2 2 0 1 0 0.01 0z M12 19a2 2 0 1 0 0.01 0z M6.5 6.5l4.5 10.5 M17.5 6.5l-4.5 10.5 M7 5h10",
  onclick: (ecModel) => {
    const series = (ecModel.getOption().series || []).find((s) => s.type === "graph");
    const ok = series && downloadNetwork({ nodes: series.data || series.nodes, links: series.links || series.edges }, { filename: name });
    if (!ok) notifyError("There is no network to save yet");
  },
});
