import request from 'supertest';
import { createApp } from '../../app.ts';

describe('应用图标静态资源服务', () => {
  const app = createApp();

  afterEach(() => {
    process.env.JWT_ENABLED = 'false';
  });

  it('GET /public/icons/tools.png 应返回应用图标文件', async () => {
    process.env.JWT_ENABLED = 'true';

    const res = await request(app).get('/public/icons/tools.png');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(Number(res.headers['content-length'] ?? 0)).toBeGreaterThan(0);
  });
});
