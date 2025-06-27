-- Resume Vita Database Schema Migration
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    account_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    resumes_generated INTEGER NOT NULL DEFAULT 0,
    free_resumes_used INTEGER NOT NULL DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flagged_reason TEXT,
    ip_address INET NOT NULL,
    country VARCHAR(100),
    device VARCHAR(100) NOT NULL,
    browser VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Whitelist Entries Table
CREATE TABLE IF NOT EXISTS whitelist_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'domain', 'ip_range')),
    value VARCHAR(255) NOT NULL,
    privilege JSONB NOT NULL DEFAULT '{"free_resumes": 1}',
    account_type VARCHAR(50) NOT NULL,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(type, value)
);

-- Abuse Patterns Table
CREATE TABLE IF NOT EXISTS abuse_patterns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('rapid_requests', 'email_pattern', 'ip_suspicious', 'device_fingerprint')),
    pattern_value VARCHAR(255) NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    occurrences INTEGER NOT NULL DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(pattern_type, pattern_value)
);

-- Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_account_type ON user_sessions(account_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_flagged ON user_sessions(flagged);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_address ON user_sessions(ip_address);

CREATE INDEX IF NOT EXISTS idx_whitelist_entries_type_value ON whitelist_entries(type, value);
CREATE INDEX IF NOT EXISTS idx_whitelist_entries_active ON whitelist_entries(active);
CREATE INDEX IF NOT EXISTS idx_whitelist_entries_account_type ON whitelist_entries(account_type);

CREATE INDEX IF NOT EXISTS idx_abuse_patterns_type_value ON abuse_patterns(pattern_type, pattern_value);
CREATE INDEX IF NOT EXISTS idx_abuse_patterns_severity ON abuse_patterns(severity);
CREATE INDEX IF NOT EXISTS idx_abuse_patterns_last_seen ON abuse_patterns(last_seen);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Insert predefined whitelist entries
INSERT INTO whitelist_entries (type, value, privilege, account_type, notes, active) VALUES
('email', 'adam@example.com', '{"free_resumes": "unlimited", "premium_access": true}', 'admin', 'Admin - Full access', true),
('email', 'jessica@example.com', '{"free_resumes": "unlimited", "premium_access": true}', 'admin', 'Admin - Full access', true),
('domain', 'mikeroweworks.org', '{"free_resumes": 50, "discount_percent": 100}', 'partner', 'Mike Rowe Foundation - Educational partnership', true),
('domain', 'eku.edu', '{"free_resumes": 10, "discount_percent": 50}', 'partner', 'EKU Alumni - Educational discount', true),
('email', 'beta@resumevita.io', '{"free_resumes": 100, "premium_access": true}', 'beta', 'Beta testing account', true)
ON CONFLICT (type, value) DO NOTHING;

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whitelist_entries_updated_at BEFORE UPDATE ON whitelist_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_abuse_patterns_updated_at BEFORE UPDATE ON abuse_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FIXED RLS POLICIES - Allow anon role access for application
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anon role (which your app uses)
CREATE POLICY "Enable all operations for anon" ON user_sessions FOR ALL TO anon USING (true);
CREATE POLICY "Enable select for anon on whitelist" ON whitelist_entries FOR SELECT TO anon USING (true);
CREATE POLICY "Enable insert for anon on abuse patterns" ON abuse_patterns FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Enable all operations for service role" ON admin_sessions FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO anon;
GRANT SELECT ON whitelist_entries TO anon;
GRANT INSERT ON abuse_patterns TO anon;

-- Log completion
SELECT 'Resume Vita database migration completed successfully!' as result;