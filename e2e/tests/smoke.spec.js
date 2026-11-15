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

const OTHER_ROUTES = ["/", "/datasets", "/drug", "/project-signature", "/tf-regulators", "/integrated", "/atlas", "/upload-dataset", "/about"];

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
  await expect(page.getByTestId("integrated-pathways")).toContainText("E2F Targets");
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
  await expect(module.getByTestId("atlas-module-up")).toContainText("GTF3C6");
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
  // TIMM9 is in the same chromosome band
  const partners = panel.getByTestId("atlas-gene-partners");
  await expect(partners.getByTestId("neighbour-mark")).toHaveCount(1);
  await expect(partners.locator("tr", { hasText: "TIMM9" }).getByTestId("neighbour-mark")).toBeVisible();
  await expect(panel.getByTestId("atlas-gene-hidden")).toContainText("13 predictions hidden");
  await expect(panel.getByTestId("atlas-gene-predictions").getByTestId("neighbour-mark")).toHaveCount(0);

  await panel.getByLabel("Include possible neighbour effects").check();
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
  await expect(panel.getByTestId("atlas-module-up").getByTestId("member-mark")).toHaveCount(7);
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

  await page.getByLabel("Include possible neighbour effects").check();
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
