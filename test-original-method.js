#!/usr/bin/env node

const { Firestore } = require('@google-cloud/firestore');

console.log('🔍 Testing Firestore with original v1 method...\n');

try {
  // Use the same method as the original v1 app
  const db = new Firestore();
  
  console.log('✅ Firestore initialized with default credentials');
  
  // Try to list collections
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
  console.error('❌ Failed to initialize Firestore:', error.message);
  process.exit(1);
}
