const logger = require('../config/logger');
const { syncGmail, syncDrive, checkAndClearQuotaIfNeeded } = require('./invoice-service');

// Sync service for background operations
class SyncService {
  constructor() {
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
  }

  // Start background sync
  async startBackgroundSync() {
    if (this.isRunning) {
      logger.warn('Background sync is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting background sync service');

    try {
      // Initial sync
      await this.performSync();
      
      // Set up periodic sync (every 30 minutes)
      this.syncInterval = setInterval(async () => {
        await this.performSync();
      }, 30 * 60 * 1000);

      logger.info('Background sync service started successfully');
    } catch (error) {
      logger.error('Failed to start background sync service', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  // Stop background sync
  stopBackgroundSync() {
    if (!this.isRunning) {
      logger.warn('Background sync is not running');
      return;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    logger.info('Background sync service stopped');
  }

  // Perform sync operation
  async performSync() {
    if (!this.isRunning) {
      logger.debug('Sync service not running, skipping sync');
      return;
    }

    const startTime = Date.now();
    logger.info('Starting sync operation');

    try {
      // Check quota first
      const quotaCleared = await checkAndClearQuotaIfNeeded();
      if (quotaCleared) {
        logger.info('Database quota cleared, performing full sync');
      }

      // Perform Gmail sync
      const gmailResult = await syncGmail({ forceFull: quotaCleared });
      logger.info('Gmail sync completed', gmailResult);

      // Perform Drive sync
      const driveResult = await syncDrive();
      logger.info('Drive sync completed', driveResult);

      this.lastSyncTime = new Date();
      
      const duration = Date.now() - startTime;
      logger.info('Sync operation completed successfully', {
        duration: `${duration}ms`,
        gmailFetched: gmailResult.fetched,
        driveFetched: driveResult.fetched,
        quotaCleared
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Sync operation failed', {
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Force sync (ignores cooldown)
  async forceSync() {
    logger.info('Force sync requested');
    
    try {
      const startTime = Date.now();
      
      // Force full sync
      const gmailResult = await syncGmail({ forceFull: true });
      const driveResult = await syncDrive();
      
      this.lastSyncTime = new Date();
      
      const duration = Date.now() - startTime;
      logger.info('Force sync completed successfully', {
        duration: `${duration}ms`,
        gmailFetched: gmailResult.fetched,
        driveFetched: driveResult.fetched
      });

      return {
        success: true,
        duration: `${duration}ms`,
        gmail: gmailResult,
        drive: driveResult
      };
    } catch (error) {
      logger.error('Force sync failed', { error: error.message });
      throw error;
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      hasInterval: !!this.syncInterval
    };
  }

  // Health check for sync service
  async healthCheck() {
    try {
      const status = this.getSyncStatus();
      
      // Test basic connectivity
      const { testApiConnection } = require('../config/google-apis');
      const apiStatus = await testApiConnection();
      
      return {
        status: 'healthy',
        syncService: status,
        apis: apiStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Sync service health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const syncService = new SyncService();

module.exports = syncService;
