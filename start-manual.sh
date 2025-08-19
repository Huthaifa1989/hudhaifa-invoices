#!/bin/bash

echo "🚀 Starting Hudhaifa Invoices v2.0 manually..."

# Set environment variables for local development with production database
export FIREBASE_PROJECT_ID=sample-firebase-ai-app-c6d3a
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/hudhaifa-invoices/config/firebase-admin-key.json"
export CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com
export CLIENT_SECRET=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
export REDIRECT_URI=https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/oauth2callback
export REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo
export FUEL_FOLDER_ID=1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy
export MOCK_MODE=0
export NODE_ENV=development
export PORT=8080
export COOLDOWN_SEC=180
export MAX_DB_DOCS=5000

echo "✅ Environment variables set"
echo "🌐 App will be available at: http://localhost:8080"
echo "📊 Production database: $FIREBASE_PROJECT_ID"

echo "🚀 Starting development server..."
npm run dev
