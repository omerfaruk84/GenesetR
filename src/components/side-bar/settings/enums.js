const SettingsTypes = {
  CORE_SETTINGS: "Core Settings",
  CORRELATION_SETTINGS: "Correlation Settings",
  DR_METHOD_SELECTOR: "DR Method Selector",
  PCA_SETTINGS: "PCA Settings",
  CLUSTERING_SETTINGS: "Clustering Settings",
  MDE_SETTINGS: "MDE Settings",
  UMAP_SETTINGS: "UMAP Settings",
  TSNE_SETTINGS: "tSNE Settings",
  BI_CLUSTERING_SETTINGS: "Clustering Settings",
  HEAT_MAP: "HeatMap Settings",
  HEAT_MAP_TARGET_GENE_LIST: "Target Gene List",
  INCHLIB_SETTINGS: "Inchlib Settings",
  PATH_FINDER_SETTINGS: "Path Explorer Settings",
  GRAPHMAP_SETTINGS: "Gene Regulation Settings",
  SCATTERPLOT_SETTINGS: "Scatter Plot Settings",
  GENESETENRICHMENT_SETTINGS: "GSEA Settings",
  GENE_SIGNATURE_SETTINGS: "Gene Signature Settings",
  EXPRESSION_ANALYZER_SETTINGS: "Expression Analyzer Settings",
  GENELIST_COMPARE_SETTINGS: "Genelist Comparer Settings",
  MULTIDATASET_COMPARISON_SETTINGS: "Multi-Dataset Comparison Settings",
  PRECOMPUTED_DR_SETTINGS: "Pre-computed DR Settings",
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
  CURRENT_MODULE: "currentModule",
  MIXSCAPE_PERTURBED: "mixscapePerturbed",
  MIXSCAPE_ALL: "mixscapeAll",
  DATASET_ADDED: "datasetAdded",
  LAST_TASK_ID: "lastTaskID",
  SELECTED_DATASETS: "selectedDatasets",
};

const GraphmapSettingsTypes = {
  REPULSION: "repulsion",
  LAYOUT: "layout",
  ISOLATED_NODES: "isolatednodes",
  TARGET_LIST: "targetGeneList",
  GRAPH_TYPE: "graphType",
};

const CorrelationSettingsTypes = {
  ROW_DISTANCE: "row_distance",
  COLUMN_DISTANCE: "column_distance",
  ROW_LINKAGE: "row_linkage",
  COLUMN_LINKAGE: "column_linkage",
  AXIS: "axis",
  NORMALIZE: "normalize",
  WRITE_ORGINAL: "write_original",
  CORRTYPE: "corrType",
  ROW_COL_SAMEORDER: "row_col_sameorder",
  TRIM_ENABLED: "trimEnabled",
  TRIM_THRESHOLD: "trimThreshold",
  SELECTED_DATASETS: "selectedDatasets",
  COMBINE_METHOD: "combineMethod",
};
const InchlibSettingsTypes = {
  COLOR_SCALE: "color_scale",
  WIDTH_RATIO: "width_ratio",
  DRAW_ROW_IDS: "draw_row_ids",
  SHOW_COLUMN_NAMES: "show_column_names",
  SHOW_ROW_DENDROGRAM: "show_row_dendrogram",
  SHOW_COLUMN_DENDROGRAM: "show_column_dendrogram",
  COLOR_PERCENTILE_MIN: "color_percentile_min", 
  COLOR_PERCENTILE_MAX: "color_percentile_max", 
  MAX_COLUMN_WIDTH: "max_column_width",
  MAX_ROW_HEIGHT: "max_row_height",
  SHOW_CELL_VALUES: "show_cell_values",
  MAX_DENDROGRAM_WIDTH: "max_dendrogram_width",
  MAX_DENDROGRAM_HEIGHT: "max_dendrogram_height",
  DENDROGRAM_LINE_WIDTH: "dendrogram_line_width",
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
  AMONG_DPR: "among_dpr",
  AMONG_UPR: "among_upr",
  AMONG_DNR: "among_dnr",
  AMONG_UNR: "among_unr",
  UNR_DNR: "unr_dnr",
  UNR_DPR: "unr_dpr",
  UPR_DNR: "upr_dnr",
  UPR_DPR: "upr_dpr",
  UPR_UNR: "upr_unr",
  UNR_UPR: "unr_upr",
  DPR_DNR: "dpr_dnr",
  DNR_DPR: "dnr_dpr",
  UPR: "upr",
  DPR: "dpr",
  UNR: "unr",
  DNR: "dnr",
  NEIGHBOUR_COUNT: "neighbourCount",
  ONLY_LINKED: "onlyLinked",
  BASED_ON_FINAL: "basedOnFinal",
  FILTER_BLACKLISTED: "filterBlackListed",
  FILTER_BLACKLISTEDEXP: "filterBlackListedExp",
  FILTER1_ENABLED: "filter1Enabled",
  FILTER2_ENABLED: "filter2Enabled",
  FILTER3_ENABLED: "filter3Enabled",
  FILTER4_ENABLED: "filter4Enabled",
  FILTER5_ENABLED: "filter5Enabled",
  FILTER1_DIRECTIONAL: "filter1Directional",
  FILTER2_DIRECTIONAL: "filter2Directional",
  FILTER_COUNT1: "filterCount1",
  FILTER_COUNT2: "filterCount2",
  FILTER_COUNT5: "filterCount5",
  DAGRE_SEPERATION: "dagreSeperation",
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
  SHOW_LABELS: "showLabels",
  MAX_NODE_SIZE: "maxNodeSize",
  LABEL_SIZE: "labelSize",
  MIN_NEIGHBOUR_COUNT: "minNeighbourCount",
  MINIMUM_EDGE_OPACITY: "minEdgeopacity",
  MINIMUM_NODE_OPACITY: "minNodeopacity",
  DAGRE_SEPERATION: "dagreSeperation",
  // Noise filter settings
  FILTER_BLACKLISTED: "filterBlackListed",
  FILTER_BLACKLISTED_EXP: "filterBlackListedExp",
  FILTER_COUNT: "filterCount",
  FILTER_COUNT_EXP: "filterCountExp",
  FILTER1_ENABLED: "filter1Enabled",
  FILTER2_ENABLED: "filter2Enabled",
  FILTER3_ENABLED: "filter3Enabled",
  FILTER4_ENABLED: "filter4Enabled",
  FILTER1_DIRECTIONAL: "filter1Directional",
  FILTER2_DIRECTIONAL: "filter2Directional",
  MAX_NODES: "maxNodes",
  SELECTED_DATASETS: "selectedDatasets",
  COMBINATION_STRATEGY: "combinationStrategy",
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
  ISBARGRAPH: "isBargraph",
};

const GeneSignatureSettingsTypes = {
  FILTER_BLACKLISTED: "filterBlackListed",
  FILTER: "filter",
  GENES_TO_LABEL: "genesTolabel",
};

const ExpressionAnalyzerSettingsTypes = {
  FILTER_BLACKLISTED: "filterBlackListed",
  GENES_TO_LABEL: "genesTolabel",
  SELECTED_GENE: "selectedGene",
  CORRTYPE: "corrType",
  TARGET_LIST: "targetList",
  ABSOLUTE_Z_SCORE: "absoluteZScore",
  CORR_CUTOFF: "corr_cutoff",
  HIGHLIGHT_LIST: "highlightList",
};

const GenelistCompareSettingsTypes = {
  SHOWVENN: "showvenn",
  SHOW: "showcomparison",
  GENELISTS: "genelists",
  SELECTEDLISTS: "selectedlists",
  MODE: "mode",
  THEME: "theme",
  ORDER: "order",
  MINSETMEMBER: "minsetmember",
  MAXSETMEMBER: "maxsetmember",
  BARPADDING: "barpadding",
  DOTPADDING: "dotpadding",
  CHARTFONTSIZE: "chartfontsize",
  LABELFONTSIZE: "labelfontsize",
  SETLABELFONTSIZE: "setlabelfontsize", // New: specific font size for set labels
  VENNDIAGRAMFONTSIZE: "venndiagramfontsize", // New: font size for Venn diagram text
  FONTFAMILY: "fontfamily", // New: font family setting
  FONTWEIGHT: "fontweight", // New: font weight setting
  FONTSTYLE: "fontstyle", // New: font style setting
  SETHEIGHTRATIO: "setheightratio",
  SETWIDTHRATIO: "setwidthtratio",
  SETTOLABEL: "settolabel",
  WIDTHRATIOS: "widthRatios",
};

const MultiDatasetComparisonSettingsTypes = {
  SELECTED_GENE: "selectedGene",
  CORR_TYPE: "corrType",
  TARGET_LIST: "targetList",
  FILTER: "filter",
  FILTER_BLACKLISTED: "filterBlackListed",
};

const PrecomputedDrSettingsTypes = {
  HVG_STRATEGY: "hvgStrategy",
  N_HVGS: "nHvgs",
  DR_METHOD: "drMethod",
  SELECTED_CELL_LINES: "selectedCellLines",
  COLOR_BY: "colorBy",
  CONCATENATION_MODE: "concatenationMode",
  N_TOP_GENE_CELLLINES: "nTopGeneCelllines",
  USE_COMMON_PERTURBATIONS: "useCommonPerturbations",
  USE_BATCH_CORRECTION: "useBatchCorrection",
  BATCH_CORRECTION_THETA: "batchCorrectionTheta",
  BATCH_CORRECTION_MAX_ITER: "batchCorrectionMaxIter",
};

const GeneRegulationEnhancedSettingsTypes = {
  SELECTED_GENE: "selectedGene",
  SELECTED_EXPERIMENTS: "selectedExperiments",
  EXPERIMENT_WEIGHTS: "experimentWeights",
  COMBINE_METHOD: "combineMethod",
  Z_FILTER: "zFilter",
  CORR_FILTER: "corrFilter",
  TOPK_UPSTREAM: "topkUpstream",
  TOPK_DOWNSTREAM: "topkDownstream",
  CORR_TOPK: "corrTopk",
  MAX_NODES: "maxNodes",
  MAX_EDGES: "maxEdges",
  INCLUDE_EXP: "includeExp",
  INCLUDE_CORR: "includeCorr",
  LAYOUT: "layout",
  REPULSION: "repulsion",
  DAGRE_SEPERATION: "dagreSeperation",
  ISOLATED_NODES: "isolatedNodes",
  UPR: "upr",
  DPR: "dpr",
  UNR: "unr",
  DNR: "dnr",
  UPR_DPR: "upr_dpr",
  UPR_DNR: "upr_dnr",
  UNR_DPR: "unr_dpr",
  UNR_DNR: "unr_dnr",
  UPR_UNR: "upr_unr",
  UNR_UPR: "unr_upr",
  DPR_DNR: "dpr_dnr",
  DNR_DPR: "dnr_dpr",
  AMONG_DPR: "among_dpr",
  AMONG_UPR: "among_upr",
  AMONG_DNR: "among_dnr",
  AMONG_UNR: "among_unr",
  // Enhanced visualization settings
  NETWORK_RENDERER: "networkRenderer",
  NODE_STYLE: "nodeStyle",
  EDGE_STYLE: "edgeStyle",
  GRAPH_HEIGHT: "graphHeight",
  SHOW_LEGEND: "showLegend",
  ANIMATE_CORRELATIONS: "animateCorrelations",
  SIMPLIFIED_VIEW_ENABLED: "simplifiedViewEnabled",
  SIMPLIFIED_VIEW_MIN_NEIGHBORS: "simplifiedViewMinNeighbors",
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
  GeneRegulationEnhancedSettingsTypes,
  HeatMapSettingsTypes,
  PathFinderSettingsTypes,
  GraphmapSettingsTypes,
  ScatterPlotSettingsTypes,
  GeneSetEnrichmentSettingsTypes,
  GeneSignatureSettingsTypes,
  ExpressionAnalyzerSettingsTypes,
  PrecomputedDrSettingsTypes,
  GenelistCompareSettingsTypes,
  InchlibSettingsTypes,
  MultiDatasetComparisonSettingsTypes,
};
