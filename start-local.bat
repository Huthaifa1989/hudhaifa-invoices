@echo off
REM Start Hudhaifa Invoices v2.0 locally with production database

echo 🚀 Starting Hudhaifa Invoices v2.0 locally with production database...

REM Set environment variables for local development with production DB
set CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com
set CLIENT_SECRET=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
set REDIRECT_URI=https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/oauth2callback
set REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo
set FUEL_FOLDER_ID=1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy
set FIREBASE_PROJECT_ID=sample-firebase-ai-app-c6d3a
set COOLDOWN_SEC=180
set MAX_DB_DOCS=5000
set NODE_ENV=development
set PORT=8080
set LOG_LEVEL=debug
set RATE_LIMIT_WINDOW_MS=900000
set RATE_LIMIT_MAX_REQUESTS=100
set MAX_FILE_SIZE=10485760
set MAX_FILES_PER_REQUEST=5
set CORS_ORIGIN=http://localhost:3000
set COMPRESSION_LEVEL=6
set REQUEST_TIMEOUT=30000

echo ✅ Environment variables set for production database
echo 🌐 App will be available at: http://localhost:8080
echo 📊 Production database: sample-firebase-ai-app-c6d3a
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the development server
echo 🚀 Starting development server...
npm run dev
