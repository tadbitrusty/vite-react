-- Temporarily disable RLS for testing the storage pipeline
-- Run this in Supabase SQL Editor

ALTER TABLE resume_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE resume_processing_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE resume_intelligence DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence_analytics DISABLE ROW LEVEL SECURITY;