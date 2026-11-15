/**
 * @jest-environment node
 */
import { Q_KEY, RANDOM_Z_KEY, SIGNIFICANCE_NOTE, multiSignificance, significanceAt, significanceTitle } from "./signatureSignificance";

const SIGNIFICANCE = { z: [4.2, null, -0.31], q: [0.003, null, 0.84], genesUsed: 22 };

describe("significance of a signature score", () => {
  it("gives the two cells of a row of the single-dataset table", () => {
    expect(significanceAt(SIGNIFICANCE, 0)).toEqual({ [RANDOM_Z_KEY]: 4.2, [Q_KEY]: 0.003 });
    expect(significanceAt(SIGNIFICANCE, 2)).toEqual({ "z vs random sets": -0.31, q: 0.84 });
  });

  it("keeps the keys of a perturbation without a value, and adds none to an older result", () => {
    expect(significanceAt(SIGNIFICANCE, 1)).toEqual({ [RANDOM_Z_KEY]: null, [Q_KEY]: null });
    expect(significanceAt(SIGNIFICANCE, 7)).toEqual({ [RANDOM_Z_KEY]: null, [Q_KEY]: null });
    expect(significanceAt(undefined, 0)).toEqual({});
    expect(significanceAt({ K562gwps: { ATF4: 3 } }, 0)).toEqual({});
  });

  it("turns the cached single-dataset results into the shape of the multi-dataset result", () => {
    const cache = {
      K562gwps: { genes: ["ATF4", "DDIT3", "XBP1"], results: [1, 2, 3], significance: SIGNIFICANCE },
      HCT116gwps: { genes: ["ATF4"], results: [0.4] }, // calculated before the API sent significance
      HEK293gwps: { _error: true },
      RPE1: { genes: ["A", "B"], significance: { z: [1] } }, // lengths differ: not used
    };
    expect(multiSignificance(["K562gwps", "HCT116gwps", "HEK293gwps", "RPE1", "missing"], cache)).toEqual({
      K562gwps: { ATF4: 4.2, XBP1: -0.31 },
    });
    expect(multiSignificance(undefined, undefined)).toEqual({});
  });

  it("writes the tooltip of a score in the multi-dataset table", () => {
    expect(significanceTitle(4.2)).toBe("z against random gene sets: 4.20");
    expect(significanceTitle(undefined)).toBe("");
    expect(significanceTitle(null)).toBe("");
  });

  it("explains the z in one sentence, with the number of genes when it is known", () => {
    expect(SIGNIFICANCE_NOTE(22)).toContain("random gene sets of the same size (22 genes)");
    expect(SIGNIFICANCE_NOTE()).toContain("random gene sets of the same size taken from");
    expect(SIGNIFICANCE_NOTE(22).match(/\./g)).toHaveLength(1);
    expect(SIGNIFICANCE_NOTE(22)).not.toMatch(/—/);
  });
});
