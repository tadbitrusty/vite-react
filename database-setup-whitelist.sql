-- ResumeSniper Manufacturing Line Database Setup
-- Optimized for speed and whitelist security

-- Enhanced Users Table with Whitelist Support
CREATE TABLE IF NOT EXISTS users (
  email VARCHAR PRIMARY KEY,
  privilege_level VARCHAR NOT NULL DEFAULT 'free', 
  -- Levels: 'free', 'influencer', 'foundation', 'admin', 'tester'
  resumes_remaining INTEGER DEFAULT 1,
  resumes_used INTEGER DEFAULT 0,
  whitelist_code VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  last_resume_date TIMESTAMP,
  total_spent DECIMAL DEFAULT 0.00
);

-- Pre-populate VIP users (hardcoded in N8N for speed, backed up in DB)
INSERT INTO users (email, privilege_level, resumes_remaining, whitelist_code) VALUES 
('adamhoemberg@gmail.com', 'admin', -1, 'ADMIN_ACCESS'),
('jhoemberg75@gmail.com', 'tester', -1, 'JESSICA_TESTER')
ON CONFLICT (email) DO UPDATE SET
  privilege_level = EXCLUDED.privilege_level,
  resumes_remaining = EXCLUDED.resumes_remaining,
  whitelist_code = EXCLUDED.whitelist_code;

-- Influencer Whitelist Management
CREATE TABLE IF NOT EXISTS influencer_whitelist (
  email VARCHAR PRIMARY KEY,
  influencer_name VARCHAR NOT NULL,
  platform VARCHAR, -- 'youtube', 'linkedin', 'twitter', 'tiktok'
  follower_count INTEGER,
  resumes_allocated INTEGER DEFAULT 20,
  resumes_used INTEGER DEFAULT 0,
  added_by VARCHAR DEFAULT 'admin',
  status VARCHAR DEFAULT 'active', -- 'active', 'paused', 'expired'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Foundation Access Management
CREATE TABLE IF NOT EXISTS foundation_access (
  foundation_code VARCHAR PRIMARY KEY,
  foundation_name VARCHAR NOT NULL,
  contact_person VARCHAR,
  contact_email VARCHAR,
  unlimited_access BOOLEAN DEFAULT TRUE,
  resumes_used INTEGER DEFAULT 0,
  added_by VARCHAR DEFAULT 'admin',
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-populate Mike Rowe Foundation
INSERT INTO foundation_access (foundation_code, foundation_name, contact_person, contact_email) VALUES 
('MIKE_ROWE_FOUNDATION', 'mikeroWORKS Foundation', 'Mike Rowe', 'contact@mikerowe.com')
ON CONFLICT (foundation_code) DO NOTHING;

-- Processing Analytics for Speed Monitoring
CREATE TABLE IF NOT EXISTS processing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  processing_duration_ms INTEGER,
  processing_duration_seconds INTEGER,
  ai_provider_used VARCHAR DEFAULT 'claude',
  privilege_level VARCHAR,
  route_taken VARCHAR, -- 'vip_fastpath', 'foundation_path', 'database_lookup'
  file_size_bytes INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Speed Optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_privilege_level ON users(privilege_level);
CREATE INDEX IF NOT EXISTS idx_influencer_email ON influencer_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_influencer_status ON influencer_whitelist(status);
CREATE INDEX IF NOT EXISTS idx_foundation_code ON foundation_access(foundation_code);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON processing_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_email ON processing_analytics(email);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE foundation_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_analytics ENABLE ROW LEVEL SECURITY;

-- Admin access policy (for your API calls)
CREATE POLICY "Admin full access" ON users
  FOR ALL USING (auth.jwt() ->> 'email' = 'adamhoemberg@gmail.com');

CREATE POLICY "Admin influencer access" ON influencer_whitelist
  FOR ALL USING (auth.jwt() ->> 'email' = 'adamhoemberg@gmail.com');

CREATE POLICY "Admin foundation access" ON foundation_access
  FOR ALL USING (auth.jwt() ->> 'email' = 'adamhoemberg@gmail.com');

CREATE POLICY "Admin analytics access" ON processing_analytics
  FOR ALL USING (auth.jwt() ->> 'email' = 'adamhoemberg@gmail.com');

-- Functions for Common Operations

-- Function: Check User Privilege Level
CREATE OR REPLACE FUNCTION check_user_privilege(user_email VARCHAR)
RETURNS TABLE(
  email VARCHAR,
  privilege_level VARCHAR,
  resumes_remaining INTEGER,
  authorized BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.email,
    u.privilege_level,
    u.resumes_remaining,
    CASE 
      WHEN u.privilege_level IN ('admin', 'tester', 'foundation') THEN TRUE
      WHEN u.resumes_remaining > 0 THEN TRUE
      ELSE FALSE
    END as authorized
  FROM users u
  WHERE u.email = user_email;
END;
$$;

-- Function: Add Influencer to Whitelist
CREATE OR REPLACE FUNCTION add_influencer(
  influencer_email VARCHAR,
  influencer_name VARCHAR,
  platform VARCHAR DEFAULT NULL,
  follower_count INTEGER DEFAULT NULL,
  resumes_allocated INTEGER DEFAULT 20
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into influencer whitelist
  INSERT INTO influencer_whitelist (
    email, influencer_name, platform, follower_count, resumes_allocated
  ) VALUES (
    influencer_email, influencer_name, platform, follower_count, resumes_allocated
  );
  
  -- Update or insert into users table
  INSERT INTO users (email, privilege_level, resumes_remaining, whitelist_code)
  VALUES (influencer_email, 'influencer', resumes_allocated, 'INFLUENCER_ACCESS')
  ON CONFLICT (email) DO UPDATE SET
    privilege_level = 'influencer',
    resumes_remaining = resumes_allocated,
    whitelist_code = 'INFLUENCER_ACCESS';
    
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function: Log Processing Analytics
CREATE OR REPLACE FUNCTION log_processing(
  user_email VARCHAR,
  duration_ms INTEGER,
  ai_provider VARCHAR DEFAULT 'claude',
  user_privilege VARCHAR DEFAULT 'free',
  route_used VARCHAR DEFAULT 'database_lookup',
  file_size INTEGER DEFAULT NULL,
  success_status BOOLEAN DEFAULT TRUE,
  error_msg TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO processing_analytics (
    email, processing_duration_ms, processing_duration_seconds,
    ai_provider_used, privilege_level, route_taken,
    file_size_bytes, success, error_message
  ) VALUES (
    user_email, duration_ms, ROUND(duration_ms / 1000),
    ai_provider, user_privilege, route_used,
    file_size, success_status, error_msg
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Sample Analytics Queries

-- View: Daily Processing Stats
CREATE OR REPLACE VIEW daily_processing_stats AS
SELECT 
  DATE(created_at) as processing_date,
  COUNT(*) as total_resumes,
  AVG(processing_duration_seconds) as avg_processing_time,
  COUNT(*) FILTER (WHERE success = true) as successful_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*), 2) as success_rate,
  COUNT(*) FILTER (WHERE privilege_level = 'free') as free_users,
  COUNT(*) FILTER (WHERE privilege_level = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE privilege_level = 'tester') as tester_users,
  COUNT(*) FILTER (WHERE privilege_level = 'influencer') as influencer_users,
  COUNT(*) FILTER (WHERE privilege_level = 'foundation') as foundation_users,
  COUNT(*) FILTER (WHERE route_taken = 'vip_fastpath') as vip_fastpath_count,
  COUNT(*) FILTER (WHERE route_taken = 'foundation_path') as foundation_path_count,
  COUNT(*) FILTER (WHERE route_taken = 'database_lookup') as database_lookup_count
FROM processing_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY processing_date DESC;

-- View: Influencer Performance
CREATE OR REPLACE VIEW influencer_performance AS
SELECT 
  i.influencer_name,
  i.platform,
  i.follower_count,
  i.resumes_allocated,
  i.resumes_used,
  (i.resumes_allocated - i.resumes_used) as resumes_remaining,
  ROUND(100.0 * i.resumes_used / i.resumes_allocated, 2) as usage_percentage,
  COUNT(pa.email) as total_processed,
  AVG(pa.processing_duration_seconds) as avg_processing_time,
  i.status,
  i.created_at
FROM influencer_whitelist i
LEFT JOIN processing_analytics pa ON i.email = pa.email
WHERE i.status = 'active'
GROUP BY i.email, i.influencer_name, i.platform, i.follower_count, 
         i.resumes_allocated, i.resumes_used, i.status, i.created_at
ORDER BY i.resumes_used DESC;

-- Performance monitoring query
-- Run this to check system speed
/*
SELECT 
  'Last 24 Hours Performance' as period,
  COUNT(*) as total_processed,
  AVG(processing_duration_seconds) as avg_seconds,
  MIN(processing_duration_seconds) as fastest_seconds,
  MAX(processing_duration_seconds) as slowest_seconds,
  COUNT(*) FILTER (WHERE processing_duration_seconds <= 60) as under_60_seconds,
  ROUND(100.0 * COUNT(*) FILTER (WHERE processing_duration_seconds <= 60) / COUNT(*), 2) as speed_target_percentage
FROM processing_analytics 
WHERE created_at >= NOW() - INTERVAL '24 hours';
*/