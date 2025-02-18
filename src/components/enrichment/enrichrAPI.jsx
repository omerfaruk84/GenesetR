import { toast } from "@oliasoft-open-source/react-ui-library";
import { get, set } from "idb-keyval";
import PQueue from "p-queue";

// Initialize a queue with limited concurrency & optional rate limit
const queue = new PQueue({
  concurrency: 1, // up to 3 concurrent API calls
  interval: 300, // each "window" is 1 second
  intervalCap: 1, // max 5 requests per 1 second window
});

// Optional in-flight request cache so the same (geneList+datasets)
// request doesn’t get triggered twice at once.
const inFlightMap = new Map();

/**
 * Main function to perform Enrichment.
 * It uses IndexedDB for caching, p-queue to limit concurrency,
 * and an in-flight map to avoid duplicate simultaneous requests.
 */
export async function performEnrichment(geneList, datasets) {
  // Build a simple cache key based on hashed geneList + the dataset string
  const geneListHash = hashGeneList(geneList);
  // Make sure we convert datasets to a canonical string for the cache key
  const datasetsKey = canonicalizeDatasets(datasets);
  const key = `${geneListHash}_${datasetsKey}`;

  // If a request for the same combination is already in-flight, return it:
  if (inFlightMap.has(key)) {
    return inFlightMap.get(key);
  }

  // Create a wrapped promise so inFlightMap knows about it.
  const enrichmentPromise = (async () => {
    // 1) Try to get listID from IDB
    let listID;
    try {
      listID = await get(geneListHash);
    } catch (err) {
      // no-op, ignore missing or DB read error
    }

    // 2) If we don’t have it, call runEnrichr to store & retrieve listID
    if (!listID) {
      listID = await runEnrichr(geneList);
      if (listID) {
        await set(geneListHash, listID);
      } else {
        // If runEnrichr fails, return here
        return [];
      }
    }

    // 3) Now retrieve the actual dataset enrichment results
    const enrichRdata = await retrieveEnrichmentData(listID, datasetsKey);

    return enrichRdata;
  })();

  // Store the promise in the map
  inFlightMap.set(key, enrichmentPromise);

  try {
    // Wait for the enrichment to complete
    const result = await enrichmentPromise;
    return result;
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
  const datasets = datasetsKey.split(",");

  // Try to load existing data from IDB
  let storedResults;
  try {
    storedResults = await get("enrichr_" + listID);
  } catch (error) {
    storedResults = null;
  }

  let enrichRdata = storedResults?.data || [];
  // Create a set for easy membership checks
  let existingDatasetNames = new Set(enrichRdata.map((d) => d.name));

  // Which datasets are missing from local storage?
  const missingDatasets = datasets.filter(
    (ds) => !existingDatasetNames.has(ds)
  );

  if (missingDatasets.length > 0) {
    // Queue the requests
    const operations = missingDatasets.map((dataset) => {
      return queue.add(() => getEnrichr(listID, dataset));
      // "queue.add" ensures requests go through p-queue
    });

    // Wait for all requests to finish
    const enrichRresults = await Promise.allSettled(operations);

    // Merge the new results
    for (let result of enrichRresults) {
      if (result.status === "fulfilled" && result.value) {
        enrichRdata.push(result.value);
      }
    }

    // Save updated data to IDB
    await set("enrichr_" + listID, { data: enrichRdata, time: Date.now() });
  }

  // Filter only the requested datasets, in case we have extras
  return enrichRdata.filter((item) => datasets.includes(item.name));
}

/**
 * Create a basic hash function for geneList:
 * 1) Trim and split by comma
 * 2) Sort
 * 3) Return length + first item + last item + sum of item lengths
 */
function hashGeneList(geneList) {
  let trimmed = geneList.trim(",").split(",").sort();
  if (trimmed && trimmed.length > 1) {
    let sum = 0;
    for (let x of trimmed) {
      sum += x.length;
    }
    return trimmed.length + trimmed[0] + trimmed[trimmed.length - 1] + sum;
  }
  return "empty_geneList"; // fallback if the list is empty
}

/**
 * Normalizes the dataset string by removing whitespace,
 * then re-joins with commas in a consistent order (alphabetical).
 */
function canonicalizeDatasets(datasetsStr) {
  return datasetsStr
    .trim()
    .trim(",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

/**
 * Calls Enrichr’s “addList” endpoint to retrieve a userListId for your gene list.
 */
function runEnrichr(genes) {
  // remove _2, transform commas to newlines
  const genes_str = genes.replaceAll("_2", "").replaceAll(",", "\n");
  const description = "";
  const formData = new FormData();
  formData.append("list", genes_str);
  formData.append("description", description);

  return new Promise((resolve, reject) => {
    console.log("Requesting Enrichr listID");
    fetch("https://maayanlab.cloud/Enrichr/addList", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Request failed.");
        }
      })
      .then((data) => {
        resolve(data.userListId);
      })
      .catch((error) => {
        toast({
          message: {
            type: "Error",
            icon: true,
            heading: "Enrichr",
            content: "Sorry. Enrichr servers are not responding." + error,
          },
          autoClose: 2000,
        });
        reject(error);
      });
  });
}

/**
 * Calls Enrichr’s “enrich” endpoint for a specific dataset & listID.
 * Wrapped in p-queue (via retrieveEnrichmentData) to limit concurrency.
 */
function getEnrichr(listID, dataset) {
  console.log("Requesting Enrichr data for dataset:", dataset);
  return fetch(
    `https://maayanlab.cloud/Enrichr/enrich?userListId=${listID}&backgroundType=${dataset}`,
    { method: "GET" }
  )
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Request failed.");
      }
    })
    .then((result) => {
      // Enrichr returns an object keyed by dataset name
      return { name: dataset, data: result[dataset] };
    })
    .catch((error) => {
      toast({
        message: {
          type: "Error",
          icon: true,
          heading: "Enrichr",
          content:
            "Sorry. Error fetching enrichment results. Enrichr servers may be busy.",
        },
        autoClose: 2000,
      });
      throw error;
    });
}
