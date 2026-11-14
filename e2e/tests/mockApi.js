// Answers every request to the GeneSetR API (local dev server or production
// address) and to mygene.info from fixtures, so the smoke tests need no backend.
const fs = require("fs");
const path = require("path");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "fixtures", `${name}.json`), "utf-8"));

const FIXTURES = {
  getDatasets: fixture("getDatasets"),
  datasetsV1: fixture("datasets_v1"),
  geneSearch: fixture("gene_search"),
  geneATF4: fixture("gene_ATF4"),
};

const API_HOSTS = /^(https?|wss?):\/\/(localhost:8443|127\.0\.0\.1:8443|genesetr\.uio\.no\/api)\//;

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" },
    body: JSON.stringify(body),
  });

const notFound = (route) => json(route, { error: { code: "NOT_FOUND", message: "Not available in the smoke tests", details: {} } }, 404);

/**
 * Install the mocks on a page. Returns { requests, unmocked }: the API paths
 * that were asked for, and those that had no fixture (answered with 404).
 */
const mockApi = async (page) => {
  const requests = [];
  const unmocked = [];

  await page.route(/mygene\.info/, (route) =>
    json(route, {
      hits: [{ symbol: "ATF4", name: "activating transcription factor 4", summary: "Fixture summary for ATF4.", entrezgene: 468, alias: ["CREB2"] }],
    })
  );

  await page.route(API_HOSTS, (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return json(route, {});
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api(?=\/(api\/v1|getD|getW|tasks|health|listP|getB|gene-))/, "");
    requests.push(`${request.method()} ${pathname}`);

    if (pathname === "/getDatasets" || pathname === "/getWholeGenomeDatasets") return json(route, FIXTURES.getDatasets);
    if (pathname === "/api/v1/datasets") return json(route, FIXTURES.datasetsV1);
    if (pathname === "/api/v1/genes") return json(route, FIXTURES.geneSearch);
    if (/^\/api\/v1\/genes\/ATF4$/i.test(pathname)) return json(route, FIXTURES.geneATF4);
    if (/^\/api\/v1\/genes\//.test(pathname)) {
      return json(route, { error: { code: "NOT_FOUND", message: "Gene not found in any dataset", details: {} } }, 404);
    }
    if (pathname.startsWith("/health")) return json(route, { status: "healthy" });

    unmocked.push(`${request.method()} ${pathname}`);
    return notFound(route);
  });

  return { requests, unmocked };
};

/**
 * Collect errors that mean a page is broken: uncaught exceptions and the
 * application's error boundary. Returns a function that gives the list.
 */
const watchErrors = (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return async () => {
    const boundary = await page.locator("text=Something went wrong").count();
    return boundary > 0 ? [...errors, "error boundary is shown"] : errors;
  };
};

module.exports = { mockApi, watchErrors, FIXTURES };
