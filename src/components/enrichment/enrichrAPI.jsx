import { toast } from "@oliasoft-open-source/react-ui-library";
import { get, set } from "idb-keyval";
import PQueue from "p-queue";

// Initialize a queue with limited concurrency & rate limit
const queue = new PQueue({
  concurrency: 1, // one Enrichr call at a time
  interval: 300, // each "window" is 300 ms
  intervalCap: 1, // max 1 request per window
});

// Optional in-flight request cache so the same (geneList+datasets)
// request doesn’t get triggered twice at once.
const inFlightMap = new Map();

// Cache layout (IndexedDB via idb-keyval). The "v2" prefix means entries written
// by older builds (which used a weak, collision-prone key) are simply ignored.
const CACHE_PREFIX = "enrichr_v2_";
export const ENRICHR_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isFresh = (entry) =>
  !!entry &&
  typeof entry.time === "number" &&
  Date.now() - entry.time < ENRICHR_CACHE_TTL_MS;

const safeGet = async (key) => {
  try {
    return await get(key);
  } catch (err) {
    return undefined; // IndexedDB unavailable (private mode, blocked storage, ...)
  }
};

const safeSet = async (key, value) => {
  try {
    await set(key, value);
  } catch (err) {
    // Caching is best effort; never fail an enrichment because of it.
  }
};

/**
 * Canonical form of a gene list: trimmed, "_2" guide suffix removed (as sent to
 * Enrichr), upper-cased, de-duplicated and sorted.
 */
export function normalizeGeneList(geneList) {
  const genes = String(geneList || "")
    .split(/[,\n;]+/)
    .map((g) => g.trim().replaceAll("_2", "").toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(genes)).sort();
}

/**
 * Synchronous fallback hash (cyrb53, 53 bits) for environments without
 * crypto.subtle (insecure origins, very old browsers).
 */
export function fallbackHash(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const value = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `f${value.toString(16).padStart(14, "0")}_${str.length}`;
}

/**
 * Real hash of the normalised gene list (SHA-256 when available).
 */
export async function hashGeneList(geneList) {
  const genes = normalizeGeneList(geneList);
  if (genes.length === 0) return "empty_geneList";
  const canonical = genes.join(",");

  // crypto.subtle only exists in secure contexts (https / localhost)
  const subtle =
    typeof window !== "undefined" && window.crypto ? window.crypto.subtle : undefined;
  if (subtle && typeof TextEncoder !== "undefined") {
    try {
      const digest = await subtle.digest("SHA-256", new TextEncoder().encode(canonical));
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `s${hex}`;
    } catch (err) {
      // fall through to the synchronous hash
    }
  }
  return fallbackHash(canonical);
}

/**
 * Main function to perform Enrichment.
 * It uses IndexedDB for caching, p-queue to limit concurrency,
 * and an in-flight map to avoid duplicate simultaneous requests.
 */
export async function performEnrichment(geneList, datasets) {
  const geneListHash = await hashGeneList(geneList);
  // Make sure we convert datasets to a canonical string for the cache key
  const datasetsKey = canonicalizeDatasets(datasets);
  const key = `${geneListHash}_${datasetsKey}`;

  if (geneListHash === "empty_geneList" || !datasetsKey) {
    return [];
  }

  // If a request for the same combination is already in-flight, return it:
  if (inFlightMap.has(key)) {
    return inFlightMap.get(key);
  }

  const listCacheKey = `${CACHE_PREFIX}list_${geneListHash}`;

  const enrichmentPromise = (async () => {
    // 1) Try to get listID from IDB (ignored when older than the TTL)
    const storedList = await safeGet(listCacheKey);
    let listID = isFresh(storedList) ? storedList.listID : undefined;

    // 2) If we don’t have it, call runEnrichr to store & retrieve listID
    if (!listID) {
      listID = await runEnrichr(geneList);
      if (!listID) {
        return [];
      }
      await safeSet(listCacheKey, { listID, time: Date.now() });
    }

    // 3) Now retrieve the actual dataset enrichment results
    return retrieveEnrichmentData(listID, datasetsKey);
  })();

  // Store the promise in the map
  inFlightMap.set(key, enrichmentPromise);

  try {
    return await enrichmentPromise;
  } finally {
    // Remove from map once complete
    inFlightMap.delete(key);
  }
}

/**
 * Helper function that calls Enrichr for the needed datasets
 * using local caching, and runs them through our p-queue
 * to avoid too many requests in a short burst.
 */
async function retrieveEnrichmentData(listID, datasetsKey) {
  // Convert CSV string to array
  const datasets = datasetsKey.split(",").filter(Boolean);
  const resultsCacheKey = `${CACHE_PREFIX}res_${listID}`;

  // Try to load existing data from IDB (dropped when older than the TTL)
  const storedResults = await safeGet(resultsCacheKey);
  const fresh = isFresh(storedResults) && Array.isArray(storedResults.data);

  let enrichRdata = fresh ? storedResults.data.filter((d) => d && Array.isArray(d.data)) : [];
  // Create a set for easy membership checks
  const existingDatasetNames = new Set(enrichRdata.map((d) => d.name));

  // Which datasets are missing from local storage?
  const missingDatasets = datasets.filter((ds) => !existingDatasetNames.has(ds));

  if (missingDatasets.length > 0) {
    // Queue the requests ("queue.add" ensures requests go through p-queue)
    const operations = missingDatasets.map((dataset) =>
      queue.add(() => getEnrichr(listID, dataset))
    );

    // Wait for all requests to finish
    const enrichRresults = await Promise.allSettled(operations);

    let failures = 0;
    for (const result of enrichRresults) {
      // Only keep (and cache) real result arrays
      if (result.status === "fulfilled" && result.value && Array.isArray(result.value.data)) {
        enrichRdata.push(result.value);
      } else {
        failures += 1;
      }
    }

    const allFailed = failures === missingDatasets.length && enrichRdata.length === 0;
    if (failures > 0 && !allFailed) {
      // One summary toast instead of one per library (total failures are
      // reported by the caller).
      toast({
        message: {
          type: "Warning",
          icon: true,
          heading: "Enrichr",
          content: `Enrichr did not return results for ${failures} of ${missingDatasets.length} requested libraries.`,
        },
        autoClose: 3000,
      });
    }

    // Save updated data to IDB; keep the original timestamp of a fresh entry so
    // the TTL counts from the first download.
    await safeSet(resultsCacheKey, {
      data: enrichRdata,
      time: fresh ? storedResults.time : Date.now(),
    });

    if (allFailed) {
      throw new Error("Enrichr did not return any results.");
    }
  }

  // Filter only the requested datasets, in case we have extras
  return enrichRdata.filter((item) => datasets.includes(item.name));
}

/**
 * Normalizes the dataset string by removing whitespace and duplicates,
 * then re-joins with commas in a consistent order (alphabetical).
 */
function canonicalizeDatasets(datasetsStr) {
  const names = String(datasetsStr || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(names)).sort().join(",");
}

/**
 * Calls Enrichr’s “addList” endpoint to retrieve a userListId for your gene list.
 */
function runEnrichr(genes) {
  // remove _2, one gene per line
  const genes_str = String(genes || "")
    .split(/[,\n;]+/)
    .map((g) => g.trim().replaceAll("_2", ""))
    .filter(Boolean)
    .join("\n");
  const description = "";
  const formData = new FormData();
  formData.append("list", genes_str);
  formData.append("description", description);

  return fetch("https://maayanlab.cloud/Enrichr/addList", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Request failed (${response.status}).`);
    })
    .then((data) => data.userListId);
}

/**
 * Calls Enrichr’s “enrich” endpoint for a specific dataset & listID.
 * Wrapped in p-queue (via retrieveEnrichmentData) to limit concurrency.
 */
function getEnrichr(listID, dataset) {
  return fetch(
    `https://maayanlab.cloud/Enrichr/enrich?userListId=${encodeURIComponent(
      listID
    )}&backgroundType=${encodeURIComponent(dataset)}`,
    { method: "GET" }
  )
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Request failed (${response.status}).`);
    })
    .then((result) => {
      // Enrichr returns an object keyed by dataset name. A 200 response without
      // that key means "no terms for this library", not a failure.
      const rows = result && Array.isArray(result[dataset]) ? result[dataset] : [];
      return { name: dataset, data: rows };
    });
}
