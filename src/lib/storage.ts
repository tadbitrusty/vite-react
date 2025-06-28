import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create admin client that definitely uses service role
const getAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not found');
  }
  
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fileId?: string;
}

export interface ResumeFileRecord {
  id: string;
  user_email: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  upload_timestamp: string;
  metadata: any;
}

export interface ProcessingJobRecord {
  id: string;
  resume_file_id: string;
  user_email: string;
  job_description: string;
  template_id: string;
  template_name: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  processing_metadata: any;
}

export interface IntelligenceRecord {
  id: string;
  processing_job_id: string;
  user_email: string;
  original_text?: string;
  image_path?: string;
  optimized_resume_text: string;
  optimized_pdf_path?: string;
  extracted_skills: string[];
  job_titles: string[];
  companies: string[];
  technologies: string[];
  keywords: string[];
  experience_years?: number;
  education_level?: string;
  industry_sectors: string[];
  job_description_keywords: string[];
  match_score?: number;
}

/**
 * Upload resume file to Supabase Storage and create database record
 */
export async function uploadResumeFile(
  file: File,
  userEmail: string,
  fileContent: string
): Promise<FileUploadResult & { fileRecord?: ResumeFileRecord }> {
  try {
    console.log(`[STORAGE] Uploading resume file: ${file.name} for ${userEmail}`);
    console.log(`[STORAGE] Using Supabase key ending in: ...${supabaseKey.slice(-10)}`);
    console.log(`[STORAGE] Service role key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
    
    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `resumes/${userEmail}/${fileName}`;
    
    // Convert data URL to buffer for upload
    let buffer: Buffer;
    if (fileContent.startsWith('data:')) {
      const base64Data = fileContent.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(fileContent, 'binary');
    }
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resume-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[STORAGE] Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }
    
    console.log(`[STORAGE] File uploaded successfully: ${uploadData.path}`);
    
    // Create database record using admin client to bypass RLS
    const adminClient = getAdminClient();
    const { data: fileRecord, error: dbError } = await adminClient
      .from('resume_files')
      .insert({
        user_email: userEmail,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: uploadData.path,
        metadata: {
          upload_method: 'web_form',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
          file_content_preview: fileContent.substring(0, 100)
        }
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('[STORAGE] Database record creation error:', dbError);
      // Try to cleanup uploaded file
      await supabase.storage.from('resume-files').remove([uploadData.path]);
      return { success: false, error: dbError.message };
    }
    
    console.log(`[STORAGE] Database record created: ${fileRecord.id}`);
    
    return {
      success: true,
      filePath: uploadData.path,
      fileId: fileRecord.id,
      fileRecord: fileRecord as ResumeFileRecord
    };
    
  } catch (error) {
    console.error('[STORAGE] Upload process error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown upload error' 
    };
  }
}

/**
 * Create processing job record
 */
export async function createProcessingJob(
  resumeFileId: string,
  userEmail: string,
  jobDescription: string,
  templateId: string,
  templateName: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    console.log(`[STORAGE] Creating processing job for file: ${resumeFileId}`);
    
    const adminClient = getAdminClient();
    const { data: jobRecord, error } = await adminClient
      .from('resume_processing_jobs')
      .insert({
        resume_file_id: resumeFileId,
        user_email: userEmail,
        job_description: jobDescription,
        template_id: templateId,
        template_name: templateName,
        processing_status: 'pending',
        processing_metadata: {
          api_version: 'claude-3-5-sonnet-20241022',
          pipeline_version: '2.0'
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('[STORAGE] Processing job creation error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`[STORAGE] Processing job created: ${jobRecord.id}`);
    return { success: true, jobId: jobRecord.id };
    
  } catch (error) {
    console.error('[STORAGE] Processing job creation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown job creation error' 
    };
  }
}

/**
 * Update processing job status
 */
export async function updateProcessingJobStatus(
  jobId: string,
  status: ProcessingJobRecord['processing_status'],
  errorMessage?: string,
  metadata?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      processing_status: status,
      ...(status === 'completed' || status === 'failed' ? { completed_at: new Date().toISOString() } : {}),
      ...(errorMessage ? { error_message: errorMessage } : {}),
      ...(metadata ? { processing_metadata: metadata } : {})
    };
    
    const adminClient = getAdminClient();
    const { error } = await adminClient
      .from('resume_processing_jobs')
      .update(updateData)
      .eq('id', jobId);
    
    if (error) {
      console.error('[STORAGE] Job status update error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`[STORAGE] Job ${jobId} status updated to: ${status}`);
    return { success: true };
    
  } catch (error) {
    console.error('[STORAGE] Job status update error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown update error' 
    };
  }
}

/**
 * Store intelligence data - the market analysis goldmine
 */
export async function storeIntelligenceData(
  processingJobId: string,
  userEmail: string,
  data: Partial<IntelligenceRecord>
): Promise<{ success: boolean; intelligenceId?: string; error?: string }> {
  try {
    console.log(`[STORAGE] Storing intelligence data for job: ${processingJobId}`);
    
    const adminClient = getAdminClient();
    const { data: intelligenceRecord, error } = await adminClient
      .from('resume_intelligence')
      .insert({
        processing_job_id: processingJobId,
        user_email: userEmail,
        ...data
      })
      .select()
      .single();
    
    if (error) {
      console.error('[STORAGE] Intelligence data storage error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`[STORAGE] Intelligence data stored: ${intelligenceRecord.id}`);
    return { success: true, intelligenceId: intelligenceRecord.id };
    
  } catch (error) {
    console.error('[STORAGE] Intelligence data storage error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown storage error' 
    };
  }
}

/**
 * Upload generated PDF to storage
 */
export async function uploadGeneratedPDF(
  pdfBuffer: Buffer,
  fileName: string,
  userEmail: string
): Promise<FileUploadResult> {
  try {
    console.log(`[STORAGE] Uploading generated PDF: ${fileName}`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pdfFileName = `${timestamp}-${fileName}`;
    const filePath = `generated-pdfs/${userEmail}/${pdfFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-pdfs')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[STORAGE] PDF upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }
    
    console.log(`[STORAGE] PDF uploaded successfully: ${uploadData.path}`);
    return { success: true, filePath: uploadData.path };
    
  } catch (error) {
    console.error('[STORAGE] PDF upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown PDF upload error' 
    };
  }
}

/**
 * Get file URL from Supabase Storage
 */
export async function getFileUrl(bucket: string, filePath: string): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    return data?.signedUrl || null;
  } catch (error) {
    console.error('[STORAGE] Get file URL error:', error);
    return null;
  }
}