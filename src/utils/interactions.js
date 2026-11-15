/**
 * "Genetic interactions": what a pair of genes does beyond the sum of the two
 * genes alone (combinatorial screens; `/api/v1/interactions`). Pure helpers
 * shared by the page, the gene-page block and "Ask GeneSetR".
 */
import { ROUTES } from "../common/routes";

const INTERACTIONS_ROUTE = ROUTES.INTERACTIONS;

/** The classes of the API, in the order of the legend. */
export const INTERACTION_CLASSES = ["synergistic", "additive", "buffering", "redundant", "epistatic", "neomorphic", "weak"];

/** Names of the classes when the API has not answered yet (the API sends the same). */
export const CLASS_LABELS = {
  synergistic: "More than additive",
  additive: "Additive",
  buffering: "Less than additive",
  redundant: "Redundant",
  epistatic: "One gene dominates",
  neomorphic: "New effect",
  weak: "Little effect",
};

/** One line per class, in plain words, for "How to read this". */
export const CLASS_ABOUT = {
  synergistic: "The pair's response is at least 1.3 times as large as the sum of the two single responses.",
  additive: "The pair does what the two genes add up to. Most pairs are like this.",
  buffering: "The pair's response is at most 0.7 times the sum: the two genes hold each other back.",
  redundant: "At most 0.7 times the sum, and the two genes alone do the same thing: the second gene adds little to the first.",
  epistatic: "The pair looks like one of the two genes alone: its weight is at least three times the other.",
  neomorphic: "The two single responses explain less than half of the pair's response: together the genes do something neither does alone.",
  weak: "Few genes respond to the pair or to either gene, too few to tell.",
};

/**
 * How a class is drawn: index into the palette's series colours (null = the
 * neutral grey) and the mark, so that a class is never told by colour alone.
 * `rotate` turns the mark (degrees); `hollow` draws the outline only.
 */
export const CLASS_MARKS = {
  synergistic: { series: 5, symbol: "triangle" },
  additive: { series: null, symbol: "circle" },
  buffering: { series: 0, symbol: "triangle", rotate: 180 },
  redundant: { series: 2, symbol: "rect" },
  epistatic: { series: 3, symbol: "diamond" },
  neomorphic: { series: 6, symbol: "plus" },
  weak: { series: null, symbol: "circle", hollow: true },
};

/** Colour of a class from a palette (`utils/palette.js`). */
export const classColor = (id, palette) => {
  const mark = CLASS_MARKS[id] || CLASS_MARKS.additive;
  return mark.series === null ? `rgb(${palette.otherRgb})` : palette.series[mark.series % palette.series.length];
};

/** What the pair does to one gene, compared with the sum of the two single genes. */
export const KIND_TEXT = {
  amplified: { label: "Stronger than the sum", about: "Moves the way the two genes predict, but further" },
  dampened: { label: "Weaker than the sum", about: "Moves less than the two genes predict, or stays where it was" },
  reversed: { label: "Opposite direction", about: "Moves against the direction the two genes predict" },
  new: { label: "Only in the pair", about: "Neither gene alone moves it; the pair does" },
};

export const kindLabel = (kind) => KIND_TEXT[kind]?.label || String(kind || "");

/** Pairs that show each class well (K562 activation pairs of Norman et al. 2019). */
export const EXAMPLE_PAIRS = [
  { a: "CBL", b: "CNN1", about: "More than additive" },
  { a: "DUSP9", b: "MAPK1", about: "Less than additive" },
  { a: "DUSP9", b: "ETS2", about: "One gene dominates" },
  { a: "PLK4", b: "STIL", about: "New effect" },
  { a: "CEBPE", b: "CEBPA", about: "Redundant" },
];

const MAX_SEARCH = 80;
const symbolOf = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
const param = (name, value) => `${name}=${encodeURIComponent(value)}`;

/**
 * In-app address of the page: `?dataset=NormanK562a&class=synergistic&q=CBL&a=CBL&b=CNN1`.
 * Only what is set is written; without `dataset` the page shows the first one.
 */
export const interactionsPath = ({ dataset = "", cls = "", q = "", a = "", b = "" } = {}) => {
  const params = [];
  if (String(dataset || "").trim()) params.push(param("dataset", String(dataset).trim()));
  if (INTERACTION_CLASSES.includes(cls)) params.push(`class=${cls}`);
  if (String(q || "").trim()) params.push(param("q", String(q).toUpperCase().slice(0, MAX_SEARCH)));
  if (symbolOf(a) && symbolOf(b)) params.push(param("a", symbolOf(a)), param("b", symbolOf(b)));
  return params.length > 0 ? `${INTERACTIONS_ROUTE}?${params.join("&")}` : INTERACTIONS_ROUTE;
};

/** The state held in an address of the page (`location.search`). */
export const readInteractionsQuery = (search) => {
  const params = new URLSearchParams(search || "");
  const a = symbolOf(params.get("a"));
  const b = symbolOf(params.get("b"));
  return {
    dataset: String(params.get("dataset") || "").trim(),
    cls: INTERACTION_CLASSES.includes(params.get("class")) ? params.get("class") : "",
    // "gene" is accepted for the search text as well (links written by hand)
    q: String(params.get("q") || params.get("gene") || "")
      .toUpperCase()
      .slice(0, MAX_SEARCH),
    a: a && b ? a : "",
    b: a && b ? b : "",
  };
};

/** Gene symbols typed into the search box: "cbl cnn1", "CBL+CNN1", "CBL, CNN1". */
export const searchTerms = (q) =>
  String(q || "")
    .toUpperCase()
    .split(/[\s,;+]+/)
    .filter(Boolean);

/** True when every typed term is part of the name of one of the two genes. */
export const pairMatches = (pair, terms) =>
  terms.every((term) => String(pair.a).toUpperCase().includes(term) || String(pair.b).toUpperCase().includes(term));

/** The pairs of a class (all when empty) whose genes match the search text. */
export const filterPairs = (pairs, { cls = "", q = "" } = {}) => {
  const terms = searchTerms(q);
  return (pairs || []).filter((pair) => (!cls || pair.class === cls) && pairMatches(pair, terms));
};

/** { class: number of pairs } for the pairs whose genes match the search text. */
export const classCounts = (pairs, q = "") => {
  const counts = {};
  INTERACTION_CLASSES.forEach((id) => {
    counts[id] = 0;
  });
  filterPairs(pairs, { q }).forEach((pair) => {
    counts[pair.class] = (counts[pair.class] || 0) + 1;
  });
  return counts;
};

/** True when the row is the pair of the two genes, in either order. */
export const isPair = (pair, a, b) =>
  !!pair && !!a && !!b && ((pair.a === a && pair.b === b) || (pair.a === b && pair.b === a));

/** Columns the table of pairs can be sorted by: value of a row, and whether text. */
export const PAIR_SORTS = {
  label: { value: (pair) => pair.label, text: true },
  class: { value: (pair) => INTERACTION_CLASSES.indexOf(pair.class) },
  coefficientA: { value: (pair) => pair.coefficients?.a },
  coefficientB: { value: (pair) => pair.coefficients?.b },
  fit: { value: (pair) => pair.fit },
  magnitude: { value: (pair) => pair.magnitude },
  similarity: { value: (pair) => pair.similarity },
  interactionGenes: { value: (pair) => pair.interactionGenes },
  cells: { value: (pair) => pair.cells?.pair },
};

/** A sorted copy of the pairs; rows with equal values keep the order of the names. */
export const sortPairs = (pairs, key = "interactionGenes", descending = true) => {
  const sort = PAIR_SORTS[key] || PAIR_SORTS.interactionGenes;
  const sign = descending ? -1 : 1;
  return [...(pairs || [])].sort((left, right) => {
    const x = sort.value(left);
    const y = sort.value(right);
    const order = sort.text ? String(x).localeCompare(String(y)) : (Number(x) || 0) - (Number(y) || 0);
    return order !== 0 ? sign * order : String(left.label).localeCompare(String(right.label));
  });
};

const count = (value) => Number(value || 0).toLocaleString("en-US");
const two = (value) => (typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "–");
const percentOf = (value) => `${Math.round(100 * Math.max(0, Number(value) || 0))}%`;

/** "45% larger than" / "41% smaller than" / "as large as" the sum, from the magnitude. */
export const magnitudeText = (magnitude) => {
  const change = Math.round(100 * (Number(magnitude) - 1));
  if (!Number.isFinite(change) || change === 0) return "as large as the sum";
  return `${Math.abs(change)}% ${change > 0 ? "larger" : "smaller"} than the sum`;
};

/**
 * The result of one pair in words, built from its numbers: an array of
 * sentences. The first says what the pair does (its class), the second how
 * many genes deviate from the sum.
 */
export const pairReading = (pair, { fdr = 0.05 } = {}) => {
  if (!pair) return [];
  const { a, b } = pair;
  const size = `${two(pair.magnitude)} times the sum of the two single responses (${magnitudeText(pair.magnitude)})`;
  const weights = `weights ${two(pair.coefficients?.a)} for ${a} and ${two(pair.coefficients?.b)} for ${b}`;
  let first;
  switch (pair.class) {
    case "synergistic":
      first = `Switching on ${a} and ${b} together does more than the two genes add up to: the response of the pair is ${size}.`;
      break;
    case "buffering":
      first = `Switching on ${a} and ${b} together does less than the two genes add up to: the response of the pair is ${size}.`;
      break;
    case "redundant":
      first = `${a} and ${b} do much the same alone (similarity ${two(pair.similarity)}), and together they add little: the response of the pair is ${size}.`;
      break;
    case "epistatic": {
      const dominant = pair.dominant || (pair.coefficients?.a >= pair.coefficients?.b ? a : b);
      first = `${dominant} dominates: the pair looks like ${dominant} alone (${weights}), and its response is ${size}.`;
      break;
    }
    case "neomorphic":
      first = `Together, ${a} and ${b} do something that neither does alone: the two single responses explain only ${percentOf(pair.fit)} of the response of the pair.`;
      break;
    case "weak":
      first = `Switching on ${a} and ${b} changes few genes (${count(pair.strongGenes?.pair)} in the pair), too few to tell whether the two interact.`;
      break;
    default:
      first = `The effects of ${a} and ${b} add up: the response of the pair is ${size}, and the two single responses explain ${percentOf(pair.fit)} of it.`;
  }
  const rate = `${Math.round(100 * fdr)} %`;
  const genes = Number(pair.interactionGenes || 0);
  const second =
    genes === 0
      ? `No gene deviates from the sum at a false discovery rate of ${rate}.`
      : `${count(genes)} gene${genes === 1 ? "" : "s"} deviate${genes === 1 ? "s" : ""} from the sum at a false discovery rate of ${rate}: ` +
        `${count(pair.more)} respond more strongly than the sum predicts, ${count(pair.less)} less strongly.`;
  return [first, second];
};

/** Columns of the exported table of pairs. */
export const PAIR_EXPORT_COLUMNS = [
  { accessorKey: "label", header: "Pair" },
  { accessorKey: "a", header: "Gene A" },
  { accessorKey: "b", header: "Gene B" },
  { accessorKey: "classLabel", header: "Class" },
  { accessorFn: (row) => row.coefficients?.a, header: "Weight of gene A" },
  { accessorFn: (row) => row.coefficients?.b, header: "Weight of gene B" },
  { accessorKey: "fit", header: "Fit" },
  { accessorKey: "additiveFit", header: "Fit of the plain sum" },
  { accessorKey: "magnitude", header: "Magnitude" },
  { accessorKey: "similarity", header: "Similarity of the two genes" },
  { accessorKey: "interactionGenes", header: "Genes that deviate from the sum" },
  { accessorKey: "more", header: "Respond more than the sum" },
  { accessorKey: "less", header: "Respond less than the sum" },
  { accessorFn: (row) => row.cells?.a, header: "Cells, gene A" },
  { accessorFn: (row) => row.cells?.b, header: "Cells, gene B" },
  { accessorFn: (row) => row.cells?.pair, header: "Cells, pair" },
  { accessorFn: (row) => row.strongGenes?.a, header: "Responding genes, gene A" },
  { accessorFn: (row) => row.strongGenes?.b, header: "Responding genes, gene B" },
  { accessorFn: (row) => row.strongGenes?.pair, header: "Responding genes, pair" },
];

/** Columns of the exported lists of genes of one pair (`a` and `b` are the two genes). */
export const interactionGeneColumns = (a, b) => [
  { accessorKey: "gene", header: "Gene" },
  { accessorFn: (row) => kindLabel(row.kind), header: "Compared with the sum" },
  { accessorKey: "zA", header: `z, ${a} alone` },
  { accessorKey: "zB", header: `z, ${b} alone` },
  { accessorKey: "zPair", header: "z, pair" },
  { accessorKey: "a", header: `Change, ${a} alone` },
  { accessorKey: "b", header: `Change, ${b} alone` },
  { accessorKey: "expected", header: "Sum of the two" },
  { accessorKey: "observed", header: "Change, pair" },
  { accessorKey: "interactionZ", header: "Interaction z" },
  { accessorKey: "q", header: "q" },
];

/**
 * The points of the expected-versus-observed plot of one pair:
 * { rest, above, below } with [expected, observed, gene] per point. Genes that
 * deviate from the sum go to `above` (the pair is higher than the sum) or `below`.
 */
export const expectedObservedPoints = (points) => {
  const groups = { rest: [], above: [], below: [] };
  const genes = points?.gene || [];
  genes.forEach((gene, index) => {
    const expected = points.expected[index];
    const observed = points.observed[index];
    const group = points.significant?.[index] ? (observed >= expected ? "above" : "below") : "rest";
    groups[group].push([expected, observed, gene]);
  });
  return groups;
};

const niceStep = (span, ticks = 6) => {
  const raw = span / ticks;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 5, 10].find((candidate) => candidate * power >= raw) || 10;
  return unit * power;
};

/**
 * The same limits for both axes, so that the diagonal is the line "pair = sum":
 * { low, high, step, outside }. The limits are whole steps, so the axes end on
 * a tick. The genes in `exclude` (the two perturbed genes themselves, which
 * change far more than any other) do not widen the limits; those that then
 * fall outside are returned as `outside`: [{ gene, expected, observed }].
 */
export const sharedExtent = (points, { exclude = [], margin = 0.04 } = {}) => {
  const genes = points?.gene || [];
  const skip = new Set(exclude);
  const values = [];
  genes.forEach((gene, index) => {
    if (skip.has(gene)) return;
    [points.expected[index], points.observed[index]].forEach((value) => {
      if (Number.isFinite(value)) values.push(value);
    });
  });
  if (values.length === 0) return { low: -1, high: 1, step: 0.5, outside: [] };
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const pad = (max - min || 1) * margin;
  const step = niceStep(max - min + 2 * pad || 1);
  const low = Math.floor((min - pad) / step) * step;
  const high = Math.ceil((max + pad) / step) * step;
  const outside = [];
  genes.forEach((gene, index) => {
    const expected = points.expected[index];
    const observed = points.observed[index];
    if (skip.has(gene) && (expected < low || expected > high || observed < low || observed > high)) outside.push({ gene, expected, observed });
  });
  return { low, high, step, outside };
};
