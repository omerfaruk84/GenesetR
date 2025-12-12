"""
GenesetR REST API Implementation Example

This file demonstrates the core implementation patterns for the REST API.
This is example code to show the structure - actual implementation would
be in the backend repository.
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from redis import Redis
from sqlalchemy import create_engine, Column, String, Integer, Boolean, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
import uuid

# ============================================================================
# 1. DATABASE MODELS
# ============================================================================

Base = declarative_base()

class APIKey(Base):
    """API Key model for database"""
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    key_prefix = Column(String(12), nullable=False)
    user_id = Column(String(255), nullable=False, index=True)
    organization = Column(String(255))
    tier = Column(String(20), nullable=False, index=True)

    # Rate limits
    requests_per_minute = Column(Integer, default=10)
    requests_per_hour = Column(Integer, default=100)
    requests_per_day = Column(Integer, default=1000)
    concurrent_jobs = Column(Integer, default=2)

    # Quotas
    max_computation_minutes_per_month = Column(Integer, default=60)
    used_computation_minutes_current_month = Column(Integer, default=0)

    # Permissions
    max_gene_list_size = Column(Integer, default=100)

    # Metadata
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    last_used_at = Column(TIMESTAMP)
    expires_at = Column(TIMESTAMP)
    is_active = Column(Boolean, default=True)


# ============================================================================
# 2. REQUEST/RESPONSE MODELS
# ============================================================================

class PCARequest(BaseModel):
    """PCA analysis request model"""
    dataset: str = Field(..., description="Dataset ID")
    gene_list: List[str] = Field(..., min_items=2, max_items=1000)
    components: int = Field(3, ge=2, le=50)
    clustering: Optional[Dict[str, Any]] = Field(
        default={"method": "hdbscan", "min_cluster_size": 5}
    )

    @validator('gene_list')
    def validate_genes(cls, genes):
        """Validate gene symbols"""
        if not genes:
            raise ValueError("Gene list cannot be empty")
        # Check for duplicates
        if len(genes) != len(set(genes)):
            raise ValueError("Gene list contains duplicates")
        # Basic validation - actual implementation would check against HUGO database
        for gene in genes:
            if not gene.isalnum() and gene.replace("-", "").replace("_", "").isalnum():
                continue
            raise ValueError(f"Invalid gene symbol: {gene}")
        return genes


class TaskResponse(BaseModel):
    """Response for async task submission"""
    success: bool
    task_id: str
    status: str
    message: str
    estimated_time: int
    poll_url: str
    websocket_url: Optional[str] = None
    meta: Dict[str, Any]


class TaskStatusResponse(BaseModel):
    """Response for task status query"""
    success: bool
    task_id: str
    status: str  # pending, running, completed, failed
    progress: int
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    computation_time: Optional[float] = None
    cached: bool = False
    created_at: str
    completed_at: Optional[str] = None


class UsageResponse(BaseModel):
    """API key usage response"""
    valid: bool
    tier: str
    usage: Dict[str, Any]
    permissions: Dict[str, Any]


# ============================================================================
# 3. API KEY GENERATION & VALIDATION
# ============================================================================

class APIKeyManager:
    """Manages API key generation and validation"""

    @staticmethod
    def generate_key(environment: str = "prod") -> tuple[str, str]:
        """
        Generate a new API key

        Returns:
            tuple: (api_key, key_hash)
        """
        # Generate cryptographically secure random string
        random_part = secrets.token_urlsafe(24)  # 32 chars after encoding
        api_key = f"gsr_{environment}_{random_part}"

        # Hash for storage
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        return api_key, key_hash

    @staticmethod
    def hash_key(api_key: str) -> str:
        """Hash an API key for comparison"""
        return hashlib.sha256(api_key.encode()).hexdigest()

    @staticmethod
    def validate_key_format(api_key: str) -> bool:
        """Validate API key format"""
        if not api_key.startswith("gsr_"):
            return False
        parts = api_key.split("_")
        if len(parts) != 3:
            return False
        if parts[1] not in ["prod", "dev", "test"]:
            return False
        if len(parts[2]) < 20:
            return False
        return True


# ============================================================================
# 4. RATE LIMITING
# ============================================================================

class RateLimiter:
    """Redis-based rate limiter with sliding window"""

    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def check_rate_limit(
        self,
        api_key_id: str,
        limit: int,
        window_seconds: int,
        identifier: str
    ) -> tuple[bool, int, int]:
        """
        Check if request is within rate limit using sliding window

        Args:
            api_key_id: API key identifier
            limit: Maximum requests allowed
            window_seconds: Time window in seconds
            identifier: Unique identifier (e.g., 'minute', 'hour', 'day')

        Returns:
            tuple: (allowed: bool, remaining: int, reset_time: int)
        """
        now = time.time()
        window_start = now - window_seconds

        # Redis key for this rate limit
        key = f"rate_limit:{api_key_id}:{identifier}"

        # Remove old entries outside the window
        self.redis.zremrangebyscore(key, 0, window_start)

        # Count requests in current window
        current_requests = self.redis.zcard(key)

        if current_requests >= limit:
            # Rate limit exceeded
            oldest = self.redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                reset_time = int(oldest[0][1]) + window_seconds
            else:
                reset_time = int(now + window_seconds)
            return False, 0, reset_time

        # Add current request
        self.redis.zadd(key, {str(uuid.uuid4()): now})

        # Set expiration
        self.redis.expire(key, window_seconds)

        # Calculate remaining and reset time
        remaining = limit - current_requests - 1
        reset_time = int(now + window_seconds)

        return True, remaining, reset_time

    def check_concurrent_jobs(
        self,
        api_key_id: str,
        max_concurrent: int
    ) -> tuple[bool, int]:
        """
        Check concurrent job limit

        Returns:
            tuple: (allowed: bool, current_jobs: int)
        """
        key = f"active_jobs:{api_key_id}"
        current_jobs = int(self.redis.get(key) or 0)

        if current_jobs >= max_concurrent:
            return False, current_jobs

        return True, current_jobs

    def increment_active_jobs(self, api_key_id: str):
        """Increment active job counter"""
        key = f"active_jobs:{api_key_id}"
        self.redis.incr(key)
        # Set expiration to prevent leaks (24 hours)
        self.redis.expire(key, 86400)

    def decrement_active_jobs(self, api_key_id: str):
        """Decrement active job counter"""
        key = f"active_jobs:{api_key_id}"
        current = int(self.redis.get(key) or 0)
        if current > 0:
            self.redis.decr(key)


# ============================================================================
# 5. AUTHENTICATION MIDDLEWARE
# ============================================================================

class AuthService:
    """Authentication service"""

    def __init__(self, db_session: Session, redis_client: Redis):
        self.db = db_session
        self.rate_limiter = RateLimiter(redis_client)

    def validate_api_key(self, api_key: str) -> Optional[APIKey]:
        """
        Validate API key and return API key object

        Returns:
            APIKey object or None if invalid
        """
        # Validate format
        if not APIKeyManager.validate_key_format(api_key):
            return None

        # Hash and lookup
        key_hash = APIKeyManager.hash_key(api_key)
        api_key_obj = self.db.query(APIKey).filter(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True
        ).first()

        if not api_key_obj:
            return None

        # Check expiration
        if api_key_obj.expires_at and api_key_obj.expires_at < datetime.utcnow():
            return None

        # Update last used
        api_key_obj.last_used_at = datetime.utcnow()
        self.db.commit()

        return api_key_obj

    def check_rate_limits(self, api_key_obj: APIKey) -> tuple[bool, Dict[str, Any]]:
        """
        Check all rate limits for API key

        Returns:
            tuple: (allowed: bool, headers: dict)
        """
        # Check per-minute limit
        allowed_min, remaining_min, reset_min = self.rate_limiter.check_rate_limit(
            api_key_obj.id,
            api_key_obj.requests_per_minute,
            60,
            "minute"
        )

        # Check per-hour limit
        allowed_hour, remaining_hour, reset_hour = self.rate_limiter.check_rate_limit(
            api_key_obj.id,
            api_key_obj.requests_per_hour,
            3600,
            "hour"
        )

        # Check per-day limit
        allowed_day, remaining_day, reset_day = self.rate_limiter.check_rate_limit(
            api_key_obj.id,
            api_key_obj.requests_per_day,
            86400,
            "day"
        )

        # Prepare headers
        headers = {
            "X-RateLimit-Limit-Minute": str(api_key_obj.requests_per_minute),
            "X-RateLimit-Remaining-Minute": str(remaining_min),
            "X-RateLimit-Reset-Minute": str(reset_min),
            "X-RateLimit-Limit-Hour": str(api_key_obj.requests_per_hour),
            "X-RateLimit-Remaining-Hour": str(remaining_hour),
            "X-RateLimit-Limit-Day": str(api_key_obj.requests_per_day),
            "X-RateLimit-Remaining-Day": str(remaining_day),
        }

        # Check if any limit exceeded
        if not (allowed_min and allowed_hour and allowed_day):
            return False, headers

        return True, headers


async def get_current_api_key(
    authorization: str = Header(None),
    api_key: str = Header(None),
    db: Session = Depends(lambda: None),  # Placeholder
    redis: Redis = Depends(lambda: None)  # Placeholder
) -> APIKey:
    """
    Dependency to validate API key from request

    Can be provided via:
    - Authorization header: "Bearer gsr_prod_xxx"
    - api_key header: "gsr_prod_xxx"
    """
    # Extract API key
    key = None
    if authorization and authorization.startswith("Bearer "):
        key = authorization.replace("Bearer ", "")
    elif api_key:
        key = api_key

    if not key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Provide via Authorization header or api_key header."
        )

    # Validate
    auth_service = AuthService(db, redis)
    api_key_obj = auth_service.validate_api_key(key)

    if not api_key_obj:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired API key"
        )

    # Check rate limits
    allowed, headers = auth_service.check_rate_limits(api_key_obj)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers=headers
        )

    return api_key_obj


# ============================================================================
# 6. INPUT VALIDATION
# ============================================================================

class InputValidator:
    """Validates API inputs"""

    @staticmethod
    def validate_gene_list(
        genes: List[str],
        max_size: int,
        valid_genes: Optional[set] = None
    ) -> tuple[bool, List[str], List[str]]:
        """
        Validate gene list

        Returns:
            tuple: (valid: bool, valid_genes: list, invalid_genes: list)
        """
        if len(genes) > max_size:
            return False, [], []

        if not valid_genes:
            # Without validation set, just check format
            invalid = [g for g in genes if not g.isalnum()]
            return len(invalid) == 0, genes, invalid

        valid = [g for g in genes if g in valid_genes]
        invalid = [g for g in genes if g not in valid_genes]

        return len(invalid) == 0, valid, invalid

    @staticmethod
    def validate_dataset(dataset_id: str, allowed_datasets: List[str]) -> bool:
        """Validate dataset access"""
        if "*" in allowed_datasets:
            return True
        return dataset_id in allowed_datasets


# ============================================================================
# 7. FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="GenesetR API",
    description="REST API for programmatic access to GenesetR analysis",
    version="1.0.0",
    docs_url="/v1/docs",
    redoc_url="/v1/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://genesetr.uio.no"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
    expose_headers=[
        "X-RateLimit-Limit-Minute",
        "X-RateLimit-Remaining-Minute",
        "X-RateLimit-Reset-Minute",
        "X-Task-ID"
    ]
)


# ============================================================================
# 8. API ENDPOINTS
# ============================================================================

@app.post("/v1/analysis/pca", response_model=TaskResponse)
async def analyze_pca(
    request: PCARequest,
    api_key: APIKey = Depends(get_current_api_key)
):
    """
    Perform PCA analysis

    This endpoint submits an asynchronous PCA analysis job.
    Use the returned task_id to poll for results or connect via WebSocket.
    """
    # Validate gene list size
    if len(request.gene_list) > api_key.max_gene_list_size:
        raise HTTPException(
            status_code=400,
            detail=f"Gene list exceeds maximum size of {api_key.max_gene_list_size}"
        )

    # Check concurrent jobs
    rate_limiter = RateLimiter(Redis())  # Placeholder
    allowed, current_jobs = rate_limiter.check_concurrent_jobs(
        api_key.id,
        api_key.concurrent_jobs
    )

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Maximum concurrent jobs ({api_key.concurrent_jobs}) reached. "
                   f"Current active jobs: {current_jobs}"
        )

    # Create task (this would call your existing Celery task)
    task_id = str(uuid.uuid4())

    # Increment active jobs
    rate_limiter.increment_active_jobs(api_key.id)

    # Submit to Celery (placeholder)
    # celery_task = pca_analysis.apply_async(
    #     args=[request.dict()],
    #     task_id=task_id,
    #     queue=f"priority_{api_key.tier}"
    # )

    return TaskResponse(
        success=True,
        task_id=task_id,
        status="pending",
        message="PCA analysis started",
        estimated_time=30,
        poll_url=f"/v1/tasks/{task_id}",
        websocket_url=f"wss://api.genesetr.uio.no/v1/ws/tasks/{task_id}",
        meta={
            "timestamp": datetime.utcnow().isoformat(),
            "rate_limit_remaining": 95,  # From rate limiter
            "rate_limit_reset": (datetime.utcnow() + timedelta(minutes=1)).isoformat()
        }
    )


@app.get("/v1/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    api_key: APIKey = Depends(get_current_api_key)
):
    """
    Get status and results of a task

    Returns task status, progress, and results if completed.
    """
    # Verify task belongs to this API key (check in database)
    # task = db.query(Task).filter(Task.id == task_id, Task.api_key_id == api_key.id).first()

    # Get task status from Celery
    # celery_task = AsyncResult(task_id)

    # Placeholder response
    return TaskStatusResponse(
        success=True,
        task_id=task_id,
        status="completed",
        progress=100,
        message="Analysis complete",
        result={
            "coordinates": [[1, 2, 3], [4, 5, 6]],
            "clusters": [0, 0, 1, 1],
            "explained_variance": [0.45, 0.23, 0.15]
        },
        computation_time=12.5,
        cached=False,
        created_at=datetime.utcnow().isoformat(),
        completed_at=datetime.utcnow().isoformat()
    )


@app.delete("/v1/tasks/{task_id}")
async def cancel_task(
    task_id: str,
    api_key: APIKey = Depends(get_current_api_key)
):
    """Cancel a running task"""
    # Verify ownership and cancel
    # celery_task = AsyncResult(task_id)
    # celery_task.revoke(terminate=True)

    # Decrement active jobs
    rate_limiter = RateLimiter(Redis())
    rate_limiter.decrement_active_jobs(api_key.id)

    return {"success": True, "message": "Task cancelled"}


@app.get("/v1/auth/validate", response_model=UsageResponse)
async def validate_api_key(
    api_key: APIKey = Depends(get_current_api_key)
):
    """Validate API key and get usage information"""
    rate_limiter = RateLimiter(Redis())
    _, current_jobs = rate_limiter.check_concurrent_jobs(
        api_key.id,
        api_key.concurrent_jobs
    )

    return UsageResponse(
        valid=True,
        tier=api_key.tier,
        usage={
            "requests_remaining_today": api_key.requests_per_day - 144,  # Placeholder
            "concurrent_jobs": current_jobs,
            "max_concurrent_jobs": api_key.concurrent_jobs,
            "computation_minutes_used": api_key.used_computation_minutes_current_month,
            "computation_minutes_quota": api_key.max_computation_minutes_per_month
        },
        permissions={
            "max_gene_list_size": api_key.max_gene_list_size,
            "allowed_endpoints": ["*"],
            "allowed_datasets": ["*"]
        }
    )


# ============================================================================
# 9. ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom error response format"""
    return {
        "success": False,
        "error": {
            "code": exc.status_code,
            "message": exc.detail,
            "details": {}
        },
        "meta": {
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": str(uuid.uuid4())
        }
    }


# ============================================================================
# 10. STARTUP EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    # Connect to database
    # Connect to Redis
    # Initialize Celery
    # Load configuration
    pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
