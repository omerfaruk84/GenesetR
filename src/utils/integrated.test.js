/**
 * @jest-environment node
 */
import {
  CONSENSUS_EXPORT_COLUMNS,
  SET_EXPORT_COLUMNS,
  complexRecovery,
  consensusExportRows,
  contextsText,
  coverageText,
  datasetContexts,
  detailEntries,
  detailText,
  formatQ,
  integratedPath,
  readIntegratedQuery,
  rowName,
  shortSetName,
} from "./integrated";
import { MAX_GENES_IN_ADDRESS } from "./regulators";
import { sendGenesTo, sendTargetsFor } from "./sendTo";

// "Send to" reaches the settings slices
jest.mock("../store/api", () => ({ fetchDatasets: jest.fn() }));
jest.mock("../store/safeIdb", () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }));

const PHGDH = {
  gene: "PHGDH",
  metaZ: -21.4,
  datasets: 3,
  support: 3,
  contexts: 2,
  contextsMeasured: 2,
  byDataset: { K562gwps: -9.1, K562essential: -12.2, HCT116gwps: -6.4 },
};
const HSPA1A = {
  gene: "HSPA1A",
  combinedZ: 100.64,
  perturbationsMeasured: 6,
  perturbationsAgreeing: 6,
  byPerturbation: { POMP: 6.44, PSMA1: 10.66 },
};
const SUMMARY = { contexts: { K562: ["K562gwps", "K562essential"], HCT116: ["HCT116gwps"] } };

describe("address of the integrated page", () => {
  test("gene mode holds the symbol and the view", () => {
    expect(integratedPath()).toBe("/integrated");
    expect(integratedPath({ mode: "gene", symbol: "atf4" })).toBe("/integrated?mode=gene&symbol=ATF4");
    expect(integratedPath({ mode: "gene", symbol: "SQLE", view: "measured" })).toBe("/integrated?mode=gene&symbol=SQLE&view=measured");
  });

  test("signature mode holds both lists; run needs 3 genes", () => {
    expect(integratedPath({ mode: "signature", up: ["A", "B"], down: ["C"], run: true })).toBe(
      "/integrated?mode=signature&up=A,B&down=C&run=1"
    );
    expect(integratedPath({ mode: "signature", up: ["A", "B"], run: true })).toBe("/integrated?mode=signature&up=A,B");
    expect(integratedPath({ mode: "signature" })).toBe("/integrated?mode=signature");
  });

  test("set mode holds the list; run needs 2 genes", () => {
    expect(integratedPath({ mode: "set", genes: "psma1 psmb3", run: true })).toBe("/integrated?mode=set&genes=PSMA1,PSMB3&run=1");
    expect(integratedPath({ mode: "set", genes: ["PSMA1"], run: true })).toBe("/integrated?mode=set&genes=PSMA1");
  });

  test("controls are written only when they differ from the defaults", () => {
    expect(integratedPath({ mode: "gene", symbol: "ATF4", minContexts: 2, rows: 20 })).toBe("/integrated?mode=gene&symbol=ATF4");
    expect(integratedPath({ mode: "gene", symbol: "ATF4", minContexts: 3, rows: 50 })).toBe(
      "/integrated?mode=gene&symbol=ATF4&contexts=3&rows=50"
    );
    expect(integratedPath({ mode: "gene", symbol: "ATF4", minContexts: 9, rows: 7 })).toBe("/integrated?mode=gene&symbol=ATF4");
  });

  test("an address reads back to the same state", () => {
    const path = integratedPath({ mode: "signature", up: ["HLA-A", "A&B"], down: ["C"], run: true, minContexts: 1, rows: 50 });
    expect(readIntegratedQuery(path.split("?")[1])).toEqual({
      mode: "signature",
      symbol: "",
      view: "perturbation",
      up: ["HLA-A", "A&B"],
      down: ["C"],
      genes: [],
      run: true,
      minContexts: 1,
      rows: 50,
      predict: "",
    });
    expect(readIntegratedQuery("?mode=gene&symbol=sqle&view=measured")).toMatchObject({ mode: "gene", symbol: "SQLE", view: "measured" });
  });

  test("unknown values fall back to the defaults; long lists are cut", () => {
    expect(readIntegratedQuery("?mode=nonsense&contexts=7&rows=3&view=x")).toMatchObject({
      mode: "gene",
      view: "perturbation",
      minContexts: 2,
      rows: 20,
      run: false,
    });
    expect(readIntegratedQuery("?gene=ATF4").symbol).toBe("ATF4");
    const many = Array.from({ length: MAX_GENES_IN_ADDRESS + 20 }, (_, index) => `G${index}`);
    expect(readIntegratedQuery(integratedPath({ mode: "set", genes: many }).split("?")[1]).genes).toHaveLength(MAX_GENES_IN_ADDRESS);
  });
});

describe("rows of the integrated answers", () => {
  test("datasets map to their cell context", () => {
    expect(datasetContexts(SUMMARY)).toEqual({ K562gwps: "K562", K562essential: "K562", HCT116gwps: "HCT116" });
    expect(datasetContexts(null)).toEqual({});
  });

  test("a row is named by its gene, perturbation or label", () => {
    expect(rowName(PHGDH)).toBe("PHGDH");
    expect(rowName({ perturbation: "MBTPS1" })).toBe("MBTPS1");
    expect(rowName({ label: "NARS" })).toBe("NARS");
    expect(rowName(undefined)).toBe("");
  });

  test("contexts read as supporting of measured", () => {
    expect(contextsText(PHGDH)).toBe("2 of 2");
    expect(contextsText({ contexts: 3 })).toBe("3");
    expect(contextsText({})).toBe("–");
  });

  test("an opened row lists every dataset with its name and context", () => {
    const options = { names: { K562gwps: "K562 Whole Genome" }, contextOf: datasetContexts(SUMMARY) };
    expect(detailEntries(PHGDH, options)).toEqual([
      { key: "K562gwps", name: "K562 Whole Genome", context: "K562", value: -9.1 },
      { key: "K562essential", name: "K562essential", context: "K562", value: -12.2 },
      { key: "HCT116gwps", name: "HCT116gwps", context: "HCT116", value: -6.4 },
    ]);
    expect(detailText(PHGDH, options)).toBe("K562 Whole Genome [K562] -9.1; K562essential [K562] -12.2; HCT116gwps [HCT116] -6.4");
  });

  test("a common-effects row lists every perturbation", () => {
    expect(detailEntries(HSPA1A)).toEqual([
      { key: "POMP", name: "POMP", context: "", value: 6.44 },
      { key: "PSMA1", name: "PSMA1", context: "", value: 10.66 },
    ]);
    expect(detailText(HSPA1A)).toBe("POMP 6.44; PSMA1 10.66");
  });

  test("export rows match their columns", () => {
    const [row] = consensusExportRows([PHGDH], "Go down");
    expect(row).toEqual({
      group: "Go down",
      rank: 1,
      name: "PHGDH",
      metaZ: -21.4,
      q: "",
      datasets: 3,
      support: 3,
      contexts: 2,
      contextsMeasured: 2,
      byDataset: "K562gwps=-9.1; K562essential=-12.2; HCT116gwps=-6.4",
    });
    expect(Object.keys(row)).toEqual(CONSENSUS_EXPORT_COLUMNS.map((column) => column.accessorKey));
    const [setRow] = consensusExportRows([HSPA1A], "Go up");
    expect(setRow.byPerturbation).toBe("POMP=6.44; PSMA1=10.66");
    expect(Object.keys(setRow)).toEqual(SET_EXPORT_COLUMNS.map((column) => column.accessorKey));
    expect(consensusExportRows(undefined, "x")).toEqual([]);
  });

  test("coverage counts datasets and contexts", () => {
    expect(coverageText("Perturbed", { datasets: ["a", "b"], contexts: ["K562"] })).toBe("Perturbed in 2 datasets across 1 cell context");
    expect(coverageText("Measured", {})).toBe("Measured in 0 datasets across 0 cell contexts");
  });
});

describe("gene sets and the complex benchmark", () => {
  test("q-values are short", () => {
    expect(formatQ(0.0235)).toBe("0.024");
    expect(formatQ(3.22e-8)).toBe("3.2e-8");
    expect(formatQ(1e-12)).toBe("1e-12");
    expect(formatQ(0)).toBe("< 1e-300");
    expect(formatQ(null)).toBe("–");
  });

  test("database ids are left out of a set name", () => {
    expect(shortSetName("Cell Cycle, Mitotic R-HSA-69278")).toBe("Cell Cycle, Mitotic");
    expect(shortSetName("response to stress (GO:0036003)")).toBe("response to stress");
    expect(shortSetName("CEN complex (human)")).toBe("CEN complex");
    expect(shortSetName("E2F Targets")).toBe("E2F Targets");
  });

  test("complex recovery gives AUROC and the precision against its baseline", () => {
    expect(complexRecovery({ auroc: 0.688, precisionTop: 0.556, baseline: 0.0074, topPairs: 1000 })).toEqual({
      auroc: "0.69",
      precision: "56%",
      baseline: "0.7%",
      text: "AUROC 0.69 · 56% of the top 1,000 pairs (baseline 0.7%)",
      corrected: null,
    });
    expect(complexRecovery({ auroc: null, precisionTop: 0.638, baseline: 0.0056, topPairs: 1000 }).text).toBe(
      "64% of the top 1,000 pairs (baseline 0.6%)"
    );
    expect(complexRecovery(undefined)).toBeNull();
    expect(complexRecovery({ genes: 10 })).toBeNull();
  });
});

describe('"Send to" the integrated page', () => {
  test("offered for gene lists only", () => {
    const forGenes = sendTargetsFor().map((target) => target.id);
    expect(forGenes).toEqual(expect.arrayContaining(["integratedSet", "integratedSignature"]));
    const forDrugs = sendTargetsFor({ drugs: true }).map((target) => target.id);
    expect(forDrugs).not.toContain("integratedSet");
    expect(forDrugs).not.toContain("integratedSignature");
  });

  test("the list fills the matching mode; guide suffixes are dropped", () => {
    const dispatch = jest.fn();
    expect(sendGenesTo("integratedSet", ["PSMA1_2", "psmb3"])(dispatch, () => ({}))).toBe("/integrated?mode=set&genes=PSMA1,PSMB3&run=1");
    expect(sendGenesTo("integratedSignature", ["HMGCR", "LDLR", "SQLE"])(dispatch, () => ({}))).toBe(
      "/integrated?mode=signature&up=HMGCR,LDLR,SQLE&run=1"
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
