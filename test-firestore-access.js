#!/usr/bin/env node

const admin = require('firebase-admin');

console.log('🔍 Testing Firestore access...\n');

try {
  // Load the service account key
  const serviceAccount = require('./hudhaifa-invoices/config/firebase-admin-key.json');
  
  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  
  const db = admin.firestore();
  
  // Try to list collections (this requires minimal permissions)
  console.log('🔄 Attempting to list collections...');
  
  db.listCollections()
    .then(collections => {
      console.log('✅ Successfully listed collections:');
      collections.forEach(collection => {
        console.log(`  - ${collection.id}`);
      });
      
      // Try to get a document from the first collection
      if (collections.length > 0) {
        const firstCollection = collections[0].id;
        console.log(`\n🔄 Testing access to collection: ${firstCollection}`);
        
        return db.collection(firstCollection).limit(1).get();
      }
    })
    .then(snapshot => {
      if (snapshot) {
        console.log(`✅ Successfully accessed collection with ${snapshot.size} documents`);
        snapshot.forEach(doc => {
          console.log(`  Document ID: ${doc.id}`);
        });
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error accessing Firestore:', error.message);
      console.error('Error code:', error.code);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Failed to initialize:', error.message);
  process.exit(1);
}
