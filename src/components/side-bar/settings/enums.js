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
  HEAT_MAP_TARGET_GENE_LIST: 'Target Gene List',
  PATH_FINDER_SETTINGS: 'PathFinder Settings',
};

const BiClusteringSettingsTypes = {
  CLUSTER_COUNT: 'n_clusters',
  INIT_COUNT: 'n_init',
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
  FILTER: 'filter',
  ROW_DISTANCE:'row_distance',
  COLUMN_DISTANCE:'column_distance',
  ROW_LINKAGE: 'row_linkage',
  COLUMN_LINKAGE: 'column_linkage',
  AXIS: 'axis', 
  NORMALIZE : 'normalize',
  WRITE_ORGINAL : 'write_original',
};

const MdeSettingsTypes = {
  NUMBER_OF_COMPONENTS: 'numcomponents',
  PREPROCESSING_METHOD: 'preprocessingMethod',
  MDE_CONTRSAINT: 'pyMdeConstraint',
  REPULSIVE_FRACTION: 'repulsiveFraction',
};

const UmapSettingsTypes = {
  NUMBER_OF_COMPONENTS: 'numcomponents',
  MINIMUM_DISTANCE: 'min_dist',
  NUMBER_OF_NEIGHBOURS: 'n_neighbors',
  METRIC: 'metric',
};

const TsneSettingsTypes = {
  NUMBER_OF_COMPONENTS: 'numcomponents',
  METRIC: 'metric',
  PERPLEXITY: 'perplexity',
  EARLY_EXAGGERATION: 'earlyExaggeration',
  LEARNING_RATE: 'learning_rate',
  NUMBER_OF_ITERATIONS: 'n_iter', 
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
  NORMALIZE : 'normalize',
  WRITE_ORGINAL : 'write_original',
};

const PathFinderSettingsTypes = {
  UPREGULATED_GENES:'upgeneList',
  CUTOFF:'cutoff',
  DEPTH: 'depth',
  CHECK_CORR: 'checkCorr',
  CORR_CUTOFF: 'corrCutOff',
  CHECK_BIOGRID : 'BioGridData',
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
  PathFinderSettingsTypes,
};
