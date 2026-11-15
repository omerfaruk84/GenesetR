/**
 * "Integrated analysis": results combined over all loss-of-function datasets
 * (meta z, number of datasets, number of cell contexts that reproduce an
 * effect). Pure helpers shared by the integrated page, the gene page block
 * and "Send to".
 */
import { ROUTES } from "../common/routes";
import { MAX_GENES_IN_ADDRESS, MIN_SIGNATURE_GENES, parseSymbols } from "./regulators";

const INTEGRATED_ROUTE = ROUTES.INTEGRATED;

export const INTEGRATED_MODES = ["gene", "signature", "set"];
export const GENE_VIEWS = ["perturbation", "measured"];

/** Smallest list of perturbed genes the "common effects" mode accepts. */
export const MIN_SET_GENES = 2;

export const MIN_CONTEXT_CHOICES = [1, 2, 3];
export const DEFAULT_MIN_CONTEXTS = 2;
export const ROW_CHOICES = [20, 50];
export const DEFAULT_ROWS = 20;

const listParam = (name, list) => `${name}=${list.map(encodeURIComponent).join(",")}`;

/** A dataset id as it may stand in an address, or "" when the text is not one. */
const datasetId = (value) => {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,60}$/.test(id) ? id : "";
};

/**
 * In-app address of the integrated page.
 *   gene mode:       ?mode=gene&symbol=ATF4[&view=measured][&predict=HepG2Essential]
 *   signature mode:  ?mode=signature&up=A,B&down=C&run=1
 *   set mode:        ?mode=set&genes=A,B&run=1
 * `minContexts` and `rows` are written only when they differ from the defaults.
 * `predict` is the dataset of the "Predicted effect" section (perturbation view only).
 * Lists longer than MAX_GENES_IN_ADDRESS are cut to that length.
 */
export const integratedPath = ({
  mode = "gene",
  symbol = "",
  view = "perturbation",
  up = [],
  down = [],
  genes = [],
  run = false,
  minContexts = DEFAULT_MIN_CONTEXTS,
  rows = DEFAULT_ROWS,
  predict = "",
} = {}) => {
  const params = [];
  const chosen = INTEGRATED_MODES.includes(mode) ? mode : "gene";
  if (chosen === "gene") {
    const gene = String(symbol || "").trim().toUpperCase();
    if (gene) {
      params.push("mode=gene", `symbol=${encodeURIComponent(gene)}`);
      if (view === "measured") params.push("view=measured");
      else if (datasetId(predict)) params.push(`predict=${encodeURIComponent(datasetId(predict))}`);
    }
  } else if (chosen === "signature") {
    params.push("mode=signature");
    const upList = parseSymbols(up).slice(0, MAX_GENES_IN_ADDRESS);
    const downList = parseSymbols(down).slice(0, MAX_GENES_IN_ADDRESS);
    if (upList.length > 0) params.push(listParam("up", upList));
    if (downList.length > 0) params.push(listParam("down", downList));
    if (run && upList.length + downList.length >= MIN_SIGNATURE_GENES) params.push("run=1");
  } else {
    params.push("mode=set");
    const list = parseSymbols(genes).slice(0, MAX_GENES_IN_ADDRESS);
    if (list.length > 0) params.push(listParam("genes", list));
    if (run && list.length >= MIN_SET_GENES) params.push("run=1");
  }
  if (MIN_CONTEXT_CHOICES.includes(minContexts) && minContexts !== DEFAULT_MIN_CONTEXTS) params.push(`contexts=${minContexts}`);
  if (ROW_CHOICES.includes(rows) && rows !== DEFAULT_ROWS) params.push(`rows=${rows}`);
  return params.length > 0 ? `${INTEGRATED_ROUTE}?${params.join("&")}` : INTEGRATED_ROUTE;
};

/** The state held in an address of the integrated page (`location.search`). */
export const readIntegratedQuery = (search) => {
  const params = new URLSearchParams(search || "");
  const mode = INTEGRATED_MODES.includes(params.get("mode")) ? params.get("mode") : "gene";
  const minContexts = Number(params.get("contexts"));
  const rows = Number(params.get("rows"));
  return {
    mode,
    // "gene" is accepted for the symbol as well (links written by hand)
    symbol: String(params.get("symbol") || params.get("gene") || "").trim().toUpperCase(),
    view: params.get("view") === "measured" ? "measured" : "perturbation",
    up: parseSymbols(params.get("up")),
    down: parseSymbols(params.get("down")),
    genes: parseSymbols(params.get("genes")),
    run: params.get("run") === "1",
    minContexts: MIN_CONTEXT_CHOICES.includes(minContexts) ? minContexts : DEFAULT_MIN_CONTEXTS,
    rows: ROW_CHOICES.includes(rows) ? rows : DEFAULT_ROWS,
    predict: datasetId(params.get("predict")),
  };
};

/** { datasetId: context } from the `contexts` object of the summary ({ context: [ids] }). */
export const datasetContexts = (summary) => {
  const map = {};
  Object.entries(summary?.contexts || {}).forEach(([context, ids]) => {
    (ids || []).forEach((id) => {
      map[id] = context;
    });
  });
  return map;
};

/** Name of a row: the measured gene, the perturbed gene, or the label of a context-specific row. */
export const rowName = (row) => row?.gene ?? row?.perturbation ?? row?.label ?? "";

/** "5 of 7": contexts that support an effect, out of those that measure the pair. */
export const contextsText = (row) => {
  if (row?.contexts === null || row?.contexts === undefined) return "–";
  return row.contextsMeasured === null || row.contextsMeasured === undefined
    ? String(row.contexts)
    : `${row.contexts} of ${row.contextsMeasured}`;
};

/**
 * Values behind one row, for the opened row:
 * a consensus row gives one entry per dataset ([{ key, name, context, value }]),
 * a row of the perturbation-set answer one per perturbation.
 */
export const detailEntries = (row, { names = {}, contextOf = {} } = {}) => {
  if (row?.byPerturbation) {
    return Object.entries(row.byPerturbation).map(([perturbation, value]) => ({
      key: perturbation,
      name: perturbation,
      context: "",
      value,
    }));
  }
  return Object.entries(row?.byDataset || {}).map(([dataset, value]) => ({
    key: dataset,
    name: names[dataset] || dataset,
    context: contextOf[dataset] || "",
    value,
  }));
};

/** One line for a tooltip: "K562 Whole Genome [K562] 4.55; ..." */
export const detailText = (row, options) =>
  detailEntries(row, options)
    .map((entry) => `${entry.name}${entry.context ? ` [${entry.context}]` : ""} ${entry.value}`)
    .join("; ");

/** Columns of an exported consensus table (CSV / TSV / Excel). */
export const CONSENSUS_EXPORT_COLUMNS = [
  { accessorKey: "group", header: "Table" },
  { accessorKey: "rank", header: "Rank" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "metaZ", header: "Meta z" },
  { accessorKey: "q", header: "q" },
  { accessorKey: "datasets", header: "Datasets" },
  { accessorKey: "support", header: "Supporting datasets" },
  { accessorKey: "contexts", header: "Supporting contexts" },
  { accessorKey: "contextsMeasured", header: "Contexts measured" },
  { accessorKey: "byDataset", header: "By dataset" },
];

/** Columns of an exported "common effects" table. */
export const SET_EXPORT_COLUMNS = [
  { accessorKey: "group", header: "Table" },
  { accessorKey: "rank", header: "Rank" },
  { accessorKey: "name", header: "Gene" },
  { accessorKey: "combinedZ", header: "Combined z" },
  { accessorKey: "perturbationsMeasured", header: "Perturbations measured" },
  { accessorKey: "perturbationsAgreeing", header: "Perturbations agreeing" },
  { accessorKey: "byPerturbation", header: "By perturbation" },
];

const detailCell = (row) =>
  detailEntries(row)
    .map((entry) => `${entry.key}=${entry.value}`)
    .join("; ");

/** Rows of one result table for export; `group` names the table. */
export const consensusExportRows = (rows, group) =>
  (rows || []).map((row, index) =>
    row.byPerturbation
      ? {
          group,
          rank: index + 1,
          name: rowName(row),
          combinedZ: row.combinedZ ?? "",
          perturbationsMeasured: row.perturbationsMeasured ?? "",
          perturbationsAgreeing: row.perturbationsAgreeing ?? "",
          byPerturbation: detailCell(row),
        }
      : {
          group,
          rank: index + 1,
          name: rowName(row),
          metaZ: row.metaZ ?? "",
          q: row.q ?? "",
          datasets: row.datasets ?? "",
          support: row.support ?? "",
          contexts: row.contexts ?? "",
          contextsMeasured: row.contextsMeasured ?? "",
          byDataset: detailCell(row),
        }
  );

/** "perturbed in 14 datasets across 9 cell contexts" */
export const coverageText = (verb, data) => {
  const datasets = (data?.datasets || []).length;
  const contexts = (data?.contexts || []).length;
  return `${verb} in ${datasets} dataset${datasets === 1 ? "" : "s"} across ${contexts} cell context${contexts === 1 ? "" : "s"}`;
};

/** A p- or q-value for a table: "0.023", "3.2e-8", "< 1e-300". */
export const formatQ = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "–";
  if (value === 0) return "< 1e-300";
  if (value >= 0.001) return value.toFixed(3);
  return value.toExponential(1).replace(/\.0e/, "e");
};

/** A gene-set name without the database id at its end: "Cell Cycle R-HSA-69278" -> "Cell Cycle". */
export const shortSetName = (name) =>
  String(name || "")
    .replace(/\s+R-HSA-\d+$/, "")
    .replace(/\s+\(GO:\d+\)$/, "")
    .replace(/\s+\(human\)$/, "");

/**
 * "Complex recovery" of a dataset from the CORUM benchmark of the API, or null
 * when the dataset has no entry: { auroc: "0.69", precision: "56%", baseline: "0.7%", text, corrected }.
 * `corrected` is the same score after removal of technical variation
 * ({ auroc, precision, text }), or null for a dataset without that correction.
 */
export const complexRecovery = (entry) => {
  if (!entry) return null;
  const percent = (value) =>
    typeof value === "number" && Number.isFinite(value) ? `${(100 * value).toFixed(value < 0.1 ? 1 : 0)}%` : null;
  const score = (value) => (typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : null);
  const auroc = score(entry.auroc);
  const precision = percent(entry.precisionTop);
  const baseline = percent(entry.baseline);
  if (!auroc && !precision) return null;
  const pairs = typeof entry.topPairs === "number" ? entry.topPairs.toLocaleString("en-US") : "top";
  const parts = [];
  if (auroc) parts.push(`AUROC ${auroc}`);
  if (precision) parts.push(`${precision} of the top ${pairs} pairs${baseline ? ` (baseline ${baseline})` : ""}`);
  const after = { auroc: score(entry.corrected?.auroc), precision: percent(entry.corrected?.precisionTop) };
  const afterParts = [];
  if (after.auroc) afterParts.push(`AUROC ${after.auroc}`);
  if (after.precision) afterParts.push(`${after.precision} of the top ${pairs} pairs`);
  return {
    auroc,
    precision,
    baseline,
    text: parts.join(" · "),
    corrected: afterParts.length > 0 ? { ...after, text: afterParts.join(" · ") } : null,
  };
};

// ---------------------------------------------------------------------------
// False discovery rate, one knock-down in one dataset, predicted effects
// ---------------------------------------------------------------------------

const count = (value) => Number(value || 0).toLocaleString("en-US");
const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** "5 %" from a rate such as 0.05. */
export const fdrLabel = (rate) => `${Math.round(1000 * (isNumber(rate) ? rate : 0.05)) / 10} %`;

/**
 * "686 of 15,283 genes at FDR 5 %" for a consensus block of the API
 * ({ fdr05, measured }); "" when the block has no counts.
 */
export const fdrCountText = (block, noun = "genes", rate = 0.05) =>
  isNumber(block?.fdr05) && isNumber(block?.measured)
    ? `${count(block.fdr05)} of ${count(block.measured)} ${noun} at FDR ${fdrLabel(rate)}`
    : "";

/** How many datasets of the summary have the correction for technical variation: { corrected, total } or null. */
export const correctedCount = (summary) => {
  const corrections = summary?.corrections;
  if (!corrections) return null;
  const ids = summary.datasets || Object.keys(corrections);
  return { corrected: ids.filter((id) => corrections[id]).length, total: ids.length };
};

/**
 * The genes of one knock-down in one dataset (`profile` of the API) by
 * direction: `up` holds the rows with a positive z, `down` those with a
 * negative z, whatever list the API sent them in.
 */
export const profileRows = (profile) => {
  const seen = new Set();
  const all = [...(profile?.up || []), ...(profile?.down || [])].filter((row) => {
    if (!row || !isNumber(row.z) || seen.has(row.gene)) return false;
    seen.add(row.gene);
    return true;
  });
  return {
    up: all.filter((row) => row.z > 0).sort((a, b) => b.z - a.z),
    down: all.filter((row) => row.z < 0).sort((a, b) => a.z - b.z),
  };
};

/**
 * Datasets in which a prediction can be asked for: those of the integrated
 * layer that did not perturb the gene, split by the held-out test.
 *   summary      answer of /integrated/summary
 *   measuredIn   dataset ids that perturb the gene
 *   benchmark    answer of /integrated/prediction-benchmark (or null)
 * Returns { offered: [ids], withheld: [{ id, tested }] }; `tested` is false
 * when the dataset shares too few knock-downs with other contexts for a test.
 */
export const predictionChoices = (summary, measuredIn, benchmark) => {
  const perturbed = new Set(measuredIn || []);
  const tests = benchmark?.datasets || {};
  const offered = [];
  const withheld = [];
  (summary?.datasets || []).forEach((id) => {
    if (perturbed.has(id)) return;
    if (tests[id]?.reliable) offered.push(id);
    else withheld.push({ id, tested: !!tests[id] });
  });
  return { offered, withheld };
};

const share = (value) => (isNumber(value) ? `${Math.round(100 * value)} %` : "–");

/**
 * The held-out numbers of one dataset that the page quotes: those of the
 * strong knock-downs when the benchmark has them, else those of all.
 * { strong, n, hits, baselineHits, r, baselineR } or null.
 */
export const heldOutNumbers = (accuracy) => {
  const group = accuracy?.strong || accuracy?.all;
  if (!group) return null;
  return {
    strong: !!accuracy.strong,
    n: group.n,
    hits: group.hits?.combined,
    baselineHits: group.hits?.mean,
    r: group.r?.combined,
    baselineR: group.r?.mean,
  };
};

/**
 * One sentence on how good the predictions of a dataset are:
 * "In a held-out test on 364 strong knock-downs of this dataset, 72 % of the
 * 50 genes predicted to change most did change in that direction; the
 * dataset's mean profile gets 30 %." Empty when the dataset was not tested.
 */
export const accuracySentence = (accuracy, { topGenes = 50 } = {}) => {
  const numbers = heldOutNumbers(accuracy);
  if (!numbers || !isNumber(numbers.hits)) return "";
  return (
    `In a held-out test on ${count(numbers.n)} ${numbers.strong ? "strong " : ""}knock-down${numbers.n === 1 ? "" : "s"} of this dataset, ` +
    `${share(numbers.hits)} of the ${topGenes} genes predicted to change most did change in that direction; ` +
    `the dataset's mean profile gets ${share(numbers.baselineHits)}.`
  );
};

/** Rows of the benchmark table, in the order of the summary: one per tested dataset. */
export const benchmarkRows = (benchmark, { names = {}, order = [] } = {}) => {
  const tests = benchmark?.datasets || {};
  const ids = [...order.filter((id) => tests[id]), ...Object.keys(tests).filter((id) => !order.includes(id))];
  return ids.map((id) => {
    const numbers = heldOutNumbers(tests[id]) || {};
    return {
      dataset: id,
      name: names[id] || id,
      context: tests[id].context || "",
      strong: numbers.strong ? "yes" : "no",
      n: numbers.n ?? "",
      r: numbers.r ?? "",
      baselineR: numbers.baselineR ?? "",
      hits: numbers.hits ?? "",
      baselineHits: numbers.baselineHits ?? "",
      offered: tests[id].reliable ? "yes" : "no",
    };
  });
};

export const BENCHMARK_EXPORT_COLUMNS = [
  { accessorKey: "dataset", header: "Dataset id" },
  { accessorKey: "name", header: "Dataset" },
  { accessorKey: "context", header: "Context" },
  { accessorKey: "n", header: "Held-out knock-downs" },
  { accessorKey: "strong", header: "Strong knock-downs only" },
  { accessorKey: "r", header: "Correlation, prediction" },
  { accessorKey: "baselineR", header: "Correlation, mean profile" },
  { accessorKey: "hits", header: "Top genes confirmed, prediction" },
  { accessorKey: "baselineHits", header: "Top genes confirmed, mean profile" },
  { accessorKey: "offered", header: "Predictions offered" },
];

export const PREDICTION_EXPORT_COLUMNS = [
  { accessorKey: "direction", header: "Direction" },
  { accessorKey: "gene", header: "Gene" },
  { accessorKey: "predictedZ", header: "Predicted z" },
  { accessorKey: "elsewhereZ", header: "Mean z elsewhere" },
  { accessorKey: "datasets", header: "Datasets elsewhere" },
  { accessorKey: "neighboursZ", header: "Mean z of the neighbours here" },
];

/** Rows of a prediction for export (both directions). */
export const predictionExportRows = (prediction) =>
  ["up", "down"].flatMap((direction) =>
    (prediction?.[direction] || []).map((row) => ({
      direction,
      gene: row.gene,
      predictedZ: row.predictedZ ?? "",
      elsewhereZ: row.elsewhereZ ?? "",
      datasets: row.datasets ?? "",
      neighboursZ: row.neighboursZ ?? "",
    }))
  );
