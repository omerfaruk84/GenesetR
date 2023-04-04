import Axios from 'axios';


const getData = async(body) =>{  
  console.log("body", body)
  const { task_id } = await Axios.post("https://29d3-2001-700-100-400a-00-f-f95c.eu.ngrok.io/getData", {
    body: JSON.stringify(body),
  })
    .then(response => response.data);

  const delay = ms => new Promise(res => setTimeout(res, ms));
  const fetchData = async () => {
     let idCheck = task_id
    if(idCheck.startsWith("b\'"))
        idCheck = idCheck.split('\'')[1]

    let times = 1;
    do {
      const { data: { task_result, task_status } }  = await Axios.get("https://29d3-2001-700-100-400a-00-f-f95c.eu.ngrok.io/tasks/" + idCheck, {
        headers: {
          'ngrok-skip-browser-warning': '69420',
        },
      });
      
      console.log("task_status", task_status)
      console.log("task_result", task_result)

      if(task_status ==="FAILURE")
      {
        throw new Error(task_result)
       };
      if (task_result !== null) {
       // console.log(task_result)
        return task_result;
      };

      await delay(times*250);
      times++;
    } while (times < 30);
  };
  return fetchData(task_id);
}

const runPcaGraphCalc = async (core, pca, clustering) => {
  const body = {
    geneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    dataType: core.dataType,
    dataSource: core.cellLine,    
    numcomponents: pca.numberOfComponents,
    min_cluster_size:clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod:  clustering.clusteringMethod,
    minimumSamples:  clustering.minimumSamples,
    clusterSelectionEpsilon:  clustering.clusterSelectionEpsilon,
    retType: 0,
    request: 'PCAGraph'
  };
  return await getData(body);
};

const runMdeGraphCalc = async (core, mde,clustering) => {
  const body = {
    geneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    dataType: core.dataType,
    dataSource: core.cellLine,

    numcomponents:mde.numcomponents,
    PreprocessingMethod: mde.preprocessingMethod,
    pyMdeConstraint: mde.pyMdeConstraint,
    repulsiveFraction:mde.repulsiveFraction,

    min_cluster_size:clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod:  clustering.clusteringMethod,
    minimumSamples:  clustering.minimumSamples,
    clusterSelectionEpsilon:  clustering.clusterSelectionEpsilon,
    retType: 0,
    request: 'MDEGraph'
  };
  
  return await getData(body);
};

const runUMAPGraphCalc = async (core, umap,clustering) => {
  const body = {
    geneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    dataType: core.dataType,
    dataSource: core.cellLine,

    numcomponents:umap.numcomponents,
    n_neighbors: umap.n_neighbors,
    min_dist: umap.min_dist,
    metric:umap.metric,

    min_cluster_size:clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod:  clustering.clusteringMethod,
    minimumSamples:  clustering.minimumSamples,
    clusterSelectionEpsilon:  clustering.clusterSelectionEpsilon,
    retType: 0,
    request: 'UMAPGraph'
  };
  return await getData(body);
};

const runtSNEGraphCalc = async (core, tsne,clustering ) => {
  const body = {
    geneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    dataType: core.dataType,
    dataSource: core.cellLine,

    numcomponents:tsne.numcomponents,
    earlyExaggeration: tsne.earlyExaggeration,
    perplexity: tsne.perplexity,
    metric:tsne.metric,
    learning_rate: tsne.learning_rate,
    n_iter:tsne.n_iter,

    min_cluster_size:clustering.minimumClusterSize,
    clusteringMetric: clustering.clusteringMetric,
    clusteringMethod:  clustering.clusteringMethod,
    minimumSamples:  clustering.minimumSamples,
    clusterSelectionEpsilon:  clustering.clusterSelectionEpsilon,
    retType: 0,
    request: 'tSNEGraph'
  };
  return await getData(body);
};

const runbiClusteringCalc = async (core, biClustering) => {
  const body = {
    geneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    dataType: core.dataType,
    dataSource: core.cellLine,
    
    n_clusters: biClustering.n_clusters,  //Anyway to set this to default value is number of genes divided by 20
    n_init: biClustering.n_init,

    retType: 0,
    request: 'biClustering'
  };
  return await getData(body);
};

const runPathFinderCalc = async (core, pathfinder) => {
  const body = {
    downgeneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    dataType: core.dataType,
    cellLine: core.cellLine,
    
    upgeneList: pathfinder.upgeneList,
    cutoff: pathfinder.cutoff,
    depth: pathfinder.depth,
    checkCorr: pathfinder.checkCorr,
    corrCutOff: pathfinder.corrCutOff,
    BioGridData: pathfinder.BioGridData,

    retType: 0,
    request: 'findPath'
  };
  return await getData(body);
};

const runCorrCalc = async (core, corr) => {  
  const body = {
    geneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    dataType: core.dataType,
    dataSource: core.cellLine,

    filter: corr.filter,
    row_distance: corr.row_distance,
    column_distance: corr.column_distance,
    row_linkage: corr.row_linkage,
    column_linkage: corr.column_linkage,
    axis:corr.axis,
    normalize: corr.normalize,
    write_original:corr.write_original, 
    
    retType: 0,  
    request: 'corrCluster'
  };
  return await getData(body);  
};

const runHeatMap = async (core, heatMap) => {  
  const body = {
    dataType: core.dataType,
    dataSource: core.cellLine,
    geneList: core.peturbationList?.replaceAll(/\s+|,\s+|,/g, ';'),
    targetList: core.targetGeneList?.replaceAll(/\s+|,\s+|,/g, ';'),


    row_distance: heatMap.row_distance,
    column_distance: heatMap.column_distance,
    row_linkage: heatMap.row_linkage,
    column_linkage: heatMap.column_linkage,
    axis:heatMap.axis,
    normalize: heatMap.normalize,
    write_original:heatMap.write_original, 
    request: 'heatMap'
  };
  console.log("Here we  go");
  return await getData(body);  
};

const runGeneRegulation = async (core, geneRegulationCore) => {  
  const body = {
    //dataType: core.dataType,
    //dataSource: core.cellLine,
    gene: geneRegulationCore.selectedGene,
    absoluteZScore: geneRegulationCore.absoluteZScore,

    request: 'expandGene'
  };
  return await getData(body);  
};

const runGeneSignature = async (core) => {  
  const body = {
    //dataType: core.dataType,
    //dataSource: core.cellLine,
    formula: core.peturbationList,
    targetList: core.targetGeneList?.replaceAll(/\s+|,\s+|,/g, ';'),

    request: 'calcGeneSignature'
  };
  return await getData(body);  
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
};
