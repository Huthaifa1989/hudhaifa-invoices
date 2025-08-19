// Test setup file for Jest
require('dotenv').config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '8081';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.CLIENT_ID = 'test-client-id';
process.env.CLIENT_SECRET = 'test-client-secret';
process.env.REDIRECT_URI = 'http://localhost:8081/oauth2callback';
process.env.REFRESH_TOKEN = 'test-refresh-token';
process.env.FUEL_FOLDER_ID = 'test-folder-id';
process.env.COOLDOWN_SEC = '180';
process.env.MAX_DB_DOCS = '5000';
process.env.LOG_LEVEL = 'error';

// Suppress console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
