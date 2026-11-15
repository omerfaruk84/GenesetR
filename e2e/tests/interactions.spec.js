// Genetic interactions page (/interactions) and its block on the gene page, on real API
// answers (fixtures/interactions_*.json, fixtures/gene_CBL.json).
const { test, expect } = require("@playwright/test");
const { mockApi, watchErrors } = require("./mockApi");
const { returningVisitor, useTheme, downloadFrom, expectTableExports, expectNoSidewaysScroll } = require("./pageChecks");

test.beforeEach(async ({ page }) => {
  await returningVisitor(page);
});

const rows = (page) => page.getByTestId("interaction-pairs").locator("tbody tr");

test("overview: lead, class legend with counts, chart and sortable table", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/interactions");
  await expect(page.getByRole("heading", { name: "Genetic interactions", level: 1 })).toBeVisible();
  const lead = page.getByTestId("interactions-lead");
  await expect(lead).toContainText("what the pair does beyond that sum");
  await expect(lead).toContainText("131 pairs of 105 genes in K562 cells");
  await expect(lead).toContainText("These are activation experiments: the genes are switched on, not knocked down.");

  const legend = page.getByTestId("interaction-classes");
  await expect(legend.getByRole("link", { name: /^All 131$/ })).toHaveAttribute("aria-current", "true");
  for (const [id, text] of [
    ["synergistic", "More than additive 9"],
    ["additive", "Additive 91"],
    ["buffering", "Less than additive 17"],
    ["redundant", "Redundant 5"],
    ["epistatic", "One gene dominates 4"],
    ["neomorphic", "New effect 2"],
    ["weak", "Little effect 3"],
  ]) {
    await expect(page.getByTestId(`interaction-class-${id}`)).toHaveText(text);
  }
  await expect(page.getByTestId("interaction-overview").locator("canvas").first()).toBeVisible();
  await expect(page.getByTestId("interaction-count")).toHaveText("131 pairs");
  await expect(rows(page)).toHaveCount(131);

  // sorted by the number of genes off the sum, most first; a click on a column name sorts by it
  const table = page.getByTestId("interaction-pairs");
  await expect(table.getByRole("columnheader", { name: /Off the sum/ })).toHaveAttribute("aria-sort", "descending");
  await expect(rows(page).first()).toContainText("SET + CEBPE");
  await table.getByRole("button", { name: "Magnitude" }).click();
  await expect(table.getByRole("columnheader", { name: /Magnitude/ })).toHaveAttribute("aria-sort", "descending");
  await expect(rows(page).first()).toContainText("More than additive");
  await table.getByRole("button", { name: "Magnitude" }).click();
  await expect(table.getByRole("columnheader", { name: /Magnitude/ })).toHaveAttribute("aria-sort", "ascending");
  await expect(rows(page).first()).toContainText("Less than additive");
  await table.getByRole("button", { name: "Pair" }).click();
  await expect(rows(page).first()).toContainText("AHR + FEV");

  // no pair is open yet: examples, and the explanation of the numbers and classes
  await expect(page.getByTestId("interaction-examples").getByRole("link", { name: "CBL + CNN1" })).toBeVisible();
  const how = page.getByTestId("interactions-how");
  await expect(how).toContainText("Magnitude");
  await expect(how).toContainText("at least 1.3 times as large as the sum");
  await expect(how).toContainText("its weight is at least three times the other");
  expect(api.unmocked.filter((request) => request.includes("/interactions"))).toEqual([]);
  expect(await errors()).toEqual([]);
});

test("class filter and gene search are in the address and narrow the table", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/interactions");
  await page.getByTestId("interaction-class-synergistic").click();
  await expect(page).toHaveURL(/\/interactions\?class=synergistic$/);
  await expect(page.getByTestId("interaction-class-synergistic")).toHaveAttribute("aria-current", "true");
  await expect(rows(page)).toHaveCount(9);
  await expect(page.getByTestId("interaction-count")).toHaveText("9 of 131 pairs");
  for (const row of await rows(page).all()) await expect(row).toContainText("More than additive");

  // the search counts the classes among the matching pairs
  await page.getByRole("searchbox", { name: "Search a gene among the pairs" }).fill("cbl");
  await expect(page).toHaveURL(/class=synergistic&q=CBL$/);
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByTestId("interaction-class-additive")).toHaveText("Additive 3");
  await expect(page.getByTestId("interaction-classes").getByRole("link", { name: /^All 6$/ })).toBeVisible();
  // a second click on the class clears the filter; the search stays
  await page.getByTestId("interaction-class-synergistic").click();
  await expect(page).toHaveURL(/\/interactions\?q=CBL$/);
  await expect(rows(page)).toHaveCount(6);

  await page.getByRole("searchbox", { name: "Search a gene among the pairs" }).fill("notagene");
  await expect(page.getByTestId("interaction-none")).toContainText("No pair matches.");
  await page.getByRole("link", { name: "Show all pairs" }).click();
  await expect(rows(page)).toHaveCount(131);

  // by address
  await page.goto("/interactions?class=epistatic&q=DUSP9");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("DUSP9 + ETS2");
  await expect(page.getByRole("searchbox", { name: "Search a gene among the pairs" })).toHaveValue("DUSP9");
  expect(await errors()).toEqual([]);
});

test("a pair by address: reading, numbers, plot and both gene lists", async ({ page }) => {
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/interactions?a=CBL&b=CNN1");
  const pair = page.getByTestId("interaction-pair");
  await expect(pair.getByRole("heading", { name: "CBL + CNN1" })).toBeVisible();
  await expect(pair).toContainText("More than additive");
  await expect(page.getByTestId("interaction-reading")).toHaveText(
    "Switching on CBL and CNN1 together does more than the two genes add up to: the response of the pair is 1.45 times the sum of the two single responses (45% larger than the sum). " +
      "113 genes deviate from the sum at a false discovery rate of 5 %: 85 respond more strongly than the sum predicts, 28 less strongly."
  );
  const facts = page.getByTestId("interaction-facts");
  await expect(facts).toContainText("CBL 0.82 · CNN1 1.44");
  await expect(facts).toContainText("0.73 (plain sum: 0.69)");
  await expect(facts).toContainText("CBL 522 · CNN1 624 · pair 279");
  await expect(page.getByTestId("interaction-pair-chart").locator("canvas").first()).toBeVisible();
  // the row of the pair is marked in the table, and the explanation sits next to the numbers
  await expect(page.getByTestId("interaction-pairs").locator('tr[aria-selected="true"]')).toContainText("CBL + CNN1");
  await expect(pair.getByTestId("interactions-how")).toBeVisible();

  const above = page.getByTestId("interaction-above");
  await expect(above.getByRole("heading", { name: "Higher than the sum" })).toBeVisible();
  await expect(above).toContainText("72 genes");
  await expect(above.locator("tbody tr")).toHaveCount(25);
  const first = above.locator("tbody tr").first();
  await expect(first).toContainText("SLC25A37");
  await expect(first).toContainText("Stronger than the sum");
  await expect(first).toContainText("71.7"); // interaction z
  await expect(first).toContainText("< 1e-300"); // q
  await expect(above.getByRole("link", { name: "SLC25A37" })).toHaveAttribute("href", "/gene?symbol=SLC25A37");
  await above.getByRole("button", { name: "Show all 72" }).click();
  await expect(above.locator("tbody tr")).toHaveCount(72);

  const below = page.getByTestId("interaction-below");
  await expect(below.getByRole("heading", { name: "Lower than the sum" })).toBeVisible();
  await expect(below).toContainText("41 genes");
  await expect(below.locator("tbody tr").first()).toContainText("CD99");
  await expect(below.locator("tbody tr").first()).toContainText("Weaker than the sum");

  // the other pairs of a gene, from the heading
  await pair.getByRole("link", { name: "All pairs of CNN1" }).click();
  await expect(page).toHaveURL(/\/interactions\?q=CNN1$/);
  await expect(page.getByTestId("interaction-examples")).toBeVisible();
  expect(api.unmocked.filter((request) => request.includes("/interactions"))).toEqual([]);
  expect(await errors()).toEqual([]);
});

test("each class is read in its own words", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  // one gene dominates (real answer); the pair is found in either order
  await page.goto("/interactions?a=ETS2&b=DUSP9");
  await expect(page.getByTestId("interaction-pair").getByRole("heading", { name: "DUSP9 + ETS2" })).toBeVisible();
  await expect(page.getByTestId("interaction-reading")).toContainText(
    "DUSP9 dominates: the pair looks like DUSP9 alone (weights 0.80 for DUSP9 and 0.25 for ETS2), and its response is 0.76 times the sum of the two single responses (24% smaller than the sum)."
  );
  await expect(page.getByTestId("interaction-reading")).toContainText("210 genes deviate from the sum");
  // the switched-on genes themselves do not stretch the plot
  await expect(page.getByTestId("interaction-outside")).toContainText("DUSP9 (sum");
  for (const [address, text] of [
    ["a=DUSP9&b=MAPK1", "does less than the two genes add up to: the response of the pair is 0.59 times the sum of the two single responses (41% smaller than the sum)"],
    ["a=PLK4&b=STIL", "do something that neither does alone: the two single responses explain only 40% of the response of the pair"],
    ["a=CEBPE&b=CEBPA", "CEBPE and CEBPA do much the same alone (similarity 0.72), and together they add little"],
    ["a=AHR&b=FEV", "The effects of AHR and FEV add up"],
  ]) {
    await page.goto(`/interactions?${address}`);
    await expect(page.getByTestId("interaction-reading"), address).toContainText(text);
  }
  expect(await errors()).toEqual([]);
});

test("a click on a row and on a point of the chart opens the pair", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/interactions?class=neomorphic");
  await expect(rows(page)).toHaveCount(2);
  await rows(page).filter({ hasText: "PLK4 + STIL" }).click();
  await expect(page).toHaveURL(/class=neomorphic&a=PLK4&b=STIL$/);
  await expect(page.getByTestId("interaction-pair").getByRole("heading", { name: "PLK4 + STIL" })).toBeVisible();

  await page.goto("/interactions");
  const canvas = page.getByTestId("interaction-overview").locator("canvas").first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const box = await canvas.boundingBox();
  // the chart shows a hand over a point: look for one on a grid
  let found = false;
  for (let y = box.y + 60; y < box.y + box.height - 60 && !found; y += 7) {
    for (let x = box.x + 70; x < box.x + box.width - 30 && !found; x += 7) {
      await page.mouse.move(x, y);
      found = await page.evaluate(([px, py]) => getComputedStyle(document.elementFromPoint(px, py)).cursor === "pointer", [x, y]);
      if (found) await page.mouse.click(x, y);
    }
  }
  expect(found).toBe(true);
  await expect(page).toHaveURL(/\/interactions\?a=[A-Z0-9.-]+&b=[A-Z0-9.-]+$/);
  const address = new URL(page.url()).searchParams;
  await expect(page.getByTestId("interaction-pair").getByRole("heading", { level: 2 })).toHaveText(`${address.get("a")} + ${address.get("b")}`);
  await expect(page.getByTestId("interaction-reading")).toContainText(address.get("a"));
  expect(await errors()).toEqual([]);
});

test("a pair that was not measured, and a dataset that does not exist", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/interactions?a=CBL&b=ATF4");
  await expect(page.getByTestId("interaction-pair-missing")).toContainText("The pair CBL + ATF4 was not measured in this dataset.");
  await page.getByRole("link", { name: "Pairs of CBL" }).click();
  await expect(page).toHaveURL(/\/interactions\?q=CBL$/);
  await expect(rows(page)).toHaveCount(6);

  await page.goto("/interactions?dataset=Nope");
  await expect(page.getByTestId("interactions-unavailable")).toContainText("There is no dataset “Nope” with gene pairs.");
  await page.getByRole("link", { name: "Show the first dataset" }).click();
  await expect(rows(page)).toHaveCount(131);
  expect(await errors()).toEqual([]);
});

test("exports of the table of pairs, of both gene lists and of the plots", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/interactions?class=buffering&a=CBL&b=CNN1");
  await expect(page.getByTestId("interaction-above")).toBeVisible();
  // the table as filtered: 17 pairs and the header
  const pairs = await expectTableExports(page, page.getByTestId("interaction-pairs-card"), "genesetr-interactions-NormanK562a-buffering");
  expect(pairs).toHaveLength(18);
  expect(pairs[0]).toContain("Pair,Gene A,Gene B,Class,Weight of gene A,Weight of gene B,Fit");
  expect(pairs[1]).toContain("Less than additive");

  const above = await expectTableExports(page, page.getByTestId("interaction-above"), "genesetr-interaction-cbl-cnn1-higher-than-the-sum");
  expect(above).toHaveLength(73);
  expect(above[0]).toBe('Gene,Compared with the sum,"z, CBL alone","z, CNN1 alone","z, pair","Change, CBL alone","Change, CNN1 alone",Sum of the two,"Change, pair",Interaction z,q');
  expect(above[1]).toMatch(/^SLC25A37,Stronger than the sum,15\.8,95\.3,204\.4,/);
  const below = await expectTableExports(page, page.getByTestId("interaction-below"), "genesetr-interaction-cbl-cnn1-lower-than-the-sum");
  expect(below).toHaveLength(42);

  // both plots as PNG and SVG
  for (const [testId, name] of [
    ["interaction-overview", "genesetr-genetic-interactions"],
    ["interaction-pair-chart", "genesetr-interaction-CBL-CNN1"],
  ]) {
    const canvas = page.getByTestId(testId).locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    // the two toolbox icons sit in the top right corner of the chart: the chart shows a hand over them
    const icons = [];
    let run = null;
    for (let x = box.x + box.width - 70; x < box.x + box.width; x += 2) {
      await page.mouse.move(x, box.y + 12);
      const over = await page.evaluate(([px, py]) => getComputedStyle(document.elementFromPoint(px, py)).cursor === "pointer", [x, box.y + 12]);
      if (over && !run) icons.push((run = { from: x, to: x }));
      else if (over) run.to = x;
      else run = null;
    }
    expect(icons, testId).toHaveLength(2);
    const [pngIcon, svgIcon] = icons.map((icon) => (icon.from + icon.to) / 2);
    const png = await downloadFrom(page, { click: () => page.mouse.click(pngIcon, box.y + 12) });
    expect(png.suggestedFilename(), testId).toMatch(new RegExp(`^${name}.*\\.png$`));
    const svg = await downloadFrom(page, { click: () => page.mouse.click(svgIcon, box.y + 12) });
    expect(svg.suggestedFilename(), testId).toMatch(new RegExp(`^${name}-[\\d-]+\\.svg$`));
  }
  expect(await errors()).toEqual([]);
});

test("Send to and enrichment of a gene list", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const api = await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/interactions?a=CBL&b=CNN1");
  const above = page.getByTestId("interaction-above");
  await above.getByRole("button", { name: "Send the genes to…" }).click();
  await expect(page.getByRole("menuitem", { name: "72 genes" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Copy genes" }).click();
  const copied = (await page.evaluate(() => navigator.clipboard.readText())).split("\n").map((line) => line.trim());
  expect(copied).toHaveLength(72);
  expect(copied.slice(0, 2)).toEqual(["SLC25A37", "HBA2"]);

  // enrichment is computed by the API from the genes of the list
  await above.getByRole("button", { name: "Enrichment of these 72 genes" }).click();
  await expect.poll(() => api.integratedRequests.filter((entry) => entry.path === "/api/v1/enrichment").length).toBe(1);
  expect(api.integratedRequests.find((entry) => entry.path === "/api/v1/enrichment").body.genes).toHaveLength(72);

  // the list opens in another module
  const below = page.getByTestId("interaction-below");
  await below.getByRole("button", { name: "Send the genes to…" }).click();
  await expect(page.getByRole("menuitem", { name: "41 genes" })).toBeVisible();
  await page.getByRole("menuitem", { name: "TF regulators" }).click();
  await expect(page).toHaveURL(/\/tf-regulators\?/);
  expect(new URL(page.url()).search).toContain("CD99");
  expect(await errors()).toEqual([]);
});

test("gene page: the pairs of a gene, linked to the page", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/gene?symbol=CBL");
  const block = page.getByTestId("gene-interactions");
  await expect(block.getByRole("heading", { name: "Genetic interactions" })).toBeVisible();
  await expect(block).toContainText("CBL was switched on together with a second gene (CRISPR activation, not a knock-down).");
  await expect(block).toContainText("K562 CRISPRa gene pairs (Norman 2019)");
  await expect(block).toContainText("6 pairs");
  const table = block.getByTestId("gene-interactions-table");
  await expect(table.locator("tbody tr")).toHaveCount(6);
  await expect(table.locator("tbody tr").first()).toContainText("UBASH3B");
  await expect(table.locator("tbody tr").first()).toContainText("More than additive");
  await expect(block.getByRole("link", { name: "Open in Genetic interactions" })).toHaveAttribute("href", "/interactions?dataset=NormanK562a&q=CBL");
  await table.getByRole("link", { name: "CNN1" }).click();
  await expect(page).toHaveURL(/\/interactions\?dataset=NormanK562a&a=CBL&b=CNN1$/);
  await expect(page.getByTestId("interaction-reading")).toContainText("Switching on CBL and CNN1 together");

  // a gene that is in no dataset with pairs has no block
  await page.goto("/gene?symbol=ATF4");
  await expect(page.getByRole("heading", { name: "Across datasets" })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByTestId("gene-interactions")).toHaveCount(0);
  expect(await errors()).toEqual([]);
});

test("the navigation lists the page among the mechanisms", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Find mechanisms/ }).first().click();
  await page.getByRole("menuitem", { name: /Genetic interactions/ }).click();
  await expect(page).toHaveURL(/\/interactions$/);
  await expect(page.getByRole("heading", { name: "Genetic interactions", level: 1 })).toBeVisible();
});

for (const [width, height] of [
  [375, 812],
  [768, 1024],
]) {
  for (const theme of ["light", "dark"]) {
    test(`nothing scrolls sideways at ${width} px (${theme} theme)`, async ({ page }) => {
      await mockApi(page);
      const errors = watchErrors(page);
      await page.setViewportSize({ width, height });
      await useTheme(page, theme);
      for (const [address, ready] of [
        ["/interactions", "interaction-examples"],
        ["/interactions?class=buffering&a=CBL&b=CNN1", "interaction-below"],
        ["/interactions?a=CBL&b=ATF4", "interaction-pair-missing"],
        ["/gene?symbol=CBL", "gene-interactions"],
      ]) {
        await page.goto(address);
        await expect(page.getByTestId(ready), address).toBeVisible();
        if (theme === "dark") await expect(page.locator("html")).toHaveAttribute("data-gs-theme", "dark");
        await expectNoSidewaysScroll(page, width, address);
      }
      // the wide table of pairs scrolls inside its own frame, and the charts fit the screen
      await page.goto("/interactions?a=CBL&b=CNN1");
      await expect(page.getByTestId("interaction-pair-chart").locator("canvas").first()).toBeVisible();
      for (const testId of ["interaction-overview", "interaction-pair-chart"]) {
        const box = await page.getByTestId(testId).locator("canvas").first().boundingBox();
        expect(box.x, testId).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, testId).toBeLessThanOrEqual(width);
      }
      const sizes = await page.getByTestId("interaction-pairs").evaluate((node) => [node.scrollWidth, node.clientWidth]);
      expect(sizes[0]).toBeGreaterThan(sizes[1]);
      expect(await errors()).toEqual([]);
    });
  }
}
