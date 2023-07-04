import { combineReducers } from "@reduxjs/toolkit";
import { coreSettingsReducer } from './core-settings';
import { mdeSettingsReducer } from './mde-settings';
import { genesetEnrichmentSettingsReducer } from './geneset-enrichment-settings';
import { umapSettingsReducer } from './umap-settings';
import { tsneSettingsReducer } from './tsne-settings';
import { biClusteringSettingsReducer } from './bi-clustering-settings';
import { geneRegulationCoreSettingsReducer } from './gene-regulation-core-settings';
import { pcaSettingsReducer } from './pca-settings';
import { clusteringSettingsReducer } from './clustering-settings';
import { correlationSettingsReducer } from './correlation-settings';
import { heatMapSettingsReducer } from './heatmap-settings';
import { pathfinderSettingsReducer } from './pathfinder-settings';
import { graphmapSettingsReducer } from './graphmap-settings';
import { scatterplotSettingsReducer } from './scatterplot-settings';
import { genesignatureSettingsReducer } from './gene-signature-settings';
const settingsReducer = combineReducers({
  core: coreSettingsReducer,
  mde: mdeSettingsReducer,
  genesetEnrichment: genesetEnrichmentSettingsReducer,
  umap: umapSettingsReducer,
  tsne: tsneSettingsReducer,
  biClustering: biClusteringSettingsReducer,
  geneRegulationCore: geneRegulationCoreSettingsReducer,
  pca: pcaSettingsReducer,
  clustering: clusteringSettingsReducer,
  correlation: correlationSettingsReducer,
  heatMap: heatMapSettingsReducer,
  pathfinder: pathfinderSettingsReducer,
  graphmap: graphmapSettingsReducer,
  scatterplot: scatterplotSettingsReducer,
  genesignature: genesignatureSettingsReducer,
});

export { settingsReducer };
