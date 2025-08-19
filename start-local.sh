#!/bin/bash

# Start Hudhaifa Invoices v2.0 locally with production database
echo "🚀 Starting Hudhaifa Invoices v2.0 locally with production database..."

# Set environment variables for local development with production DB
export CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com
export CLIENT_SECRET=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
export REDIRECT_URI=https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/oauth2callback
export REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo
export FUEL_FOLDER_ID=1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy
export FIREBASE_PROJECT_ID=sample-firebase-ai-app-c6d3a
export COOLDOWN_SEC=180
export MAX_DB_DOCS=5000
export NODE_ENV=development
export PORT=8080
export LOG_LEVEL=debug
export RATE_LIMIT_WINDOW_MS=900000
export RATE_LIMIT_MAX_REQUESTS=100
export MAX_FILE_SIZE=10485760
export MAX_FILES_PER_REQUEST=5
export CORS_ORIGIN=http://localhost:3000
export COMPRESSION_LEVEL=6
export REQUEST_TIMEOUT=30000

echo "✅ Environment variables set for production database"
echo "🌐 App will be available at: http://localhost:8080"
echo "📊 Production database: sample-firebase-ai-app-c6d3a"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🚀 Starting development server..."
npm run dev
