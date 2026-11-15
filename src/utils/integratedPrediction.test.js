/**
 * @jest-environment node
 */
import {
  BENCHMARK_EXPORT_COLUMNS,
  CONSENSUS_EXPORT_COLUMNS,
  PREDICTION_EXPORT_COLUMNS,
  accuracySentence,
  benchmarkRows,
  complexRecovery,
  consensusExportRows,
  correctedCount,
  fdrCountText,
  fdrLabel,
  heldOutNumbers,
  integratedPath,
  predictionChoices,
  predictionExportRows,
  profileRows,
  readIntegratedQuery,
} from "./integrated";

const search = (path) => path.slice(path.indexOf("?"));

const HEPG2 = {
  dataset: "HepG2Essential",
  context: "HepG2",
  all: { n: 200, r: { mean: 0.068, combined: 0.236 }, hits: { mean: 0.192, combined: 0.429 } },
  strong: { n: 364, r: { mean: 0.147, combined: 0.494 }, hits: { mean: 0.303, combined: 0.722 } },
  reliable: true,
};
const THP1 = {
  dataset: "SC00039",
  context: "THP-1",
  all: { n: 200, r: { mean: 0.115, combined: 0.01 }, hits: { mean: 0.068, combined: 0.075 } },
  strong: { n: 67, r: { mean: 0.124, combined: 0.032 }, hits: { mean: 0.091, combined: 0.154 } },
  reliable: false,
};
const SMALL = { dataset: "Tiny", context: "iPSC", all: { n: 1, r: { mean: 0.1, combined: 0.3 }, hits: { mean: 0.2, combined: 0.5 } }, strong: null, reliable: false };
const BENCHMARK = { settings: { topGenes: 50 }, datasets: { HepG2Essential: HEPG2, SC00039: THP1 } };
const SUMMARY = {
  datasets: ["K562gwps", "HepG2Essential", "SC00039", "sc00017"],
  fdr: 0.05,
  corrections: { K562gwps: { inert: 2159, axes: 5, nullSd: 1.05 }, HepG2Essential: { inert: 189, axes: 5, nullSd: 1.1 }, SC00039: null, sc00017: null },
};

describe("the dataset of a prediction is in the address", () => {
  test("written for the perturbation view only, read back as it was", () => {
    const path = integratedPath({ mode: "gene", symbol: "ATF4", predict: "HepG2Essential" });
    expect(path).toBe("/integrated?mode=gene&symbol=ATF4&predict=HepG2Essential");
    expect(readIntegratedQuery(search(path))).toMatchObject({ symbol: "ATF4", view: "perturbation", predict: "HepG2Essential" });
    expect(integratedPath({ mode: "gene", symbol: "ATF4", view: "measured", predict: "HepG2Essential" })).toBe(
      "/integrated?mode=gene&symbol=ATF4&view=measured"
    );
    expect(integratedPath({ mode: "gene", symbol: "ATF4", predict: "SC00039", rows: 50 })).toBe(
      "/integrated?mode=gene&symbol=ATF4&predict=SC00039&rows=50"
    );
  });

  test("no dataset by default; text that is not a dataset id is dropped", () => {
    expect(readIntegratedQuery("?mode=gene&symbol=ATF4").predict).toBe("");
    expect(readIntegratedQuery("?mode=gene&symbol=ATF4&predict=a%20b%3Cscript%3E").predict).toBe("");
    expect(integratedPath({ mode: "gene", symbol: "ATF4", predict: "a b" })).toBe("/integrated?mode=gene&symbol=ATF4");
    expect(integratedPath({ mode: "signature", up: ["A"], predict: "K562gwps" })).toBe("/integrated?mode=signature&up=A");
  });
});

describe("false discovery rate of the consensus", () => {
  test("counts are written with their family", () => {
    expect(fdrCountText({ fdr05: 686, measured: 15283 })).toBe("686 of 15,283 genes at FDR 5 %");
    expect(fdrCountText({ fdr05: 0, measured: 18635 }, "perturbed genes", 0.01)).toBe("0 of 18,635 perturbed genes at FDR 1 %");
    expect(fdrCountText({ tested: 2117 })).toBe("");
    expect(fdrCountText(undefined)).toBe("");
    expect(fdrLabel(0.05)).toBe("5 %");
    expect(fdrLabel(0.025)).toBe("2.5 %");
    expect(fdrLabel(undefined)).toBe("5 %");
  });

  test("the q-value is part of an exported consensus row", () => {
    const [row] = consensusExportRows([{ gene: "PHGDH", metaZ: -21.4, q: 3.2e-8, datasets: 3, support: 3, contexts: 2, contextsMeasured: 2, byDataset: {} }], "Go down");
    expect(row.q).toBe(3.2e-8);
    expect(Object.keys(row)).toEqual(CONSENSUS_EXPORT_COLUMNS.map((column) => column.accessorKey));
    expect(CONSENSUS_EXPORT_COLUMNS.map((column) => column.header)).toContain("q");
  });

  test("the summary says how many datasets are corrected", () => {
    expect(correctedCount(SUMMARY)).toEqual({ corrected: 2, total: 4 });
    expect(correctedCount({ datasets: ["a"] })).toBeNull();
    expect(correctedCount(null)).toBeNull();
  });
});

describe("one knock-down in one dataset", () => {
  test("genes are sorted into up and down by the sign of their z", () => {
    // the API fills a short list with genes of the other direction
    const profile = {
      up: [{ gene: "RIC8A", z: 6.7, q: 2e-7 }, { gene: "STARD3NL", z: 5.05, q: 0.002 }, { gene: "ATF4", z: -8.5, q: 1e-13 }],
      down: [{ gene: "ATF4", z: -8.5, q: 1e-13 }, { gene: "STARD3NL", z: 5.05, q: 0.002 }, { gene: "RIC8A", z: 6.7, q: 2e-7 }],
    };
    const rows = profileRows(profile);
    expect(rows.up.map((row) => row.gene)).toEqual(["RIC8A", "STARD3NL"]);
    expect(rows.down.map((row) => row.gene)).toEqual(["ATF4"]);
  });

  test("the strongest come first; nothing gives two empty lists", () => {
    const rows = profileRows({ up: [{ gene: "B", z: 3 }, { gene: "A", z: 7 }], down: [{ gene: "C", z: -4 }, { gene: "D", z: -9 }] });
    expect(rows.up.map((row) => row.gene)).toEqual(["A", "B"]);
    expect(rows.down.map((row) => row.gene)).toEqual(["D", "C"]);
    expect(profileRows(undefined)).toEqual({ up: [], down: [] });
  });
});

describe("predicted effect", () => {
  test("only datasets that did not perturb the gene are offered, split by the held-out test", () => {
    expect(predictionChoices(SUMMARY, ["K562gwps"], BENCHMARK)).toEqual({
      offered: ["HepG2Essential"],
      withheld: [
        { id: "SC00039", tested: true },
        { id: "sc00017", tested: false },
      ],
    });
    expect(predictionChoices(SUMMARY, SUMMARY.datasets, BENCHMARK)).toEqual({ offered: [], withheld: [] });
    expect(predictionChoices(SUMMARY, [], null).offered).toEqual([]);
    expect(predictionChoices(null, [], BENCHMARK)).toEqual({ offered: [], withheld: [] });
  });

  test("the accuracy sentence quotes the strong knock-downs and the baseline", () => {
    expect(accuracySentence(HEPG2)).toBe(
      "In a held-out test on 364 strong knock-downs of this dataset, 72 % of the 50 genes predicted to change most did change in that direction; the dataset's mean profile gets 30 %."
    );
    expect(accuracySentence(THP1, { topGenes: 50 })).toContain("on 67 strong knock-downs of this dataset, 15 % of the 50 genes");
    expect(accuracySentence(THP1)).toContain("mean profile gets 9 %");
  });

  test("without strong knock-downs the sentence is about all of them; untested gives none", () => {
    expect(heldOutNumbers(SMALL)).toMatchObject({ strong: false, n: 1, hits: 0.5, baselineHits: 0.2 });
    expect(accuracySentence(SMALL)).toBe(
      "In a held-out test on 1 knock-down of this dataset, 50 % of the 50 genes predicted to change most did change in that direction; the dataset's mean profile gets 20 %."
    );
    expect(accuracySentence(null)).toBe("");
    expect(accuracySentence({ reliable: false })).toBe("");
    expect(heldOutNumbers(undefined)).toBeNull();
  });

  test("the benchmark table follows the order of the summary", () => {
    const rows = benchmarkRows(BENCHMARK, { names: { HepG2Essential: "HepG2 Essential" }, order: ["SC00039", "K562gwps", "HepG2Essential"] });
    expect(rows.map((row) => row.dataset)).toEqual(["SC00039", "HepG2Essential"]);
    expect(rows[1]).toEqual({
      dataset: "HepG2Essential",
      name: "HepG2 Essential",
      context: "HepG2",
      strong: "yes",
      n: 364,
      r: 0.494,
      baselineR: 0.147,
      hits: 0.722,
      baselineHits: 0.303,
      offered: "yes",
    });
    expect(rows[0]).toMatchObject({ name: "SC00039", offered: "no" });
    BENCHMARK_EXPORT_COLUMNS.forEach((column) => expect(rows[0]).toHaveProperty(column.accessorKey));
    expect(benchmarkRows(null)).toEqual([]);
  });

  test("a prediction exports both directions", () => {
    const rows = predictionExportRows({
      up: [{ gene: "GAS5", predictedZ: 3.55, elsewhereZ: 3.45, datasets: 8, neighboursZ: 6.41 }],
      down: [{ gene: "PHGDH", predictedZ: -3.09, elsewhereZ: -8.11, datasets: 14, neighboursZ: null }],
    });
    expect(rows).toEqual([
      { direction: "up", gene: "GAS5", predictedZ: 3.55, elsewhereZ: 3.45, datasets: 8, neighboursZ: 6.41 },
      { direction: "down", gene: "PHGDH", predictedZ: -3.09, elsewhereZ: -8.11, datasets: 14, neighboursZ: "" },
    ]);
    expect(Object.keys(rows[0])).toEqual(PREDICTION_EXPORT_COLUMNS.map((column) => column.accessorKey));
    expect(predictionExportRows({ measured: true })).toEqual([]);
  });
});

describe("complex recovery after correction", () => {
  test("the corrected score is given beside the stored one", () => {
    const recovery = complexRecovery({
      auroc: 0.591,
      precisionTop: 0.302,
      baseline: 0.0051,
      topPairs: 1000,
      corrected: { genes: 2232, auroc: 0.626, precisionTop: 0.474, baseline: 0.0051 },
    });
    expect(recovery.text).toBe("AUROC 0.59 · 30% of the top 1,000 pairs (baseline 0.5%)");
    expect(recovery.corrected).toEqual({ auroc: "0.63", precision: "47%", text: "AUROC 0.63 · 47% of the top 1,000 pairs" });
  });

  test("a dataset without the correction has none; small screens name their number of pairs", () => {
    const recovery = complexRecovery({ auroc: 0.754, precisionTop: 0.177, baseline: 0.0178, topPairs: 351 });
    expect(recovery.corrected).toBeNull();
    expect(recovery.text).toBe("AUROC 0.75 · 18% of the top 351 pairs (baseline 1.8%)");
  });
});
