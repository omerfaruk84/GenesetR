import { toast } from "@oliasoft-open-source/react-ui-library";
import Axios from "axios";
import { get, set } from "idb-keyval";

let SERVER_ADRESS = "https://genesetr.uio.no/api";
//const SERVER_ADRESS = "https://727b-2001-700-100-400a-00-f-f95c.ngrok-free.app";

if (process.env.NODE_ENV !== "production") {
  console.log("WORKING IN PRODUCTION MODE");
  SERVER_ADRESS = "https://b74f-2001-700-100-400a-00-f-f95c.ngrok-free.app";
  SERVER_ADRESS = "http://localhost:8443";
}

const getData = async (body) => {
  try {
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
      const { status, task_result } = response2.data;
      console.log("task_status", status);
      //console.log("task_result", task_result);

      if (status === "PENDING") {
        console.log("Still not started");
      } else if (status === "FAILURE") {
        throw new Error(task_result);
      } else if (status === "PROGRESS") {
        console.log("Processing", task_result.message);
        /*toast({
          message: {
            type: "Info",
            icon: false,
            heading: "Completed:" + task_result.current,
            content: task_result.message,
          },
          id: "process",
          autoClose: "1000",
        });*/
      } else if (task_result !== undefined && task_result !== null) {
        return task_result;
      }

      await delay(times * 250);
      times++;
    } while (times < 30);
  } catch (error) {
    console.log(error);
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
    cell_line: core.cellLine[0],
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
    cell_line: core.cellLine[0],

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
    cell_line: core.cellLine[0],

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
    cell_line: core.cellLine[0],

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
    cell_line: core.cellLine[0],

    n_clusters: biClustering.n_clusters, //Anyway to set this to default value is number of genes divided by 20
    n_init: biClustering.n_init,

    retType: 0,
    request: "biClustering",
  };
  return await getData(body);
};

const runPathFinderCalc = async (core, pathfinder) => {
  console.log(core, pathfinder)
  const body = {
    downgeneList: core.peturbationList
      ?.replaceAll(/[\s,;\r\n]+/g, ";")
      .split(";")
      .filter(Boolean)
      .join(";"),
    dataType: core.dataType,
    cellLine: core.cellLine[0],

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
    cell_line: core.cellLine[0],
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
    cell_line: core.cellLine[0],
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
  console.log("Here we  go");
  return await getData(body);
};

const runGeneRegulation = async (core, geneRegulationCore) => {
  const body = {
    gene: geneRegulationCore.selectedGene,
    request: "expandGene",
  };
  return await getData(body);
};

const runGeneSignature = async (core) => {
  const body = {
    formula: core.targetGeneList.trim("\n", " "),
    cell_line: core.cellLine[0],
    request: "calcGeneSignature",
  };
  return await getData(body);
};

const runGeneExp = async (core, geneExp) => {
  const body = {
    gene: geneExp.selectedGene,
    dataType: core.dataType,
    cell_line: core.cellLine[0],
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

const getBlackList = async (body) => {
  const response = await Axios.get(SERVER_ADRESS + "/getBlackList", {
    headers: {
      "ngrok-skip-browser-warning": "69420",
    },
    body: JSON.stringify(body),
  }).then((response) => response.data);

  if (response === "FAILURE") throw new Error(response);
  console.log(response);
  return response; //JSON.parse(response)
};

const updateGeneLists = async (dataType) => {
  try {
    console.log("Trying to update gene lists!");
    // Check if perturb already exists in DB
    const perturbVal = await get("geneList_" + dataType + "_perturb");
    const genesVal = await get("geneList_" + dataType + "_genes");
    if (perturbVal && perturbVal.size > 0 && genesVal && genesVal.size > 0)
      return;

    console.log("Still Trying to update gene lists!");
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
        new Set(response.data.result.perturbations)
      );
      set(
        "geneList_" + dataType + "_genes",
        new Set(response.data.result.genes)
      );
    } else {
      console.log("Something is wornge cant get genes", response);
    }
  } catch (error) {
    console.error("Error updating gene lists:", error);
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
      console.error("Failed to fetch Hugo genes: ", error);
    }
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
  runHeatMap,
  runGeneSignature,
  getBlackList,
  updateGeneLists,
  fetchHugoGenes,
  runGeneExp,
};
