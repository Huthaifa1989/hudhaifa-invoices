# Hudhaifa Invoices v2.0 - Deployment Guide

## 🚀 Quick Deployment

### Prerequisites

1. **Google Cloud CLI** installed and authenticated
2. **Node.js 20+** and npm installed
3. **Firebase project** set up with Firestore enabled
4. **Google APIs** (Gmail, Drive) enabled

### Step 1: Setup Google Cloud

```bash
# Install Google Cloud CLI (if not already installed)
# https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login muhammedimad.ar@gmail.com

# Set the project
gcloud config set project sample-firebase-ai-app-c6d3a

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm run install:all
```

### Step 3: Deploy

```bash
# Make deployment script executable
chmod +x deployment/deploy.sh

# Run deployment
./deployment/deploy.sh
```

## 🔧 Manual Deployment

If you prefer to deploy manually:

```bash
# Deploy to Cloud Run
gcloud run deploy hudhaifa-invoices-v2 \
  --source . \
  --region us-central1 \
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
```

## 🔍 Post-Deployment Verification

### 1. Check Service Status

```bash
# Get service URL
gcloud run services describe hudhaifa-invoices-v2 \
  --region=us-central1 \
  --format="value(status.url)"
```

### 2. Test Health Endpoints

```bash
# Test basic health
curl https://your-service-url/health

# Test detailed health
curl https://your-service-url/health/detailed

# Test API health
curl https://your-service-url/api/health
```

### 3. Test Invoice Endpoints

```bash
# Test all invoices endpoint
curl https://your-service-url/api/invoices/all

# Test statistics endpoint
curl https://your-service-url/api/invoices/stats
```

## 📊 Monitoring

### View Logs

```bash
# View recent logs
gcloud logs read --service=hudhaifa-invoices-v2 --region=us-central1 --limit=50

# Follow logs in real-time
gcloud logs tail --service=hudhaifa-invoices-v2 --region=us-central1
```

### Monitor Performance

```bash
# Check service metrics
gcloud run services describe hudhaifa-invoices-v2 --region=us-central1
```

## 🔄 Updates and Rollbacks

### Update Service

```bash
# Simply run the deployment script again
./deployment/deploy.sh
```

### Rollback to Previous Version

```bash
# List revisions
gcloud run revisions list --service=hudhaifa-invoices-v2 --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic hudhaifa-invoices-v2 \
  --region us-central1 \
  --to-revisions=REVISION_NAME=100
```

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```bash
   # Re-authenticate
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Permission Errors**
   ```bash
   # Check permissions
   gcloud projects get-iam-policy sample-firebase-ai-app-c6d3a
   ```

3. **Service Not Starting**
   ```bash
   # Check logs for errors
   gcloud logs read --service=hudhaifa-invoices-v2 --region=us-central1 --limit=100
   ```

### Environment Variables

Make sure all required environment variables are set:

- `CLIENT_ID`: Google OAuth2 client ID
- `CLIENT_SECRET`: Google OAuth2 client secret
- `REDIRECT_URI`: OAuth2 redirect URI
- `REFRESH_TOKEN`: Google OAuth2 refresh token
- `FUEL_FOLDER_ID`: Google Drive folder ID for fuel invoices
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `COOLDOWN_SEC`: Sync cooldown in seconds
- `MAX_DB_DOCS`: Maximum documents in database
- `NODE_ENV`: Environment (production/development)
- `LOG_LEVEL`: Logging level

## 🔒 Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **Service Account**: Use least privilege principle for service accounts
3. **Network Security**: Configure VPC and firewall rules as needed
4. **Monitoring**: Set up alerts for security events

## 📈 Scaling

### Auto-scaling Configuration

The service is configured with:
- **Min instances**: 0 (cost optimization)
- **Max instances**: 10 (performance limit)
- **Concurrency**: 80 requests per instance
- **Memory**: 1GB per instance
- **CPU**: 1 vCPU per instance

### Manual Scaling

```bash
# Scale to specific number of instances
gcloud run services update hudhaifa-invoices-v2 \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=20
```

## 🎯 Performance Optimization

1. **Caching**: Implement Redis for session caching
2. **CDN**: Use Cloud CDN for static assets
3. **Database**: Optimize Firestore queries
4. **Monitoring**: Set up performance alerts

## 📞 Support

For deployment issues:
- Check the logs: `gcloud logs read --service=hudhaifa-invoices-v2 --region=us-central1`
- Contact: muhammedimad.ar@gmail.com
- Create an issue in the repository

---

**Your Hudhaifa Invoices v2.0 is now deployed and ready to use!**
