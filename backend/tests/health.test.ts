import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Phase 0: Core Infrastructure & Health Check', () => {
  const app = createApp();

  it('GET /health should return 200 OK with server status and uptime', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('becha-kena-backend');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  it('GET /api/v1 should return 200 OK with API metadata', async () => {
    const res = await request(app).get('/api/v1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Becha-Kena API');
    expect(res.body.data.version).toBe('v1');
  });

  it('GET /api/v1/non-existent-route should return 404 with standard error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Cannot GET /api/v1/non-existent-route');
    expect(res.body.timestamp).toBeDefined();
  });
});
