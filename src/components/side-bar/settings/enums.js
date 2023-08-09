const SettingsTypes = {
  CORE_SETTINGS: "Core Settings",
  CORRELATION_SETTINGS: "Correlation Settings",
  PCA_SETTINGS: "PCA Settings",
  CLUSTERING_SETTINGS: "Clustering Settings",
  MDE_SETTINGS: "MDE Settings",
  UMAP_SETTINGS: "UMAP Settings",
  TSNE_SETTINGS: "tSNE Settings",
  BI_CLUSTERING_SETTINGS: "biClustering Settings",
  HEAT_MAP: "HeatMap Settings",
  HEAT_MAP_TARGET_GENE_LIST: "Target Gene List",
  PATH_FINDER_SETTINGS: "PathFinder Settings",
  GRAPHMAP_SETTINGS: "GraphMap Settings",
  SCATTERPLOT_SETTINGS: "Scatter Plot Settings",
  GENESETENRICHMENT_SETTINGS: "GeneSet Enrichment Settings",
  GENE_SIGNATURE_SETTINGS: "Gene Signature Settings",
};

const BiClusteringSettingsTypes = {
  CLUSTER_COUNT: "n_clusters",
  INIT_COUNT: "n_init",
};

const ClusteringSettingsTypes = {
  MINIMUM_CLUSTER_SIZE: "minimumClusterSize",
  CLUSTERING_METRIC: "clusteringMetric",
  CLUSTERING_METHOD: "clusteringMethod",
  MINIMUM_SAMPLES: "minimumSamples",
  CLUSTER_SELECTION_EPSILON: "clusterSelectionEpsilon",
};

const PcaSettingsTypes = {
  NUMBER_OF_COMPONENTS: "numberOfComponents",
};

const CoreSettingsTypes = {
  CELL_LINE: "cellLine",
  DATA_TYPE: "dataType",
  PETURBATION_LIST: "peturbationList",
  TARGET_LIST: "targetGeneList",
  GRAPH_TYPE: "graphType",
  DATASETLIST: "datasetList",
  CURRENT_MODULE: "currentModule"
};

const GraphmapSettingsTypes = {
  REPULSION: "repulsion",
  LAYOUT: "layout",
  ISOLATED_NODES: "isolatednodes",
  TARGET_LIST: "targetGeneList",
  GRAPH_TYPE: "graphType",
};

const CorrelationSettingsTypes = {
  FILTER: "filter",
  ROW_DISTANCE: "row_distance",
  COLUMN_DISTANCE: "column_distance",
  ROW_LINKAGE: "row_linkage",
  COLUMN_LINKAGE: "column_linkage",
  AXIS: "axis",
  NORMALIZE: "normalize",
  WRITE_ORGINAL: "write_original",
  CORRTYPE: "corrType",
};

const MdeSettingsTypes = {
  NUMBER_OF_COMPONENTS: "numcomponents",
  PREPROCESSING_METHOD: "preprocessingMethod",
  MDE_CONTRSAINT: "pyMdeConstraint",
  REPULSIVE_FRACTION: "repulsiveFraction",
};

const UmapSettingsTypes = {
  NUMBER_OF_COMPONENTS: "numcomponents",
  MINIMUM_DISTANCE: "min_dist",
  NUMBER_OF_NEIGHBOURS: "n_neighbors",
  METRIC: "metric",
};

const TsneSettingsTypes = {
  NUMBER_OF_COMPONENTS: "numcomponents",
  METRIC: "metric",
  PERPLEXITY: "perplexity",
  EARLY_EXAGGERATION: "earlyExaggeration",
  LEARNING_RATE: "learning_rate",
  NUMBER_OF_ITERATIONS: "n_iter",
};

const GeneRegulationCoreSettingsTypes = {
  SELECTED_GENE: "selectedGene",
  ABSOLUTE_Z_SCORE: "absoluteZScore",
  CORR_CUTOFF: "corr_cutoff",
  INCLUDE_CORR: "include_corr",
  INCLUDE_EXP: "include_exp",
  AMONG_DPR:"among_dpr",
  AMONG_UPR:"among_upr",
  AMONG_DNR:"among_dnr",
  AMONG_UNR:"among_unr",
  UNR_DNR:"unr_dnr",
  UNR_DPR:"unr_dpr",
  UPR_DNR:"upr_dnr",
  UPR_DPR:"upr_dpr",
  UPR_UNR:"upr_unr",
  UNR_UPR:"unr_upr",
  DPR_DNR:"dpr_dnr",
  DNR_DPR:"dnr_dpr",
  UPR:"upr",
  DPR:"dpr",
  UNR:"unr",
  DNR:"dnr",
  NEIGHBOUR_COUNT: "neighbourCount",
  ONLY_LINKED: "onlyLinked",
  BASED_ON_FINAL: "basedOnFinal",
  FILTER_BLACKLISTED:"filterBlackListed",
  FILTER_BLACKLISTEDEXP:"filterBlackListedExp",
  FILTER1_ENABLED:"filter1Enabled",
  FILTER2_ENABLED:"filter2Enabled",
  FILTER3_ENABLED:"filter3Enabled",
  FILTER4_ENABLED:"filter4Enabled",
  FILTER5_ENABLED:"filter5Enabled",
  FILTER1_DIRECTIONAL:"filter1Directional",
  FILTER2_DIRECTIONAL:"filter2Directional", 
  FILTER_COUNT1:"filterCount1",
  FILTER_COUNT2:"filterCount2",
  FILTER_COUNT5:"filterCount5",
  DAGRE_SEPERATION:"dagreSeperation", 
  REPULSION: "repulsion",
  LAYOUT: "layout",
  ISOLATED_NODES: "isolatednodes",
};

const HeatMapSettingsTypes = {
  ROW_DISTANCE: "row_distance",
  COLUMN_DISTANCE: "column_distance",
  ROW_LINKAGE: "row_linkage",
  COLUMN_LINKAGE: "column_linkage",
  AXIS: "axis",
  NORMALIZE: "normalize",
  WRITE_ORGINAL: "write_original",
};

const PathFinderSettingsTypes = {
  UPREGULATED_GENES: "upgeneList",
  CUTOFF: "cutoff",
  DEPTH: "depth",
  CHECK_CORR: "checkCorr",
  CORR_CUTOFF: "corrCutOff",
  CHECK_BIOGRID: "BioGridData",
  REPULSION: "repulsion",
  LAYOUT: "layout",
  ISOLATED_NODES: "isolatednodes",
  SHOW_LABELS:"showLabels",
  MAX_NODE_SIZE: "maxNodeSize",
  LABEL_SIZE: "labelSize",
  MIN_NEIGHBOUR_COUNT: "minNeighbourCount",
  MINIMUM_EDGE_OPACITY:"minEdgeopacity", 
  MINIMUM_NODE_OPACITY:"minNodeopacity",   
  DAGRE_SEPERATION:"dagreSeperation",  
};

const ScatterPlotSettingsTypes = {
  GENES_TO_LABEL: "genesTolabel",

  HIGHLIGHT_CLUSTERS: "highlightClusters",
  SYMBOL_SIZE: "symbolSize",
  CLUSTER_PROB: "clusterProb",
  LABEL_LOC: "labelLoc",
  LABEL_SIZE: "labelSize",
  SHOW_LABELS: "showLabels",
  AUTOROTATE: "autorotate",
  ROTATION_SPEED: "rotationSpeed",
  PROJECTION: "projection",
};

const GeneSetEnrichmentSettingsTypes = {
  DATASETS: "gseaDatasets",
  GENELIST: "genes",
};

const GeneSignatureSettingsTypes = {  
  FILTER_BLACKLISTED:"filterBlackListed",
  FILTER: "filter",  
  GENES_TO_LABEL: "genesTolabel",
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
  GraphmapSettingsTypes,
  ScatterPlotSettingsTypes,
  GeneSetEnrichmentSettingsTypes,
  GeneSignatureSettingsTypes,
};
