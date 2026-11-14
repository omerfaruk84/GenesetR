// The cluster heatmap, run through the real page: an example gene set, a
// mocked correlation task (fixtures/corr_cluster.json), then the canvas.
const { test, expect } = require("@playwright/test");
const { mockApi, watchErrors } = require("./mockApi");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("genesetr.v2.releasePopup.dismissed.v1", "1");
    } catch (error) {
      // storage not available: the pages still work
    }
  });
});

/** Runs the correlation example and waits for the heatmap to be drawn. */
const openHeatmap = async (page) => {
  const api = await mockApi(page);
  await page.goto("/correlation-fast");
  await page.getByText("K562 Whole Genome", { exact: true }).first().click();
  await page.locator('[data-tour="example"]').first().click();
  await page.getByRole("menuitem").first().click();
  await page.locator('[data-tour="run"] button').first().click();
  await expect(page.locator("[data-cluster-heatmap] canvas").first()).toBeVisible();
  return api;
};

/** Evaluates `fn(heatmap, arg)` in the page with the renderer instance. */
const withHeatmap = (page, fn, arg) =>
  page.evaluate(
    ([source, value]) => {
      const root = document.querySelector("[data-cluster-heatmap]");
      // eslint-disable-next-line no-new-func
      return new Function("hm", "arg", `return (${source})(hm, arg);`)(root.__heatmap, value);
    },
    [fn.toString(), arg]
  );

/**
 * Viewport position of a dendrogram node: the smallest one with at least
 * `minLeaves` leaves (and at most `maxLeaves`). axis is "row" or "col".
 */
const treeNodePoint = (page, axis, minLeaves, maxLeaves = Infinity) =>
  withHeatmap(
    page,
    (hm, [kind, min, max]) => {
      const tree = hm._tree(kind);
      const frame = hm._treeFrame(kind);
      const size = (i) => tree.hi[i] - tree.lo[i] + 1;
      let best = -1;
      for (let i = 0; i < tree.nodeCount; i++) {
        if (size(i) >= min && size(i) <= max && (best < 0 || size(i) < size(best))) best = i;
      }
      const rect = hm._root.getBoundingClientRect();
      const along = (frame.along(tree.aPos[best]) + frame.along(tree.bPos[best])) / 2;
      const across = frame.across(tree.h[best]);
      const [x, y] = frame.point(along, across);
      return { x: rect.left + x, y: rect.top + y, size: size(best) };
    },
    [axis, minLeaves, maxLeaves === Infinity ? 1e9 : maxLeaves]
  );

test("correlation result is drawn by the cluster heatmap", async ({ page }) => {
  const errors = watchErrors(page);
  const api = await openHeatmap(page);
  expect(api.requests).toContain("POST /getData");

  const info = await withHeatmap(page, (hm) => ({
    rows: hm._nRows,
    cols: hm._nCols,
    mode: hm._mode,
    rowNodes: hm._rowTree.nodeCount,
    colNodes: hm._colTree ? hm._colTree.nodeCount : 0,
  }));
  expect(info).toEqual({ rows: 60, cols: 60, mode: "gl", rowNodes: 59, colNodes: 59 });
  expect(await errors()).toEqual([]);
});

test("a clicked cluster is enriched against the heatmap's genes", async ({ page }) => {
  const errors = watchErrors(page);
  const api = await openHeatmap(page);

  const node = await treeNodePoint(page, "row", 8);
  await page.mouse.click(node.x, node.y);

  // The 60 rows are the background, sent to Enrichr's background API.
  await expect(page.getByText("Background: heatmap rows (60)")).toBeVisible();
  await expect(page.getByText("Ribosome").first()).toBeVisible();
  await expect(page.getByText("∞").first()).toBeVisible(); // infinite odds ratio survives parsing
  const background = api.enrichr.find((call) => call.path.endsWith("/addbackground"));
  expect(background).toBeTruthy();
  expect(background.body).toContain("PSMA1");
  expect(api.enrichr.some((call) => call.path.endsWith("/backgroundenrich"))).toBe(true);
  expect(api.enrichr.some((call) => call.path.endsWith("/Enrichr/enrich"))).toBe(false);

  // Switching the background off falls back to the genome-wide test.
  await page.getByText("Background: heatmap rows (60)").click();
  await expect.poll(() => api.enrichr.some((call) => call.path.endsWith("/Enrichr/enrich"))).toBe(true);
  expect(await errors()).toEqual([]);
});

test("a cluster too small for enrichment says so", async ({ page }) => {
  await openHeatmap(page);
  const node = await treeNodePoint(page, "row", 2, 2);
  expect(node.size).toBe(2);
  await page.mouse.click(node.x, node.y);
  await expect(page.getByText(/Enrichment is only run for lists of 3-400 genes/)).toBeVisible();
});

test("the cluster panel opens beside the heatmap and links terms to rows", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  const widthBefore = await withHeatmap(page, (hm) => hm._layoutBox.width);

  const node = await treeNodePoint(page, "row", 8);
  await page.mouse.click(node.x, node.y);
  const panel = page.getByTestId("cluster-panel");
  await expect(panel.getByText(`Row cluster · ${node.size} genes`)).toBeVisible();

  // Side by side: the heatmap gave up width and the panel starts right of it.
  await expect.poll(() => withHeatmap(page, (hm) => hm._layoutBox.width)).toBeLessThan(widthBefore - 200);
  const heatmapBox = await page.locator("[data-cluster-heatmap]").boundingBox();
  const panelBox = await panel.boundingBox();
  expect(panelBox.x).toBeGreaterThanOrEqual(heatmapBox.x + heatmapBox.width - 1);
  expect(Math.abs(panelBox.y - heatmapBox.y)).toBeLessThan(80);

  // Hovering a term marks its overlap genes (RPL3, RPL4, RPS3 in the fixture).
  await panel.getByText("Ribosome").first().hover();
  await expect.poll(() => withHeatmap(page, (hm) => hm._marks.rows.length)).toBe(3);
  expect(await withHeatmap(page, (hm) => hm._marks.rows.map((r) => hm._rowLabels[r]).sort())).toEqual([
    "RPL3",
    "RPL4",
    "RPS3",
  ]);

  await panel.getByRole("button", { name: "Close the cluster panel" }).click();
  await expect(panel.getByText(/Row cluster/)).toHaveCount(0);
  await expect.poll(() => withHeatmap(page, (hm) => hm._layoutBox.width)).toBe(widthBefore);
  expect(await withHeatmap(page, (hm) => hm._selected.row)).toBe(-1);
  expect(await errors()).toEqual([]);
});

test("every cluster of a cut can be enriched at once", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  await withHeatmap(page, (hm) => hm.setClusterCount("row", 4));
  const sizes = await withHeatmap(page, (hm) => hm.getClusters().rows.map((cluster) => cluster.size));
  expect(sizes.reduce((a, b) => a + b, 0)).toBe(60);

  await page.getByRole("button", { name: "Enrich clusters" }).click();
  const summary = page.getByTestId("cluster-summary");
  await expect(summary.getByText(`Cluster enrichment · ${sizes.length} clusters`)).toBeVisible();
  const enrichable = sizes.filter((size) => size >= 3).length;
  await expect(summary.getByText(/Ribosome/)).toHaveCount(enrichable);
  await expect(summary.getByText("Best term of each cluster", { exact: false })).toBeVisible();
  // The best terms are written onto the heatmap's cluster bands.
  expect(await withHeatmap(page, (hm) => Object.values(hm._clusterLabels.row))).toEqual(
    Array(enrichable).fill("Ribosome")
  );

  // A row of the summary opens that cluster; "All clusters" goes back.
  const first = sizes.findIndex((size) => size >= 3);
  await summary.getByText(`Row ${first + 1}`, { exact: true }).click();
  const panel = page.getByTestId("cluster-panel");
  await expect(panel.getByText(`Row cluster · ${sizes[first]} genes`)).toBeVisible();
  await panel.getByRole("button", { name: "All clusters" }).click();
  await expect(summary.getByText(/Cluster enrichment/)).toBeVisible();

  // Moving the cut discards the summary.
  await withHeatmap(page, (hm) => hm.setClusterCount("row", 3));
  await expect(page.getByTestId("cluster-summary")).toHaveCount(0);
  expect(await errors()).toEqual([]);
});

module.exports = { openHeatmap, withHeatmap, treeNodePoint };
