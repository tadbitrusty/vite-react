# Enhanced File Detection & Conversion Strategy

## Current State
- Basic MIME type + extension checking
- Works for most cases but could be more robust

## Recommended Enhancements

### 1. File Signature Detection
```javascript
function detectFileType(buffer) {
  const header = buffer.slice(0, 8);
  
  // PDF signature: %PDF
  if (header.slice(0, 4).toString() === '%PDF') return 'pdf';
  
  // DOCX signature: PK (ZIP-based)
  if (header[0] === 0x50 && header[1] === 0x4B) {
    // Further check for DOCX content
    return 'docx';
  }
  
  // Check for text content
  if (isTextFile(buffer)) return 'text';
  
  return 'unknown';
}
```

### 2. PDF Content Validation
```javascript
// Check if PDF contains extractable text
const pdfData = await pdfParse(fileBuffer);
if (pdfData.text.trim().length < 50) {
  return {
    success: false,
    message: 'PDF appears to be image-based. Please use a PDF with selectable text or convert to text format.',
    suggestion: 'Try using OCR software or recreating the resume in Word/Google Docs'
  };
}
```

### 3. Conversion Recommendations
```javascript
const conversionAdvice = {
  'image-pdf': 'Convert using Adobe Acrobat OCR or Google Drive',
  'doc': 'Save as DOCX format in Microsoft Word',
  'pages': 'Export as PDF or DOCX from Apple Pages',
  'unsupported': 'Please convert to PDF, DOCX, or TXT format'
};
```

## Implementation Priority
1. **High**: File signature detection (prevents spoofed extensions)
2. **Medium**: PDF text content validation (catches image-only PDFs)
3. **Low**: Conversion suggestions (nice UX improvement)

## Quick Win
Add this check after PDF parsing:
```javascript
if (extractedText.trim().length < 100) {
  throw new Error('PDF contains insufficient text. Please ensure your resume has selectable text, not just images.');
}
```