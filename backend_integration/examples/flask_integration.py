"""
Flask Integration Example - Complete Working Example

This shows how to integrate rate limiting with your existing Flask backend.

Run this example:
    python flask_integration.py

Then test with:
    curl -X POST http://localhost:5000/getData \
      -H "Content-Type: application/json" \
      -d '{"request": "PCAGraph", "geneList": ["TP53", "MYC"]}'
"""

from flask import Flask, request, jsonify
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

# ============================================================================
# Flask App Setup
# ============================================================================

app = Flask(__name__)

# Initialize Redis at startup
init_redis(host='localhost', port=6379, db=0)

print("✓ Flask app started")
print("✓ Redis initialized")
print("✓ Rate limiting active")


# ============================================================================
# Main Endpoint - /getData (Your Existing Endpoint)
# ============================================================================

@app.post("/getData")
@rate_limit(anon_limit=10, registered_limit=30, window=60)
def get_data():
    """
    Main data endpoint with rate limiting

    This is your existing /getData endpoint.
    Just add @rate_limit decorator - that's it!

    Rate limits:
    - Anonymous (IP-based): 10 requests/minute
    - Registered (API key): 30 requests/minute
    """
    data = request.get_json()

    # Get request parameters (your existing logic)
    request_type = data.get("request")
    gene_list = data.get("geneList", [])
    data_type = data.get("dataType", 1)

    print(f"\n[{time.strftime('%H:%M:%S')}] Request: {request_type}")
    print(f"  Genes: {gene_list}")

    # Validate inputs (your existing validation)
    if not request_type:
        return jsonify({"error": "Missing 'request' parameter"}), 400

    if not gene_list or len(gene_list) < 2:
        return jsonify({"error": "Gene list must contain at least 2 genes"}), 400

    # Submit to Celery (your existing task submission)
    # task = your_celery_task.apply_async(args=[data])
    # task_id = task.id

    # Simulate task creation
    import uuid
    task_id = str(uuid.uuid4())

    # Increment active task counter when task starts
    increment_active_tasks()

    print(f"  Task ID: {task_id}")
    print(f"  Active tasks: {get_redis().get('active_tasks_count')}")

    # Return response (your existing return)
    return jsonify({
        "task_id": task_id,
        "status": "submitted",
        "message": f"{request_type} analysis started",
        "gene_count": len(gene_list)
    })


# ============================================================================
# Task Status Endpoint (Your Existing Endpoint)
# ============================================================================

@app.get("/tasks/<task_id>")
def get_task_status(task_id):
    """
    Get task status

    This is your existing task status endpoint.
    No changes needed - it works as-is!
    """
    # Your existing logic to check Celery task status
    # status = AsyncResult(task_id)

    # Simulate completed task
    return jsonify({
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
def register():
    """
    Register for API key (free)

    POST /api/register
    {
        "email": "user@example.com",
        "name": "John Doe",
        "institution": "University Name"  // optional
    }

    Returns API key with 30 req/min limit
    """
    data = request.get_json()

    email = data.get("email")
    name = data.get("name")
    institution = data.get("institution", "")

    # Validate
    if not email or not name:
        return jsonify({"error": "Email and name are required"}), 400

    # Generate API key
    api_key = generate_api_key(email, name, institution)

    # TODO: Send email with API key
    # send_email(email, f"Your GenesetR API key: {api_key}")

    print(f"\n[{time.strftime('%H:%M:%S')}] New API key generated")
    print(f"  Email: {email}")
    print(f"  Name: {name}")
    print(f"  Key: {api_key}")

    return jsonify({
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
def rate_limit_status():
    """
    Check current rate limit status

    GET /api/rate-limit-status
    Headers:
        X-API-Key: gsr_xxx (optional)

    Returns:
        Current rate limit usage
    """
    api_key = request.headers.get('X-API-Key')

    if api_key and validate_api_key(api_key):
        identifier = f"key:{api_key}"
        limit = 30
        access_type = "registered"
    else:
        identifier = f"ip:{request.remote_addr}"
        limit = 10
        access_type = "anonymous"

    # Get current usage
    current_window = int(time.time() / 60)
    key = f"rate_limit:{identifier}:{current_window}"
    count = int(get_redis().get(key) or 0)

    return jsonify({
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
def view_stats():
    """
    View usage statistics

    GET /api/stats?date=2025-12-12

    ⚠️ Add authentication in production!
    """
    date = request.args.get("date")  # Optional
    stats = get_stats(date)

    return jsonify(stats)


# ============================================================================
# Simulate Task Completion (For Testing)
# ============================================================================

@app.post("/api/test/complete-task")
def complete_task():
    """Test endpoint to simulate task completion"""
    decrement_active_tasks()

    return jsonify({
        "message": "Task completed",
        "active_tasks": int(get_redis().get("active_tasks_count") or 0)
    })


# ============================================================================
# Datasets Endpoint (Your Existing Endpoint)
# ============================================================================

@app.get("/getDatasets")
@rate_limit(anon_limit=30, registered_limit=100, check_capacity=False)
def get_datasets():
    """
    Get available datasets

    This endpoint is lighter, so we allow higher rate limits
    and don't check queue capacity.
    """
    return jsonify({
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
def index():
    """API information"""
    return jsonify({
        "name": "GenesetR API",
        "version": "1.0",
        "description": "Free API for genomic analysis",
        "rate_limits": {
            "anonymous": "10 requests/minute (IP-based)",
            "registered": "30 requests/minute (API key)"
        },
        "endpoints": {
            "POST /getData": "Main analysis endpoint",
            "GET /tasks/<task_id>": "Get task status",
            "POST /api/register": "Register for API key (free)",
            "GET /api/rate-limit-status": "Check rate limit status",
            "GET /getDatasets": "List available datasets"
        },
        "register": "https://genesetr.uio.no/api/register",
        "documentation": "https://genesetr.uio.no/docs"
    })


# ============================================================================
# Run Flask App
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("GenesetR Flask API - Running with Rate Limiting")
    print("="*60)
    print("\nEndpoints:")
    print("  POST /getData                - Main analysis endpoint")
    print("  POST /api/register           - Get API key (free)")
    print("  GET  /api/rate-limit-status  - Check rate limits")
    print("  GET  /api/stats              - View usage stats")
    print("  GET  /getDatasets            - List datasets")
    print("\nRate Limits:")
    print("  Anonymous: 10 requests/minute (IP-based)")
    print("  Registered: 30 requests/minute (API key)")
    print("\nTesting:")
    print("  curl -X POST http://localhost:5000/getData \\")
    print("    -H 'Content-Type: application/json' \\")
    print("    -d '{\"request\": \"PCAGraph\", \"geneList\": [\"TP53\", \"MYC\"]}'")
    print("\n" + "="*60 + "\n")

    app.run(debug=True, port=5000)
