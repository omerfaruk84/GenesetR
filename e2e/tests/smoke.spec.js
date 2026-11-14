const { test, expect } = require("@playwright/test");
const { mockApi, watchErrors } = require("./mockApi");

// The release note opens on a first visit; the tests start as a returning visitor.
const returningVisitor = async (page) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("genesetr.v2.releasePopup.dismissed.v1", "1");
    } catch (error) {
      // storage not available: the pages still work
    }
  });
};

test.beforeEach(async ({ page }) => {
  await returningVisitor(page);
});

const ANALYSIS_ROUTES = [
  "/correlation",
  "/dr",
  "/heatmap",
  "/pathfinder",
  "/genesignature",
  "/expressionanalyzer",
  "/deregulated-genes",
  "/gene-regulation",
  "/gene-regulation-enhanced",
  "/multidataset-comparison",
  "/cell-cycle",
  "/genelists",
];

const OTHER_ROUTES = ["/", "/datasets", "/project-signature", "/upload-dataset", "/about"];

test("start page shows the five question groups", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/");
  for (const group of ["Explore a gene", "Explore a gene set", "Compare contexts", "Find mechanisms", "Bring your data"]) {
    await expect(page.getByText(group, { exact: true }).first()).toBeVisible();
  }
  expect(await errors()).toEqual([]);
});

for (const route of [...OTHER_ROUTES, ...ANALYSIS_ROUTES]) {
  test(`page ${route} renders without errors`, async ({ page }) => {
    await mockApi(page);
    const errors = watchErrors(page);
    await page.goto(route);
    await expect(page.locator("body")).not.toContainText("Look like you're lost");
    // Analysis pages have the sidebar with its run button
    if (ANALYSIS_ROUTES.includes(route) && !["/genelists", "/cell-cycle"].includes(route)) {
      await expect(page.locator('[data-tour="run"]').first()).toBeVisible();
    }
    await page.waitForTimeout(1500);
    expect(await errors()).toEqual([]);
  });
}

test("unknown address shows the not-found page", async ({ page }) => {
  await mockApi(page);
  await page.goto("/no-such-page");
  await expect(page.locator("body")).toContainText("Look like you're lost");
});

test("gene page shows the cross-dataset summary", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/gene?symbol=ATF4");
  await expect(page.getByRole("heading", { name: /ATF4/ }).first()).toBeVisible();
  await expect(page.locator("body")).toContainText("K562 Whole Genome");
  await expect(page.locator("body")).toContainText("activating transcription factor 4");
  expect(api.requests).toContain("GET /api/v1/genes/ATF4");
  expect(await errors()).toEqual([]);
});

test("gene page says so when a gene is in no dataset", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/gene?symbol=NOTAGENE1");
  await expect(page.locator("body")).toContainText("is neither a perturbation nor a measured gene in any dataset");
  expect(await errors()).toEqual([]);
});

test("dataset catalog lists and filters the datasets", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/datasets");
  await expect(page.locator("body")).toContainText("K562 Whole Genome");
  await expect(page.locator("body")).toContainText("HCT116 Whole Genome");
  const search = page.getByPlaceholder(/Search by name/);
  await search.fill("HCT116");
  await expect(page.locator("body")).not.toContainText("K562 Whole Genome");
  await expect(page.locator("body")).toContainText("HCT116 Whole Genome");
  expect(await errors()).toEqual([]);
});

test("a shared link fills the gene list and the settings", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto('/correlation?genes=ATF4,DDIT3,XBP1&correlation.selectedDatasets=["K562gwps"]&correlation.corrType=pearson');
  const list = page.locator("textarea").first();
  await expect(list).toHaveValue(/^ATF4\s+DDIT3\s+XBP1\s*$/);
  await expect(page.locator("body")).toContainText("3 perturbations");
  // The address keeps the settings after the page has rewritten it
  await expect(page).toHaveURL(/genes=ATF4%2CDDIT3%2CXBP1/);
  await expect(page).toHaveURL(/correlation\.corrType=pearson/);
  expect(await errors()).toEqual([]);
});

test("theme switch turns the dark theme on and off", async ({ page }) => {
  await mockApi(page);
  await page.goto("/datasets");
  const html = page.locator("html");
  const toggle = page.locator('button[aria-label*="theme" i], button[title*="theme" i], button[aria-label*="dark" i], button[title*="dark" i]').first();
  await expect(toggle).toBeVisible();
  const before = await html.getAttribute("data-gs-theme");
  await toggle.click();
  await expect(html).not.toHaveAttribute("data-gs-theme", before || "light-is-unset");
  const after = await html.getAttribute("data-gs-theme");
  expect(after === "dark" || before === "dark").toBe(true);
});
