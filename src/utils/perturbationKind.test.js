/**
 * @jest-environment node
 */
import {
  doseOf,
  drugIdOf,
  drugLabelsFor,
  drugPagePath,
  firstGeneticDataset,
  isDrugDataset,
  perturbationNounPlural,
} from "./perturbationKind";
import { datasetHasKind, datasetMatches } from "./datasetFilters";
import { sendTargetsFor, toGeneArray } from "./sendTo";
import { countListEntries } from "./workspace";

// The workspace and "Send to" reach the settings slices and IndexedDB
jest.mock("../store/api", () => ({ fetchDatasets: jest.fn() }));
jest.mock("../store/safeIdb", () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }));

const K562 = { id: "K562gwps", isWholeGenome: true };
const DRUGS = { id: "TahoeDrugs", perturbationKind: "drug", drugTable: "drug", parent: 0, collection: "Tahoe-100M" };
const DOSES = { id: "TahoeAll", perturbationKind: "drug", drugTable: "dose", parent: "TahoeDrugs", doses: [0.05, 0.5, 5] };
const LINE = { ...DOSES, id: "TahoeA549", drugTable: "line", cellLine: "A549", organ: "Lung" };

describe("perturbationKind", () => {
  test("genetic is the default kind", () => {
    expect(isDrugDataset(K562)).toBe(false);
    expect(isDrugDataset(DRUGS)).toBe(true);
    expect(isDrugDataset(undefined)).toBe(false);
    expect(perturbationNounPlural(K562)).toBe("perturbations");
    expect(perturbationNounPlural(DRUGS)).toBe("drugs");
  });

  test("the dose is stripped from a label, hyphens of the id are kept", () => {
    expect(drugIdOf("BORTEZOMIB-0.05UM")).toBe("BORTEZOMIB");
    expect(drugIdOf("R-VERAPAMIL-HYDROCHLORIDE-5UM")).toBe("R-VERAPAMIL-HYDROCHLORIDE");
    expect(drugIdOf("5-FLUOROURACIL")).toBe("5-FLUOROURACIL");
    expect(doseOf("BORTEZOMIB-0.5UM")).toBe(0.5);
    expect(doseOf("5-FLUOROURACIL")).toBeNull();
    expect(drugPagePath("5-FLUOROURACIL-0.5UM")).toBe("/drug?id=5-FLUOROURACIL");
  });

  test("a drug adds its id to the main table and its doses to the other tables", () => {
    expect(drugLabelsFor("BORTEZOMIB", DRUGS)).toEqual(["BORTEZOMIB"]);
    expect(drugLabelsFor("BORTEZOMIB", DOSES)).toEqual(["BORTEZOMIB-0.05UM", "BORTEZOMIB-0.5UM", "BORTEZOMIB-5UM"]);
    expect(drugLabelsFor("bortezomib-0.5um", LINE)).toEqual(["BORTEZOMIB-0.05UM", "BORTEZOMIB-0.5UM", "BORTEZOMIB-5UM"]);
  });

  test("a fallback never lands on a drug dataset", () => {
    expect(firstGeneticDataset([DRUGS, DOSES, K562]).id).toBe("K562gwps");
    expect(firstGeneticDataset([DRUGS])).toBeNull();
  });
});

describe("dataset filters", () => {
  test("Genetic and Chemical split the datasets", () => {
    expect(datasetHasKind(K562, "genetic")).toBe(true);
    expect(datasetHasKind(K562, "chemical")).toBe(false);
    expect(datasetHasKind(LINE, "chemical")).toBe(true);
    expect(datasetHasKind(LINE, "focused")).toBe(false);
    expect(datasetHasKind(LINE, "all")).toBe(true);
  });

  test("the search finds a cell-line table by organ and by collection", () => {
    expect(datasetMatches(LINE, { text: "lung" })).toBe(true);
    expect(datasetMatches(LINE, { text: "tahoe a549" })).toBe(true);
    expect(datasetMatches(K562, { text: "lung" })).toBe(false);
  });
});

describe("drug lists in the shared helpers", () => {
  const drugs = ["5-FLUOROURACIL", "R-VERAPAMIL-HYDROCHLORIDE-0.5UM", "BORTEZOMIB-0.05UM"];

  test("drug ids pass through the list helpers unchanged", () => {
    expect(toGeneArray(drugs.join("\n"))).toEqual(drugs);
    expect(toGeneArray("5-fluorouracil, bortezomib-0.05um")).toEqual(["5-FLUOROURACIL", "BORTEZOMIB-0.05UM"]);
  });

  test("a saved drug list counts its entries, a formula its genes", () => {
    expect(countListEntries(drugs.join("\n"))).toBe(3);
    expect(countListEntries("HLA-A\nMT-CO1")).toBe(2);
    expect(countListEntries("ATF4+DDIT3-XBP1")).toBe(3);
  });

  test("gene-only modules are not offered for a drug list", () => {
    const forDrugs = sendTargetsFor({ drugs: true }).map((target) => target.id);
    expect(forDrugs).toEqual(expect.arrayContaining(["correlation", "dr", "heatmap", "deregulated", "drugPage"]));
    ["genePage", "geneRegulation", "pathfinder", "expressionAnalyzer", "multidataset", "genesignature"].forEach((id) =>
      expect(forDrugs).not.toContain(id)
    );
    const forGenes = sendTargetsFor().map((target) => target.id);
    expect(forGenes).toContain("genePage");
    expect(forGenes).not.toContain("drugPage");
  });
});
