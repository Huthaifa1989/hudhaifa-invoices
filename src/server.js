/************************************************************
 * Hudhaifa Invoices Backend — Professional v2.0
 * Complete rewrite with enterprise-grade features
 ************************************************************/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import configurations
const logger = require('./config/logger');

// Import middleware
const { requestLogger, performanceMonitor } = require('./middleware/request-logger');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { apiLimiter } = require('./middleware/rate-limiter');

// Import routes
const healthRoutes = require('./routes/health');
const invoiceRoutes = require('./routes/invoices');
const uploadRoutes = require('./routes/upload');

// Import services
const syncService = require('./services/sync-service');

// Create Express app
const app = express();

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Security middleware - relaxed for development
if (process.env.NODE_ENV === 'development') {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  }));
} else {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
}

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true
}));

// Compression middleware
app.use(compression({
  level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);
app.use(performanceMonitor);

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Static file serving with cache-busting for development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    next();
  });
}

// Static file serving - serve files from public directory
app.use('/', express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/health', healthRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/upload', uploadRoutes);

// Legacy API endpoints for backward compatibility
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Test endpoint to serve wolt.html directly
app.get('/test-wolt', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'wolt.html'));
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  syncService.stopBackgroundSync();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  syncService.stopBackgroundSync();
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: promise,
    reason: reason
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });

  // Start background sync service in production
  if (process.env.NODE_ENV === 'production') {
    syncService.startBackgroundSync().catch(error => {
      logger.error('Failed to start background sync service', { error: error.message });
    });
  }
});

// Export for testing
module.exports = { app, server };
