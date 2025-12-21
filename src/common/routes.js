const ROUTES = Object.freeze({
  HOME: "/",
  CORRELATION: "/correlation",
  DR: "/dr",
  PCA: "/pca",
  MDE: "/mde",
  UMAP: "/umap",
  TSNE: "/tsne",
  BI_CLUSTERING: "/bi-clustering",
  GENE_REGULATION: "/gene-regulation",
  GENE_REGULATION_ENHANCED: "/gene-regulation-enhanced",
  HEATMAP: "/heatmap",
  PATHFINDER: "/pathfinder",
  GENESIGNATURE: "/genesignature",
  EXPRESSIONANALYZER: "/expressionanalyzer",
  GENELISTCOMPARE: "/genelists",
  MULTIDATASET_COMPARISON: "/multidataset-comparison",
  DEREGULATED_GENES: "/deregulated-genes",
  CELL_CYCLE: "/cell-cycle",
  UPLOAD_DATASET: "/upload-dataset",
  ABOUTUS: "/about",
});

const normalizePath = (path) => {
  if (!path) {
    return "/";
  }
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
};

/**
 * This function will check the current path (url) and the navigation elements path
 * if they are equal then thats the active tab in the top bar, otherwise will return false
 * @param {string} currentPath Url current path
 * @param {string} navPath Nav element path
 * @returns Boolean
 */
export const isActiveTab = (currentPath, navPath) => {
  const normalizedCurrent = normalizePath(currentPath);
  const normalizedNav = normalizePath(navPath);

  if (normalizedNav === ROUTES.HOME) {
    return normalizedCurrent === ROUTES.HOME;
  }

  return (
    normalizedCurrent === normalizedNav ||
    normalizedCurrent.startsWith(`${normalizedNav}/`)
  );
};

export { ROUTES };
