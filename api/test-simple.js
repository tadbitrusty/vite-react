/**
 * Ultra-simple test endpoint to verify JSON responses
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
      message: 'Simple test endpoint working - ready for POST requests',
      timestamp: new Date().toISOString(),
      method: req.method
    });
    
  } catch (error) {
    // Ultimate fallback
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message,
      error_code: 'TEST_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};