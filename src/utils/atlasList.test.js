/**
 * @jest-environment node
 */
import {
  ATLAS_TABS,
  MAX_LIST_GENES,
  atlasPath,
  clusterOrder,
  listPoints,
  readAtlasQuery,
  similarityExport,
  similarityHeatmap,
  similarityLimit,
  understudiedPoints,
} from "./atlas";
import { sendGenesTo, sendTargetsFor } from "./sendTo";

// "Send to" reaches the settings slices
jest.mock("../store/api", () => ({ fetchDatasets: jest.fn() }));
jest.mock("../store/safeIdb", () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }));

const search = (path) => path.slice(path.indexOf("?"));

const MAP = {
  symbols: ["INTS10", "INTS13", "INTS15", "PSMA1", "C11orf68", "KIAA0586"],
  x: [1, 1.2, 1.1, 8, 4, 6],
  y: [2, 2.2, 2.4, 9, 5, 7],
  module: [3, 3, 3, 1, 12, 0],
  annotations: [4, 9, 0, 31, 0, 7],
  placeholder: [4, 5],
};

// two tight pairs (A-C and B-D) that have nothing to do with each other
const SIMILARITY = {
  axis: "pert",
  symbols: ["A", "B", "C", "D"],
  missing: ["NOTAGENE"],
  r: [
    [0, 0.02, 0.61, -0.04],
    [0.02, 0, 0.01, 0.48],
    [0.61, 0.01, 0, 0],
    [-0.04, 0.48, 0, 0],
  ],
  score: [
    [0, 1.1, 40.2, -2],
    [1.1, 0, 0.4, 22.5],
    [40.2, 0.4, 0, 0],
    [-2, 22.5, 0, 0],
  ],
  datasets: [
    [0, 5, 7, 3],
    [5, 0, 4, 6],
    [7, 4, 0, 0],
    [3, 6, 0, 0],
  ],
};

describe("address of the gene list tab and of the highlights on the map", () => {
  it("has a gene list tab", () => {
    expect(ATLAS_TABS).toContain("list");
    expect(atlasPath({ tab: "list" })).toBe("/atlas?tab=list");
  });

  it("writes the list and the evidence of the gene list tab", () => {
    expect(atlasPath({ tab: "list", genes: ["ints1", " INTS2 ", "INTS1", "med12"] })).toBe("/atlas?tab=list&genes=INTS1,INTS2,MED12");
    expect(atlasPath({ tab: "list", axis: "genes", genes: "HMGCS1; LDLR\nSQLE" })).toBe("/atlas?tab=list&axis=genes&genes=HMGCS1,LDLR,SQLE");
    // what belongs to the map is not written
    expect(atlasPath({ tab: "list", genes: ["A", "B"], gene: "INTS15", understudied: true })).toBe("/atlas?tab=list&genes=A,B");
  });

  it("writes the highlights of the map", () => {
    expect(atlasPath({ understudied: true })).toBe("/atlas?understudied=1");
    expect(atlasPath({ axis: "genes", gene: "HMGCS1", understudied: true, genes: ["LDLR", "SQLE"] })).toBe(
      "/atlas?axis=genes&gene=HMGCS1&understudied=1&genes=LDLR,SQLE"
    );
    // the other tabs do not carry them
    expect(atlasPath({ tab: "modules", understudied: true, genes: ["LDLR"] })).toBe("/atlas?tab=modules");
  });

  it("cuts a list to the size the similarity endpoint accepts", () => {
    const many = Array.from({ length: MAX_LIST_GENES + 25 }, (_, i) => `GENE${i}`);
    const query = readAtlasQuery(search(atlasPath({ tab: "list", genes: many })));
    expect(query.genes).toHaveLength(MAX_LIST_GENES);
    expect(query.genes[0]).toBe("GENE0");
  });

  it("reads back what it wrote", () => {
    const states = [
      { tab: "list", axis: "genes", genes: ["HMGCS1", "LDLR", "SQLE"] },
      { tab: "list", axis: "pert", genes: ["RPL36A-HNRNPH2", "AC118549.1"] },
      { tab: "map", axis: "pert", gene: "INTS15", module: 47, understudied: true, genes: ["INTS1", "INTS2"] },
    ];
    states.forEach((state) => {
      expect(readAtlasQuery(search(atlasPath(state)))).toMatchObject(state);
    });
    expect(readAtlasQuery("")).toMatchObject({ genes: [], understudied: false });
    expect(readAtlasQuery("?genes=a,b;c%20d,a").genes).toEqual(["A", "B", "C", "D"]);
  });
});

describe("highlights on the map", () => {
  it("finds the genes without a GO term and those with a placeholder name", () => {
    const marks = understudiedPoints(MAP);
    expect(marks.known).toBe(true);
    expect(marks.noGo).toEqual([
      [1.1, 2.4, 2],
      [4, 5, 4],
    ]);
    // C11orf68 is in both lists
    expect(marks.placeholder).toEqual([
      [4, 5, 4],
      [6, 7, 5],
    ]);
  });

  it("says so when a map does not carry the fields", () => {
    const { annotations, placeholder, ...older } = MAP;
    expect(understudiedPoints(older)).toEqual({ noGo: [], placeholder: [], known: false });
    expect(understudiedPoints(null)).toEqual({ noGo: [], placeholder: [], known: false });
    // an index outside the map is ignored
    expect(understudiedPoints({ ...MAP, placeholder: [5, 99, -1] }).placeholder).toEqual([[6, 7, 5]]);
  });

  it("places a gene list on a map and names the genes that are not on it", () => {
    const { points, missing } = listPoints(MAP, ["ints15", "C11ORF68", "NOTAGENE", "INTS15"]);
    expect(points).toEqual([
      [1.1, 2.4, 2],
      [4, 5, 4],
    ]);
    expect(missing).toEqual(["NOTAGENE"]);
    expect(listPoints(MAP, [])).toEqual({ points: [], missing: [] });
    expect(listPoints(null, ["A"])).toEqual({ points: [], missing: ["A"] });
  });
});

describe("similarity heatmap of a gene list", () => {
  it("puts similar genes next to each other", () => {
    const order = clusterOrder(SIMILARITY.r);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    const position = (i) => order.indexOf(i);
    expect(Math.abs(position(0) - position(2))).toBe(1);
    expect(Math.abs(position(1) - position(3))).toBe(1);
  });

  it("keeps the order of one or two genes and survives broken values", () => {
    expect(clusterOrder([])).toEqual([]);
    expect(clusterOrder([[0]])).toEqual([0]);
    expect(clusterOrder([[0, 0.3], [0.3, 0]])).toEqual([0, 1]);
    expect(clusterOrder(undefined)).toEqual([]);
    const order = clusterOrder([
      [0, null, 0.9],
      [null, 0, NaN],
      [0.9, NaN, 0],
    ]);
    expect(order).toEqual([0, 2, 1]);
  });

  it("clusters 400 genes into their groups", () => {
    const n = 400;
    const group = (i) => i % 4;
    const matrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : group(i) === group(j) ? 0.6 : 0.01)));
    const order = clusterOrder(matrix);
    expect(order).toHaveLength(n);
    expect(new Set(order).size).toBe(n);
    // each group is one block: the group changes three times along the order
    const changes = order.filter((gene, index) => index > 0 && group(gene) !== group(order[index - 1])).length;
    expect(changes).toBe(3);
  });

  it("ends the colour scale at the largest correlation between two different genes", () => {
    expect(similarityLimit(SIMILARITY.r)).toBe(0.65);
    expect(similarityLimit([[5, 0.02], [0.02, 5]])).toBe(0.1);
    expect(similarityLimit([[0, -0.4], [-0.4, 0]])).toBe(0.4);
    expect(similarityLimit(undefined)).toBe(0.1);
  });

  it("gives the cells in display order, without the diagonal and the pairs no dataset has", () => {
    const heat = similarityHeatmap(SIMILARITY);
    expect(heat.symbols).toHaveLength(4);
    expect(heat.symbols.map((name) => SIMILARITY.symbols.indexOf(name))).toEqual(heat.order);
    expect(heat.limit).toBe(0.65);
    // 12 pairs off the diagonal, C-D and D-C have no dataset
    expect(heat.cells).toHaveLength(10);
    const a = heat.symbols.indexOf("A");
    const c = heat.symbols.indexOf("C");
    expect(heat.cells.find((cell) => cell[0] === c && cell[1] === a)).toEqual([c, a, 0.61, 40.2, 7]);
    expect(heat.cells.some((cell) => cell[0] === cell[1])).toBe(false);
    expect(similarityHeatmap(null)).toEqual({ symbols: [], order: [], cells: [], limit: 0.1 });
  });

  it("exports the matrix in display order", () => {
    const { columns, rows } = similarityExport(SIMILARITY, [0, 2, 1, 3]);
    expect(columns.map((column) => column.header)).toEqual(["Gene", "A", "C", "B", "D"]);
    expect(rows.map((row) => columns.map((column) => column.accessorFn(row)))).toEqual([
      ["A", "", 0.61, 0.02, -0.04],
      ["C", 0.61, "", 0.01, ""],
      ["B", 0.02, 0.01, "", 0.48],
      ["D", -0.04, "", 0.48, ""],
    ]);
    // without an order the genes stay as they came
    expect(similarityExport(SIMILARITY).rows.map((row) => row.gene)).toEqual(["A", "B", "C", "D"]);
  });
});

describe("Send to the Function atlas", () => {
  it("is offered for genes, not for drugs", () => {
    expect(sendTargetsFor().map((target) => target.id)).toContain("atlasList");
    expect(sendTargetsFor({ drugs: true }).map((target) => target.id)).not.toContain("atlasList");
  });

  it("opens the gene list tab with the list in the address", () => {
    const dispatch = jest.fn();
    expect(sendGenesTo("atlasList", ["INTS1_2", "ints2", "INTS1"])(dispatch, () => ({}))).toBe("/atlas?tab=list&genes=INTS1,INTS2");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
