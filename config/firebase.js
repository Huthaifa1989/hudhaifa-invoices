const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID is required in .env');
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './config/firebase-admin-key.json';
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(path.resolve(keyPath))),
    storageBucket: ${process.env.FIREBASE_PROJECT_ID}.appspot.com,
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
