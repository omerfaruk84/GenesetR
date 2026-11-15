/**
 * @jest-environment node
 */
import { collateralSummary, shownSuspects, suspectText } from "./collateral";
import { predictionParams, visiblePredictions } from "./atlas";

const report = {
  suspects: [
    { gene: "NDUFB9", kind: "neighbour", minZ: -40.44, datasets: [{ dataset: "A", z: -40.44 }, { dataset: "B", z: -17 }], score: 10.5, distance: 38 },
    { gene: "ATP6AP1", kind: "similar", minZ: -10.71, datasets: [{ dataset: "A", z: -10.71 }], score: 18.6, distance: null },
    { gene: "G3", kind: "similar", minZ: -6, datasets: [{ dataset: "A", z: -6 }, { dataset: "B", z: -5.5 }], score: null, distance: null },
    { gene: "G4", kind: "similar", minZ: -6, datasets: [{ dataset: "A", z: -6 }, { dataset: "B", z: -5.5 }], score: 7, distance: null },
  ],
};

test("a suspect is described by how far it falls and why it is a suspect", () => {
  expect(suspectText(report.suspects[0])).toBe("NDUFB9 falls to z = -40.4 (2 data sets); its promoter lies 38 bp away");
  expect(suspectText(report.suspects[1])).toBe("ATP6AP1 falls to z = -10.7 (1 data set); its own knock-down looks the same (score 18.6)");
  expect(suspectText(report.suspects[2])).toBe("G3 falls to z = -6.0 (2 data sets); its own knock-down looks the same");
  expect(suspectText({ gene: "N", kind: "neighbour", minZ: -5, datasets: [] })).toContain("within 5 kb");
  expect(suspectText(null)).toBe("");
});

test("the summary names the first suspects and counts the rest", () => {
  expect(shownSuspects(report).map((s) => s.gene)).toEqual(["NDUFB9", "ATP6AP1", "G3"]);
  expect(collateralSummary("TATDN1", report)).toBe("Guides against TATDN1 also lower NDUFB9, ATP6AP1, G3 and 1 more: the profile may belong to that gene.");
  expect(collateralSummary("X", { suspects: [] })).toBe("");
  expect(collateralSummary("X", null)).toBe("");
});

test("predictions that rest on a collateral gene are hidden like neighbour effects", () => {
  const rows = [
    { term: "a", neighbours: [], collateral: [] },
    { term: "b", neighbours: ["N"], collateral: [] },
    { term: "c", neighbours: [], collateral: ["Q"] },
    { term: "d" },
  ];
  const hidden = visiblePredictions(rows);
  expect(hidden.rows.map((r) => r.term)).toEqual(["a", "d"]);
  expect(hidden.hidden).toBe(2);
  expect(hidden.flagged).toBe(2);
  expect(visiblePredictions(rows, { includeNeighbours: true }).rows).toHaveLength(4);
  expect(predictionParams({ neighbours: true }).include_collateral).toBe(true);
  expect(predictionParams({}).include_collateral).toBe(false);
});
