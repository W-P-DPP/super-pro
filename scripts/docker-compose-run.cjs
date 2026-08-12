const { spawnSync } = require('node:child_process');

const { generateDockerDeployment } = require('./docker-generate-compose.cjs');

const COMPOSE_FILE = 'docker/.generated/docker-compose.yml';

const DEPLOYMENT_PROFILES = {
  prod: {
    name: 'prod',
    projectName: 'super-pro-prod',
    publicHttpPort: '9999',
    runtimeDir: 'D:/super-pro_pro',
    mysqlHostPort: '13306',
    redisHostPort: '16379',
    appNodeEnv: 'production',
  },
  test: {
    name: 'test',
    projectName: 'super-pro-test',
    publicHttpPort: '29999',
    runtimeDir: 'D:/super-pro_test',
    mysqlHostPort: '23306',
    redisHostPort: '26379',
    appNodeEnv: 'development',
  },
};

const ACTION_ARGS = {
  config: ['config', '--quiet'],
  build: ['build'],
  deploy: ['up', '-d', '--build'],
  'deploy-clean': ['up', '-d', '--build', '--remove-orphans'],
  ps: ['ps'],
  down: ['down'],
  logs: ['logs', '-f', '--tail=200'],
};

function getDeploymentProfile(name) {
  const profile = DEPLOYMENT_PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown docker deployment environment "${name}". Use "prod" or "test".`);
  }
  return { ...profile };
}

function firstSet(...values) {
  return values.find((value) => value !== undefined && value !== '');
}

function buildComposeEnv(profile, sourceEnv = process.env) {
  const runtimeDir = firstSet(sourceEnv.DOCKER_RUNTIME_DIR, sourceEnv.PROD_RUNTIME_DIR, profile.runtimeDir);

  return {
    ...sourceEnv,
    COMPOSE_PROJECT_NAME: firstSet(sourceEnv.COMPOSE_PROJECT_NAME, profile.projectName),
    PUBLIC_HTTP_PORT: firstSet(sourceEnv.PUBLIC_HTTP_PORT, profile.publicHttpPort),
    DOCKER_RUNTIME_DIR: runtimeDir,
    MYSQL_HOST_PORT: firstSet(sourceEnv.MYSQL_HOST_PORT, profile.mysqlHostPort),
    REDIS_HOST_PORT: firstSet(sourceEnv.REDIS_HOST_PORT, profile.redisHostPort),
    APP_NODE_ENV: firstSet(sourceEnv.APP_NODE_ENV, profile.appNodeEnv),
  };
}

function buildComposeArgs(profile, action, extraArgs = []) {
  const actionArgs = ACTION_ARGS[action];
  if (!actionArgs) {
    throw new Error(`Unknown docker action "${action}". Use one of: ${Object.keys(ACTION_ARGS).join(', ')}.`);
  }

  return ['docker-compose', '-p', profile.projectName, '-f', COMPOSE_FILE, ...actionArgs, ...extraArgs];
}

function runCli(argv = process.argv.slice(2), sourceEnv = process.env) {
  const [environmentName, action = 'deploy', ...extraArgs] = argv;
  if (!environmentName || environmentName === '-h' || environmentName === '--help') {
    console.log(
      'Usage: node scripts/docker-compose-run.cjs <prod|test> <config|build|deploy|deploy-clean|ps|down|logs> [args...]',
    );
    return 0;
  }

  const profile = getDeploymentProfile(environmentName);
  const env = buildComposeEnv(profile, sourceEnv);
  const args = buildComposeArgs(profile, action, extraArgs);

  generateDockerDeployment();

  console.log(`[INFO] Docker environment : ${profile.name}`);
  console.log(`[INFO] Compose project    : ${profile.projectName}`);
  console.log(`[INFO] HTTP port          : ${env.PUBLIC_HTTP_PORT}`);
  console.log(`[INFO] Runtime dir        : ${env.DOCKER_RUNTIME_DIR}`);
  console.log(`[INFO] MySQL host port    : ${env.MYSQL_HOST_PORT}`);
  console.log(`[INFO] Redis host port    : ${env.REDIS_HOST_PORT}`);
  console.log(`[INFO] App NODE_ENV       : ${env.APP_NODE_ENV}`);

  const result = spawnSync('docker', args, {
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

if (require.main === module) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildComposeArgs,
  buildComposeEnv,
  getDeploymentProfile,
  runCli,
};
