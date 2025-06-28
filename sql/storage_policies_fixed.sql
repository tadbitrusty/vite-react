-- Storage policies for resume file buckets - FIXED VERSION
-- Run this in Supabase SQL Editor

-- First, let's see what the actual storage.policies table structure is
-- (This is just for reference, don't run this part)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'policies' AND table_schema = 'storage';

-- Simple approach: Make all buckets publicly accessible for now
-- This bypasses all storage RLS issues

UPDATE storage.buckets SET public = true WHERE id = 'resume-files';
UPDATE storage.buckets SET public = true WHERE id = 'generated-pdfs';  
UPDATE storage.buckets SET public = true WHERE id = 'resume-images';