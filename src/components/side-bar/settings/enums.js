const SettingsTypes = {
  CORE_SETTINGS: 'Core Settings',
  CORRELATION_SETTINGS: 'Correlation Settings',
  PCA_SETTINGS: 'PCA Settings',
  CLUSTERING_SETTINGS: 'Clustering Settings',
  EMBEDDING_SETTINGS: 'Embedding Settings',
  UMAP_SETTINGS: 'UMAP Settings',
  TSNE_SETTINGS: 'tSNE Settings',
  BI_CLUSTERING_SETTINGS: 'biClustering Settings',
  GENE_REGULATION_SETTINGS: '',
  HEAT_MAP: 'HeatMap Settings',
  HEAT_MAP_TARGET_GENE_LIST: 'Target Gene List'
};

const BiClusteringSettingsTypes = {
  BI_CLUSTERING_SOURCE: 'biClusteringSource',
  CLUSTER_COUNT: 'clusterCount',
};

const ClusteringSettingsTypes = {
  SHOW_LEGEND: 'showLegend',
  SHOW_CLUSTER_CENTERS: 'showClusterCenters',
  HIGHLIGHT_CLUSTERS: 'highlightClusters',
  MINIMUM_CLUSTER_SIZE: 'minimumClusterSize',
  CLUSTERING_METRIC: 'clusteringMetric',
  CLUSTERING_METHOD: 'clusteringMethod',
  MINIMUM_SAMPLES: 'minimumSamples',
  CLUSTER_SELECTION_EPSILON: 'clusterSelectionEpsilon',
};

const PcaSettingsTypes = {
  PCA_SOURCE: 'pcaSource',
  NUMBER_OF_COMPONENTS: 'numberOfComponents',
  HDB_SCAN_CLUSTERING: 'hdbScanClustering',
};

const CoreSettingsTypes = {
  CELL_LINE: 'cellLine',
  DATA_TYPE: 'dataType',
  PETURBATION_LIST: 'peturbationList',
  GRAPH_TYPE: 'graphType',
  HIGHLIGHT_GENES: 'highlightGenes',
};

export {
  SettingsTypes,
  BiClusteringSettingsTypes,
  ClusteringSettingsTypes,
  PcaSettingsTypes,
  CoreSettingsTypes,
};
