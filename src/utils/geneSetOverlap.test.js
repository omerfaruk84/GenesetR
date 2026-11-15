/**
 * @jest-environment node
 */
import {
  adjustBH,
  buildMembership,
  describeCombination,
  formatP,
  hypergeomSf,
  listGenes,
  membershipRows,
  pairwiseOverlaps,
} from "./geneSetOverlap";

describe("listGenes", () => {
  test("plain lists, formulas and hyphenated symbols", () => {
    expect(listGenes("atf4\nDDIT3\n\nATF4")).toEqual(["ATF4", "DDIT3"]);
    expect(listGenes("ATF4+DDIT3-XBP1")).toEqual(["ATF4", "DDIT3", "XBP1"]);
    expect(listGenes("HLA-A, MT-ND1")).toEqual(["HLA-A", "MT-ND1"]);
    expect(listGenes(["a", "b"])).toEqual(["A", "B"]);
    expect(listGenes("")).toEqual([]);
  });
});

describe("hypergeometric tail", () => {
  test("matches hand-computed values", () => {
    // N=10, K=5, n=5: P(X=5) = 1/252; P(X>=3) = 126/252
    expect(hypergeomSf(5, 10, 5, 5)).toBeCloseTo(1 / 252, 12);
    expect(hypergeomSf(3, 10, 5, 5)).toBeCloseTo(0.5, 12);
    expect(hypergeomSf(0, 10, 5, 5)).toBe(1);
    expect(hypergeomSf(6, 10, 5, 5)).toBe(0);
  });
  test("stays finite and tiny for strong overlaps", () => {
    const p = hypergeomSf(200, 20000, 200, 200);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(1e-300);
  });
});

test("Benjamini-Hochberg keeps order and monotonicity", () => {
  const q = adjustBH([0.01, 0.04, 0.03, NaN]);
  expect(q[0]).toBeCloseTo(0.03);
  expect(q[1]).toBeCloseTo(0.04);
  expect(q[2]).toBeCloseTo(0.04);
  expect(Number.isNaN(q[3])).toBe(true);
});

describe("overlaps", () => {
  const lists = [
    { name: "A", genes: ["G1", "G2", "G3", "G4"] },
    { name: "B", genes: ["G3", "G4", "G5"] },
    { name: "C", genes: ["G4", "G6"] },
  ];

  test("membership elements", () => {
    const elems = buildMembership(lists);
    expect(elems.find((e) => e.name === "G4").sets).toEqual(["A", "B", "C"]);
    expect(elems).toHaveLength(6);
  });

  test("pairwise statistics", () => {
    const { background, pairs } = pairwiseOverlaps(lists, 100);
    expect(background).toBe(100);
    const ab = pairs.find((p) => p.a === "A" && p.b === "B");
    expect(ab.overlap).toBe(2);
    expect(ab.genes).toEqual(["G3", "G4"]);
    expect(ab.jaccard).toBeCloseTo(2 / 5);
    expect(ab.overlapCoefficient).toBeCloseTo(2 / 3);
    expect(ab.expected).toBeCloseTo(0.12);
    expect(ab.pValue).toBeCloseTo(hypergeomSf(2, 100, 4, 3), 12);
    expect(pairs).toHaveLength(3);
    pairs.forEach((p) => expect(p.qValue).toBeGreaterThanOrEqual(p.pValue));
  });

  test("background is never smaller than the union", () => {
    expect(pairwiseOverlaps(lists, 2).background).toBe(6);
  });

  test("membership table sorted by sharing", () => {
    const rows = membershipRows(lists);
    expect(rows[0]).toEqual({ Gene: "G4", Lists: 3, A: 1, B: 1, C: 1 });
    expect(rows[1].Gene).toBe("G3");
    expect(rows.map((r) => r.Lists)).toEqual([3, 2, 1, 1, 1, 1]);
  });
});

test("labels and p-value text", () => {
  const sets = [{ name: "A" }, { name: "B" }];
  expect(describeCombination({ sets: new Set(sets), type: "intersection" })).toBe("A ∩ B");
  expect(describeCombination({ sets: new Set([sets[0]]), type: "distinctIntersection" }, ["A", "B"])).toBe("Only in A");
  expect(formatP(0)).toBe("< 1e-300");
  expect(formatP(3.2e-12)).toBe("3.2e-12");
  expect(formatP(0.0412)).toBe("0.041");
  expect(formatP(NaN)).toBe("–");
});
