/**
 * "Function atlas": two maps of genes (knock-down similarity and
 * co-regulation), their modules, predicted functions with a measured error
 * rate, and the pathway activity atlas. Pure helpers shared by the atlas page
 * and the gene page block.
 */
import { ROUTES } from "../common/routes";

const ATLAS_ROUTE = ROUTES.ATLAS;

export const ATLAS_TABS = ["map", "modules", "predictions", "pathways"];
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

/**
 * In-app address of the atlas. Only what differs from the defaults is written.
 *   map:          ?axis=genes&gene=INTS15&module=47&neighbours=1
 *   modules:      ?tab=modules&axis=genes&q=ribosome&module=4
 *   predictions:  ?tab=predictions&term=..&library=corum&evidence=knockdown&conf=0.5&nogo=1&placeholder=1&neighbours=1&page=2
 *   pathways:     ?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis&contexts=3&rows=100
 *                 ?tab=pathways&by=gene&pert=SCAP&library=hallmark
 * `library` is a filter; `lib` and `set` together name one gene set.
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
  };
};

/** Query parameters of `/atlas/predictions` for the state of the address. */
export const predictionParams = (query) => {
  const params = {
    novel: true,
    min_confidence: query.confidence ?? DEFAULT_CONFIDENCE,
    include_neighbours: !!query.neighbours,
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
 * Predictions to show for one gene. Those that rest on a partner in the same
 * chromosome band are left out unless `includeNeighbours`; `hidden` counts them.
 * `novelOnly` drops functions that are already an annotation of the gene.
 */
export const visiblePredictions = (predictions, { includeNeighbours = false, novelOnly = false, limit = Infinity } = {}) => {
  const list = (predictions || []).filter((row) => !(novelOnly && row.known));
  const flagged = list.filter((row) => (row.neighbours || []).length > 0);
  const rows = includeNeighbours ? list : list.filter((row) => (row.neighbours || []).length === 0);
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
  { accessorKey: "neighbours", header: "Partners in the same chromosome band" },
];

const yesNo = (value) => (value ? "yes" : "no");

/** Prediction rows for export: lists joined, flags as yes / no. */
export const predictionExportRows = (rows) =>
  (rows || []).map((row) => ({
    ...row,
    confidence: row.confidence ?? "",
    support: (row.support || []).join(";"),
    neighbours: (row.neighbours || []).join(";"),
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
