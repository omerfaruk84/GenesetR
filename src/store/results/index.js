import { ROUTES } from "../../common/routes";
import { createSlice } from "@reduxjs/toolkit";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { safeJsonParse } from "../../utils/jsonUtils";
import {
  runHeatMap,
  runPcaGraphCalc,
  runCorrCalc,
  runUMAPGraphCalc,
  runMdeGraphCalc,
  runtSNEGraphCalc,
  runGeneRegulation,
  runGeneExp,
  runPathFinderCalc,
  runGeneSignature,
  runGeneSignatureMultiDataset,
  runGeneSignatureMultiDatasetSimilar,
  runMultiDatasetComparison,
} from "../api";
import { ModulePathNames } from "./enums";

const resultState = {
  result: null,
  running: false,
};

const initialState = {
  pcaGraph: { ...resultState },
  mdeGraph: { ...resultState },
  umapGraph: { ...resultState },
  tsneGraph: { ...resultState },
  biClusteringGraph: { ...resultState },
  geneRegulationGraph: { ...resultState },
  pathFinderGraph: { ...resultState },
  corrCluster: { ...resultState },
  heatmapGraph: { ...resultState },
  enrichmentResults: { ...resultState },
  genesignatureGraph: { ...resultState },
  genesignatureSimilarGraph: { ...resultState },
  geneExpressionGraph: { ...resultState },
  multiDatasetComparison: { ...resultState },
};

export const calculationResults = createSlice({
  name: "calcResults",
  initialState,
  reducers: {
    resultReceived: (state, action) => {
      //console.log(action);
      const { result, module } = action.payload;
      //console.log(result);
      
    
      
            // Use the original JSON.parse approach with error handling
      let parsedResult;
      
      try {
        if (typeof result === 'string') {
          parsedResult = JSON.parse(result);
        } else if (typeof result === 'object' && result !== null) {
          // Deep clone to avoid reference issues
          parsedResult = JSON.parse(JSON.stringify(result));
        } else {
          parsedResult = {};
        }
      } catch (error) {
        console.error(`JSON parsing failed for ${module}:`, error);
        parsedResult = {};
      }
      
      console.log(`Results store - Setting ${module} result:`, {
        resultType: typeof result,
        parsedType: typeof parsedResult,
        hasResult: !!parsedResult,
        resultKeys: parsedResult ? Object.keys(parsedResult) : []
      });
      
      state[module].result = parsedResult;
      state[module].running = false;
    },
    calcRunningChanged: (state, action) => {
      //console.log(state, action);
      const { module, status } = action.payload;
      //console.log(module, status);
      state[module].running = status;
    },
  },
});

const calculationResultsReducer = calculationResults.reducer;

export const { resultReceived, calcRunningChanged } =
  calculationResults.actions;

const runCalculation = (module) => async (dispatch, getState) => {
  console.log("Running");
  const { settings } = getState();
  const {
    core,
    pca,
    heatMap,
    umap,
    mde,
    tsne,  
    geneRegulationCore,
    clustering,
    correlation,
    pathfinder,
    expressionanalyzer,
    multidatasetComparison,
    genesignature,
  } = settings;



  /**
   * Will change the status of the running simulation for a specific module
   * and if the calc is already running will disable the run calc button
   */
  if (module === ROUTES.DR) {
    dispatch(
      calcRunningChanged({
        module: ModulePathNames["/" + core.currentModule],
        status: true,
      })
    );
  } else {
    dispatch(
      calcRunningChanged({ module: ModulePathNames[module], status: true })
    );
  }

  /**
   * Wrapping all the switch block in a trycatch, to be able to catch any http error
   * that might occur and to reset the running stats for the specifc module
   */
  try {
    switch (module) {
      case ROUTES.DR: {
        if (core.currentModule === "pca") {
          const result = await runPcaGraphCalc(core, pca, clustering);
          return dispatch(
            resultReceived({ result, module: ModulePathNames["/pca"] })
          );
        } else if (core.currentModule === "mde") {
          const result = await runMdeGraphCalc(core, mde, clustering);
          return dispatch(
            resultReceived({ result, module: ModulePathNames["/mde"] })
          );
        } else if (core.currentModule === "tsne") {
          const result = await runtSNEGraphCalc(core, tsne, clustering);
          return dispatch(
            resultReceived({ result, module: ModulePathNames["/tsne"] })
          );
        } else if (core.currentModule === "umap") {
          const result = await runUMAPGraphCalc(core, umap, clustering);
          return dispatch(
            resultReceived({ result, module: ModulePathNames["/umap"] })
          );
        }
        break;
      }
      case ROUTES.GENE_REGULATION: {
        const result = await runGeneRegulation(core, geneRegulationCore);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.PATHFINDER: {
        const result = await runPathFinderCalc(core, pathfinder);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.HEATMAP: {
        const result = await runHeatMap(core, heatMap);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.CORRELATION: {
        const result = await runCorrCalc(core, correlation);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.EXPRESSIONANALYZER: {
        const result = await runGeneExp(core, expressionanalyzer);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.GENESIGNATURE: {
        const result = await runGeneSignature(core);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.MULTIDATASET_COMPARISON: {
        const result = await runMultiDatasetComparison(core, multidatasetComparison);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      default: {
        dispatch(
          calcRunningChanged({ module: ModulePathNames[module], status: false })
        );
      }
    }
  } catch (error) {
    if (module === ROUTES.DR) {
      dispatch(
        calcRunningChanged({
          module: ModulePathNames["/" + core.currentModule],
          status: false,
        })
      );
    } else {
      dispatch(
        calcRunningChanged({ module: ModulePathNames[module], status: false })
      );
    }

    console.log(error);
    toast({
      message: {
        type: "Error",
        icon: true,
        content: "Calculation failed",
        details: error.message,
      },
    });
  }
};

// Add a separate function for multi-dataset gene signature calculation
const runMultiDatasetGeneSignature = (settings) => async (dispatch, getState) => {
  const { settings: allSettings } = getState();
  const { core } = allSettings;
  
  try {
    dispatch(
      calcRunningChanged({ module: "genesignatureGraph", status: true })
    );
    
    const result = await runGeneSignatureMultiDataset(core, settings);
    
    return dispatch(
      resultReceived({ result, module: "genesignatureGraph" })
    );
  } catch (error) {
    dispatch(
      calcRunningChanged({ module: "genesignatureGraph", status: false })
    );
    
    console.log(error);
    toast({
      message: {
        type: "Error",
        icon: true,
        content: "Multi-dataset calculation failed",
        details: error.message,
      },
    });
  }
};

export const runMultiDatasetGeneSignatureSimilar = (settings) => async (
  dispatch,
  getState
) => {
  const {
    settings: { core },
  } = getState();
  
  try {
    dispatch(
      calcRunningChanged({ module: "genesignatureSimilarGraph", status: true })
    );
    
    const result = await runGeneSignatureMultiDatasetSimilar(core, settings);
    
    return dispatch(
      resultReceived({ result, module: "genesignatureSimilarGraph" })
    );
  } catch (error) {
    dispatch(
      calcRunningChanged({ module: "genesignatureSimilarGraph", status: false })
    );
    
    console.log(error);
    toast({
      message: {
        type: "Error",
        icon: true,
        content: "Multi-dataset similar genes calculation failed",
        details: error.message,
      },
    });
  }
};

export { calculationResultsReducer, runCalculation, runMultiDatasetGeneSignature };
