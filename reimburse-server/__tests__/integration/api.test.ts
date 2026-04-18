import request from 'supertest';
import { createApp } from '../../app.ts';
import { generateToken } from '../../utils/middleware/jwtMiddleware.ts';

const app = createApp();

describe('GET /api/reimbursements', () => {
  it('JWT 关闭时会继续执行业务逻辑', async () => {
    process.env.JWT_ENABLED = 'false';

    const res = await request(app).get('/api/reimbursements');
    expect(res.status).not.toBe(401);
  });
});

describe('JWT 中间件启用时', () => {
  beforeAll(() => {
    process.env.JWT_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.JWT_ENABLED = 'false';
  });

  it('访问受保护接口且未带 token 时返回 401', async () => {
    const res = await request(app).get('/api/reimbursements');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 401);
  });

  it('token 格式错误时返回 401', async () => {
    const res = await request(app)
      .get('/api/reimbursements')
      .set('Authorization', 'InvalidToken');

    expect(res.status).toBe(401);
  });

  it('访问 /api/reimbursements 且 token 有效时返回 200', async () => {
    const token = generateToken({ userId: 1, username: 'employee', role: 'employee' });
    const res = await request(app)
      .get('/api/reimbursements')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('访问 /api/me 且 token 有效时返回当前用户信息', async () => {
    const token = generateToken({ userId: 7, username: 'reimburse-user', role: 'approver' });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      data: {
        userId: 7,
        username: 'reimburse-user',
        role: 'approver',
      },
    });
  });
});
