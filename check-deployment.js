// Script to check Google Cloud Run deployment status using Node.js

const { exec } = require('child_process');

const serviceName = 'hudhaifa-invoices-backend';
const region = 'us-central1';

console.log(`Checking deployment status for ${serviceName} in region ${region}...`);

exec(`gcloud run services describe ${serviceName} --region ${region} --format="value(status.conditions[0].message)"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  if (stdout) {
    console.log(`Deployment status: ${stdout.trim()}`);
  } else {
    console.log('Could not retrieve deployment status. Please check service name and region.');
  }
});