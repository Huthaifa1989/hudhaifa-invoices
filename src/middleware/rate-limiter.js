const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      requestId: req.id,
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Stricter rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 upload requests per windowMs
  message: {
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests from this IP, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      requestId: req.id,
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many upload requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Stricter rate limiter for sync operations
const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 sync requests per windowMs
  message: {
    error: {
      code: 'SYNC_RATE_LIMIT_EXCEEDED',
      message: 'Too many sync requests from this IP, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Sync rate limit exceeded', {
      requestId: req.id,
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: {
        code: 'SYNC_RATE_LIMIT_EXCEEDED',
        message: 'Too many sync requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Health check rate limiter (more lenient)
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 health check requests per minute
  message: {
    error: {
      code: 'HEALTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many health check requests from this IP, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Health check rate limit exceeded', {
      requestId: req.id,
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: {
        code: 'HEALTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many health check requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = {
  apiLimiter,
  uploadLimiter,
  syncLimiter,
  healthLimiter
};
