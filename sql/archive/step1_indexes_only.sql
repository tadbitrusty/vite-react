-- =====================================================
-- STEP 1: PERFORMANCE INDEXES ONLY
-- Run this FIRST, then run step2_tables_and_features.sql
-- =====================================================

-- User eligibility optimization (runs on every upload)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_eligibility 
ON user_sessions(email, free_resumes_used, account_type) 
WHERE flagged = false;

-- Processing pipeline optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_jobs_status_email 
ON resume_processing_jobs(processing_status, user_email);

-- Resume ranking and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_match_score 
ON resume_intelligence(match_score) WHERE match_score IS NOT NULL;

-- Storage cleanup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resume_files_storage_path 
ON resume_files(storage_path);

-- Admin dashboard optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_admin_dashboard 
ON user_sessions(flagged, account_type, last_activity);

-- Email delivery tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_deliveries_status_date
ON email_deliveries(email_status, sent_at);

-- Comprehensive skills/tech search (for market analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_comprehensive_search 
ON resume_intelligence USING gin((extracted_skills || technologies || keywords));

-- Job market analytics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_market_analytics 
ON resume_intelligence USING gin((job_titles || companies || industry_sectors));

-- Keyword trend analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_keyword_trends
ON resume_intelligence USING gin((keywords || job_description_keywords));

-- Success message
SELECT 'PERFORMANCE INDEXES CREATED - Now run step2_tables_and_features.sql' as status;