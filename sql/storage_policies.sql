-- Storage policies for resume file buckets
-- Run this in Supabase SQL Editor

-- Allow service role to upload to resume-files bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check, command)
VALUES (
  'service-role-upload-resume-files',
  'resume-files',
  'Service role can upload resume files',
  'true',
  'true',
  'INSERT'
) ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload to generated-pdfs bucket  
INSERT INTO storage.policies (id, bucket_id, name, definition, check, command)
VALUES (
  'service-role-upload-generated-pdfs',
  'generated-pdfs', 
  'Service role can upload generated PDFs',
  'true',
  'true',
  'INSERT'
) ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload to resume-images bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check, command)
VALUES (
  'service-role-upload-resume-images',
  'resume-images',
  'Service role can upload resume images', 
  'true',
  'true',
  'INSERT'
) ON CONFLICT (id) DO NOTHING;

-- Allow service role to read from all buckets
INSERT INTO storage.policies (id, bucket_id, name, definition, check, command)
VALUES (
  'service-role-read-all',
  'resume-files',
  'Service role can read resume files',
  'true',
  'true', 
  'SELECT'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.policies (id, bucket_id, name, definition, check, command)
VALUES (
  'service-role-read-pdfs',
  'generated-pdfs',
  'Service role can read generated PDFs',
  'true',
  'true',
  'SELECT'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.policies (id, bucket_id, name, definition, check, command)
VALUES (
  'service-role-read-images',
  'resume-images',
  'Service role can read resume images',
  'true', 
  'true',
  'SELECT'
) ON CONFLICT (id) DO NOTHING;