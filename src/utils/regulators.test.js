/**
 * @jest-environment node
 */
import {
  MAX_GENES_IN_ADDRESS,
  byDatasetRows,
  byDatasetText,
  callDirection,
  callEvidence,
  callTone,
  divergingColor,
  fitsInAddress,
  measuredSummary,
  parseSymbols,
  readRegulatorQuery,
  regulatorExportRows,
  splitSavedList,
  tfRegulatorsPath,
} from "./regulators";
import { effectLabel, effectNoun, effectParticiple, datasetKindMeta, isGainDataset } from "./perturbationKind";
import { sendGenesTo, sendTargetsFor } from "./sendTo";

// "Send to" reaches the settings slices
jest.mock("../store/api", () => ({ fetchDatasets: jest.fn() }));
jest.mock("../store/safeIdb", () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }));

const MYC = {
  tf: "MYC",
  combined: 6.97,
  gain: 4.61,
  loss: -5.24,
  lossDatasets: 10,
  call: "activator (both directions)",
  byDataset: { K562gwps: -2.45, TFAtlas: 4.61, JurkatEssential: -9.12 },
};
const NAMES = { TFAtlas: "TF Atlas", K562gwps: "K562 Whole Genome" };

describe("gene lists of the TF regulators page", () => {
  test("symbols are split on spaces, commas, semicolons and new lines", () => {
    expect(parseSymbols("ncl, NPM1;ldha\nPPA1  NCL\tHLA-A")).toEqual(["NCL", "NPM1", "LDHA", "PPA1", "HLA-A"]);
    expect(parseSymbols("")).toEqual([]);
    expect(parseSymbols(null)).toEqual([]);
    expect(parseSymbols(["a", " b ", "A"])).toEqual(["A", "B"]);
  });

  test("a saved signature formula fills both lists, a plain list the up list", () => {
    expect(splitSavedList("ATF4+DDIT3-TUBB-PPIA")).toEqual({ up: ["ATF4", "DDIT3"], down: ["TUBB", "PPIA"] });
    expect(splitSavedList("HLA-A\nMT-ND1\nATF4")).toEqual({ up: ["HLA-A", "MT-ND1", "ATF4"], down: [] });
  });
});

describe("address of the TF regulators page", () => {
  test("lists and the run flag travel in the query", () => {
    const path = tfRegulatorsPath({ up: ["NCL", "NPM1", "LDHA"], down: ["TUBB"], run: true });
    expect(path).toBe("/tf-regulators?up=NCL,NPM1,LDHA&down=TUBB&run=1");
    expect(readRegulatorQuery(path.split("?")[1])).toEqual({ up: ["NCL", "NPM1", "LDHA"], down: ["TUBB"], run: true });
  });

  test("an empty list is left out; fewer than 3 genes never run", () => {
    expect(tfRegulatorsPath()).toBe("/tf-regulators");
    expect(tfRegulatorsPath({ up: ["A", "B"], run: true })).toBe("/tf-regulators?up=A,B");
    expect(tfRegulatorsPath({ down: "a b c", run: true })).toBe("/tf-regulators?down=A,B,C&run=1");
    expect(readRegulatorQuery("")).toEqual({ up: [], down: [], run: false });
  });

  test("symbols with special characters survive the round trip", () => {
    const path = tfRegulatorsPath({ up: ["HLA-A", "A&B", "C D"], run: true });
    expect(readRegulatorQuery(path.split("?")[1]).up).toEqual(["HLA-A", "A&B", "C", "D"]);
  });

  test("long lists are cut in the address and reported as not shareable", () => {
    const many = Array.from({ length: MAX_GENES_IN_ADDRESS + 50 }, (_, i) => `G${i}`);
    expect(fitsInAddress(many, [])).toBe(false);
    expect(fitsInAddress(many.slice(0, MAX_GENES_IN_ADDRESS), [])).toBe(true);
    expect(readRegulatorQuery(tfRegulatorsPath({ up: many }).split("?")[1]).up).toHaveLength(MAX_GENES_IN_ADDRESS);
  });
});

describe("rows of the regulators API", () => {
  test("calls are grouped by tone", () => {
    expect(callTone("activator (both directions)")).toBe("activator");
    expect(callTone("repressor (knock-down only)")).toBe("repressor");
    expect(callTone("conflicting")).toBe("conflicting");
    expect(callTone("no clear effect")).toBe("none");
    expect(callTone(undefined)).toBe("none");
    expect(callEvidence("activator (knock-down only)")).toBe("knock-down only");
    expect(callEvidence("conflicting")).toBe("conflicting");
    expect(callDirection("repressor (both directions)")).toBe("repressor");
    expect(callDirection("no clear effect")).toBe("no clear effect");
  });

  test("per-dataset values list the overexpression dataset first, with names", () => {
    const rows = byDatasetRows(MYC, { names: NAMES, gainDatasets: ["TFAtlas"] });
    expect(rows.map((row) => row.dataset)).toEqual(["TFAtlas", "K562gwps", "JurkatEssential"]);
    expect(rows[0]).toEqual({ dataset: "TFAtlas", name: "TF Atlas", value: 4.61, direction: "gain" });
    expect(rows[2].name).toBe("JurkatEssential");
    expect(byDatasetText(MYC, { names: NAMES, gainDatasets: ["TFAtlas"] })).toBe(
      "TF Atlas 4.61 (overexpression); K562 Whole Genome -2.45; JurkatEssential -9.12"
    );
    expect(byDatasetRows({}, {})).toEqual([]);
  });

  test("the header counts datasets and the genes measured at most", () => {
    const summary = measuredSummary({
      TFAtlas: { up: 9, down: 2, direction: "gain" },
      K562gwps: { up: 10, down: 3, direction: "loss" },
      H1hESC: { up: 8, down: 4, direction: "loss" },
    });
    expect(summary).toEqual({ datasets: 3, gainDatasets: 1, lossDatasets: 2, gainUp: 9, gainDown: 2, lossUp: 10, lossDown: 4 });
    expect(measuredSummary(undefined).datasets).toBe(0);
  });

  test("export rows are flat and keep missing scores empty", () => {
    const rows = regulatorExportRows([MYC, { tf: "BACH1", call: "repressor (knock-down only)", gain: null, loss: 7.1, lossDatasets: 3, combined: -7.1, byDataset: {} }], "Activators", {
      gainDatasets: ["TFAtlas"],
    });
    expect(rows[0]).toMatchObject({ group: "Activators", rank: 1, tf: "MYC", gain: 4.61, loss: -5.24, lossDatasets: 10, combined: 6.97 });
    expect(rows[0].byDataset).toBe("TFAtlas=4.61; K562gwps=-2.45; JurkatEssential=-9.12");
    expect(rows[1]).toMatchObject({ rank: 2, tf: "BACH1", gain: "", byDataset: "" });
    expect(regulatorExportRows(undefined, "x")).toEqual([]);
  });

  test("score colours are red above zero, blue below, none for a missing value", () => {
    expect(divergingColor(6, 6)).toBe("rgba(200, 55, 60, 0.85)");
    expect(divergingColor(-60, 6)).toBe("rgba(45, 105, 190, 0.85)");
    expect(divergingColor(null, 6)).toBe("transparent");
  });
});

describe("gain-of-function datasets", () => {
  const TFATLAS = { id: "TFAtlas", perturbationEffect: "gain", perturbationType: "ORF overexpression" };
  const K562 = { id: "K562gwps", perturbationType: "CRISPRi" };

  test("the registry field decides; rows without it are recognised by type", () => {
    expect(isGainDataset(TFATLAS)).toBe(true);
    expect(isGainDataset(K562)).toBe(false);
    expect(isGainDataset({ id: "TFAtlas", perturbationEffect: "gain" })).toBe(true);
    expect(isGainDataset({ perturbation_type: "CRISPRa" })).toBe(true);
    expect(isGainDataset({ perturbation_type: "CRISPRi" })).toBe(false);
    expect(isGainDataset({ perturbation_type: "CRISPR knockout" })).toBe(false);
    expect(isGainDataset({ perturbationEffect: "loss", perturbationType: "ORF overexpression" })).toBe(false);
    expect(isGainDataset({ perturbationKind: "drug", perturbationEffect: "gain" })).toBe(false);
    expect(isGainDataset(undefined)).toBe(false);
  });

  test("wording follows the effect", () => {
    expect(effectNoun(TFATLAS)).toBe("overexpression");
    expect(effectNoun(K562)).toBe("knock-down");
    expect(effectParticiple(TFATLAS)).toBe("overexpressed");
    expect(effectParticiple(K562)).toBe("knocked down");
    expect(effectLabel(TFATLAS)).toBe("Overexpression");
    expect(effectLabel(undefined)).toBe("Knockdown");
  });

  test("the effect travels with the selected dataset", () => {
    expect(datasetKindMeta(TFATLAS)).toEqual({ perturbationEffect: "gain" });
    expect(datasetKindMeta(K562)).toEqual({});
  });
});

describe('"Send to" the TF regulators page', () => {
  test("offered for gene lists only", () => {
    expect(sendTargetsFor().map((target) => target.id)).toContain("tfRegulators");
    expect(sendTargetsFor({ drugs: true }).map((target) => target.id)).not.toContain("tfRegulators");
  });

  test("the list becomes the up list of the address; guide suffixes are dropped", () => {
    const dispatch = jest.fn();
    const path = sendGenesTo("tfRegulators", ["ATF4_2", "DDIT3", "asns"])(dispatch, () => ({}));
    expect(path).toBe("/tf-regulators?up=ATF4,DDIT3,ASNS&run=1");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
