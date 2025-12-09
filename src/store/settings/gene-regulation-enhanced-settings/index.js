import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedGene: "ATF4",
  // Multi-experiment settings
  selectedExperiments: ["K562gwps"], // Array of selected experiment IDs
  experimentWeights: [1.0], // Corresponding weights for each experiment
  combineMethod: "weighted_mean", // "weighted_mean", "median", "rank_mean"
  
  // Threshold settings
  zFilter: 0.25,
  corrFilter: 0.25,
  
  // Top-K caps for adaptive filtering
  topkUpstream: 50,
  topkDownstream: 100,
  corrTopk: 100,
  
  // Graph size limits
  maxNodes: 400,
  maxEdges: 2000,
  
  // Display options
  includeExp: true,
  includeCorr: true,
  
  // Graph layout settings
  layout: "force",
  repulsion: 100,
  dagreSeperation: 200,
  isolatedNodes: false,
  
  // Enhanced visualization settings
  networkRenderer: "Cytoscape", // "Cytoscape", "Sigma", "ReactFlow", "ForceGraph2D"
  nodeStyle: "category", // "category", "degree", "knockdown", "mixed"
  edgeStyle: "type", // "type", "correlation", "zscore", "uniform"
  graphHeight: 640,
  showLegend: true,
  animateCorrelations: true,
  
  // Edge type filters
  upr: true,
  dpr: true,
  unr: true,
  dnr: true,
  upr_dpr: true,
  upr_dnr: true,
  unr_dpr: true,
  unr_dnr: true,
  upr_unr: true,
  unr_upr: true,
  dpr_dnr: true,
  dnr_dpr: true,
  among_dpr: true,
  among_upr: true,
  among_dnr: true,
  among_unr: true,
  
  // Simplified view settings
  simplifiedViewEnabled: false,
  simplifiedViewMinNeighbors: 1,
};

export const geneRegulationEnhancedSettingsSlice = createSlice({
  name: "geneRegulationEnhanced",
  initialState,
  reducers: {
    geneRegulationEnhancedSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
    updateExperimentSelection: (state, action) => {
      const { experiments, weights } = action.payload;
      state.selectedExperiments = experiments;
      state.experimentWeights = weights || experiments.map(() => 1.0);
    },
    addExperiment: (state, action) => {
      const { experimentId, weight } = action.payload;
      if (!state.selectedExperiments.includes(experimentId)) {
        state.selectedExperiments.push(experimentId);
        state.experimentWeights.push(weight || 1.0);
      }
    },
    removeExperiment: (state, action) => {
      const { experimentId } = action.payload;
      const index = state.selectedExperiments.indexOf(experimentId);
      if (index !== -1) {
        state.selectedExperiments.splice(index, 1);
        state.experimentWeights.splice(index, 1);
      }
    },
    updateExperimentWeight: (state, action) => {
      const { experimentId, weight } = action.payload;
      const index = state.selectedExperiments.indexOf(experimentId);
      if (index !== -1) {
        state.experimentWeights[index] = weight;
      }
    },
  },
});

export const { 
  geneRegulationEnhancedSettingsChanged,
  updateExperimentSelection,
  addExperiment,
  removeExperiment,
  updateExperimentWeight,
} = geneRegulationEnhancedSettingsSlice.actions;

const geneRegulationEnhancedSettingsReducer = geneRegulationEnhancedSettingsSlice.reducer;

export { geneRegulationEnhancedSettingsReducer }; 