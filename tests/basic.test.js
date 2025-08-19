const request = require('supertest');
const { app } = require('../src/server');

describe('Hudhaifa Invoices v2.0', () => {
  describe('Health Endpoints', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /api/health should return 200', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Invoice Endpoints', () => {
    test('GET /api/invoices/all should return 200', async () => {
      const response = await request(app)
        .get('/api/invoices/all')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /api/invoices/stats should return 200', async () => {
      const response = await request(app)
        .get('/api/invoices/stats')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Upload Endpoints', () => {
    test('GET /api/upload should return 200', async () => {
      const response = await request(app)
        .get('/api/upload')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('files');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    test('GET /nonexistent should return 404', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });
  });
});
