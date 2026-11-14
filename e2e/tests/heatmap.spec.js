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

module.exports = { openHeatmap, withHeatmap };
