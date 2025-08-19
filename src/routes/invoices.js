const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { apiLimiter, syncLimiter } = require('../middleware/rate-limiter');
const { asyncHandler } = require('../middleware/error-handler');
const { body, query, validationResult } = require('express-validator');
const {
  getAllInvoices,
  getCategorizedInvoices,
  getInvoicesByType,
  getFuelInvoices,
  getInvoiceStats,
  maybeRefresh
} = require('../services/invoice-service');
const syncService = require('../services/sync-service');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: errors.array(),
        requestId: req.id
      }
    });
  }
  next();
};

// Get all invoices
router.get('/all', apiLimiter, [
  query('refresh').optional().isIn(['0', '1']).withMessage('Refresh must be 0 or 1')
], validateRequest, asyncHandler(async (req, res) => {
  const refresh = req.query.refresh === '1';
  
  logger.info('Get all invoices requested', { 
    requestId: req.id, 
    refresh 
  });

  const data = await getAllInvoices(refresh);
  
  res.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}));

// Get categorized invoices
router.get('/categorized', apiLimiter, [
  query('refresh').optional().isIn(['0', '1']).withMessage('Refresh must be 0 or 1')
], validateRequest, asyncHandler(async (req, res) => {
  const refresh = req.query.refresh === '1';
  
  logger.info('Get categorized invoices requested', { 
    requestId: req.id, 
    refresh 
  });

  const data = await getCategorizedInvoices(refresh);
  
  res.json({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  });
}));

// Get Wolt invoices
router.get('/wolt', apiLimiter, [
  query('refresh').optional().isIn(['0', '1']).withMessage('Refresh must be 0 or 1')
], validateRequest, asyncHandler(async (req, res) => {
  const refresh = req.query.refresh === '1';
  
  logger.info('Get Wolt invoices requested', { 
    requestId: req.id, 
    refresh 
  });

  const data = await getInvoicesByType('wolt', refresh, 'gmail');
  
  res.json({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  });
}));

// Get water invoices
router.get('/water', apiLimiter, [
  query('refresh').optional().isIn(['0', '1']).withMessage('Refresh must be 0 or 1')
], validateRequest, asyncHandler(async (req, res) => {
  const refresh = req.query.refresh === '1';
  
  logger.info('Get water invoices requested', { 
    requestId: req.id, 
    refresh 
  });

  const data = await getInvoicesByType('water', refresh, 'gmail');
  
  res.json({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  });
}));

// Get electricity invoices
router.get('/electricity', apiLimiter, [
  query('refresh').optional().isIn(['0', '1']).withMessage('Refresh must be 0 or 1')
], validateRequest, asyncHandler(async (req, res) => {
  const refresh = req.query.refresh === '1';
  
  logger.info('Get electricity invoices requested', { 
    requestId: req.id, 
    refresh 
  });

  const data = await getInvoicesByType('electric', refresh, 'gmail');
  
  res.json({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  });
}));

// Get arnona invoices
router.get('/arnona', apiLimiter, [
  query('refresh').optional().isIn(['0', '1']).withMessage('Refresh must be 0 or 1')
], validateRequest, asyncHandler(async (req, res) => {
  const refresh = req.query.refresh === '1';
  
  logger.info('Get arnona invoices requested', { 
    requestId: req.id, 
    refresh 
  });

  const data = await getInvoicesByType('arnona', refresh, 'gmail');
  
  res.json({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  });
}));

// Get fuel invoices with pagination
router.get('/fuel', apiLimiter, [
  query('refresh').optional().isIn(['0', '1']).withMessage('Refresh must be 0 or 1'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100')
], validateRequest, asyncHandler(async (req, res) => {
  const refresh = req.query.refresh === '1';
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '20', 10);
  
  logger.info('Get fuel invoices requested', { 
    requestId: req.id, 
    refresh,
    page,
    pageSize
  });

  const data = await getFuelInvoices(page, pageSize, refresh);
  
  res.json({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  });
}));

// Get invoice statistics
router.get('/stats', apiLimiter, asyncHandler(async (req, res) => {
  logger.info('Get invoice statistics requested', { requestId: req.id });

  const stats = await getInvoiceStats();
  
  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
}));

// Search invoices
router.get('/search', apiLimiter, [
  query('q').notEmpty().withMessage('Search query is required'),
  query('type').optional().isIn(['wolt', 'water', 'electric', 'arnona', 'gas', 'other']).withMessage('Invalid invoice type'),
  query('source').optional().isIn(['gmail', 'drive', 'manual']).withMessage('Invalid source'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], validateRequest, asyncHandler(async (req, res) => {
  const { q, type, source, limit = 50 } = req.query;
  
  logger.info('Search invoices requested', { 
    requestId: req.id, 
    query: q,
    type,
    source,
    limit
  });

  // Get all invoices and filter
  const allData = await getAllInvoices(false);
  let results = [];

  // Combine all invoices
  if (allData.gmail) {
    Object.values(allData.gmail).forEach(invoices => {
      results.push(...invoices.map(inv => ({ ...inv, source: 'gmail' })));
    });
  }
  
  if (allData.drive) {
    Object.values(allData.drive).forEach(invoices => {
      results.push(...invoices.map(inv => ({ ...inv, source: 'drive' })));
    });
  }

  // Apply filters
  if (type) {
    results = results.filter(inv => inv.type === type);
  }
  
  if (source) {
    results = results.filter(inv => inv.source === source);
  }

  // Search in text fields
  const searchTerm = q.toLowerCase();
  results = results.filter(inv => {
    const searchableText = [
      inv.subject || '',
      inv.from || '',
      inv.snippet || '',
      inv.name || ''
    ].join(' ').toLowerCase();
    
    return searchableText.includes(searchTerm);
  });

  // Sort by timestamp (newest first)
  results.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  // Apply limit
  results = results.slice(0, parseInt(limit));

  res.json({
    success: true,
    query: q,
    total: results.length,
    invoices: results,
    timestamp: new Date().toISOString()
  });
}));

// Force sync all sources
router.post('/sync', syncLimiter, asyncHandler(async (req, res) => {
  logger.info('Force sync requested', { requestId: req.id });

  try {
    const result = await syncService.forceSync();
    
    res.json({
      success: true,
      message: 'Sync completed successfully',
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Force sync failed', { 
      requestId: req.id, 
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// Get sync status
router.get('/sync/status', apiLimiter, asyncHandler(async (req, res) => {
  logger.debug('Get sync status requested', { requestId: req.id });

  const status = syncService.getSyncStatus();
  
  res.json({
    success: true,
    status,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;
