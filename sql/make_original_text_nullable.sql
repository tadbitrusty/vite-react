-- Make original_text nullable to support PDF vision processing
-- Run this in Supabase SQL Editor

-- Alter the column to allow NULL values
ALTER TABLE resume_intelligence ALTER COLUMN original_text DROP NOT NULL;

-- Add a comment to explain the logic
COMMENT ON COLUMN resume_intelligence.original_text IS 'Extracted text content. NULL for PDFs processed with vision (binary not stored), contains text for DOC/DOCX/TXT files';