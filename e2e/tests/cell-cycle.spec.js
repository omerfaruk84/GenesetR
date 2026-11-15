// Cell-cycle page (/cell-cycle) on real API answers (fixtures/cellcycle_*.json).
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

test("dataset view: map, hit lists, table and a perturbation's detail", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/cell-cycle?view=dataset&dataset=K562essential");
  await expect(page.getByRole("heading", { name: "Cell cycle", level: 1 })).toBeVisible();
  await expect(page.getByTestId("cc-dataset-view")).toContainText("Single-cell phase calls");
  await expect(page.getByTestId("cc-map").locator("canvas").first()).toBeVisible();
  await expect(page.getByTestId("cc-hits-g2m")).toBeVisible();
  // the table lists perturbations; clicking one opens its detail
  await page.getByRole("button", { name: "CDK1", exact: true }).first().click();
  await expect(page.getByTestId("cc-detail")).toContainText("CDK1");
  await expect(page.getByTestId("cc-composition").locator("canvas").first()).toBeVisible();
  await expect(page).toHaveURL(/gene=CDK1/);
  expect(await errors()).toEqual([]);
});

test("profile-only dataset explains the missing phase calls", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/cell-cycle?view=dataset&dataset=CD4TRest");
  await expect(page.getByTestId("cc-dataset-view")).toContainText("Profile signature only");
  await expect(page.getByTestId("cc-dataset-view")).toContainText("no single-cell counts");
  expect(await errors()).toEqual([]);
});

test("gene view: one gene in every dataset", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/cell-cycle?view=gene&gene=CDK1");
  await expect(page.getByTestId("cc-gene-summary")).toContainText("Perturbed in 8 datasets");
  await expect(page.getByTestId("cc-gene-chart").locator("canvas").first()).toBeVisible();
  await page.getByRole("cell", { name: /RPE1 Essential/ }).first().click();
  await expect(page.getByText(/Score shift S/)).toBeVisible(); // the row opens with the score densities
  expect(await errors()).toEqual([]);
});

test("compare and coverage views", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/cell-cycle?view=compare");
  await expect(page.getByTestId("cc-compare-view")).toContainText("genes");
  await expect(page.getByRole("button", { name: "K562 Essential" }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Datasets & method" }).click();
  await expect(page.getByTestId("cc-coverage-view")).toContainText("Phase calls from single cells");
  await expect(page.getByTestId("cc-coverage-view")).toContainText("Tahoe-100M A549");
  expect(await errors()).toEqual([]);
});
