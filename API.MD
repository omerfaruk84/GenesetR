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
    
- **`PCA`** Calculates Principle Component Analysis among the submitted gene list, and returns results as a JSON file.

  **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively. 
    
  **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 2 and maximum is number of feature count minus one. The default value is three. 
 
 - **`PCAGraph`** Calculates Principle Component Analysis among the submitted gene list, and returns scatter plot results as a JSON file loadable by BokehJS.
   
   **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively.
  
   **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 2 and maximum is number of feature count minus one. The default value is three. 'HDBScan' sets whether genes will be clustered using HDBScan algorithm. Default value is "True". `ShowCluster` sets whether clusters will be highlighted (default="True"). `color` sets the color for scatter plot. Can be any name of the standard 147 CSS (X11) named colors (default: "skyblue").  `min_cluster_size` determines the minimum size of a cluster (default 5).  `min_samples` (int) sets the number of samples in a neighbourhood for a point to be considered a core point (default=None). `metric` (string) The metric to use when calculating distance between instances in a feature array (default="euclidean"). `cluster_selection_epsilon` (float) sets the distance threshold. Clusters below this value will be merged (default=0.0). `cluster_selection_method` The method used to select clusters from the condensed tree (default="eom" can be "leaf"). For details of these parameters please see [HDBSCAN PARAMETERS](https://hdbscan.readthedocs.io/en/latest/api.html#robustsinglelinkage:~:text=and%20RobustSingleLinkage.-,HDBSCAN,-class).
  
  - **`MDE`** Calculates Minimum-Distortion Embedding among the submitted gene list, and returns results as a JSON file.
    
    **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively.
  
    **Optional arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 2 and maximum is number of feature count minus one. The default value is 3. 
  `PreprocessingMethod` sests the way to construct an MDE problem. Either can be set to designed to preserve local structure "preserve_neighbors" (Default) or keep original distances "preserve_distances". `pyMdeConstraint` sets the embedding constraint. Either "Standardized" (Default for preserve preserve_neighbors), "Centered" or "None" (Default for preserve preserve_distances). `repulsiveFraction` (float) sets how many repulsive edges to include, relative to the number of attractive edges. 1 means as many repulsive edges as attractive edges. The higher this number, the more uniformly spread out the embedding will be. Defaults to 0.5 for standardized embeddings, and 1 otherwise. For details of these parameters please see [pyMDE PARAMETERS](https://pymde.org/api/index.html#:~:text=int-,Preserve%20neighbors,%EF%83%81,-pymde.preserve_neighbors).
  
  
  
 
                
  
  
  
