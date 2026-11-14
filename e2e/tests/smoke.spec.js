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

const OTHER_ROUTES = ["/", "/datasets", "/drug", "/project-signature", "/upload-dataset", "/about"];

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

// ---------------------------------------------------------------------------
// Drug datasets (Tahoe-100M): the perturbations are drugs, not genes
// ---------------------------------------------------------------------------

test("drug page shows a drug with its response, genes, similar drugs and knock-downs", async ({ page }) => {
  const { unmocked } = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/drug?id=BORTEZOMIB");

  await expect(page.getByRole("heading", { level: 1, name: "Bortezomib" })).toBeVisible();
  await expect(page.getByText("Proteasome inhibitor").first()).toBeVisible();
  // annotated target links to the gene page, PubChem to the compound
  await expect(page.locator('a[href*="/gene?symbol=PSMB5"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://pubchem.ncbi.nlm.nih.gov/compound/387447"]')).toBeVisible();

  // 47 cell lines by three doses
  const response = page.getByTestId("drug-response");
  await expect(response.locator("tbody tr")).toHaveCount(47);
  await expect(response.getByText("0.05 µM").first()).toBeVisible();
  // treatments that left few cells are marked
  await expect(response.getByLabel("few cells").first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Genes it changes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Similar drugs" })).toBeVisible();
  // similar drugs link to their own drug pages
  await expect(page.locator('a[href*="/drug?id=IXAZOMIB-CITRATE"]').first()).toBeVisible();
  await expect(page.getByText("not a target call")).toBeVisible();

  // every drug endpoint the page asks for has a fixture
  expect(unmocked.filter((request) => request.includes("/drugs"))).toEqual([]);
  expect(await errors()).toEqual([]);
});

test("drug page says so when the drug is unknown", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/drug?id=NOT-A-DRUG");
  await expect(page.getByRole("alert")).toContainText("is not a drug of the screen");
  expect(await errors()).toEqual([]);
});

test("dataset catalogue: the Chemical chip shows the drug screen, its cell lines as a list", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/datasets");
  await expect(page.getByRole("heading", { level: 2, name: "K562 Whole Genome" })).toBeVisible();

  await page.getByRole("button", { name: /^Chemical/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "K562 Whole Genome" })).toHaveCount(0);
  const card = page.locator("article", { hasText: "TahoeDrugs" }).first();
  await expect(card).toBeVisible();
  await expect(card.locator("dt", { hasText: "Treatments" })).toBeVisible();
  await expect(card.locator("dd", { hasText: "Small molecule" })).toBeVisible();
  // the cell-line table is a row of the list in the card, not a card of its own
  await expect(page.getByRole("heading", { level: 2, name: /A549/ })).toHaveCount(0);
  await card.getByText(/cell-line table/).click();
  await expect(card.getByTestId("line-tables").getByRole("rowheader", { name: "A549" })).toBeVisible();

  await page.getByRole("button", { name: /^Genetic/ }).click();
  await expect(page.locator("article", { hasText: "TahoeDrugs" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "K562 Whole Genome" })).toBeVisible();
  expect(await errors()).toEqual([]);
});

test("gene page has a Drugs section that links to drug pages", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/gene?symbol=ATF4");
  const drugs = page.getByTestId("gene-drugs");
  await expect(drugs.getByRole("heading", { level: 2, name: "Drugs" })).toBeVisible();
  await expect(drugs.locator('a[href*="/drug?id="]').first()).toBeVisible();
  expect(await errors()).toEqual([]);
});

test("a drug dataset puts the sidebar in drug mode; gene-only modules switch away from it", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/dr?ds=TahoeDrugs&genes=BORTEZOMIB,5-FLUOROURACIL,TRAMETINIB");
  // the first list holds drugs and offers the drug picker
  await expect(page.getByTestId("drug-picker").first()).toBeVisible();
  await expect(page.getByText("Drugs", { exact: true }).first()).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue(/5-FLUOROURACIL/);

  // Gene Regulation works on gene perturbations only
  await page.goto("/gene-regulation?ds=TahoeDrugs");
  await expect(page.getByText(/This module needs gene perturbations/)).toBeVisible();
  expect(await errors()).toEqual([]);
});
