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
  // Drug screen (Tahoe-100M): answers of the API's /api/v1/drugs endpoints
  drugSearch: fixture("drug_search"),
  drugLabels: fixture("drug_labels_TahoeDrugs"),
  drugCollection: fixture("drug_collection"),
  drugBortezomib: fixture("drug_BORTEZOMIB"),
  drugsForATF4: fixture("drug_for_gene_ATF4"),
  // TF regulators: answers of the API's /api/v1/regulators endpoints
  // (the gene set is the "MYC targets" example of the page)
  regulatorSources: fixture("regulators_sources"),
  regulatorsLDHA: fixture("regulators_gene_LDHA"),
  regulatorsATF4: fixture("regulators_gene_ATF4"),
  regulatorsGeneSet: fixture("regulators_gene_set_myc"),
  // Integrated analysis: answers of the API's /api/v1/integrated endpoints
  // (the signature is the cholesterol example, the set the proteasome example)
  integratedSummary: fixture("integrated_summary"),
  integratedPerturbationATF4: fixture("integrated_perturbation_ATF4"),
  integratedPathwaysATF4: fixture("integrated_pathways_ATF4"),
  integratedGeneATF4: fixture("integrated_gene_ATF4"),
  integratedGeneSQLE: fixture("integrated_gene_SQLE"),
  integratedSignature: fixture("integrated_signature_cholesterol"),
  integratedSet: fixture("integrated_set_proteasome"),
  // Local enrichment and the CORUM benchmark
  enrichment: fixture("enrichment_isr"),
  benchmarkCorum: fixture("benchmark_corum"),
  // Function atlas: answers of the API's /api/v1/atlas endpoints (real data, 2026-11-15).
  // The maps are cut to the points of a few modules; the lists of modules to the same ones.
  atlasSummary: fixture("atlas_summary"),
  atlasMaps: { pert: fixture("atlas_map_pert"), genes: fixture("atlas_map_genes") },
  atlasModules: { pert: fixture("atlas_modules_pert"), genes: fixture("atlas_modules_genes") },
  atlasModule: { "pert/47": fixture("atlas_module_pert_47"), "genes/26": fixture("atlas_module_genes_26") },
  atlasGenes: { INTS15: fixture("atlas_gene_INTS15"), ATF4: fixture("atlas_gene_ATF4"), KIAA0586: fixture("atlas_gene_KIAA0586") },
  atlasPredictions: fixture("atlas_predictions"),
  atlasPredictionsPlaceholder: fixture("atlas_predictions_placeholder"),
  atlasPredictionsNeighbours: fixture("atlas_predictions_neighbours"),
  atlasPathways: fixture("atlas_pathways"),
  atlasPathwayCholesterol: fixture("atlas_pathway_cholesterol"),
  atlasPathwaysSCAP: fixture("atlas_pathways_perturbation_SCAP"),
  // Output of the backend's clusterData() for 60 K562 perturbations
  corrCluster: fixture("corr_cluster"),
  // Cell cycle: answers of the API's /api/v1/cellcycle endpoints (real data, 2026-11-15)
  cellCycleDatasets: fixture("cellcycle_datasets"),
  cellCycleTable: fixture("cellcycle_table_K562essential"),
  cellCycleCDK1: fixture("cellcycle_K562essential_CDK1"),
  cellCycleGeneCDK1: fixture("cellcycle_gene_CDK1"),
  cellCycleCompare: fixture("cellcycle_compare_essential"),
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
  const regulatorRequests = []; // bodies posted to /api/v1/regulators/gene-set
  const integratedRequests = []; // { path, body } posted to /api/v1/integrated/* and /api/v1/enrichment
  const atlasRequests = []; // { path, query } asked from /api/v1/atlas/*
  const postBody = (request) => {
    try {
      return JSON.parse(request.postData() || "{}");
    } catch (error) {
      return {};
    }
  };

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

  // Task updates normally arrive over a WebSocket. With a real API running on the same port
  // (a developer machine), that socket would answer for the mocked task ids ("Task not found").
  // Closing it makes the client fall back to polling /tasks/{id}, which is mocked below.
  await page.routeWebSocket(/\/ws\/tasks\//, (ws) => ws.close());

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
    if (pathname === "/api/v1/drugs") return json(route, FIXTURES.drugSearch);
    if (pathname === "/api/v1/drugs/collection") return json(route, FIXTURES.drugCollection);
    if (pathname === "/api/v1/drugs/labels") {
      const dataset = url.searchParams.get("dataset") || "";
      if (!/^Tahoe/.test(dataset)) {
        return json(route, { error: { code: "VALIDATION_ERROR", message: "Not a drug dataset", details: {} } }, 400);
      }
      return json(route, { ...FIXTURES.drugLabels, dataset });
    }
    if (/^\/api\/v1\/drugs\/for-gene\/ATF4$/i.test(pathname)) return json(route, FIXTURES.drugsForATF4);
    if (/^\/api\/v1\/drugs\/for-gene\//.test(pathname)) return json(route, { symbol: "", available: false });
    if (/^\/api\/v1\/drugs\/BORTEZOMIB$/i.test(pathname)) return json(route, FIXTURES.drugBortezomib);
    if (/^\/api\/v1\/drugs\//.test(pathname)) {
      return json(route, { error: { code: "NOT_FOUND", message: "Drug not found", details: {} } }, 404);
    }
    if (pathname === "/api/v1/regulators/sources") return json(route, FIXTURES.regulatorSources);
    if (/^\/api\/v1\/regulators\/gene\/LDHA$/i.test(pathname)) return json(route, FIXTURES.regulatorsLDHA);
    if (/^\/api\/v1\/regulators\/gene\/ATF4$/i.test(pathname)) return json(route, FIXTURES.regulatorsATF4);
    if (/^\/api\/v1\/regulators\/gene\//.test(pathname)) {
      return json(route, { error: { code: "NOT_FOUND", message: "Gene not found", details: {} } }, 404);
    }
    if (request.method() === "POST" && pathname === "/api/v1/regulators/gene-set") {
      let body = {};
      try {
        body = JSON.parse(request.postData() || "{}");
      } catch (error) {
        body = {};
      }
      regulatorRequests.push(body);
      if ((body.up || []).length + (body.down || []).length < 3) {
        return json(route, { error: { code: "VALIDATION_ERROR", message: "Give at least 3 genes in total", details: {} } }, 400);
      }
      return json(route, FIXTURES.regulatorsGeneSet);
    }
    if (pathname === "/api/v1/integrated/summary") return json(route, FIXTURES.integratedSummary);
    if (/^\/api\/v1\/integrated\/perturbation\/ATF4\/pathways$/i.test(pathname)) return json(route, FIXTURES.integratedPathwaysATF4);
    if (/^\/api\/v1\/integrated\/perturbation\/ATF4$/i.test(pathname)) return json(route, FIXTURES.integratedPerturbationATF4);
    if (/^\/api\/v1\/integrated\/gene\/ATF4$/i.test(pathname)) return json(route, FIXTURES.integratedGeneATF4);
    if (/^\/api\/v1\/integrated\/gene\/SQLE$/i.test(pathname)) return json(route, FIXTURES.integratedGeneSQLE);
    if (/^\/api\/v1\/integrated\/(perturbation|gene)\//.test(pathname)) {
      return json(route, { error: { code: "NOT_FOUND", message: "Not found in the integrated datasets", details: {} } }, 404);
    }
    if (request.method() === "POST" && pathname === "/api/v1/integrated/signature") {
      const body = postBody(request);
      integratedRequests.push({ path: pathname, body });
      if ((body.up || []).length + (body.down || []).length < 3) {
        return json(route, { error: { code: "VALIDATION_ERROR", message: "Give at least 3 genes in total", details: {} } }, 400);
      }
      return json(route, FIXTURES.integratedSignature);
    }
    if (request.method() === "POST" && pathname === "/api/v1/integrated/perturbation-set") {
      const body = postBody(request);
      integratedRequests.push({ path: pathname, body });
      if ((body.perturbations || []).length < 2) {
        return json(
          route,
          { error: { code: "VALIDATION_ERROR", message: "Fewer than 2 of these genes are perturbed in the integrated datasets", details: {} } },
          400
        );
      }
      return json(route, FIXTURES.integratedSet);
    }
    if (request.method() === "POST" && pathname === "/api/v1/enrichment") {
      integratedRequests.push({ path: pathname, body: postBody(request) });
      return json(route, FIXTURES.enrichment);
    }
    if (pathname === "/api/v1/benchmark/corum") return json(route, FIXTURES.benchmarkCorum);
    if (pathname.startsWith("/api/v1/atlas/")) {
      const query = Object.fromEntries(url.searchParams.entries());
      const atlasPath = decodeURIComponent(pathname.slice("/api/v1/atlas/".length));
      atlasRequests.push({ path: atlasPath, query });
      const missing = (what) => json(route, { error: { code: "NOT_FOUND", message: `${what} not found`, details: {} } }, 404);
      if (atlasPath === "summary") return json(route, FIXTURES.atlasSummary);
      const [head, second, third] = atlasPath.split("/");
      if (head === "map" && FIXTURES.atlasMaps[second]) return json(route, FIXTURES.atlasMaps[second]);
      if (head === "modules" && FIXTURES.atlasModules[second] && !third) {
        // like the API: `q` matches the name, an enriched term or a member gene
        const wanted = (query.q || "").toLowerCase();
        const modules = FIXTURES.atlasModules[second].modules.filter(
          (entry) =>
            !wanted ||
            entry.name.toLowerCase().includes(wanted) ||
            entry.terms.some((term) => term.set.toLowerCase().includes(wanted)) ||
            entry.members.some((gene) => gene.toLowerCase() === wanted)
        );
        return json(route, { ...FIXTURES.atlasModules[second], total: modules.length, modules });
      }
      if (head === "modules") return FIXTURES.atlasModule[`${second}/${third}`] ? json(route, FIXTURES.atlasModule[`${second}/${third}`]) : missing("Module");
      if (head === "gene") return FIXTURES.atlasGenes[second.toUpperCase()] ? json(route, FIXTURES.atlasGenes[second.toUpperCase()]) : missing("Gene");
      if (atlasPath === "predictions") {
        if (query.uncharacterised === "true") return json(route, FIXTURES.atlasPredictionsPlaceholder);
        if (query.include_neighbours === "true") return json(route, FIXTURES.atlasPredictionsNeighbours);
        return json(route, FIXTURES.atlasPredictions);
      }
      if (atlasPath === "pathways") {
        const wanted = (query.q || "").toLowerCase();
        const sets = FIXTURES.atlasPathways.sets.filter(
          (entry) => entry.name.toLowerCase().includes(wanted) && (!query.library || entry.library === query.library)
        );
        return json(route, { sets });
      }
      if (atlasPath === "pathway") {
        return query.library === "hallmark" && query.name === "Cholesterol Homeostasis" ? json(route, FIXTURES.atlasPathwayCholesterol) : missing("Gene set");
      }
      if (head === "pathways" && second === "perturbation") {
        return (third || "").toUpperCase() === "SCAP" ? json(route, FIXTURES.atlasPathwaysSCAP) : missing("Perturbation");
      }
      return missing("Atlas endpoint");
    }
    // every dataset answers with the K562 essential table, every perturbation with CDK1
    if (pathname === "/api/v1/cellcycle/datasets") return json(route, FIXTURES.cellCycleDatasets);
    if (/^\/api\/v1\/cellcycle\/datasets\/[^/]+\/perturbations$/.test(pathname)) return json(route, FIXTURES.cellCycleTable);
    if (/^\/api\/v1\/cellcycle\/datasets\/[^/]+\/perturbations\/CDK1$/i.test(pathname)) return json(route, FIXTURES.cellCycleCDK1);
    if (/^\/api\/v1\/cellcycle\/genes\/CDK1$/i.test(pathname)) return json(route, FIXTURES.cellCycleGeneCDK1);
    if (request.method() === "POST" && pathname === "/api/v1/cellcycle/compare") return json(route, FIXTURES.cellCycleCompare);
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

  return { requests, unmocked, enrichr, taskRequests, regulatorRequests, integratedRequests, atlasRequests };
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
