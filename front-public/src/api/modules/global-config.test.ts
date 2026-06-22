import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('../request', () => ({
  request: {
    get: getMock,
  },
  RequestError: class RequestError extends Error {},
}));

import { getCurrentProjectGlobalConfig } from './global-config';

describe('front-public global config api', () => {
  beforeEach(() => {
    getMock.mockReset();
    vi.unstubAllEnvs();
  });

  it('loads public global config by VITE_SITE_MENU_CODE', async () => {
    vi.stubEnv('VITE_SITE_MENU_CODE', 'site');
    getMock.mockResolvedValue({
      code: 200,
      msg: '获取成功',
      data: {
        'site.title': '工具站',
      },
      timestamp: Date.now(),
    });

    const result = await getCurrentProjectGlobalConfig();

    expect(getMock).toHaveBeenCalledWith('/global-config/public/site', {
      requiresAuth: false,
    });
    expect(result['site.title']).toBe('工具站');
  });
});
