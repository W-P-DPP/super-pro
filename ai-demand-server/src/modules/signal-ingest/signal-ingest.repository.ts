import type {
  AiDemandAuditEvent,
  AiDemandCollectionBatch,
  AiDemandRawSignal,
  AiDemandStateTransition,
  AiDemandWorkflowRun,
} from '@super-pro/ai-demand-contracts';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { getAiDemandRepositoryByKey } from '../ai-demand.repository.ts';

type RepositoryCarrier = DataSource | EntityManager;

export class SignalIngestRepository {
  constructor(private readonly dataSource: DataSource) {}

  createCollectionBatch(
    batch: AiDemandCollectionBatch,
  ): Promise<AiDemandCollectionBatch> {
    return this.collectionBatchRepository.save(
      this.collectionBatchRepository.create(batch),
    );
  }

  saveCollectionBatch(
    batch: AiDemandCollectionBatch,
  ): Promise<AiDemandCollectionBatch> {
    return this.collectionBatchRepository.save(batch);
  }

  createWorkflowRun(run: AiDemandWorkflowRun): Promise<AiDemandWorkflowRun> {
    return this.workflowRunRepository.save(this.workflowRunRepository.create(run));
  }

  saveWorkflowRun(run: AiDemandWorkflowRun): Promise<AiDemandWorkflowRun> {
    return this.workflowRunRepository.save(run);
  }

  createAuditEvent(
    event: AiDemandAuditEvent,
    carrier: RepositoryCarrier = this.dataSource,
  ): Promise<AiDemandAuditEvent> {
    const repository = this.getAuditEventRepository(carrier);
    return repository.save(repository.create(event));
  }

  createStateTransition(
    transition: AiDemandStateTransition,
    carrier: RepositoryCarrier = this.dataSource,
  ): Promise<AiDemandStateTransition> {
    const repository = this.getStateTransitionRepository(carrier);
    return repository.save(repository.create(transition));
  }

  createRawSignal(
    signal: AiDemandRawSignal,
    carrier: RepositoryCarrier = this.dataSource,
  ): Promise<AiDemandRawSignal> {
    const repository = this.getRawSignalRepository(carrier);
    return repository.save(repository.create(signal));
  }

  async findDuplicateCandidate(
    dedupeKey: string | null,
    contentHash: string | null,
    carrier: RepositoryCarrier = this.dataSource,
  ): Promise<AiDemandRawSignal | null> {
    const repository = this.getRawSignalRepository(carrier);
    const queryBuilder = repository
      .createQueryBuilder('raw_signal')
      .orderBy('raw_signal.ingested_at', 'ASC');

    if (dedupeKey) {
      queryBuilder.where('raw_signal.dedupe_key = :dedupeKey', { dedupeKey });
    }

    if (contentHash) {
      if (dedupeKey) {
        queryBuilder.orWhere('raw_signal.content_hash = :contentHash', {
          contentHash,
        });
      } else {
        queryBuilder.where('raw_signal.content_hash = :contentHash', {
          contentHash,
        });
      }
    }

    if (!dedupeKey && !contentHash) {
      return null;
    }

    return queryBuilder.getOne();
  }

  private get collectionBatchRepository(): Repository<AiDemandCollectionBatch> {
    return getAiDemandRepositoryByKey(
      this.dataSource,
      'collection_batch',
    ) as Repository<AiDemandCollectionBatch>;
  }

  private get workflowRunRepository(): Repository<AiDemandWorkflowRun> {
    return getAiDemandRepositoryByKey(
      this.dataSource,
      'workflow_run',
    ) as Repository<AiDemandWorkflowRun>;
  }

  private getAuditEventRepository(
    carrier: RepositoryCarrier,
  ): Repository<AiDemandAuditEvent> {
    return getAiDemandRepositoryByKey(
      carrier,
      'audit_event',
    ) as Repository<AiDemandAuditEvent>;
  }

  private getStateTransitionRepository(
    carrier: RepositoryCarrier,
  ): Repository<AiDemandStateTransition> {
    return getAiDemandRepositoryByKey(
      carrier,
      'state_transition',
    ) as Repository<AiDemandStateTransition>;
  }

  private getRawSignalRepository(
    carrier: RepositoryCarrier,
  ): Repository<AiDemandRawSignal> {
    return getAiDemandRepositoryByKey(
      carrier,
      'raw_signal',
    ) as Repository<AiDemandRawSignal>;
  }
}
