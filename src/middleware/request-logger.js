const logger = require('../config/logger');
const crypto = require('crypto');

// Generate request ID
const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = generateRequestId();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  
  // Record start time
  const startTime = Date.now();
  
  // Log request start
  logger.info('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    referer: req.get('Referer')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log request completion
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    logger.info('Request performance', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      memoryUsage: process.memoryUsage()
    });
  });

  next();
};

module.exports = {
  requestLogger,
  performanceMonitor,
  generateRequestId
};
