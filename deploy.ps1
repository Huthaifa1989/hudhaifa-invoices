# Simple PowerShell deployment script for Google Cloud Run

$serviceName = "hudhaifa-invoices-backend"
$region = "us-central1"
$image = "gcr.io/sample-firebase-ai-app-c6d3a/hudhaifa-invoices-backend"

Write-Host "Building Docker image..."
gcloud builds submit --tag $image

Write-Host "Deploying to Cloud Run..."
gcloud run deploy $serviceName `
  --image $image `
  --platform managed `
  --region $region `
  --allow-unauthenticated `
  --timeout=900s `
  --set-env-vars "CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com,CLIENT_SECRET=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,REDIRECT_URI=https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/oauth2callback,REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo"

Write-Host "Deployment finished."