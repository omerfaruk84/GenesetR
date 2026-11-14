//ignore TSC error
/* eslint-disable */
// @ts-nocheck
import Axios from "axios";
import { get, set } from "../safeIdb";
import { store } from "../store";
import { progressUpdateReceived } from "../results";
// Import WebSocket support at the top
import { waitForTaskCompletion, cancelTask, isTaskCancelledError } from "./websocket";

import { SERVER_ADDRESS, isDevEnv } from "./config";

// Backend address (configured in ./config.js, REACT_APP_API_URL)
const SERVER_ADRESS = SERVER_ADDRESS;

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


// Mapping from request type to module name
const requestToModuleMap = {
  "PCAGraph": "pcaGraph",
  "MDEGraph": "mdeGraph",
  "UMAPGraph": "umapGraph",
  "tSNEGraph": "tsneGraph",
  "biClustering": "biClusteringGraph",
  "expandGene": "geneRegulationGraph",
  "expandGeneEnhanced": "geneRegulationEnhancedGraph",
  "findPath": "pathFinderGraph",
  "corrCluster": "corrCluster",
  "corrClusterMultiDataset": "corrCluster",
  "heatMap": "heatmapGraph",
  "calcGeneSignature": "genesignatureGraph",
  "calcGeneSignatureMultiDataset": "genesignatureMultiDataset",
  "calcGeneSignatureMultiDatasetSimilar": "genesignatureSimilarGraph",
  "geneExpression": "geneExpressionGraph",
  "multiDatasetComparison": "multiDatasetComparison",
  "calcDeregulatedGenes": "deregulatedGenesGraph",
  "calcDeregulatedGenesMultiDataset": "deregulatedGenesMultiDataset",
};

/**
 * Convert a free-text gene list (new lines, spaces, commas or semicolons) into
 * the ";"-separated string the backend expects.
 */
const toGeneListParam = (value) =>
  value
    ? String(value).replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
    : "";

// Minimum size of the optional gene subset for dimensionality reduction. The
// sidebar help text promises that shorter lists are ignored (all genes are used).
const DR_MIN_TARGET_GENES = 20;

/**
 * Optional gene subset (second list in the sidebar) a dimensionality reduction
 * is restricted to. Returns `{ targetList }` or `{}` when no usable list is given.
 */
const drTargetListParam = (core) => {
  const targetList = toGeneListParam(core?.targetGeneList);
  if (!targetList) return {};
  return targetList.split(";").length >= DR_MIN_TARGET_GENES ? { targetList } : {};
};

/**
 * Normalise a gene signature formula ("A+B-C") before it is sent.
 * White space / new lines / commas / semicolons are treated as "+", but never
 * next to a minus sign: "A - B" must stay "A-B" (B is subtracted); it must not
 * become "A+-+B", which the backend would read as "+B".
 */
const normalizeSignatureFormula = (value) =>
  String(value || "")
    .trim()
    .replace(/[\s,;]+/g, "+")
    .replace(/\++/g, "+")
    .replace(/-+/g, "-")
    .replace(/\+?-\+?/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\++/, "")
    .replace(/[+-]+$/, "");

/**
 * The pathfinder task historically compared these flags with the string "True".
 * Always send that exact spelling, whatever the UI state holds (a boolean after
 * the checkbox was toggled, "True"/"False" strings initially).
 */
const toPythonBoolString = (value) =>
  value === true || String(value).toLowerCase() === "true" ? "True" : "False";

// The last request sent for each result module, kept so the user can copy it
// as an API call (see components/share-menu).
const lastRequests = {};
const getLastRequest = (moduleName) => lastRequests[moduleName] || null;

const getData = async (body, moduleName = null, options = {}) => {
  const disableModuleTracking = !!options.disableModuleTracking;
  try {
    // Determine module name from request type if not provided
    let trackedModuleName = moduleName;
    if (!disableModuleTracking && !trackedModuleName && body?.request) {
      moduleName = requestToModuleMap[body.request];
      trackedModuleName = moduleName;
    }
    const requestModule = trackedModuleName || requestToModuleMap[body?.request];
    if (requestModule && body) lastRequests[requestModule] = { ...body };

    const response = await Axios.post(
      SERVER_ADRESS + "/getData",
      {
        body: JSON.stringify(body),
      },
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    const { task_id } = response.data;
    debugLog(`Task created: ${task_id} for ${body.request}`);

    // Store task ID in Redux for cancellation support
    if (!disableModuleTracking && trackedModuleName && store && store.dispatch) {
      try {
        const resultsModule = await import("../results");
        if (resultsModule.taskStarted) {
          store.dispatch(resultsModule.taskStarted({ module: trackedModuleName, taskId: task_id }));
        }
      } catch (e) {
        // Ignore if taskStarted not available (backward compatibility)
        debugLog("Could not dispatch taskStarted:", e);
      }
    }

    // Use WebSocket with polling fallback for better performance
    // Options: { useWebSocket: true, fallbackToPolling: true, useVersionedEndpoint: false }
    // Legacy /getData endpoint uses /tasks/{task_id}, not /api/v1/tasks/{task_id}
    const defaultOptions = {
      useWebSocket: true,
      fallbackToPolling: true,
      useVersionedEndpoint: false, // Legacy endpoint format
      ...options,
    };

    return await waitForTaskCompletion(task_id, disableModuleTracking ? null : trackedModuleName, defaultOptions);
  } catch (error) {
    if (isTaskCancelledError(error)) {
      // The caller cancelled this task; nothing went wrong.
      throw error;
    }

    debugError("Error in getData:", error);

    if (error.response?.status === 429) {
      const retryAfter = Number(error.response.headers?.["retry-after"]);
      const waitHint = Number.isFinite(retryAfter) && retryAfter > 0
        ? ` Please try again in ${Math.ceil(retryAfter)} seconds.`
        : " Please wait a moment and try again.";
      const rateError = new Error(
        (error.response.data?.error?.message || "Too many requests.") + waitHint
      );
      rateError.code = error.response.data?.error?.code || "RATE_LIMITED";
      throw rateError;
    }

    // Handle standardized error format
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      const errorMessage = apiError.message || "An error occurred";
      const fullError = new Error(errorMessage);
      fullError.code = apiError.code;
      fullError.details = apiError.details;
      throw fullError;
    }
    
    throw error;
  }
};

const runPcaGraphCalc = async (core, pca, clustering) => {
  const body = {
    geneList: core.peturbationList
      ? core.peturbationList.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
      : "",
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    ...drTargetListParam(core),
    numcomponents: pca.numberOfComponents,
    min_cluster_size: clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod: clustering.clusteringMethod,
    minimumSamples: clustering.minimumSamples,
    clusterSelectionEpsilon: clustering.clusterSelectionEpsilon,
    retType: 0,
    request: "PCAGraph",
  };
  return await getData(body);
};

const runMdeGraphCalc = async (core, mde, clustering) => {
  const body = {
    geneList: core.peturbationList
      ? core.peturbationList.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
      : "",
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    ...drTargetListParam(core),

    numcomponents: mde.numcomponents,
    PreprocessingMethod: mde.preprocessingMethod,
    pyMdeConstraint: mde.pyMdeConstraint,
    repulsiveFraction: mde.repulsiveFraction,

    min_cluster_size: clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod: clustering.clusteringMethod,
    minimumSamples: clustering.minimumSamples,
    clusterSelectionEpsilon: clustering.clusterSelectionEpsilon,
    retType: 0,
    request: "MDEGraph",
  };

  return await getData(body);
};

const runUMAPGraphCalc = async (core, umap, clustering) => {
  const body = {
    geneList: core.peturbationList
      ? core.peturbationList.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
      : "",
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    ...drTargetListParam(core),

    numcomponents: umap.numcomponents,
    n_neighbors: umap.n_neighbors,
    min_dist: umap.min_dist,
    metric: umap.metric,

    min_cluster_size: clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod: clustering.clusteringMethod,
    minimumSamples: clustering.minimumSamples,
    clusterSelectionEpsilon: clustering.clusterSelectionEpsilon,
    retType: 0,
    request: "UMAPGraph",
  };
  return await getData(body);
};

const runtSNEGraphCalc = async (core, tsne, clustering) => {
  const body = {
    geneList: core.peturbationList
      ? core.peturbationList.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
      : "",
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    ...drTargetListParam(core),

    numcomponents: tsne.numcomponents,
    // Sent under both names: the backend reads "early_exaggeration"
    early_exaggeration: tsne.earlyExaggeration,
    earlyExaggeration: tsne.earlyExaggeration,
    perplexity: tsne.perplexity,
    metric: tsne.metric,
    learning_rate: tsne.learning_rate,
    n_iter: tsne.n_iter,

    min_cluster_size: clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod: clustering.clusteringMethod,
    minimumSamples: clustering.minimumSamples,
    clusterSelectionEpsilon: clustering.clusterSelectionEpsilon,
    retType: 0,
    request: "tSNEGraph",
  };
  return await getData(body);
};

const runbiClusteringCalc = async (core, biClustering) => {
  const body = {
    geneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    dataType: core.dataType,
    cell_line: core.cellLine.id,

    n_clusters: biClustering.n_clusters, //Anyway to set this to default value is number of genes divided by 20
    n_init: biClustering.n_init,

    retType: 0,
    request: "biClustering",
  };
  return await getData(body);
};

const runPathFinderCalc = async (core, pathfinder) => {
  debugLog(core, pathfinder)
  
  // Extract selected datasets, ensuring we have an array of IDs
  let selectedDatasets = pathfinder.selectedDatasets || [];
  if (Array.isArray(selectedDatasets)) {
    selectedDatasets = selectedDatasets.map((ds) => {
      if (typeof ds === 'object' && ds !== null) {
        return ds.value || ds.id || String(ds);
      }
      return String(ds);
    });
  }
  
  // If no datasets selected, use the current one
  if (selectedDatasets.length === 0 && core.cellLine?.id) {
    selectedDatasets = [core.cellLine.id];
  }

  const body = {
    downgeneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    selectedDatasets: selectedDatasets,
    combinationStrategy: pathfinder.combinationStrategy || 'intersection',
    upgeneList: core.targetGeneList?.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";"),
    // Z-score cutoff from the sidebar (0.2 when it is not set)
    cutoff: Number.isFinite(Number(pathfinder.cutoff)) && pathfinder.cutoff !== null && pathfinder.cutoff !== ""
      ? Number(pathfinder.cutoff)
      : 0.2,
    depth: pathfinder.depth,
    checkCorr: toPythonBoolString(pathfinder.checkCorr),
    corrCutOff: pathfinder.corrCutOff,
    BioGridData: toPythonBoolString(pathfinder.BioGridData),

    retType: 0,
    request: "findPath",
  };
  return await getData(body);
};

const runCorrCalc = async (core, corr, options = {}) => {
  const body = {
    geneList: core.peturbationList
      ? core.peturbationList.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
      : "",
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
    retType: 0,
    request: "corrCluster",
  };
  return await getData(body, null, options);
};

const runCorrCalcMultiDataset = async (core, corr, options = {}) => {
  // Ensure datasets is an array of strings
  let datasets = core.selectedDatasets || [];
  if (Array.isArray(datasets)) {
    datasets = datasets.map((ds) => {
      if (typeof ds === 'object' && ds !== null) {
        return ds.id || ds.value || String(ds);
      }
      return String(ds);
    });
  }
  
  const body = {
    geneList: core.peturbationList
      ? core.peturbationList.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
      : "",
    dataType: core.dataType,
    datasets: datasets,
    combineMethod: corr.combineMethod || "average",
    targetList: core.targetGeneList
      ? core.targetGeneList.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";")
      : "",
    row_distance: corr.row_distance,
    column_distance: corr.column_distance,
    row_linkage: corr.row_linkage,
    column_linkage: corr.column_linkage,
    axis: corr.axis,
    normalize: corr.normalize,
    write_original: corr.write_original,
    processtype: corr.corrType,
    request: "corrClusterMultiDataset",
  };
  
  debugLog('Multi-dataset correlation body:', body);
  return await getData(body, null, options);
};

const runHeatMap = async (core, heatMap) => {
  const geneList = core.peturbationList?.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";") || "";
  const targetList = core.targetGeneList?.replaceAll(/[\s,;\r\n]+/g, ";").split(";").filter(Boolean).join(";") || "";

  const body = {
    //dataType: core.dataType,
    cell_line: core.cellLine.id,
    geneList: geneList,
    targetList: targetList,
    row_distance: heatMap.row_distance,
    column_distance: heatMap.column_distance,
    row_linkage: heatMap.row_linkage,
    column_linkage: heatMap.column_linkage,
    axis: heatMap.axis,
    normalize: heatMap.normalize,
    write_original: heatMap.write_original,
    request: "heatMap",
  };
  debugLog("Here we  go");
  return await getData(body);
};

const runGeneRegulation = async (core, geneRegulationCore) => {
  const body = {
    gene: geneRegulationCore.selectedGene,
    cell_line: core.cellLine.id,
    request: "expandGene",
  };
  return await getData(body);
};

const runGeneRegulationEnhanced = async (core, geneRegulationEnhanced) => {
  const body = {
    gene: geneRegulationEnhanced.selectedGene,
    experiments: geneRegulationEnhanced.selectedExperiments,
    exp_weights: geneRegulationEnhanced.experimentWeights,
    combine: geneRegulationEnhanced.combineMethod,
    filter: geneRegulationEnhanced.zFilter,
    corrFilter: geneRegulationEnhanced.corrFilter,
    topk_upstream: geneRegulationEnhanced.topkUpstream,
    topk_downstream: geneRegulationEnhanced.topkDownstream,
    corr_topk: geneRegulationEnhanced.corrTopk,
    max_nodes: geneRegulationEnhanced.maxNodes,
    max_edges: geneRegulationEnhanced.maxEdges,
    request: "expandGeneEnhanced",
  };
  
  return await getData(body);
};

const runGeneSignature = async (core, options = {}) => {
  const body = {
    formula: normalizeSignatureFormula(core.targetGeneList),
    cell_line: core.cellLine.id,
    request: "calcGeneSignature",
  };
  return await getData(body, null, options);
};

const runGeneSignatureMultiDataset = async (core, genesignatureSettings) => {
  let datasets = genesignatureSettings.selectedDatasets || [];
  if (Array.isArray(datasets)) {
    datasets = datasets
      .map((ds) => {
        if (typeof ds === "object" && ds !== null) {
          return ds.id || ds.value || String(ds);
        }
        return String(ds);
      })
      .filter(Boolean);
  }

  const body = {
    formula: normalizeSignatureFormula(core.targetGeneList),
    datasets: datasets,
    min_datasets: genesignatureSettings.minDatasets ?? 1,
    ranking_enabled: genesignatureSettings.rankingEnabled ?? true,
    ranking_order: genesignatureSettings.rankingOrder || "desc",
    request: "calcGeneSignatureMultiDataset",
  };
  return await getData(body);
};

const runGeneSignatureMultiDatasetSimilar = async (core, genesignatureSettings) => {
  let datasets = genesignatureSettings.selectedDatasets || [];
  if (Array.isArray(datasets)) {
    datasets = datasets
      .map((ds) => {
        if (typeof ds === "object" && ds !== null) {
          return ds.id || ds.value || String(ds);
        }
        return String(ds);
      })
      .filter(Boolean);
  }

  const body = {
    formula: normalizeSignatureFormula(core.targetGeneList),
    datasets: datasets,
    ranking_order: genesignatureSettings.rankingOrder || "desc",
    request: "calcGeneSignatureMultiDatasetSimilar",
  };
  return await getData(body);
};

const runDeregulatedGenes = async (core, deregulatedGenesSettings) => {
  const body = {
    perturbation_list: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    cell_line: core.cellLine.id,
    top_n_genes: deregulatedGenesSettings.topNGenes,
    min_perturbations: deregulatedGenesSettings.minPerturbations,
    min_perturbations_type: deregulatedGenesSettings.minPerturbationsType,
    z_score_threshold: deregulatedGenesSettings.zScoreThreshold,
    average_method: deregulatedGenesSettings.averageMethod,
    require_same_direction: deregulatedGenesSettings.requireSameDirection,
    direction_mode: deregulatedGenesSettings.directionMode,
    request: "calcDeregulatedGenes",
  };
  return await getData(body);
};

const runDeregulatedGenesMultiDataset = async (core, deregulatedGenesSettings) => {
  const body = {
    perturbation_list: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    datasets: deregulatedGenesSettings.selectedDatasets,
    top_n_genes: deregulatedGenesSettings.topNGenes,
    min_perturbations: deregulatedGenesSettings.minPerturbations,
    min_perturbations_type: deregulatedGenesSettings.minPerturbationsType,
    z_score_threshold: deregulatedGenesSettings.zScoreThreshold,
    average_method: deregulatedGenesSettings.averageMethod,
    require_same_direction: deregulatedGenesSettings.requireSameDirection,
    min_datasets: deregulatedGenesSettings.minDatasets,
    direction_mode: deregulatedGenesSettings.directionMode,
    request: "calcDeregulatedGenesMultiDataset",
  };
  return await getData(body);
};

const runGeneExp = async (core, geneExp) => {
  const body = {
    gene: geneExp.selectedGene,
    dataType: core.dataType,
    cell_line: core.cellLine.id,
    targetList: geneExp.targetList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    correlationType: geneExp.corrType,
    retType: 0,
    request: "geneExpression",
  };
  return await getData(body);
};

const fetchDatasets = async (sessionId = null) => {
  try {
    const url = sessionId
      ? `${SERVER_ADRESS}/getDatasets?session_id=${sessionId}`
      : `${SERVER_ADRESS}/getDatasets`;

    const response = await Axios.get(url, {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
    });
    return response.data.datasets;
  } catch (error) {
    debugError("Failed to fetch datasets: ", error);
    return [];
  }
};

const fetchWholeGenomeDatasets = async () => {
  try {
    const response = await Axios.get(SERVER_ADRESS + "/getWholeGenomeDatasets", {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
    });
    return response.data.datasets;
  } catch (error) {
    debugError("Failed to fetch whole genome datasets: ", error);
    return [];
  }
};

const runMultiDatasetComparison = async (core, multiDatasetSettings) => {
  // Get list of whole genome datasets from backend
  const wholeGenomeDatasets = await fetchWholeGenomeDatasets();
  const datasetIds = wholeGenomeDatasets.map(dataset => dataset.id);

  const body = {
    gene: multiDatasetSettings.selectedGene,
    targetList: multiDatasetSettings.targetList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    correlationType: multiDatasetSettings.corrType,
    datasets: datasetIds,
    request: "multiDatasetComparison",
  };
  return await getData(body);
};

const getBlackList = async () => {
  const response = await Axios.get(SERVER_ADRESS + "/getBlackList", {
    headers: {
      "ngrok-skip-browser-warning": "69420",
    },
  }).then((response) => response.data);

  if (response === "FAILURE") throw new Error(response);
  return response;
};

const updateGeneLists = async (dataType) => {
  try {
    // Check if perturb already exists in DB
    let perturbVal;
    let genesVal;
    try {
      perturbVal = await get("geneList_" + dataType + "_perturb");
      genesVal = await get("geneList_" + dataType + "_genes");
    } catch (e) {
      debugError("updateGeneLists: could not read IndexedDB for dataset", dataType, e);
      perturbVal = null;
      genesVal = null;
    }
    if (perturbVal && perturbVal.size > 0 && genesVal && genesVal.size > 0)
      return;

    // If genes do not exist, download and save them
    const response = await Axios.post(
      SERVER_ADRESS + "/getData",
      {
        body: JSON.stringify({
          dataset: dataType,
          request: "getAllGenes",
        })
      },
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    const result = response?.data?.result;
    if (result && Array.isArray(result.perturbations) && Array.isArray(result.genes)) {
      const perturbSet = new Set(result.perturbations.map((x) => x.split("_")[0].toUpperCase()));
      const genesSet = new Set(result.genes.map((x) => x.split("_")[0].toUpperCase()));
      await set("geneList_" + dataType + "_perturb", perturbSet);
      await set("geneList_" + dataType + "_genes", genesSet);
      debugLog("updateGeneLists: cached", dataType, "perturb=", perturbSet.size, "genes=", genesSet.size);
    } else {
      debugError("updateGeneLists: unexpected response shape", response?.data);
    }
  } catch (error) {
    debugError("Error updating gene lists:", error);
  }
};

const fetchHugoGenes = async () => {
  let storedGenes;
  try {
    storedGenes = await get("allHugoGenes");
  } catch (e) {
    debugError("fetchHugoGenes: could not read IndexedDB (allHugoGenes)", e);
    storedGenes = null;
  }

  if (!storedGenes || storedGenes.size === 0) {
    try {
      const response = await Axios.post(
        SERVER_ADRESS + "/getData",
        {
          body: JSON.stringify({
            request: "getHugoGenes",
          }),
        },
        {
          headers: {
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      const genes = response?.data?.result;
      if (Array.isArray(genes) && genes.length > 0) {
        await set("allHugoGenes", new Set(genes));
      } else {
        debugError("fetchHugoGenes: unexpected response shape", response?.data);
      }
    } catch (error) {
      debugError("Failed to fetch Hugo genes: ", error);
    }
  }
};

const fetchPrecomputedDR = async (params) => {
  try {
    const queryParams = new URLSearchParams();
    // If filename is provided, use it directly (most reliable method)
    if (params.filename) {
      queryParams.append("filename", params.filename);
    } else {
      // Otherwise, use parameter matching
      if (params.method) queryParams.append("method", params.method);
      if (params.hvg_strategy) queryParams.append("hvg_strategy", params.hvg_strategy);
      if (params.n_hvgs) queryParams.append("n_hvgs", params.n_hvgs.toString());
      if (params.cell_lines) queryParams.append("cell_lines", params.cell_lines);
    }

    const response = await Axios.get(
      `${SERVER_ADRESS}/getPrecomputedDR?${queryParams.toString()}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data;
  } catch (error) {
    debugError("Error fetching pre-computed DR:", error);
    throw error;
  }
};

const listPrecomputedDR = async () => {
  try {
    const response = await Axios.get(`${SERVER_ADRESS}/listPrecomputedDR`, {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
    });

    return response.data.available_results || [];
  } catch (error) {
    debugError("Error listing pre-computed DR:", error);
    return [];
  }
};

// User Dataset Upload Functions
const uploadDataset = async ({ file, name, description, isZScored, isTransposed, sessionId }) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("description", description || "");
    formData.append("is_z_scored", isZScored ? "true" : "false");
    formData.append("is_transposed", isTransposed ? "true" : "false");
    formData.append("session_id", sessionId);

    const response = await Axios.post(
      `${SERVER_ADRESS}/api/v1/upload/dataset`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data;
  } catch (error) {
    debugError("Failed to upload dataset:", error);

    // Handle error response
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new Error(apiError.message || "Upload failed");
    }

    if (error.response?.status === 413) {
      throw new Error("The file is too large to upload. The maximum size is 100 MB.");
    }
    if (error.response?.status === 429) {
      throw new Error("Too many requests. Please wait a moment and try again.");
    }

    throw error;
  }
};

const checkUploadProgress = async (uploadId, sessionId) => {
  try {
    const response = await Axios.get(
      `${SERVER_ADRESS}/api/v1/upload/${uploadId}/progress?session_id=${sessionId}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data;
  } catch (error) {
    debugError("Failed to check upload progress:", error);
    throw error;
  }
};

const getUserDatasets = async (sessionId) => {
  try {
    const response = await Axios.get(
      `${SERVER_ADRESS}/api/v1/upload/my-datasets?session_id=${sessionId}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data.datasets || [];
  } catch (error) {
    debugError("Failed to fetch user datasets:", error);
    return [];
  }
};

const deleteUserDataset = async (datasetId, sessionId) => {
  try {
    const response = await Axios.delete(
      `${SERVER_ADRESS}/api/v1/upload/dataset/${datasetId}?session_id=${sessionId}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data;
  } catch (error) {
    debugError("Failed to delete user dataset:", error);
    throw error;
  }
};

const deleteUserSession = async (sessionId) => {
  try {
    const response = await Axios.delete(
      `${SERVER_ADRESS}/api/v1/upload/session?session_id=${sessionId}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data;
  } catch (error) {
    debugError("Failed to delete user session:", error);
    throw error;
  }
};

const getSessionStats = async (sessionId) => {
  try {
    const response = await Axios.get(
      `${SERVER_ADRESS}/api/v1/upload/session/stats?session_id=${sessionId}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data;
  } catch (error) {
    debugError("Failed to fetch session stats:", error);
    throw error;
  }
};

// Export task cancellation function
export { cancelTask, isTaskCancelledError } from "./websocket";
export { getLastRequest };
export { SERVER_ADDRESS } from "./config";

// Export new RESTful API functions (optional - can be used instead of legacy functions)
export {
  runCorrelationClusterV2,
  runPCAGraphV2,
  runMultiDatasetComparisonV2,
  fetchDatasetsV2,
  fetchWholeGenomeDatasetsV2,
  getDatasetMetadataV2,
  getDatasetGenesV2,
} from "./v2";

export {
  runPcaGraphCalc,
  runMdeGraphCalc,
  runUMAPGraphCalc,
  runtSNEGraphCalc,
  runCorrCalc,
  runCorrCalcMultiDataset,
  runbiClusteringCalc,
  runPathFinderCalc,
  runGeneRegulation,
  runGeneRegulationEnhanced,
  runHeatMap,
  runGeneSignature,
  runGeneSignatureMultiDataset,
  runGeneSignatureMultiDatasetSimilar,
  runDeregulatedGenes,
  runDeregulatedGenesMultiDataset,
  getBlackList,
  updateGeneLists,
  fetchHugoGenes,
  runGeneExp,
  runMultiDatasetComparison,
  fetchDatasets,
  fetchWholeGenomeDatasets,
  fetchPrecomputedDR,
  listPrecomputedDR,
  getData,
  normalizeSignatureFormula,
  // User dataset upload functions
  uploadDataset,
  checkUploadProgress,
  getUserDatasets,
  deleteUserDataset,
  deleteUserSession,
  getSessionStats,
};
