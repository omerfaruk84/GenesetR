import Axios from "axios";
import { get, set } from "idb-keyval";
import { store } from "../store";
import { progressUpdateReceived } from "../results";

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
};

const getData = async (body, moduleName = null) => {
  try {
    // Determine module name from request type if not provided
    if (!moduleName && body?.request) {
      moduleName = requestToModuleMap[body.request];
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

    //console.log("response", response)
    const { task_id } = response.data;
    //console.log("task_id", task_id)
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));
    let times = 1;
    do {
      const response2 = await Axios.get(SERVER_ADRESS + `/tasks/${task_id}`, {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      });

      //console.log("response2", response2)
      // Handle two response formats:
      // 1. From Redis cache: {status, task_result} - HTTP 200 with wrapped object
      // 2. From AsyncResult when ready: result directly - HTTP 200 with result as body
      let status, task_result;
      
      // Check if response has status field (Format 1: Redis cache)
      if (response2.data && typeof response2.data === 'object' && response2.data.status !== undefined) {
        // Format 1: Wrapped in status object from Redis cache
        status = response2.data.status;
        task_result = response2.data.task_result;
      } else if (response2.status === 200 && response2.data) {
        // Format 2: Result is the data directly (task is ready, not in Redis)
        // Check if it looks like a task result object (has file_path, PC1, etc.) or is an error string
        if (typeof response2.data === 'object' && (response2.data.file_path || response2.data.PC1 || response2.data.filename)) {
          return response2.data;
        } else if (typeof response2.data === 'string') {
          // Might be an error message
          throw new Error(response2.data);
        } else {
          return response2.data;
        }
      } else {
        // Try to extract status and task_result
        status = response2.data?.status;
        task_result = response2.data?.task_result || response2.data;
      }
      
      debugLog("task_status", status);
      //console.log("task_result", task_result);

      if (status === "PENDING") {
        debugLog("Still not started");
      } else if (status === "FAILURE") {
        throw new Error(task_result || "Task failed");
      } else if (status === "PROGRESS") {
        const message = task_result?.message || task_result || "Processing...";
        const current = task_result?.current;
        const total = task_result?.total;
        let percentage = null;
        
        // Calculate percentage if both current and total are available
        if (typeof current === 'number' && typeof total === 'number' && total > 0) {
          percentage = Math.round((current / total) * 100);
        }
        
        debugLog("Processing", message);
        
        // Dispatch progress update if module name is available
        if (moduleName) {
          store.dispatch(progressUpdateReceived({
            module: moduleName,
            message: message,
            percentage: percentage,
          }));
        }
      } else if (status === "SUCCESS" && task_result !== undefined && task_result !== null) {
        return task_result;
      } else if (task_result !== undefined && task_result !== null && status !== "PENDING" && status !== "PROGRESS") {
        // If we have a task_result and status is not pending/progress, return it
        return task_result;
      } else if (response2.data && !status && response2.status === 200) {
        // No status field but HTTP 200, assume it's the result directly
        return response2.data;
      }

      await delay(times * 250);
      times++;
    } while (times < 30);
  } catch (error) {
    debugError(error);
  }
};

const runPcaGraphCalc = async (core, pca, clustering) => {
  const body = {
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
    request: "PCAGraph",
  };
  return await getData(body);
};

const runMdeGraphCalc = async (core, mde, clustering) => {
  const body = {
    geneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
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
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
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
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
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
  const body = {
    downgeneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    dataType: core.dataType,
    cell_line: core.cellLine.id,

    upgeneList: core.targetGeneList?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
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
    retType: 0,
    request: "corrCluster",
  };
  return await getData(body);
};

const runHeatMap = async (core, heatMap) => {
  const body = {
    //dataType: core.dataType,
    cell_line: core.cellLine.id,
    geneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    targetList: core.targetGeneList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),

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

const runGeneSignature = async (core) => {
  const body = {
    formula: core.targetGeneList.trim("\n", " "),
    cell_line: core.cellLine.id,
    request: "calcGeneSignature",
  };
  return await getData(body);
};

const runGeneSignatureMultiDataset = async (core, genesignatureSettings) => {
  const body = {
    formula: core.targetGeneList.trim("\n", " "),
    min_datasets: genesignatureSettings.minDatasets,
    ranking_enabled: genesignatureSettings.rankingEnabled,
    ranking_order: genesignatureSettings.rankingOrder,
    request: "calcGeneSignatureMultiDataset",
  };
  return await getData(body);
};

const runGeneSignatureMultiDatasetSimilar = async (core, genesignatureSettings) => {
  const body = {
    formula: core.targetGeneList.trim("\n", " "),
    ranking_order: genesignatureSettings.rankingOrder || "desc",
    request: "calcGeneSignatureMultiDatasetSimilar",
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
    const response = await Axios.post(SERVER_ADRESS + "/getData", {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
      body: JSON.stringify({
        dataset: dataType,
        request: "getAllGenes",
      }),
    });

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

export {
  runPcaGraphCalc,
  runMdeGraphCalc,
  runUMAPGraphCalc,
  runtSNEGraphCalc,
  runCorrCalc,
  runbiClusteringCalc,
  runPathFinderCalc,
  runGeneRegulation,
  runGeneRegulationEnhanced,
  runHeatMap,
  runGeneSignature,
  runGeneSignatureMultiDataset,
  runGeneSignatureMultiDatasetSimilar,
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
