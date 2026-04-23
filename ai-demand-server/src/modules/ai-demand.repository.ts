import type { AiDemandCoreObjectKey } from '@super-pro/ai-demand-contracts';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { AI_DEMAND_ENTITY_SCHEMAS_BY_KEY } from './entities.ts';

type RepositoryCarrier = DataSource | EntityManager;

export function getAiDemandRepositoryByKey(
  carrier: RepositoryCarrier,
  key: AiDemandCoreObjectKey,
): Repository<any> {
  return carrier.getRepository(AI_DEMAND_ENTITY_SCHEMAS_BY_KEY[key]);
}

export function withAiDemandTransaction<T>(
  dataSource: DataSource,
  run: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return dataSource.transaction(run);
}
