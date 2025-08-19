#!/usr/bin/env node

// Test script to verify local app can connect to production database
require('dotenv').config();

// Set production environment variables
process.env.CLIENT_ID = '279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com';
process.env.CLIENT_SECRET = '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';
process.env.REDIRECT_URI = 'https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/oauth2callback';
process.env.REFRESH_TOKEN = '1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo';
process.env.FUEL_FOLDER_ID = '1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy';
process.env.FIREBASE_PROJECT_ID = 'sample-firebase-ai-app-c6d3a';
process.env.NODE_ENV = 'development';

const { getFirestore } = require('./src/config/firebase');
const { testApiConnection } = require('./src/config/google-apis');

async function testConnections() {
  console.log('🧪 Testing local app connections to production database...\n');

  try {
    // Test Firebase connection
    console.log('📊 Testing Firebase connection...');
    const db = getFirestore();
    const invoicesSnapshot = await db.collection('invoices').limit(5).get();
    console.log(`✅ Firebase connected! Found ${invoicesSnapshot.size} invoices in database`);
    
    // Test Google APIs connection
    console.log('\n🔗 Testing Google APIs connection...');
    const apiStatus = await testApiConnection();
    console.log(`✅ Gmail API connected: ${apiStatus.gmail}`);
    console.log(`✅ Drive API connected: ${apiStatus.drive}`);

    // Test invoice service
    console.log('\n📋 Testing invoice service...');
    const { getAllInvoices } = require('./src/services/invoice-service');
    const allInvoices = await getAllInvoices(false);
    
    const totalInvoices = (allInvoices.gmail?.wolt?.length || 0) +
                         (allInvoices.gmail?.electric?.length || 0) +
                         (allInvoices.gmail?.water?.length || 0) +
                         (allInvoices.gmail?.arnona?.length || 0) +
                         (allInvoices.drive?.gas?.length || 0);
    
    console.log(`✅ Invoice service working! Total invoices: ${totalInvoices}`);
    console.log(`   - Wolt: ${allInvoices.gmail?.wolt?.length || 0}`);
    console.log(`   - Electric: ${allInvoices.gmail?.electric?.length || 0}`);
    console.log(`   - Water: ${allInvoices.gmail?.water?.length || 0}`);
    console.log(`   - Arnona: ${allInvoices.gmail?.arnona?.length || 0}`);
    console.log(`   - Fuel: ${allInvoices.drive?.gas?.length || 0}`);

    console.log('\n🎉 All connections successful! Your local app is ready to use with production database.');
    console.log('\n🌐 You can now start the app with:');
    console.log('   ./start-local.sh (Mac/Linux)');
    console.log('   start-local.bat (Windows)');
    console.log('\n📱 App will be available at: http://localhost:8080');

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure you have the Firebase service account key');
    console.error('   2. Check your internet connection');
    console.error('   3. Verify the Google APIs are enabled');
    process.exit(1);
  }
}

testConnections();
