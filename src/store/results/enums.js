import { ROUTES } from "../../common/routes";

const ModulePathNames = {
  [ROUTES.PCA]: 'pcaGraph',
  [ROUTES.MDE]: 'mdeGraph',
  [ROUTES.UMAP]: 'umapGraph',
  [ROUTES.TSNE]: 'tsneGraph',
  [ROUTES.BI_CLUSTERING]: 'biClusteringGraph',
  [ROUTES.GENE_REGULATION]: 'geneRegulationGraph',
  [ROUTES.PATHFINDER]: 'pathFinderGraph',
  [ROUTES.CORRELATION]: 'corrCluster',
  [ROUTES.HEATMAP]: 'heatmapGraph',
  [ROUTES.GENESIGNATURE]: 'genesignatureGraph',
};

export { ModulePathNames };
