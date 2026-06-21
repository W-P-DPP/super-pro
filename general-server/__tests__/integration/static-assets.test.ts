import request from 'supertest';
import { createApp } from '../../app.ts';

describe('静态资源服务', () => {
  const app = createApp();

  afterEach(() => {
    process.env.JWT_ENABLED = 'false';
  });

  it('GET /1.txt 应返回 public 目录中的文本文件', async () => {
    process.env.JWT_ENABLED = 'true';

    const res = await request(app).get('/1.txt');

    expect(res.status).toBe(200);
    expect(res.text.trim()).toBe('123');
    expect(res.headers['content-type']).toContain('text/plain');
  });

  it('GET /icons/pin.svg 应在未携带 token 时直接返回静态文件', async () => {
    process.env.JWT_ENABLED = 'true';

    const res = await request(app).get('/icons/pin.svg');
    const content = typeof res.text === 'string' && res.text.length > 0
      ? res.text
      : Buffer.from(res.body).toString('utf8');

    expect(res.status).toBe(200);
    expect(content).toContain('<svg');
    expect(res.headers['content-type']).toContain('image/svg+xml');
  });

  it('GET /icons/not-found.svg 应返回标准 404 且不返回鉴权错误', async () => {
    process.env.JWT_ENABLED = 'true';

    const res = await request(app).get('/icons/not-found.svg');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).not.toContain('application/json');
    expect(res.text).not.toContain('缺少授权信息');
    expect(res.text).not.toContain('令牌无效');
  });
});
