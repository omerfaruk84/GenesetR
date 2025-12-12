"""
Simple Rate Limiting for GenesetR - Free Academic Access

This shows how to add basic rate limiting to your existing API
with minimal code changes.

Just add this to your existing Flask/FastAPI application!
"""

import redis
import time
import secrets
from functools import wraps
from flask import request, jsonify
from datetime import datetime

# Connect to your existing Redis instance
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# ============================================================================
# 1. SIMPLE RATE LIMITING
# ============================================================================

def check_rate_limit(identifier, limit=10, window=60):
    """
    Simple sliding window rate limiter using Redis

    Args:
        identifier: API key or IP address
        limit: Max requests per window
        window: Time window in seconds

    Returns:
        tuple: (allowed: bool, remaining: int, message: str)
    """
    # Create time-based key
    current_window = int(time.time() / window)
    key = f"rate_limit:{identifier}:{current_window}"

    # Increment counter
    count = redis_client.incr(key)

    # Set expiration on first request
    if count == 1:
        redis_client.expire(key, window)

    # Check limit
    if count > limit:
        return False, 0, f"Rate limit exceeded. Max {limit} requests per minute."

    remaining = limit - count
    return True, remaining, f"{remaining} requests remaining"


def rate_limit_decorator(anon_limit=10, registered_limit=30, window=60):
    """
    Decorator to add rate limiting to endpoints

    Anonymous users: IP-based, lower limit
    Registered users: API key-based, higher limit
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Get identifier (API key or IP)
            api_key = request.headers.get('X-API-Key')

            if api_key and validate_api_key(api_key):
                # Registered user - higher limit
                identifier = f"key:{api_key}"
                limit = registered_limit
            else:
                # Anonymous user - IP-based, lower limit
                identifier = f"ip:{request.remote_addr}"
                limit = anon_limit

            # Check rate limit
            allowed, remaining, message = check_rate_limit(identifier, limit, window)

            if not allowed:
                return jsonify({
                    "error": "Rate limit exceeded",
                    "message": message,
                    "retry_after": window
                }), 429

            # Add rate limit headers to response
            response = f(*args, **kwargs)

            # If response is a tuple (response, status_code)
            if isinstance(response, tuple):
                response_obj, status_code = response
            else:
                response_obj = response
                status_code = 200

            # Add headers if it's a Response object
            if hasattr(response_obj, 'headers'):
                response_obj.headers['X-RateLimit-Limit'] = str(limit)
                response_obj.headers['X-RateLimit-Remaining'] = str(remaining)
                response_obj.headers['X-RateLimit-Reset'] = str(window)

            return response_obj if not isinstance(response, tuple) else (response_obj, status_code)

        return wrapped
    return decorator


# ============================================================================
# 2. QUEUE CAPACITY MANAGEMENT
# ============================================================================

def check_queue_capacity(max_tasks=50):
    """
    Check if Celery queue can accept new tasks

    Args:
        max_tasks: Maximum concurrent tasks allowed

    Returns:
        tuple: (can_accept: bool, message: str)
    """
    # Option 1: Check Redis-based counter (faster)
    active_count = int(redis_client.get("active_tasks_count") or 0)

    if active_count >= max_tasks:
        return False, f"Server at capacity ({active_count}/{max_tasks} tasks running). Please try again in a few minutes."

    return True, "OK"


def increment_active_tasks():
    """Increment active task counter"""
    redis_client.incr("active_tasks_count")


def decrement_active_tasks():
    """Decrement active task counter"""
    current = int(redis_client.get("active_tasks_count") or 0)
    if current > 0:
        redis_client.decr("active_tasks_count")


# ============================================================================
# 3. SIMPLE API KEY SYSTEM (Optional)
# ============================================================================

def generate_api_key(email, name, institution=None):
    """
    Generate a simple API key (store in Redis, not database)

    Args:
        email: User's email
        name: User's name
        institution: Optional institution

    Returns:
        str: API key
    """
    # Generate key
    random_part = secrets.token_urlsafe(24)
    api_key = f"gsr_{random_part}"

    # Store in Redis (simple - no database needed!)
    redis_client.hset(f"api_key:{api_key}", mapping={
        "email": email,
        "name": name,
        "institution": institution or "",
        "created": datetime.now().isoformat(),
        "last_used": "",
        "request_count": 0
    })

    return api_key


def validate_api_key(api_key):
    """
    Validate API key

    Args:
        api_key: API key to validate

    Returns:
        dict or None: Key data if valid, None otherwise
    """
    if not api_key or not api_key.startswith("gsr_"):
        return None

    # Check if key exists
    key_data = redis_client.hgetall(f"api_key:{api_key}")

    if not key_data:
        return None

    # Update last used timestamp
    redis_client.hset(f"api_key:{api_key}", "last_used", datetime.now().isoformat())
    redis_client.hincrby(f"api_key:{api_key}", "request_count", 1)

    return key_data


# ============================================================================
# 4. APPLY TO YOUR EXISTING /getData ENDPOINT
# ============================================================================

# Example with Flask
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.post("/getData")
@rate_limit_decorator(anon_limit=10, registered_limit=30, window=60)
def get_data():
    """
    Your existing /getData endpoint with rate limiting added!

    Just add the @rate_limit_decorator above your existing function.
    """
    # Check queue capacity
    can_accept, capacity_message = check_queue_capacity(max_tasks=50)
    if not can_accept:
        return jsonify({
            "error": "Server busy",
            "message": capacity_message
        }), 503

    # ---- YOUR EXISTING CODE STARTS HERE ----

    data = request.get_json()
    request_type = data.get("request")
    gene_list = data.get("geneList", [])

    # Your existing logic...
    # Generate task, submit to Celery, etc.

    # Increment task counter when task starts
    increment_active_tasks()

    # ... your existing task submission code ...

    task_id = "some_task_id"  # From your Celery task

    # Return response (your existing return)
    return jsonify({
        "task_id": task_id,
        "status": "Task submitted"
    })


# ============================================================================
# 5. CELERY TASK WRAPPER (to track active tasks)
# ============================================================================

# Add to your Celery tasks
from celery import Task

class TrackingTask(Task):
    """Base task that tracks active task count"""

    def on_success(self, retval, task_id, args, kwargs):
        """Decrement counter when task completes"""
        decrement_active_tasks()

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Decrement counter when task fails"""
        decrement_active_tasks()


# Use in your tasks
from celery import Celery

app = Celery('genesetr')

@app.task(base=TrackingTask)
def pca_analysis_task(params):
    """Your existing PCA task"""
    # Your existing code...
    pass


# ============================================================================
# 6. SIMPLE REGISTRATION ENDPOINT
# ============================================================================

@app.post("/api/register")
def register():
    """
    Simple registration endpoint for API keys

    POST /api/register
    {
        "email": "user@example.com",
        "name": "John Doe",
        "institution": "University Name"
    }
    """
    data = request.get_json()

    email = data.get("email")
    name = data.get("name")
    institution = data.get("institution")

    if not email or not name:
        return jsonify({"error": "Email and name required"}), 400

    # Generate API key
    api_key = generate_api_key(email, name, institution)

    # TODO: Send email with API key
    # send_email(email, f"Your GenesetR API key: {api_key}")

    return jsonify({
        "message": "API key generated successfully",
        "api_key": api_key,  # In production, only send via email!
        "rate_limit": "30 requests per minute",
        "note": "Please save this key - it won't be shown again"
    })


# ============================================================================
# 7. USAGE STATISTICS (Simple)
# ============================================================================

def log_request(endpoint, identifier, request_type=None):
    """Log request for simple analytics"""
    date = datetime.now().strftime("%Y-%m-%d")

    # Daily stats
    redis_client.hincrby(f"stats:{date}", "total_requests", 1)
    redis_client.hincrby(f"stats:{date}", f"endpoint:{endpoint}", 1)

    if request_type:
        redis_client.hincrby(f"stats:{date}", f"request_type:{request_type}", 1)

    # Set expiration (keep stats for 90 days)
    redis_client.expire(f"stats:{date}", 90 * 86400)


@app.get("/api/stats")
def get_stats():
    """
    Simple statistics endpoint (add admin authentication in production!)
    """
    date = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    stats = redis_client.hgetall(f"stats:{date}")

    return jsonify({
        "date": date,
        "statistics": stats
    })


# ============================================================================
# 8. HELPER: Check current rate limit status
# ============================================================================

@app.get("/api/rate-limit-status")
def rate_limit_status():
    """
    Check current rate limit status

    Useful for users to see how many requests they have remaining
    """
    api_key = request.headers.get('X-API-Key')

    if api_key and validate_api_key(api_key):
        identifier = f"key:{api_key}"
        limit = 30
    else:
        identifier = f"ip:{request.remote_addr}"
        limit = 10

    # Check current usage
    current_window = int(time.time() / 60)
    key = f"rate_limit:{identifier}:{current_window}"
    count = int(redis_client.get(key) or 0)

    return jsonify({
        "rate_limit": limit,
        "requests_used": count,
        "requests_remaining": max(0, limit - count),
        "window": "60 seconds",
        "access_type": "registered" if api_key else "anonymous"
    })


# ============================================================================
# USAGE EXAMPLE
# ============================================================================

if __name__ == "__main__":
    """
    Example of how to use the rate limiting system
    """

    # 1. Anonymous user (IP-based, 10 req/min)
    print("=== Anonymous User ===")
    allowed, remaining, msg = check_rate_limit("ip:192.168.1.1", limit=10)
    print(f"Allowed: {allowed}, Remaining: {remaining}, Message: {msg}")

    # 2. Registered user (API key, 30 req/min)
    print("\n=== Registered User ===")
    api_key = generate_api_key("user@example.com", "Test User", "Test University")
    print(f"Generated API key: {api_key}")

    # Validate it
    key_data = validate_api_key(api_key)
    print(f"Key valid: {key_data is not None}")

    # Check their rate limit (higher)
    allowed, remaining, msg = check_rate_limit(f"key:{api_key}", limit=30)
    print(f"Allowed: {allowed}, Remaining: {remaining}, Message: {msg}")

    # 3. Queue capacity check
    print("\n=== Queue Capacity ===")
    can_accept, capacity_msg = check_queue_capacity(max_tasks=50)
    print(f"Can accept: {can_accept}, Message: {capacity_msg}")

    print("\n=== Setup Complete ===")
    print("Add @rate_limit_decorator to your /getData endpoint")
    print("Anonymous users: 10 requests/minute")
    print("Registered users: 30 requests/minute")
