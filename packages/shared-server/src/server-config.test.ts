import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadServerConfig, resolveServerConfigPath } from './server-config.ts';

describe('shared-server typed server config', () => {
  it('returns safe defaults when config file is missing', () => {
    const config = loadServerConfig({
      configPath: path.join(os.tmpdir(), 'missing-super-pro-config.json'),
    });

    expect(config).toEqual({
      expires_in: 7200,
      axios: {
        baseURL: '',
        timeout: 5000,
      },
      Redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      Database: {},
    });
  });

  it('normalizes numeric values from json config', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'shared-server-config-'));
    const configPath = path.join(cwd, 'config.json');

    await fs.writeFile(
      configPath,
      JSON.stringify({
        expires_in: '3600',
        axios: {
          baseURL: 'https://example.test',
          timeout: '3000',
        },
        Redis: {
          host: 'redis.internal',
          port: '6380',
        },
        Database: {
          host: 'mysql.internal',
          port: '3307',
        },
        log: {
          rotate: true,
        },
        operationLog: {
          enabled: true,
          batchSize: 50,
        },
      }),
      'utf8',
    );

    expect(loadServerConfig({ configPath })).toEqual({
      expires_in: 3600,
      axios: {
        baseURL: 'https://example.test',
        timeout: 3000,
      },
      Redis: {
        host: 'redis.internal',
        port: 6380,
      },
      Database: {
        host: 'mysql.internal',
        port: '3307',
      },
      log: {
        rotate: true,
      },
      operationLog: {
        enabled: true,
        batchSize: 50,
      },
    });
  });

  it('supports caller defaults for partial config files', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'shared-server-config-'));
    const configPath = path.join(cwd, 'config.json');

    await fs.writeFile(
      configPath,
      JSON.stringify({
        axios: {
          timeout: 1000,
        },
      }),
      'utf8',
    );

    expect(loadServerConfig({
      configPath,
      defaults: {
        axios: {
          baseURL: 'https://default.test',
          timeout: 5000,
        },
      },
    }).axios).toEqual({
      baseURL: 'https://default.test',
      timeout: 1000,
    });
  });

  it('falls back to alternate config filenames in the service root', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'shared-server-config-'));
    const fallbackConfigPath = path.join(cwd, 'config copy.json');

    await fs.writeFile(
      fallbackConfigPath,
      JSON.stringify({
        Redis: {
          host: 'fallback.redis.internal',
        },
      }),
      'utf8',
    );

    expect(resolveServerConfigPath({
      cwd,
      configFilenames: ['config.json', 'config copy.json'],
    })).toBe(fallbackConfigPath);

    expect(loadServerConfig({
      cwd,
      configFilenames: ['config.json', 'config copy.json'],
    }).Redis.host).toBe('fallback.redis.internal');
  });
});
