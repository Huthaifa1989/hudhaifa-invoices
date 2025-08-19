# Local Development with Production Database

This guide shows you how to run the Hudhaifa Invoices v2.0 app locally while connecting to the production database.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 20+** installed
2. **npm** installed
3. **Firebase service account key** (already copied)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Test Connections

Before starting the app, test that everything connects properly:

```bash
# Mac/Linux
node test-local.js

# Or run directly
./test-local.js
```

This will verify:
- ✅ Firebase connection to production database
- ✅ Google APIs (Gmail & Drive) connection
- ✅ Invoice service functionality

### Step 3: Start Local Development Server

#### Mac/Linux:
```bash
./start-local.sh
```

#### Windows:
```cmd
start-local.bat
```

#### Manual (if scripts don't work):
```bash
# Set environment variables
export CLIENT_ID=279579602372-0q8jnig84c5vvsjv5ikeke87192bnrjv.apps.googleusercontent.com
export CLIENT_SECRET=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
export REDIRECT_URI=https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/oauth2callback
export REFRESH_TOKEN=1//04CwOwcB9r8FmCgYIARAAGAQSNwF-L9Irlcqq2O1BJSszjPouSHA7afB0VjMDcSULD3hPm2GFpLXcdOT-Cu-O8mgvHLVQovWcVyo
export FUEL_FOLDER_ID=1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy
export FIREBASE_PROJECT_ID=sample-firebase-ai-app-c6d3a
export NODE_ENV=development
export PORT=8080

# Start the server
npm run dev
```

## 🌐 Access Your App

Once started, your app will be available at:

- **Main App**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **API Health**: http://localhost:8080/api/health
- **All Invoices**: http://localhost:8080/api/invoices/all
- **Invoice Stats**: http://localhost:8080/api/invoices/stats

## 📊 What You'll See

Your local app will:

1. **Connect to Production Database**: All your existing invoices from the old app
2. **Use Production Google APIs**: Same Gmail and Drive access
3. **Run with Enhanced Features**: All v2.0 improvements
4. **Local Logging**: Detailed logs in the `logs/` directory
5. **Hot Reload**: Automatic restart on code changes

## 🔧 Development Features

### Enhanced Logging
- **Console logs**: Real-time development logs
- **File logs**: Rotated logs in `logs/` directory
- **Request tracking**: Unique IDs for debugging

### API Endpoints
- **Health checks**: Multiple health endpoints
- **Invoice management**: All invoice operations
- **File upload**: Secure file upload system
- **Search**: Full-text search functionality
- **Statistics**: Comprehensive analytics

### Security Features
- **Rate limiting**: Prevents abuse
- **Input validation**: Sanitizes all inputs
- **CORS protection**: Configurable cross-origin requests
- **Security headers**: Helmet protection

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Specific Endpoints
```bash
# Health check
curl http://localhost:8080/health

# All invoices
curl http://localhost:8080/api/invoices/all

# Invoice statistics
curl http://localhost:8080/api/invoices/stats
```

## 🔍 Monitoring

### View Logs
```bash
# View application logs
tail -f logs/app-*.log

# View error logs
tail -f logs/error-*.log
```

### Performance Monitoring
- **Response times**: Automatic tracking
- **Slow requests**: Logged automatically
- **Error rates**: Comprehensive error tracking
- **Memory usage**: Resource monitoring

## 🚨 Important Notes

### Database Safety
- ✅ **Read-only by default**: Your local app won't modify production data unless you explicitly sync
- ✅ **Same data**: You'll see all your existing invoices
- ✅ **Safe testing**: Test new features without affecting production

### Sync Operations
- **Manual sync**: Use `/api/invoices/sync` endpoint to force sync
- **Background sync**: Disabled in development mode
- **Cooldown**: Respects the same cooldown periods

### Environment
- **Development mode**: Enhanced logging and debugging
- **Production APIs**: Using real Google APIs and Firebase
- **Local storage**: Files uploaded locally, not to production

## 🛠️ Troubleshooting

### Connection Issues
```bash
# Test Firebase connection
node -e "const { getFirestore } = require('./src/config/firebase'); getFirestore().collection('invoices').limit(1).get().then(() => console.log('✅ Firebase OK')).catch(e => console.error('❌ Firebase error:', e.message))"

# Test Google APIs
node -e "const { testApiConnection } = require('./src/config/google-apis'); testApiConnection().then(r => console.log('✅ APIs OK:', r)).catch(e => console.error('❌ API error:', e.message))"
```

### Common Issues

1. **Firebase connection failed**
   - Check if service account key exists: `hudhaifa-invoices/config/firebase-admin-key.json`
   - Verify internet connection

2. **Google APIs failed**
   - Check if OAuth2 credentials are correct
   - Verify refresh token is valid

3. **Port already in use**
   - Change PORT in environment variables
   - Kill existing process: `lsof -ti:8080 | xargs kill`

## 🎯 Next Steps

1. **Test the app**: Verify all endpoints work
2. **Explore features**: Try search, upload, statistics
3. **Compare with v1**: See the improvements
4. **Deploy to production**: When ready, use the deployment guide

---

**Your local development environment is now ready! 🚀**

**App URL**: http://localhost:8080  
**Database**: Production (sample-firebase-ai-app-c6d3a)  
**Mode**: Development with enhanced features
