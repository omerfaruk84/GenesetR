# GenesetR REST API Design

## Overview

This document outlines the design for adding REST API access to GenesetR, enabling programmatic access to computational analysis while maintaining security, rate limiting, and queue management.

## Architecture

### Current System
- **Frontend**: React SPA (this repository)
- **Backend**: Python (FastAPI) - separate deployment
- **Task Queue**: Celery for async job processing
- **Cache**: Redis for results and sessions
- **Real-time**: WebSocket for progress updates

### API Access Model
```
API Client → API Gateway → Authentication → Rate Limiter → Task Queue → Celery Worker → Results
                                                              ↓
                                                          Redis Cache
```

---

## 1. Authentication & Authorization

### API Key System

#### API Key Structure
```
Format: gsr_<environment>_<random_32_chars>
Example: gsr_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

Components:
- Prefix: 'gsr_' (GeneSetR identifier)
- Environment: 'prod', 'dev', 'test'
- Key: 32-character random string (cryptographically secure)
```

#### API Key Storage (Database Schema)
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of API key
    key_prefix VARCHAR(12) NOT NULL,        -- First 12 chars for identification
    user_id VARCHAR(255) NOT NULL,          -- Email or institutional ID
    organization VARCHAR(255),              -- Institution/Organization
    tier VARCHAR(20) NOT NULL,              -- 'free', 'academic', 'premium'

    -- Rate limiting
    requests_per_minute INTEGER DEFAULT 10,
    requests_per_hour INTEGER DEFAULT 100,
    requests_per_day INTEGER DEFAULT 1000,
    concurrent_jobs INTEGER DEFAULT 2,

    -- Quotas
    max_computation_minutes_per_month INTEGER DEFAULT 60,
    used_computation_minutes_current_month INTEGER DEFAULT 0,

    -- Permissions
    allowed_endpoints TEXT[],               -- Array of allowed endpoint patterns
    allowed_datasets TEXT[],                -- Array of allowed dataset IDs
    max_gene_list_size INTEGER DEFAULT 100,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,                   -- NULL for no expiration
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,

    -- IP restrictions (optional)
    allowed_ips INET[],

    INDEX idx_key_hash (key_hash),
    INDEX idx_user_id (user_id),
    INDEX idx_tier (tier)
);

-- Usage tracking table
CREATE TABLE api_usage (
    id BIGSERIAL PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id),
    endpoint VARCHAR(255) NOT NULL,
    request_method VARCHAR(10),

    -- Request details
    gene_count INTEGER,
    dataset_id VARCHAR(100),
    computation_seconds INTEGER,

    -- Response details
    status_code INTEGER,
    error_message TEXT,

    -- Timestamps
    requested_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    -- Client info
    ip_address INET,
    user_agent TEXT,

    INDEX idx_api_key_requested (api_key_id, requested_at),
    INDEX idx_endpoint (endpoint)
);
```

#### API Key Tiers

| Tier | Rate Limit (req/min) | Daily Requests | Concurrent Jobs | Max Gene List | Computation Time/Month | Cost |
|------|---------------------|----------------|-----------------|---------------|----------------------|------|
| **Free** | 10 | 100 | 1 | 50 genes | 30 minutes | Free |
| **Academic** | 30 | 1000 | 3 | 200 genes | 180 minutes | Free (verified .edu email) |
| **Premium** | 100 | 10000 | 10 | 1000 genes | 1000 minutes | $99/month |
| **Enterprise** | Custom | Custom | Custom | Unlimited | Unlimited | Custom pricing |

#### Authentication Flow
```
1. User requests API key via web interface or email
2. Admin approves and creates key
3. User receives API key (shown ONCE, never stored in plaintext)
4. User includes key in requests:
   - Header: Authorization: Bearer gsr_prod_xxx
   - Or Query param: ?api_key=gsr_prod_xxx (less secure, for testing)
```

---

## 2. Rate Limiting & Queue Management

### Multi-Level Rate Limiting

#### 1. Request Rate Limiting (Before Task Creation)
```python
Rate Limits per API Key:
- Requests per minute: tier-specific
- Requests per hour: tier-specific
- Requests per day: tier-specific

Implementation: Redis with sliding window
Key format: rate_limit:{api_key_id}:{window}:{timestamp}
```

#### 2. Concurrent Job Limiting
```python
Per API Key:
- Max concurrent running tasks: tier-specific
- Prevents resource monopolization

Implementation: Redis counter
Key: active_jobs:{api_key_id}
```

#### 3. Computation Time Quotas
```python
Per API Key per Month:
- Total computation minutes used
- Resets monthly
- Warnings at 80%, 90%, 100%

Implementation: PostgreSQL tracking
Monthly reset via cron job
```

### Queue Management

#### Queue Priority System
```python
Queue Priorities:
1. High Priority: Premium tier, < 50 genes, cached results available
2. Medium Priority: Academic tier, moderate size
3. Low Priority: Free tier, large gene lists

Celery Configuration:
celery_app.conf.task_routes = {
    'genesetr.tasks.*': {
        'queue': 'priority_{tier}',
        'routing_key': 'priority_{tier}'
    }
}
```

#### Task Timeout & Resource Limits
```python
Tier-Based Timeouts:
- Free: 5 minutes max
- Academic: 15 minutes max
- Premium: 30 minutes max
- Enterprise: 60 minutes max

Memory Limits:
- Free: 2GB
- Academic: 4GB
- Premium: 8GB
- Enterprise: 16GB
```

---

## 3. Security Measures

### Input Validation
```python
Validations:
1. Gene List:
   - Max size based on tier
   - Valid gene symbols (HUGO nomenclature)
   - Sanitize against injection attacks

2. Dataset IDs:
   - Whitelist of valid dataset IDs
   - Check API key permissions

3. Parameters:
   - Type checking (int, float, string)
   - Range validation (e.g., PCA components: 2-50)
   - Enum validation (e.g., correlation method: spearman|pearson|kendall)

4. Request Size:
   - Max request body: 1MB
   - Max gene list in single request: tier-specific
```

### CORS & Security Headers
```python
CORS Configuration:
- Allowed origins: configurable whitelist
- Credentials: True (for cookies if needed)
- Exposed headers: X-RateLimit-*, X-Task-ID

Security Headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### IP Whitelisting (Optional)
```python
Per API Key:
- Optional IP whitelist
- CIDR notation support
- Useful for institutional access
```

### Audit Logging
```python
Log All API Requests:
- Timestamp
- API key (hashed)
- Endpoint
- Parameters (sanitized)
- IP address
- Response status
- Error messages
- Computation time

Retention: 90 days (configurable)
Storage: PostgreSQL + log files
```

---

## 4. API Endpoint Design

### Base URL
```
Production: https://api.genesetr.uio.no/v1
Development: https://api-dev.genesetr.uio.no/v1
```

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "task_id": "uuid-here",
  "status": "completed|pending|failed",
  "message": "Optional message",
  "computation_time": 12.5,
  "cached": false,
  "meta": {
    "timestamp": "2025-12-12T10:30:00Z",
    "rate_limit_remaining": 95,
    "rate_limit_reset": "2025-12-12T10:31:00Z"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_GENE_LIST",
    "message": "Gene list contains invalid symbols",
    "details": {
      "invalid_genes": ["INVALID1", "INVALID2"],
      "valid_genes_count": 45
    }
  },
  "meta": {
    "timestamp": "2025-12-12T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Core Endpoints

#### 1. Authentication & Account Management

##### POST /v1/auth/validate
Validate API key and get account info
```bash
curl -H "Authorization: Bearer gsr_prod_xxx" \
  https://api.genesetr.uio.no/v1/auth/validate
```

Response:
```json
{
  "valid": true,
  "tier": "academic",
  "usage": {
    "requests_remaining_today": 856,
    "concurrent_jobs": 1,
    "max_concurrent_jobs": 3,
    "computation_minutes_used": 45,
    "computation_minutes_quota": 180
  },
  "permissions": {
    "max_gene_list_size": 200,
    "allowed_endpoints": ["*"],
    "allowed_datasets": ["*"]
  }
}
```

##### GET /v1/auth/usage
Get detailed usage statistics
```bash
curl -H "Authorization: Bearer gsr_prod_xxx" \
  https://api.genesetr.uio.no/v1/auth/usage?days=30
```

#### 2. Dataset Information

##### GET /v1/datasets
List available datasets
```bash
curl -H "Authorization: Bearer gsr_prod_xxx" \
  https://api.genesetr.uio.no/v1/datasets
```

Response:
```json
{
  "datasets": [
    {
      "id": "L1000_LINCS",
      "name": "LINCS L1000",
      "description": "Library of Integrated Network-based Cellular Signatures",
      "gene_count": 12328,
      "perturbation_count": 42080,
      "data_type": 1,
      "access": "public"
    }
  ]
}
```

##### GET /v1/datasets/{dataset_id}/genes
Get all genes for a dataset
```bash
curl -H "Authorization: Bearer gsr_prod_xxx" \
  https://api.genesetr.uio.no/v1/datasets/L1000_LINCS/genes
```

#### 3. Analysis Endpoints

##### POST /v1/analysis/pca
Principal Component Analysis
```bash
curl -X POST https://api.genesetr.uio.no/v1/analysis/pca \
  -H "Authorization: Bearer gsr_prod_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": "L1000_LINCS",
    "gene_list": ["TP53", "MYC", "EGFR"],
    "components": 3,
    "clustering": {
      "method": "hdbscan",
      "min_cluster_size": 5
    }
  }'
```

Response (Async):
```json
{
  "success": true,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "PCA analysis started",
  "estimated_time": 30,
  "poll_url": "/v1/tasks/550e8400-e29b-41d4-a716-446655440000",
  "websocket_url": "wss://api.genesetr.uio.no/v1/ws/tasks/550e8400-e29b-41d4-a716-446655440000"
}
```

##### POST /v1/analysis/correlation
Correlation Analysis
```bash
curl -X POST https://api.genesetr.uio.no/v1/analysis/correlation \
  -H "Authorization: Bearer gsr_prod_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": "L1000_LINCS",
    "gene_list": ["TP53", "MYC", "EGFR", "KRAS"],
    "method": "spearman",
    "clustering": {
      "method": "hierarchical",
      "linkage": "ward",
      "distance": "euclidean"
    }
  }'
```

##### POST /v1/analysis/umap
UMAP Dimensionality Reduction
```bash
curl -X POST https://api.genesetr.uio.no/v1/analysis/umap \
  -H "Authorization: Bearer gsr_prod_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": "L1000_LINCS",
    "gene_list": ["TP53", "MYC"],
    "n_neighbors": 15,
    "min_dist": 0.1,
    "metric": "euclidean",
    "n_components": 2
  }'
```

##### POST /v1/analysis/gene-regulation
Gene Regulation Network
```bash
curl -X POST https://api.genesetr.uio.no/v1/analysis/gene-regulation \
  -H "Authorization: Bearer gsr_prod_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": "L1000_LINCS",
    "gene": "TP53",
    "top_k_upstream": 10,
    "top_k_downstream": 10,
    "correlation_threshold": 0.5,
    "include_biogrid": false
  }'
```

##### POST /v1/analysis/pathway
Pathway Finder
```bash
curl -X POST https://api.genesetr.uio.no/v1/analysis/pathway \
  -H "Authorization: Bearer gsr_prod_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "datasets": ["L1000_LINCS"],
    "up_genes": ["TP53", "MYC"],
    "down_genes": ["EGFR", "KRAS"],
    "depth": 2,
    "correlation_cutoff": 0.6,
    "include_biogrid": true
  }'
```

##### POST /v1/analysis/gene-signature
Gene Signature Calculator
```bash
curl -X POST https://api.genesetr.uio.no/v1/analysis/gene-signature \
  -H "Authorization: Bearer gsr_prod_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "datasets": ["L1000_LINCS", "GSE92742"],
    "formula": "(TP53 + MYC) - (EGFR + KRAS)",
    "normalization": "zscore"
  }'
```

#### 4. Task Management

##### GET /v1/tasks/{task_id}
Get task status and results
```bash
curl -H "Authorization: Bearer gsr_prod_xxx" \
  https://api.genesetr.uio.no/v1/tasks/550e8400-e29b-41d4-a716-446655440000
```

Response (Completed):
```json
{
  "success": true,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "result": {
    "coordinates": [...],
    "clusters": [...],
    "explained_variance": [0.45, 0.23, 0.15]
  },
  "computation_time": 12.5,
  "cached": false,
  "created_at": "2025-12-12T10:30:00Z",
  "completed_at": "2025-12-12T10:30:12Z"
}
```

Response (Running):
```json
{
  "success": true,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress": 45,
  "message": "Computing PCA components...",
  "estimated_time_remaining": 15
}
```

##### DELETE /v1/tasks/{task_id}
Cancel a running task
```bash
curl -X DELETE -H "Authorization: Bearer gsr_prod_xxx" \
  https://api.genesetr.uio.no/v1/tasks/550e8400-e29b-41d4-a716-446655440000
```

##### GET /v1/tasks
List user's tasks
```bash
curl -H "Authorization: Bearer gsr_prod_xxx" \
  "https://api.genesetr.uio.no/v1/tasks?status=running&limit=20"
```

#### 5. Batch Operations

##### POST /v1/batch/submit
Submit multiple analyses in batch
```bash
curl -X POST https://api.genesetr.uio.no/v1/batch/submit \
  -H "Authorization: Bearer gsr_prod_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jobs": [
      {
        "id": "job1",
        "endpoint": "pca",
        "params": {...}
      },
      {
        "id": "job2",
        "endpoint": "correlation",
        "params": {...}
      }
    ]
  }'
```

Response:
```json
{
  "batch_id": "batch_abc123",
  "jobs": [
    {"id": "job1", "task_id": "uuid1", "status": "pending"},
    {"id": "job2", "task_id": "uuid2", "status": "pending"}
  ],
  "poll_url": "/v1/batch/batch_abc123"
}
```

##### GET /v1/batch/{batch_id}
Get batch status
```bash
curl -H "Authorization: Bearer gsr_prod_xxx" \
  https://api.genesetr.uio.no/v1/batch/batch_abc123
```

---

## 5. Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### Backend Changes (Python/FastAPI)

**File Structure:**
```
backend/
├── api/
│   ├── v1/
│   │   ├── __init__.py
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── datasets.py          # Dataset endpoints
│   │   ├── analysis.py          # Analysis endpoints
│   │   ├── tasks.py             # Task management endpoints
│   │   └── batch.py             # Batch operations
│   ├── middleware/
│   │   ├── auth_middleware.py   # API key validation
│   │   ├── rate_limiter.py      # Rate limiting
│   │   └── error_handler.py     # Global error handling
│   ├── models/
│   │   ├── api_key.py           # API key models
│   │   ├── usage.py             # Usage tracking models
│   │   └── request.py           # Request/Response models
│   ├── services/
│   │   ├── auth_service.py      # API key management
│   │   ├── rate_limit_service.py
│   │   ├── queue_service.py     # Queue management
│   │   └── cache_service.py
│   └── utils/
│       ├── validators.py        # Input validation
│       └── security.py          # Security utilities
├── alembic/                     # Database migrations
│   └── versions/
│       └── 001_create_api_tables.py
├── tests/
│   └── api/
│       └── test_v1_endpoints.py
└── config/
    └── api_config.py
```

**Tasks:**
1. Database schema for API keys and usage tracking
2. API key generation and validation system
3. Rate limiting middleware using Redis
4. Authentication middleware
5. Input validation framework
6. Error handling and standardized responses

### Phase 2: Core Endpoints (Week 3-4)

**Tasks:**
1. Implement authentication endpoints (`/v1/auth/*`)
2. Implement dataset endpoints (`/v1/datasets/*`)
3. Implement task management endpoints (`/v1/tasks/*`)
4. Migrate existing analysis to new endpoints:
   - `/v1/analysis/pca`
   - `/v1/analysis/correlation`
   - `/v1/analysis/umap`
5. Add comprehensive OpenAPI/Swagger documentation

### Phase 3: Advanced Analysis & Queue (Week 5-6)

**Tasks:**
1. Implement remaining analysis endpoints:
   - `/v1/analysis/tsne`
   - `/v1/analysis/mde`
   - `/v1/analysis/gene-regulation`
   - `/v1/analysis/pathway`
   - `/v1/analysis/gene-signature`
2. Implement priority queue system
3. Add concurrent job limiting
4. Add computation time tracking
5. Implement batch operations

### Phase 4: Admin & Monitoring (Week 7)

**Tasks:**
1. Admin dashboard for API key management
2. Usage analytics and reporting
3. Monitoring and alerting (Prometheus/Grafana)
4. API documentation website
5. Rate limit visualization

### Phase 5: Testing & Documentation (Week 8)

**Tasks:**
1. Comprehensive API testing
2. Load testing and performance optimization
3. Security audit
4. API client libraries (Python, R)
5. User documentation and tutorials
6. Migration guide for existing users

---

## 6. API Client Libraries

### Python Client Example
```python
from genesetr import GenesetRClient

# Initialize client
client = GenesetRClient(api_key="gsr_prod_xxx")

# Run PCA analysis
result = client.pca(
    dataset="L1000_LINCS",
    genes=["TP53", "MYC", "EGFR"],
    components=3,
    clustering={"method": "hdbscan"}
)

# Wait for result (with progress callback)
def progress_callback(progress, message):
    print(f"{progress}%: {message}")

result.wait(callback=progress_callback)

# Get results
print(result.data)
print(f"Computation time: {result.computation_time}s")
```

### R Client Example
```r
library(genesetR)

# Initialize client
client <- GenesetRClient$new(api_key = "gsr_prod_xxx")

# Run correlation analysis
result <- client$correlation(
  dataset = "L1000_LINCS",
  genes = c("TP53", "MYC", "EGFR", "KRAS"),
  method = "spearman"
)

# Wait for result
result$wait()

# Get results as data frame
cor_matrix <- result$data$correlation_matrix
plot(heatmap(cor_matrix))
```

---

## 7. Monitoring & Observability

### Metrics to Track
```python
API Metrics:
- Request rate (per endpoint, per tier)
- Response times (p50, p95, p99)
- Error rates (by error type)
- Active tasks count
- Queue depths (by priority)
- Cache hit rates

Resource Metrics:
- CPU usage (per worker)
- Memory usage (per worker)
- Redis memory usage
- Database connection pool

Business Metrics:
- Daily active API keys
- Monthly active users
- Computation minutes consumed (by tier)
- Top endpoints by usage
- Average gene list size
```

### Alerting Rules
```yaml
Alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    severity: warning

  - name: RateLimitExceeded
    condition: rate_limit_hits > 100/min
    duration: 1m
    severity: info

  - name: QueueBacklog
    condition: pending_tasks > 1000
    duration: 10m
    severity: warning

  - name: LongRunningTask
    condition: task_duration > 30min
    severity: warning
```

---

## 8. Cost Estimation

### Infrastructure Costs (Monthly)

| Component | Free Tier | Academic | Premium | Enterprise |
|-----------|-----------|----------|---------|------------|
| Compute (Celery workers) | 1 worker | 2 workers | 5 workers | Custom |
| Redis (cache) | 512MB | 2GB | 8GB | Custom |
| Database | Shared | Dedicated | Dedicated | Dedicated |
| Monitoring | Basic | Standard | Advanced | Custom |
| **Estimated Cost** | $10 | $50 | $300 | Custom |

### Revenue Potential
- 1000 free users: $0
- 100 academic users: $0 (goodwill, citations)
- 20 premium users: $1,980/month
- 2 enterprise users: $2,000/month (minimum)
- **Total: ~$4,000/month**

---

## 9. Security Checklist

- [ ] API keys stored as hashed values only
- [ ] Rate limiting on all endpoints
- [ ] Input validation and sanitization
- [ ] SQL injection prevention (parameterized queries)
- [ ] CORS configuration
- [ ] HTTPS only (TLS 1.3)
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] IP whitelisting (optional per key)
- [ ] Request size limits
- [ ] Timeout limits on all operations
- [ ] DDoS protection (Cloudflare/AWS Shield)
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] API key rotation capability
- [ ] Emergency key revocation

---

## 10. Migration Strategy

### For Existing Web Users
```
No changes required!
- Web interface continues to work
- Same functionality
- No disruption
```

### For New API Users
```
1. Request API key via web form
2. Receive key via email
3. Read API documentation
4. Install client library (optional)
5. Start making requests
```

### Deprecation Plan (if changing existing APIs)
```
Timeline:
- Month 1-3: Both old and new APIs work
- Month 4-6: Old API marked deprecated
- Month 7-9: Warning emails to users still using old API
- Month 10+: Old API disabled
```

---

## 11. Documentation Requirements

### API Documentation
- OpenAPI/Swagger specification
- Interactive API explorer
- Code examples (Python, R, curl)
- Error code reference
- Rate limit guide

### User Guides
- Getting started tutorial
- Authentication guide
- Best practices
- Troubleshooting
- FAQ

### Developer Documentation
- Architecture overview
- Deployment guide
- Contributing guide
- Testing guide

---

## Summary

This design provides:

✅ **Security**: API key authentication, input validation, audit logging
✅ **Rate Limiting**: Multi-tier system with request, concurrency, and quota limits
✅ **Queue Management**: Priority queues, timeouts, resource limits
✅ **Scalability**: Async task processing, caching, horizontal scaling
✅ **Observability**: Comprehensive metrics, logging, alerting
✅ **User Experience**: Clear API design, client libraries, documentation
✅ **Business Model**: Tiered pricing, usage tracking, cost control

**Next Steps:**
1. Review and approve design
2. Set up development environment
3. Implement Phase 1 (core infrastructure)
4. Beta test with selected users
5. Production launch
