import { createApp } from './app.ts';
import RedisService from './utils/Redis.ts';
import initDataBase from './utils/mysql.ts';
import './eventRegister.ts';
import { initSiteMenuModule } from './src/siteMenu/siteMenu.repository.ts';
import {
  createExceptionEmailReporterFromEnv,
  createServiceRuntime,
  loadProfileEnv,
} from '@super-pro/shared-server';
import { Logger } from './utils/index.ts';
import { disposeOperationLogMiddleware } from './utils/middleware/operationLogMiddleware.ts';

async function bootstrap() {
  const { profile } = loadProfileEnv();
  const logger = Logger.getInstance();
  const emailReporter = createExceptionEmailReporterFromEnv();
  const runtime = createServiceRuntime({
    serviceName: 'general-server',
    logger,
    env: process.env.NODE_ENV,
    reporters: emailReporter ? [emailReporter] : undefined,
  });

  runtime.installProcessHandlers();

  try {
    const port = Number(process.env.PORT || 30010);
    logger.info('Bootstrapping service', {
      serviceName: 'general-server',
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
    runtime.registerShutdownTask('operation-log-flush', () => disposeOperationLogMiddleware(), {
      order: 200,
    });

    await initSiteMenuModule();
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
      serviceName: 'general-server',
      timestamp: Date.now(),
    });
    await runtime.shutdown('bootstrap_error', 1);
    process.exit(1);
  }
}

void bootstrap();
