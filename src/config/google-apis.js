const { google } = require('googleapis');
const logger = require('./logger');

// OAuth2 client configuration
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Set credentials with refresh token
if (process.env.REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ 
    refresh_token: process.env.REFRESH_TOKEN 
  });
  logger.info('Google OAuth2 client configured with refresh token');
} else {
  logger.warn('No refresh token provided for Google OAuth2');
}

// Initialize Google APIs
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Helper function to refresh access token
const refreshAccessToken = async () => {
  try {
    const { credentials } = await oAuth2Client.refreshAccessToken();
    oAuth2Client.setCredentials(credentials);
    logger.info('Google access token refreshed successfully');
    return credentials.access_token;
  } catch (error) {
    logger.error('Failed to refresh Google access token', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Helper function to test API connectivity
const testApiConnection = async () => {
  try {
    // Test Gmail API
    const gmailResponse = await gmail.users.getProfile({ userId: 'me' });
    logger.info('Gmail API connection successful', {
      email: gmailResponse.data.emailAddress
    });

    // Test Drive API
    const driveResponse = await drive.about.get({ fields: 'user' });
    logger.info('Drive API connection successful', {
      user: driveResponse.data.user.emailAddress
    });

    return {
      gmail: gmailResponse.data.emailAddress,
      drive: driveResponse.data.user.emailAddress
    };
  } catch (error) {
    logger.error('Failed to test Google API connection', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Helper function to get authenticated user info
const getAuthenticatedUser = async () => {
  try {
    const response = await gmail.users.getProfile({ userId: 'me' });
    return response.data;
  } catch (error) {
    logger.error('Failed to get authenticated user info', {
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  oAuth2Client,
  gmail,
  drive,
  refreshAccessToken,
  testApiConnection,
  getAuthenticatedUser
};
