-- Resume Storage and Intelligence Pipeline Migration - FIXED VERSION
-- Run this in Supabase SQL Editor

-- Enable storage extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Resume files table - stores original uploads
CREATE TABLE IF NOT EXISTS resume_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}' -- File metadata, processing flags, etc.
);

-- Resume processing jobs - tracks the AI processing pipeline
CREATE TABLE IF NOT EXISTS resume_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_file_id UUID REFERENCES resume_files(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  job_description TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  processing_metadata JSONB DEFAULT '{}' -- Claude API calls, costs, timing, etc.
);

-- Resume intelligence data - the gold mine for market analysis
CREATE TABLE IF NOT EXISTS resume_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_job_id UUID REFERENCES resume_processing_jobs(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Original data extraction
  original_text TEXT, -- Extracted from PDF/DOCX
  image_path TEXT, -- Screenshot/image stored in Supabase Storage
  
  -- Optimized results
  optimized_resume_text TEXT NOT NULL, -- Claude's enhanced version
  optimized_pdf_path TEXT, -- Generated PDF in Supabase Storage
  
  -- Market intelligence data
  extracted_skills JSONB DEFAULT '[]', -- Array of skills found
  job_titles JSONB DEFAULT '[]', -- Job titles/roles
  companies JSONB DEFAULT '[]', -- Companies worked at
  technologies JSONB DEFAULT '[]', -- Tech stack/tools
  keywords JSONB DEFAULT '[]', -- All keywords for analysis
  experience_years INTEGER, -- Calculated experience
  education_level TEXT, -- Degree level
  industry_sectors JSONB DEFAULT '[]', -- Industry classifications
  
  -- Job matching data
  job_description_keywords JSONB DEFAULT '[]', -- Keywords from job posting
  match_score DECIMAL(5,2), -- AI-calculated match percentage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email delivery tracking
CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_job_id UUID REFERENCES resume_processing_jobs(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  email_status TEXT DEFAULT 'pending', -- pending, sent, failed, bounced
  email_provider_id TEXT, -- Resend email ID
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  email_metadata JSONB DEFAULT '{}'
);

-- Market intelligence analytics (aggregated data for business insights)
CREATE TABLE IF NOT EXISTS market_intelligence_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_period DATE NOT NULL, -- Daily aggregation
  
  -- Volume metrics
  total_resumes_processed INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  template_usage JSONB DEFAULT '{}', -- Template popularity
  
  -- Skill market data
  top_skills JSONB DEFAULT '[]', -- Most common skills
  emerging_skills JSONB DEFAULT '[]', -- Trending skills
  skill_demand_changes JSONB DEFAULT '{}', -- Skill frequency changes
  
  -- Job market insights
  popular_job_titles JSONB DEFAULT '[]',
  salary_ranges JSONB DEFAULT '{}',
  industry_trends JSONB DEFAULT '{}',
  location_insights JSONB DEFAULT '{}',
  
  -- Business metrics
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  conversion_rates JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(date_period)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_files_user_email ON resume_files(user_email);
CREATE INDEX IF NOT EXISTS idx_resume_files_upload_timestamp ON resume_files(upload_timestamp);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON resume_processing_jobs(processing_status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_email ON resume_processing_jobs(user_email);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_template ON resume_processing_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_user_email ON resume_intelligence(user_email);
CREATE INDEX IF NOT EXISTS idx_intelligence_created_at ON resume_intelligence(created_at);
CREATE INDEX IF NOT EXISTS idx_intelligence_skills ON resume_intelligence USING gin(extracted_skills);
CREATE INDEX IF NOT EXISTS idx_intelligence_keywords ON resume_intelligence USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON email_deliveries(email_status);
CREATE INDEX IF NOT EXISTS idx_analytics_date_period ON market_intelligence_analytics(date_period);

-- RLS Policies for security
ALTER TABLE resume_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence_analytics ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own data
CREATE POLICY "Users can access their resume files" ON resume_files
  FOR ALL USING (user_email = current_setting('app.user_email', true));

CREATE POLICY "Users can access their processing jobs" ON resume_processing_jobs
  FOR ALL USING (user_email = current_setting('app.user_email', true));

CREATE POLICY "Users can access their intelligence data" ON resume_intelligence
  FOR ALL USING (user_email = current_setting('app.user_email', true));

CREATE POLICY "Users can access their email deliveries" ON email_deliveries
  FOR ALL USING (user_email = current_setting('app.user_email', true));

-- Admin access for analytics - FIXED to use correct column name
CREATE POLICY "Admins can access analytics" ON market_intelligence_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_sessions 
      WHERE email = current_setting('app.user_email', true) 
      AND whitelist_status = 'whitelisted'
    )
  );