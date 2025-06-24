/**
 * Simple debug test endpoint to verify JSON responses work
 */

module.exports = async function handler(req, res) {
  try {
    // Ensure JSON response headers are set first
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed - only POST requests accepted',
        error_code: 'METHOD_NOT_ALLOWED',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Debug test endpoint working',
      timestamp: new Date().toISOString(),
      method: req.method,
      headers_received: Object.keys(req.headers)
    });
    
  } catch (error) {
    // Ultimate fallback
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: 'Debug test endpoint error: ' + error.message,
      error_code: 'DEBUG_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};