import { createApp } from './app.ts';
import RedisService from './utils/Redis.ts';
import initDataBase from './utils/mysql.ts';
import './eventRegister.ts';
import {
  BOOTSTRAP_FAILURE_EXIT_CODE,
  createExceptionEmailReporterFromEnv,
  createServiceRuntime,
  loadProfileEnv,
} from '@super-pro/shared-server';
import { Logger } from './utils/index.ts';

async function bootstrap() {
  const { profile } = loadProfileEnv();
  const logger = Logger.getInstance();
  const emailReporter = createExceptionEmailReporterFromEnv();
  const runtime = createServiceRuntime({
    serviceName: 'agent-server',
    logger,
    env: process.env.NODE_ENV,
    reporters: emailReporter ? [emailReporter] : undefined,
  });

  runtime.installProcessHandlers();

  try {
    const port = Number(process.env.PORT || 30012);
    logger.info('Bootstrapping service', {
      serviceName: 'agent-server',
      profile,
      port,
    });

    const redis = RedisService.getInstance();
    await redis.connect();
    runtime.registerHealthCheck('redis', 'ready', () => ({
      ok: redis.isReady(),
    }));
    runtime.registerShutdownTask('redis', () => redis.quit(), {
      order: 300,
    });

    const dataSource = await initDataBase();
    runtime.registerHealthCheck('database', 'ready', () => ({
      ok: dataSource.isInitialized,
    }));
    runtime.registerShutdownTask('database', async () => {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }, {
      order: 400,
    });

    const app = createApp({
      runtime,
    });
    await runtime.startHttpServer({
      app,
      port,
    });
  } catch (error) {
    await runtime.reportException({
      type: 'bootstrap_error',
      error,
      serviceName: 'agent-server',
      timestamp: Date.now(),
    });
    await runtime.shutdown('bootstrap_error', BOOTSTRAP_FAILURE_EXIT_CODE);
    process.exit(BOOTSTRAP_FAILURE_EXIT_CODE);
  }
}

void bootstrap();
