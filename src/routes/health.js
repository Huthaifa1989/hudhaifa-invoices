const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { healthLimiter } = require('../middleware/rate-limiter');
const { asyncHandler } = require('../middleware/error-handler');
const syncService = require('../services/sync-service');

// Basic health check
router.get('/', healthLimiter, asyncHandler(async (req, res) => {
  logger.debug('Basic health check requested', { requestId: req.id });
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.0.0'
  });
}));

// Detailed health check
router.get('/detailed', healthLimiter, asyncHandler(async (req, res) => {
  logger.debug('Detailed health check requested', { requestId: req.id });
  
  const startTime = Date.now();
  
  try {
    // Check Firebase connection
    const { getFirestore } = require('../config/firebase');
    const db = getFirestore();
    const firebaseHealth = await db.collection('meta').doc('health').get();
    
    // Check Google APIs
    const { testApiConnection } = require('../config/google-apis');
    const apiHealth = await testApiConnection();
    
    // Check sync service
    const syncHealth = syncService.getSyncStatus();
    
    const duration = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
      responseTime: `${duration}ms`,
      services: {
        firebase: {
          status: 'connected',
          projectId: process.env.FIREBASE_PROJECT_ID
        },
        gmail: {
          status: 'connected',
          email: apiHealth.gmail
        },
        drive: {
          status: 'connected',
          email: apiHealth.drive
        },
        sync: {
          status: syncHealth.isRunning ? 'running' : 'stopped',
          lastSync: syncHealth.lastSyncTime,
          hasInterval: syncHealth.hasInterval
        }
      },
      system: {
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Detailed health check failed', { 
      requestId: req.id, 
      error: error.message,
      duration: `${duration}ms`
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${duration}ms`,
      error: error.message
    });
  }
}));

// Kubernetes readiness probe
router.get('/ready', healthLimiter, asyncHandler(async (req, res) => {
  logger.debug('Readiness probe requested', { requestId: req.id });
  
  try {
    // Check if all critical services are available
    const { getFirestore } = require('../config/firebase');
    const db = getFirestore();
    await db.collection('meta').doc('health').get();
    
    const { testApiConnection } = require('../config/google-apis');
    await testApiConnection();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness probe failed', { 
      requestId: req.id, 
      error: error.message 
    });
    
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}));

// Kubernetes liveness probe
router.get('/live', healthLimiter, asyncHandler(async (req, res) => {
  logger.debug('Liveness probe requested', { requestId: req.id });
  
  // Simple check to ensure the process is alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));

// Sync service health check
router.get('/sync', healthLimiter, asyncHandler(async (req, res) => {
  logger.debug('Sync health check requested', { requestId: req.id });
  
  try {
    const health = await syncService.healthCheck();
    res.json(health);
  } catch (error) {
    logger.error('Sync health check failed', { 
      requestId: req.id, 
      error: error.message 
    });
    
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

module.exports = router;
