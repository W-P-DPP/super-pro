import { loadServerConfig } from '@super-pro/shared-server';
import { fileURLToPath } from 'node:url';

const serviceRoot = fileURLToPath(new URL('..', import.meta.url));

const config = loadServerConfig({
  cwd: serviceRoot,
  configFilenames: ['config.json', 'config copy.json'],
});

export default config;
