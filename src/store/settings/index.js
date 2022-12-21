import { combineReducers } from "@reduxjs/toolkit";
import { coreSettingsReducer } from './core-settings';
import { embeddingSettingsReducer } from './embedding-settings';
import { genesetEnrichmentSettingsReducer } from './geneset-enrichment-settings';
import { umapSettingsReducer } from './umap-settings';
import { tsneSettingsReducer } from './tsne-settings';
import { biClusteringSettingsReducer } from './bi-clustering-settings';
import { geneRegulationCoreSettingsReducer } from './gene-regulation-core-settings';
import { pcaSettingsReducer } from './pca-settings';
import { clusteringSettingsReducer } from './clustering-settings';
import { correlationSettingsReducer } from './correlation-settings';
import { heatMapSettingsReducer } from './heatmap-settings';

const settingsReducer = combineReducers({
  core: coreSettingsReducer,
  embedding: embeddingSettingsReducer,
  genesetEnrichment: genesetEnrichmentSettingsReducer,
  umap: umapSettingsReducer,
  tsne: tsneSettingsReducer,
  biClustering: biClusteringSettingsReducer,
  geneRegulationCore: geneRegulationCoreSettingsReducer,
  pca: pcaSettingsReducer,
  clustering: clusteringSettingsReducer,
  correlation: correlationSettingsReducer,
  heatMap: heatMapSettingsReducer
});

export { settingsReducer };
