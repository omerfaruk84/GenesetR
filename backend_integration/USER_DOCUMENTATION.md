# GenesetR API Documentation

## Overview

GenesetR provides a **free REST API** for programmatic access to genomic analysis tools. The API follows the Enrichr model: free for academic and non-commercial use, with simple rate limiting to ensure fair access for all users.

## Quick Start

### Anonymous Access (No Registration)

```python
import requests

response = requests.post(
    "https://genesetr.uio.no/getData",
    json={
        "request": "PCAGraph",
        "geneList": ["TP53", "MYC", "EGFR"],
        "dataType": 1
    }
)

task_id = response.json()["task_id"]
print(f"Task submitted: {task_id}")
```

**Rate limit:** 10 requests/minute (IP-based)

### Registered Access (Free, Higher Limits)

**Step 1: Get API Key** (one-time)
```bash
curl -X POST https://genesetr.uio.no/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@university.edu",
    "name": "Your Name",
    "institution": "Your University"
  }'
```

You'll receive an API key via email.

**Step 2: Use API Key**
```python
import requests

API_KEY = "gsr_your_key_here"

response = requests.post(
    "https://genesetr.uio.no/getData",
    headers={"X-API-Key": API_KEY},
    json={
        "request": "PCAGraph",
        "geneList": ["TP53", "MYC", "EGFR"],
        "dataType": 1
    }
)
```

**Rate limit:** 30 requests/minute

---

## Rate Limits

| Access Type | Requests/Minute | Concurrent Jobs | Registration |
|-------------|----------------|-----------------|--------------|
| Anonymous (IP-based) | 10 | 1 | None |
| Registered (Free) | 30 | 3 | Email only |
| Heavy Use | Custom | Custom | [Contact us](mailto:api@genesetr.uio.no) |

### What happens if I exceed the rate limit?

You'll receive a `429 Too Many Requests` response:
```json
{
  "error": "Rate limit exceeded",
  "message": "Max 10 requests per minute.",
  "retry_after": 60
}
```

Wait 60 seconds before retrying, or [register for an API key](#registered-access-free-higher-limits) for higher limits.

---

## API Endpoints

### POST /getData

Submit analysis request (PCA, UMAP, correlation, etc.)

**Request:**
```json
{
  "request": "PCAGraph",
  "geneList": ["TP53", "MYC", "EGFR"],
  "dataType": 1,
  "numcomponents": 3
}
```

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted"
}
```

**Available Analyses:**
- `PCAGraph` - Principal Component Analysis
- `corrCluster` - Correlation analysis with clustering
- `UMAP` - Uniform Manifold Approximation
- `tSNE` - t-SNE dimensionality reduction
- `MDE` - Minimum-Distortion Embedding
- `findPath` - Pathway finder
- `biClustering` - Biclustering analysis

See [detailed API documentation](https://genesetr.uio.no/docs) for all parameters.

### GET /tasks/{task_id}

Check task status and get results

**Response (pending):**
```json
{
  "task_id": "550e8400...",
  "task_status": "PENDING",
  "progress": 45
}
```

**Response (complete):**
```json
{
  "task_id": "550e8400...",
  "task_status": "SUCCESS",
  "task_result": {
    "data": [[1,2,3], [4,5,6]],
    "clusters": [0, 0, 1]
  }
}
```

### POST /api/register

Register for free API key (30 req/min)

**Request:**
```json
{
  "email": "you@university.edu",
  "name": "Your Name",
  "institution": "Your University"
}
```

**Response:**
```json
{
  "message": "API key sent to your email",
  "rate_limit": "30 requests per minute"
}
```

### GET /api/rate-limit-status

Check your current rate limit usage

**Response:**
```json
{
  "rate_limit": 30,
  "requests_used": 12,
  "requests_remaining": 18,
  "window": "60 seconds",
  "access_type": "registered"
}
```

---

## Python Client Library

Install:
```bash
pip install genesetr-client
```

Usage:
```python
from genesetr import GenesetR

# Initialize (anonymous or with API key)
gsr = GenesetR(api_key="gsr_xxx")  # API key optional

# Run PCA
result = gsr.pca(
    genes=["TP53", "MYC", "EGFR"],
    num_components=3
)
print(result)

# Run correlation
result = gsr.correlation(
    genes=["TP53", "MYC", "EGFR", "KRAS"]
)

# Run UMAP
result = gsr.umap(
    genes=["TP53", "MYC", "EGFR"],
    n_neighbors=15,
    min_dist=0.1
)

# Find pathways
result = gsr.find_pathway(
    down_genes=["GENE1", "GENE2"],
    up_genes=["GENE3", "GENE4"]
)
```

With progress tracking:
```python
def progress_callback(status, progress):
    print(f"{status}: {progress}%")

result = gsr.pca(
    genes=["TP53", "MYC", "EGFR"],
    progress_callback=progress_callback
)
```

---

## R Client Library

Install:
```r
devtools::install_github("genesetr/genesetr-r")
```

Usage:
```r
library(genesetr)

# Initialize
gsr <- GenesetR$new(api_key = "gsr_xxx")  # API key optional

# Run PCA
result <- gsr$pca(
  genes = c("TP53", "MYC", "EGFR"),
  num_components = 3
)

# Wait for result
result$wait()

# Get data
pca_data <- result$data

# Run correlation
result <- gsr$correlation(
  genes = c("TP53", "MYC", "EGFR", "KRAS")
)

# Convert to matrix
cor_matrix <- do.call(rbind, result$data$correlation_matrix)
heatmap(cor_matrix)
```

---

## Code Examples

### cURL

```bash
# Anonymous request
curl -X POST https://genesetr.uio.no/getData \
  -H "Content-Type: application/json" \
  -d '{
    "request": "PCAGraph",
    "geneList": ["TP53", "MYC", "EGFR"],
    "dataType": 1
  }'

# With API key
curl -X POST https://genesetr.uio.no/getData \
  -H "Content-Type: application/json" \
  -H "X-API-Key: gsr_xxx" \
  -d '{
    "request": "PCAGraph",
    "geneList": ["TP53", "MYC", "EGFR"],
    "dataType": 1
  }'

# Check task status
curl https://genesetr.uio.no/tasks/550e8400-e29b-41d4-a716-446655440000
```

### JavaScript

```javascript
// Anonymous request
const response = await fetch('https://genesetr.uio.no/getData', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    request: 'PCAGraph',
    geneList: ['TP53', 'MYC', 'EGFR'],
    dataType: 1
  })
});

const { task_id } = await response.json();

// Poll for result
const checkStatus = async (taskId) => {
  const res = await fetch(`https://genesetr.uio.no/tasks/${taskId}`);
  const data = await res.json();

  if (data.task_status === 'SUCCESS') {
    return data.task_result;
  } else if (data.task_status === 'FAILURE') {
    throw new Error('Task failed');
  } else {
    // Still running, check again in 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    return checkStatus(taskId);
  }
};

const result = await checkStatus(task_id);
console.log(result);
```

---

## Commercial Use

GenesetR is **free for academic and non-commercial research**.

For **commercial applications**, please [contact us](mailto:api@genesetr.uio.no) to discuss:
- Your use case and requirements
- Expected usage volume
- Potential collaboration or licensing
- Custom rate limits if needed

We're happy to work with commercial users to ensure the service remains sustainable for the academic community.

---

## Best Practices

1. **Reuse results**: Check if your analysis has been cached before submitting a new request
2. **Batch requests**: Group multiple analyses together rather than making many small requests
3. **Handle rate limits**: Implement exponential backoff when you hit rate limits
4. **Use API keys**: Register for an API key if you'll be making regular requests
5. **Cache locally**: Store results locally rather than re-querying frequently
6. **Contact us**: Reach out if you need higher limits for legitimate research

## Example: Batch Analysis

```python
from genesetr import GenesetR
import time

gsr = GenesetR(api_key="gsr_xxx")

gene_sets = {
    "oncogenes": ["MYC", "KRAS", "EGFR"],
    "tumor_suppressors": ["TP53", "BRCA1", "BRCA2"],
    "cell_cycle": ["CDK1", "CDK2", "CCND1"]
}

results = {}

for name, genes in gene_sets.items():
    try:
        result = gsr.pca(genes=genes, num_components=2)
        results[name] = result
        print(f"✓ {name} complete")
    except RateLimitError as e:
        print(f"Rate limit hit, waiting {e.retry_after}s...")
        time.sleep(e.retry_after)
        # Retry
        result = gsr.pca(genes=genes, num_components=2)
        results[name] = result

# Analyze results
for name, result in results.items():
    print(f"\n{name}:")
    print(f"  Clusters: {len(set(result['clusters']))}")
    print(f"  Data points: {len(result['data'])}")
```

---

## Error Codes

| Status Code | Error | Description |
|------------|-------|-------------|
| 400 | Bad Request | Invalid parameters (check gene list, request type) |
| 429 | Rate Limit Exceeded | Too many requests, wait and retry |
| 503 | Service Unavailable | Server at capacity, retry later |
| 500 | Internal Server Error | Server error, contact support if persists |

---

## Support

- **Documentation**: https://genesetr.uio.no/docs
- **API Issues**: https://github.com/genesetr/genesetr/issues
- **Email**: api@genesetr.uio.no
- **Citations**: If you use GenesetR in your research, please cite: [citation info]

---

## Changelog

### v1.0.0 (2025-12-12)
- Initial public API release
- Rate limiting (10 req/min anonymous, 30 req/min registered)
- Free registration system
- Python and R client libraries
- Full documentation

---

*Last updated: December 12, 2025*
