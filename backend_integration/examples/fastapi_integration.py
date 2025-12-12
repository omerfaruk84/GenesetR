"""
FastAPI Integration Example - Complete Working Example

This shows how to integrate rate limiting with your existing FastAPI backend.

Run this example:
    pip install fastapi uvicorn
    python fastapi_integration.py

Then test with:
    curl -X POST http://localhost:8000/getData \
      -H "Content-Type: application/json" \
      -d '{"request": "PCAGraph", "geneList": ["TP53", "MYC"]}'
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import sys
import os

# Add parent directory to path to import rate_limiter
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from rate_limiter import (
    init_redis,
    rate_limit,
    increment_active_tasks,
    decrement_active_tasks,
    generate_api_key,
    validate_api_key,
    get_redis,
    get_stats
)
import time
import uuid

# ============================================================================
# FastAPI App Setup
# ============================================================================

app = FastAPI(
    title="GenesetR API",
    description="Free API for genomic analysis",
    version="1.0.0"
)

@app.on_event("startup")
async def startup():
    """Initialize Redis at app startup"""
    init_redis(host='localhost', port=6379, db=0)
    print("✓ FastAPI app started")
    print("✓ Redis initialized")
    print("✓ Rate limiting active")


# ============================================================================
# Main Endpoint - /getData (Your Existing Endpoint)
# ============================================================================

@app.post("/getData")
@rate_limit(anon_limit=10, registered_limit=30, window=60)
async def get_data(request: Request):
    """
    Main data endpoint with rate limiting

    This is your existing /getData endpoint.
    Just add @rate_limit decorator - that's it!

    Rate limits:
    - Anonymous (IP-based): 10 requests/minute
    - Registered (API key): 30 requests/minute

    Example:
        curl -X POST http://localhost:8000/getData \
          -H "Content-Type: application/json" \
          -d '{"request": "PCAGraph", "geneList": ["TP53", "MYC"]}'
    """
    data = await request.json()

    # Get request parameters (your existing logic)
    request_type = data.get("request")
    gene_list = data.get("geneList", [])
    data_type = data.get("dataType", 1)

    print(f"\n[{time.strftime('%H:%M:%S')}] Request: {request_type}")
    print(f"  Genes: {gene_list}")

    # Validate inputs (your existing validation)
    if not request_type:
        return JSONResponse(
            {"error": "Missing 'request' parameter"},
            status_code=400
        )

    if not gene_list or len(gene_list) < 2:
        return JSONResponse(
            {"error": "Gene list must contain at least 2 genes"},
            status_code=400
        )

    # Submit to Celery (your existing task submission)
    # task = your_celery_task.apply_async(args=[data])
    # task_id = task.id

    # Simulate task creation
    task_id = str(uuid.uuid4())

    # Increment active task counter when task starts
    increment_active_tasks()

    print(f"  Task ID: {task_id}")
    print(f"  Active tasks: {get_redis().get('active_tasks_count')}")

    # Return response (your existing return)
    return JSONResponse({
        "task_id": task_id,
        "status": "submitted",
        "message": f"{request_type} analysis started",
        "gene_count": len(gene_list)
    })


# ============================================================================
# Task Status Endpoint (Your Existing Endpoint)
# ============================================================================

@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """
    Get task status

    This is your existing task status endpoint.
    No changes needed - it works as-is!
    """
    # Your existing logic to check Celery task status
    # status = AsyncResult(task_id)

    # Simulate completed task
    return JSONResponse({
        "task_id": task_id,
        "task_status": "SUCCESS",
        "task_result": {
            "data": [[1, 2, 3], [4, 5, 6]],
            "clusters": [0, 0, 1]
        }
    })


# ============================================================================
# Registration Endpoint - /api/register (NEW)
# ============================================================================

@app.post("/api/register")
async def register(request: Request):
    """
    Register for API key (free)

    Request body:
    ```json
    {
        "email": "user@example.com",
        "name": "John Doe",
        "institution": "University Name"
    }
    ```

    Returns API key with 30 req/min limit
    """
    data = await request.json()

    email = data.get("email")
    name = data.get("name")
    institution = data.get("institution", "")

    # Validate
    if not email or not name:
        return JSONResponse(
            {"error": "Email and name are required"},
            status_code=400
        )

    # Generate API key
    api_key = generate_api_key(email, name, institution)

    # TODO: Send email with API key
    # await send_email(email, f"Your GenesetR API key: {api_key}")

    print(f"\n[{time.strftime('%H:%M:%S')}] New API key generated")
    print(f"  Email: {email}")
    print(f"  Name: {name}")
    print(f"  Key: {api_key}")

    return JSONResponse({
        "message": "API key generated successfully",
        "api_key": api_key,  # ⚠️ In production, only send via email!
        "rate_limit": "30 requests per minute",
        "concurrent_jobs": 3,
        "note": "Please save this key - it won't be shown again."
    })


# ============================================================================
# Rate Limit Status Endpoint - /api/rate-limit-status (NEW)
# ============================================================================

@app.get("/api/rate-limit-status")
async def rate_limit_status(request: Request):
    """
    Check current rate limit status

    Headers:
    - X-API-Key: gsr_xxx (optional)

    Returns current rate limit usage
    """
    api_key = request.headers.get('x-api-key')

    if api_key and validate_api_key(api_key):
        identifier = f"key:{api_key}"
        limit = 30
        access_type = "registered"
    else:
        identifier = f"ip:{request.client.host}"
        limit = 10
        access_type = "anonymous"

    # Get current usage
    current_window = int(time.time() / 60)
    key = f"rate_limit:{identifier}:{current_window}"
    count = int(get_redis().get(key) or 0)

    return JSONResponse({
        "rate_limit": limit,
        "requests_used": count,
        "requests_remaining": max(0, limit - count),
        "window": "60 seconds",
        "access_type": access_type
    })


# ============================================================================
# Statistics Endpoint - /api/stats (NEW)
# ============================================================================

@app.get("/api/stats")
async def view_stats(request: Request, date: str = None):
    """
    View usage statistics

    Query params:
    - date: YYYY-MM-DD (optional, defaults to today)

    ⚠️ Add authentication in production!
    """
    stats = get_stats(date)
    return JSONResponse(stats)


# ============================================================================
# Simulate Task Completion (For Testing)
# ============================================================================

@app.post("/api/test/complete-task")
async def complete_task():
    """Test endpoint to simulate task completion"""
    decrement_active_tasks()

    return JSONResponse({
        "message": "Task completed",
        "active_tasks": int(get_redis().get("active_tasks_count") or 0)
    })


# ============================================================================
# Datasets Endpoint (Your Existing Endpoint)
# ============================================================================

@app.get("/getDatasets")
@rate_limit(anon_limit=30, registered_limit=100, check_capacity=False)
async def get_datasets(request: Request):
    """
    Get available datasets

    This endpoint is lighter, so we allow higher rate limits
    and don't check queue capacity.
    """
    return JSONResponse({
        "datasets": [
            {
                "id": "L1000_LINCS",
                "name": "LINCS L1000",
                "gene_count": 12328
            },
            {
                "id": "GSE92742",
                "name": "Perturb-seq",
                "gene_count": 20000
            }
        ]
    })


# ============================================================================
# Help/Info Endpoint
# ============================================================================

@app.get("/")
async def index():
    """API information"""
    return JSONResponse({
        "name": "GenesetR API",
        "version": "1.0.0",
        "description": "Free API for genomic analysis",
        "rate_limits": {
            "anonymous": "10 requests/minute (IP-based)",
            "registered": "30 requests/minute (API key)"
        },
        "endpoints": {
            "POST /getData": "Main analysis endpoint",
            "GET /tasks/{task_id}": "Get task status",
            "POST /api/register": "Register for API key (free)",
            "GET /api/rate-limit-status": "Check rate limit status",
            "GET /getDatasets": "List available datasets",
            "GET /docs": "Interactive API documentation"
        },
        "register": "https://genesetr.uio.no/api/register",
        "documentation": "https://genesetr.uio.no/docs"
    })


# ============================================================================
# Run FastAPI App
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print("\n" + "="*60)
    print("GenesetR FastAPI - Running with Rate Limiting")
    print("="*60)
    print("\nEndpoints:")
    print("  POST /getData                - Main analysis endpoint")
    print("  POST /api/register           - Get API key (free)")
    print("  GET  /api/rate-limit-status  - Check rate limits")
    print("  GET  /api/stats              - View usage stats")
    print("  GET  /getDatasets            - List datasets")
    print("  GET  /docs                   - Interactive API docs")
    print("\nRate Limits:")
    print("  Anonymous: 10 requests/minute (IP-based)")
    print("  Registered: 30 requests/minute (API key)")
    print("\nTesting:")
    print("  curl -X POST http://localhost:8000/getData \\")
    print("    -H 'Content-Type: application/json' \\")
    print("    -d '{\"request\": \"PCAGraph\", \"geneList\": [\"TP53\", \"MYC\"]}'")
    print("\n  Or visit: http://localhost:8000/docs")
    print("\n" + "="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
