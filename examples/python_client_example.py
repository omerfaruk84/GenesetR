"""
GenesetR Python Client Library Example

This demonstrates how users would interact with the GenesetR REST API
using a Python client library.
"""

import requests
import time
import json
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass
from enum import Enum
import websocket
import threading


class TaskStatus(Enum):
    """Task status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class APIKeyUsage:
    """API key usage information"""
    valid: bool
    tier: str
    requests_remaining_today: int
    concurrent_jobs: int
    max_concurrent_jobs: int
    computation_minutes_used: float
    computation_minutes_quota: float
    max_gene_list_size: int


class GenesetRException(Exception):
    """Base exception for GenesetR client"""
    pass


class RateLimitException(GenesetRException):
    """Rate limit exceeded"""
    def __init__(self, message: str, reset_time: int):
        super().__init__(message)
        self.reset_time = reset_time


class AuthenticationException(GenesetRException):
    """Authentication failed"""
    pass


class ValidationException(GenesetRException):
    """Input validation failed"""
    pass


class TaskResult:
    """Represents an async task result"""

    def __init__(
        self,
        client: 'GenesetRClient',
        task_id: str,
        poll_url: str,
        websocket_url: Optional[str] = None
    ):
        self.client = client
        self.task_id = task_id
        self.poll_url = poll_url
        self.websocket_url = websocket_url
        self._status = TaskStatus.PENDING
        self._progress = 0
        self._message = ""
        self._result = None
        self._error = None
        self._computation_time = None

    @property
    def status(self) -> TaskStatus:
        """Get current task status"""
        return self._status

    @property
    def progress(self) -> int:
        """Get current progress (0-100)"""
        return self._progress

    @property
    def is_complete(self) -> bool:
        """Check if task is complete"""
        return self._status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]

    @property
    def data(self) -> Optional[Dict[str, Any]]:
        """Get result data (blocks until complete)"""
        if not self.is_complete:
            self.wait()
        return self._result

    def refresh(self) -> 'TaskResult':
        """Refresh task status from server"""
        response = self.client._request(
            "GET",
            self.poll_url
        )

        self._status = TaskStatus(response["status"])
        self._progress = response.get("progress", 0)
        self._message = response.get("message", "")
        self._result = response.get("result")
        self._computation_time = response.get("computation_time")

        if response.get("error"):
            self._error = response["error"]

        return self

    def wait(
        self,
        timeout: Optional[float] = None,
        poll_interval: float = 2.0,
        callback: Optional[Callable[[int, str], None]] = None
    ) -> 'TaskResult':
        """
        Wait for task to complete

        Args:
            timeout: Maximum time to wait in seconds
            poll_interval: Time between status checks in seconds
            callback: Optional callback function(progress, message)

        Returns:
            self for chaining

        Raises:
            TimeoutError: If timeout is reached
            GenesetRException: If task fails
        """
        start_time = time.time()

        while not self.is_complete:
            self.refresh()

            if callback:
                callback(self._progress, self._message)

            if self._status == TaskStatus.FAILED:
                raise GenesetRException(f"Task failed: {self._error}")

            if timeout and (time.time() - start_time) > timeout:
                raise TimeoutError(f"Task {self.task_id} did not complete within {timeout}s")

            if not self.is_complete:
                time.sleep(poll_interval)

        return self

    def wait_with_websocket(
        self,
        callback: Optional[Callable[[int, str], None]] = None
    ) -> 'TaskResult':
        """
        Wait for task using WebSocket for real-time updates

        Args:
            callback: Optional callback function(progress, message)

        Returns:
            self for chaining
        """
        if not self.websocket_url:
            # Fallback to polling
            return self.wait(callback=callback)

        def on_message(ws, message):
            data = json.loads(message)
            self._progress = data.get("progress", 0)
            self._message = data.get("message", "")
            self._status = TaskStatus(data["status"])

            if callback:
                callback(self._progress, self._message)

            if self.is_complete:
                self._result = data.get("result")
                self._computation_time = data.get("computation_time")
                ws.close()

        def on_error(ws, error):
            print(f"WebSocket error: {error}")
            # Fallback to polling
            self.wait(callback=callback)

        ws = websocket.WebSocketApp(
            self.websocket_url,
            on_message=on_message,
            on_error=on_error,
            header={"Authorization": f"Bearer {self.client.api_key}"}
        )

        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()

        # Wait for completion
        while not self.is_complete:
            time.sleep(0.1)

        return self

    def cancel(self) -> bool:
        """Cancel the task"""
        try:
            self.client._request(
                "DELETE",
                f"/v1/tasks/{self.task_id}"
            )
            self._status = TaskStatus.CANCELLED
            return True
        except Exception as e:
            print(f"Failed to cancel task: {e}")
            return False


class GenesetRClient:
    """
    GenesetR API Client

    Example usage:
        client = GenesetRClient(api_key="gsr_prod_xxx")

        # Run PCA analysis
        result = client.pca(
            dataset="L1000_LINCS",
            genes=["TP53", "MYC", "EGFR"],
            components=3
        )

        # Wait for completion with progress
        def progress_callback(progress, message):
            print(f"{progress}%: {message}")

        result.wait(callback=progress_callback)

        # Get results
        print(result.data)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.genesetr.uio.no",
        timeout: int = 30
    ):
        """
        Initialize GenesetR client

        Args:
            api_key: Your GenesetR API key
            base_url: API base URL (default: production)
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "GenesetR-Python-Client/1.0.0"
        })

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make API request"""
        url = f"{self.base_url}{endpoint}" if endpoint.startswith("/") else f"{self.base_url}/v1/{endpoint}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=self.timeout
            )

            # Check for rate limiting
            if response.status_code == 429:
                reset_time = int(response.headers.get("X-RateLimit-Reset-Minute", 0))
                raise RateLimitException(
                    "Rate limit exceeded. Please try again later.",
                    reset_time
                )

            # Check for authentication errors
            if response.status_code == 401:
                raise AuthenticationException("Invalid or expired API key")

            # Check for validation errors
            if response.status_code == 400:
                error_data = response.json()
                raise ValidationException(error_data.get("error", {}).get("message", "Validation error"))

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise GenesetRException(f"Request failed: {str(e)}")

    def validate_key(self) -> APIKeyUsage:
        """
        Validate API key and get usage information

        Returns:
            APIKeyUsage object with key info and quotas
        """
        response = self._request("GET", "/v1/auth/validate")

        return APIKeyUsage(
            valid=response["valid"],
            tier=response["tier"],
            requests_remaining_today=response["usage"]["requests_remaining_today"],
            concurrent_jobs=response["usage"]["concurrent_jobs"],
            max_concurrent_jobs=response["usage"]["max_concurrent_jobs"],
            computation_minutes_used=response["usage"]["computation_minutes_used"],
            computation_minutes_quota=response["usage"]["computation_minutes_quota"],
            max_gene_list_size=response["permissions"]["max_gene_list_size"]
        )

    def get_datasets(self) -> List[Dict[str, Any]]:
        """
        Get list of available datasets

        Returns:
            List of dataset information dictionaries
        """
        response = self._request("GET", "/v1/datasets")
        return response["datasets"]

    def pca(
        self,
        dataset: str,
        genes: List[str],
        components: int = 3,
        clustering: Optional[Dict[str, Any]] = None
    ) -> TaskResult:
        """
        Perform PCA analysis

        Args:
            dataset: Dataset ID (e.g., "L1000_LINCS")
            genes: List of gene symbols
            components: Number of principal components (2-50)
            clustering: Optional clustering parameters

        Returns:
            TaskResult object for tracking progress

        Example:
            result = client.pca(
                dataset="L1000_LINCS",
                genes=["TP53", "MYC", "EGFR"],
                components=3,
                clustering={"method": "hdbscan", "min_cluster_size": 5}
            )
            result.wait()
            print(result.data)
        """
        data = {
            "dataset": dataset,
            "gene_list": genes,
            "components": components,
            "clustering": clustering or {"method": "hdbscan", "min_cluster_size": 5}
        }

        response = self._request("POST", "/v1/analysis/pca", data=data)

        return TaskResult(
            client=self,
            task_id=response["task_id"],
            poll_url=response["poll_url"],
            websocket_url=response.get("websocket_url")
        )

    def correlation(
        self,
        dataset: str,
        genes: List[str],
        method: str = "spearman",
        clustering: Optional[Dict[str, Any]] = None
    ) -> TaskResult:
        """
        Perform correlation analysis

        Args:
            dataset: Dataset ID
            genes: List of gene symbols
            method: Correlation method ("spearman", "pearson", "kendall")
            clustering: Optional clustering parameters

        Returns:
            TaskResult object
        """
        data = {
            "dataset": dataset,
            "gene_list": genes,
            "method": method,
            "clustering": clustering or {
                "method": "hierarchical",
                "linkage": "ward",
                "distance": "euclidean"
            }
        }

        response = self._request("POST", "/v1/analysis/correlation", data=data)

        return TaskResult(
            client=self,
            task_id=response["task_id"],
            poll_url=response["poll_url"],
            websocket_url=response.get("websocket_url")
        )

    def umap(
        self,
        dataset: str,
        genes: List[str],
        n_neighbors: int = 15,
        min_dist: float = 0.1,
        metric: str = "euclidean",
        n_components: int = 2
    ) -> TaskResult:
        """
        Perform UMAP dimensionality reduction

        Args:
            dataset: Dataset ID
            genes: List of gene symbols
            n_neighbors: Number of neighbors for UMAP
            min_dist: Minimum distance for UMAP
            metric: Distance metric
            n_components: Number of dimensions

        Returns:
            TaskResult object
        """
        data = {
            "dataset": dataset,
            "gene_list": genes,
            "n_neighbors": n_neighbors,
            "min_dist": min_dist,
            "metric": metric,
            "n_components": n_components
        }

        response = self._request("POST", "/v1/analysis/umap", data=data)

        return TaskResult(
            client=self,
            task_id=response["task_id"],
            poll_url=response["poll_url"],
            websocket_url=response.get("websocket_url")
        )

    def gene_regulation(
        self,
        dataset: str,
        gene: str,
        top_k_upstream: int = 10,
        top_k_downstream: int = 10,
        correlation_threshold: float = 0.5
    ) -> TaskResult:
        """
        Analyze gene regulation network

        Args:
            dataset: Dataset ID
            gene: Gene symbol to analyze
            top_k_upstream: Number of upstream regulators
            top_k_downstream: Number of downstream targets
            correlation_threshold: Minimum correlation threshold

        Returns:
            TaskResult object
        """
        data = {
            "dataset": dataset,
            "gene": gene,
            "top_k_upstream": top_k_upstream,
            "top_k_downstream": top_k_downstream,
            "correlation_threshold": correlation_threshold
        }

        response = self._request("POST", "/v1/analysis/gene-regulation", data=data)

        return TaskResult(
            client=self,
            task_id=response["task_id"],
            poll_url=response["poll_url"],
            websocket_url=response.get("websocket_url")
        )

    def pathway_finder(
        self,
        datasets: List[str],
        up_genes: List[str],
        down_genes: List[str],
        depth: int = 2,
        correlation_cutoff: float = 0.6,
        include_biogrid: bool = True
    ) -> TaskResult:
        """
        Find pathways between up and down regulated genes

        Args:
            datasets: List of dataset IDs
            up_genes: List of up-regulated genes
            down_genes: List of down-regulated genes
            depth: Search depth (1 or 2)
            correlation_cutoff: Minimum correlation
            include_biogrid: Include BioGrid protein interactions

        Returns:
            TaskResult object
        """
        data = {
            "datasets": datasets,
            "up_genes": up_genes,
            "down_genes": down_genes,
            "depth": depth,
            "correlation_cutoff": correlation_cutoff,
            "include_biogrid": include_biogrid
        }

        response = self._request("POST", "/v1/analysis/pathway", data=data)

        return TaskResult(
            client=self,
            task_id=response["task_id"],
            poll_url=response["poll_url"],
            websocket_url=response.get("websocket_url")
        )


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Initialize client
    client = GenesetRClient(api_key="gsr_prod_your_api_key_here")

    print("=== GenesetR Python Client Example ===\n")

    # 1. Validate API key
    print("1. Validating API key...")
    try:
        usage = client.validate_key()
        print(f"   ✓ Valid API key")
        print(f"   Tier: {usage.tier}")
        print(f"   Requests remaining today: {usage.requests_remaining_today}")
        print(f"   Active jobs: {usage.concurrent_jobs}/{usage.max_concurrent_jobs}")
        print(f"   Computation time: {usage.computation_minutes_used:.1f}/{usage.computation_minutes_quota} minutes")
        print()
    except AuthenticationException as e:
        print(f"   ✗ Authentication failed: {e}")
        exit(1)

    # 2. Get available datasets
    print("2. Fetching available datasets...")
    datasets = client.get_datasets()
    print(f"   Found {len(datasets)} datasets:")
    for ds in datasets[:3]:
        print(f"   - {ds['id']}: {ds['name']} ({ds['gene_count']} genes)")
    print()

    # 3. Run PCA analysis
    print("3. Running PCA analysis...")
    genes_of_interest = ["TP53", "MYC", "EGFR", "KRAS", "BRCA1"]

    result = client.pca(
        dataset="L1000_LINCS",
        genes=genes_of_interest,
        components=3,
        clustering={"method": "hdbscan", "min_cluster_size": 5}
    )

    print(f"   Task submitted: {result.task_id}")

    # Wait with progress callback
    def progress_callback(progress, message):
        print(f"   Progress: {progress}% - {message}")

    try:
        result.wait(timeout=300, callback=progress_callback)
        print(f"   ✓ Analysis complete in {result._computation_time:.2f}s")
        print(f"   Found {len(result.data['clusters'])} clusters")
        print()
    except TimeoutError:
        print("   ✗ Analysis timed out")
        result.cancel()
        exit(1)

    # 4. Run correlation analysis
    print("4. Running correlation analysis...")
    result = client.correlation(
        dataset="L1000_LINCS",
        genes=genes_of_interest,
        method="spearman"
    )

    result.wait()
    print(f"   ✓ Correlation matrix computed")
    print()

    # 5. Analyze gene regulation
    print("5. Analyzing gene regulation network...")
    result = client.gene_regulation(
        dataset="L1000_LINCS",
        gene="TP53",
        top_k_upstream=10,
        top_k_downstream=10
    )

    result.wait()
    print(f"   ✓ Found regulation network for TP53")
    print()

    print("=== Example complete ===")
