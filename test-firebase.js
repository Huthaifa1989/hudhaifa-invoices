#!/usr/bin/env node

// Simple Firebase connection test
const admin = require('firebase-admin');

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.FIREBASE_PROJECT_ID = 'sample-firebase-ai-app-c6d3a';

try {
  console.log('🔧 Initializing Firebase Admin SDK...');
  
  // Load service account
  const serviceAccount = require('./hudhaifa-invoices/config/firebase-admin-key.json');
  console.log('✅ Service account loaded:', serviceAccount.client_email);
  
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  
  // Get Firestore
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  
  // Test connection
  console.log('🔍 Testing connection to invoices collection...');
  db.collection('invoices').limit(1).get()
    .then(snapshot => {
      console.log(`✅ Success! Found ${snapshot.size} documents`);
      if (snapshot.size > 0) {
        const doc = snapshot.docs[0];
        console.log('📄 Sample document:', doc.id);
      }
    })
    .catch(error => {
      console.error('❌ Error accessing Firestore:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
    });
    
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  console.error('Stack:', error.stack);
}
