/**
 * @jest-environment node
 */
import {
  cellCyclePath,
  consensusRows,
  dominantShift,
  filterRows,
  formatDelta,
  formatFdr,
  groupDatasets,
  readCellCycleQuery,
  tableRows,
  topBySignature,
  toLegacyComparison,
  topHits,
  verdict,
} from "./cellCycle";

const rows = [
  { target: "CDK1", n_cells: 200, delta_g1: -0.2, delta_s: -0.05, delta_g2m: 0.25, fdr_phase: 1e-8, rz_s: -1, rz_g2m: 9 },
  { target: "CCND1", n_cells: 150, delta_g1: 0.18, delta_s: -0.1, delta_g2m: -0.08, fdr_phase: 1e-5, rz_s: -6, rz_g2m: -5 },
  { target: "RRM1", n_cells: 90, delta_g1: -0.1, delta_s: 0.15, delta_g2m: -0.05, fdr_phase: 0.001, rz_s: 7, rz_g2m: 0 },
  { target: "NOPE", n_cells: 300, delta_g1: 0.01, delta_s: 0, delta_g2m: -0.01, fdr_phase: 0.8, rz_s: 0.1, rz_g2m: 0.2 },
  { target: "FEW", n_cells: 10, delta_g1: 0.3, delta_s: -0.15, delta_g2m: -0.15, fdr_phase: 0.01, rz_s: null, rz_g2m: null },
];

describe("cell-cycle helpers", () => {
  test("tableRows turns the columnar answer into objects", () => {
    expect(tableRows({ columns: ["target", "n_cells"], rows: [["A", 3], ["B", 4]] })).toEqual([
      { target: "A", n_cells: 3 },
      { target: "B", n_cells: 4 },
    ]);
    expect(tableRows(null)).toEqual([]);
  });

  test("formatDelta shows percentage points with a sign", () => {
    expect(formatDelta(0.123)).toBe("+12.3 %");
    expect(formatDelta(-0.05)).toBe("−5.0 %");
    expect(formatDelta(0)).toBe("0.0 %");
    expect(formatDelta(null)).toBe("–");
    expect(formatFdr(0)).toBe("< 1e-15");
    expect(formatFdr(3e-6)).toBe("3e-6");
    expect(formatFdr(0.2)).toBe("0.20");
  });

  test("dominantShift and verdict name the phase that gained", () => {
    expect(dominantShift(rows[0])).toBe("g2m");
    expect(dominantShift(rows[1])).toBe("g1");
    expect(verdict(rows[2]).tone).toBe("s");
    expect(verdict(rows[3]).tone).toBe("neutral");
    expect(verdict({ target: "X" })).toBeNull();
  });

  test("topHits keeps significant gains with enough cells, strongest first", () => {
    expect(topHits(rows, "g1").map((r) => r.target)).toEqual(["FEW", "CCND1"]);
    expect(topHits(rows, "g1", { minCells: 20 }).map((r) => r.target)).toEqual(["CCND1"]);
    expect(topHits(rows, "g2m").map((r) => r.target)).toEqual(["CDK1"]);
  });

  test("topBySignature ranks by a signature in either direction", () => {
    expect(topBySignature(rows, "rz_g2m", { n: 2 }).map((r) => r.target)).toEqual(["CDK1", "NOPE"]);
    expect(topBySignature(rows, "rz_s", { n: 1, direction: -1 }).map((r) => r.target)).toEqual(["CCND1"]);
  });

  test("filterRows applies cells, significance and search", () => {
    expect(filterRows(rows, { minCells: 100 }).map((r) => r.target)).toEqual(["CDK1", "CCND1", "NOPE"]);
    expect(filterRows(rows, { significantOnly: true }).length).toBe(4);
    expect(filterRows(rows, { query: "cc" }).map((r) => r.target)).toEqual(["CCND1"]);
  });

  test("consensusRows ranks by significant datasets, then mean size", () => {
    const result = {
      rows: [
        { target: "A", n: 3, n_sig: 1, mean: 0.3 },
        { target: "B", n: 4, n_sig: 3, mean: 0.1 },
        { target: "C", n: 1, n_sig: 1, mean: 0.9 },
        { target: "D", n: 3, n_sig: 1, mean: -0.5 },
      ],
    };
    expect(consensusRows(result, { minDatasets: 2 }).map((r) => r.target)).toEqual(["B", "D", "A"]);
  });

  test("groupDatasets puts phase calls first and drugs last", () => {
    const groups = groupDatasets([
      { dataset_id: "T", has_phase: false, kind: "drug" },
      { dataset_id: "C", has_phase: false, kind: "gene" },
      { dataset_id: "K", has_phase: true, kind: "gene" },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["phase", "profile", "drug"]);
    expect(groupDatasets([{ dataset_id: "K", has_phase: true }]).length).toBe(1);
  });

  test("toLegacyComparison feeds the Expression Analyzer panel from a real answer", () => {
    // eslint-disable-next-line global-require
    const detail = require("../../e2e/fixtures/cellcycle_K562essential_CDK1.json");
    const legacy = toLegacyComparison(detail);
    expect(legacy.target.phase_pct.g1).toBeCloseTo(detail.target.frac_g1);
    expect(legacy.control.phase_pct.g2m).toBeCloseTo(detail.target.exp_g2m);
    expect(legacy.deltas.delta_phase_s).toBeCloseTo(detail.target.delta_s);
    expect(legacy.deltas.delta_mean_g2m).toBeCloseTo(detail.target.mean_g2m - detail.target.exp_mean_g2m);
    expect(legacy.bins.s.x.length).toBe(legacy.bins.s.density_target.length);
    expect(legacy.bins.g2m.density_control.length).toBe(legacy.bins.g2m.x.length);
    expect(() => toLegacyComparison({ dataset: { has_phase: false }, target: { rz_s: 1 } })).toThrow(/no single-cell/);
  });

  test("the address round-trips", () => {
    const path = cellCyclePath({ view: "gene", gene: "CDK1", metric: "delta_s" });
    expect(path).toBe("/cell-cycle?view=gene&gene=CDK1&metric=delta_s");
    expect(readCellCycleQuery(path.split("?")[1])).toEqual({ view: "gene", dataset: null, gene: "CDK1", metric: "delta_s" });
    expect(readCellCycleQuery("view=bogus").view).toBeNull();
    expect(cellCyclePath()).toBe("/cell-cycle");
  });
});
