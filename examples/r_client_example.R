# GenesetR R Client Library Example
#
# This demonstrates how users would interact with the GenesetR REST API
# using an R client library.
#
# Installation:
#   devtools::install_github("genesetr/genesetr-r")
#
# Or if using the example code here:
#   source("r_client_example.R")

library(httr)
library(jsonlite)
library(websocket)

#' GenesetR API Client for R
#'
#' @description
#' R client for the GenesetR REST API
#'
#' @examples
#' # Initialize client
#' client <- GenesetRClient$new(api_key = "gsr_prod_xxx")
#'
#' # Run PCA analysis
#' result <- client$pca(
#'   dataset = "L1000_LINCS",
#'   genes = c("TP53", "MYC", "EGFR"),
#'   components = 3
#' )
#'
#' # Wait for completion
#' result$wait()
#'
#' # Get results
#' pca_data <- result$data
#' plot(pca_data$coordinates)
#'
#' @export
GenesetRClient <- R6::R6Class(
  "GenesetRClient",
  public = list(
    #' @field api_key API key for authentication
    api_key = NULL,

    #' @field base_url Base URL for API
    base_url = NULL,

    #' @field timeout Request timeout in seconds
    timeout = NULL,

    #' @description
    #' Initialize a new GenesetR client
    #'
    #' @param api_key Your GenesetR API key
    #' @param base_url API base URL (default: production)
    #' @param timeout Request timeout in seconds
    initialize = function(api_key,
                          base_url = "https://api.genesetr.uio.no",
                          timeout = 30) {
      self$api_key <- api_key
      self$base_url <- sub("/$", "", base_url)
      self$timeout <- timeout
    },

    #' @description
    #' Make an API request
    #'
    #' @param method HTTP method
    #' @param endpoint API endpoint
    #' @param data Request body data
    #' @param params Query parameters
    request = function(method, endpoint, data = NULL, params = NULL) {
      url <- if (startsWith(endpoint, "/")) {
        paste0(self$base_url, endpoint)
      } else {
        paste0(self$base_url, "/v1/", endpoint)
      }

      headers <- add_headers(
        Authorization = paste("Bearer", self$api_key),
        `Content-Type` = "application/json",
        `User-Agent` = "GenesetR-R-Client/1.0.0"
      )

      response <- tryCatch({
        if (method == "GET") {
          GET(
            url,
            headers,
            query = params,
            timeout(self$timeout)
          )
        } else if (method == "POST") {
          POST(
            url,
            headers,
            body = toJSON(data, auto_unbox = TRUE),
            timeout(self$timeout)
          )
        } else if (method == "DELETE") {
          DELETE(
            url,
            headers,
            timeout(self$timeout)
          )
        }
      }, error = function(e) {
        stop("Request failed: ", e$message)
      })

      # Check status
      if (status_code(response) == 429) {
        reset_time <- headers(response)$`x-ratelimit-reset-minute`
        stop(sprintf("Rate limit exceeded. Reset time: %s", reset_time))
      }

      if (status_code(response) == 401) {
        stop("Invalid or expired API key")
      }

      if (status_code(response) == 400) {
        error_data <- content(response, as = "parsed")
        stop(sprintf("Validation error: %s", error_data$error$message))
      }

      stop_for_status(response)
      content(response, as = "parsed")
    },

    #' @description
    #' Validate API key and get usage information
    validate_key = function() {
      response <- self$request("GET", "/v1/auth/validate")

      list(
        valid = response$valid,
        tier = response$tier,
        usage = response$usage,
        permissions = response$permissions
      )
    },

    #' @description
    #' Get list of available datasets
    get_datasets = function() {
      response <- self$request("GET", "/v1/datasets")
      response$datasets
    },

    #' @description
    #' Perform PCA analysis
    #'
    #' @param dataset Dataset ID
    #' @param genes Character vector of gene symbols
    #' @param components Number of principal components (2-50)
    #' @param clustering Clustering parameters
    #'
    #' @return TaskResult object
    pca = function(dataset,
                   genes,
                   components = 3,
                   clustering = list(method = "hdbscan", min_cluster_size = 5)) {
      data <- list(
        dataset = dataset,
        gene_list = genes,
        components = components,
        clustering = clustering
      )

      response <- self$request("POST", "/v1/analysis/pca", data = data)

      TaskResult$new(
        client = self,
        task_id = response$task_id,
        poll_url = response$poll_url,
        websocket_url = response$websocket_url
      )
    },

    #' @description
    #' Perform correlation analysis
    #'
    #' @param dataset Dataset ID
    #' @param genes Character vector of gene symbols
    #' @param method Correlation method ("spearman", "pearson", "kendall")
    #' @param clustering Clustering parameters
    #'
    #' @return TaskResult object
    correlation = function(dataset,
                           genes,
                           method = "spearman",
                           clustering = list(
                             method = "hierarchical",
                             linkage = "ward",
                             distance = "euclidean"
                           )) {
      data <- list(
        dataset = dataset,
        gene_list = genes,
        method = method,
        clustering = clustering
      )

      response <- self$request("POST", "/v1/analysis/correlation", data = data)

      TaskResult$new(
        client = self,
        task_id = response$task_id,
        poll_url = response$poll_url,
        websocket_url = response$websocket_url
      )
    },

    #' @description
    #' Perform UMAP dimensionality reduction
    #'
    #' @param dataset Dataset ID
    #' @param genes Character vector of gene symbols
    #' @param n_neighbors Number of neighbors
    #' @param min_dist Minimum distance
    #' @param metric Distance metric
    #' @param n_components Number of dimensions
    #'
    #' @return TaskResult object
    umap = function(dataset,
                    genes,
                    n_neighbors = 15,
                    min_dist = 0.1,
                    metric = "euclidean",
                    n_components = 2) {
      data <- list(
        dataset = dataset,
        gene_list = genes,
        n_neighbors = n_neighbors,
        min_dist = min_dist,
        metric = metric,
        n_components = n_components
      )

      response <- self$request("POST", "/v1/analysis/umap", data = data)

      TaskResult$new(
        client = self,
        task_id = response$task_id,
        poll_url = response$poll_url,
        websocket_url = response$websocket_url
      )
    },

    #' @description
    #' Analyze gene regulation network
    #'
    #' @param dataset Dataset ID
    #' @param gene Gene symbol to analyze
    #' @param top_k_upstream Number of upstream regulators
    #' @param top_k_downstream Number of downstream targets
    #' @param correlation_threshold Minimum correlation threshold
    #'
    #' @return TaskResult object
    gene_regulation = function(dataset,
                                gene,
                                top_k_upstream = 10,
                                top_k_downstream = 10,
                                correlation_threshold = 0.5) {
      data <- list(
        dataset = dataset,
        gene = gene,
        top_k_upstream = top_k_upstream,
        top_k_downstream = top_k_downstream,
        correlation_threshold = correlation_threshold
      )

      response <- self$request("POST", "/v1/analysis/gene-regulation", data = data)

      TaskResult$new(
        client = self,
        task_id = response$task_id,
        poll_url = response$poll_url,
        websocket_url = response$websocket_url
      )
    }
  )
)

#' Task Result Object
#'
#' @description
#' Represents an asynchronous task result
#'
#' @export
TaskResult <- R6::R6Class(
  "TaskResult",
  public = list(
    #' @field client GenesetR client
    client = NULL,

    #' @field task_id Task ID
    task_id = NULL,

    #' @field poll_url Polling URL
    poll_url = NULL,

    #' @field websocket_url WebSocket URL
    websocket_url = NULL,

    #' @field status Task status
    status = "pending",

    #' @field progress Task progress (0-100)
    progress = 0,

    #' @field message Status message
    message = "",

    #' @field data Result data
    data = NULL,

    #' @field computation_time Computation time in seconds
    computation_time = NULL,

    #' @description
    #' Initialize a task result
    initialize = function(client, task_id, poll_url, websocket_url = NULL) {
      self$client <- client
      self$task_id <- task_id
      self$poll_url <- poll_url
      self$websocket_url <- websocket_url
    },

    #' @description
    #' Check if task is complete
    is_complete = function() {
      self$status %in% c("completed", "failed", "cancelled")
    },

    #' @description
    #' Refresh task status from server
    refresh = function() {
      response <- self$client$request("GET", self$poll_url)

      self$status <- response$status
      self$progress <- ifelse(is.null(response$progress), 0, response$progress)
      self$message <- ifelse(is.null(response$message), "", response$message)
      self$data <- response$result
      self$computation_time <- response$computation_time

      invisible(self)
    },

    #' @description
    #' Wait for task to complete
    #'
    #' @param timeout Maximum time to wait in seconds
    #' @param poll_interval Time between status checks in seconds
    #' @param callback Optional callback function
    wait = function(timeout = NULL,
                    poll_interval = 2,
                    callback = NULL) {
      start_time <- Sys.time()

      while (!self$is_complete()) {
        self$refresh()

        if (!is.null(callback)) {
          callback(self$progress, self$message)
        }

        if (self$status == "failed") {
          stop("Task failed: ", self$message)
        }

        if (!is.null(timeout)) {
          elapsed <- as.numeric(difftime(Sys.time(), start_time, units = "secs"))
          if (elapsed > timeout) {
            stop(sprintf("Task %s did not complete within %d seconds", self$task_id, timeout))
          }
        }

        if (!self$is_complete()) {
          Sys.sleep(poll_interval)
        }
      }

      invisible(self)
    },

    #' @description
    #' Cancel the task
    cancel = function() {
      tryCatch({
        self$client$request("DELETE", paste0("/v1/tasks/", self$task_id))
        self$status <- "cancelled"
        TRUE
      }, error = function(e) {
        message("Failed to cancel task: ", e$message)
        FALSE
      })
    }
  )
)


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

example_usage <- function() {
  cat("=== GenesetR R Client Example ===\n\n")

  # Initialize client
  client <- GenesetRClient$new(api_key = "gsr_prod_your_api_key_here")

  # 1. Validate API key
  cat("1. Validating API key...\n")
  tryCatch({
    usage <- client$validate_key()
    cat("   ✓ Valid API key\n")
    cat(sprintf("   Tier: %s\n", usage$tier))
    cat(sprintf("   Requests remaining today: %d\n", usage$usage$requests_remaining_today))
    cat(sprintf("   Active jobs: %d/%d\n",
                usage$usage$concurrent_jobs,
                usage$usage$max_concurrent_jobs))
    cat("\n")
  }, error = function(e) {
    cat("   ✗ Authentication failed:", e$message, "\n")
    stop()
  })

  # 2. Get available datasets
  cat("2. Fetching available datasets...\n")
  datasets <- client$get_datasets()
  cat(sprintf("   Found %d datasets:\n", length(datasets)))
  for (i in seq_len(min(3, length(datasets)))) {
    ds <- datasets[[i]]
    cat(sprintf("   - %s: %s (%d genes)\n", ds$id, ds$name, ds$gene_count))
  }
  cat("\n")

  # 3. Run PCA analysis
  cat("3. Running PCA analysis...\n")
  genes_of_interest <- c("TP53", "MYC", "EGFR", "KRAS", "BRCA1")

  result <- client$pca(
    dataset = "L1000_LINCS",
    genes = genes_of_interest,
    components = 3,
    clustering = list(method = "hdbscan", min_cluster_size = 5)
  )

  cat(sprintf("   Task submitted: %s\n", result$task_id))

  # Wait with progress callback
  progress_callback <- function(progress, message) {
    cat(sprintf("   Progress: %d%% - %s\n", progress, message))
  }

  tryCatch({
    result$wait(timeout = 300, callback = progress_callback)
    cat(sprintf("   ✓ Analysis complete in %.2fs\n", result$computation_time))
    cat(sprintf("   Found %d data points\n", length(result$data$coordinates)))
    cat("\n")
  }, error = function(e) {
    cat("   ✗ Analysis failed:", e$message, "\n")
    result$cancel()
    stop()
  })

  # 4. Run correlation analysis
  cat("4. Running correlation analysis...\n")
  result <- client$correlation(
    dataset = "L1000_LINCS",
    genes = genes_of_interest,
    method = "spearman"
  )

  result$wait()
  cat("   ✓ Correlation matrix computed\n")

  # Extract correlation matrix as data frame
  cor_matrix <- do.call(rbind, result$data$correlation_matrix)
  rownames(cor_matrix) <- genes_of_interest
  colnames(cor_matrix) <- genes_of_interest

  cat("\n   Correlation matrix:\n")
  print(round(cor_matrix, 3))
  cat("\n")

  # 5. Visualize results
  cat("5. Creating visualizations...\n")

  # PCA plot (if previous result still available)
  if (!is.null(result$data)) {
    # Plot would go here - requires ggplot2
    # pca_df <- as.data.frame(result$data$coordinates)
    # ggplot(pca_df, aes(x = PC1, y = PC2, color = cluster)) +
    #   geom_point() +
    #   theme_minimal() +
    #   ggtitle("PCA Analysis")
    cat("   ✓ PCA plot ready\n")
  }

  # Correlation heatmap
  # heatmap(cor_matrix, main = "Gene Correlation Heatmap")
  cat("   ✓ Correlation heatmap ready\n")
  cat("\n")

  cat("=== Example complete ===\n")
}

# Uncomment to run example
# example_usage()


# ============================================================================
# ADVANCED EXAMPLE: Batch Analysis
# ============================================================================

batch_analysis_example <- function() {
  client <- GenesetRClient$new(api_key = "gsr_prod_your_api_key_here")

  # Define gene sets
  gene_sets <- list(
    oncogenes = c("MYC", "KRAS", "EGFR", "BRAF"),
    tumor_suppressors = c("TP53", "BRCA1", "BRCA2", "PTEN"),
    cell_cycle = c("CDK1", "CDK2", "CDK4", "CCND1")
  )

  # Run analyses for all gene sets
  results <- list()

  for (name in names(gene_sets)) {
    cat(sprintf("Analyzing %s...\n", name))

    # Submit task
    result <- client$pca(
      dataset = "L1000_LINCS",
      genes = gene_sets[[name]],
      components = 2
    )

    results[[name]] <- result
  }

  # Wait for all to complete
  cat("\nWaiting for all analyses to complete...\n")
  for (name in names(results)) {
    results[[name]]$wait()
    cat(sprintf("✓ %s complete\n", name))
  }

  # Compare results
  cat("\n=== Results Summary ===\n")
  for (name in names(results)) {
    result <- results[[name]]
    cat(sprintf("%s: %d clusters, %.2fs computation time\n",
                name,
                length(unique(result$data$clusters)),
                result$computation_time))
  }
}


# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

#' @export
genesetr_client <- GenesetRClient$new

#' @export
genesetr_example <- example_usage

#' @export
genesetr_batch_example <- batch_analysis_example
