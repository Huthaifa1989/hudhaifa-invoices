#!/usr/bin/env node

const admin = require('firebase-admin');

console.log('🔍 Verifying new service account key...\n');

try {
  // Load the service account key
  const serviceAccount = require('./hudhaifa-invoices/config/firebase-admin-key.json');
  
  console.log('✅ Service account key loaded successfully');
  console.log(`📧 Client Email: ${serviceAccount.client_email}`);
  console.log(`🏢 Project ID: ${serviceAccount.project_id}`);
  console.log(`🔑 Private Key: ${serviceAccount.private_key ? 'Present' : 'Missing'}`);
  
  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  
  // Test Firestore connection
  const db = admin.firestore();
  console.log('🔄 Testing Firestore connection...');
  
  // Try to get a document (this will test the connection)
  db.collection('test').doc('test').get()
    .then(() => {
      console.log('✅ Firestore connection successful!');
      process.exit(0);
    })
    .catch((error) => {
      if (error.code === 5) {
        console.log('✅ Firestore connection successful! (Document not found is expected)');
        process.exit(0);
      } else {
        console.error('❌ Firestore connection failed:', error.message);
        process.exit(1);
      }
    });
    
} catch (error) {
  console.error('❌ Failed to load or initialize service account:', error.message);
  process.exit(1);
}
