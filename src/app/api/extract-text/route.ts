import { NextRequest, NextResponse } from 'next/server';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    console.log('[EXTRACT_TEXT] Processing file upload');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log(`[EXTRACT_TEXT] File received: ${file.name}, type: ${file.type}, size: ${file.size}`);
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';
    
    // Determine file type and extract text accordingly
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      console.log('[EXTRACT_TEXT] Processing PDF file');
      
      try {
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
        console.log(`[EXTRACT_TEXT] PDF extracted ${extractedText.length} characters`);
        
        // Log first 200 chars to verify personal info extraction
        console.log(`[EXTRACT_TEXT] PDF preview: ${extractedText.substring(0, 200)}...`);
        
      } catch (pdfError) {
        console.error('[EXTRACT_TEXT] PDF parsing error:', pdfError);
        return NextResponse.json(
          { success: false, message: 'Failed to parse PDF file. Please ensure it contains selectable text.' },
          { status: 400 }
        );
      }
      
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    ) {
      console.log('[EXTRACT_TEXT] Processing DOCX file');
      
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
        console.log(`[EXTRACT_TEXT] DOCX extracted ${extractedText.length} characters`);
        
        if (result.messages.length > 0) {
          console.log('[EXTRACT_TEXT] DOCX extraction warnings:', result.messages);
        }
        
      } catch (docxError) {
        console.error('[EXTRACT_TEXT] DOCX parsing error:', docxError);
        return NextResponse.json(
          { success: false, message: 'Failed to parse DOCX file' },
          { status: 400 }
        );
      }
      
    } else if (
      file.type === 'application/msword' ||
      file.name.toLowerCase().endsWith('.doc')
    ) {
      console.log('[EXTRACT_TEXT] DOC files not supported - please convert to DOCX or PDF');
      return NextResponse.json(
        { success: false, message: 'DOC files are not supported. Please convert to DOCX or PDF format.' },
        { status: 400 }
      );
      
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      console.log('[EXTRACT_TEXT] Processing TXT file');
      extractedText = new TextDecoder().decode(fileBuffer);
      console.log(`[EXTRACT_TEXT] TXT extracted ${extractedText.length} characters`);
      
    } else {
      console.log(`[EXTRACT_TEXT] Unsupported file type: ${file.type}`);
      return NextResponse.json(
        { success: false, message: `Unsupported file type: ${file.type}. Please upload PDF, DOCX, or TXT files.` },
        { status: 400 }
      );
    }
    
    // Validate that we extracted meaningful content
    if (!extractedText || extractedText.trim().length < 50) {
      console.log('[EXTRACT_TEXT] Insufficient text extracted');
      return NextResponse.json(
        { success: false, message: 'Unable to extract sufficient text from file. Please ensure the file contains readable text.' },
        { status: 400 }
      );
    }
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive blank lines
      .trim();
    
    console.log(`[EXTRACT_TEXT] Successfully extracted ${cleanedText.length} characters`);
    console.log(`[EXTRACT_TEXT] Text preview: ${cleanedText.substring(0, 300)}...`);
    
    return NextResponse.json({
      success: true,
      text: cleanedText,
      metadata: {
        originalFileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extractedLength: cleanedText.length
      }
    });
    
  } catch (error) {
    console.error('[EXTRACT_TEXT] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process file. Please try again.' },
      { status: 500 }
    );
  }
}