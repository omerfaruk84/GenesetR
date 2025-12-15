import { ROUTES } from "../../common/routes";
import { createSlice } from "@reduxjs/toolkit";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { safeJsonParse } from "../../utils/jsonUtils";
import {
  runHeatMap,
  runPcaGraphCalc,
  runCorrCalc,
  runCorrCalcMultiDataset,
  runUMAPGraphCalc,
  runMdeGraphCalc,
  runtSNEGraphCalc,
  runGeneRegulation,
  runGeneRegulationEnhanced,
  runGeneExp,
  runPathFinderCalc,
  runGeneSignature,
  runGeneSignatureMultiDataset,
  runGeneSignatureMultiDatasetSimilar,
  runMultiDatasetComparison,
  runDeregulatedGenes,
  runDeregulatedGenesMultiDataset,
  cancelTask,
} from "../api";
import { ModulePathNames } from "./enums";

const sanitizeInvalidJsonNumbers = (input) => {
  if (typeof input !== "string") {
    return input;
  }

  let sanitized = "";
  let inString = false;
  let escaping = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (!escaping && char === '"') {
      inString = !inString;
      sanitized += char;
      continue;
    }

    if (char === "\\" && !escaping) {
      escaping = true;
      sanitized += char;
      continue;
    }

    if (escaping) {
      escaping = false;
      sanitized += char;
      continue;
    }

    if (!inString) {
      if (input.startsWith("-Infinity", i)) {
        sanitized += "null";
        i += 8;
        continue;
      }
      if (input.startsWith("Infinity", i)) {
        sanitized += "null";
        i += 7;
        continue;
      }
      if (input.startsWith("NaN", i)) {
        sanitized += "null";
        i += 2;
        continue;
      }
    }

    sanitized += char;
  }

  return sanitized;
};

const resultState = {
  result: null,
  running: false,
  progressMessage: null,
  progressPercentage: null,
  taskId: null, // Store task ID for cancellation
};

const initialState = {
  pcaGraph: { ...resultState },
  mdeGraph: { ...resultState },
  umapGraph: { ...resultState },
  tsneGraph: { ...resultState },
  biClusteringGraph: { ...resultState },
  geneRegulationGraph: { ...resultState },
  geneRegulationEnhancedGraph: { ...resultState },
  pathFinderGraph: { ...resultState },
  corrCluster: { ...resultState },
  heatmapGraph: { ...resultState },
  enrichmentResults: { ...resultState },
  genesignatureGraph: { ...resultState },
  genesignatureMultiDataset: { ...resultState },
  genesignatureSimilarGraph: { ...resultState },
  geneExpressionGraph: { ...resultState },
  multiDatasetComparison: { ...resultState },
  precomputedDrGraph: { ...resultState },
  deregulatedGenesGraph: { ...resultState },
  deregulatedGenesMultiDataset: { ...resultState },
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
          const sanitizedResult = sanitizeInvalidJsonNumbers(result);
          parsedResult = JSON.parse(sanitizedResult);
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
      // Clear progress when calculation completes
      state[module].progressMessage = null;
      state[module].progressPercentage = null;
    },
    calcRunningChanged: (state, action) => {
      //console.log(state, action);
      const { module, status } = action.payload;
      //console.log(module, status);
      state[module].running = status;
      // Clear progress when calculation starts or stops
      if (!status) {
        state[module].progressMessage = null;
        state[module].progressPercentage = null;
      }
    },
    progressUpdateReceived: (state, action) => {
      const { module, message, percentage } = action.payload;
      state[module].progressMessage = message;
      state[module].progressPercentage = percentage;
    },
    clearResult: (state, action) => {
      const { module } = action.payload;
      if (state[module]) {
        state[module].result = null;
        state[module].running = false;
        state[module].progressMessage = null;
        state[module].progressPercentage = null;
        state[module].taskId = null;
      }
    },
    taskStarted: (state, action) => {
      const { module, taskId } = action.payload;
      if (state[module]) {
        state[module].taskId = taskId;
        state[module].running = true;
      }
    },
    taskCancelled: (state, action) => {
      const { module } = action.payload;
      if (state[module]) {
        state[module].running = false;
        state[module].progressMessage = null;
        state[module].progressPercentage = null;
        state[module].taskId = null;
      }
    },
  },
});

const calculationResultsReducer = calculationResults.reducer;

export const { 
  resultReceived, 
  calcRunningChanged, 
  progressUpdateReceived, 
  clearResult,
  taskStarted,
  taskCancelled,
} = calculationResults.actions;

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
    geneRegulationEnhanced,
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
      case ROUTES.GENE_REGULATION_ENHANCED: {
        const result = await runGeneRegulationEnhanced(core, geneRegulationEnhanced);
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
        // Validate that at least one dataset is selected
        if (!correlation?.selectedDatasets || correlation.selectedDatasets.length === 0) {
          throw new Error("Please select at least one dataset to calculate correlation.");
        }

        // Check if multiple datasets are selected
        if (correlation.selectedDatasets.length > 1) {
          // Prepare core params for multi-dataset mode
          const multiCore = {
            ...core,
            selectedDatasets: correlation.selectedDatasets,
          };
          const multiCorr = {
            ...correlation,
            combineMethod: correlation.combineMethod || "average",
          };
          const result = await runCorrCalcMultiDataset(multiCore, multiCorr);
          return dispatch(
            resultReceived({ result, module: ModulePathNames[module] })
          );
        } else {
          // Single dataset mode - use the selected dataset
          const singleCore = {
            ...core,
            cellLine: {
              ...core.cellLine,
              id: correlation.selectedDatasets[0],
            },
          };
          const result = await runCorrCalc(singleCore, correlation);
          return dispatch(
            resultReceived({ result, module: ModulePathNames[module] })
          );
        }
      }
      case ROUTES.EXPRESSIONANALYZER: {
        const result = await runGeneExp(core, expressionanalyzer);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.GENESIGNATURE: {
        // Clear downstream multi-dataset results when starting a new gene signature calculation
        dispatch(clearResult({ module: "genesignatureMultiDataset" }));
        dispatch(clearResult({ module: "genesignatureSimilarGraph" }));

        const result = await runGeneSignature(core);
        return dispatch(
          resultReceived({ result, module: ModulePathNames[module] })
        );
      }
      case ROUTES.DEREGULATED_GENES: {
        // Clear downstream multi-dataset results when starting a new deregulated genes calculation
        dispatch(clearResult({ module: "deregulatedGenesMultiDataset" }));

        const deregulatedGenesSettings = getState().settings.deregulatedGenes;
        const selectedDatasets = deregulatedGenesSettings.selectedDatasets || [];

        // If user selected specific datasets, use the first one as the active dataset for the single-dataset run
        const singleCore = selectedDatasets.length > 0
          ? { ...core, cellLine: { ...core.cellLine, id: selectedDatasets[0] } }
          : core;

        const result = await runDeregulatedGenes(singleCore, deregulatedGenesSettings);
        dispatch(resultReceived({ result, module: ModulePathNames[module] }));

        // Fire multi-dataset aggregation when more than one dataset is selected
        if (selectedDatasets.length > 1) {
          dispatch(calcRunningChanged({ module: "deregulatedGenesMultiDataset", status: true }));
          try {
            const multiResult = await runDeregulatedGenesMultiDataset(singleCore, deregulatedGenesSettings);
            dispatch(resultReceived({ result: multiResult, module: "deregulatedGenesMultiDataset" }));
          } catch (multiErr) {
            dispatch(calcRunningChanged({ module: "deregulatedGenesMultiDataset", status: false }));
            toast({
              message: {
                type: "Error",
                icon: true,
                content: "Multi-dataset calculation failed",
                details: multiErr.message,
              },
            });
          }
        }
        return;
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
    
    // Handle standardized error format from API
    const errorMessage = error.code 
      ? `${error.code}: ${error.message}` 
      : error.message || "An unknown error occurred";
    const errorDetails = error.details || {};
    
    toast({
      message: {
        type: "Error",
        icon: true,
        content: "Calculation failed",
        details: errorMessage,
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
      calcRunningChanged({ module: "genesignatureMultiDataset", status: true })
    );
    
    const result = await runGeneSignatureMultiDataset(core, settings);
    
    return dispatch(
      resultReceived({ result, module: "genesignatureMultiDataset" })
    );
  } catch (error) {
    dispatch(
      calcRunningChanged({ module: "genesignatureMultiDataset", status: false })
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

/**
 * Cancel a running calculation task.
 */
const cancelCalculation = (module) => async (dispatch, getState) => {
  const state = getState();
  const moduleName = module === ROUTES.DR 
    ? ModulePathNames["/" + state.settings.core.currentModule]
    : ModulePathNames[module];
  
  const taskId = state.calcResults[moduleName]?.taskId;
  
  if (!taskId) {
    console.warn(`No task ID found for module: ${moduleName}`);
    return;
  }
  
  try {
    await cancelTask(taskId);
    dispatch(taskCancelled({ module: moduleName }));
    dispatch(calcRunningChanged({ module: moduleName, status: false }));
    
    toast({
      message: {
        type: "Info",
        icon: true,
        content: "Calculation cancelled",
        details: "The calculation has been cancelled successfully.",
      },
    });
  } catch (error) {
    console.error("Error cancelling task:", error);
    toast({
      message: {
        type: "Error",
        icon: true,
        content: "Failed to cancel calculation",
        details: error.message || "Could not cancel the calculation.",
      },
    });
  }
};

export { calculationResultsReducer, runCalculation, runMultiDatasetGeneSignature, cancelCalculation };
