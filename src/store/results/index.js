import { ROUTES } from '../../common/routes';
import { createSlice } from '@reduxjs/toolkit';
import { runHeatMap, runPcaGraphCalc, runCorrCalc,runUMAPGraphCalc,runMdeGraphCalc, runtSNEGraphCalc,runbiClusteringCalc, runGeneRegulation,runPathFinderCalc   } from '../api';
import CytoscapeComponent from 'react-cytoscapejs';
const initialState = {
  pcaGraph: null,
  mdeGraph: null,
  umapGraph: null,
  tsneGraph: null,
  biClusteringGraph: null,
  geneRegulationGraph: null,
  pathFinderGraph: [],
  corrCluster: null,
  heatmapGraph: null,
  currentGraph: null,
};

export const calculationResults = createSlice({
  name: 'calcResults',
  initialState,
  reducers: {
    pcaGraphReceived: (state, action) => {      
      const { result } = action.payload;      
      //$('#myplot').animate({'opacity': 0}, 400).empty().animate({'opacity': 1}, 400);      
      document.getElementById("myplot").innerHTML= "";
      state.pcaGraph = result;
      state.currentGraph= "pcaGraph";
      console.log( state.currentGraph)
    },
    mdeGraphReceived: (state, action) => {
      const { result2 } = action.payload;
      state.mdeGraph = result2;
      state.currentGraph= "mdeGraph";
      
    },
    tsneGraphReceived: (state, action) => {
      const { result4 } = action.payload;
      state.tsneGraph = result4;
      state.currentGraph= "tsneGraph";
    },
    umapGraphReceived: (state, action) => {
      const { result3 } = action.payload;
      state.umapGraph = result3;
      state.currentGraph= "umapGraph";
    },
    biClusteringGraphReceived: (state, action) => {
      const { result5 } = action.payload;
      state.biClusteringGraph = result5;
      state.currentGraph= "biClusteringGraph";
    },
    geneRegulationGraphReceived: (state, action) => {
      const { result6 } = action.payload;
      state.geneRegulationGraph = result6;
      state.currentGraph= "geneRegulationGraph";
    },
    pathFinderGraphReceived: (state, action) => {
      const { result7 } = action.payload;
      //state.pathFinderGraph = CytoscapeComponent.normalizeElements(JSON.parse(result7));
      state.pathFinderGraph = JSON.parse(result7);
      state.currentGraph= "pathFinderGraph";
    },    
    HeatMapReceived: (state, action) => {
      const { result8 } = action.payload;
      state.heatmapGraph = result8;
      state.currentGraph= "heatmapGraph";
    },
    corrClusterReceived: (state, action) => {
      const { result9 } = action.payload;
      state.corrCluster = result9;
      state.currentGraph= "corrCluster";
    },
  },
});

const calculationResultsReducer = calculationResults.reducer;

export const {
  pcaGraphReceived,corrClusterReceived,mdeGraphReceived,pathFinderGraphReceived,tsneGraphReceived,umapGraphReceived,geneRegulationGraphReceived,biClusteringGraphReceived,HeatMapReceived,
} = calculationResults.actions;

const runCalculation = (module) => async (dispatch, getState) => {
  const { settings } = getState();
  const { core, pca, heatMap, umap,mde,tsne,biClustering, geneRegulationCore, clustering, genesetEnrichment, correlation, pathfinder} = settings;
  console.log(module);
  switch (module) {
    
    case ROUTES.PCA:      
      const result = await runPcaGraphCalc(core, pca, clustering);      
      return dispatch(pcaGraphReceived({ result }));
    case ROUTES.MDE: 
      console.log("Her is module two");     
      const result2 = await runMdeGraphCalc(core, mde, clustering);
      return dispatch(mdeGraphReceived({ result2 }));
    case ROUTES.UMAP:      
      const result3 = await runUMAPGraphCalc(core, umap, clustering);
      return dispatch(umapGraphReceived({ result3 }));
    case ROUTES.TSNE:      
      const result4 = await runtSNEGraphCalc(core, tsne, clustering);
      return dispatch(tsneGraphReceived({ result4 }));
    case ROUTES.BI_CLUSTERING:      
      const result5 = await runbiClusteringCalc(core, biClustering);
      return dispatch(biClusteringGraphReceived({ result5 }));
    case ROUTES.GENE_REGULATION:      
      const result6 = await runGeneRegulation(core, geneRegulationCore);
      return dispatch(geneRegulationGraphReceived({ result6 }));
    case ROUTES.PATHFINDER:      
      const result7 = await runPathFinderCalc(core, pathfinder);
      return dispatch(pathFinderGraphReceived({ result7 }));
    case ROUTES.HEATMAP:  
      console.log("Here we go in run heatmap");    
      const result8 = await runHeatMap(core, heatMap);
      
      return dispatch(HeatMapReceived({ result8 }));
    case ROUTES.CORRELATION:      
      const result9 = await runCorrCalc(core, correlation);
      return dispatch(corrClusterReceived({ result9 }));
        
    default:
      throw new Error('This module does not exists');
  }
}

export { calculationResultsReducer, runCalculation };
