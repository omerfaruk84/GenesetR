"""
GenesetR Rate Limiter Module - Free Academic Access

Drop this file into your backend project and import the decorator.

Usage:
    from rate_limiter import rate_limit, init_redis

    # Initialize Redis connection
    init_redis(host='localhost', port=6379)

    # Flask example:
    @app.post("/getData")
    @rate_limit(anon_limit=10, registered_limit=30)
    def get_data():
        # Your existing code
        pass

    # FastAPI example:
    @app.post("/getData")
    @rate_limit(anon_limit=10, registered_limit=30)
    async def get_data(request: Request):
        # Your existing code
        pass
"""

import redis
import time
import secrets
import functools
from typing import Optional, Tuple, Callable, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Global Redis client
_redis_client: Optional[redis.Redis] = None


def init_redis(host='localhost', port=6379, db=0, **kwargs):
    """
    Initialize Redis connection

    Call this once at app startup:
        from rate_limiter import init_redis
        init_redis(host='localhost', port=6379)
    """
    global _redis_client
    _redis_client = redis.Redis(
        host=host,
        port=port,
        db=db,
        decode_responses=True,
        **kwargs
    )
    logger.info(f"Redis initialized: {host}:{port}")


def get_redis() -> redis.Redis:
    """Get Redis client (raises error if not initialized)"""
    if _redis_client is None:
        raise RuntimeError(
            "Redis not initialized. Call init_redis() at app startup."
        )
    return _redis_client


# ============================================================================
# API KEY MANAGEMENT
# ============================================================================

def generate_api_key(email: str, name: str, institution: str = "") -> str:
    """
    Generate a new API key and store in Redis

    Args:
        email: User's email
        name: User's name
        institution: Optional institution name

    Returns:
        API key string (gsr_xxxx)
    """
    redis_client = get_redis()

    # Generate key
    random_part = secrets.token_urlsafe(24)
    api_key = f"gsr_{random_part}"

    # Store in Redis
    redis_client.hset(f"api_key:{api_key}", mapping={
        "email": email,
        "name": name,
        "institution": institution,
        "created": datetime.now().isoformat(),
        "last_used": "",
        "request_count": 0,
        "active": "true"
    })

    logger.info(f"API key generated for {email}")
    return api_key


def validate_api_key(api_key: str) -> Optional[dict]:
    """
    Validate API key and update last_used timestamp

    Args:
        api_key: API key to validate

    Returns:
        dict with key info if valid, None otherwise
    """
    if not api_key or not api_key.startswith("gsr_"):
        return None

    redis_client = get_redis()
    key_data = redis_client.hgetall(f"api_key:{api_key}")

    if not key_data or key_data.get("active") != "true":
        return None

    # Update last used
    redis_client.hset(f"api_key:{api_key}", mapping={
        "last_used": datetime.now().isoformat()
    })
    redis_client.hincrby(f"api_key:{api_key}", "request_count", 1)

    return key_data


def revoke_api_key(api_key: str) -> bool:
    """
    Revoke an API key

    Args:
        api_key: API key to revoke

    Returns:
        True if revoked, False if not found
    """
    redis_client = get_redis()
    key_exists = redis_client.exists(f"api_key:{api_key}")

    if key_exists:
        redis_client.hset(f"api_key:{api_key}", "active", "false")
        logger.info(f"API key revoked: {api_key[:12]}...")
        return True

    return False


# ============================================================================
# RATE LIMITING
# ============================================================================

def check_rate_limit(
    identifier: str,
    limit: int = 10,
    window: int = 60
) -> Tuple[bool, int, str]:
    """
    Check rate limit using sliding window algorithm

    Args:
        identifier: Unique identifier (api_key or ip)
        limit: Max requests per window
        window: Time window in seconds

    Returns:
        (allowed: bool, remaining: int, message: str)
    """
    redis_client = get_redis()

    # Create time-based key
    current_window = int(time.time() / window)
    key = f"rate_limit:{identifier}:{current_window}"

    # Increment counter
    count = redis_client.incr(key)

    # Set expiration on first request
    if count == 1:
        redis_client.expire(key, window * 2)  # 2x window for safety

    # Check limit
    if count > limit:
        return False, 0, f"Rate limit exceeded. Max {limit} requests per minute."

    remaining = limit - count
    return True, remaining, f"{remaining} requests remaining"


def check_queue_capacity(max_tasks: int = 50) -> Tuple[bool, str]:
    """
    Check if server can accept new tasks

    Args:
        max_tasks: Maximum concurrent tasks allowed

    Returns:
        (can_accept: bool, message: str)
    """
    redis_client = get_redis()
    active_count = int(redis_client.get("active_tasks_count") or 0)

    if active_count >= max_tasks:
        return False, (
            f"Server at capacity ({active_count}/{max_tasks} tasks running). "
            "Please try again in a few minutes."
        )

    return True, "OK"


def increment_active_tasks():
    """Increment active task counter (call when task starts)"""
    redis_client = get_redis()
    redis_client.incr("active_tasks_count")


def decrement_active_tasks():
    """Decrement active task counter (call when task completes)"""
    redis_client = get_redis()
    current = int(redis_client.get("active_tasks_count") or 0)
    if current > 0:
        redis_client.decr("active_tasks_count")


# ============================================================================
# DECORATOR FOR FLASK/FASTAPI
# ============================================================================

def rate_limit(
    anon_limit: int = 10,
    registered_limit: int = 30,
    window: int = 60,
    check_capacity: bool = True,
    max_tasks: int = 50
):
    """
    Decorator to add rate limiting to endpoints

    Works with both Flask and FastAPI!

    Args:
        anon_limit: Rate limit for anonymous users (per IP)
        registered_limit: Rate limit for registered users (with API key)
        window: Time window in seconds
        check_capacity: Also check queue capacity
        max_tasks: Maximum concurrent tasks

    Usage (Flask):
        @app.post("/getData")
        @rate_limit(anon_limit=10, registered_limit=30)
        def get_data():
            # Your code
            pass

    Usage (FastAPI):
        @app.post("/getData")
        @rate_limit(anon_limit=10, registered_limit=30)
        async def get_data(request: Request):
            # Your code
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # FastAPI async function
            return await _apply_rate_limit(
                func, args, kwargs,
                anon_limit, registered_limit, window,
                check_capacity, max_tasks,
                is_async=True
            )

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Flask sync function
            import asyncio
            return asyncio.run(_apply_rate_limit(
                func, args, kwargs,
                anon_limit, registered_limit, window,
                check_capacity, max_tasks,
                is_async=False
            ))

        # Return appropriate wrapper based on function type
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


async def _apply_rate_limit(
    func: Callable,
    args: tuple,
    kwargs: dict,
    anon_limit: int,
    registered_limit: int,
    window: int,
    check_capacity: bool,
    max_tasks: int,
    is_async: bool
) -> Any:
    """Internal function to apply rate limiting"""
    from flask import request as flask_request, jsonify
    from fastapi import Request as FastAPIRequest

    # Get request object (Flask or FastAPI)
    request = None
    for arg in args:
        if isinstance(arg, FastAPIRequest):
            request = arg
            break

    if request is None:
        # Flask - use global request
        request = flask_request

    # Extract API key and IP
    api_key = None
    if hasattr(request, 'headers'):
        api_key = request.headers.get('X-API-Key') or request.headers.get('x-api-key')

    # Get client IP
    if hasattr(request, 'client') and hasattr(request.client, 'host'):
        # FastAPI
        client_ip = request.client.host
    elif hasattr(request, 'remote_addr'):
        # Flask
        client_ip = request.remote_addr
    else:
        client_ip = "unknown"

    # Determine rate limit and identifier
    if api_key and validate_api_key(api_key):
        identifier = f"key:{api_key}"
        limit = registered_limit
        access_type = "registered"
    else:
        identifier = f"ip:{client_ip}"
        limit = anon_limit
        access_type = "anonymous"

    # Check rate limit
    allowed, remaining, message = check_rate_limit(identifier, limit, window)

    if not allowed:
        error_response = {
            "error": "Rate limit exceeded",
            "message": message,
            "retry_after": window,
            "access_type": access_type,
            "limit": limit
        }

        # Return appropriate error response
        if is_async:
            from fastapi.responses import JSONResponse
            return JSONResponse(content=error_response, status_code=429)
        else:
            return jsonify(error_response), 429

    # Check queue capacity if enabled
    if check_capacity:
        can_accept, capacity_message = check_queue_capacity(max_tasks)
        if not can_accept:
            error_response = {
                "error": "Server busy",
                "message": capacity_message,
                "active_tasks": int(get_redis().get("active_tasks_count") or 0),
                "max_tasks": max_tasks
            }

            if is_async:
                from fastapi.responses import JSONResponse
                return JSONResponse(content=error_response, status_code=503)
            else:
                return jsonify(error_response), 503

    # Log request
    log_request(
        endpoint=request.url.path if hasattr(request.url, 'path') else request.path,
        identifier=identifier,
        access_type=access_type
    )

    # Call original function
    if is_async:
        response = await func(*args, **kwargs)
    else:
        response = func(*args, **kwargs)

    # Add rate limit headers
    try:
        if hasattr(response, 'headers'):
            response.headers['X-RateLimit-Limit'] = str(limit)
            response.headers['X-RateLimit-Remaining'] = str(remaining)
            response.headers['X-RateLimit-Reset'] = str(window)
            response.headers['X-RateLimit-Type'] = access_type
    except:
        pass  # Headers might not be modifiable

    return response


# ============================================================================
# USAGE STATISTICS
# ============================================================================

def log_request(endpoint: str, identifier: str, access_type: str, request_type: str = None):
    """Log request for analytics"""
    redis_client = get_redis()
    date = datetime.now().strftime("%Y-%m-%d")

    # Daily stats
    redis_client.hincrby(f"stats:{date}", "total_requests", 1)
    redis_client.hincrby(f"stats:{date}", f"endpoint:{endpoint}", 1)
    redis_client.hincrby(f"stats:{date}", f"access:{access_type}", 1)

    if request_type:
        redis_client.hincrby(f"stats:{date}", f"request_type:{request_type}", 1)

    # Set expiration (keep stats for 90 days)
    redis_client.expire(f"stats:{date}", 90 * 86400)


def get_stats(date: str = None) -> dict:
    """Get usage statistics for a given date"""
    redis_client = get_redis()
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    stats = redis_client.hgetall(f"stats:{date}")
    return {
        "date": date,
        "statistics": stats
    }


# ============================================================================
# CELERY TASK WRAPPER
# ============================================================================

class TrackingTask:
    """
    Mixin for Celery tasks to track active task count

    Usage:
        from celery import Task
        from rate_limiter import TrackingTask

        class MyTask(Task, TrackingTask):
            pass

        @celery_app.task(base=MyTask)
        def my_analysis_task(params):
            # Your task code
            pass
    """

    def on_success(self, retval, task_id, args, kwargs):
        """Called when task completes successfully"""
        decrement_active_tasks()
        super().on_success(retval, task_id, args, kwargs)

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails"""
        decrement_active_tasks()
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when task is retried"""
        # Don't decrement - task is still running
        super().on_retry(exc, task_id, args, kwargs, einfo)


# ============================================================================
# INITIALIZATION CHECK
# ============================================================================

def is_initialized() -> bool:
    """Check if Redis is initialized"""
    return _redis_client is not None


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Initialize Redis
    init_redis(host='localhost', port=6379)

    print("=== GenesetR Rate Limiter Test ===\n")

    # Test 1: Generate API key
    print("1. Generating API key...")
    api_key = generate_api_key(
        email="test@example.com",
        name="Test User",
        institution="Test University"
    )
    print(f"   Generated: {api_key}")

    # Test 2: Validate API key
    print("\n2. Validating API key...")
    key_data = validate_api_key(api_key)
    print(f"   Valid: {key_data is not None}")
    if key_data:
        print(f"   Email: {key_data['email']}")
        print(f"   Name: {key_data['name']}")

    # Test 3: Check rate limit (anonymous)
    print("\n3. Testing anonymous rate limit...")
    for i in range(12):
        allowed, remaining, msg = check_rate_limit("ip:192.168.1.1", limit=10)
        status = "✓" if allowed else "✗"
        print(f"   Request {i+1}: {status} {msg}")

    # Test 4: Check rate limit (registered)
    print("\n4. Testing registered rate limit...")
    for i in range(32):
        allowed, remaining, msg = check_rate_limit(f"key:{api_key}", limit=30)
        if i < 3 or i >= 29:  # Show first 3 and last 3
            status = "✓" if allowed else "✗"
            print(f"   Request {i+1}: {status} {msg}")
        elif i == 3:
            print("   ...")

    # Test 5: Queue capacity
    print("\n5. Testing queue capacity...")
    can_accept, msg = check_queue_capacity(max_tasks=50)
    print(f"   Can accept: {can_accept}")
    print(f"   Message: {msg}")

    # Test 6: Simulate active tasks
    print("\n6. Simulating active tasks...")
    for i in range(5):
        increment_active_tasks()
    active = int(get_redis().get("active_tasks_count") or 0)
    print(f"   Active tasks: {active}")

    for i in range(3):
        decrement_active_tasks()
    active = int(get_redis().get("active_tasks_count") or 0)
    print(f"   After completing 3: {active}")

    # Clean up
    get_redis().delete("active_tasks_count")

    print("\n=== All tests complete ===")
