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

const OTHER_ROUTES = ["/", "/datasets", "/drug", "/project-signature", "/tf-regulators", "/integrated", "/upload-dataset", "/about"];

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
