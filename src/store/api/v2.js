/**
 * New RESTful API client using /api/v1 endpoints.
 * Provides cleaner interface and better error handling.
 */
import Axios from "axios";
import { store } from "../store";
import { progressUpdateReceived } from "../results";
import { connectTaskWebSocket, waitForTaskCompletion, cancelTask } from "./websocket";

let SERVER_ADDRESS = "https://genesetr.uio.no/api";
const isDevEnv = process.env.NODE_ENV !== "production";

if (isDevEnv) {
  SERVER_ADDRESS = "http://localhost:8443";
}

const API_V1_PREFIX = "/api/v1";

const debugLog = (...args) => {
  if (isDevEnv) {
    console.log(...args);
  }
};

const debugError = (...args) => {
  if (isDevEnv) {
    console.error(...args);
  }
};

/**
 * Handle standardized error responses from the API.
 */
const handleApiError = (error) => {
  if (error.response?.data?.error) {
    const apiError = error.response.data.error;
    const errorMessage = apiError.message || "An error occurred";
    const errorCode = apiError.code || "UNKNOWN_ERROR";
    const errorDetails = apiError.details || {};
    
    const fullError = new Error(errorMessage);
    fullError.code = errorCode;
    fullError.details = errorDetails;
    throw fullError;
  }
  throw error;
};

/**
 * Create an analysis task using RESTful endpoint.
 * 
 * @param {string} endpoint - Analysis endpoint (e.g., "correlation/cluster")
 * @param {Object} payload - Request payload
 * @param {string} moduleName - Module name for progress tracking
 * @param {Object} options - Options (useWebSocket, fallbackToPolling)
 * @returns {Promise} Promise that resolves with task result
 */
const createAnalysisTask = async (endpoint, payload, moduleName = null, options = {}) => {
  try {
    const response = await Axios.post(
      `${SERVER_ADDRESS}${API_V1_PREFIX}/analysis/${endpoint}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    const { task_id } = response.data;
    debugLog(`Task created: ${task_id} for ${endpoint}`);

    // Wait for task completion using WebSocket (with polling fallback)
    return await waitForTaskCompletion(task_id, moduleName, options);
  } catch (error) {
    debugError(`Error creating ${endpoint} task:`, error);
    handleApiError(error);
  }
};

/**
 * RESTful API functions for analysis endpoints.
 */

export const runCorrelationClusterV2 = async (core, corr, moduleName = null, options = {}) => {
  const payload = {
    request: "corrCluster",
    geneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    targetList: core.targetGeneList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    row_distance: corr.row_distance,
    column_distance: corr.column_distance,
    row_linkage: corr.row_linkage,
    column_linkage: corr.column_linkage,
    axis: corr.axis,
    normalize: corr.normalize,
    write_original: corr.write_original,
    processtype: corr.corrType,
  };
  return await createAnalysisTask("correlation/cluster", payload, moduleName, options);
};

export const runPCAGraphV2 = async (core, pca, clustering, moduleName = null, options = {}) => {
  const payload = {
    request: "PCAGraph",
    geneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    numcomponents: pca.numberOfComponents,
    min_cluster_size: clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod: clustering.clusteringMethod,
    minimumSamples: clustering.minimumSamples,
    clusterSelectionEpsilon: clustering.clusterSelectionEpsilon,
    retType: 0,
  };
  return await createAnalysisTask("pca/graph", payload, moduleName, options);
};

export const runMultiDatasetComparisonV2 = async (core, multiDatasetSettings, moduleName = null, options = {}) => {
  // Get list of whole genome datasets from backend
  const wholeGenomeDatasets = await fetchWholeGenomeDatasetsV2();
  const datasetIds = wholeGenomeDatasets.map(dataset => dataset.id);

  const payload = {
    request: "multiDatasetComparison",
    gene: multiDatasetSettings.selectedGene,
    targetList: multiDatasetSettings.targetList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    correlationType: multiDatasetSettings.corrType,
    datasets: datasetIds,
  };
  return await createAnalysisTask("multi-dataset-comparison", payload, moduleName, options);
};

/**
 * Fetch datasets using new RESTful endpoint.
 */
export const fetchDatasetsV2 = async (wholeGenomeOnly = false, page = 1, pageSize = 50) => {
  try {
    const params = new URLSearchParams();
    if (wholeGenomeOnly) params.append("whole_genome_only", "true");
    params.append("page", page.toString());
    params.append("page_size", pageSize.toString());

    const response = await Axios.get(
      `${SERVER_ADDRESS}${API_V1_PREFIX}/datasets?${params.toString()}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );
    return response.data.items || [];
  } catch (error) {
    debugError("Failed to fetch datasets: ", error);
    handleApiError(error);
    return [];
  }
};

export const fetchWholeGenomeDatasetsV2 = async () => {
  return await fetchDatasetsV2(true);
};

/**
 * Get dataset metadata.
 */
export const getDatasetMetadataV2 = async (datasetId) => {
  try {
    const response = await Axios.get(
      `${SERVER_ADDRESS}${API_V1_PREFIX}/datasets/${datasetId}/metadata`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );
    return response.data;
  } catch (error) {
    debugError(`Failed to fetch metadata for ${datasetId}:`, error);
    handleApiError(error);
    throw error;
  }
};

/**
 * Get dataset genes.
 */
export const getDatasetGenesV2 = async (datasetId) => {
  try {
    const response = await Axios.get(
      `${SERVER_ADDRESS}${API_V1_PREFIX}/datasets/${datasetId}/genes`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );
    return response.data.genes || [];
  } catch (error) {
    debugError(`Failed to fetch genes for ${datasetId}:`, error);
    handleApiError(error);
    return [];
  }
};

/**
 * Export task cancellation function.
 */
export { cancelTask };

