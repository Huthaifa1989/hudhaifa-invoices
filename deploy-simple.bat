@echo off
REM Simple deployment script for Google Cloud Run

set SERVICE_NAME=hudhaifa-invoices-backend
set REGION=us-central1
set IMAGE=gcr.io/sample-firebase-ai-app-c6d3a/hudhaifa-invoices-backend

echo Building Docker image...
gcloud builds submit --tag %IMAGE%

echo Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
  --image %IMAGE% ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --timeout=900s ^
  --set-env-vars "CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com,CLIENT_SECRET=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,REDIRECT_URI=https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/oauth2callback,REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo"

echo Deployment finished.
pause