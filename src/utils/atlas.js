/**
 * "Function atlas": two maps of genes (knock-down similarity and
 * co-regulation), their modules, predicted functions with a measured error
 * rate, and the pathway activity atlas. Pure helpers shared by the atlas page
 * and the gene page block.
 */
import { ROUTES } from "../common/routes";
import { parseSymbols } from "./regulators";

const ATLAS_ROUTE = ROUTES.ATLAS;

export const ATLAS_TABS = ["map", "modules", "predictions", "pathways", "list"];
export const ATLAS_AXES = ["pert", "genes"];

/** Wording of the two maps. */
export const AXIS_TEXT = {
  pert: {
    label: "Knock-downs",
    map: "Knock-down map",
    object: "knock-down",
    module: "module",
    about: "Genes sit together when their knock-downs have the same consequences in several datasets: complexes and pathways.",
  },
  genes: {
    label: "Co-regulated genes",
    map: "Co-regulation map",
    object: "measured gene",
    module: "programme",
    about: "Genes sit together when they respond to the same perturbations: expression programmes.",
  },
};

export const PREDICTION_LIBRARIES = ["go_bp", "reactome", "corum"];
export const EVIDENCE_KINDS = ["knockdown", "coregulation"];
export const CONFIDENCE_CHOICES = [0.1, 0.3, 0.5, 0.7];
export const DEFAULT_CONFIDENCE = 0.3;
export const PAGE_SIZE = 50;

/** The gene list tab: the similarity endpoint takes 2 to 400 genes, and so does the address. */
export const MIN_LIST_GENES = 2;
export const MAX_LIST_GENES = 400;

/** Wording of the two kinds of evidence on the gene list tab. */
export const EVIDENCE_TEXT = {
  pert: {
    label: "Knock-down similarity",
    about: "Two genes are similar when their knock-downs have the same consequences",
    absent: "Not among the knock-downs of the atlas",
  },
  genes: {
    label: "Co-regulation",
    about: "Two genes are similar when they respond to the same perturbations",
    absent: "Not among the measured genes of the atlas",
  },
};

export const PATHWAY_VIEWS = ["set", "gene"];
export const PATHWAY_CONTEXT_CHOICES = [1, 2, 3];
export const DEFAULT_PATHWAY_CONTEXTS = 2;
export const PATHWAY_ROW_CHOICES = [25, 100];
export const DEFAULT_PATHWAY_ROWS = 25;

const LIBRARY_NAMES = {
  go_bp: "GO BP",
  reactome: "Reactome",
  corum: "CORUM",
  hallmark: "Hallmark",
  programs: "Programmes",
};

/** Short name of a gene-set library id. */
export const libraryName = (id) => LIBRARY_NAMES[id] || String(id || "");

const EVIDENCE_NAMES = { knockdown: "Knock-down", coregulation: "Co-regulation" };

/** Name of a kind of evidence ("knockdown" | "coregulation"). */
export const evidenceName = (id) => EVIDENCE_NAMES[id] || String(id || "");

const symbolOf = (value) => String(value || "").trim().toUpperCase();
const text = (value) => String(value || "").trim();
const positiveInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
};
const param = (name, value) => `${name}=${encodeURIComponent(value)}`;
const listParam = (name, list) => `${name}=${list.map(encodeURIComponent).join(",")}`;
const symbolList = (genes) => parseSymbols(genes).slice(0, MAX_LIST_GENES);

/**
 * In-app address of the atlas. Only what differs from the defaults is written.
 *   map:          ?axis=genes&gene=INTS15&module=47&neighbours=1&understudied=1&genes=INTS1,INTS2
 *   modules:      ?tab=modules&axis=genes&q=ribosome&module=4
 *   predictions:  ?tab=predictions&term=..&library=corum&evidence=knockdown&conf=0.5&nogo=1&placeholder=1&neighbours=1&page=2
 *   pathways:     ?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis&contexts=3&rows=100
 *                 ?tab=pathways&by=gene&pert=SCAP&library=hallmark
 *   gene list:    ?tab=list&axis=genes&genes=INTS1,INTS2,MED12
 * `library` is a filter; `lib` and `set` together name one gene set.
 * `genes` is the list of the gene list tab, and on the map the genes to
 * highlight; it is cut to MAX_LIST_GENES symbols.
 */
export const atlasPath = ({
  tab = "map",
  axis = "pert",
  gene = "",
  module = 0,
  q = "",
  term = "",
  library = "",
  evidence = "",
  confidence = DEFAULT_CONFIDENCE,
  noGo = false,
  placeholder = false,
  neighbours = false,
  allTerms = false,
  page = 1,
  by = "set",
  setLibrary = "",
  set = "",
  pert = "",
  contexts = DEFAULT_PATHWAY_CONTEXTS,
  rows = DEFAULT_PATHWAY_ROWS,
  genes = [],
  understudied = false,
} = {}) => {
  const chosen = ATLAS_TABS.includes(tab) ? tab : "map";
  const params = [];
  if (chosen !== "map") params.push(`tab=${chosen}`);
  if (chosen === "map" || chosen === "modules") {
    if (axis === "genes") params.push("axis=genes");
    if (chosen === "modules" && text(q)) params.push(param("q", text(q)));
    if (chosen === "map" && symbolOf(gene)) params.push(param("gene", symbolOf(gene)));
    if (positiveInt(module)) params.push(`module=${positiveInt(module)}`);
    if (chosen === "map" && neighbours) params.push("neighbours=1");
    if (chosen === "map" && understudied) params.push("understudied=1");
    if (chosen === "map" && symbolList(genes).length > 0) params.push(listParam("genes", symbolList(genes)));
  } else if (chosen === "list") {
    if (axis === "genes") params.push("axis=genes");
    if (symbolList(genes).length > 0) params.push(listParam("genes", symbolList(genes)));
  } else if (chosen === "predictions") {
    if (text(term)) params.push(param("term", text(term)));
    if (PREDICTION_LIBRARIES.includes(library)) params.push(`library=${library}`);
    if (EVIDENCE_KINDS.includes(evidence)) params.push(`evidence=${evidence}`);
    if (CONFIDENCE_CHOICES.includes(confidence) && confidence !== DEFAULT_CONFIDENCE) params.push(`conf=${confidence}`);
    if (noGo) params.push("nogo=1");
    if (placeholder) params.push("placeholder=1");
    if (neighbours) params.push("neighbours=1");
    if (allTerms) params.push("all=1");
    if (positiveInt(page) > 1) params.push(`page=${positiveInt(page)}`);
  } else {
    // both questions stay in the address, so that switching between them loses nothing
    if (by === "gene") params.push("by=gene");
    if (text(setLibrary) && text(set)) params.push(param("lib", text(setLibrary)), param("set", text(set)));
    if (symbolOf(pert)) params.push(param("pert", symbolOf(pert)));
    if (text(library)) params.push(param("library", text(library)));
    if (PATHWAY_CONTEXT_CHOICES.includes(contexts) && contexts !== DEFAULT_PATHWAY_CONTEXTS) params.push(`contexts=${contexts}`);
    if (PATHWAY_ROW_CHOICES.includes(rows) && rows !== DEFAULT_PATHWAY_ROWS) params.push(`rows=${rows}`);
  }
  return params.length > 0 ? `${ATLAS_ROUTE}?${params.join("&")}` : ATLAS_ROUTE;
};

/** The state held in an address of the atlas (`location.search`). */
export const readAtlasQuery = (search) => {
  const params = new URLSearchParams(search || "");
  const tab = ATLAS_TABS.includes(params.get("tab")) ? params.get("tab") : "map";
  const confidence = Number(params.get("conf"));
  const contexts = Number(params.get("contexts"));
  const rows = Number(params.get("rows"));
  const library = text(params.get("library"));
  return {
    tab,
    axis: params.get("axis") === "genes" ? "genes" : "pert",
    gene: symbolOf(params.get("gene") || params.get("symbol")),
    module: positiveInt(params.get("module")),
    q: text(params.get("q")),
    term: text(params.get("term")),
    // the predictions accept three libraries, the pathway atlas whatever the API lists
    library: tab === "predictions" && !PREDICTION_LIBRARIES.includes(library) ? "" : library,
    evidence: EVIDENCE_KINDS.includes(params.get("evidence")) ? params.get("evidence") : "",
    confidence: CONFIDENCE_CHOICES.includes(confidence) ? confidence : DEFAULT_CONFIDENCE,
    noGo: params.get("nogo") === "1",
    placeholder: params.get("placeholder") === "1",
    neighbours: params.get("neighbours") === "1",
    allTerms: params.get("all") === "1",
    page: positiveInt(params.get("page")) || 1,
    by: params.get("by") === "gene" ? "gene" : "set",
    setLibrary: text(params.get("lib")),
    set: text(params.get("set")),
    pert: symbolOf(params.get("pert")),
    contexts: PATHWAY_CONTEXT_CHOICES.includes(contexts) ? contexts : DEFAULT_PATHWAY_CONTEXTS,
    rows: PATHWAY_ROW_CHOICES.includes(rows) ? rows : DEFAULT_PATHWAY_ROWS,
    genes: symbolList(params.get("genes")),
    understudied: params.get("understudied") === "1",
  };
};

/** Query parameters of `/atlas/predictions` for the state of the address. */
export const predictionParams = (query) => {
  const params = {
    novel: true,
    min_confidence: query.confidence ?? DEFAULT_CONFIDENCE,
    include_neighbours: !!query.neighbours,
    // the same switch also lists predictions that rest on a partner the knock-down itself lowers
    include_collateral: !!query.neighbours,
    // one row per gene (its strongest prediction) unless every term is asked for
    per_gene: !query.allTerms,
    limit: PAGE_SIZE,
    offset: (Math.max(1, query.page || 1) - 1) * PAGE_SIZE,
  };
  if (query.term) params.term = query.term;
  if (query.library) params.library = query.library;
  if (query.evidence) params.evidence = query.evidence;
  if (query.noGo) params.max_annotations = 0;
  if (query.placeholder) params.uncharacterised = true;
  return params;
};

/** Number of pages for `total` rows. */
export const pageCount = (total, size = PAGE_SIZE) => Math.max(1, Math.ceil((Number(total) || 0) / size));

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

const isGrey = (hex) => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ""));
  if (!match) return false;
  const channels = match.slice(1).map((part) => parseInt(part, 16));
  return Math.max(...channels) - Math.min(...channels) < 28;
};

/** The series colours that can stand for a module: grey is kept for the points without one. */
export const moduleSeries = (series) => (series || []).filter((color) => !isGrey(color));

/** Colour of a module: the series colours repeat; module 0 (none) gets `none`. */
export const moduleColor = (id, series, none) => (id > 0 && series.length > 0 ? series[(id - 1) % series.length] : none);

/**
 * The points of a map grouped by colour, so that the chart needs one series per
 * colour and no style per point: `groups[0]` holds the points without a module,
 * `groups[k]` those whose module has colour k - 1. A point is [x, y, index].
 */
export const mapColorGroups = (map, colors) => {
  const count = Math.max(1, colors);
  const groups = Array.from({ length: count + 1 }, () => []);
  const symbols = map?.symbols || [];
  for (let i = 0; i < symbols.length; i += 1) {
    const id = map.module[i];
    groups[id > 0 ? ((id - 1) % count) + 1 : 0].push([map.x[i], map.y[i], i]);
  }
  return groups;
};

/** Index of a symbol on a map, or -1. */
export const pointIndex = (map, symbol) => {
  const wanted = symbolOf(symbol);
  if (!wanted || !map?.symbols) return -1;
  return map.symbols.findIndex((name) => String(name).toUpperCase() === wanted);
};

/** Points [x, y, index] of the members of a module. */
export const modulePoints = (map, id) => {
  const points = [];
  if (!map?.module || !(id > 0)) return points;
  for (let i = 0; i < map.module.length; i += 1) {
    if (map.module[i] === id) points.push([map.x[i], map.y[i], i]);
  }
  return points;
};

/** Symbols that start with the typed text, then those that contain it. */
export const symbolSuggestions = (symbols, typed, limit = 8) => {
  const wanted = symbolOf(typed);
  if (!wanted) return [];
  const starts = [];
  const contains = [];
  for (const name of symbols || []) {
    const upper = String(name).toUpperCase();
    if (upper.startsWith(wanted)) starts.push(name);
    else if (contains.length < limit && upper.includes(wanted)) contains.push(name);
  }
  starts.sort((a, b) => a.length - b.length || String(a).localeCompare(String(b)));
  return [...starts, ...contains].slice(0, limit);
};

const extent = (values) => {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values || []) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return Number.isFinite(min) ? [min, max] : [0, 1];
};

/** { x: [min, max], y: [min, max] } of a map, with a margin. */
export const mapExtent = (map, margin = 0.03) => {
  const pad = ([min, max]) => {
    const span = max - min || 1;
    return [min - span * margin, max + span * margin];
  };
  return { x: pad(extent(map?.x)), y: pad(extent(map?.y)) };
};

/**
 * The part of a map to show around some points: their bounding box, widened to
 * at least `share` of the whole map and kept inside it.
 */
export const focusWindow = (map, points, share = 0.3) => {
  const whole = mapExtent(map);
  if (!points || points.length === 0) return whole;
  const side = (axis, values) => {
    const [low, high] = extent(values);
    const [min, max] = whole[axis];
    const span = Math.min(max - min, Math.max((max - min) * share, (high - low) * 1.3));
    const centre = (low + high) / 2;
    const start = Math.max(min, Math.min(max - span, centre - span / 2));
    return [start, start + span];
  };
  return { x: side("x", points.map((point) => point[0])), y: side("y", points.map((point) => point[1])) };
};

/**
 * The understudied genes of a map, as points [x, y, index]:
 *   noGo         points without any GO Biological Process term
 *   placeholder  points whose name is a placeholder (open reading frame, FAM, KIAA)
 *   known        false when the map carries neither field (an older answer)
 * A gene can be in both lists.
 */
export const understudiedPoints = (map) => {
  const point = (i) => [map.x[i], map.y[i], i];
  const annotations = Array.isArray(map?.annotations) ? map.annotations : null;
  const flagged = Array.isArray(map?.placeholder) ? map.placeholder : null;
  const noGo = [];
  (annotations || []).forEach((count, i) => {
    if (count === 0) noGo.push(point(i));
  });
  const size = map?.symbols?.length || 0;
  const placeholder = (flagged || []).filter((i) => Number.isInteger(i) && i >= 0 && i < size).map(point);
  return { noGo, placeholder, known: !!(annotations || flagged) };
};

/** The genes of a list on a map: { points: [[x, y, index]], missing: [symbols not on the map] }. */
export const listPoints = (map, genes) => {
  const wanted = parseSymbols(genes);
  if (wanted.length === 0 || !map?.symbols) return { points: [], missing: wanted };
  const position = new Map();
  map.symbols.forEach((name, i) => {
    const key = String(name).toUpperCase();
    if (!position.has(key)) position.set(key, i);
  });
  const points = [];
  const missing = [];
  wanted.forEach((symbol) => {
    const i = position.get(symbol);
    if (i === undefined) missing.push(symbol);
    else points.push([map.x[i], map.y[i], i]);
  });
  return { points, missing };
};

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

/** Name of a consequence row: a measured gene (knock-down module) or a perturbation (programme). */
export const consequenceName = (row) => row?.gene ?? row?.perturbation ?? "";

/**
 * Members of a module with what is known about them:
 * [{ gene, annotations, uncharacterised, noAnnotation }].
 */
export const memberRows = (module) => {
  const placeholder = new Set((module?.uncharacterised || []).map(symbolOf));
  const annotations = module?.annotations || {};
  return (module?.members || []).map((gene) => {
    const count = annotations[gene];
    return {
      gene,
      annotations: typeof count === "number" ? count : null,
      uncharacterised: placeholder.has(symbolOf(gene)),
      noAnnotation: count === 0,
    };
  });
};

/** A module counts as stable from this value of `stability` (0 to 1). */
export const STABLE_FROM = 0.5;

export const STABILITY_HELP =
  "How well the group is found again when the map is divided with other settings: 1 = always the same genes; below 0.5 its borders depend on the settings";

/** "stable (0.93)" or "depends on the settings (0.32)"; "" when the module carries no stability. */
export const stabilityText = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value >= STABLE_FROM ? "stable" : "depends on the settings"} (${value.toFixed(2)})`
    : "";

/** "specific to CD4 T" for a knock-down module whose genes act in one cell context only; "" otherwise. */
export const specificText = (module) => (module?.specificTo ? `specific to ${module.specificTo}` : "");

/** A context says something about a module when it perturbed at least this share of the members. */
export const CONTEXT_COVERED_FROM = 0.5;

/**
 * The cell contexts of a knock-down module, for the module panel:
 * [{ context, measured, active, covered, specific }], contexts that perturbed
 * at least half of the members first, each group by the share of active members.
 */
export const moduleContexts = (module) =>
  (module?.contexts || [])
    .map((row) => ({
      ...row,
      covered: typeof row.measured === "number" && row.measured >= CONTEXT_COVERED_FROM,
      specific: !!module.specificTo && row.context === module.specificTo,
    }))
    .sort((a, b) => Number(b.covered) - Number(a.covered) || (b.active ?? 0) - (a.active ?? 0) || (b.measured ?? 0) - (a.measured ?? 0));

export const CONTEXT_EXPORT_COLUMNS = [
  { accessorKey: "context", header: "Cell context" },
  { accessorKey: "measured", header: "Share of the members perturbed" },
  { accessorKey: "active", header: "Share of those with a clear effect" },
];

/** "62%": share of the members (or datasets) that agree, from a 0-1 value. */
export const percent = (value, digits = 0) =>
  typeof value === "number" && Number.isFinite(value) ? `${(100 * value).toFixed(digits)}%` : "–";

export const MEMBER_EXPORT_COLUMNS = [
  { accessorKey: "gene", header: "Gene" },
  { accessorKey: "annotations", header: "GO BP terms" },
  { accessorKey: "uncharacterised", header: "Placeholder name" },
];

export const TERM_EXPORT_COLUMNS = [
  { accessorKey: "library", header: "Library" },
  { accessorKey: "set", header: "Gene set" },
  { accessorKey: "overlap", header: "Overlap" },
  { accessorKey: "setSize", header: "Set size" },
  { accessorKey: "q", header: "q" },
  { accessorKey: "genes", header: "Genes" },
];

/** Columns of an exported consequence table; `nameHeader` is "Measured gene" or "Perturbed gene". */
export const consequenceExportColumns = (nameHeader) => [
  { accessorKey: "direction", header: "Direction" },
  { accessorKey: "name", header: nameHeader },
  { accessorKey: "meanZ", header: "Mean z" },
  { accessorKey: "agree", header: "Share agreeing" },
  { accessorKey: "member", header: "Member of the module" },
];

/** Rows of both consequence tables for export. */
export const consequenceExportRows = (consequence) =>
  ["up", "down"].flatMap((direction) =>
    (consequence?.[direction] || []).map((row) => ({
      direction,
      name: consequenceName(row),
      meanZ: row.meanZ ?? "",
      agree: row.agree ?? "",
      member: row.member ? "yes" : "no",
    }))
  );

// ---------------------------------------------------------------------------
// Predicted functions
// ---------------------------------------------------------------------------

/**
 * Predictions to show for one gene. Those that rest on a partner whose promoter
 * lies within 5 kb of the gene's are left out unless `includeNeighbours`; `hidden` counts them.
 * `novelOnly` drops functions that are already an annotation of the gene.
 */
export const visiblePredictions = (predictions, { includeNeighbours = false, novelOnly = false, limit = Infinity } = {}) => {
  const list = (predictions || []).filter((row) => !(novelOnly && row.known));
  // a prediction is doubtful when it rests on a promoter neighbour or on a partner whose own mRNA
  // falls under the knock-down (a collateral knock-down)
  const doubtful = (row) => (row.neighbours || []).length > 0 || (row.collateral || []).length > 0;
  const flagged = list.filter(doubtful);
  const rows = includeNeighbours ? list : list.filter((row) => !doubtful(row));
  return { rows: rows.slice(0, limit), hidden: includeNeighbours ? 0 : flagged.length, flagged: flagged.length };
};

export const PREDICTION_EXPORT_COLUMNS = [
  { accessorKey: "gene", header: "Gene" },
  { accessorKey: "name", header: "Full name" },
  { accessorKey: "term", header: "Predicted function" },
  { accessorKey: "library", header: "Library" },
  { accessorKey: "evidence", header: "Evidence" },
  { accessorKey: "confidence", header: "Confidence" },
  { accessorKey: "p", header: "p" },
  { accessorKey: "overlap", header: "Partners with the function" },
  { accessorKey: "partners", header: "Partners" },
  { accessorKey: "termSize", header: "Set size" },
  { accessorKey: "support", header: "Supporting partners" },
  { accessorKey: "annotations", header: "GO BP terms of the gene" },
  { accessorKey: "uncharacterised", header: "Placeholder name" },
  { accessorKey: "known", header: "Already annotated" },
  { accessorKey: "neighbours", header: "Partners with a promoter within 5 kb" },
  { accessorKey: "collateral", header: "Supporting partners lowered by the knock-down" },
];

const yesNo = (value) => (value ? "yes" : "no");

/** Prediction rows for export: lists joined, flags as yes / no. */
export const predictionExportRows = (rows) =>
  (rows || []).map((row) => ({
    ...row,
    confidence: row.confidence ?? "",
    support: (row.support || []).join(";"),
    neighbours: (row.neighbours || []).join(";"),
    collateral: (row.collateral || []).join(";"),
    uncharacterised: yesNo(row.uncharacterised),
    known: yesNo(row.known),
  }));

/** "8 – 12" or "≥ 12": a bin of the strength (-log10 p) of a prediction. */
export const strengthLabel = (min, next) => (next === undefined || next === null ? `≥ ${min}` : `${min} – ${next}`);

/**
 * The calibration of the summary as a table: one column per kind of evidence
 * and library, one row per strength bin, each cell the share of predictions of
 * that strength that are an existing annotation (null when the bin is empty).
 *   { columns: [{ key, evidence, library, tested, known }], rows: [{ minLogP, label, cells: { key: { precision, predictions } } }] }
 */
export const calibrationTable = (calibration) => {
  const columns = [];
  EVIDENCE_KINDS.forEach((evidence) => {
    PREDICTION_LIBRARIES.forEach((library) => {
      const entry = calibration?.[`${evidence}:${library}`];
      if (entry) columns.push({ key: `${evidence}:${library}`, evidence, library, tested: entry.tested, known: entry.known });
    });
  });
  const edges = [...new Set(columns.flatMap((column) => (calibration[column.key].bins || []).map((bin) => bin.minLogP)))].sort(
    (a, b) => a - b
  );
  const rows = edges.map((minLogP, index) => {
    const cells = {};
    columns.forEach((column) => {
      const bin = (calibration[column.key].bins || []).find((entry) => entry.minLogP === minLogP);
      cells[column.key] = bin ? { precision: bin.precision, predictions: bin.predictions } : null;
    });
    return { minLogP, label: strengthLabel(minLogP, edges[index + 1]), cells };
  });
  return { columns, rows };
};

// ---------------------------------------------------------------------------
// Pathway atlas
// ---------------------------------------------------------------------------

export const PATHWAY_EXPORT_COLUMNS = [
  { accessorKey: "direction", header: "Direction" },
  { accessorKey: "perturbation", header: "Perturbed gene" },
  { accessorKey: "metaZ", header: "Meta z" },
  { accessorKey: "datasets", header: "Datasets" },
  { accessorKey: "contexts", header: "Contexts" },
  { accessorKey: "member", header: "Member of the gene set" },
];

export const PERTURBATION_SET_EXPORT_COLUMNS = [
  { accessorKey: "direction", header: "Direction" },
  { accessorKey: "set", header: "Gene set" },
  { accessorKey: "library", header: "Library" },
  { accessorKey: "size", header: "Set size" },
  { accessorKey: "metaZ", header: "Meta z" },
  { accessorKey: "datasets", header: "Datasets" },
  { accessorKey: "contexts", header: "Contexts" },
];

/** Rows of the "lowered by" and "raised by" tables for export, `down` first. */
export const pathwayExportRows = (data) =>
  ["down", "up"].flatMap((direction) =>
    (data?.[direction] || []).map((row) => ({
      ...row,
      direction: direction === "down" ? "lowers" : "raises",
      ...(row.member === undefined ? {} : { member: yesNo(row.member) }),
    }))
  );

/** "hallmark|Cholesterol Homeostasis": key of a gene set in lists. */
export const setKey = (entry) => `${entry?.library || ""}|${entry?.name ?? entry?.set ?? ""}`;

// ---------------------------------------------------------------------------
// Gene list: consensus similarity as a clustered heatmap
// ---------------------------------------------------------------------------

/**
 * Order of the rows of a square similarity matrix after average-linkage
 * clustering (distance 1 - similarity): similar rows become neighbours, so the
 * groups show as blocks along the diagonal. Values that are not numbers count
 * as 0. Returns the row indices in display order.
 */
export const clusterOrder = (matrix) => {
  const n = Array.isArray(matrix) ? matrix.length : 0;
  if (n < 3) return Array.from({ length: n }, (_, i) => i);
  const value = (i, j) => {
    const number = Number(matrix[i]?.[j]);
    return Number.isFinite(number) ? number : 0;
  };
  const distance = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const d = 1 - (value(i, j) + value(j, i)) / 2;
      distance[i * n + j] = d;
      distance[j * n + i] = d;
    }
  }
  const size = new Array(n).fill(1);
  const leaves = Array.from({ length: n }, (_, i) => [i]);
  const active = Array.from({ length: n }, (_, i) => i);
  while (active.length > 1) {
    let best = Infinity;
    let a = 0;
    let b = 1;
    for (let p = 0; p < active.length; p += 1) {
      const row = active[p] * n;
      for (let q = p + 1; q < active.length; q += 1) {
        const d = distance[row + active[q]];
        if (d < best) {
          best = d;
          a = p;
          b = q;
        }
      }
    }
    const i = active[a];
    const j = active[b];
    const total = size[i] + size[j];
    for (const k of active) {
      if (k !== i && k !== j) {
        const d = (distance[i * n + k] * size[i] + distance[j * n + k] * size[j]) / total;
        distance[i * n + k] = d;
        distance[k * n + i] = d;
      }
    }
    leaves[i] = leaves[i].concat(leaves[j]);
    size[i] = total;
    active.splice(b, 1);
  }
  return leaves[active[0]];
};

/** Largest |r| between two different genes, rounded up to 0.05 and at least 0.1: the end of the colour scale. */
export const similarityLimit = (r) => {
  let max = 0;
  (r || []).forEach((row, i) => {
    (row || []).forEach((value, j) => {
      if (i !== j && Number.isFinite(value) && Math.abs(value) > max) max = Math.abs(value);
    });
  });
  return Math.max(0.1, Math.ceil(max * 20 - 1e-9) / 20);
};

/**
 * The answer of `/atlas/similarity` in display order:
 *   symbols  the genes, clustered
 *   order    their indices in the answer
 *   cells    [column, row, r, score, datasets] for every pair that at least one dataset has
 *            (the diagonal and the pairs without a common dataset are left out)
 *   limit    end of the colour scale
 */
export const similarityHeatmap = (data) => {
  const names = data?.symbols || [];
  const order = clusterOrder(data?.r || []).filter((i) => i < names.length);
  const cells = [];
  order.forEach((i, row) => {
    order.forEach((j, column) => {
      const datasets = data.datasets?.[i]?.[j] ?? 0;
      if (i !== j && datasets > 0) cells.push([column, row, data.r[i][j], data.score?.[i]?.[j] ?? null, datasets]);
    });
  });
  return { symbols: order.map((i) => names[i]), order, cells, limit: similarityLimit(data?.r) };
};

/**
 * The similarity matrix as a table for export, in display order: one row and
 * one column per gene, the mean correlation in the cells. The diagonal and the
 * pairs without a common dataset stay empty.
 */
export const similarityExport = (data, order) => {
  const names = data?.symbols || [];
  const shown = (order || names.map((_, i) => i)).filter((i) => i < names.length);
  const columns = [
    { id: "gene", header: "Gene", accessorFn: (row) => row.gene },
    ...shown.map((i, position) => ({ id: `gene-${position}`, header: names[i], accessorFn: (row) => row.values[position] })),
  ];
  const rows = shown.map((i) => ({
    gene: names[i],
    values: shown.map((j) => (i !== j && (data.datasets?.[i]?.[j] ?? 0) > 0 ? data.r[i][j] : "")),
  }));
  return { columns, rows };
};
