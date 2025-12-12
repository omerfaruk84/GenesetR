"""
GenesetR Simple Python Client - For Free Academic Access

A lightweight wrapper around the GenesetR API for easy programmatic access.

Installation:
    pip install requests

Usage:
    # Anonymous access (10 req/min)
    from genesetr import GenesetR
    gsr = GenesetR()

    # Or with API key (30 req/min) - get from https://genesetr.uio.no/api/register
    gsr = GenesetR(api_key="gsr_your_key_here")

    # Run PCA
    result = gsr.pca(genes=["TP53", "MYC", "EGFR"])
    print(result)
"""

import requests
import time
from typing import Optional, List, Dict, Any, Callable


class GenesetRError(Exception):
    """Base exception for GenesetR client"""
    pass


class RateLimitError(GenesetRError):
    """Rate limit exceeded"""
    def __init__(self, message: str, retry_after: int):
        super().__init__(message)
        self.retry_after = retry_after


class GenesetR:
    """
    Simple client for GenesetR API

    Wraps the existing /getData endpoint with convenient methods for each analysis type.

    Args:
        api_key: Optional API key for higher rate limits (30 vs 10 req/min)
        base_url: API base URL (default: production server)
        timeout: Request timeout in seconds

    Example:
        >>> gsr = GenesetR()
        >>> result = gsr.pca(genes=["TP53", "MYC", "EGFR"], data_type=1)
        >>> print(f"Found {len(result['data'])} data points")
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://genesetr.uio.no",
        timeout: int = 300
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()

        # Add API key header if provided
        if api_key:
            self.session.headers["X-API-Key"] = api_key

    def _submit_task(self, data: Dict[str, Any]) -> str:
        """
        Submit task to /getData endpoint

        Args:
            data: Request data

        Returns:
            task_id: Celery task ID

        Raises:
            RateLimitError: If rate limit exceeded
            GenesetRError: For other errors
        """
        try:
            response = self.session.post(
                f"{self.base_url}/getData",
                json=data,
                timeout=30
            )

            # Handle rate limiting
            if response.status_code == 429:
                error_data = response.json()
                retry_after = error_data.get("retry_after", 60)
                raise RateLimitError(
                    error_data.get("message", "Rate limit exceeded"),
                    retry_after
                )

            # Handle server capacity
            if response.status_code == 503:
                error_data = response.json()
                raise GenesetRError(
                    error_data.get("message", "Server busy, please try again later")
                )

            response.raise_for_status()
            result = response.json()

            task_id = result.get("task_id")
            if not task_id:
                raise GenesetRError("No task_id in response")

            return task_id

        except requests.exceptions.RequestException as e:
            raise GenesetRError(f"Request failed: {str(e)}")

    def _wait_for_result(
        self,
        task_id: str,
        poll_interval: float = 2.0,
        progress_callback: Optional[Callable[[str, int], None]] = None
    ) -> Dict[str, Any]:
        """
        Wait for task to complete and return result

        Args:
            task_id: Celery task ID
            poll_interval: Seconds between status checks
            progress_callback: Optional callback(status, progress)

        Returns:
            Task result

        Raises:
            GenesetRError: If task fails
            TimeoutError: If task exceeds timeout
        """
        start_time = time.time()

        while True:
            # Check timeout
            elapsed = time.time() - start_time
            if elapsed > self.timeout:
                raise TimeoutError(
                    f"Task {task_id} did not complete within {self.timeout}s"
                )

            # Get task status
            try:
                response = self.session.get(
                    f"{self.base_url}/tasks/{task_id}",
                    timeout=10
                )
                response.raise_for_status()
                status_data = response.json()

            except requests.exceptions.RequestException as e:
                raise GenesetRError(f"Failed to get task status: {str(e)}")

            task_status = status_data.get("task_status", "PENDING")
            progress = status_data.get("progress", 0)

            # Call progress callback if provided
            if progress_callback:
                progress_callback(task_status, progress)

            # Check if complete
            if task_status == "SUCCESS":
                return status_data.get("task_result", {})

            elif task_status == "FAILURE":
                error = status_data.get("error", "Unknown error")
                raise GenesetRError(f"Task failed: {error}")

            # Still running, wait before next poll
            time.sleep(poll_interval)

    def _request(
        self,
        request_type: str,
        gene_list: Optional[List[str]] = None,
        data_type: int = 1,
        progress_callback: Optional[Callable[[str, int], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Submit request and wait for result

        Args:
            request_type: Type of analysis (e.g., "PCAGraph", "corrCluster")
            gene_list: List of gene symbols
            data_type: 1 for perturbation, 2 for expression
            progress_callback: Optional progress callback
            **kwargs: Additional parameters for the analysis

        Returns:
            Analysis result
        """
        # Build request data
        data = {
            "request": request_type,
            "dataType": data_type,
            **kwargs
        }

        if gene_list:
            data["geneList"] = gene_list

        # Submit task
        task_id = self._submit_task(data)

        # Wait for result
        return self._wait_for_result(task_id, progress_callback=progress_callback)

    # ========================================================================
    # Analysis Methods
    # ========================================================================

    def pca(
        self,
        genes: List[str],
        data_type: int = 1,
        num_components: int = 3,
        hdbscan: bool = True,
        min_cluster_size: int = 5,
        progress_callback: Optional[Callable[[str, int], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run PCA (Principal Component Analysis)

        Args:
            genes: List of gene symbols (min 2)
            data_type: 1 for perturbation, 2 for expression
            num_components: Number of components (2-50)
            hdbscan: Use HDBSCAN clustering
            min_cluster_size: Minimum cluster size for HDBSCAN
            progress_callback: Optional callback(status, progress)
            **kwargs: Additional PCA parameters

        Returns:
            PCA results with coordinates and clusters

        Example:
            >>> result = gsr.pca(
            ...     genes=["TP53", "MYC", "EGFR"],
            ...     num_components=3,
            ...     min_cluster_size=5
            ... )
        """
        return self._request(
            request_type="PCAGraph",
            gene_list=genes,
            data_type=data_type,
            numcomponents=num_components,
            HDBScan=str(hdbscan),
            min_cluster_size=min_cluster_size,
            progress_callback=progress_callback,
            **kwargs
        )

    def correlation(
        self,
        genes: List[str],
        data_type: int = 1,
        filter_threshold: Optional[float] = None,
        row_distance: str = "euclidean",
        row_linkage: str = "ward",
        progress_callback: Optional[Callable[[str, int], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run correlation analysis with hierarchical clustering

        Args:
            genes: List of gene symbols (min 2)
            data_type: 1 for perturbation, 2 for expression
            filter_threshold: Remove correlations below this value
            row_distance: Distance metric for clustering
            row_linkage: Linkage method for clustering
            progress_callback: Optional callback(status, progress)
            **kwargs: Additional correlation parameters

        Returns:
            Correlation matrix with clustering

        Example:
            >>> result = gsr.correlation(
            ...     genes=["TP53", "MYC", "EGFR", "KRAS"],
            ...     filter_threshold=0.1
            ... )
        """
        params = {
            "row_distance": row_distance,
            "row_linkage": row_linkage,
            **kwargs
        }

        if filter_threshold is not None:
            params["filter"] = filter_threshold

        return self._request(
            request_type="corrCluster",
            gene_list=genes,
            data_type=data_type,
            progress_callback=progress_callback,
            **params
        )

    def umap(
        self,
        genes: List[str],
        data_type: int = 1,
        num_components: int = 2,
        n_neighbors: int = 15,
        min_dist: float = 0.1,
        metric: str = "euclidean",
        progress_callback: Optional[Callable[[str, int], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run UMAP (Uniform Manifold Approximation and Projection)

        Args:
            genes: List of gene symbols (min 2)
            data_type: 1 for perturbation, 2 for expression
            num_components: Number of dimensions (1-50)
            n_neighbors: Number of neighbors (controls local vs global structure)
            min_dist: Minimum distance between points (0.0-0.99)
            metric: Distance metric
            progress_callback: Optional callback(status, progress)
            **kwargs: Additional UMAP parameters

        Returns:
            UMAP embedding coordinates

        Example:
            >>> result = gsr.umap(
            ...     genes=["TP53", "MYC", "EGFR"],
            ...     n_neighbors=15,
            ...     min_dist=0.1
            ... )
        """
        return self._request(
            request_type="UMAP",
            gene_list=genes,
            data_type=data_type,
            numcomponents=num_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            progress_callback=progress_callback,
            **kwargs
        )

    def tsne(
        self,
        genes: List[str],
        data_type: int = 1,
        num_components: int = 2,
        perplexity: float = 30.0,
        learning_rate: str = "auto",
        n_iter: int = 1000,
        progress_callback: Optional[Callable[[str, int], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run t-SNE (t-distributed Stochastic Neighbor Embedding)

        Args:
            genes: List of gene symbols (min 2)
            data_type: 1 for perturbation, 2 for expression
            num_components: Number of dimensions
            perplexity: Related to number of nearest neighbors (5-50)
            learning_rate: Learning rate ("auto" or float 10-1000)
            n_iter: Number of iterations (min 250)
            progress_callback: Optional callback(status, progress)
            **kwargs: Additional t-SNE parameters

        Returns:
            t-SNE embedding coordinates

        Example:
            >>> result = gsr.tsne(
            ...     genes=["TP53", "MYC", "EGFR"],
            ...     perplexity=30
            ... )
        """
        return self._request(
            request_type="tSNE",
            gene_list=genes,
            data_type=data_type,
            numcomponents=num_components,
            perplexity=perplexity,
            learning_rate=learning_rate,
            n_iter=n_iter,
            progress_callback=progress_callback,
            **kwargs
        )

    def mde(
        self,
        genes: List[str],
        data_type: int = 1,
        num_components: int = 3,
        preprocessing_method: str = "preserve_neighbors",
        constraint: str = "Standardized",
        repulsive_fraction: float = 0.5,
        progress_callback: Optional[Callable[[str, int], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run MDE (Minimum-Distortion Embedding)

        Args:
            genes: List of gene symbols (min 2)
            data_type: 1 for perturbation, 2 for expression
            num_components: Number of dimensions
            preprocessing_method: "preserve_neighbors" or "preserve_distances"
            constraint: "Standardized", "Centered", or "None"
            repulsive_fraction: Fraction of repulsive edges (0-1)
            progress_callback: Optional callback(status, progress)
            **kwargs: Additional MDE parameters

        Returns:
            MDE embedding coordinates

        Example:
            >>> result = gsr.mde(
            ...     genes=["TP53", "MYC", "EGFR"],
            ...     preprocessing_method="preserve_neighbors"
            ... )
        """
        return self._request(
            request_type="MDE",
            gene_list=genes,
            data_type=data_type,
            numcomponents=num_components,
            preprocessingMethod=preprocessing_method,
            pyMdeConstraint=constraint,
            repulsiveFraction=repulsive_fraction,
            progress_callback=progress_callback,
            **kwargs
        )

    def find_pathway(
        self,
        down_genes: List[str],
        up_genes: Optional[List[str]] = None,
        cutoff: float = 0.1,
        depth: int = 1,
        check_corr: bool = True,
        corr_cutoff: float = 0.1,
        biogrid_data: bool = True,
        progress_callback: Optional[Callable[[str, int], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Find pathways between up and down regulated genes

        Args:
            down_genes: List of down-regulated genes (min 2)
            up_genes: Optional list of up-regulated genes
            cutoff: Z-score cutoff for downregulation
            depth: Search depth (1 or 2)
            check_corr: Include correlation data
            corr_cutoff: Correlation cutoff
            biogrid_data: Include BioGrid protein-protein interactions
            progress_callback: Optional callback(status, progress)
            **kwargs: Additional parameters

        Returns:
            Network data (CytoscapeJS format)

        Example:
            >>> result = gsr.find_pathway(
            ...     down_genes=["GENE1", "GENE2"],
            ...     up_genes=["GENE3", "GENE4"],
            ...     depth=2
            ... )
        """
        params = {
            "downgeneList": down_genes,
            "cutoff": cutoff,
            "depth": depth,
            "checkCorr": check_corr,
            "corrCutOff": corr_cutoff,
            "BioGridData": biogrid_data,
            **kwargs
        }

        if up_genes:
            params["upgeneList"] = up_genes

        return self._request(
            request_type="findPath",
            progress_callback=progress_callback,
            **params
        )

    def check_rate_limit(self) -> Dict[str, Any]:
        """
        Check current rate limit status

        Returns:
            Rate limit information

        Example:
            >>> status = gsr.check_rate_limit()
            >>> print(f"Remaining: {status['requests_remaining']}")
        """
        response = self.session.get(f"{self.base_url}/api/rate-limit-status")
        response.raise_for_status()
        return response.json()


# ============================================================================
# Example Usage
# ============================================================================

def example_usage():
    """Example showing how to use the GenesetR client"""

    print("=== GenesetR Python Client Example ===\n")

    # 1. Create client (anonymous access - 10 req/min)
    print("1. Creating client (anonymous)...")
    gsr = GenesetR()

    # Or with API key (30 req/min)
    # gsr = GenesetR(api_key="gsr_your_key_here")

    # 2. Check rate limit
    print("\n2. Checking rate limit status...")
    try:
        status = gsr.check_rate_limit()
        print(f"   Access type: {status['access_type']}")
        print(f"   Rate limit: {status['rate_limit']} requests/minute")
        print(f"   Remaining: {status['requests_remaining']}")
    except Exception as e:
        print(f"   Could not check rate limit: {e}")

    # 3. Run PCA analysis
    print("\n3. Running PCA analysis...")
    genes = ["TP53", "MYC", "EGFR", "KRAS", "BRCA1"]

    # Define progress callback
    def progress(status, progress_pct):
        print(f"   Status: {status} ({progress_pct}%)")

    try:
        result = gsr.pca(
            genes=genes,
            num_components=3,
            min_cluster_size=5,
            progress_callback=progress
        )
        print(f"   ✓ PCA complete!")
        print(f"   Data points: {len(result.get('data', []))}")
        print(f"   Clusters found: {len(set(result.get('clusters', [])))}")
    except RateLimitError as e:
        print(f"   ✗ Rate limit exceeded. Retry after {e.retry_after}s")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # 4. Run correlation analysis
    print("\n4. Running correlation analysis...")
    try:
        result = gsr.correlation(
            genes=genes[:4],  # Use first 4 genes
            filter_threshold=0.1
        )
        print(f"   ✓ Correlation complete!")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # 5. Run UMAP
    print("\n5. Running UMAP analysis...")
    try:
        result = gsr.umap(
            genes=genes,
            n_neighbors=15,
            min_dist=0.1
        )
        print(f"   ✓ UMAP complete!")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    print("\n=== Example complete ===")


if __name__ == "__main__":
    example_usage()
