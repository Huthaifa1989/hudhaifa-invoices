const logger = require('../config/logger');

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  const requestId = req.id || 'unknown';
  
  // Log the error with request context
  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
  });

  // Determine error type and response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
    errorCode = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
    errorCode = 'NOT_FOUND';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too Many Requests';
    errorCode = 'RATE_LIMIT_EXCEEDED';
  } else if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'File Not Found';
    errorCode = 'FILE_NOT_FOUND';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File Too Large';
    errorCode = 'FILE_TOO_LARGE';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected File Field';
    errorCode = 'UNEXPECTED_FILE';
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    },
    ...(process.env.NODE_ENV === 'development' && {
      details: err.message,
      stack: err.stack
    })
  });
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  const requestId = req.id || 'unknown';
  
  logger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found',
      requestId: requestId,
      timestamp: new Date().toISOString()
    }
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
