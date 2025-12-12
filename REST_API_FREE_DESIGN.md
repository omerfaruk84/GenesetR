# GenesetR Public REST API - Free Academic Access

## Overview

This is a **simplified design** for adding public REST API access to GenesetR, following the **Enrichr model**: free for academic use, with simple rate limiting to ensure fair resource allocation given limited server capacity.

**Key Principles:**
- ✅ **Free for everyone** (academic and non-commercial use)
- ✅ **Simple rate limiting** to prevent abuse and ensure fair access
- ✅ **Queue management** to handle server capacity
- ✅ **Optional API keys** for tracking heavy users (not for billing)
- ✅ **Commercial users contact developers** for special arrangements
- ✅ **Use existing API structure** (minimal changes needed)

---

## Current API Structure (Already Working!)

You already have most of what you need:

```
✅ /getData - Main endpoint for all analyses
✅ Celery task queue for async processing
✅ Redis caching with parameter hashing
✅ user_id tracking
✅ /tasks/{task_id} - Status checking
✅ WebSocket for progress updates
```

**You just need to add:**
1. Simple rate limiting (Redis-based)
2. Queue capacity management
3. Public documentation
4. Optional API keys for tracking
5. Simple client libraries

---

## Simplified Design

### 1. Access Model

#### Anonymous Access (Default)
```
Rate limit: 10 requests per minute per IP
Concurrent jobs: 1 per IP
No registration needed
Perfect for: Testing, light usage, individual researchers
```

#### Registered Access (Optional, Free)
```
Rate limit: 30 requests per minute
Concurrent jobs: 3
Requires: Email registration (just for contact)
Perfect for: Regular users, batch analyses
```

#### Heavy Users (Contact Developers)
```
Custom limits negotiated
For: Large-scale studies, commercial use, institutional access
Contact: api@genesetr.uio.no
```

### 2. Rate Limiting (Fair Access)

Use your existing Redis instance to add simple rate limiting:

```python
# Simple IP-based rate limiting (for anonymous users)
def check_rate_limit(ip_address, limit=10, window=60):
    """
    Check if IP has exceeded rate limit
    limit: requests allowed per window
    window: time window in seconds
    """
    key = f"rate_limit:{ip_address}:{int(time.time() / window)}"
    count = redis.incr(key)
    redis.expire(key, window)

    if count > limit:
        return False, f"Rate limit exceeded. Max {limit} requests per minute."

    return True, f"{limit - count} requests remaining"

# Optional: API key-based (for registered users)
def check_api_key_limit(api_key, limit=30, window=60):
    """Same logic but with higher limits for registered users"""
    key = f"rate_limit:key:{api_key}:{int(time.time() / window)}"
    # ... same as above but with limit=30
```

### 3. Queue Management (Server Capacity)

Add simple queue capacity checks:

```python
def check_queue_capacity():
    """
    Check if server can accept new tasks
    Returns: (can_accept, message, estimated_wait_time)
    """
    # Check Celery queue length
    active_tasks = celery_app.control.inspect().active()
    reserved_tasks = celery_app.control.inspect().reserved()

    total_tasks = sum(len(tasks) for tasks in active_tasks.values())

    # Server capacity limits
    MAX_CONCURRENT_TASKS = 50  # Adjust based on your server
    MAX_QUEUE_LENGTH = 100

    if total_tasks >= MAX_CONCURRENT_TASKS:
        wait_time = estimate_wait_time(total_tasks)
        return False, f"Server at capacity. Please try again in {wait_time} minutes.", wait_time

    return True, "OK", 0
```

### 4. Modified `/getData` Endpoint

Add rate limiting to your existing endpoint:

```python
@app.post("/getData")
async def get_data(request: Request, body: dict):
    """Your existing getData endpoint with added rate limiting"""

    # Get IP or API key
    ip_address = request.client.host
    api_key = request.headers.get("X-API-Key")  # Optional

    # Check rate limit
    if api_key:
        allowed, message = check_api_key_limit(api_key, limit=30)
    else:
        allowed, message = check_rate_limit(ip_address, limit=10)

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "message": message}
        )

    # Check queue capacity
    can_accept, queue_message, wait_time = check_queue_capacity()
    if not can_accept:
        return JSONResponse(
            status_code=503,
            content={
                "error": "Server busy",
                "message": queue_message,
                "retry_after": wait_time * 60  # seconds
            }
        )

    # Your existing logic continues...
    # ... (all your current getData implementation)
```

### 5. Optional API Key System (Simple)

**No database needed** - just use Redis for tracking:

```python
# Generate simple API key (one-time, send via email)
def generate_api_key(email):
    """Generate simple API key"""
    random_part = secrets.token_urlsafe(24)
    api_key = f"gsr_{random_part}"

    # Store in Redis (not a database - simpler!)
    redis.hset(f"api_key:{api_key}", mapping={
        "email": email,
        "created": datetime.now().isoformat(),
        "requests_today": 0,
        "last_used": None
    })

    return api_key

# Validate API key
def validate_api_key(api_key):
    """Check if API key exists"""
    if not api_key or not api_key.startswith("gsr_"):
        return None

    key_data = redis.hgetall(f"api_key:{api_key}")
    if not key_data:
        return None

    # Update last used
    redis.hset(f"api_key:{api_key}", "last_used", datetime.now().isoformat())

    return key_data
```

### 6. Simple Registration Page (Optional)

Add a simple form on your website:

```html
<!-- /api/register page -->
<form action="/api/register" method="POST">
  <h2>Get Free API Access</h2>
  <p>Registration is optional but gives you higher rate limits.</p>

  <label>Email (for contact only):</label>
  <input type="email" name="email" required>

  <label>Name:</label>
  <input type="text" name="name" required>

  <label>Institution (optional):</label>
  <input type="text" name="institution">

  <label>Use case (optional):</label>
  <textarea name="use_case"></textarea>

  <button type="submit">Get API Key</button>
</form>
```

Response: Email user their API key and show usage instructions.

---

## Updated Documentation

### For Users

#### Quick Start (Anonymous)

```python
import requests

# No API key needed!
response = requests.post(
    "https://genesetr.uio.no/getData",
    json={
        "request": "PCAGraph",
        "geneList": ["TP53", "MYC", "EGFR"],
        "dataType": 1
    }
)

task_id = response.json()["task_id"]

# Check status
status = requests.get(f"https://genesetr.uio.no/tasks/{task_id}")
print(status.json())
```

#### With API Key (Higher Limits)

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

#### Rate Limits

| Access Type | Requests/min | Concurrent Jobs | Registration |
|-------------|--------------|-----------------|--------------|
| Anonymous (IP-based) | 10 | 1 | None |
| Registered (Free) | 30 | 3 | Email only |
| Heavy Use | Custom | Custom | Contact us |

#### Commercial Use

GenesetR is free for academic and non-commercial research. For commercial use, please contact us at api@genesetr.uio.no to discuss:
- Your use case
- Expected usage volume
- Potential collaboration opportunities

---

## Simple Python Client Library

```python
"""
GenesetR Python Client - Simple wrapper for easy API access
"""

import requests
import time
from typing import Optional, Dict, Any, List

class GenesetRClient:
    """
    Simple client for GenesetR API

    Example:
        # Anonymous access
        client = GenesetRClient()

        # Or with API key (higher limits)
        client = GenesetRClient(api_key="gsr_xxx")

        # Run PCA
        result = client.pca(genes=["TP53", "MYC", "EGFR"])
        print(result)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://genesetr.uio.no"
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

        if api_key:
            self.session.headers["X-API-Key"] = api_key

    def _request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit request and wait for result"""
        # Submit task
        response = self.session.post(f"{self.base_url}/getData", json=data)
        response.raise_for_status()

        task_id = response.json()["task_id"]

        # Wait for completion
        while True:
            status_response = self.session.get(f"{self.base_url}/tasks/{task_id}")
            status_data = status_response.json()

            if status_data["task_status"] == "SUCCESS":
                return status_data["task_result"]
            elif status_data["task_status"] == "FAILURE":
                raise Exception(f"Task failed: {status_data.get('error')}")

            time.sleep(2)  # Poll every 2 seconds

    def pca(
        self,
        genes: List[str],
        data_type: int = 1,
        num_components: int = 3,
        **kwargs
    ) -> Dict[str, Any]:
        """Run PCA analysis"""
        return self._request({
            "request": "PCAGraph",
            "geneList": genes,
            "dataType": data_type,
            "numcomponents": num_components,
            **kwargs
        })

    def correlation(
        self,
        genes: List[str],
        data_type: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Run correlation analysis"""
        return self._request({
            "request": "corrCluster",
            "geneList": genes,
            "dataType": data_type,
            **kwargs
        })

    def umap(
        self,
        genes: List[str],
        data_type: int = 1,
        num_components: int = 3,
        **kwargs
    ) -> Dict[str, Any]:
        """Run UMAP analysis"""
        return self._request({
            "request": "UMAP",
            "geneList": genes,
            "dataType": data_type,
            "numcomponents": num_components,
            **kwargs
        })

    def find_pathway(
        self,
        down_genes: List[str],
        up_genes: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Run pathway finder"""
        data = {
            "request": "findPath",
            "downgeneList": down_genes,
            **kwargs
        }
        if up_genes:
            data["upgeneList"] = up_genes

        return self._request(data)


# Usage example
if __name__ == "__main__":
    # Anonymous access (10 req/min)
    client = GenesetRClient()

    # Or with API key (30 req/min)
    # client = GenesetRClient(api_key="gsr_xxx")

    # Run PCA
    genes = ["TP53", "MYC", "EGFR", "KRAS"]
    result = client.pca(genes=genes, data_type=1, num_components=3)

    print(f"PCA complete! Found {len(result['data'])} points")
```

---

## Implementation Steps (MUCH SIMPLER!)

### Phase 1: Add Rate Limiting (1-2 days)

```python
# Add to your existing Flask/FastAPI app
from functools import wraps
from flask import request, jsonify
import redis
import time

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def rate_limit(limit=10, window=60):
    """Decorator for rate limiting endpoints"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Get identifier (API key or IP)
            api_key = request.headers.get('X-API-Key')
            identifier = api_key if api_key else request.remote_addr

            # Determine limit
            current_limit = 30 if api_key else limit

            # Check rate
            key = f"rate:{identifier}:{int(time.time() / window)}"
            count = redis_client.incr(key)
            redis_client.expire(key, window)

            if count > current_limit:
                return jsonify({
                    "error": "Rate limit exceeded",
                    "message": f"Max {current_limit} requests per minute"
                }), 429

            return f(*args, **kwargs)
        return wrapped
    return decorator

# Apply to your endpoint
@app.post("/getData")
@rate_limit(limit=10, window=60)
def get_data():
    # Your existing code...
    pass
```

### Phase 2: Add Queue Management (1 day)

```python
def check_capacity():
    """Check if we can accept new tasks"""
    # Get active task count from Celery
    inspect = celery_app.control.inspect()
    active = inspect.active()

    if active:
        total = sum(len(tasks) for tasks in active.values())

        if total >= 50:  # Your server limit
            return False, "Server at capacity, please try again later"

    return True, None

# Add to getData endpoint
@app.post("/getData")
@rate_limit(limit=10, window=60)
def get_data():
    # Check capacity
    can_accept, error_msg = check_capacity()
    if not can_accept:
        return jsonify({"error": error_msg}), 503

    # Your existing code...
```

### Phase 3: Optional API Keys (1 day)

```python
# Simple registration endpoint
@app.post("/api/register")
def register():
    email = request.json.get("email")
    name = request.json.get("name")

    # Generate key
    api_key = f"gsr_{secrets.token_urlsafe(24)}"

    # Store in Redis
    redis_client.hset(f"key:{api_key}", mapping={
        "email": email,
        "name": name,
        "created": datetime.now().isoformat()
    })

    # Email the key (use your email service)
    send_email(email, f"Your API key: {api_key}")

    return jsonify({
        "message": "API key sent to your email",
        "rate_limit": "30 requests per minute"
    })
```

### Phase 4: Documentation (1-2 days)

1. Update your existing `/docs` page
2. Add examples with curl, Python, R
3. Add rate limit information
4. Add "Contact for commercial use" notice

### Phase 5: Client Libraries (2-3 days)

1. Publish simple Python client (see above)
2. Create R client (similar structure)
3. Publish to PyPI and CRAN

**Total implementation time: ~1 week** (vs. 8 weeks for commercial version!)

---

## Comparison with Previous Design

| Feature | Commercial Design | Free Academic Design |
|---------|------------------|---------------------|
| **Access** | Paid tiers | Free for all |
| **API Keys** | Required, in database | Optional, in Redis |
| **Rate Limiting** | Complex multi-tier | Simple 2-tier (anon/registered) |
| **Database** | PostgreSQL with migrations | Just Redis (already have!) |
| **Billing** | Usage tracking, quotas | None |
| **Implementation** | 8 weeks | 1 week |
| **Maintenance** | High (billing, support) | Low (just monitoring) |
| **Lines of Code** | ~2,500 | ~200 |

---

## Monitoring (Simple)

Track basic metrics in Redis:

```python
# Track usage
def log_request(endpoint, identifier):
    """Log request for analytics"""
    date = datetime.now().strftime("%Y-%m-%d")

    # Increment counters
    redis_client.hincrby(f"stats:{date}", "total_requests", 1)
    redis_client.hincrby(f"stats:{date}", f"endpoint:{endpoint}", 1)
    redis_client.hincrby(f"stats:{date}", f"user:{identifier}", 1)

# View stats
@app.get("/api/stats")  # Admin only
def get_stats():
    """View daily statistics"""
    date = datetime.now().strftime("%Y-%m-%d")
    stats = redis_client.hgetall(f"stats:{date}")
    return jsonify(stats)
```

---

## Notice for Commercial Users

Add this to your documentation and website:

```
## Commercial Use

GenesetR is freely available for academic and non-commercial research use.

For commercial applications, please contact us at api@genesetr.uio.no to discuss:
- Your use case and requirements
- Expected usage volume
- Potential collaboration or licensing arrangements
- Custom rate limits if needed

We're happy to work with commercial users to ensure the service remains
sustainable for the academic community.
```

---

## Summary

### What You Already Have ✅
- Working API (`/getData`, task system)
- Celery queue
- Redis caching
- WebSocket updates
- Task tracking

### What You Need to Add (Simple!)
1. **Rate limiting** (50 lines of code)
2. **Queue capacity check** (30 lines)
3. **Optional API keys** (100 lines)
4. **Documentation** (update existing)
5. **Simple client library** (200 lines)

**Total new code: ~400 lines** (vs. 2,500 for commercial design)

**Implementation time: 1 week** (vs. 8 weeks)

**Maintenance: Minimal** - just monitor usage and adjust limits if needed

This keeps GenesetR as a **free public scientific resource** (like Enrichr) while ensuring **fair access** given your server capacity constraints!

Would you like me to implement this simplified version instead?
