-- GenesetR REST API Database Migration
-- This creates the necessary tables for API key management and usage tracking

-- ============================================================================
-- 1. API Keys Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of API key
    key_prefix VARCHAR(12) NOT NULL,        -- First 12 chars for identification (e.g., "gsr_prod_a1b")

    -- User information
    user_id VARCHAR(255) NOT NULL,          -- Email or institutional ID
    organization VARCHAR(255),              -- Institution/Organization name
    tier VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'academic', 'premium', 'enterprise'

    -- Rate limiting configuration
    requests_per_minute INTEGER NOT NULL DEFAULT 10,
    requests_per_hour INTEGER NOT NULL DEFAULT 100,
    requests_per_day INTEGER NOT NULL DEFAULT 1000,
    concurrent_jobs INTEGER NOT NULL DEFAULT 2,

    -- Computation quotas
    max_computation_minutes_per_month INTEGER NOT NULL DEFAULT 60,
    used_computation_minutes_current_month INTEGER NOT NULL DEFAULT 0,
    quota_reset_date DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'),

    -- Permissions
    allowed_endpoints TEXT[],                -- Array of allowed endpoint patterns (NULL = all)
    allowed_datasets TEXT[],                 -- Array of allowed dataset IDs (NULL = all)
    max_gene_list_size INTEGER NOT NULL DEFAULT 100,

    -- IP restrictions (optional)
    allowed_ips INET[],                     -- Array of allowed IP addresses/CIDR blocks

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,                   -- NULL for no expiration
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,                             -- Admin notes

    -- Constraints
    CONSTRAINT valid_tier CHECK (tier IN ('free', 'academic', 'premium', 'enterprise')),
    CONSTRAINT positive_limits CHECK (
        requests_per_minute > 0 AND
        requests_per_hour > 0 AND
        requests_per_day > 0 AND
        concurrent_jobs > 0 AND
        max_computation_minutes_per_month > 0
    )
);

-- Indexes for performance
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_tier ON api_keys(tier);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE api_keys IS 'Stores API keys for REST API authentication';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (never store plaintext)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of API key for display purposes';
COMMENT ON COLUMN api_keys.tier IS 'Subscription tier determining rate limits and quotas';
COMMENT ON COLUMN api_keys.allowed_endpoints IS 'Whitelist of endpoints; NULL means all allowed';
COMMENT ON COLUMN api_keys.allowed_ips IS 'IP whitelist; NULL means all IPs allowed';


-- ============================================================================
-- 2. API Usage Tracking Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_usage (
    -- Primary identification
    id BIGSERIAL PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

    -- Request information
    endpoint VARCHAR(255) NOT NULL,
    request_method VARCHAR(10) NOT NULL,    -- GET, POST, DELETE
    task_id UUID,                           -- Associated Celery task ID (if applicable)

    -- Request details
    gene_count INTEGER,                     -- Number of genes in request
    dataset_id VARCHAR(100),                -- Dataset used
    analysis_type VARCHAR(50),              -- pca, correlation, umap, etc.

    -- Response details
    status_code INTEGER NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,

    -- Performance metrics
    request_time_ms INTEGER,                -- Time to process request (for sync requests)
    computation_seconds INTEGER,            -- Total computation time (for async tasks)
    cached BOOLEAN DEFAULT FALSE,           -- Whether result was served from cache

    -- Timestamps
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,

    -- Client information
    ip_address INET,
    user_agent TEXT,
    request_id UUID DEFAULT gen_random_uuid(),

    -- Constraints
    CONSTRAINT valid_method CHECK (request_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    CONSTRAINT valid_status_code CHECK (status_code >= 100 AND status_code < 600)
);

-- Indexes for analytics and monitoring
CREATE INDEX idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX idx_api_usage_requested_at ON api_usage(requested_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_status_code ON api_usage(status_code);
CREATE INDEX idx_api_usage_task_id ON api_usage(task_id) WHERE task_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_api_usage_key_date ON api_usage(api_key_id, requested_at DESC);

-- Partitioning by month (optional, for high-volume installations)
-- CREATE TABLE api_usage_2025_12 PARTITION OF api_usage
--     FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Comments
COMMENT ON TABLE api_usage IS 'Tracks all API requests for analytics and billing';
COMMENT ON COLUMN api_usage.computation_seconds IS 'Total time spent computing (for quota tracking)';
COMMENT ON COLUMN api_usage.cached IS 'Whether the result was served from Redis cache';


-- ============================================================================
-- 3. API Key Requests Table (Optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_key_requests (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Requester information
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    institution_email VARCHAR(255),         -- For academic verification
    orcid VARCHAR(19),                      -- ORCID identifier

    -- Request details
    requested_tier VARCHAR(20) NOT NULL DEFAULT 'free',
    use_case TEXT NOT NULL,                 -- Description of intended use
    estimated_usage TEXT,                   -- Estimated monthly usage

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_by VARCHAR(255),               -- Admin who reviewed
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,

    -- Generated API key (reference)
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_request_tier CHECK (requested_tier IN ('free', 'academic', 'premium', 'enterprise')),
    CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_api_key_requests_status ON api_key_requests(status);
CREATE INDEX idx_api_key_requests_email ON api_key_requests(email);
CREATE INDEX idx_api_key_requests_created_at ON api_key_requests(created_at DESC);

-- Comments
COMMENT ON TABLE api_key_requests IS 'Stores user requests for API keys (for manual approval workflow)';


-- ============================================================================
-- 4. Views for Analytics
-- ============================================================================

-- Daily usage summary by API key
CREATE OR REPLACE VIEW v_daily_usage_by_key AS
SELECT
    api_key_id,
    ak.user_id,
    ak.tier,
    DATE(requested_at) AS usage_date,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE status_code < 400) AS successful_requests,
    COUNT(*) FILTER (WHERE status_code >= 400) AS failed_requests,
    SUM(computation_seconds) AS total_computation_seconds,
    COUNT(DISTINCT endpoint) AS unique_endpoints,
    AVG(request_time_ms) AS avg_request_time_ms
FROM api_usage au
JOIN api_keys ak ON au.api_key_id = ak.id
GROUP BY api_key_id, ak.user_id, ak.tier, DATE(requested_at);

COMMENT ON VIEW v_daily_usage_by_key IS 'Daily aggregated usage statistics per API key';


-- Endpoint popularity
CREATE OR REPLACE VIEW v_endpoint_popularity AS
SELECT
    endpoint,
    COUNT(*) AS request_count,
    COUNT(DISTINCT api_key_id) AS unique_users,
    AVG(computation_seconds) AS avg_computation_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY computation_seconds) AS median_computation_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY computation_seconds) AS p95_computation_time,
    COUNT(*) FILTER (WHERE cached = TRUE)::FLOAT / COUNT(*) AS cache_hit_rate
FROM api_usage
WHERE requested_at > NOW() - INTERVAL '30 days'
GROUP BY endpoint
ORDER BY request_count DESC;

COMMENT ON VIEW v_endpoint_popularity IS 'Endpoint usage statistics for last 30 days';


-- Active API keys summary
CREATE OR REPLACE VIEW v_active_keys_summary AS
SELECT
    tier,
    COUNT(*) AS total_keys,
    COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '7 days') AS active_last_7_days,
    COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '30 days') AS active_last_30_days,
    SUM(used_computation_minutes_current_month) AS total_computation_minutes,
    SUM(max_computation_minutes_per_month) AS total_quota_minutes
FROM api_keys
WHERE is_active = TRUE
GROUP BY tier;

COMMENT ON VIEW v_active_keys_summary IS 'Summary of active API keys by tier';


-- ============================================================================
-- 5. Functions for Quota Management
-- ============================================================================

-- Function to reset monthly quotas
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
    UPDATE api_keys
    SET
        used_computation_minutes_current_month = 0,
        quota_reset_date = DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
    WHERE quota_reset_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_quotas() IS 'Resets monthly computation quotas for all API keys';


-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_computation_usage(
    p_api_key_id UUID,
    p_computation_minutes FLOAT
)
RETURNS void AS $$
BEGIN
    UPDATE api_keys
    SET used_computation_minutes_current_month =
        used_computation_minutes_current_month + p_computation_minutes
    WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_computation_usage(UUID, FLOAT) IS 'Increments computation usage for an API key';


-- Function to check if key is over quota
CREATE OR REPLACE FUNCTION is_over_quota(p_api_key_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_used INTEGER;
    v_quota INTEGER;
BEGIN
    SELECT
        used_computation_minutes_current_month,
        max_computation_minutes_per_month
    INTO v_used, v_quota
    FROM api_keys
    WHERE id = p_api_key_id;

    RETURN v_used >= v_quota;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_over_quota(UUID) IS 'Check if API key has exceeded monthly quota';


-- ============================================================================
-- 6. Scheduled Jobs (Cron)
-- ============================================================================

-- Create pg_cron extension (if not exists)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly quota reset (runs on first day of each month)
-- SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas();');

-- Alternative: Run via external cron job or application scheduler


-- ============================================================================
-- 7. Initial Data - Tier Templates
-- ============================================================================

-- Insert default tier configurations (can be used as templates)
CREATE TABLE IF NOT EXISTS api_tier_templates (
    tier VARCHAR(20) PRIMARY KEY,
    requests_per_minute INTEGER NOT NULL,
    requests_per_hour INTEGER NOT NULL,
    requests_per_day INTEGER NOT NULL,
    concurrent_jobs INTEGER NOT NULL,
    max_computation_minutes_per_month INTEGER NOT NULL,
    max_gene_list_size INTEGER NOT NULL,
    price_per_month DECIMAL(10,2) NOT NULL,
    description TEXT
);

INSERT INTO api_tier_templates VALUES
    ('free', 10, 100, 100, 1, 30, 50, 0.00,
     'Free tier for testing and light usage'),
    ('academic', 30, 500, 1000, 3, 180, 200, 0.00,
     'Free tier for verified academic researchers (.edu email)'),
    ('premium', 100, 2000, 10000, 10, 1000, 1000, 99.00,
     'Premium tier for commercial and intensive research use'),
    ('enterprise', 1000, 20000, 100000, 50, 10000, 10000, 999.00,
     'Enterprise tier with custom limits and SLA')
ON CONFLICT (tier) DO NOTHING;


-- ============================================================================
-- 8. Audit Triggers (Optional)
-- ============================================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS api_keys_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    api_key_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE, ACTIVATE, DEACTIVATE
    changed_by VARCHAR(255),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    old_values JSONB,
    new_values JSONB
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION api_keys_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO api_keys_audit (api_key_id, action, old_values, new_values)
        VALUES (
            NEW.id,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO api_keys_audit (api_key_id, action, old_values)
        VALUES (
            OLD.id,
            'DELETE',
            row_to_json(OLD)
        );
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO api_keys_audit (api_key_id, action, new_values)
        VALUES (
            NEW.id,
            'INSERT',
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER api_keys_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION api_keys_audit_trigger();


-- ============================================================================
-- 9. Sample Data for Testing
-- ============================================================================

-- Insert a test API key (for development only)
-- DO $$
-- DECLARE
--     test_key_id UUID;
-- BEGIN
--     INSERT INTO api_keys (
--         key_hash,
--         key_prefix,
--         user_id,
--         organization,
--         tier,
--         notes
--     ) VALUES (
--         'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',  -- Hash of test key
--         'gsr_dev_test',
--         'test@example.com',
--         'Test Organization',
--         'premium',
--         'Test API key for development'
--     ) RETURNING id INTO test_key_id;
--
--     RAISE NOTICE 'Test API key created with ID: %', test_key_id;
-- END $$;


-- ============================================================================
-- 10. Cleanup and Maintenance
-- ============================================================================

-- Function to clean old usage records (retain last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_usage_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_usage
    WHERE requested_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_usage_records() IS 'Deletes API usage records older than 90 days';

-- Schedule cleanup (run weekly)
-- SELECT cron.schedule('cleanup-old-usage', '0 2 * * 0', 'SELECT cleanup_old_usage_records();');


-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('api_keys', 'api_usage', 'api_key_requests', 'api_tier_templates', 'api_keys_audit');

    RAISE NOTICE 'Migration complete. Created % tables.', table_count;
END $$;
