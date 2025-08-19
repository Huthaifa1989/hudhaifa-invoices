const admin = require('firebase-admin');
const logger = require('./logger');

let db = null;

try {
  // Initialize Firebase Admin SDK
  // In production (Cloud Run), it will use default credentials
  // In development, you can use service account key
  if (process.env.NODE_ENV === 'production') {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } else {
    // For development, try service account key first, then default credentials
    try {
      const serviceAccount = require('../../hudhaifa-invoices/config/firebase-admin-key.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
      });
      logger.info('Firebase initialized with service account key');
    } catch (keyError) {
      // Fallback to default credentials
      try {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        logger.info('Firebase initialized with default credentials');
      } catch (error) {
        logger.error('Failed to initialize Firebase with both service account key and default credentials', { error: error.message });
        throw error;
      }
    }
  }

  db = admin.firestore();
  
  // Configure Firestore settings
  db.settings({
    ignoreUndefinedProperties: true,
    timestampsInSnapshots: true
  });

  logger.info('Firebase Admin SDK initialized successfully', {
    projectId: process.env.FIREBASE_PROJECT_ID
  });

} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK', {
    error: error.message,
    stack: error.stack
  });
  throw error;
}

// Helper function to get Firestore instance
const getFirestore = () => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  return db;
};

// Helper function to get collection reference
const getCollection = (collectionName) => {
  return getFirestore().collection(collectionName);
};

// Helper function to get document reference
const getDocument = (collectionName, docId) => {
  return getFirestore().collection(collectionName).doc(docId);
};

// Helper function to create a batch
const createBatch = () => {
  return getFirestore().batch();
};

module.exports = {
  admin,
  db: getFirestore(),
  getFirestore,
  getCollection,
  getDocument,
  createBatch
};
