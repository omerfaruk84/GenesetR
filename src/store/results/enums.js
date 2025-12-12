import { ROUTES } from "../../common/routes";

const ModulePathNames = {
  [ROUTES.PCA]: "pcaGraph",
  [ROUTES.MDE]: "mdeGraph",
  [ROUTES.UMAP]: "umapGraph",
  [ROUTES.TSNE]: "tsneGraph",
  [ROUTES.BI_CLUSTERING]: "biClusteringGraph",
  [ROUTES.GENE_REGULATION]: "geneRegulationGraph",
  [ROUTES.GENE_REGULATION_ENHANCED]: "geneRegulationEnhancedGraph",
  [ROUTES.EXPRESSIONANALYZER]: "geneExpressionGraph",
  [ROUTES.PATHFINDER]: "pathFinderGraph",
  [ROUTES.CORRELATION]: "corrCluster",
  [ROUTES.HEATMAP]: "heatmapGraph",
  [ROUTES.GENESIGNATURE]: "genesignatureGraph",
  [ROUTES.MULTIDATASET_COMPARISON]: "multiDatasetComparison",
  [ROUTES.PERTURBATION_SIGNATURES]: "perturbationSignaturesGraph",
};

export { ModulePathNames };
