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

const OTHER_ROUTES = ["/", "/datasets", "/drug", "/project-signature", "/tf-regulators", "/integrated", "/atlas", "/interactions", "/ask", "/upload-dataset", "/about"];

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
    await expect(page.locator("body")).not.toContainText("This page does not exist");
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
  await expect(page.locator("body")).toContainText("This page does not exist");
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

test("TF regulators: an example runs and the result tables show MYC", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/tf-regulators");
  await expect(page.getByRole("heading", { level: 1, name: "TF regulators" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find TF regulators" })).toBeDisabled();
  await page.getByRole("link", { name: "MYC targets" }).click();

  // the example is in the address, so the result can be shared
  await expect(page).toHaveURL(/\/tf-regulators\?up=NCL,NPM1,LDHA.*run=1/);
  await expect(page.getByLabel("Genes that go up")).toHaveValue(/^NCL\nNPM1\nLDHA\n/);
  const both = page.getByTestId("regulators-supportedByBoth");
  await expect(both.getByRole("heading", { name: "Supported by both directions" })).toBeVisible();
  await expect(both.locator('a[href*="/gene?symbol=MYC"]')).toBeVisible();
  await expect(both).toContainText("activator (both directions)");
  await expect(page.getByTestId("regulators-activators").locator('a[href*="/gene?symbol=MAX"]')).toBeVisible();
  await expect(page.getByTestId("regulators-summary")).toContainText("10 genes up and 0 genes down");
  expect(api.regulatorRequests[0]).toMatchObject({ up: ["NCL", "NPM1", "LDHA", "PPA1", "SNRPD1", "EBNA1BP2", "NOP56", "FBL", "CDK4", "ODC1"], down: [] });

  // a row opens to the values per dataset, with dataset names
  await both.getByRole("button", { name: /Show the values of MYC/ }).click();
  await expect(both).toContainText("TF Atlas (TF overexpression, hESC) (overexpression)");
  await expect(both).toContainText("K562 Whole Genome");
  expect(await errors()).toEqual([]);
});

test("TF regulators: a shared address runs at once; the API's message is shown for a bad request", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/tf-regulators?up=NCL,NPM1&down=TUBB&run=1");
  await expect(page.getByLabel("Genes that go down")).toHaveValue("TUBB");
  await expect(page.getByTestId("regulators-supportedByBoth").locator('a[href*="/gene?symbol=MYC"]')).toBeVisible();

  // the mock rejects fewer than 3 genes like the API does
  await page.route(/\/api\/v1\/regulators\/gene-set/, (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "None of the genes are measured", details: {} } }),
    })
  );
  await page.getByLabel("Genes that go up").fill("ZZZ1 ZZZ2 ZZZ3");
  await page.getByRole("button", { name: "Find TF regulators" }).click();
  await expect(page.getByRole("alert")).toContainText("None of the genes are measured");
  expect(await errors()).toEqual([]);
});

test("gene page has a TF regulators section that links to gene pages and to the list page", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/gene?symbol=ATF4");
  const section = page.getByTestId("gene-regulators");
  await expect(section.getByRole("heading", { level: 2, name: "Transcription factors that regulate ATF4" })).toBeVisible();
  await expect(section.getByRole("heading", { level: 3, name: "Supported by both directions" })).toBeVisible();
  await expect(section.locator('a[href*="/gene?symbol="]').first()).toBeVisible();
  expect(api.requests).toContain("GET /api/v1/regulators/gene/ATF4");
  await section.getByRole("link", { name: "Find TFs for a gene list" }).click();
  await expect(page).toHaveURL(/\/tf-regulators$/);
  expect(await errors()).toEqual([]);
});

test("integrated analysis: every mode renders and is in the address", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated");
  await expect(page.getByRole("heading", { level: 1, name: "Integrated analysis" })).toBeVisible();
  await expect(page.getByTestId("integrated-explain")).toContainText("Meta z");
  await expect(page.locator("body")).toContainText("24 datasets in 12 cell contexts");
  await expect(page.getByRole("combobox", { name: "Search a gene" })).toBeVisible();

  await page.getByRole("tab", { name: "Signature" }).click();
  await expect(page).toHaveURL(/\/integrated\?mode=signature$/);
  await expect(page.getByLabel("Genes that go up")).toBeVisible();
  await expect(page.getByRole("button", { name: "Find perturbations" })).toBeDisabled();

  await page.getByRole("tab", { name: "Common effects of a gene list" }).click();
  await expect(page).toHaveURL(/\/integrated\?mode=set$/);
  await expect(page.getByLabel("Perturbed genes")).toBeVisible();
  await expect(page.getByRole("button", { name: "Find common effects" })).toBeDisabled();
  expect(await errors()).toEqual([]);
});

test("integrated analysis: ATF4 as a perturbation shows PHGDH among the down targets", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=gene&symbol=ATF4");
  await expect(page.getByTestId("integrated-coverage")).toContainText("Perturbed in 14 datasets across 9 cell contexts");
  const down = page.getByTestId("integrated-targets-down");
  await expect(down.locator('a[href*="mode=gene&symbol=PHGDH&view=measured"]')).toBeVisible();
  await expect(down.locator('a[href*="/gene?symbol=PHGDH"]')).toBeVisible();
  await expect(page.getByTestId("integrated-targets-up")).toBeVisible();
  await expect(page.getByTestId("integrated-context-specific")).toContainText("hESC");
  await expect(page.getByTestId("integrated-partners").locator('a[href*="symbol=EIF4G1"]')).toBeVisible();
  await expect(page.getByTestId("integrated-strength")).toContainText("K562 Whole Genome");
  await expect(page.getByTestId("integrated-pathways")).toContainText("mTORC1 Signaling");
  await expect(page.getByTestId("integrated-pathways")).toContainText("q-values are optimistic");

  // a row opens to the values per dataset, with the dataset name and its cell context
  await down.getByRole("button", { name: /Show the values of PHGDH/ }).click();
  await expect(down).toContainText("K562 Whole Genome · K562");

  // enrichment of a result list is asked for only when it is opened
  expect(api.integratedRequests.filter((entry) => entry.path === "/api/v1/enrichment")).toHaveLength(0);
  await down.getByRole("button", { name: /^Enrichment of these/ }).click();
  await expect(down.getByTestId("local-enrichment")).toContainText("mTORC1 Signaling");
  expect(api.integratedRequests.find((entry) => entry.path === "/api/v1/enrichment").body.genes).toContain("PHGDH");

  // the same gene as a measured gene
  await page.getByRole("tab", { name: "As a measured gene" }).click();
  await expect(page).toHaveURL(/mode=gene&symbol=ATF4&view=measured/);
  await expect(page.getByRole("heading", { level: 3, name: "Needed for ATF4: knock-down lowers it" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Hold ATF4 down: knock-down raises it" })).toBeVisible();
  expect(api.unmocked.filter((request) => request.includes("/integrated"))).toEqual([]);
  expect(await errors()).toEqual([]);
});

test("integrated analysis: a gene that is not perturbed is shown as a measured gene", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=gene&symbol=SQLE");
  await expect(page.getByTestId("integrated-other-view")).toContainText("SQLE is not perturbed in any integrated dataset");
  await expect(page.getByTestId("integrated-regulators-down").locator('a[href*="mode=gene&symbol=MBTPS1"]')).toBeVisible();
  await expect(page.getByTestId("integrated-overexpression")).toContainText("Overexpression raises SQLE");

  await page.goto("/integrated?mode=gene&symbol=NOTAGENE1");
  await expect(page.getByRole("alert")).toContainText("neither perturbed nor measured");
  expect(await errors()).toEqual([]);
});

test("integrated analysis: the signature example shows MBTPS1; the gene-list example shows HSPA1A", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=signature");
  await page.getByRole("link", { name: "Cholesterol synthesis" }).click();
  await expect(page).toHaveURL(/mode=signature&up=HMGCS1,HMGCR,LDLR.*run=1/);
  await expect(page.getByLabel("Genes that go up")).toHaveValue(/^HMGCS1\nHMGCR\nLDLR\n/);
  const required = page.getByTestId("integrated-signature-required");
  await expect(required.locator('a[href*="mode=gene&symbol=MBTPS1"]')).toBeVisible();
  await expect(page.getByTestId("integrated-signature-restrains").locator('a[href*="mode=gene&symbol=ATP6V1A"]')).toBeVisible();
  await expect(page.getByTestId("integrated-signature-summary")).toContainText("14 genes up and 0 genes down");
  await expect(page.getByTestId("integrated-overexpression")).toContainText("Overexpression induces the signature");
  expect(api.integratedRequests[0].body).toMatchObject({ up: expect.arrayContaining(["HMGCS1", "STARD4"]), down: [], min_contexts: 2, top_n: 20 });

  // the controls are part of the address and of the request
  await page.getByRole("button", { name: "Minimum contexts 3" }).click();
  await expect(page).toHaveURL(/contexts=3/);
  await expect.poll(() => api.integratedRequests.some((entry) => entry.body.min_contexts === 3)).toBe(true);

  await page.goto("/integrated?mode=set&genes=PSMA1,PSMB3,PSMD4,PSMC3,PSMA6,POMP&run=1");
  await expect(page.getByLabel("Perturbed genes")).toHaveValue(/^PSMA1\nPSMB3/);
  await expect(page.getByTestId("integrated-set-up").locator('a[href*="mode=gene&symbol=HSPA1A&view=measured"]')).toBeVisible();
  await expect(page.getByTestId("integrated-set-summary")).toContainText("6 perturbed genes used");
  await page.getByTestId("integrated-set-up").getByRole("button", { name: /Show the values of HSPA1A/ }).click();
  await expect(page.getByTestId("integrated-set-up")).toContainText("PSMB3");
  expect(await errors()).toEqual([]);
});

test("gene page has a consensus block; the TF regulators page links to the integrated signature", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/gene?symbol=ATF4");
  const block = page.getByTestId("gene-consensus");
  await expect(block.getByRole("heading", { level: 2, name: "Across all datasets (consensus)" })).toBeVisible();
  await expect(block.getByRole("heading", { level: 3, name: "Go down when ATF4 is knocked down" })).toBeVisible();
  await expect(block.getByRole("heading", { level: 3, name: "Needed for ATF4: knock-down lowers it" })).toBeVisible();
  expect(api.requests).toContain("GET /api/v1/integrated/perturbation/ATF4");
  await block.getByRole("link", { name: "Open the integrated view" }).click();
  await expect(page).toHaveURL(/\/integrated\?mode=gene&symbol=ATF4$/);

  await page.goto("/tf-regulators?up=NCL,NPM1&down=TUBB&run=1");
  await page.getByRole("link", { name: "Search all perturbations, not only TFs" }).click();
  await expect(page).toHaveURL(/\/integrated\?mode=signature&up=NCL,NPM1&down=TUBB&run=1/);
  await expect(page.getByTestId("integrated-signature-required")).toBeVisible();
  expect(await errors()).toEqual([]);
});

test("dataset catalogue shows the complex recovery where the benchmark has the dataset", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/datasets");
  const recovery = page.getByTestId("complex-recovery").first();
  await expect(recovery).toContainText("Complex recovery");
  await expect(recovery).toContainText(/AUROC 0\.\d\d · \d+(\.\d)?% of the top 1,000 pairs/);
  await expect(recovery).toHaveAttribute("title", /same CORUM complex/);
  expect(await errors()).toEqual([]);
});

// ---------------------------------------------------------------------------
// Function atlas: maps, modules, predicted functions, pathway activity
// ---------------------------------------------------------------------------

test("function atlas: the map finds a gene, shows its panel and the module it is in", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/atlas");
  await expect(page.getByRole("heading", { level: 1, name: "Function atlas" })).toBeVisible();
  await expect(page.getByTestId("atlas-explain")).toContainText("Knock-down map");
  await expect(page.getByTestId("atlas-explain")).toContainText("3,775 genes in 76 modules");
  const map = page.getByTestId("atlas-map");
  await expect(map.locator("canvas")).toBeVisible();
  await expect(map).toContainText("332 genes");
  await expect(page.getByTestId("atlas-module-list").getByRole("link")).toHaveCount(6);

  // the search box suggests the genes of the map; the gene is in the address
  await page.getByRole("combobox", { name: "Find a gene on the map" }).fill("ints1");
  await page.getByRole("option", { name: /^INTS15/ }).click();
  await expect(page).toHaveURL(/\/atlas\?gene=INTS15$/);
  const panel = page.getByTestId("atlas-gene-panel");
  await expect(panel.getByRole("heading", { level: 3, name: "INTS15" })).toBeVisible();
  await expect(panel).toContainText("integrator complex subunit 15");
  await expect(panel).toContainText("no GO term");
  await expect(panel.getByTestId("atlas-gene-partners").locator('a[href*="gene=INTS13"]')).toBeVisible();
  await expect(panel.getByTestId("atlas-gene-predictions")).toContainText("Integrator complex");
  await expect(panel.getByTestId("atlas-gene-place-genes")).toContainText("not on the map");
  await expect(panel.locator('a[href*="/gene?symbol=INTS15"]')).toBeVisible();

  // the module of the gene opens beside it
  await panel.getByRole("link", { name: "M47: INTS10 / INTS14 / INTS13" }).click();
  await expect(page).toHaveURL(/\/atlas\?gene=INTS15&module=47$/);
  const module = page.getByTestId("atlas-module-panel");
  await expect(module.getByRole("heading", { level: 3, name: "M47: INTS10 / INTS14 / INTS13" })).toBeVisible();
  await expect(module.getByTestId("atlas-module-terms")).toContainText("histone H3 acetylation");
  const members = module.getByTestId("atlas-module-members");
  await expect(members.getByRole("link")).toHaveCount(36);
  await expect(members.locator('a[data-no-go="true"]', { hasText: "INTS15" })).toBeVisible();
  await expect(members.locator('a[data-placeholder="true"]')).toHaveText(["C11ORF68"]);
  await expect(module.getByTestId("atlas-module-down")).toContainText("RPS18");
  await expect(module.getByTestId("atlas-module-up")).toContainText("GADD45GIP1");
  await expect(module.getByRole("button", { name: /Send the genes to/ })).toBeVisible();
  await expect(page.getByTestId("atlas-module-list").locator('a[aria-current="true"]')).toContainText("M47");

  // the other map: the gene stays chosen, and the page says that it is not on it
  await page.getByRole("link", { name: "Co-regulated genes" }).click();
  await expect(page).toHaveURL(/\/atlas\?axis=genes&gene=INTS15$/);
  await expect(page.getByTestId("atlas-explain")).toContainText("Co-regulation map");
  await expect(page.getByTestId("atlas-not-on-map")).toContainText("INTS15 is not on this map");
  await expect(page.getByTestId("atlas-module-list").getByRole("link")).toHaveCount(3);
  expect(api.atlasRequests.map((request) => request.path)).toEqual(
    expect.arrayContaining(["summary", "map/pert", "map/genes", "gene/INTS15", "modules/pert/47"])
  );
  expect(await errors()).toEqual([]);
});

test("function atlas: clicking a point of the map chooses that gene", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/atlas");
  const canvas = page.getByTestId("atlas-map").locator("canvas").first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const box = await canvas.boundingBox();
  // the chart shows a hand over a point: look for one on a grid
  let found = false;
  for (let y = box.y + 20; y < box.y + box.height - 20 && !found; y += 9) {
    for (let x = box.x + 20; x < box.x + box.width - 20 && !found; x += 9) {
      await page.mouse.move(x, y);
      found = await page.evaluate(([px, py]) => getComputedStyle(document.elementFromPoint(px, py)).cursor === "pointer", [x, y]);
      if (found) await page.mouse.click(x, y);
    }
  }
  expect(found).toBe(true);
  await expect(page).toHaveURL(/\/atlas\?gene=[A-Z0-9.-]+$/);
  // the gene has a panel (only three genes have a fixture; the others are answered with 404)
  await expect(page.getByTestId("atlas-gene-panel").or(page.getByTestId("atlas-gene-missing"))).toBeVisible();
  expect(await errors()).toEqual([]);
});

test("function atlas: predictions that rest on a chromosomal neighbour are hidden until asked for", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/atlas?gene=KIAA0586");
  const panel = page.getByTestId("atlas-gene-panel");
  await expect(panel).toContainText("placeholder name");
  // the promoter of TIMM9 lies within 5 kb of that of KIAA0586
  const partners = panel.getByTestId("atlas-gene-partners");
  await expect(partners.getByTestId("neighbour-mark")).toHaveCount(1);
  await expect(partners.locator("tr", { hasText: "TIMM9" }).getByTestId("neighbour-mark")).toBeVisible();
  await expect(panel.getByTestId("atlas-gene-hidden")).toContainText("13 predictions hidden");
  await expect(panel.getByTestId("atlas-gene-predictions").getByTestId("neighbour-mark")).toHaveCount(0);

  await panel.getByLabel("Include possible neighbour and collateral effects").check();
  await expect(page).toHaveURL(/\/atlas\?gene=KIAA0586&neighbours=1$/);
  await expect(panel.getByTestId("atlas-gene-predictions")).toContainText("Mitochondrial Protein Import");
  await expect(panel.getByTestId("atlas-gene-predictions").getByTestId("neighbour-mark").first()).toBeVisible();
  expect(await errors()).toEqual([]);
});

test("function atlas: the modules are searchable and open in the module panel", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/atlas");
  await page.getByRole("tab", { name: "Modules" }).click();
  await expect(page).toHaveURL(/\/atlas\?tab=modules$/);
  const list = page.getByTestId("atlas-modules");
  await expect(list.getByRole("link")).toHaveCount(6);
  await expect(page.getByTestId("atlas-modules-count")).toContainText("6 modules");

  // the search text is in the address and in the request; it also matches enriched gene sets
  await page.getByRole("searchbox", { name: "Search the modules" }).fill("integrator");
  await expect(page).toHaveURL(/\/atlas\?tab=modules&q=integrator$/);
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(list).toContainText("M31: transcription by RNA polymerase II");
  await expect(list).toContainText("Integrator complex");
  expect(api.atlasRequests.some((request) => request.path === "modules/pert" && request.query.q === "integrator")).toBe(true);

  await page.goto("/atlas?tab=modules&module=47");
  const panel = page.getByTestId("atlas-module-panel");
  await expect(panel.getByRole("heading", { level: 3, name: "M47: INTS10 / INTS14 / INTS13" })).toBeVisible();
  await expect(panel).toContainText("named after its most central members");
  // a member opens on the map
  await expect(panel.getByTestId("atlas-module-members").locator('a[href$="/atlas?gene=INTS15&module=47"]')).toBeVisible();
  await panel.getByRole("link", { name: "Show on the map" }).click();
  await expect(page).toHaveURL(/\/atlas\?module=47$/);
  await expect(page.getByTestId("atlas-map").locator("canvas")).toBeVisible();

  // a co-regulation programme: the consequence is the knock-downs that move it
  await page.goto("/atlas?tab=modules&axis=genes&module=26");
  await expect(panel.getByRole("heading", { level: 3, name: "P26: Cholesterol Homeostasis" })).toBeVisible();
  await expect(panel.getByTestId("atlas-module-terms")).toContainText("Cholesterol Biosynthesis");
  await expect(panel.getByTestId("atlas-module-down")).toContainText("MBTPS1");
  await expect(panel.getByTestId("atlas-module-up").getByTestId("member-mark")).toHaveCount(8);
  expect(await errors()).toEqual([]);
});

test("function atlas: predicted functions follow the filters; the calibration is shown", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  const asked = (test) => api.atlasRequests.some((request) => request.path === "predictions" && test(request.query));
  await page.goto("/atlas?tab=predictions");
  await expect(page.getByTestId("atlas-predictions-explain")).toContainText("lower bound");
  const calibration = page.getByTestId("atlas-calibration");
  await expect(calibration.locator("tbody tr")).toHaveCount(7);
  await expect(calibration.locator("tbody tr").last()).toContainText("≥ 12");
  await expect(calibration.locator("tbody tr").last()).toContainText("46%");

  const count = page.getByTestId("atlas-predictions-count");
  const table = page.getByTestId("atlas-predictions");
  await expect(count).toContainText("17,947 predictions for 2,717 genes");
  await expect(table.locator('a[href*="/gene?symbol=PSMG3"]').first()).toBeVisible();
  await expect(table.getByTestId("neighbour-mark")).toHaveCount(0);
  expect(api.atlasRequests.find((request) => request.path === "predictions").query).toMatchObject({
    novel: "true",
    min_confidence: "0.3",
    include_neighbours: "false",
    limit: "50",
    offset: "0",
  });

  await page.getByLabel("Only placeholder names").check();
  await expect(page).toHaveURL(/\/atlas\?tab=predictions&placeholder=1$/);
  await expect(count).toContainText("139 predictions for 24 genes");
  await expect(table.locator('a[href*="/gene?symbol=FAM153CP"]').first()).toBeVisible();
  await expect(table).toContainText("family with sequence similarity 153 member C");
  await page.getByLabel("Only placeholder names").uncheck();

  await page.getByLabel("Include possible neighbour and collateral effects").check();
  await expect(page).toHaveURL(/\/atlas\?tab=predictions&neighbours=1$/);
  await expect(table.getByTestId("neighbour-mark").first()).toBeVisible();
  await expect(table.locator("tr", { hasText: "FTSJ3" }).getByTestId("neighbour-mark")).toHaveAttribute("title", /PSMC5/);

  await page.getByLabel("Only genes without GO terms").check();
  await expect(page).toHaveURL(/nogo=1/);
  await expect.poll(() => asked((query) => query.max_annotations === "0" && query.include_neighbours === "true")).toBe(true);
  await page.getByRole("button", { name: "Minimum confidence 50%" }).click();
  await expect(page).toHaveURL(/conf=0\.5/);
  await expect.poll(() => asked((query) => query.min_confidence === "0.5")).toBe(true);
  await page.getByLabel("Function contains").fill("snRNA");
  await expect(page).toHaveURL(/term=snRNA/);
  await expect.poll(() => asked((query) => query.term === "snRNA")).toBe(true);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(() => asked((query) => query.offset === "50")).toBe(true);
  expect(await errors()).toEqual([]);
});

test("function atlas: pathways show the knock-downs that move a gene set, and the gene sets a knock-down moves", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/atlas?tab=pathways");
  await expect(page.getByTestId("atlas-pathways-explain")).toContainText("Meta z");
  await page.getByRole("combobox", { name: "Search a gene set" }).fill("cholesterol");
  await page.getByRole("option", { name: /^Cholesterol Homeostasis/ }).click();
  await expect(page).toHaveURL(/\/atlas\?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis$/);
  await expect(page.getByTestId("atlas-pathway").getByRole("heading", { level: 2, name: "Cholesterol Homeostasis" })).toBeVisible();
  const down = page.getByTestId("atlas-pathway-down");
  await expect(down.locator('a[href*="by=gene"][href*="pert=MBTPS1"]')).toBeVisible();
  await expect(down.locator('a[href*="/gene?symbol=MBTPS1"]')).toBeVisible();
  // SREBF2 is itself in the set
  await expect(down.getByTestId("member-mark")).toHaveCount(1);
  await expect(down.locator("tr", { hasText: "SREBF2" }).getByTestId("member-mark")).toBeVisible();
  await expect(page.getByTestId("atlas-pathway-up").locator('a[href*="pert=ATP6V1A"]')).toBeVisible();
  await expect(down.getByRole("button", { name: /Send the genes to/ })).toBeVisible();

  // the minimum number of contexts is part of the address and of the request
  await page.getByRole("button", { name: "Minimum contexts 3" }).click();
  await expect(page).toHaveURL(/contexts=3/);
  await expect.poll(() => api.atlasRequests.some((request) => request.path === "pathway" && request.query.min_contexts === "3")).toBe(true);

  // from a knock-down to the gene sets it moves, and back to a gene set
  await down.locator('a[href*="pert=SCAP"]').first().click();
  await expect(page).toHaveURL(/tab=pathways&by=gene&.*pert=SCAP/);
  const sets = page.getByTestId("atlas-perturbation-down");
  await expect(sets).toContainText("P26: Cholesterol Homeostasis");
  await expect(sets).toContainText("Programmes");
  await sets.getByRole("link", { name: "Cholesterol Homeostasis", exact: true }).click();
  await expect(page).toHaveURL(/\/atlas\?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis/);
  await expect(page).not.toHaveURL(/by=gene/);
  await expect(page.getByTestId("atlas-pathway-down")).toBeVisible();

  await page.goto("/atlas?tab=pathways&by=gene&pert=NOTAGENE1");
  await expect(page.getByRole("alert")).toContainText("is not a perturbed gene of the pathway atlas");
  expect(await errors()).toEqual([]);
});

test("gene page has a Function atlas block that opens the gene in the atlas", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/gene?symbol=ATF4");
  const block = page.getByTestId("gene-atlas");
  await expect(block.getByRole("heading", { level: 2, name: "Function atlas" })).toBeVisible();
  await expect(block.getByTestId("gene-atlas-pert")).toContainText("M48: Ribosomal Scanning And Start Codon Recognition");
  await expect(block.getByTestId("gene-atlas-genes")).toContainText("P9: PSAT1 / MTHFD2 / GARS1");
  await expect(block.getByTestId("gene-atlas-predictions").locator("tbody tr")).toHaveCount(5);
  await expect(block.getByTestId("gene-atlas-predictions")).toContainText("42%");
  expect(api.atlasRequests.some((request) => request.path === "gene/ATF4")).toBe(true);
  await block.getByRole("link", { name: "Open in the Function atlas" }).click();
  await expect(page).toHaveURL(/\/atlas\?gene=ATF4&module=48$/);
  await expect(page.getByTestId("atlas-gene-panel").getByRole("heading", { level: 3, name: "ATF4" })).toBeVisible();
  expect(await errors()).toEqual([]);
});

// ---------------------------------------------------------------------------
// Function atlas: gene list tab, highlights on the map, every export button
// and every "Send to" menu, narrow screens
// ---------------------------------------------------------------------------

const fs = require("fs");

const ATLAS_EXAMPLE_LIST =
  "INTS1,INTS2,INTS3,INTS4,INTS5,INTS6,INTS7,INTS8,INTS9,INTS10,INTS11,INTS12,INTS13,INTS14,INTS15,MED12,MED14,MED17,MED20,MED23,MED24,MED30," +
  "EXOSC2,EXOSC3,EXOSC4,EXOSC5,EXOSC6,EXOSC7,EXOSC8,EXOSC9,EXOSC10,DIS3";

const downloadFrom = async (page, button) => {
  const [file] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return file;
};

/**
 * Click CSV, TSV and Excel of one group of export buttons (the `index`-th
 * group inside `scope`) and check the three files. Returns the lines of the CSV.
 */
const expectTableExports = async (page, scope, name, index = 0) => {
  const button = (label) => scope.getByRole("button", { name: label, exact: true }).nth(index);
  const csv = await downloadFrom(page, button("CSV"));
  expect(csv.suggestedFilename()).toMatch(new RegExp(`^${name}-[\\d-]+\\.csv$`));
  const lines = fs.readFileSync(await csv.path(), "utf-8").replace(/^﻿/, "").trim().split(/\r?\n/);
  expect(lines.length).toBeGreaterThan(1);
  const tsv = await downloadFrom(page, button("TSV"));
  expect(tsv.suggestedFilename()).toMatch(new RegExp(`^${name}-[\\d-]+\\.tsv$`));
  const tsvLines = fs.readFileSync(await tsv.path(), "utf-8").trim().split(/\r?\n/);
  expect(tsvLines).toHaveLength(lines.length);
  const xlsx = await downloadFrom(page, button("Excel"));
  expect(xlsx.suggestedFilename()).toMatch(new RegExp(`^${name}-[\\d-]+\\.xlsx$`));
  // an .xlsx file is a zip archive
  expect(fs.readFileSync(await xlsx.path()).subarray(0, 2).toString()).toBe("PK");
  return lines;
};

/** Open a "Send to" menu and choose a module. */
const sendTo = async (page, button, target) => {
  await button.click();
  await page.getByRole("menuitem", { name: target }).click();
};

test("function atlas: the understudied genes and a gene list are highlighted on the map", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/atlas");
  await expect(page.getByTestId("atlas-map").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("atlas-map-legend")).toHaveCount(0);

  // the switch is in the address; the legend counts both kinds of understudied genes
  await page.getByLabel("Highlight understudied genes").check();
  await expect(page).toHaveURL(/\/atlas\?understudied=1$/);
  const legend = page.getByTestId("atlas-map-legend");
  await expect(legend.getByTestId("atlas-map-no-go")).toContainText("No GO term: 27 genes");
  await expect(legend.getByTestId("atlas-map-placeholder")).toContainText("Placeholder name (open reading frame, FAM, KIAA): 4 genes");
  await expect(legend).toContainText("The other genes are faded");

  // it stays on when a gene is chosen and on the other map
  await page.getByRole("combobox", { name: "Find a gene on the map" }).fill("ints1");
  await page.getByRole("option", { name: /^INTS15/ }).click();
  await expect(page).toHaveURL(/\/atlas\?gene=INTS15&understudied=1$/);
  await page.getByRole("link", { name: "Co-regulated genes" }).click();
  await expect(page).toHaveURL(/\/atlas\?axis=genes&gene=INTS15&understudied=1$/);
  await expect(legend.getByTestId("atlas-map-no-go")).toContainText("39 genes");
  await expect(legend.getByTestId("atlas-map-placeholder")).toContainText("2 genes");
  await page.getByLabel("Highlight understudied genes").uncheck();
  await expect(page).toHaveURL(/\/atlas\?axis=genes&gene=INTS15$/);
  await expect(legend).toHaveCount(0);

  // a gene list in the address: how many of its genes are on the map, and which are not
  await page.goto("/atlas?genes=INTS1,INTS2,INTS13,NOTAGENE1");
  await expect(page.getByTestId("atlas-map").locator("canvas")).toBeVisible();
  const list = page.getByTestId("atlas-map-list");
  await expect(list).toContainText("Your gene list: 3 of 4 genes on this map");
  await expect(list).toContainText("not on it: NOTAGENE1");
  await expect(page.getByTestId("atlas-map-no-go")).toHaveCount(0);
  // both highlights together
  await page.getByLabel("Highlight understudied genes").check();
  await expect(page).toHaveURL(/\/atlas\?understudied=1&genes=INTS1,INTS2,INTS13,NOTAGENE1$/);
  await expect(page.getByTestId("atlas-map-no-go")).toBeVisible();
  // the list opens as a heatmap, and can be removed
  await expect(list.getByRole("link", { name: "Heatmap of the list" })).toHaveAttribute("href", /\/atlas\?tab=list&genes=INTS1,INTS2,INTS13,NOTAGENE1$/);
  await list.getByRole("link", { name: "Remove the list" }).click();
  await expect(page).toHaveURL(/\/atlas\?understudied=1$/);
  await expect(page.getByTestId("atlas-map-list")).toHaveCount(0);
  expect(await errors()).toEqual([]);
});

test("function atlas: a gene list gives a clustered heatmap of its similarity", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  const similarity = () => api.atlasRequests.filter((request) => request.path === "similarity");
  await page.goto("/atlas");
  await page.getByRole("tab", { name: "Gene list" }).click();
  await expect(page).toHaveURL(/\/atlas\?tab=list$/);
  await expect(page.getByTestId("atlas-list-explain")).toContainText("Which genes of a list act together?");
  await expect(page.getByRole("button", { name: "Show the heatmap" })).toBeDisabled();

  // the example: the list is in the address and in the box, and is asked for with the knock-down evidence
  await page.getByRole("link", { name: "Integrator, Mediator and exosome" }).click();
  await expect(page).toHaveURL(new RegExp(`/atlas\\?tab=list&genes=${ATLAS_EXAMPLE_LIST}$`));
  await expect(page.getByLabel("Gene list")).toHaveValue(/^INTS1\nINTS2\nINTS3\n/);
  const result = page.getByTestId("atlas-similarity");
  await expect(result.getByRole("heading", { level: 2, name: "Knock-down similarity among 32 genes" })).toBeVisible();
  await expect(result.getByTestId("atlas-similarity-summary")).toContainText("32 of 32 genes shown.");
  await expect(result.getByTestId("atlas-similarity-missing")).toHaveCount(0);
  expect(similarity()[0].body).toMatchObject({ axis: "pert", genes: expect.arrayContaining(["INTS1", "DIS3"]) });
  expect(similarity()[0].body.genes).toHaveLength(32);

  // clustered in the browser: the complexes are blocks, and Integrator splits into its modules
  const heatmap = result.getByTestId("atlas-similarity-heatmap");
  await expect(heatmap.locator("canvas")).toBeVisible();
  const order = (await heatmap.getAttribute("data-genes")).split(",");
  expect(order).toHaveLength(32);
  const span = (genes) => {
    const positions = genes.map((gene) => order.indexOf(gene));
    return Math.max(...positions) - Math.min(...positions) + 1;
  };
  expect(span(["INTS10", "INTS13", "INTS14", "INTS15"])).toBe(4);
  expect(span(["EXOSC2", "EXOSC3", "EXOSC4", "EXOSC5", "EXOSC6", "EXOSC7", "EXOSC8", "EXOSC9"])).toBe(8);
  expect(span(["MED12", "MED23", "MED24"])).toBe(3);
  await expect(result.getByTestId("atlas-similarity-key")).toContainText("The strongest colour stands for a mean correlation of 0.70 or more");

  // a square says which pair it is, with r, the evidence score and the number of datasets
  const box = await heatmap.locator("canvas").first().boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.25);
  await page.mouse.move(box.x + box.width * 0.5 + 2, box.y + box.height * 0.25 + 2);
  await expect(heatmap).toContainText("Evidence score:");
  await expect(heatmap).toContainText("Datasets with both:");
  await expect(heatmap).toContainText("Mean correlation of the knock-downs:");

  // a typed list: genes the atlas does not have are named; the other evidence is in the address
  await page.getByLabel("Gene list").fill("ints1 INTS2, MED12;\nNOTAGENE1");
  await page.getByRole("button", { name: "Show the heatmap" }).click();
  await expect(page).toHaveURL(/\/atlas\?tab=list&genes=INTS1,INTS2,MED12,NOTAGENE1$/);
  await expect(result.getByTestId("atlas-similarity-summary")).toContainText("3 of 4 genes shown, 1 not in the atlas.");
  await expect(result.getByTestId("atlas-similarity-missing")).toContainText("Not among the knock-downs of the atlas: NOTAGENE1.");
  await page.getByRole("link", { name: "Co-regulation", exact: true }).click();
  await expect(page).toHaveURL(/\/atlas\?tab=list&axis=genes&genes=INTS1,INTS2,MED12,NOTAGENE1$/);
  await expect(result.getByRole("heading", { level: 2, name: "Co-regulation among 3 genes" })).toBeVisible();
  await expect(result.getByTestId("atlas-similarity-missing")).toContainText("Not among the measured genes of the atlas: NOTAGENE1.");
  expect(similarity().some((request) => request.body.axis === "genes" && request.body.genes.length === 4)).toBe(true);

  // "Show on the map" highlights the genes that were found, on the map of the same evidence
  await result.getByRole("link", { name: "Show on the map" }).click();
  await expect(page).toHaveURL(/\/atlas\?axis=genes&genes=[A-Z0-9]+,[A-Z0-9]+,[A-Z0-9]+$/);
  await expect(page.getByTestId("atlas-map-list")).toContainText("Your gene list: 0 of 3 genes on this map");

  // the message of the API is shown when the list cannot be used
  await page.goto("/atlas?tab=list&genes=NOTAGENE1,NOTAGENE2");
  await expect(page.getByTestId("atlas-similarity-error")).toContainText("Fewer than 2 of these genes are on this map");
  await page.goto("/atlas?tab=list&genes=INTS1");
  await expect(page.getByRole("button", { name: "Show the heatmap" })).toBeDisabled();
  await expect(page.locator("body")).toContainText("One gene is not enough");
  expect(api.unmocked.filter((request) => request.includes("/atlas"))).toEqual([]);
  expect(await errors()).toEqual([]);
});

test("function atlas: the heatmap of a gene list can be saved as a table and as a picture", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto(`/atlas?tab=list&genes=${ATLAS_EXAMPLE_LIST}`);
  const result = page.getByTestId("atlas-similarity");
  const heatmap = result.getByTestId("atlas-similarity-heatmap");
  await expect(heatmap.locator("canvas")).toBeVisible();
  const order = (await heatmap.getAttribute("data-genes")).split(",");

  // the matrix: one row and one column per gene, in the order of the picture, the diagonal empty
  const lines = await expectTableExports(page, result, "genesetr-atlas-similarity-knock-downs");
  expect(lines).toHaveLength(33);
  expect(lines[0]).toBe(`Gene,${order.join(",")}`);
  const first = lines[1].split(",");
  expect(first[0]).toBe(order[0]);
  expect(first[1]).toBe("");
  expect(Math.abs(Number(first[2]))).toBeLessThan(1);
  const ints8 = lines.find((line) => line.startsWith("INTS8,")).split(",");
  expect(Number(ints8[1 + order.indexOf("INTS2")])).toBeCloseTo(0.654, 3);

  // the picture
  const picture = page.getByTestId("atlas-similarity-picture");
  const png = await downloadFrom(page, picture.getByRole("button", { name: "PNG" }));
  expect(png.suggestedFilename()).toMatch(/^genesetr-atlas-similarity-knock-downs-[\d-]+\.png$/);
  expect(fs.readFileSync(await png.path()).subarray(1, 4).toString()).toBe("PNG");
  const svg = await downloadFrom(page, picture.getByRole("button", { name: "SVG" }));
  expect(svg.suggestedFilename()).toMatch(/^genesetr-atlas-similarity-knock-downs-[\d-]+\.svg$/);
  const svgText = fs.readFileSync(await svg.path(), "utf-8");
  expect(svgText).toMatch(/^<svg/);
  expect(svgText).toContain("EXOSC10");
  const pdf = await downloadFrom(page, picture.getByRole("button", { name: "PDF" }));
  expect(pdf.suggestedFilename()).toMatch(/^genesetr-atlas-similarity-knock-downs-[\d-]+\.pdf$/);
  expect(fs.readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe("%PDF-");

  // the other evidence gets its own file name
  await page.getByRole("link", { name: "Co-regulation", exact: true }).click();
  await expect(result.getByRole("heading", { level: 2, name: "Co-regulation among 32 genes" })).toBeVisible();
  const csv = await downloadFrom(page, result.getByRole("button", { name: "CSV", exact: true }));
  expect(csv.suggestedFilename()).toMatch(/^genesetr-atlas-similarity-co-regulation-[\d-]+\.csv$/);
  expect(await errors()).toEqual([]);
});

test("function atlas: every table export of the gene, module, prediction and pathway views downloads its file", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);

  // map tab: the gene panel (partners, predictions) and the module panel (gene sets, members, consequence)
  await page.goto("/atlas?gene=INTS15&module=47");
  const gene = page.getByTestId("atlas-gene-panel");
  await expect(gene.getByTestId("atlas-gene-partners")).toBeVisible();
  const partners = await expectTableExports(page, gene, "genesetr-atlas-partners-INTS15-pert", 0);
  expect(partners[0]).toBe("Partner,Evidence score,Mean correlation,Datasets,Promoter within 5 kb,Lowered by the knock-down");
  expect(partners).toHaveLength(16);
  expect(partners[1]).toMatch(/^INTS13,[\d.]+,[\d.]+,\d+,(yes|no),(yes|no)$/);
  const genePredictions = await expectTableExports(page, gene, "genesetr-atlas-predictions-INTS15", 1);
  expect(genePredictions[0]).toMatch(/^Gene,Full name,Predicted function,Library,Evidence,Confidence,/);
  expect(genePredictions.slice(1).every((line) => line.startsWith("INTS15,"))).toBe(true);

  const module = page.getByTestId("atlas-module-panel");
  await expect(module.getByTestId("atlas-module-terms")).toBeVisible();
  const terms = await expectTableExports(page, module, "genesetr-atlas-module-47-gene-sets", 0);
  expect(terms[0]).toBe("Library,Gene set,Overlap,Set size,q,Genes");
  expect(terms).toHaveLength(3);
  const members = await expectTableExports(page, module, "genesetr-atlas-module-47-members", 2);
  expect(members[0]).toBe("Gene,GO BP terms,Placeholder name");
  expect(members).toHaveLength(37);
  expect(members).toContain("INTS15,0,no");
  expect(members.filter((line) => line.endsWith(",yes"))).toEqual([expect.stringMatching(/^C11ORF68,/)]);
  const consequence = await expectTableExports(page, module, "genesetr-atlas-module-47-consequence", 3);
  expect(consequence[0]).toBe("Direction,Measured gene,Mean z,Share agreeing,Member of the module");
  expect(consequence).toHaveLength(26);
  expect(consequence.filter((line) => line.startsWith("up,"))).toHaveLength(10);

  // a co-regulation programme: its own file names and headings
  await page.goto("/atlas?tab=modules&axis=genes&module=26");
  await expect(module.getByTestId("atlas-module-terms")).toBeVisible();
  const programme = await expectTableExports(page, module, "genesetr-atlas-programme-26-consequence", 2);
  expect(programme[0]).toBe("Direction,Perturbed gene,Mean z,Share agreeing,Member of the module");

  // predicted functions: the rows of the page
  await page.goto("/atlas?tab=predictions");
  await expect(page.getByTestId("atlas-predictions")).toBeVisible();
  const predictions = await expectTableExports(page, page.locator("body"), "genesetr-atlas-predictions");
  expect(predictions).toHaveLength(21);
  expect(predictions[1]).toMatch(/^PSMG3,/);

  // pathways: one gene set (both directions together, and each table), and one perturbed gene
  await page.goto("/atlas?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis");
  const pathway = page.getByTestId("atlas-pathway");
  await expect(page.getByTestId("atlas-pathway-down").locator("tbody tr").first()).toBeVisible();
  const both = await expectTableExports(page, pathway, "genesetr-atlas-cholesterol-homeostasis-knock-downs", 0);
  expect(both[0]).toBe("Direction,Perturbed gene,Meta z,Datasets,Contexts,Member of the gene set");
  expect(both).toHaveLength(51);
  expect(both[1]).toMatch(/^lowers,MBTPS1,/);
  expect(both).toContainEqual(expect.stringMatching(/^lowers,SREBF2,.*,yes$/));
  const lowers = await expectTableExports(page, page.getByTestId("atlas-pathway-down"), "genesetr-atlas-cholesterol-homeostasis-knock-downs-that-lower-it");
  expect(lowers[0]).toBe("Perturbed gene,Meta z,Datasets,Contexts,Member of the gene set");
  expect(lowers).toHaveLength(26);
  const raises = await expectTableExports(page, page.getByTestId("atlas-pathway-up"), "genesetr-atlas-cholesterol-homeostasis-knock-downs-that-raise-it");
  expect(raises[1]).toMatch(/^ATP6V1A,/);

  await page.goto("/atlas?tab=pathways&by=gene&pert=SCAP");
  const sets = page.getByTestId("atlas-perturbation-pathways");
  await expect(page.getByTestId("atlas-perturbation-down").locator("tbody tr").first()).toBeVisible();
  const moved = await expectTableExports(page, sets, "genesetr-atlas-gene-sets-SCAP");
  expect(moved[0]).toBe("Direction,Gene set,Library,Set size,Meta z,Datasets,Contexts");
  expect(moved).toHaveLength(31);
  expect(moved[1]).toMatch(/^lowers,P26: Cholesterol Homeostasis,programs,66,/);
  expect(await errors()).toEqual([]);
});

test("function atlas: every Send to menu opens its genes in the chosen module", async ({ page, context }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  // gene panel: the gene and its partners become the perturbation list of an analysis page
  await page.goto("/atlas?gene=INTS15&module=47");
  const gene = page.getByTestId("atlas-gene-panel");
  await gene.getByRole("button", { name: /Send the genes to/ }).click();
  await expect(page.getByRole("menuitem", { name: "16 genes" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Correlation" }).click();
  await expect(page).toHaveURL(/\/correlation/);
  await expect(page.locator("textarea").first()).toHaveValue(/^INTS15\s+INTS13\s+INTS10\s+INTS14\s/);

  // module panel: the members go to the gene list tab of the atlas itself
  await page.goto("/atlas?gene=INTS15&module=47");
  const module = page.getByTestId("atlas-module-panel");
  await sendTo(page, module.getByRole("button", { name: "Send the genes to…" }), "Function atlas (similarity)");
  await expect(page).toHaveURL(/\/atlas\?tab=list&genes=INTS10,INTS14,INTS13,INTS15,SLC24A1,/);
  await expect(page.getByRole("tab", { name: "Gene list" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Gene list")).toHaveValue(/^INTS10\nINTS14\nINTS13\nINTS15\n/);
  await expect(page.getByTestId("atlas-similarity").getByRole("heading", { level: 2 })).toHaveText("Knock-down similarity among 4 genes");
  await expect(page.getByTestId("atlas-similarity-summary")).toContainText("4 of 36 genes shown, 32 not in the atlas.");
  expect(api.atlasRequests.find((request) => request.path === "similarity").body.genes).toHaveLength(36);

  // module panel: the genes that change go to the common effects of the integrated page
  await page.goto("/atlas?gene=INTS15&module=47");
  await sendTo(page, module.getByRole("button", { name: "Send these genes to…" }), "Common effects (integrated)");
  await expect(page).toHaveURL(/\/integrated\?mode=set&genes=GADD45GIP1,UFC1,RPS27,.*&run=1$/);
  await expect(page.getByLabel("Perturbed genes")).toHaveValue(/^GADD45GIP1\nUFC1\n/);

  // a programme: the perturbed genes that move it
  await page.goto("/atlas?tab=modules&axis=genes&module=26");
  await sendTo(page, module.getByRole("button", { name: "Send the perturbed genes to…" }), "TF regulators");
  await expect(page).toHaveURL(/\/tf-regulators\?up=[A-Z0-9]+,.*MBTPS1.*&run=1$/);

  // pathways: the genes of the set, and the knock-downs of each table
  await page.goto("/atlas?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis");
  await sendTo(page, page.getByRole("button", { name: "Send the genes of the set to…" }), "Integrated signature");
  await expect(page).toHaveURL(/\/integrated\?mode=signature&up=ABCA2,ACAT2,ACSS2,.*&run=1$/);
  await expect(page.getByLabel("Genes that go up")).toHaveValue(/^ABCA2\nACAT2\n/);

  await page.goto("/atlas?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis");
  const down = page.getByTestId("atlas-pathway-down");
  await down.getByRole("button", { name: /Send the genes to/ }).click();
  await expect(page.getByRole("menuitem", { name: "25 genes" })).toBeVisible();
  // a module for one gene takes the first of the list
  await page.getByRole("menuitem", { name: "Gene page (MBTPS1 only)" }).click();
  await expect(page).toHaveURL(/\/gene\?symbol=MBTPS1$/);

  await page.goto("/atlas?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis");
  await sendTo(page, page.getByTestId("atlas-pathway-up").getByRole("button", { name: /Send the genes to/ }), "Heatmap");
  await expect(page).toHaveURL(/\/heatmap/);
  await expect(page.locator("textarea").first()).toHaveValue(/^ATP6V1A\s+ATP6V1B2\s/);

  // gene list tab: the menu leaves out the tab itself; a list that is too short for a module is not sent; copy and save work
  await page.goto("/atlas?tab=list&genes=INTS10,INTS13,INTS14,INTS15");
  const result = page.getByTestId("atlas-similarity");
  const order = (await result.getByTestId("atlas-similarity-heatmap").getAttribute("data-genes")).split(",");
  const menu = result.getByRole("button", { name: /Send the genes to/ });
  await menu.click();
  await expect(page.getByRole("menuitem", { name: "4 genes" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Function atlas (similarity)" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "DR & Clustering (needs 10+)" })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("menuitem", { name: "Copy genes" }).click();
  await expect(page.locator("body")).toContainText("4 genes copied");
  // (the clipboard of Windows returns its own line ends)
  expect((await page.evaluate(() => navigator.clipboard.readText())).split(/\r?\n/)).toEqual(order);
  page.once("dialog", (dialog) => dialog.accept("Integrator tail module"));
  await sendTo(page, menu, "Save to my gene lists…");
  await expect(page.locator("body")).toContainText("Saved to your lists");
  await sendTo(page, menu, "Common effects (integrated)");
  await expect(page).toHaveURL(new RegExp(`/integrated\\?mode=set&genes=${order.join(",")}&run=1$`));
  expect(await errors()).toEqual([]);
});

test("function atlas: a gene list of another page can be sent to the atlas", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=set&genes=PSMA1,PSMB3,PSMD4,PSMC3,PSMA6,POMP&run=1");
  const card = page.getByTestId("integrated-set-up");
  await expect(card.locator("tbody tr").first()).toBeVisible();
  await sendTo(page, card.getByRole("button", { name: /Send the genes to/ }), "Function atlas (similarity)");
  await expect(page).toHaveURL(/\/atlas\?tab=list&genes=HSPA1A,UBC,HSPA1B,/);
  await expect(page.getByRole("heading", { level: 1, name: "Function atlas" })).toBeVisible();
  await expect(page.getByLabel("Gene list")).toHaveValue(/^HSPA1A\nUBC\nHSPA1B\n/);
  await expect.poll(() => api.atlasRequests.some((request) => request.path === "similarity" && request.body.genes.includes("HSPA1A"))).toBe(true);
  // none of these genes is in the fixture: the page shows what the API says
  await expect(page.getByTestId("atlas-similarity-error")).toContainText("Fewer than 2 of these genes are on this map");
  expect(await errors()).toEqual([]);
});

// Narrow screens: no tab may make the page scroll sideways; wide content scrolls inside its own frame.
const ATLAS_NARROW_PAGES = [
  { url: "/atlas?gene=INTS15&module=47&understudied=1&genes=INTS1,INTS2,INTS13,NOTAGENE1", ready: ["atlas-gene-partners", "atlas-module-members", "atlas-map-legend"] },
  { url: "/atlas?axis=genes&module=26", ready: ["atlas-module-members"] },
  { url: "/atlas?tab=modules&module=47", ready: ["atlas-modules", "atlas-module-members"] },
  { url: "/atlas?tab=predictions", ready: ["atlas-predictions", "atlas-calibration"] },
  { url: "/atlas?tab=pathways&lib=hallmark&set=Cholesterol%20Homeostasis", ready: ["atlas-pathway-down", "atlas-pathway-up"] },
  { url: "/atlas?tab=pathways&by=gene&pert=SCAP", ready: ["atlas-perturbation-down"] },
  { url: `/atlas?tab=list&genes=${ATLAS_EXAMPLE_LIST},NOTAGENE1`, ready: ["atlas-similarity-missing", "atlas-similarity-picture"] },
  { url: "/atlas?tab=list", ready: ["atlas-list-explain"] },
];

/**
 * Width of the page against the width of its content, and the elements that
 * stick out of the screen without being inside a frame that scrolls sideways.
 */
const sidewaysOverflow = () => {
  const width = document.documentElement.clientWidth;
  const scrolls = (node) => {
    const style = getComputedStyle(node);
    return /auto|scroll|hidden/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
  };
  let shell = document.querySelector("h1");
  while (shell && !/auto|scroll/.test(getComputedStyle(shell).overflowY)) shell = shell.parentElement;
  const inFrame = (node) => {
    for (let parent = node.parentElement; parent && parent !== shell && parent !== document.body; parent = parent.parentElement) {
      if (scrolls(parent)) return true;
    }
    return false;
  };
  const sticking = [];
  (shell || document.body).querySelectorAll("*").forEach((node) => {
    const box = node.getBoundingClientRect();
    if (box.width > 0 && box.height > 0 && box.right > width + 1 && !inFrame(node)) {
      sticking.push(`${node.tagName.toLowerCase()}.${String(node.className).slice(0, 40)} (right edge ${Math.round(box.right)})`);
    }
  });
  return {
    width,
    document: document.documentElement.scrollWidth,
    shell: shell ? shell.scrollWidth - shell.clientWidth : 0,
    sticking: sticking.slice(0, 8),
  };
};

for (const [width, height] of [
  [375, 812],
  [768, 1024],
]) {
  for (const theme of ["light", "dark"]) {
    test(`function atlas: no tab scrolls sideways at ${width} px (${theme} theme)`, async ({ page }) => {
      test.setTimeout(120000);
      await mockApi(page);
      const errors = watchErrors(page);
      await page.setViewportSize({ width, height });
      await page.addInitScript((value) => {
        try {
          window.localStorage.setItem("genesetr_theme", value);
        } catch (error) {
          // storage not available: the light theme is tested
        }
      }, theme);
      for (const entry of ATLAS_NARROW_PAGES) {
        await page.goto(entry.url);
        for (const id of entry.ready) await expect(page.getByTestId(id).first(), `${entry.url}: ${id}`).toBeVisible();
        if (theme === "dark") await expect(page.locator("html")).toHaveAttribute("data-gs-theme", "dark");
        const measured = await page.evaluate(sidewaysOverflow);
        expect(measured, entry.url).toMatchObject({ document: measured.width, shell: 0, sticking: [] });
        expect(measured.width, entry.url).toBeLessThanOrEqual(width);
        // the tabs stay on the screen
        for (const tab of await page.getByRole("tab").all()) {
          const box = await tab.boundingBox();
          expect(box.x + box.width, entry.url).toBeLessThanOrEqual(width);
        }
      }
      // a wide heatmap scrolls inside its own frame on a phone, and its buttons stay on the screen
      await page.goto(`/atlas?tab=list&genes=${ATLAS_EXAMPLE_LIST}`);
      const frame = page.getByTestId("atlas-similarity-heatmap");
      await expect(frame.locator("canvas")).toBeVisible();
      const sizes = await frame.evaluate((node) => [node.scrollWidth, node.clientWidth]);
      if (width === 375) expect(sizes[0]).toBeGreaterThan(sizes[1]);
      else expect(sizes[0]).toBe(sizes[1]);
      for (const name of ["PNG", "SVG", "PDF", "CSV", "TSV", "Excel", "Show the heatmap"]) {
        const box = await page.getByRole("button", { name, exact: true }).first().boundingBox();
        expect(box.x, name).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, name).toBeLessThanOrEqual(width);
      }
      expect(await errors()).toEqual([]);
    });
  }
}
