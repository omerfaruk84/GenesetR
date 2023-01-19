const SettingsTypes = {
  CORE_SETTINGS: 'Core Settings',
  CORRELATION_SETTINGS: 'Correlation Settings',
  PCA_SETTINGS: 'PCA Settings',
  CLUSTERING_SETTINGS: 'Clustering Settings',
  MDE_SETTINGS: 'MDE Settings',
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
  MINIMUM_CLUSTER_SIZE: 'minimumClusterSize',
  CLUSTERING_METRIC: 'clusteringMetric',
  CLUSTERING_METHOD: 'clusteringMethod',
  MINIMUM_SAMPLES: 'minimumSamples',
  CLUSTER_SELECTION_EPSILON: 'clusterSelectionEpsilon',
};

const PcaSettingsTypes = {
  NUMBER_OF_COMPONENTS: 'numberOfComponents',
};

const CoreSettingsTypes = {
  CELL_LINE: 'cellLine',
  DATA_TYPE: 'dataType',
  PETURBATION_LIST: 'peturbationList',
  GRAPH_TYPE: 'graphType',
};

const CorrelationSettingsTypes = {
  REMOVE_LOW_CORRELATION: 'removeLowCorrelation',
  MIN_CORRELATION: 'minCorrelation',
  LINKAGE_METHOD: 'linkageMethod',
  DISTANCE_METRIC: 'distanceMetric',
  MAP_COLOR: 'mapColor',
  Z_SCORE_NORMALIZATION: 'zScoreNormalization',
  STANDARDIZATION: 'standardization',
  COLORING_RANGE: 'coloringRange',
  SIZE: 'size',
};

const MdeSettingsTypes = {
  EMBEDDING_SOURCE: 'embedingSource',
  DIMENSION_COUNT: 'dimensionCount',
  MDE_CONTRSAINT: 'mdeContrsaint',
  REPULSIVE_FRACTION: 'repulsiveFraction',
};

const UmapSettingsTypes = {
  UMAP_SOURCE: 'umapSource',
  DIMENSION_COUNT: 'dimensionCount',
  MINIMUM_DISTANCE: 'minimumDistance',
  NUMBER_OF_NEIGHBOURS: 'numberOfNeighbours',
};

const TsneSettingsTypes = {
  TSNE_SOURCE: 'tsneSource',
  PERPLEXITY: 'perplexity',
  LEARNING_RATE: 'learningRate',
  NUMBER_OF_ITERATIONS: 'numberOfIterations',
  EARLY_EXAGGERATION: 'earlyExaggeration',
};

const GeneRegulationCoreSettingsTypes = {
  SELECTED_GENE: 'selectedGene',
  ABSOLUTE_Z_SCORE: 'absoluteZScore',
};

const HeatMapSettingsTypes = {
  ROW_DISTANCE:'row_distance',
  COLUMN_DISTANCE:'column_distance',
  ROW_LINKAGE: 'row_linkage',
  COLUMN_LINKAGE: 'column_linkage',
  AXIS: 'axis',
  MAP_COLOR: 'mapColor', 
  NORMALIZE : 'normalize',
  COLORING_RANGE: 'coloringRange',
  WRITE_ORGINAL : 'write_original',
  TARGET_GENE_LIST: 'targetGeneList',
  FILTER: 'filter',
};

export {
  SettingsTypes,
  BiClusteringSettingsTypes,
  ClusteringSettingsTypes,
  PcaSettingsTypes,
  CoreSettingsTypes,
  CorrelationSettingsTypes,
  MdeSettingsTypes,
  UmapSettingsTypes,
  TsneSettingsTypes,
  GeneRegulationCoreSettingsTypes,
  HeatMapSettingsTypes,
};
