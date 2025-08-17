# Script to check deployment status on Google Cloud Run

$serviceName = "hudhaifa-invoices-backend"
$region = "us-central1"

Write-Host "Checking deployment status for $serviceName in region $region..."

$deployStatus = gcloud run services describe $serviceName --region $region --format="value(status.conditions[0].message)"

if ($deployStatus) {
    Write-Host "Deployment status: $deployStatus"
} else {
    Write-Host "Could not retrieve deployment status. Please check service name and region."
}