/**
 * @jest-environment node
 */
import { networkToCytoscapeJson, networkToGraphML, normaliseNetwork } from "./exporters";

jest.mock("file-saver", () => ({ saveAs: jest.fn() }));
jest.mock("@oliasoft-open-source/react-ui-library", () => ({ toast: jest.fn() }));
jest.mock("echarts/core", () => ({ use: jest.fn(), init: jest.fn() }));
jest.mock("echarts/renderers", () => ({ SVGRenderer: {} }));

const network = {
  nodes: [
    { id: "ATF4", category: 1, symbolSize: 20, x: 3, itemStyle: { color: "red" } },
    { name: "DDIT3 <x>", category: 0 },
  ],
  links: [
    { source: "ATF4", target: "DDIT3 <x>", value: 2.5, lineStyle: { width: 2 } },
    { source: { id: "ATF4" }, target: "XBP1", value: -1 },
  ],
};

describe("network exports", () => {
  test("nodes and edges are normalised; unlisted endpoints become nodes", () => {
    const { nodes, edges } = normaliseNetwork(network);
    expect(nodes.map((n) => n.id)).toEqual(["ATF4", "DDIT3 <x>", "XBP1"]);
    expect(nodes[0]).toEqual({ id: "ATF4", category: 1, symbolSize: 20 }); // layout and style dropped
    expect(edges).toEqual([
      { source: "ATF4", target: "DDIT3 <x>", value: 2.5 },
      { source: "ATF4", target: "XBP1", value: -1 },
    ]);
  });

  test("GraphML is well formed and escapes names", () => {
    const text = networkToGraphML(network);
    expect(text).toContain('<key id="e_value" for="edge" attr.name="value" attr.type="double"/>');
    expect(text).toContain('<node id="DDIT3 &lt;x&gt;">');
    expect(text).toContain('<edge id="e1" source="ATF4" target="XBP1"><data key="e_value">-1</data></edge>');
    expect((text.match(/<node /g) || []).length).toBe(3);
  });

  test("Cytoscape JSON lists every element", () => {
    const parsed = JSON.parse(networkToCytoscapeJson(network));
    expect(parsed.elements.nodes).toHaveLength(3);
    expect(parsed.elements.edges[0].data).toMatchObject({ id: "e0", source: "ATF4", target: "DDIT3 <x>", value: 2.5 });
  });
});
