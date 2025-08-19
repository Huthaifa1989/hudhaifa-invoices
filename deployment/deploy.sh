#!/bin/bash

# Hudhaifa Invoices v2.0 Deployment Script
# Deploys to Google Cloud Run with all necessary configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="sample-firebase-ai-app-c6d3a"
SERVICE_NAME="hudhaifa-invoices-v2"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Environment variables
ENV_VARS=(
  "CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com"
  "CLIENT_SECRET=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"
  "REDIRECT_URI=https://hudhaifa-invoices-v2-sample-firebase-ai-app-c6d3a.us-central1.run.app/oauth2callback"
  "REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo"
  "FUEL_FOLDER_ID=1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy"
  "FIREBASE_PROJECT_ID=sample-firebase-ai-app-c6d3a"
  "COOLDOWN_SEC=180"
  "MAX_DB_DOCS=5000"
  "NODE_ENV=production"
  "LOG_LEVEL=info"
  "RATE_LIMIT_WINDOW_MS=900000"
  "RATE_LIMIT_MAX_REQUESTS=100"
  "MAX_FILE_SIZE=10485760"
  "MAX_FILES_PER_REQUEST=5"
  "COMPRESSION_LEVEL=6"
  "REQUEST_TIMEOUT=30000"
)

echo -e "${BLUE}🚀 Starting deployment of Hudhaifa Invoices v2.0${NC}"
echo -e "${BLUE}Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}Service: ${SERVICE_NAME}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with Google Cloud. Please run:${NC}"
    echo -e "${YELLOW}   gcloud auth login${NC}"
    exit 1
fi

# Set project
echo -e "${BLUE}📋 Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy
echo -e "${BLUE}🏗️  Building and deploying to Cloud Run...${NC}"

# Build environment variables string
ENV_VARS_STRING=""
for var in "${ENV_VARS[@]}"; do
    ENV_VARS_STRING="$ENV_VARS_STRING --set-env-vars $var"
done

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 80 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080 \
  --set-env-vars "CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com" \
  --set-env-vars "CLIENT_SECRET=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" \
  --set-env-vars "REDIRECT_URI=https://hudhaifa-invoices-v2-sample-firebase-ai-app-c6d3a.us-central1.run.app/oauth2callback" \
  --set-env-vars "REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo" \
  --set-env-vars "FUEL_FOLDER_ID=1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy" \
  --set-env-vars "FIREBASE_PROJECT_ID=sample-firebase-ai-app-c6d3a" \
  --set-env-vars "COOLDOWN_SEC=180" \
  --set-env-vars "MAX_DB_DOCS=5000" \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "LOG_LEVEL=info"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)")

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo ""

# Test the deployment
echo -e "${BLUE}🧪 Testing deployment...${NC}"
sleep 10

# Test health endpoint
if curl -f -s "${SERVICE_URL}/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
fi

# Test API endpoint
if curl -f -s "${SERVICE_URL}/api/health" > /dev/null; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment and testing completed!${NC}"
echo -e "${BLUE}📊 Monitor your service at:${NC}"
echo -e "${BLUE}   https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}${NC}"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "${BLUE}   View logs: gcloud logs read --service=${SERVICE_NAME} --region=${REGION} --limit=50${NC}"
echo -e "${BLUE}   Follow logs: gcloud logs tail --service=${SERVICE_NAME} --region=${REGION}${NC}"
echo -e "${BLUE}   Update traffic: gcloud run services update-traffic ${SERVICE_NAME} --region=${REGION}${NC}"
