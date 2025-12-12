# GenesetR Rate Limiting Integration Guide

## Quick Start (5 Minutes!)

### Step 1: Copy Files to Your Backend

```bash
# Copy rate_limiter.py to your backend project
cp backend_integration/rate_limiter.py /path/to/your/backend/

# That's it! Just one file.
```

### Step 2: Initialize Redis at App Startup

#### For Flask:
```python
from flask import Flask
from rate_limiter import init_redis

app = Flask(__name__)

# Initialize Redis (call once at startup)
init_redis(host='localhost', port=6379, db=0)

# Your existing code...
```

#### For FastAPI:
```python
from fastapi import FastAPI
from rate_limiter import init_redis

app = FastAPI()

@app.on_event("startup")
async def startup():
    # Initialize Redis
    init_redis(host='localhost', port=6379, db=0)

# Your existing code...
```

### Step 3: Add Decorator to Your `/getData` Endpoint

#### Flask Example:
```python
from flask import Flask, request, jsonify
from rate_limiter import rate_limit, increment_active_tasks

@app.post("/getData")
@rate_limit(anon_limit=10, registered_limit=30, window=60)
def get_data():
    """Your existing /getData endpoint - just add the decorator!"""

    data = request.get_json()
    request_type = data.get("request")
    gene_list = data.get("geneList", [])

    # Your existing logic...
    # When you submit to Celery, increment task counter:
    task = your_celery_task.apply_async(args=[data])
    increment_active_tasks()  # <-- Add this line

    return jsonify({
        "task_id": task.id,
        "status": "submitted"
    })
```

#### FastAPI Example:
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from rate_limiter import rate_limit, increment_active_tasks

@app.post("/getData")
@rate_limit(anon_limit=10, registered_limit=30, window=60)
async def get_data(request: Request):
    """Your existing /getData endpoint - just add the decorator!"""

    data = await request.json()
    request_type = data.get("request")
    gene_list = data.get("geneList", [])

    # Your existing logic...
    # When you submit to Celery, increment task counter:
    task = your_celery_task.apply_async(args=[data])
    increment_active_tasks()  # <-- Add this line

    return JSONResponse({
        "task_id": task.id,
        "status": "submitted"
    })
```

### Step 4: Update Your Celery Tasks

```python
from celery import Task
from rate_limiter import TrackingTask

# Create base task class
class MyTask(Task, TrackingTask):
    """Base task that auto-decrements active task counter"""
    pass

# Use it in your tasks
@celery_app.task(base=MyTask)
def pca_analysis_task(params):
    """Your existing PCA task"""
    # Your existing code - no changes needed!
    # Task counter auto-decrements when complete
    pass

@celery_app.task(base=MyTask)
def correlation_task(params):
    """Your existing correlation task"""
    # Your existing code - no changes needed!
    pass

# Apply to all your analysis tasks
```

---

## That's It! 🎉

You now have:
- ✅ **10 requests/minute** for anonymous users (IP-based)
- ✅ **30 requests/minute** for registered users (API key)
- ✅ **Queue capacity management** (max 50 concurrent tasks by default)
- ✅ **Automatic task tracking** (increments/decrements)
- ✅ **Usage statistics** (logged to Redis)

---

## Optional: Add Registration Endpoint

### Flask:
```python
from flask import request, jsonify
from rate_limiter import generate_api_key

@app.post("/api/register")
def register():
    """Simple registration for API key"""
    data = request.get_json()

    email = data.get("email")
    name = data.get("name")
    institution = data.get("institution", "")

    if not email or not name:
        return jsonify({"error": "Email and name required"}), 400

    # Generate key
    api_key = generate_api_key(email, name, institution)

    # TODO: Send email with key
    # send_email(email, f"Your API key: {api_key}")

    return jsonify({
        "message": "API key generated successfully",
        "api_key": api_key,  # In production, only send via email!
        "rate_limit": "30 requests per minute",
        "note": "Save this key - it won't be shown again"
    })
```

### FastAPI:
```python
from fastapi import Request
from fastapi.responses import JSONResponse
from rate_limiter import generate_api_key

@app.post("/api/register")
async def register(request: Request):
    """Simple registration for API key"""
    data = await request.json()

    email = data.get("email")
    name = data.get("name")
    institution = data.get("institution", "")

    if not email or not name:
        return JSONResponse(
            {"error": "Email and name required"},
            status_code=400
        )

    # Generate key
    api_key = generate_api_key(email, name, institution)

    # TODO: Send email with key
    # await send_email(email, f"Your API key: {api_key}")

    return JSONResponse({
        "message": "API key generated successfully",
        "api_key": api_key,  # In production, only send via email!
        "rate_limit": "30 requests per minute",
        "note": "Save this key - it won't be shown again"
    })
```

---

## Optional: Add Rate Limit Status Endpoint

### Flask:
```python
from flask import request, jsonify
from rate_limiter import validate_api_key, check_rate_limit

@app.get("/api/rate-limit-status")
def rate_limit_status():
    """Check current rate limit status"""
    api_key = request.headers.get('X-API-Key')

    if api_key and validate_api_key(api_key):
        identifier = f"key:{api_key}"
        limit = 30
        access_type = "registered"
    else:
        identifier = f"ip:{request.remote_addr}"
        limit = 10
        access_type = "anonymous"

    # Check current usage
    current_window = int(time.time() / 60)
    from rate_limiter import get_redis
    key = f"rate_limit:{identifier}:{current_window}"
    count = int(get_redis().get(key) or 0)

    return jsonify({
        "rate_limit": limit,
        "requests_used": count,
        "requests_remaining": max(0, limit - count),
        "window": "60 seconds",
        "access_type": access_type
    })
```

---

## Configuration Options

### Customize Rate Limits

```python
# Change limits per endpoint if needed
@app.post("/getData")
@rate_limit(
    anon_limit=10,       # Anonymous: 10 req/min
    registered_limit=30,  # Registered: 30 req/min
    window=60,           # Window: 60 seconds
    check_capacity=True, # Check queue capacity
    max_tasks=50         # Max concurrent tasks
)
def get_data():
    pass
```

### Adjust Queue Capacity

```python
# For high-capacity servers
@rate_limit(max_tasks=100)  # Allow 100 concurrent tasks

# For low-capacity servers
@rate_limit(max_tasks=20)   # Allow only 20 concurrent tasks
```

### Different Limits for Different Endpoints

```python
# Lighter endpoint - higher limits
@app.get("/getDatasets")
@rate_limit(anon_limit=30, registered_limit=100)
def get_datasets():
    pass

# Heavy computation - lower limits
@app.post("/getData")
@rate_limit(anon_limit=5, registered_limit=20)
def get_data():
    pass
```

---

## Monitoring & Stats

### View Usage Statistics

```python
from flask import jsonify
from rate_limiter import get_stats

@app.get("/api/stats")
def view_stats():
    """View daily statistics (add auth in production!)"""
    date = request.args.get("date")  # Optional: "2025-12-12"
    stats = get_stats(date)
    return jsonify(stats)
```

Example response:
```json
{
  "date": "2025-12-12",
  "statistics": {
    "total_requests": "1523",
    "endpoint:/getData": "1420",
    "endpoint:/getDatasets": "103",
    "access:anonymous": "890",
    "access:registered": "633",
    "request_type:PCAGraph": "450",
    "request_type:corrCluster": "320"
  }
}
```

### Check Active Tasks

```python
from rate_limiter import get_redis

active_tasks = int(get_redis().get("active_tasks_count") or 0)
print(f"Currently running: {active_tasks} tasks")
```

---

## Testing

### Test Locally

```bash
# Start Redis
redis-server

# In Python:
python backend_integration/rate_limiter.py

# This will run built-in tests and show:
# - API key generation
# - Rate limiting (anonymous vs registered)
# - Queue capacity checks
# - Active task tracking
```

### Test with curl

```bash
# Test anonymous access (10 req/min)
for i in {1..12}; do
  curl -X POST http://localhost:5000/getData \
    -H "Content-Type: application/json" \
    -d '{"request": "PCAGraph", "geneList": ["TP53", "MYC"]}'
  echo ""
done

# Test with API key (30 req/min)
API_KEY="gsr_xxx"  # Get from /api/register

curl -X POST http://localhost:5000/getData \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"request": "PCAGraph", "geneList": ["TP53", "MYC"]}'
```

### Test Rate Limit Status

```bash
# Check remaining requests
curl http://localhost:5000/api/rate-limit-status
curl -H "X-API-Key: gsr_xxx" http://localhost:5000/api/rate-limit-status
```

---

## Troubleshooting

### Redis Connection Error
```
RuntimeError: Redis not initialized
```

**Solution:** Call `init_redis()` at app startup
```python
from rate_limiter import init_redis
init_redis(host='localhost', port=6379)
```

### Rate Limit Not Working
```
Users not being rate limited
```

**Solution:** Make sure decorator is applied AFTER route decorator
```python
# ✗ Wrong order
@rate_limit()
@app.post("/getData")
def get_data():
    pass

# ✓ Correct order
@app.post("/getData")
@rate_limit()
def get_data():
    pass
```

### Tasks Not Decrementing
```
active_tasks_count keeps growing
```

**Solution:** Make sure your Celery tasks use `TrackingTask` base class
```python
from rate_limiter import TrackingTask

@celery_app.task(base=TrackingTask)  # <-- Must use this
def my_task(params):
    pass
```

### Can't Import rate_limiter
```
ModuleNotFoundError: No module named 'rate_limiter'
```

**Solution:** Make sure `rate_limiter.py` is in your Python path
```bash
# Copy to your backend directory
cp backend_integration/rate_limiter.py /path/to/backend/

# Or add to PYTHONPATH
export PYTHONPATH="/path/to/backend_integration:$PYTHONPATH"
```

---

## Production Checklist

Before deploying to production:

- [ ] Redis is running and accessible
- [ ] `init_redis()` called at app startup
- [ ] Rate limit decorator applied to `/getData`
- [ ] Celery tasks use `TrackingTask` base class
- [ ] Registration endpoint sends email (not returning key in response)
- [ ] Stats endpoint has authentication
- [ ] Tested with curl/Postman
- [ ] Adjusted limits based on server capacity
- [ ] Monitoring set up for active_tasks_count
- [ ] Documentation updated for users

---

## Next Steps

1. **Test locally** - Run the built-in tests
2. **Integrate** - Add decorator to your `/getData` endpoint
3. **Deploy** - Push to your backend server
4. **Document** - Update user docs with rate limits
5. **Monitor** - Watch `/api/stats` for usage patterns
6. **Adjust** - Fine-tune limits based on actual usage

Need help? Check the examples in `backend_integration/examples/`
