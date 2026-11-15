/**
 * "TF regulators": transcription factors that raise or lower a gene (or a gene
 * signature), from two directions of evidence: overexpression of the TF
 * (TF Atlas) and its knock-down or knock-out (the loss-of-function datasets).
 * Pure helpers shared by the TF regulators page and the gene page section.
 */
import { ROUTES } from "../common/routes";
import { parseGeneFormula } from "./geneFormula";

const TF_REGULATORS_ROUTE = ROUTES.TF_REGULATORS;

/** Smallest number of genes (up and down together) the analysis accepts. */
export const MIN_SIGNATURE_GENES = 3;

/** Longest list per direction that is written to the address. */
export const MAX_GENES_IN_ADDRESS = 400;

/** Unique upper-case symbols from text separated by spaces, commas, semicolons or new lines. */
export const parseSymbols = (text) => {
  const list = Array.isArray(text) ? text : String(text || "").split(/[\s,;]+/);
  const seen = new Set();
  const result = [];
  list.forEach((item) => {
    const symbol = String(item || "").trim().toUpperCase();
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      result.push(symbol);
    }
  });
  return result;
};

/**
 * A saved list as up and down genes. A signature formula ("A+B-C") gives both
 * lists; a plain list (hyphens belong to the symbols) gives the up list only.
 */
export const splitSavedList = (text) => {
  const value = String(text || "");
  if (!value.includes("+")) return { up: parseSymbols(value), down: [] };
  const terms = parseGeneFormula(value);
  return {
    up: parseSymbols(terms.filter((term) => term.sign > 0).map((term) => term.gene)),
    down: parseSymbols(terms.filter((term) => term.sign < 0).map((term) => term.gene)),
  };
};

/** True when both lists are short enough to be shared in the address. */
export const fitsInAddress = (up, down) =>
  (up || []).length <= MAX_GENES_IN_ADDRESS && (down || []).length <= MAX_GENES_IN_ADDRESS;

/**
 * In-app address of the TF regulators page: `?up=A,B&down=C&run=1`.
 * Lists longer than MAX_GENES_IN_ADDRESS are cut to that length.
 */
export const tfRegulatorsPath = ({ up = [], down = [], run = false } = {}) => {
  const params = [];
  const upList = parseSymbols(up).slice(0, MAX_GENES_IN_ADDRESS);
  const downList = parseSymbols(down).slice(0, MAX_GENES_IN_ADDRESS);
  if (upList.length > 0) params.push(`up=${upList.map(encodeURIComponent).join(",")}`);
  if (downList.length > 0) params.push(`down=${downList.map(encodeURIComponent).join(",")}`);
  if (run && upList.length + downList.length >= MIN_SIGNATURE_GENES) params.push("run=1");
  return params.length > 0 ? `${TF_REGULATORS_ROUTE}?${params.join("&")}` : TF_REGULATORS_ROUTE;
};

/** The lists and the run flag of an address (`location.search`). */
export const readRegulatorQuery = (search) => {
  const params = new URLSearchParams(search || "");
  return {
    up: parseSymbols(params.get("up")),
    down: parseSymbols(params.get("down")),
    run: params.get("run") === "1",
  };
};

/** "activator" | "repressor" | "conflicting" | "none" for a `call` of the API. */
export const callTone = (call) => {
  const text = String(call || "").toLowerCase();
  if (text.startsWith("activator")) return "activator";
  if (text.startsWith("repressor")) return "repressor";
  if (text.startsWith("conflicting")) return "conflicting";
  return "none";
};

/** The evidence part of a call: "activator (knock-down only)" -> "knock-down only". */
export const callEvidence = (call) => {
  const match = /\(([^)]*)\)/.exec(String(call || ""));
  return match ? match[1] : String(call || "");
};

/** The direction part of a call: "activator (both directions)" -> "activator". */
export const callDirection = (call) => String(call || "").replace(/\s*\(.*$/, "");

/**
 * Per-dataset values of a row, the overexpression dataset(s) first:
 * [{ dataset, name, value, direction: "gain" | "loss" }].
 */
export const byDatasetRows = (row, { names = {}, gainDatasets = [] } = {}) => {
  const gain = new Set(gainDatasets);
  const entries = Object.entries(row?.byDataset || {}).map(([dataset, value]) => ({
    dataset,
    name: names[dataset] || dataset,
    value,
    direction: gain.has(dataset) ? "gain" : "loss",
  }));
  return [...entries.filter((entry) => entry.direction === "gain"), ...entries.filter((entry) => entry.direction === "loss")];
};

/** One line for a tooltip: "TF Atlas 4.61 (overexpression); K562 -2.45; ..." */
export const byDatasetText = (row, options) =>
  byDatasetRows(row, options)
    .map((entry) => `${entry.name} ${entry.value}${entry.direction === "gain" ? " (overexpression)" : ""}`)
    .join("; ");

/**
 * Counts for the result header from the `datasets` object of a gene-set answer:
 * how many datasets measure the lists, and how many genes of each list at most.
 */
export const measuredSummary = (datasets) => {
  const entries = Object.values(datasets || {});
  const of = (direction) => entries.filter((entry) => entry?.direction === direction);
  const most = (list, key) => list.reduce((max, entry) => Math.max(max, Number(entry?.[key]) || 0), 0);
  const gain = of("gain");
  const loss = of("loss");
  return {
    datasets: entries.length,
    gainDatasets: gain.length,
    lossDatasets: loss.length,
    gainUp: most(gain, "up"),
    gainDown: most(gain, "down"),
    lossUp: most(loss, "up"),
    lossDown: most(loss, "down"),
  };
};

/** Columns of the exported tables (CSV / TSV / Excel). */
export const REGULATOR_EXPORT_COLUMNS = [
  { accessorKey: "group", header: "Group" },
  { accessorKey: "rank", header: "Rank" },
  { accessorKey: "tf", header: "TF" },
  { accessorKey: "call", header: "Call" },
  { accessorKey: "gain", header: "Overexpression score" },
  { accessorKey: "loss", header: "Knock-down score" },
  { accessorKey: "lossDatasets", header: "Knock-down datasets" },
  { accessorKey: "combined", header: "Combined" },
  { accessorKey: "byDataset", header: "By dataset" },
];

/** Rows of one result table for export; `group` names the table. */
export const regulatorExportRows = (rows, group, options) =>
  (rows || []).map((row, index) => ({
    group,
    rank: index + 1,
    tf: row.tf,
    call: row.call,
    gain: row.gain ?? "",
    loss: row.loss ?? "",
    lossDatasets: row.lossDatasets ?? "",
    combined: row.combined ?? "",
    byDataset: byDatasetRows(row, options)
      .map((entry) => `${entry.dataset}=${entry.value}`)
      .join("; "),
  }));

/** Diverging blue-white-red background for a value in [-limit, limit] (as on the gene page). */
export const divergingColor = (value, limit) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "transparent";
  const t = Math.max(-1, Math.min(1, value / limit));
  const alpha = Math.abs(t) * 0.85;
  return t >= 0 ? `rgba(200, 55, 60, ${alpha})` : `rgba(45, 105, 190, ${alpha})`;
};
