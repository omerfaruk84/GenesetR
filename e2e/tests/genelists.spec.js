const { test, expect } = require("@playwright/test");
const { mockApi, watchErrors } = require("./mockApi");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("genesetr.v2.releasePopup.dismissed.v1", "1");
    } catch (error) {
      // storage not available: the page still works
    }
  });
});

const createList = async (page, name, genes) => {
  await page.getByTestId("genelist-new").click();
  await page.getByTestId("list-editor-name").fill(name);
  await page.getByTestId("list-editor-genes").fill(genes);
  await page.getByTestId("list-editor-save").click();
  await expect(page.getByRole("dialog")).toBeHidden();
};

test("gene lists: create, compare, select an overlap", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/genelists");

  const library = page.getByTestId("genelist-library");
  await expect(library).toContainText("No saved gene lists yet");

  await createList(page, "Stress list", "ATF4 DDIT3 XBP1 HSPA5 ASNS");
  await createList(page, "Amino acid list", "atf4, asns; PSAT1 PHGDH ddit3");

  // New lists are ticked for comparison automatically
  await expect(library).toContainText("2 saved · 2 selected");
  const summary = page.getByTestId("genelist-summary");
  await expect(summary).toContainText("7");
  await expect(summary).toContainText("unique genes in 2 lists");
  await expect(summary).toContainText("shared by all 2");

  await expect(page.getByTestId("genelist-overlaps").locator(".upsetjs svg")).toBeVisible();

  // The Venn diagram is offered for two lists
  await page.getByRole("button", { name: "Venn", exact: true }).click();
  await expect(page.getByTestId("genelist-overlaps").locator(".venndiagram svg")).toBeVisible();

  // A matrix cell lists the shared genes
  await page.getByTestId("genelist-similarity").locator("td button").first().click();
  const selection = page.getByTestId("genelist-selection");
  await expect(selection).toContainText("3 genes");
  for (const gene of ["ASNS", "ATF4", "DDIT3"]) await expect(selection).toContainText(gene);

  // Membership: shared genes first
  const firstRow = page.getByTestId("genelist-membership").locator("tbody tr").first();
  await expect(firstRow).toContainText("2");
  await expect(page.getByTestId("genelist-membership")).toContainText("7 of 7 genes");

  expect(await errors()).toEqual([]);
});
