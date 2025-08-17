@echo off
REM Script to get the URL of the deployed Cloud Run service

set SERVICE_NAME=hudhaifa-invoices-backend
set REGION=us-central1

echo Getting Cloud Run service URL...
gcloud run services describe %SERVICE_NAME% --region %REGION% --format="value(status.url)"

pause