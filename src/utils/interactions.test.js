/**
 * @jest-environment node
 */
import {
  CLASS_ABOUT,
  CLASS_LABELS,
  CLASS_MARKS,
  INTERACTION_CLASSES,
  PAIR_EXPORT_COLUMNS,
  classColor,
  classCounts,
  expectedObservedPoints,
  filterPairs,
  interactionGeneColumns,
  interactionsPath,
  isPair,
  kindLabel,
  magnitudeText,
  pairMatches,
  pairReading,
  readInteractionsQuery,
  searchTerms,
  sharedExtent,
  sortPairs,
} from "./interactions";
import { PALETTES } from "./palette";

// rows of the live API (NormanK562a)
const CBL_CNN1 = {
  a: "CBL",
  b: "CNN1",
  label: "CBL+CNN1",
  cells: { a: 522, b: 624, pair: 279 },
  strongGenes: { a: 1194, b: 1518, pair: 2085 },
  genesUsed: 2830,
  interactionGenes: 113,
  more: 85,
  less: 28,
  coefficients: { a: 0.82, b: 1.44 },
  fit: 0.73,
  additiveFit: 0.69,
  magnitude: 1.45,
  similarity: 0.5,
  dominant: null,
  class: "synergistic",
  classLabel: "More than additive",
};
const DUSP9_MAPK1 = { ...CBL_CNN1, a: "DUSP9", b: "MAPK1", label: "DUSP9+MAPK1", interactionGenes: 275, more: 2, less: 273, coefficients: { a: 0.59, b: 0.31 }, fit: 0.73, magnitude: 0.59, similarity: -0.09, class: "buffering" };
const DUSP9_ETS2 = { ...CBL_CNN1, a: "DUSP9", b: "ETS2", label: "DUSP9+ETS2", interactionGenes: 210, more: 16, less: 194, coefficients: { a: 0.8, b: 0.25 }, fit: 0.93, magnitude: 0.76, similarity: -0.09, dominant: "DUSP9", class: "epistatic" };
const PLK4_STIL = { ...CBL_CNN1, a: "PLK4", b: "STIL", label: "PLK4+STIL", interactionGenes: 43, more: 39, less: 4, coefficients: { a: 0.3, b: 1.38 }, fit: 0.4, magnitude: 1.39, similarity: 0.54, class: "neomorphic" };
const CEBPE_CEBPA = { ...CBL_CNN1, a: "CEBPE", b: "CEBPA", label: "CEBPE+CEBPA", interactionGenes: 352, more: 4, less: 348, coefficients: { a: 0.97, b: 0.39 }, fit: 0.96, magnitude: 0.66, similarity: 0.72, class: "redundant" };
const AHR_FEV = { ...CBL_CNN1, a: "AHR", b: "FEV", label: "AHR+FEV", interactionGenes: 186, more: 121, less: 65, coefficients: { a: 1.26, b: 0.99 }, fit: 0.79, magnitude: 1.2, similarity: 0.24, class: "additive" };
const PAIRS = [CBL_CNN1, DUSP9_MAPK1, DUSP9_ETS2, PLK4_STIL, CEBPE_CEBPA, AHR_FEV];

describe("address of the interactions page", () => {
  it("writes only what is set", () => {
    expect(interactionsPath()).toBe("/interactions");
    expect(interactionsPath({ a: "cbl", b: "cnn1" })).toBe("/interactions?a=CBL&b=CNN1");
    expect(interactionsPath({ dataset: "NormanK562a", cls: "synergistic", q: "cbl", a: "CBL", b: "CNN1" })).toBe(
      "/interactions?dataset=NormanK562a&class=synergistic&q=CBL&a=CBL&b=CNN1"
    );
  });

  it("leaves out an unknown class and half a pair", () => {
    expect(interactionsPath({ cls: "magic", a: "CBL" })).toBe("/interactions");
  });

  it("reads back what it wrote", () => {
    const state = { dataset: "NormanK562a", cls: "buffering", q: "DUSP9", a: "DUSP9", b: "MAPK1" };
    expect(readInteractionsQuery(interactionsPath(state).split("?")[1])).toEqual(state);
    expect(readInteractionsQuery("")).toEqual({ dataset: "", cls: "", q: "", a: "", b: "" });
  });

  it("accepts gene= for the search text and drops half a pair", () => {
    expect(readInteractionsQuery("?gene=cbl&a=CBL")).toEqual({ dataset: "", cls: "", q: "CBL", a: "", b: "" });
    expect(readInteractionsQuery("?class=nonsense").cls).toBe("");
  });
});

describe("filter and order of the pairs", () => {
  it("splits typed gene names", () => {
    expect(searchTerms(" cbl+cnn1, dusp9 ")).toEqual(["CBL", "CNN1", "DUSP9"]);
    expect(searchTerms("")).toEqual([]);
  });

  it("matches every term against one of the two genes", () => {
    expect(pairMatches(CBL_CNN1, ["CBL"])).toBe(true);
    expect(pairMatches(CBL_CNN1, ["CNN", "CBL"])).toBe(true);
    expect(pairMatches(CBL_CNN1, ["CBL", "MAPK1"])).toBe(false);
  });

  it("filters by class and gene", () => {
    expect(filterPairs(PAIRS, { q: "dusp9" }).map((pair) => pair.label)).toEqual(["DUSP9+MAPK1", "DUSP9+ETS2"]);
    expect(filterPairs(PAIRS, { cls: "buffering", q: "dusp9" }).map((pair) => pair.label)).toEqual(["DUSP9+MAPK1"]);
    expect(filterPairs(PAIRS, {})).toHaveLength(PAIRS.length);
    expect(filterPairs(null, { q: "x" })).toEqual([]);
  });

  it("counts the classes among the pairs that match the search", () => {
    const all = classCounts(PAIRS);
    expect(Object.keys(all)).toEqual(INTERACTION_CLASSES);
    expect(all.synergistic).toBe(1);
    expect(all.weak).toBe(0);
    expect(classCounts(PAIRS, "DUSP9")).toMatchObject({ buffering: 1, epistatic: 1, synergistic: 0 });
  });

  it("recognises a pair in either order", () => {
    expect(isPair(CBL_CNN1, "CNN1", "CBL")).toBe(true);
    expect(isPair(CBL_CNN1, "CBL", "CBL")).toBe(false);
    expect(isPair(CBL_CNN1, "", "")).toBe(false);
  });

  it("sorts by a number, a name or the class, without changing the input", () => {
    const before = PAIRS.map((pair) => pair.label);
    expect(sortPairs(PAIRS).map((pair) => pair.label)[0]).toBe("CEBPE+CEBPA");
    expect(sortPairs(PAIRS, "magnitude", false).map((pair) => pair.label)[0]).toBe("DUSP9+MAPK1");
    expect(sortPairs(PAIRS, "label", false).map((pair) => pair.label)[0]).toBe("AHR+FEV");
    expect(sortPairs(PAIRS, "class", false).map((pair) => pair.class)[0]).toBe("synergistic");
    expect(sortPairs(PAIRS, "coefficientB", true)[0].label).toBe("CBL+CNN1");
    expect(sortPairs(PAIRS, "nonsense")[0].label).toBe("CEBPE+CEBPA");
    expect(PAIRS.map((pair) => pair.label)).toEqual(before);
  });
});

describe("a pair in words", () => {
  it("says how much larger or smaller than the sum", () => {
    expect(magnitudeText(1.45)).toBe("45% larger than the sum");
    expect(magnitudeText(0.59)).toBe("41% smaller than the sum");
    expect(magnitudeText(1)).toBe("as large as the sum");
  });

  it("more than additive", () => {
    const [first, second] = pairReading(CBL_CNN1);
    expect(first).toBe(
      "Switching on CBL and CNN1 together does more than the two genes add up to: the response of the pair is 1.45 times the sum of the two single responses (45% larger than the sum)."
    );
    expect(second).toBe(
      "113 genes deviate from the sum at a false discovery rate of 5 %: 85 respond more strongly than the sum predicts, 28 less strongly."
    );
  });

  it("less than additive, redundant, one gene dominates, new effect, additive", () => {
    expect(pairReading(DUSP9_MAPK1)[0]).toContain("does less than the two genes add up to");
    expect(pairReading(DUSP9_MAPK1)[0]).toContain("41% smaller than the sum");
    expect(pairReading(CEBPE_CEBPA)[0]).toContain("CEBPE and CEBPA do much the same alone (similarity 0.72)");
    expect(pairReading(DUSP9_ETS2)[0]).toContain("DUSP9 dominates: the pair looks like DUSP9 alone (weights 0.80 for DUSP9 and 0.25 for ETS2)");
    expect(pairReading(PLK4_STIL)[0]).toContain("something that neither does alone: the two single responses explain only 40%");
    expect(pairReading(AHR_FEV)[0]).toContain("The effects of AHR and FEV add up");
    expect(pairReading(AHR_FEV)[0]).toContain("explain 79% of it");
  });

  it("names the dominant gene from the weights when the API gives none", () => {
    expect(pairReading({ ...DUSP9_ETS2, dominant: null, coefficients: { a: 0.2, b: 0.9 } })[0]).toMatch(/^ETS2 dominates/);
  });

  it("little effect, no deviating gene, one deviating gene, another FDR", () => {
    const weak = { ...CBL_CNN1, class: "weak", interactionGenes: 0, more: 0, less: 0, strongGenes: { a: 20, b: 31, pair: 45 } };
    expect(pairReading(weak)[0]).toContain("changes few genes (45 in the pair)");
    expect(pairReading(weak)[1]).toBe("No gene deviates from the sum at a false discovery rate of 5 %.");
    expect(pairReading({ ...CBL_CNN1, interactionGenes: 1, more: 1, less: 0 }, { fdr: 0.1 })[1]).toMatch(/^1 gene deviates from the sum at a false discovery rate of 10 %/);
    expect(pairReading(null)).toEqual([]);
  });

  it("names the kind of a gene", () => {
    expect(kindLabel("amplified")).toBe("Stronger than the sum");
    expect(kindLabel("new")).toBe("Only in the pair");
    expect(kindLabel("other")).toBe("other");
  });
});

describe("classes", () => {
  it("every class has a name, a description and a mark", () => {
    INTERACTION_CLASSES.forEach((id) => {
      expect(CLASS_LABELS[id]).toBeTruthy();
      expect(CLASS_ABOUT[id]).toBeTruthy();
      expect(CLASS_MARKS[id]).toBeTruthy();
    });
  });

  it("no two classes share colour and mark", () => {
    const seen = new Set(INTERACTION_CLASSES.map((id) => JSON.stringify(CLASS_MARKS[id])));
    expect(seen.size).toBe(INTERACTION_CLASSES.length);
  });

  it("takes the colours from the palette of the theme", () => {
    expect(classColor("synergistic", PALETTES.light)).toBe(PALETTES.light.series[5]);
    expect(classColor("synergistic", PALETTES.dark)).toBe(PALETTES.dark.series[5]);
    expect(classColor("additive", PALETTES.light)).toBe(`rgb(${PALETTES.light.otherRgb})`);
    expect(classColor("unknown", PALETTES.dark)).toBe(`rgb(${PALETTES.dark.otherRgb})`);
  });
});

describe("expected against observed", () => {
  const points = {
    gene: ["G1", "G2", "G3", "DUSP9"],
    expected: [0.5, 2, -1, 14.5],
    observed: [0.6, 4.2, -0.2, 12.3],
    significant: [false, true, true, true],
  };

  it("groups the points by the side of the sum they are on", () => {
    const groups = expectedObservedPoints(points);
    expect(groups.rest).toEqual([[0.5, 0.6, "G1"]]);
    expect(groups.above).toEqual([
      [2, 4.2, "G2"],
      [-1, -0.2, "G3"],
    ]);
    expect(groups.below).toEqual([[14.5, 12.3, "DUSP9"]]);
    expect(expectedObservedPoints(null)).toEqual({ rest: [], above: [], below: [] });
  });

  it("gives both axes the same limits on whole steps", () => {
    const { low, high, step, outside } = sharedExtent(points);
    expect(low).toBeLessThanOrEqual(-1);
    expect(high).toBeGreaterThanOrEqual(14.5);
    expect(low / step).toBeCloseTo(Math.round(low / step));
    expect(high / step).toBeCloseTo(Math.round(high / step));
    expect(outside).toEqual([]);
  });

  it("does not stretch the plot for the perturbed genes, and says which lie outside", () => {
    const { low, high, outside } = sharedExtent(points, { exclude: ["DUSP9", "MAPK1"] });
    expect(high).toBeLessThan(10);
    expect(low).toBeLessThanOrEqual(-1);
    expect(outside).toEqual([{ gene: "DUSP9", expected: 14.5, observed: 12.3 }]);
    expect(sharedExtent(null)).toEqual({ low: -1, high: 1, step: 0.5, outside: [] });
  });
});

describe("exports", () => {
  const value = (column, row) => (column.accessorFn ? column.accessorFn(row) : row[column.accessorKey]);

  it("the table of pairs has the weights, the cells and the class in words", () => {
    const row = Object.fromEntries(PAIR_EXPORT_COLUMNS.map((column) => [column.header, value(column, CBL_CNN1)]));
    expect(row).toMatchObject({ Pair: "CBL+CNN1", Class: "More than additive", "Weight of gene A": 0.82, "Weight of gene B": 1.44, "Cells, pair": 279, Magnitude: 1.45 });
  });

  it("the gene lists name the two genes in the headers", () => {
    const columns = interactionGeneColumns("CBL", "CNN1");
    const gene = { gene: "HBZ", interactionZ: 50.1, q: 0, kind: "amplified", a: 0.4, b: 1.9, expected: 2.3, observed: 9, zA: 9.3, zB: 45.1, zPair: 142.2 };
    const row = Object.fromEntries(columns.map((column) => [column.header, value(column, gene)]));
    expect(row).toMatchObject({ Gene: "HBZ", "Compared with the sum": "Stronger than the sum", "z, CBL alone": 9.3, "z, CNN1 alone": 45.1, "z, pair": 142.2, "Interaction z": 50.1, q: 0 });
  });
});
