import { combineReducers } from "@reduxjs/toolkit";
import { coreSettingsReducer } from "./core-settings";
import { mdeSettingsReducer } from "./mde-settings";
import { genesetEnrichmentSettingsReducer } from "./geneset-enrichment-settings";
import { umapSettingsReducer } from "./umap-settings";
import { tsneSettingsReducer } from "./tsne-settings";
import { biClusteringSettingsReducer } from "./bi-clustering-settings";
import { geneRegulationCoreSettingsReducer } from "./gene-regulation-core-settings";
import { geneRegulationEnhancedSettingsReducer } from "./gene-regulation-enhanced-settings";
import { pcaSettingsReducer } from "./pca-settings";
import { clusteringSettingsReducer } from "./clustering-settings";
import { correlationSettingsReducer } from "./correlation-settings";
import { heatMapSettingsReducer } from "./heatmap-settings";
import { inchlibSettingsReducer } from "./inchlib-settings";
import { pathfinderSettingsReducer } from "./pathfinder-settings";
import { graphmapSettingsReducer } from "./graphmap-settings";
import { scatterplotSettingsReducer } from "./scatterplot-settings";
import { genesignatureSettingsReducer } from "./gene-signature-settings";
import { expressionanalyzerSettingsReducer } from "./expression-analyzer-settings";
import { genelistcompareSettingsReducer } from "./genelist-compare-settings";
import { multidatasetComparisonSettingsReducer } from "./multidataset-comparison-settings";
import { precomputedDrSettingsReducer } from "./precomputed-dr-settings";
const settingsReducer = combineReducers({
  core: coreSettingsReducer,
  mde: mdeSettingsReducer,
  genesetEnrichment: genesetEnrichmentSettingsReducer,
  umap: umapSettingsReducer,
  tsne: tsneSettingsReducer,
  biClustering: biClusteringSettingsReducer,
  geneRegulationCore: geneRegulationCoreSettingsReducer,
  geneRegulationEnhanced: geneRegulationEnhancedSettingsReducer,
  pca: pcaSettingsReducer,
  clustering: clusteringSettingsReducer,
  correlation: correlationSettingsReducer,
  heatMap: heatMapSettingsReducer,
  inchlib: inchlibSettingsReducer,
  pathfinder: pathfinderSettingsReducer,
  graphmap: graphmapSettingsReducer,
  scatterplot: scatterplotSettingsReducer,
  genesignature: genesignatureSettingsReducer,
  expressionanalyzer: expressionanalyzerSettingsReducer,
  genelistcompare: genelistcompareSettingsReducer,
  multidatasetComparison: multidatasetComparisonSettingsReducer,
  precomputedDr: precomputedDrSettingsReducer,
});

export { settingsReducer };
