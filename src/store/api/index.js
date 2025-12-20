//ignore TSC error
/* eslint-disable */
// @ts-nocheck
import Axios from "axios";
import { get, set } from "idb-keyval";
import { store } from "../store";
import { progressUpdateReceived } from "../results";
// Import WebSocket support at the top
import { waitForTaskCompletion, cancelTask } from "./websocket";

let SERVER_ADRESS = "https://genesetr.uio.no/api";
//const SERVER_ADRESS = "https://727b-2001-700-100-400a-00-f-f95c.ngrok-free.app";

const isDevEnv = process.env.NODE_ENV !== "production";

if (isDevEnv) {
  SERVER_ADRESS = "https://b74f-2001-700-100-400a-00-f-f95c.ngrok-free.app";
  SERVER_ADRESS = "http://localhost:8443";
}

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
  "heatMap": "heatmapGraph",
  "calcGeneSignature": "genesignatureGraph",
  "calcGeneSignatureMultiDataset": "genesignatureMultiDataset",
  "calcGeneSignatureMultiDatasetSimilar": "genesignatureSimilarGraph",
  "geneExpression": "geneExpressionGraph",
  "multiDatasetComparison": "multiDatasetComparison",
  "calcDeregulatedGenes": "deregulatedGenesGraph",
  "calcDeregulatedGenesMultiDataset": "deregulatedGenesMultiDataset",
};

const getData = async (body, moduleName = null, options = {}) => {
  const disableModuleTracking = !!options.disableModuleTracking;
  try {
    // Determine module name from request type if not provided
    let trackedModuleName = moduleName;
    if (!disableModuleTracking && !trackedModuleName && body?.request) {
      moduleName = requestToModuleMap[body.request];
      trackedModuleName = moduleName;
    }

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
    debugError("Error in getData:", error);
    
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

    numcomponents: tsne.numcomponents,
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
    cutoff: 0.2, //pathfinder.cutoff,
    depth: pathfinder.depth,
    checkCorr: pathfinder.checkCorr,
    corrCutOff: pathfinder.corrCutOff,
    BioGridData: "" + pathfinder.BioGridData,

    retType: 0,
    request: "findPath",
  };
  return await getData(body);
};

const runCorrCalc = async (core, corr) => {
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
  return await getData(body);
};

const runCorrCalcMultiDataset = async (core, corr) => {
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
  
  console.log('Multi-dataset correlation body:', body);
  return await getData(body);
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
    formula: core.targetGeneList.trim("\n", " "),
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
    formula: core.targetGeneList.trim("\n", " "),
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
    formula: core.targetGeneList.trim("\n", " "),
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

const fetchDatasets = async () => {
  try {
    const response = await Axios.get(SERVER_ADRESS + "/getDatasets", {
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
    const perturbVal = await get("geneList_" + dataType + "_perturb");
    const genesVal = await get("geneList_" + dataType + "_genes");
    if (perturbVal && perturbVal.size > 0 && genesVal && genesVal.size > 0)
      return;

    // If genes do not exist, download and save them
    const response = await Axios.post(
      SERVER_ADRESS + "/getData",
      {
        dataset: dataType,
        request: "getAllGenes",
      },
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    if (response && response.data) {
      set(
        "geneList_" + dataType + "_perturb",
        new Set(response.data.result.perturbations.map((x) => x.split("_")[0].toUpperCase()))
      );
      set(
        "geneList_" + dataType + "_genes",
        new Set(response.data.result.genes.map((x) => x.split("_")[0].toUpperCase()))
      );
    } else {
      debugError("Something is wornge cant get genes", response);
    }
  } catch (error) {
    debugError("Error updating gene lists:", error);
  }
};

const fetchHugoGenes = async () => {
  const storedGenes = await get("allHugoGenes");

  if (!storedGenes || storedGenes.size === 0) {
    try {
      const response = await Axios.post(SERVER_ADRESS + "/getData", {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
        body: JSON.stringify({
          request: "getHugoGenes",
        }),
      });

      if (response && response.data) {
        set("allHugoGenes", new Set(response.data.result));
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

// Export task cancellation function
export { cancelTask } from "./websocket";

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
};
