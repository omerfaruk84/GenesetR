# GenesetR REST API - Example Code

This directory contains example implementations and client libraries for the GenesetR REST API.

## Files

### Backend Implementation
- **`api_implementation_example.py`** (~900 lines)
  - FastAPI application structure
  - Database models and authentication
  - Rate limiting with Redis
  - API key generation and validation
  - Example endpoints (PCA, correlation, tasks)
  - Production-ready code patterns

### Client Libraries
- **`python_client_example.py`** (~600 lines)
  - Complete Python client for GenesetR API
  - Async task handling (polling + WebSocket)
  - Progress callbacks and error handling
  - Ready-to-use examples

- **`r_client_example.R`** (~450 lines)
  - R6-based client for bioinformatics researchers
  - Integration with R data frames
  - Visualization-ready outputs
  - Example usage included

### Database
- **`database_migration.sql`** (~500 lines)
  - Complete PostgreSQL schema
  - API keys and usage tracking tables
  - Analytics views and functions
  - Quota management and audit logging

## Quick Start

### 1. Backend Setup
```bash
# Install dependencies
pip install fastapi uvicorn sqlalchemy redis celery websockets pydantic

# Set up database
psql -U postgres -d genesetr < database_migration.sql

# Run the example API server (for testing)
python api_implementation_example.py
```

### 2. Python Client
```python
from python_client_example import GenesetRClient

# Initialize
client = GenesetRClient(api_key="gsr_prod_xxx")

# Run analysis
result = client.pca(
    dataset="L1000_LINCS",
    genes=["TP53", "MYC", "EGFR"],
    components=3
)

# Wait for completion
result.wait()
print(result.data)
```

### 3. R Client
```r
source("r_client_example.R")

# Initialize
client <- GenesetRClient$new(api_key = "gsr_prod_xxx")

# Run analysis
result <- client$pca(
  dataset = "L1000_LINCS",
  genes = c("TP53", "MYC", "EGFR"),
  components = 3
)

# Get results
result$wait()
pca_data <- result$data
```

## Documentation

For complete implementation guide, see:
- `../REST_API_DESIGN.md` - Comprehensive design specification
- `../REST_API_IMPLEMENTATION_SUMMARY.md` - Quick start guide

## Notes

These are **example implementations** to demonstrate the design patterns. For production:
1. Organize code into proper module structure
2. Add comprehensive error handling
3. Configure production settings (secrets, URLs)
4. Add tests
5. Set up monitoring and logging
6. Follow security checklist

## License

Same as GenesetR main project.
