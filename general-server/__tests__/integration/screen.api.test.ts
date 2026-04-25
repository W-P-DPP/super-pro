import request from 'supertest';
import { createApp } from '../../app.ts';

const app = createApp();

describe('GET /api/screen/device', () => {
  it('JWT 关闭时应返回 200 和设备资源数据', async () => {
    const res = await request(app).get('/api/screen/device');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code', 200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('window', '15m');
    expect(res.body.data).toHaveProperty('node');
    expect(res.body.data).toHaveProperty('current');
  });
});

describe('GET /api/screen/device 鉴权', () => {
  beforeAll(() => {
    process.env.JWT_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.JWT_ENABLED = 'false';
  });

  it('缺少 token 时应返回 401', async () => {
    const res = await request(app).get('/api/screen/device');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 401);
  });

  it('有效 token 时应返回 200', async () => {
    const { generateToken } = await import('../../utils/middleware/jwtMiddleware.ts');
    const token = generateToken({ userId: 1 });
    const res = await request(app)
      .get('/api/screen/device')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code', 200);
  });
});
