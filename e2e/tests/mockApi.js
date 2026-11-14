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
  // Output of the backend's clusterData() for 60 K562 perturbations
  corrCluster: fixture("corr_cluster"),
};

// Results of the backend's own task code for the requests the pages send for
// their example runs (fixtures/task_<request>.json: { request, result }).
// A page that posts one of these requests gets that result back.
const TASK_FIXTURES = {};
fs.readdirSync(path.join(__dirname, "..", "fixtures"))
  .filter((name) => /^task_.*\.json$/.test(name))
  .forEach((name) => {
    TASK_FIXTURES[name.replace(/^task_|\.json$/g, "")] = fixture(name.replace(/\.json$/, ""));
  });

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
  const taskRequests = []; // request types posted to /getData

  await page.route(/mygene\.info/, (route) =>
    json(route, {
      hits: [{ symbol: "ATF4", name: "activating transcription factor 4", summary: "Fixture summary for ATF4.", entrezgene: 468, alias: ["CREB2"] }],
    })
  );

  // Enrichr (both the default API and the background-aware "speedrichr" one).
  // The answers carry Infinity as the real service does, which is not JSON.
  const enrichr = [];
  await page.route(/maayanlab\.cloud/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postData() || "";
    enrichr.push({ path: url.pathname, body });
    const text = (value) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: value });
    if (url.pathname.endsWith("/addList")) return text('{"userListId": 4711, "shortId": "abc"}');
    if (url.pathname.endsWith("/addbackground")) return text('{"backgroundid": "bg-1"}');
    const library =
      url.searchParams.get("backgroundType") ||
      (body.match(/name="backgroundType"\s+(\S+)/) || [])[1] ||
      "Library";
    return text(
      `{"${library}": [[1,"Ribosome (fixture)",1.2E-9, Infinity, Infinity, ["RPL3","RPL4","RPS3"],3.4E-8, 0, 0 ],` +
        `[2,"Proteasome (fixture)",0.004, 12.5, 40.1, ["PSMA1"],0.01, 0, 0 ]]}`
    );
  });

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
    // An analysis run: the task is created and is finished on the first poll.
    if (request.method() === "POST" && pathname === "/getData") {
      let requestType = "";
      try {
        requestType = JSON.parse(JSON.parse(request.postData() || "{}").body || "{}").request || "";
      } catch (error) {
        requestType = "";
      }
      taskRequests.push(requestType);
      return json(route, { task_id: TASK_FIXTURES[requestType] ? `task-${requestType}` : "corr-fixture" });
    }
    const taskMatch = pathname.match(/^\/tasks\/task-(.+)$/);
    if (taskMatch && TASK_FIXTURES[taskMatch[1]]) {
      return json(route, { status: "SUCCESS", task_result: TASK_FIXTURES[taskMatch[1]].result });
    }
    if (pathname === "/tasks/corr-fixture") {
      return json(route, { status: "SUCCESS", task_result: JSON.stringify(FIXTURES.corrCluster) });
    }

    unmocked.push(`${request.method()} ${pathname}`);
    return notFound(route);
  });

  return { requests, unmocked, enrichr, taskRequests };
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

module.exports = { mockApi, watchErrors, FIXTURES, TASK_FIXTURES };
