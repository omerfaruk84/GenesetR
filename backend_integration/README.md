# GenesetR Backend Integration - Free API Implementation

This directory contains everything you need to add rate limiting and API access to your GenesetR backend.

## 📦 What's Included

```
backend_integration/
├── rate_limiter.py           # Main module (drop into your backend)
├── INTEGRATION_GUIDE.md      # Step-by-step integration guide
├── USER_DOCUMENTATION.md     # Documentation for API users
├── examples/
│   ├── flask_integration.py  # Complete Flask example
│   └── fastapi_integration.py # Complete FastAPI example
└── README.md                 # This file
```

## 🚀 Quick Start (5 Minutes!)

### 1. Copy `rate_limiter.py` to your backend
```bash
cp rate_limiter.py /path/to/your/backend/
```

### 2. Initialize Redis in your app
```python
from rate_limiter import init_redis

# At app startup
init_redis(host='localhost', port=6379)
```

### 3. Add decorator to `/getData` endpoint
```python
from rate_limiter import rate_limit

@app.post("/getData")
@rate_limit(anon_limit=10, registered_limit=30)
def get_data():
    # Your existing code stays the same!
    pass
```

### 4. Update Celery tasks
```python
from rate_limiter import TrackingTask

@celery_app.task(base=TrackingTask)
def your_task(params):
    # Your existing code - no changes needed!
    pass
```

## ✅ What You Get

- ✅ **10 requests/min** for anonymous users (IP-based)
- ✅ **30 requests/min** for registered users (free API keys)
- ✅ **Queue management** (max 50 concurrent tasks by default)
- ✅ **Automatic task tracking** (increments/decrements)
- ✅ **Usage statistics** (logged to Redis)
- ✅ **Works with Flask and FastAPI**
- ✅ **No database needed** (just Redis, which you already have!)

## 📚 Documentation

- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Complete integration instructions
- **[USER_DOCUMENTATION.md](USER_DOCUMENTATION.md)** - User-facing API docs
- **[examples/flask_integration.py](examples/flask_integration.py)** - Working Flask example
- **[examples/fastapi_integration.py](examples/fastapi_integration.py)** - Working FastAPI example

## 🧪 Test It

### Run the included examples:

**Flask:**
```bash
cd examples
python flask_integration.py
# Visit http://localhost:5000
```

**FastAPI:**
```bash
cd examples
pip install fastapi uvicorn
python fastapi_integration.py
# Visit http://localhost:8000/docs
```

### Test with curl:
```bash
# Anonymous request (10 req/min)
for i in {1..12}; do
  curl -X POST http://localhost:5000/getData \
    -H "Content-Type: application/json" \
    -d '{"request": "PCAGraph", "geneList": ["TP53", "MYC"]}'
  echo ""
done

# You'll see rate limiting kick in after 10 requests!
```

### Test with Python:
```bash
# Run built-in tests
python rate_limiter.py
```

## 🎯 Features

### Rate Limiting
- **Sliding window algorithm** (accurate, no bursting)
- **Per-IP** for anonymous users
- **Per-API-key** for registered users
- **Automatic headers** (X-RateLimit-Limit, X-RateLimit-Remaining)

### Queue Management
- **Capacity checking** (prevents server overload)
- **Active task tracking** (real-time count)
- **Automatic cleanup** (decrements on success/failure)

### API Keys
- **Simple generation** (stored in Redis, no database!)
- **Email-based** (just for contact, no verification needed)
- **Revocation support** (can disable keys)
- **Usage tracking** (request counts, last used)

### Statistics
- **Daily usage logs** (total requests, by endpoint, by type)
- **Access type tracking** (anonymous vs registered)
- **90-day retention** (automatic expiration)
- **Simple query API** (get stats for any date)

## ⚙️ Configuration

### Adjust Rate Limits
```python
@rate_limit(
    anon_limit=10,       # Anonymous: 10 req/min
    registered_limit=30,  # Registered: 30 req/min
    window=60,           # Window: 60 seconds
    check_capacity=True, # Check queue capacity
    max_tasks=50         # Max concurrent tasks
)
```

### Different Limits per Endpoint
```python
# Heavy endpoint - lower limits
@app.post("/getData")
@rate_limit(anon_limit=5, registered_limit=20)
def get_data():
    pass

# Light endpoint - higher limits
@app.get("/getDatasets")
@rate_limit(anon_limit=30, registered_limit=100, check_capacity=False)
def get_datasets():
    pass
```

## 📊 Monitoring

### Check active tasks:
```python
from rate_limiter import get_redis
active = int(get_redis().get("active_tasks_count") or 0)
print(f"Active tasks: {active}")
```

### View statistics:
```python
from rate_limiter import get_stats
stats = get_stats("2025-12-12")
print(stats)
```

### API endpoint:
```bash
curl http://localhost:5000/api/stats?date=2025-12-12
```

## 🔧 Troubleshooting

### "Redis not initialized"
Make sure you call `init_redis()` at app startup:
```python
from rate_limiter import init_redis
init_redis(host='localhost', port=6379)
```

### Rate limiting not working
Check decorator order (rate_limit should be AFTER route decorator):
```python
# ✓ Correct
@app.post("/getData")
@rate_limit()
def get_data():
    pass

# ✗ Wrong
@rate_limit()
@app.post("/getData")
def get_data():
    pass
```

### Active tasks keep growing
Make sure Celery tasks use `TrackingTask` base class:
```python
from rate_limiter import TrackingTask

@celery_app.task(base=TrackingTask)  # <-- Required!
def my_task(params):
    pass
```

## 🎓 Complete Examples

See the `examples/` directory for complete working implementations:

1. **Flask** (`examples/flask_integration.py`):
   - Complete Flask app with rate limiting
   - Registration endpoint
   - Stats endpoint
   - Rate limit status check
   - Working test server

2. **FastAPI** (`examples/fastapi_integration.py`):
   - Complete FastAPI app with rate limiting
   - Async support
   - Auto-generated OpenAPI docs
   - Same functionality as Flask example

Both examples are **ready to run** - just install dependencies and go!

## 📦 Dependencies

- `redis` - Python Redis client
- `Flask` or `FastAPI` - Your web framework (whichever you use)
- That's it! No other dependencies needed.

## 🚀 Deployment

### Production Checklist
- [ ] Redis is running and accessible
- [ ] `init_redis()` called at app startup
- [ ] Rate limit decorator applied to endpoints
- [ ] Celery tasks use `TrackingTask`
- [ ] Registration sends email (not returning key in response)
- [ ] Stats endpoint has authentication
- [ ] Tested with curl/Postman
- [ ] Limits adjusted for server capacity
- [ ] Monitoring set up
- [ ] User documentation published

### Environment Variables (Recommended)
```python
import os

init_redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD')
)
```

## 📞 Support

- See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed instructions
- Check [examples/](examples/) for working code
- Raise an issue if you encounter problems

## 📄 License

Same as GenesetR main project.

---

**Ready to integrate?** Start with [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)!
