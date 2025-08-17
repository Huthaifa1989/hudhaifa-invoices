#!/bin/bash

echo "🚀 بدء نشر نظام الفواتير..."

# 1. بناء Frontend
echo "📦 بناء React Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. نشر Frontend على Firebase Hosting
echo "🔥 نشر Frontend على Firebase Hosting..."
firebase deploy --only hosting

# 3. نشر Backend على Cloud Run
echo "☁️ نشر Backend على Google Cloud Run..."
cd backend
gcloud builds submit --config=cloudbuild.yaml

echo "✅ تم النشر بنجاح!"
echo "🌐 Frontend: https://hudhaifa-invoices.web.app"
echo "🔧 Backend: https://hudhaifa-invoices-backend-xxx.run.app"