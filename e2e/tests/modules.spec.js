// The analysis modules, each run through its real page with the result of the
// backend's own task code for the page's example request (fixtures/task_*.json).
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

/** Opens a module, picks K562 where a dataset has to be ticked, loads the examples and runs. */
const runExample = async (page, route) => {
  const api = await mockApi(page);
  await page.goto(route);
  const run = page.locator('[data-tour="run"] button').first();
  await expect(run).toBeVisible();
  await page.waitForTimeout(800);
  const dataset = page.getByText("K562 Whole Genome", { exact: true }).first();
  if ((await dataset.count()) > 0 && (await run.isDisabled())) await dataset.click();
  const examples = page.locator('[data-tour="example"]');
  const count = await examples.count();
  for (let i = 0; i < count; i++) {
    // Some pages keep a list (and its example button) folded away; their
    // defaults are enough to run.
    if (!(await examples.nth(i).isVisible())) continue;
    await examples.nth(i).click({ timeout: 4000 }).catch(() => {});
    const item = page.getByRole("menuitem").first();
    if (await item.isVisible().catch(() => false)) await item.click();
  }
  await run.click();
  return api;
};

const MODULES = [
  { route: "/dr", request: "PCAGraph" },
  { route: "/expressionanalyzer", request: "geneExpression" },
  { route: "/genesignature", request: "calcGeneSignature" },
  { route: "/deregulated-genes", request: "calcDeregulatedGenes" },
  { route: "/pathfinder", request: "findPath" },
  { route: "/gene-regulation", request: "expandGene" },
  { route: "/gene-regulation-enhanced", request: "expandGeneEnhanced" },
];

for (const { route, request } of MODULES) {
  test(`${route} draws its example result without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    const api = await runExample(page, route);
    await expect.poll(() => api.taskRequests).toContain(request);
    // A result is a chart on a canvas (ECharts, Cytoscape, force graph) or a table.
    await expect(page.locator("canvas, table").first()).toBeVisible();
    await page.waitForTimeout(1500);
    expect(await errors()).toEqual([]);
  });
}

for (const route of ["/pathfinder", "/gene-regulation", "/gene-regulation-enhanced"]) {
  test(`${route}: the link table lists the edges, with gene links and export`, async ({ page }) => {
    const errors = watchErrors(page);
    await runExample(page, route);
    await expect(page.locator("canvas").first()).toBeVisible();
    await page.getByText("Link Table", { exact: true }).first().click();
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(1);
    await expect(page.locator('table a[href*="/gene?symbol="]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: "CSV" }).first()).toBeVisible();
    if (route === "/gene-regulation-enhanced") {
      // The direction of an effect comes from the API's `Type` field; the
      // column used to say "Unknown" on every row.
      const cells = await page.locator("table tbody tr td").allTextContents();
      expect(cells.some((text) => ["DNR", "UPR"].includes(text.trim()))).toBe(true); // down- / up-regulated
      expect(cells.filter((text) => text.trim() === "Unknown").length).toBeLessThan(cells.length / 20);
    }
    expect(await errors()).toEqual([]);
  });
}

module.exports = { runExample };
