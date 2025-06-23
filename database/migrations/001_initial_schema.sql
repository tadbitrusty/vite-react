-- ResumeSniper Database Migration 001: Initial Schema
-- Production-ready database schema for fraud detection and user management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (enhanced from existing)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  resumes_used INTEGER DEFAULT 0,
  resumes_remaining INTEGER DEFAULT 1,
  privilege_level VARCHAR(20) DEFAULT 'free',
  last_ip INET,
  user_agent TEXT,
  template_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_resume_date TIMESTAMP WITH TIME ZONE
);

-- Bad emails tracking for fraud detection
CREATE TABLE bad_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  ip_addresses INET[] DEFAULT '{}',
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'monitoring',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IP tracking for abuse detection
CREATE TABLE ip_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL,
  email_count INTEGER DEFAULT 1,
  last_email VARCHAR(255),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  country_code VARCHAR(2),
  status VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chargeback blacklist for zero-tolerance policy
CREATE TABLE chargeback_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  stripe_payment_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  chargeback_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount_cents INTEGER,
  permanent_ban BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing analytics for business intelligence
CREATE TABLE processing_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  template_selected VARCHAR(50),
  pricing_tier VARCHAR(20),
  revenue_amount DECIMAL(10,2),
  processing_time_seconds INTEGER,
  ai_model_used VARCHAR(50) DEFAULT 'claude-3-5-sonnet',
  success BOOLEAN DEFAULT true,
  error_code VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resume processing jobs for async handling
CREATE TABLE resume_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  template VARCHAR(50) NOT NULL,
  resume_content TEXT NOT NULL,
  job_description TEXT NOT NULL,
  file_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  result_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_bad_emails_email ON bad_emails(email);
CREATE INDEX idx_bad_emails_status ON bad_emails(status);
CREATE INDEX idx_ip_tracking_ip ON ip_tracking(ip_address);
CREATE INDEX idx_ip_tracking_status ON ip_tracking(status);
CREATE INDEX idx_chargeback_email ON chargeback_blacklist(email);
CREATE INDEX idx_chargeback_ip ON chargeback_blacklist(ip_address);
CREATE INDEX idx_analytics_email ON processing_analytics(email);
CREATE INDEX idx_analytics_created_at ON processing_analytics(created_at);
CREATE INDEX idx_analytics_template ON processing_analytics(template_selected);
CREATE INDEX idx_resume_jobs_status ON resume_jobs(status);
CREATE INDEX idx_resume_jobs_email ON resume_jobs(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can access all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all analytics" ON processing_analytics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all jobs" ON resume_jobs
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;