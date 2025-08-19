const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');
const { uploadLimiter } = require('../middleware/rate-limiter');
const { asyncHandler } = require('../middleware/error-handler');
const { body, query, validationResult } = require('express-validator');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${originalName}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: parseInt(process.env.MAX_FILES_PER_REQUEST) || 5
  }
});

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

// Upload files
router.post('/', uploadLimiter, upload.array('files', parseInt(process.env.MAX_FILES_PER_REQUEST) || 5), asyncHandler(async (req, res) => {
  logger.info('File upload requested', { 
    requestId: req.id,
    fileCount: req.files ? req.files.length : 0
  });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: {
        code: 'NO_FILES_UPLOADED',
        message: 'No files were uploaded',
        requestId: req.id
      }
    });
  }

  const uploadedFiles = req.files.map(file => ({
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    url: `/uploads/${file.filename}`,
    uploadedAt: new Date().toISOString()
  }));

  logger.info('Files uploaded successfully', {
    requestId: req.id,
    files: uploadedFiles.map(f => f.filename)
  });

  res.json({
    success: true,
    message: `${uploadedFiles.length} file(s) uploaded successfully`,
    files: uploadedFiles,
    timestamp: new Date().toISOString()
  });
}));

// List uploaded files
router.get('/', uploadLimiter, asyncHandler(async (req, res) => {
  logger.debug('List uploaded files requested', { requestId: req.id });

  try {
    const files = fs.readdirSync(uploadsDir);
    const fileList = [];

    for (const filename of files) {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      fileList.push({
        name: filename,
        url: `/uploads/${filename}`,
        size: stats.size,
        uploadedAt: stats.mtime,
        modifiedAt: stats.mtime
      });
    }

    // Sort by upload date (newest first)
    fileList.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      files: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to list uploaded files', { 
      requestId: req.id, 
      error: error.message 
    });
    
    res.status(500).json({
      error: {
        code: 'LIST_FILES_ERROR',
        message: 'Failed to list uploaded files',
        requestId: req.id
      }
    });
  }
}));

// Get file information
router.get('/:filename/info', uploadLimiter, [
  query('filename').notEmpty().withMessage('Filename is required')
], validateRequest, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  
  logger.debug('Get file info requested', { 
    requestId: req.id, 
    filename 
  });

  try {
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          requestId: req.id
        }
      });
    }

    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      file: {
        name: filename,
        url: `/uploads/${filename}`,
        size: stats.size,
        uploadedAt: stats.mtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get file info', { 
      requestId: req.id, 
      filename,
      error: error.message 
    });
    
    res.status(500).json({
      error: {
        code: 'GET_FILE_INFO_ERROR',
        message: 'Failed to get file information',
        requestId: req.id
      }
    });
  }
}));

// Delete uploaded file
router.delete('/:filename', uploadLimiter, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  
  logger.info('Delete file requested', { 
    requestId: req.id, 
    filename 
  });

  try {
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          requestId: req.id
        }
      });
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({
        error: {
          code: 'NOT_A_FILE',
          message: 'Path is not a file',
          requestId: req.id
        }
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);
    
    logger.info('File deleted successfully', { 
      requestId: req.id, 
      filename 
    });

    res.json({
      success: true,
      message: 'File deleted successfully',
      filename,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to delete file', { 
      requestId: req.id, 
      filename,
      error: error.message 
    });
    
    res.status(500).json({
      error: {
        code: 'DELETE_FILE_ERROR',
        message: 'Failed to delete file',
        requestId: req.id
      }
    });
  }
}));

// Download file
router.get('/:filename', uploadLimiter, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  
  logger.debug('Download file requested', { 
    requestId: req.id, 
    filename 
  });

  try {
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          requestId: req.id
        }
      });
    }

    // Check if it's a file
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({
        error: {
          code: 'NOT_A_FILE',
          message: 'Path is not a file',
          requestId: req.id
        }
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    logger.info('File download started', { 
      requestId: req.id, 
      filename,
      size: stats.size
    });
  } catch (error) {
    logger.error('Failed to download file', { 
      requestId: req.id, 
      filename,
      error: error.message 
    });
    
    res.status(500).json({
      error: {
        code: 'DOWNLOAD_FILE_ERROR',
        message: 'Failed to download file',
        requestId: req.id
      }
    });
  }
}));

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer error', { 
      requestId: req.id, 
      error: error.message,
      code: error.code
    });

    let statusCode = 400;
    let errorCode = 'UPLOAD_ERROR';
    let message = 'File upload error';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 413;
        errorCode = 'FILE_TOO_LARGE';
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        statusCode = 413;
        errorCode = 'TOO_MANY_FILES';
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        statusCode = 400;
        errorCode = 'UNEXPECTED_FILE';
        message = 'Unexpected file field';
        break;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message: message,
        requestId: req.id
      }
    });
  }

  next(error);
});

module.exports = router;
