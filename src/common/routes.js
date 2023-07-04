const ROUTES = Object.freeze({
  HOME: '/',
  CORRELATION: '/correlation',
  DR: '/dr',
  PCA: '/pca',
  MDE: '/mde',
  UMAP: '/umap',
  TSNE: '/tsne',
  BI_CLUSTERING: '/bi-clustering',
  GENE_REGULATION: '/gene-regulation',
  HEATMAP: '/heatmap',
  PATHFINDER: '/pathfinder',
  GENESIGNATURE: '/genesignature',
});

/**
 * This function will check the current path (url) and the navigation elements path
 * if they are equal then thats the active tab in the top bar, otherwise will return false
 * @param {string} currentPath Url current path
 * @param {string} navPath Nav element path
 * @returns Boolean
 */
export const isActiveTab = (currentPath, navPath) => {
  if (currentPath === navPath) {
    return true;
  }
  return false;
}

export { ROUTES };
