/**
 * @jest-environment node
 */
import {
  DEFAULT_CONFIDENCE,
  PAGE_SIZE,
  PREDICTION_EXPORT_COLUMNS,
  atlasPath,
  calibrationTable,
  consequenceExportRows,
  consequenceName,
  evidenceName,
  focusWindow,
  libraryName,
  mapColorGroups,
  mapExtent,
  memberRows,
  moduleColor,
  modulePoints,
  moduleSeries,
  pageCount,
  pathwayExportRows,
  percent,
  pointIndex,
  predictionExportRows,
  predictionParams,
  readAtlasQuery,
  setKey,
  strengthLabel,
  symbolSuggestions,
  visiblePredictions,
} from "./atlas";

const search = (path) => path.slice(path.indexOf("?"));

const MAP = {
  symbols: ["INTS10", "INTS13", "INTS15", "PSMA1", "PSMB3", "C11orf68", "LONELY"],
  x: [1, 1.2, 1.1, 8, 8.4, 4, 10],
  y: [2, 2.2, 2.4, 9, 9.3, 5, 0],
  module: [3, 3, 3, 1, 1, 12, 0],
  modules: [
    { id: 1, name: "M1: proteasome", size: 2, named: true },
    { id: 3, name: "M3: INTS10 / INTS13 / INTS15", size: 3, named: false },
    { id: 12, name: "M12: other", size: 1, named: false },
  ],
};

describe("address of the atlas", () => {
  it("is the bare route for the default state", () => {
    expect(atlasPath()).toBe("/atlas");
    expect(atlasPath({ tab: "map", axis: "pert" })).toBe("/atlas");
    expect(atlasPath({ tab: "nonsense" })).toBe("/atlas");
  });

  it("writes the map, the gene and the module of the map tab", () => {
    expect(atlasPath({ tab: "map", axis: "genes", gene: " hmgcs1 ", module: 26 })).toBe("/atlas?axis=genes&gene=HMGCS1&module=26");
    expect(atlasPath({ gene: "INTS15", neighbours: true })).toBe("/atlas?gene=INTS15&neighbours=1");
    // a module of 0 means none
    expect(atlasPath({ gene: "INTS15", module: 0 })).toBe("/atlas?gene=INTS15");
  });

  it("writes the search text and the module of the modules tab, not the gene", () => {
    expect(atlasPath({ tab: "modules", axis: "genes", q: "cell cycle", module: 8, gene: "TP53" })).toBe(
      "/atlas?tab=modules&axis=genes&q=cell%20cycle&module=8"
    );
  });

  it("writes only the prediction filters that differ from the defaults", () => {
    expect(atlasPath({ tab: "predictions" })).toBe("/atlas?tab=predictions");
    expect(atlasPath({ tab: "predictions", confidence: DEFAULT_CONFIDENCE, page: 1 })).toBe("/atlas?tab=predictions");
    expect(
      atlasPath({
        tab: "predictions",
        term: "snRNA",
        library: "corum",
        evidence: "knockdown",
        confidence: 0.5,
        noGo: true,
        placeholder: true,
        neighbours: true,
        page: 3,
      })
    ).toBe("/atlas?tab=predictions&term=snRNA&library=corum&evidence=knockdown&conf=0.5&nogo=1&placeholder=1&neighbours=1&page=3");
    // values the page does not offer are dropped
    expect(atlasPath({ tab: "predictions", library: "hallmark", evidence: "magic", confidence: 0.42 })).toBe("/atlas?tab=predictions");
  });

  it("keeps the gene set and the perturbed gene of the pathways tab side by side", () => {
    expect(atlasPath({ tab: "pathways", setLibrary: "hallmark", set: "Cholesterol Homeostasis" })).toBe(
      "/atlas?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis"
    );
    expect(atlasPath({ tab: "pathways", by: "gene", pert: "scap", setLibrary: "hallmark", set: "Cholesterol Homeostasis", library: "reactome", contexts: 3, rows: 100 })).toBe(
      "/atlas?tab=pathways&by=gene&lib=hallmark&set=Cholesterol%20Homeostasis&pert=SCAP&library=reactome&contexts=3&rows=100"
    );
    // a set needs its library
    expect(atlasPath({ tab: "pathways", set: "Cholesterol Homeostasis" })).toBe("/atlas?tab=pathways");
  });

  it("reads back what it wrote", () => {
    const states = [
      { tab: "map", axis: "genes", gene: "HMGCS1", module: 26, neighbours: true },
      { tab: "modules", axis: "pert", q: "integrator", module: 31 },
      { tab: "predictions", term: "snRNA processing", library: "go_bp", evidence: "coregulation", confidence: 0.7, noGo: true, placeholder: true, neighbours: true, page: 4 },
      { tab: "pathways", by: "set", setLibrary: "programs", set: "P26: Cholesterol Homeostasis", contexts: 1, rows: 100 },
      { tab: "pathways", by: "gene", pert: "SCAP", library: "hallmark" },
    ];
    states.forEach((state) => {
      expect(readAtlasQuery(search(atlasPath(state)))).toMatchObject(state);
    });
  });

  it("falls back to the defaults for an empty or a broken address", () => {
    expect(readAtlasQuery("")).toMatchObject({
      tab: "map",
      axis: "pert",
      gene: "",
      module: 0,
      confidence: DEFAULT_CONFIDENCE,
      noGo: false,
      placeholder: false,
      neighbours: false,
      page: 1,
      by: "set",
      contexts: 2,
      rows: 25,
    });
    expect(readAtlasQuery("?tab=x&axis=y&module=-3&conf=2&page=0&contexts=9&rows=7")).toMatchObject({
      tab: "map",
      axis: "pert",
      module: 0,
      confidence: DEFAULT_CONFIDENCE,
      page: 1,
      contexts: 2,
      rows: 25,
    });
    // "symbol" is accepted for the gene (links written by hand); a library the predictions do not have is dropped
    expect(readAtlasQuery("?symbol=ints15").gene).toBe("INTS15");
    expect(readAtlasQuery("?tab=predictions&library=hallmark").library).toBe("");
    expect(readAtlasQuery("?tab=pathways&library=hallmark").library).toBe("hallmark");
  });
});

describe("request for predicted functions", () => {
  it("asks for new predictions at the default confidence, without neighbour effects", () => {
    expect(predictionParams(readAtlasQuery("?tab=predictions"))).toEqual({
      novel: true,
      min_confidence: 0.3,
      include_neighbours: false,
      per_gene: true,
      limit: PAGE_SIZE,
      offset: 0,
    });
  });

  it("turns the filters into the parameters of the API", () => {
    const query = readAtlasQuery("?tab=predictions&term=snRNA&library=corum&evidence=knockdown&conf=0.5&nogo=1&placeholder=1&neighbours=1&all=1&page=3");
    expect(predictionParams(query)).toEqual({
      novel: true,
      min_confidence: 0.5,
      include_neighbours: true,
      per_gene: false,
      limit: PAGE_SIZE,
      offset: 2 * PAGE_SIZE,
      term: "snRNA",
      library: "corum",
      evidence: "knockdown",
      max_annotations: 0,
      uncharacterised: true,
    });
  });

  it("counts pages", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
    expect(pageCount(undefined)).toBe(1);
  });
});

describe("maps", () => {
  const series = ["#a", "#b", "#c"];

  it("repeats the colours over the modules and keeps grey for no module", () => {
    expect(moduleColor(1, series, "grey")).toBe("#a");
    expect(moduleColor(3, series, "grey")).toBe("#c");
    expect(moduleColor(4, series, "grey")).toBe("#a");
    expect(moduleColor(0, series, "grey")).toBe("grey");
    expect(moduleColor(2, [], "grey")).toBe("grey");
  });

  it("keeps grey out of the module colours", () => {
    expect(moduleSeries(["#0072b2", "#7f7f7f", "#a3abb6", "#e69f00"])).toEqual(["#0072b2", "#e69f00"]);
    expect(moduleSeries(undefined)).toEqual([]);
  });

  it("groups the points by colour, every point exactly once", () => {
    const groups = mapColorGroups(MAP, series.length);
    expect(groups).toHaveLength(series.length + 1);
    // no module
    expect(groups[0]).toEqual([[10, 0, 6]]);
    // module 1 -> first colour
    expect(groups[1].map((point) => point[2])).toEqual([3, 4]);
    // modules 3 and 12 share the third colour (12 = 3 + 3 * 3)
    expect(groups[3].map((point) => point[2])).toEqual([0, 1, 2, 5]);
    expect(groups.flat()).toHaveLength(MAP.symbols.length);
    // the colour of a group is the colour of its modules
    expect(moduleColor(12, series, "grey")).toBe(series[3 - 1]);
    expect(mapColorGroups(null, 3)).toEqual([[], [], [], []]);
  });

  it("finds a gene whatever its case", () => {
    expect(pointIndex(MAP, "ints15")).toBe(2);
    expect(pointIndex(MAP, "C11ORF68")).toBe(5);
    expect(pointIndex(MAP, "NOPE")).toBe(-1);
    expect(pointIndex(MAP, "")).toBe(-1);
    expect(pointIndex(null, "INTS15")).toBe(-1);
  });

  it("lists the points of a module", () => {
    expect(modulePoints(MAP, 3)).toEqual([
      [1, 2, 0],
      [1.2, 2.2, 1],
      [1.1, 2.4, 2],
    ]);
    expect(modulePoints(MAP, 0)).toEqual([]);
    expect(modulePoints(MAP, 99)).toEqual([]);
  });

  it("suggests symbols that start with the text before those that contain it", () => {
    expect(symbolSuggestions(MAP.symbols, "ints")).toEqual(["INTS10", "INTS13", "INTS15"]);
    expect(symbolSuggestions(["XATF4", "ATF4B", "ATF4", "ATF"], "atf")).toEqual(["ATF", "ATF4", "ATF4B", "XATF4"]);
    expect(symbolSuggestions(MAP.symbols, "orf")).toEqual(["C11orf68"]);
    expect(symbolSuggestions(MAP.symbols, "")).toEqual([]);
    expect(symbolSuggestions(MAP.symbols, "ints", 2)).toHaveLength(2);
  });

  it("gives the extent of a map with a margin", () => {
    const whole = mapExtent(MAP, 0);
    expect(whole).toEqual({ x: [1, 10], y: [0, 9.3] });
    const padded = mapExtent(MAP, 0.1);
    expect(padded.x[0]).toBeCloseTo(0.1);
    expect(padded.x[1]).toBeCloseTo(10.9);
    expect(mapExtent({ x: [], y: [] })).toEqual({ x: [-0.03, 1.03], y: [-0.03, 1.03] });
  });

  it("centres a window on a point and keeps it inside the map", () => {
    const whole = mapExtent(MAP);
    const span = (whole.x[1] - whole.x[0]) * 0.3;
    const centred = focusWindow(MAP, [[5, 5]]);
    expect(centred.x[1] - centred.x[0]).toBeCloseTo(span);
    expect((centred.x[0] + centred.x[1]) / 2).toBeCloseTo(5);
    // a point at the edge: the window stops at the edge
    const edge = focusWindow(MAP, [[10, 0]]);
    expect(edge.x[1]).toBeCloseTo(whole.x[1]);
    expect(edge.y[0]).toBeCloseTo(whole.y[0]);
    // several points far apart: the window holds all of them
    const wide = focusWindow(MAP, [
      [1, 2],
      [8, 9],
    ]);
    expect(wide.x[0]).toBeLessThanOrEqual(1);
    expect(wide.x[1]).toBeGreaterThanOrEqual(8);
    expect(focusWindow(MAP, [])).toEqual(whole);
  });
});

describe("modules", () => {
  const MODULE = {
    members: ["INTS10", "INTS15", "C11ORF68", "FASN"],
    annotations: { INTS10: 6, INTS15: 0, C11ORF68: 0, FASN: 12 },
    uncharacterised: ["C11ORF68"],
    consequence: {
      up: [{ gene: "GTF3C6", meanZ: 6.69, agree: 0.53, member: false }],
      down: [{ gene: "INTS10", meanZ: -11.7, agree: 0.62, member: true }],
    },
  };

  it("marks members without a GO term and with a placeholder name", () => {
    expect(memberRows(MODULE)).toEqual([
      { gene: "INTS10", annotations: 6, uncharacterised: false, noAnnotation: false },
      { gene: "INTS15", annotations: 0, uncharacterised: false, noAnnotation: true },
      { gene: "C11ORF68", annotations: 0, uncharacterised: true, noAnnotation: true },
      { gene: "FASN", annotations: 12, uncharacterised: false, noAnnotation: false },
    ]);
    // a member the API gives no count for is not called unannotated
    expect(memberRows({ members: ["X"] })).toEqual([{ gene: "X", annotations: null, uncharacterised: false, noAnnotation: false }]);
    expect(memberRows(null)).toEqual([]);
  });

  it("names a consequence row by its gene or its perturbation", () => {
    expect(consequenceName({ gene: "RPS18" })).toBe("RPS18");
    expect(consequenceName({ perturbation: "SCAP" })).toBe("SCAP");
    expect(consequenceName(null)).toBe("");
  });

  it("exports both consequence tables with their direction", () => {
    expect(consequenceExportRows(MODULE.consequence)).toEqual([
      { direction: "up", name: "GTF3C6", meanZ: 6.69, agree: 0.53, member: "no" },
      { direction: "down", name: "INTS10", meanZ: -11.7, agree: 0.62, member: "yes" },
    ]);
    expect(consequenceExportRows(undefined)).toEqual([]);
  });

  it("formats shares", () => {
    expect(percent(0.554)).toBe("55%");
    expect(percent(0.047, 1)).toBe("4.7%");
    expect(percent(1)).toBe("100%");
    expect(percent(null)).toBe("–");
    expect(percent(NaN)).toBe("–");
  });
});

describe("predicted functions", () => {
  const PREDICTIONS = [
    { term: "A", confidence: 0.6, known: false, neighbours: ["TIMM9"] },
    { term: "B", confidence: 0.5, known: true, neighbours: [] },
    { term: "C", confidence: 0.4, known: false, neighbours: [] },
    { term: "D", confidence: 0.2, known: false },
  ];

  it("hides predictions that rest on a chromosomal neighbour, and counts them", () => {
    const hidden = visiblePredictions(PREDICTIONS);
    expect(hidden.rows.map((row) => row.term)).toEqual(["B", "C", "D"]);
    expect(hidden.hidden).toBe(1);
    expect(hidden.flagged).toBe(1);
    const shown = visiblePredictions(PREDICTIONS, { includeNeighbours: true });
    expect(shown.rows.map((row) => row.term)).toEqual(["A", "B", "C", "D"]);
    expect(shown.hidden).toBe(0);
    expect(shown.flagged).toBe(1);
  });

  it("can leave out known annotations and cut the list", () => {
    expect(visiblePredictions(PREDICTIONS, { novelOnly: true, limit: 1 }).rows.map((row) => row.term)).toEqual(["C"]);
    expect(visiblePredictions(undefined)).toEqual({ rows: [], hidden: 0, flagged: 0 });
  });

  it("exports lists as text and flags as yes or no", () => {
    const [row] = predictionExportRows([
      { gene: "INTS15", term: "Integrator complex (human)", confidence: 0.512, support: ["INTS10", "INTS8"], neighbours: [], uncharacterised: false, known: false },
    ]);
    expect(row).toMatchObject({ gene: "INTS15", confidence: 0.512, support: "INTS10;INTS8", neighbours: "", uncharacterised: "no", known: "no" });
    expect(predictionExportRows([{ gene: "X", confidence: null }])[0].confidence).toBe("");
    // every exported column exists in a row of the API
    const keys = ["gene", "name", "term", "library", "evidence", "confidence", "p", "overlap", "partners", "termSize", "support", "annotations", "uncharacterised", "known", "neighbours"];
    expect(PREDICTION_EXPORT_COLUMNS.map((column) => column.accessorKey)).toEqual(keys);
  });

  it("names libraries and kinds of evidence", () => {
    expect(libraryName("go_bp")).toBe("GO BP");
    expect(libraryName("programs")).toBe("Programmes");
    expect(libraryName("other")).toBe("other");
    expect(evidenceName("knockdown")).toBe("Knock-down");
    expect(evidenceName("coregulation")).toBe("Co-regulation");
  });

  it("labels strength bins", () => {
    expect(strengthLabel(8, 12)).toBe("8 – 12");
    expect(strengthLabel(12)).toBe("≥ 12");
  });

  it("turns the calibration into a table with one row per strength bin", () => {
    const calibration = {
      "knockdown:go_bp": {
        tested: 100,
        known: 20,
        bins: [
          { minLogP: 0, predictions: 10, precision: 0.02 },
          { minLogP: 8, predictions: 50, precision: 0.21 },
          { minLogP: 12, predictions: 40, precision: 0.46 },
        ],
      },
      // CORUM has no weak predictions: its first bin starts later
      "knockdown:corum": {
        tested: 30,
        known: 10,
        bins: [
          { minLogP: 8, predictions: 10, precision: 0.26 },
          { minLogP: 12, predictions: 20, precision: 0.57 },
        ],
      },
      "coregulation:reactome": { tested: 5, known: 1, bins: [{ minLogP: 12, predictions: 5, precision: 0.46 }] },
    };
    const table = calibrationTable(calibration);
    expect(table.columns.map((column) => column.key)).toEqual(["knockdown:go_bp", "knockdown:corum", "coregulation:reactome"]);
    expect(table.columns[0]).toMatchObject({ evidence: "knockdown", library: "go_bp", tested: 100, known: 20 });
    expect(table.rows.map((row) => row.label)).toEqual(["0 – 8", "8 – 12", "≥ 12"]);
    expect(table.rows[0].cells["knockdown:go_bp"]).toEqual({ precision: 0.02, predictions: 10 });
    expect(table.rows[0].cells["knockdown:corum"]).toBeNull();
    expect(table.rows[2].cells["coregulation:reactome"]).toEqual({ precision: 0.46, predictions: 5 });
    expect(calibrationTable(undefined)).toEqual({ columns: [], rows: [] });
  });
});

describe("pathway atlas", () => {
  it("exports the knock-downs that lower a set before those that raise it", () => {
    const rows = pathwayExportRows({
      up: [{ perturbation: "ATP6V1A", metaZ: 28.5, datasets: 10, contexts: 7, member: false }],
      down: [{ perturbation: "SREBF2", metaZ: -12, datasets: 9, contexts: 6, member: true }],
    });
    expect(rows).toEqual([
      { perturbation: "SREBF2", metaZ: -12, datasets: 9, contexts: 6, member: "yes", direction: "lowers" },
      { perturbation: "ATP6V1A", metaZ: 28.5, datasets: 10, contexts: 7, member: "no", direction: "raises" },
    ]);
  });

  it("exports the gene sets of a knock-down without a member column", () => {
    const rows = pathwayExportRows({ up: [], down: [{ set: "Cholesterol Homeostasis", library: "hallmark", size: 74, metaZ: -16.6, datasets: 15, contexts: 8 }] });
    expect(rows).toEqual([{ set: "Cholesterol Homeostasis", library: "hallmark", size: 74, metaZ: -16.6, datasets: 15, contexts: 8, direction: "lowers" }]);
    expect(pathwayExportRows(null)).toEqual([]);
  });

  it("keys a gene set by its library and its name", () => {
    expect(setKey({ library: "hallmark", name: "Cholesterol Homeostasis" })).toBe("hallmark|Cholesterol Homeostasis");
    expect(setKey({ library: "programs", set: "P26: Cholesterol Homeostasis" })).toBe("programs|P26: Cholesterol Homeostasis");
  });
});
