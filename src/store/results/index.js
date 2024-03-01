import { ROUTES } from "../../common/routes";
import { createSlice } from "@reduxjs/toolkit";
import { toast } from "@oliasoft-open-source/react-ui-library";
import {
  runHeatMap,
  runPcaGraphCalc,
  runCorrCalc,
  runUMAPGraphCalc,
  runMdeGraphCalc,
  runtSNEGraphCalc,
  runbiClusteringCalc,
  runGeneRegulation,
  runGeneExp,
  runPathFinderCalc,
  runGeneSignature,
} from "../api";
import { ModulePathNames } from "./enums";

const resultState = {
  result: null,
  running: false,
};

const initialState = {
  pcaGraph: resultState,
  mdeGraph: resultState,
  umapGraph: resultState,
  tsneGraph: resultState,
  biClusteringGraph: resultState,
  geneRegulationGraph: resultState,
  pathFinderGraph: resultState,
  corrCluster: resultState,
  heatmapGraph: resultState,
  enrichmentResults: resultState,
  genesignatureGraph: resultState,
  geneExpressionGraph: resultState,
};

export const calculationResults = createSlice({
  name: "calcResults",
  initialState,
  reducers: {
    resultReceived: (state, action) => {
      //console.log(action);
      const { result, module } = action.payload;
      //console.log(result);
      state[module].result = JSON.parse(result);
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
    biClustering,
    geneRegulationCore,
    clustering,
    genesetEnrichment,
    correlation,
    pathfinder,
    expressionanalyzer,
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

export { calculationResultsReducer, runCalculation };
