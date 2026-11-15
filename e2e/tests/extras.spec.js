// What the pages show of the fields the API gained on 2026-11-15: q-values and
// counts at FDR 5 %, strength per dataset, one knock-down in one dataset,
// predicted effects, corrected complex recovery, module stability and context,
// the neighbour flag, and the significance of gene-signature scores.
const fs = require("fs");
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

/** The lines of the CSV file that a button downloads. */
const csvLines = async (page, button) => {
  const [file] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return fs.readFileSync(await file.path(), "utf-8").replace(/^﻿/, "").trim().split(/\r?\n/);
};

const headers = (table) => table.locator("thead th").allTextContents().then((cells) => cells.map((text) => text.trim()));

// ---------------------------------------------------------------------------
// Integrated analysis
// ---------------------------------------------------------------------------

test("integrated analysis: consensus tables have a q column and say how many effects pass FDR 5 %", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=gene&symbol=ATF4");
  await expect(page.getByTestId("integrated-explain")).toContainText("corrected for technical variation (15 of the 24 datasets");
  await expect(page.getByTestId("integrated-explain")).toContainText("can differ slightly from the per-dataset pages");
  await expect(page.getByTestId("integrated-fdr")).toContainText("686 of 15,283 genes at FDR 5 % when ATF4 is knocked down");

  const down = page.getByTestId("integrated-targets-down");
  expect(await headers(down.locator("table").first())).toEqual(["#", "Measured gene", "Meta z", "q", "Datasets", "Supporting", "Contexts"]);
  // a q of exactly 0 and a very small one are written readably
  await expect(down.locator("tbody tr", { hasText: "PHGDH" }).first().locator("td").nth(3)).toHaveText("2.3e-198");
  await expect(down.locator("tbody tr").first().locator("td").nth(3)).toHaveText("< 1e-300");
  // the q-value is in the exported table
  const lines = await csvLines(page, down.getByRole("button", { name: "CSV", exact: true }).first());
  expect(lines[0]).toBe("Table,Rank,Name,Meta z,q,Datasets,Supporting datasets,Supporting contexts,Contexts measured,By dataset");
  expect(lines.find((line) => line.includes(",PHGDH,"))).toContain(",2.32e-198,");

  // the regulators of the gene: the count is of perturbed genes
  await page.getByRole("tab", { name: "As a measured gene" }).click();
  await expect(page.getByTestId("integrated-fdr")).toContainText("772 of 18,635 perturbed genes at FDR 5 % change ATF4");
  const needed = page.getByTestId("integrated-regulators-down");
  expect(await headers(needed.locator("table").first())).toContain("q");
  await expect(needed.locator("tbody tr", { hasText: "CTR9" }).first().locator("td").nth(3)).toHaveText("1.4e-40");

  // the block of the gene page has the q-values and the counts as well
  await page.goto("/gene?symbol=ATF4");
  const block = page.getByTestId("gene-consensus");
  await expect(block.getByTestId("gene-consensus-fdr")).toContainText("686 of 15,283 genes at FDR 5 % when ATF4 is knocked down; 772 of 18,635 perturbed genes at FDR 5 % change ATF4");
  await expect(block).toContainText("corrected for technical variation");
  expect(await headers(block.locator("table").first())).toEqual(["Gene", "Meta z", "q", "Contexts"]);
  expect(await errors()).toEqual([]);
});

test("integrated analysis: the strength table counts the genes at FDR 5 % and marks datasets that do not express the gene", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=gene&symbol=ATF4");
  const strength = page.getByTestId("integrated-strength");
  expect(await headers(strength.locator("table").first())).toEqual([
    "Dataset",
    "Context",
    "Cells",
    "On-target z",
    "Strongly changed genes",
    "Genes at FDR 5 %",
    "Impact",
  ]);
  const k562 = strength.locator('tr[data-dataset="K562gwps"]');
  await expect(k562.locator("td").nth(4)).toHaveText("88 of 8,127");
  await expect(k562.locator("td").nth(5)).toHaveText("24");
  // ATF4 is expressed in every dataset that perturbs it
  await expect(strength.getByTestId("not-expressed")).toHaveCount(0);

  // GATA1 is an erythroid gene: perturbed in ten datasets, expressed in the two K562 screens
  await page.goto("/integrated?mode=gene&symbol=GATA1");
  await expect(strength.locator("tbody tr")).toHaveCount(11);
  await expect(strength.getByTestId("not-expressed")).toHaveCount(8);
  const hct116 = strength.locator('tr[data-dataset="HCT116gwps"]');
  await expect(hct116.getByTestId("not-expressed")).toHaveText("not measured here: little or no effect expected");
  await expect(hct116.getByTestId("not-expressed")).toHaveAttribute("title", /not among the measured genes of this dataset/);
  await expect(hct116.locator("td").nth(3)).toHaveText("–");
  await expect(strength.locator('tr[data-dataset="K562essential"]').getByTestId("not-expressed")).toHaveCount(0);
  await expect(strength.locator('tr[data-dataset="K562essential"]').locator("td").nth(5)).toHaveText("1876");

  const lines = await csvLines(page, strength.getByRole("button", { name: "CSV", exact: true }).first());
  expect(lines[0]).toBe(
    "Dataset id,Dataset,Context,Gene measured in the dataset,Cells,On-target z,Strongly changed genes,Genes at FDR 5 %,Genes measured,Impact"
  );
  expect(lines.find((line) => line.startsWith("HCT116gwps,"))).toMatch(/^HCT116gwps,HCT116 Whole Genome,HCT116,no,/);
  expect(lines.find((line) => line.startsWith("K562gwps,"))).toMatch(/^K562gwps,K562 Whole Genome,K562,yes,/);
  expect(await errors()).toEqual([]);
});

test("integrated analysis: a row of the strength table opens the genes that change in that dataset", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=gene&symbol=ATF4");
  const strength = page.getByTestId("integrated-strength");
  // nothing is asked for until a row is opened
  await expect(strength.locator("tbody tr").first()).toBeVisible();
  expect(api.integratedRequests.filter((entry) => entry.path.endsWith("/profile"))).toHaveLength(0);

  const open = strength.getByRole("button", { name: "Show the genes that change in K562 Whole Genome", exact: true });
  await open.click();
  const profile = strength.getByTestId("integrated-profile");
  await expect(profile).toContainText("24 of 8,127 measured genes change at FDR 5 % when ATF4 is perturbed in K562 Whole Genome: 15 up, 9 down.");
  expect(api.integratedRequests.find((entry) => entry.path.endsWith("/ATF4/profile")).query).toMatchObject({ dataset: "K562gwps" });

  // every gene is in the list of its own direction, strongest first, with its q-value
  const up = profile.getByTestId("integrated-profile-up");
  const down = profile.getByTestId("integrated-profile-down");
  await expect(up.locator("tbody tr")).toHaveCount(15);
  await expect(down.locator("tbody tr")).toHaveCount(9);
  await expect(up.locator("tbody tr").first()).toContainText("TPT1");
  await expect(up.locator("tbody tr").first().locator("td").nth(2)).toHaveText("1.2e-8");
  await expect(down.locator("tbody tr").first()).toContainText("ATF4");
  const upZ = await up.locator("tbody tr td:nth-child(2)").allTextContents();
  const downZ = await down.locator("tbody tr td:nth-child(2)").allTextContents();
  expect(upZ.every((text) => Number(text) > 0)).toBe(true);
  expect(downZ.every((text) => Number(text) < 0)).toBe(true);
  // a gene opens as a measured gene
  await expect(up.locator('a[href*="mode=gene&symbol=TPT1&view=measured"]')).toBeVisible();

  const lines = await csvLines(page, profile.getByRole("button", { name: "CSV", exact: true }));
  expect(lines[0]).toBe("Direction,Gene,z,q");
  expect(lines).toHaveLength(25);
  expect(lines[1]).toBe("up,TPT1,6.98,1.2e-8");

  // one row is open at a time; the open row closes again
  await strength.getByRole("button", { name: "Show the genes that change in HCT116 Whole Genome", exact: true }).click();
  await expect(profile).toHaveCount(0);
  await expect(strength.getByRole("alert")).toContainText("could not be read"); // no fixture for this dataset
  await strength.getByRole("button", { name: "Hide the genes that change in HCT116 Whole Genome", exact: true }).click();
  await expect(strength.getByRole("alert")).toHaveCount(0);
  expect(await errors()).toEqual([]);
});

test("integrated analysis: a predicted effect is offered where the held-out test passed, with its accuracy; the dataset is in the address", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/integrated?mode=gene&symbol=ATF4");
  const section = page.getByTestId("integrated-prediction");
  await expect(section.getByRole("heading", { level: 3 })).toContainText("Predicted effect where ATF4 was not perturbed");
  await expect(section.getByRole("heading", { level: 3 })).toContainText("prediction, not a measurement");

  // only datasets that did not perturb ATF4 can be chosen: three with reliable predictions, seven without
  const offered = section.getByTestId("integrated-prediction-datasets");
  await expect(offered.getByRole("link")).toHaveText(["HepG2Essential", "HipSciTargeted", "SC00037"]);
  const withheld = section.getByTestId("integrated-prediction-withheld");
  await expect(withheld).toContainText("No prediction is offered for 7 other datasets");
  await expect(withheld.getByRole("link")).toHaveCount(7);
  await expect(section.getByRole("link", { name: "K562 Whole Genome" })).toHaveCount(0);
  // nothing is predicted until a dataset is chosen
  await expect(section.getByTestId("integrated-prediction-result")).toHaveCount(0);
  expect(api.integratedRequests.filter((entry) => entry.path.endsWith("/prediction"))).toHaveLength(0);

  await offered.getByRole("link", { name: "HepG2Essential" }).click();
  await expect(page).toHaveURL(/\/integrated\?mode=gene&symbol=ATF4&predict=HepG2Essential$/);
  await expect(offered.getByRole("link", { name: "HepG2Essential" })).toHaveAttribute("aria-current", "true");
  await expect(section.getByTestId("integrated-prediction-accuracy")).toHaveText(
    "Predicted for HepG2Essential (HepG2). In a held-out test on 364 strong knock-downs of this dataset, 72 % of the 50 genes predicted to change most did change in that direction; the dataset's mean profile gets 30 %."
  );
  const result = section.getByTestId("integrated-prediction-result");
  await expect(result).toContainText("Based on the knock-down of ATF4 in 14 datasets and on 10 neighbours");
  await expect(result).toContainText("EIF3J, EIF4G1, DPH2");
  await expect(result).toContainText("Predicted z = 0.26 × mean z elsewhere + 0.41 × mean z of the neighbours here");
  const up = result.getByTestId("integrated-prediction-up");
  expect(await headers(up.locator("table"))).toEqual(["Predicted to go up", "Predicted z", "Mean z elsewhere", "Datasets", "Neighbours here"]);
  await expect(up.locator("tbody tr")).toHaveCount(20);
  expect(await up.locator("tbody tr").first().locator("td").allTextContents()).toEqual(["GAS5", "3.55", "3.45", "8", "6.41"]);
  const down = result.getByTestId("integrated-prediction-down");
  expect(await down.locator("tbody tr").first().locator("td").allTextContents()).toEqual(["PHGDH", "-3.09", "-8.11", "14", "-2.32"]);
  const lines = await csvLines(page, result.getByRole("button", { name: "CSV", exact: true }));
  expect(lines[0]).toBe("Direction,Gene,Predicted z,Mean z elsewhere,Datasets elsewhere,Mean z of the neighbours here");
  expect(lines).toHaveLength(41);

  // the controls keep the chosen dataset
  await page.getByRole("button", { name: "Rows 50" }).click();
  await expect(page).toHaveURL(/symbol=ATF4&predict=HepG2Essential&rows=50$/);
  await expect(section.getByTestId("integrated-prediction-accuracy")).toBeVisible();

  // a dataset whose predictions did not beat its mean profile: no prediction, the reason and the numbers
  await withheld.getByRole("link", { name: "SC00039" }).click();
  await expect(page).toHaveURL(/predict=SC00039/);
  const none = section.getByTestId("integrated-prediction-none");
  await expect(none).toContainText("No prediction is offered for SC00039.");
  await expect(none).toContainText("predictions for this dataset were not clearly better than its mean profile");
  await expect(none).toContainText("on 67 strong knock-downs of this dataset, 15 % of the 50 genes predicted to change most did change in that direction; the dataset's mean profile gets 9 %.");
  await expect(section.getByTestId("integrated-prediction-result")).toHaveCount(0);
  await expect(section.getByTestId("integrated-prediction-up")).toHaveCount(0);

  // an address that names a dataset with the knock-down: the measurement is what to look at
  await page.goto("/integrated?mode=gene&symbol=ATF4&predict=K562gwps");
  await expect(section.getByTestId("integrated-prediction-measured")).toContainText("ATF4 was perturbed in K562 Whole Genome, so nothing is predicted");
  await expect(section.getByTestId("integrated-prediction-result")).toHaveCount(0);

  // the benchmark of all datasets is folded away
  const benchmark = section.getByTestId("integrated-benchmark");
  await expect(benchmark.locator("table")).toBeHidden();
  await benchmark.locator("summary").click();
  await expect(benchmark.locator("tbody tr")).toHaveCount(20);
  expect(await benchmark.locator('tr[data-dataset="HepG2Essential"] td').allTextContents()).toEqual([
    "HepG2Essential",
    "HepG2",
    "364",
    "0.49",
    "0.15",
    "72 %",
    "30 %",
    "offered",
  ]);
  await expect(benchmark.locator('tr[data-dataset="HCT116gwps"] td').last()).toHaveText("not offered");
  await expect(benchmark.locator("tbody tr", { hasText: /^.*not offered$/ })).toHaveCount(11);
  await expect(benchmark).toContainText("Not tested, so no predictions: KOLFMetabolic, SC00001, sc00017, SC00063.");

  // as a measured gene there is no prediction, and the dataset leaves the address
  await page.getByRole("tab", { name: "As a measured gene" }).click();
  await expect(page).toHaveURL(/symbol=ATF4&view=measured$/);
  await expect(section).toHaveCount(0);
  expect(api.unmocked.filter((request) => request.includes("/integrated"))).toEqual([]);
  expect(await errors()).toEqual([]);
});

// ---------------------------------------------------------------------------
// Dataset catalogue
// ---------------------------------------------------------------------------

test("dataset catalogue: complex recovery is given before and after the correction where a dataset has one", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/datasets");
  const card = (name) => page.locator("article", { has: page.getByRole("heading", { level: 2, name, exact: true }) });

  const k562 = card("K562 Whole Genome").getByTestId("complex-recovery");
  await expect(k562).toContainText("AUROC 0.69 · 55% of the top 1,000 pairs (baseline 0.7%)");
  await expect(k562.getByTestId("complex-recovery-corrected")).toHaveText(
    "After correction for technical variation: AUROC 0.68 · 68% of the top 1,000 pairs"
  );
  // the tooltip says what the two lines are, and how many pairs the percentage is of
  await expect(k562).toHaveAttribute("title", /same CORUM complex/);
  await expect(k562).toHaveAttribute("title", /top 1,000, or the top 5 % in a small screen/);
  await expect(k562).toHaveAttribute("title", /First line: the profiles as stored\. Second line: the same score after removal of technical variation/);
  await expect(card("HCT116 Whole Genome").getByTestId("complex-recovery-corrected")).toContainText("AUROC 0.63 · 47% of the top 1,000 pairs");

  // the TF Atlas has no correction: one line, and a tooltip without the second half
  const atlas = card("TF Atlas (TF overexpression, hESC)").getByTestId("complex-recovery");
  await expect(atlas).toContainText("AUROC 0.50 · 3.0% of the top 1,000 pairs (baseline 1.9%)");
  await expect(atlas.getByTestId("complex-recovery-corrected")).toHaveCount(0);
  await expect(atlas).not.toHaveAttribute("title", /Second line/);
  expect(await errors()).toEqual([]);
});

// ---------------------------------------------------------------------------
// Function atlas
// ---------------------------------------------------------------------------

test("function atlas: modules say how stable they are, and which cell context they are specific to", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);

  // the list of modules
  await page.goto("/atlas?tab=modules");
  const list = page.getByTestId("atlas-modules");
  await expect(list.getByTestId("module-stability")).toHaveCount(6);
  await expect(list.locator("li", { hasText: "M47: INTS10 / INTS14 / INTS13" }).getByTestId("module-stability")).toHaveText("stable (0.96)");
  await expect(list.locator("li", { hasText: "M66: metallo-sulfur cluster assembly" }).getByTestId("module-stability")).toHaveText("stable (0.52)");
  await expect(list.getByTestId("module-stability").first()).toHaveAttribute("title", /found again when the map is divided with other settings/);
  await expect(page.locator("body")).toContainText("Stability says how well a module is found again");

  // a module of T-cell receptor signalling: stable, and its genes act in CD4 T cells only
  await page.goto("/atlas?tab=modules&module=24");
  const panel = page.getByTestId("atlas-module-panel");
  await expect(panel.getByRole("heading", { level: 3, name: "M24: Adaptive Immune System" })).toBeVisible();
  await expect(panel.getByTestId("atlas-module-stability")).toHaveText("stable (0.96)");
  await expect(panel.getByTestId("atlas-module-specific")).toHaveText("specific to CD4 T");
  const contexts = panel.getByTestId("atlas-module-contexts");
  expect(await headers(contexts)).toEqual(["Cell context", "Members perturbed", "With a clear effect"]);
  await expect(contexts.locator("tbody tr")).toHaveCount(11);
  // contexts that perturbed most of the members come first; CD4 T is marked
  expect(await contexts.locator("tbody tr").first().locator("td").allTextContents()).toEqual(["CD4 Tspecific", "100%", "92%"]);
  expect(await contexts.locator("tbody tr").nth(1).locator("td").allTextContents()).toEqual(["K562", "94%", "5%"]);
  await expect(contexts.locator('tbody tr[data-specific="true"]')).toHaveCount(1);
  expect(await contexts.locator("tbody tr").last().locator("td").first().textContent()).not.toBe("CD4 T");
  const lines = await csvLines(page, panel.getByRole("button", { name: "CSV", exact: true }).nth(1));
  expect(lines[0]).toBe("Cell context,Share of the members perturbed,Share of those with a clear effect");
  expect(lines[1]).toBe("CD4 T,1,0.92");

  // a module whose borders depend on the settings; no context badge
  await page.goto("/atlas?tab=modules&module=43");
  await expect(panel.getByRole("heading", { level: 3, name: "M43: SFSWAP / PAXBP1 / ARGLU1" })).toBeVisible();
  await expect(panel.getByTestId("atlas-module-stability")).toHaveText("depends on the settings (0.32)");
  await expect(panel.getByTestId("atlas-module-specific")).toHaveCount(0);
  await expect(panel.getByTestId("atlas-module-contexts").locator("tbody tr").first()).toContainText("K562");

  // a programme of co-regulated genes has a stability and no cell contexts
  await page.goto("/atlas?tab=modules&axis=genes&module=26");
  await expect(panel.getByRole("heading", { level: 3, name: "P26: Cholesterol Homeostasis" })).toBeVisible();
  await expect(panel.getByTestId("atlas-module-stability")).toHaveText("stable (0.98)");
  await expect(panel.getByTestId("atlas-module-contexts")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("specific to a cell context");

  // the list beside the map carries the stability in the tooltip of a module
  await page.goto("/atlas");
  await expect(page.getByTestId("atlas-module-list").getByRole("link", { name: /M47/ })).toHaveAttribute(
    "title",
    "M47: INTS10 / INTS14 / INTS13 (36 genes); stable (0.96)"
  );
  expect(await errors()).toEqual([]);
});

test("function atlas: a neighbour is a partner whose promoter lies within 5 kb", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/atlas?gene=KIAA0586");
  const panel = page.getByTestId("atlas-gene-panel");
  // the flag is read from `neighbour` (the fixtures no longer carry `sameBand`)
  const mark = panel.getByTestId("atlas-gene-partners").locator("tr", { hasText: "TIMM9" }).getByTestId("neighbour-mark");
  await expect(mark).toHaveAttribute("title", /promoters of the two genes lie within 5 kb of each other: CRISPRi may silence both/);
  await expect(panel.getByTestId("atlas-gene-partners").getByTestId("neighbour-mark")).toHaveCount(1);
  await expect(panel.getByTestId("atlas-gene-hidden")).toHaveText("13 predictions hidden: they rest on a partner whose promoter lies within 5 kb.");
  await expect(page.locator("body")).not.toContainText(/chromosome band/i);

  await panel.getByLabel("Include possible neighbour effects").check();
  await expect(panel.getByTestId("atlas-gene-predictions").getByTestId("neighbour-mark").first()).toHaveAttribute(
    "title",
    /Rests on TIMM9, whose promoter lies within 5 kb of this gene's/
  );
  const lines = await csvLines(page, panel.getByRole("button", { name: "CSV", exact: true }).first());
  expect(lines[0]).toBe("Partner,Evidence score,Mean correlation,Datasets,Promoter within 5 kb");
  expect(lines.find((line) => line.startsWith("TIMM9,"))).toMatch(/,yes$/);
  expect(lines.filter((line) => line.endsWith(",yes"))).toHaveLength(1);

  await page.goto("/atlas?tab=predictions");
  await expect(page.getByTestId("atlas-predictions-explain")).toContainText("rest on a partner whose promoter lies within 5 kb of the gene's are hidden");
  await expect(page.locator("body")).not.toContainText(/chromosome band/i);
  expect(await errors()).toEqual([]);
});

// ---------------------------------------------------------------------------
// Gene signature
// ---------------------------------------------------------------------------

test("gene signature: the table has the z against random gene sets and its q-value, explained in a sentence", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/genesignature");
  const run = page.locator('[data-tour="run"] button').first();
  await expect(run).toBeVisible();
  await page.waitForTimeout(800);
  const dataset = page.getByText("K562 Whole Genome", { exact: true }).first();
  if ((await dataset.count()) > 0 && (await run.isDisabled())) await dataset.click();
  // as in modules.spec.js: the visible example button fills the signature
  const examples = page.locator('[data-tour="example"]');
  for (let i = 0; i < (await examples.count()); i++) {
    if (!(await examples.nth(i).isVisible())) continue;
    await examples.nth(i).click({ timeout: 4000 }).catch(() => {});
    const item = page.getByRole("menuitem").first();
    if (await item.isVisible().catch(() => false)) await item.click();
  }
  await run.click();
  await expect.poll(() => api.taskRequests).toContain("calcGeneSignature");
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByText("Table", { exact: true }).first().click();
  await expect(page.getByTestId("signature-significance-note")).toContainText(
    "“z vs random sets” measures the score of a perturbation against random gene sets of the same size (22 genes) taken from that perturbation's own profile"
  );
  await expect(page.getByTestId("signature-significance-note")).toContainText("q is its false discovery rate over all perturbations");
  const table = page.locator("table").first();
  const names = await headers(table);
  expect(names.filter((name) => /^(Gene|Effect|Score|Z-Score|z vs random sets|q)/.test(name)).map((name) => name.replace(/\s*\d.*$/, ""))).toEqual([
    "Gene",
    "Effect",
    "Score",
    "Z-Score",
    "z vs random sets",
    "q",
  ]);
  // the perturbation with the highest score: HSPA5 (a gene of the signature), far beyond any random gene set
  const first = table.locator("tbody tr").first();
  await expect(first).toContainText("HSPA5");
  const cells = (await first.locator("td").allTextContents()).map((text) => text.trim());
  expect(cells).toContain("30.42");
  expect(cells).toContain("1.7e-199");

  // both columns are in the exported table
  const lines = await csvLines(page, page.getByRole("button", { name: "CSV", exact: true }).first());
  expect(lines[0]).toBe("Gene,Effect,Score,Z-Score,z vs random sets,q");
  expect(lines.find((line) => line.startsWith("HSPA5,"))).toMatch(/^HSPA5,UP,15\.162,[\d.]+,30\.42,1\.66e-199$/);
  expect(lines.length).toBeGreaterThan(9000);

  // two datasets: the multi-dataset table has the z of each dataset as the tooltip of its score,
  // and `significance` is not taken for a dataset (the mock answers every dataset with the same result)
  for (const name of ["K562 Whole Genome", "HCT116 Whole Genome"]) {
    const box = page.getByRole("checkbox", { name, exact: true });
    if (!(await box.isChecked())) await box.check();
  }
  await run.click();
  await expect(page.getByTestId("signature-significance-note-multi")).toContainText("Hover a score for the z in that dataset.");
  const multi = page.locator("table").first();
  const multiFirst = multi.locator("tbody tr").first();
  await expect(multiFirst).toContainText("HSPA5");
  await expect(multiFirst.locator("td span[title]")).toHaveCount(2);
  await expect(multiFirst.locator("td span[title]").first()).toHaveText("15.162");
  await expect(multiFirst.locator("td span[title]").first()).toHaveAttribute("title", "z against random gene sets: 30.42");
  const multiHeaders = (await headers(multi)).join(" | ");
  expect(multiHeaders).toContain("K562");
  expect(multiHeaders).toContain("HCT116");
  expect(multiHeaders).not.toMatch(/significance/i);
  await expect(multiFirst.locator("td").last()).toHaveText("2"); // two datasets, not three
  expect(await errors()).toEqual([]);
});
