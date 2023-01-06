## Introduction
This API serves as a backend for Perturb-Seq analyzer. 

### End points

The main entry point for the API is `/getData` . It responds to post requests with JSON data.
JSON data should contain `request` information as a string. 

Followings are available options for the `request`:

- **`corr`** Calculates spearman correlation among the submitted gene list and returns `inchlib` loadable JSON formatted, clustered correlation matrix. 
  
    Required arguments:** `geneList` and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation among Perturbations or Gene Expressions respectively.  
    
    **Optinal arguments:** `filter` (float) is used to remove any gene that has less correlation than  absolute filter value (e.g setting it to 0.1 will filter out -0.1 < r < 0.1).   

- **`corrCluster`** Calculates spearman correlation among the submitted gene list and returns clustered correlation matrix as a JSON file  . 
  
    **Required arguments:** `geneList` and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation among Perturbations or Gene Expressions respectively.  
    
    **Optinal arguments:** `filter` (float) is used to remove any gene that has less correlation than  absolute filter value (e.g setting it to 0.1 will filter out -0.1 < r < 0.1).
    Followings are the clustering settings that can be adjusted: 
    
    `row_distance` (default: "euclidean"), `column_distance` (default: "euclidean"), `row_linkage` (default: "single"), `column_linkage` (default: "ward"),
    `axis` define clustering axis (row/both) (default: row), `normalize` normalize data to (0,1) scale prior to clustering. "True" or "False" (default: "True"), and 
    `write_original` (default: "True"). For details of these parameters please see [INCHLIB PARAMETERS](https://www.openscreen.cz/software/inchlib/inchlib_clust#:~:text=Command%2Dline%20parameters).
    
- **`PCA`** Calculates Principle Component Analysis among the submitted gene list, and returns results as a JSON file.

  **Required arguments:** `geneList`, and `dataType`. The `genelist` should contain at least two genes. `dataType` (int) can be 1 or 2 for analyzing correlation 
  among Perturbations or Gene Expressions respectively. 
    
  **Optinal arguments:** `dataSource` (int) sets the source for PCA analysis. 1 for Perturbation/Expression data. 2 for Correlation data. `numcomponents` determines 
  the number of returned compenents which is minimum 2 and maximum is number of feature count minus one. The default value is three. 
  
  
