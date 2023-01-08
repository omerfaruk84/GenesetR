## Introduction
This API serves as a backend for Perturb-Seq analyzer. 

### End points

The main entry point for the API is `/getData` . It responds to post requests with JSON data.
JSON data should contain `request` information as a string. 

Followings are available options for the `request`:

- **`corr`** Calculates spearman correlation among the submitted gene list and returns `inchlib` loadable JSON formatted, clustered correlation matrix. 
  
    Required arguments:** `geneList` and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation among Perturbations or Gene Expressions respectively.  
    
    **Optional arguments:** `filter` (float) is used to remove any gene that has less correlation than  absolute filter value (e.g setting it to 0.1 will filter out -0.1 < r < 0.1).   

- **`corrCluster`** Calculates spearman correlation among the submitted gene list and returns clustered correlation matrix as a JSON file  . 
  
    **Required arguments:** `geneList` and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation among Perturbations or Gene Expressions respectively.  
    
    **Optional arguments:** `filter` (float) is used to remove any gene that has less correlation than  absolute filter value (e.g setting it to 0.1 will filter out -0.1 < r < 0.1).
    Followings are the clustering settings that can be adjusted: 
    
    `row_distance` (default: "euclidean"), `column_distance` (default: "euclidean"), `row_linkage` (default: "single"), `column_linkage` (default: "ward"),
    `axis` define clustering axis (row/both) (default: row), `normalize` normalize data to (0,1) scale prior to clustering. "True" or "False" (default: "True"), and 
    `write_original` (default: "True"). For details of these parameters please see [INCHLIB PARAMETERS](https://www.openscreen.cz/software/inchlib/inchlib_clust#:~:text=Command%2Dline%20parameters).
    
- **`PCA`** Calculates **P**rinciple **C**omponent **A**nalysis among the submitted gene list, and returns results as a JSON file.

  **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively. 
    
  **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 2 and maximum is number of feature count minus one. The default value is three. 
 
 - **`PCAGraph`** Calculates Principle Component Analysis among the submitted gene list, and returns scatter plot results as a JSON file loadable by BokehJS.
   
   **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively.
  
   **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 2 and maximum is number of feature count minus one. The default value is three. 'HDBScan' sets whether genes will be clustered using HDBScan algorithm. Default value is "True". `ShowCluster` sets whether clusters will be highlighted (default="True"). `color` sets the color for scatter plot. Can be any name of the standard 147 CSS (X11) named colors (default: "skyblue").  `min_cluster_size` determines the minimum size of a cluster (default 5).  `min_samples` (int) sets the number of samples in a neighbourhood for a point to be considered a core point (default=None). `metric` (string) The metric to use when calculating distance between instances in a feature array (default="euclidean"). `cluster_selection_epsilon` (float) sets the distance threshold. Clusters below this value will be merged (default=0.0). `cluster_selection_method` The method used to select clusters from the condensed tree (default="eom" can be "leaf"). For details of these parameters please see [HDBSCAN PARAMETERS](https://hdbscan.readthedocs.io/en/latest/api.html#robustsinglelinkage:~:text=and%20RobustSingleLinkage.-,HDBSCAN,-class).
  
  - **`MDE`** Calculates **M**inimum-**D**istortion **E**mbedding among the submitted gene list, and returns results as a JSON file.
    
    **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively.
  
    **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 2 and maximum is number of feature count minus one. The default value is 3. 
  `PreprocessingMethod` sests the way to construct an MDE problem. Either can be set to designed to preserve local structure "preserve_neighbors" (Default) or keep original distances "preserve_distances". `pyMdeConstraint` sets the embedding constraint. Either "Standardized" (Default for preserve preserve_neighbors), "Centered" or "None" (Default for preserve preserve_distances). `repulsiveFraction` (float) sets how many repulsive edges to include, relative to the number of attractive edges. 1 means as many repulsive edges as attractive edges. The higher this number, the more uniformly spread out the embedding will be. Defaults to 0.5 for standardized embeddings, and 1 otherwise. For details of these parameters please see [pyMDE PARAMETERS](https://pymde.org/api/index.html#:~:text=int-,Preserve%20neighbors,%EF%83%81,-pymde.preserve_neighbors).
 
 - **`UMAP`** Calculates **U**niform **M**anifold **A**pproximation and **P**rojection for dimension reduction of the data for submitted gene list, and returns results as a JSON file.
    
    **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively.
  
    **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 1 and maximum is number of feature count minus one. The default value is 3. `n_neighbors` (int) controls how UMAP balances local versus global structure in the data (Default = 15). `min_dist` (float from 0.0 to 0.99) controls how tightly UMAP is allowed to pack points together. It, quite literally, provides the minimum distance apart that points are allowed to be in the low dimensional representation. This means that low values of min_dist will result in clumpier embeddings (Default = 0.1). `metric` (string) The metric to use when calculating distance between instances in a feature array (default="euclidean").  For details of these parameters please see [UMAP PARAMETERS](https://umap-learn.readthedocs.io/en/latest/parameters.html).


 - **`tSNE`** Calculates **T**-distributed **S**tochastic **N**eighbor **E**mbedding for dimension reduction of the data for submitted gene list, and returns results as a JSON file.
    
    **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively.
  
    **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 1 and maximum is number of feature count minus one. The default value is 2. `metric` (string) The metric to use when calculating distance between instances in a feature array (default="euclidean"). `perplexity`  (float) The perplexity is related to the number of nearest neighbors that is used in other manifold learning algorithms. Larger datasets usually require a larger perplexity. Consider selecting a value between 5 and 50. The perplexity must be less than the number of samples (Default=30.0). `early_exaggeration` (float)  Controls how tight natural clusters in the original space are in the embedded space and how much space will be between them (Default=12.0). `learning_rate` (float or “auto”) The learning rate for t-SNE is usually in the range [10.0, 1000.0]. If the learning rate is too high, the data may look like a ‘ball’ with any point approximately equidistant from its nearest neighbours. If the learning rate is too low, most points may look compressed in a dense cloud with few outliers (Default="auto"). `n_iter` (int) Maximum number of iterations for the optimization. Should be at least 250 (default=1000). For details of these parameters please see [tSNE PARAMETERS](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.TSNE.html).
  
 - **`biClustering`** Runs Spectral Co-Clustering algorithm, and returns the results as a JSON file.
    
    **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively.
  
    **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `n_clusters` determines 
  the number of biclusters to find. The default value is number of genes divided by 20. `n_init` (int) sets number of random initializations that are tried with the k-means algorithm (Default=10). For details of these parameters please see [SPECTRAL COCLUSTERING PARAMETERS](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.SpectralCoclustering.html).  
  
   
  - **`findPath`** Tries to identify pathways among the submitted up and down regulated gene list, considering Perturb-Seq data, and returns the results as a JSON file that can be loaded by CytoscapeJS.
    
    **Required arguments:** `downgeneList`. The `downgeneList` should contain at least two down regulated genes in an RNA-Seq experiment.
  
    **Optional arguments:**  `upgeneList` should contain the genes upregulated in an RNA-seq experiment. `cutoff` (float) sets the Z-Score cutoff for assesing downregulation of a gene by a perturbation (Default: 0.1) `depth` sets the search dept for pathway Can be 1 (default) or 2. 'checkCorr' sets whether to include perturbation correlation data in the network (Default: True).  `corrCutOff` (float) sets the cutoff for correlations to include (Default: 0.1).  `BioGridData` sets whether to include protein-protein interaction data in the network (Default: True).
    
    ### HOW BACK END WORKS
  When users reach to the homepage, a unique `user_id` is generated and returned as a JSON response. At the backend this ID is cached to REDIS server as an active online user. In the fron end, this needs to be saved to the local storage and submitted to the API in every future request.
   
  
  

  
  
  
 
                
  
  
  
