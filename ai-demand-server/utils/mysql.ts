import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getAiDemandDatabaseConfig } from '../src/config.ts';
import { AI_DEMAND_ENTITY_SCHEMAS } from '../src/modules/entities.ts';

let dataSource: DataSource | undefined;
let initializationPromise: Promise<DataSource> | null = null;

export function getDataSource(): DataSource | undefined {
  return dataSource;
}

export async function initDataBase(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  const config = getAiDemandDatabaseConfig();

  dataSource = new DataSource({
    type: config.type,
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    connectorPackage: 'mysql2',
    synchronize: config.synchronize,
    logging: ['error'],
    timezone: config.timezone,
    charset: config.charset,
    entities: [...AI_DEMAND_ENTITY_SCHEMAS],
    migrations: ['src/**/*.migration.ts'],
  });

  initializationPromise = dataSource
    .initialize()
    .then((instance) => {
      initializationPromise = null;
      return instance;
    })
    .catch((error) => {
      initializationPromise = null;
      dataSource = undefined;
      throw error;
    });

  return initializationPromise;
}
