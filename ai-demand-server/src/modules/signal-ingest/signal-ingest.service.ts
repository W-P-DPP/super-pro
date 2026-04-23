import type {
  AiDemandCollectionBatch,
  AiDemandJsonObject,
  AiDemandRawSignal,
  AiDemandSourceConfig,
  AiDemandWorkflowRun,
} from '@super-pro/ai-demand-contracts';
import dayjs from 'dayjs';
import type { DataSource } from 'typeorm';
import { withAiDemandTransaction } from '../ai-demand.repository.ts';
import {
  createAiDemandId,
  formatAiDemandTimestamp,
  normalizeNullableText,
  toContentFingerprint,
} from '../shared/runtime-support.ts';
import type { SaveSourceConfigInput } from '../source-config/source-config.dto.ts';
import { SourceConfigService } from '../source-config/source-config.service.ts';
import type {
  ManualImportBatchInput,
  ManualImportFailureRecord,
  ManualImportLeafInput,
  ManualImportPersistedSignal,
  ManualImportRequest,
  ManualImportResult,
} from './signal-ingest.dto.ts';
import { SignalIngestRepository } from './signal-ingest.repository.ts';

const BATCH_CREATED_EVENT = 'signal_import_batch_created';
const BATCH_COMPLETED_EVENT = 'signal_import_batch_completed';
const SIGNAL_IMPORTED_EVENT = 'raw_signal_imported';
const SIGNAL_DUPLICATE_EVENT = 'raw_signal_duplicate_marked';
const SIGNAL_FAILURE_EVENT = 'signal_import_failed';

type FlattenedManualImportItem = {
  index: number;
  batch_label: string | null;
  batch_metadata: AiDemandJsonObject | null;
  payload: ManualImportLeafInput;
};

type NormalizedManualImportItem = {
  type: ManualImportLeafInput['type'];
  external_id: string | null;
  source_url: string | null;
  author_name: string | null;
  published_at: string | null;
  language: string | null;
  title: string | null;
  content_raw: string;
  content_hash: string;
  dedupe_key: string | null;
  snapshot_ref: string | null;
  metadata: AiDemandJsonObject | null;
};

class ManualImportInputError extends Error {
  constructor(
    readonly failure: Omit<ManualImportFailureRecord, 'index'>,
  ) {
    super(failure.message);
  }
}

export class SignalIngestService {
  private readonly sourceConfigService: SourceConfigService;

  private readonly repository: SignalIngestRepository;

  constructor(private readonly dataSource: DataSource) {
    this.sourceConfigService = new SourceConfigService(dataSource);
    this.repository = new SignalIngestRepository(dataSource);
  }

  listSourceConfigs(filters?: {
    enabled?: boolean;
    access_mode?: AiDemandSourceConfig['access_mode'];
    source_type?: AiDemandSourceConfig['source_type'];
  }): Promise<AiDemandSourceConfig[]> {
    return this.sourceConfigService.listSourceConfigs(filters);
  }

  getSourceConfigById(
    sourceConfigId: string,
  ): Promise<AiDemandSourceConfig | null> {
    return this.sourceConfigService.getSourceConfigById(sourceConfigId);
  }

  saveSourceConfig(
    input: SaveSourceConfigInput,
  ): Promise<AiDemandSourceConfig> {
    return this.sourceConfigService.saveSourceConfig(input);
  }

  async importManualSignals(
    request: ManualImportRequest,
  ): Promise<ManualImportResult> {
    const actorId = normalizeNullableText(request.actor_id);
    const sourceConfig = await this.resolveSourceConfig(request);
    const items = this.flattenInput(request.input);

    const batchId = createAiDemandId('batch');
    const workflowRunId = createAiDemandId('run');
    const startedAt = formatAiDemandTimestamp();

    let batch: AiDemandCollectionBatch = {
      id: batchId,
      source_config_id: sourceConfig.id,
      status: 'running',
      started_at: startedAt,
      finished_at: null,
      raw_count: items.length,
      accepted_count: 0,
      error_summary: null,
      metadata: {
        trigger: 'manual_import',
        input_mode: request.input.type,
        requested_count: items.length,
      },
    };

    let workflowRun: AiDemandWorkflowRun = {
      id: workflowRunId,
      workflow_type: 'signal_collection',
      target_type: 'collection_batch',
      target_id: batchId,
      status: 'running',
      attempt: 1,
      started_at: startedAt,
      finished_at: null,
      error_detail: null,
    };

    await this.repository.createCollectionBatch(batch);
    await this.repository.createWorkflowRun(workflowRun);
    await this.repository.createAuditEvent({
      id: createAiDemandId('audit'),
      object_type: 'collection_batch',
      object_id: batchId,
      event_type: BATCH_CREATED_EVENT,
      event_payload: {
        source_config_id: sourceConfig.id,
        input_mode: request.input.type,
        requested_count: items.length,
      },
      actor_type: actorId ? 'human' : 'system',
      actor_id: actorId,
      created_at: startedAt,
    });

    const importedSignals: ManualImportPersistedSignal[] = [];
    const failures: ManualImportFailureRecord[] = [];
    let duplicateCount = 0;

    for (const item of items) {
      try {
        const normalized = this.normalizeItem(item);
        const persisted = await this.persistItem(
          batchId,
          actorId,
          item,
          normalized,
        );
        importedSignals.push(persisted);
        if (persisted.raw_signal.is_duplicate) {
          duplicateCount += 1;
        }
      } catch (error) {
        const failure = this.toFailureRecord(item, error);
        failures.push(failure);
        await this.repository.createAuditEvent({
          id: createAiDemandId('audit'),
          object_type: 'collection_batch',
          object_id: batchId,
          event_type: SIGNAL_FAILURE_EVENT,
          event_payload: {
            index: failure.index,
            type: failure.type,
            code: failure.code,
            message: failure.message,
            source_url: failure.source_url,
            external_id: failure.external_id,
          },
          actor_type: actorId ? 'human' : 'system',
          actor_id: actorId,
          created_at: formatAiDemandTimestamp(),
        });
      }
    }

    const finishedAt = formatAiDemandTimestamp();
    const failureSummary = this.buildFailureSummary(failures);

    batch = {
      ...batch,
      status: importedSignals.length > 0 || failures.length === 0
        ? 'succeeded'
        : 'failed',
      accepted_count: importedSignals.length,
      finished_at: finishedAt,
      error_summary: failureSummary,
      metadata: {
        trigger: 'manual_import',
        input_mode: request.input.type,
        requested_count: items.length,
        accepted_count: importedSignals.length,
        duplicate_count: duplicateCount,
        unique_count: importedSignals.length - duplicateCount,
        failed_count: failures.length,
      },
    };

    workflowRun = {
      ...workflowRun,
      status: batch.status === 'failed' ? 'failed' : 'succeeded',
      finished_at: finishedAt,
      error_detail: failureSummary,
    };

    await this.repository.saveCollectionBatch(batch);
    await this.repository.saveWorkflowRun(workflowRun);
    await this.repository.createAuditEvent({
      id: createAiDemandId('audit'),
      object_type: 'collection_batch',
      object_id: batchId,
      event_type: BATCH_COMPLETED_EVENT,
      event_payload: {
        accepted_count: importedSignals.length,
        duplicate_count: duplicateCount,
        failed_count: failures.length,
        status: batch.status,
      },
      actor_type: actorId ? 'human' : 'system',
      actor_id: actorId,
      created_at: finishedAt,
    });

    return {
      source_config: sourceConfig,
      batch,
      workflow_run: workflowRun,
      imported_signals: importedSignals,
      failures,
    };
  }

  private async resolveSourceConfig(
    request: ManualImportRequest,
  ): Promise<AiDemandSourceConfig> {
    if (request.source_config_id) {
      const sourceConfig = await this.sourceConfigService.getSourceConfigById(
        request.source_config_id,
      );
      if (!sourceConfig) {
        throw new Error(`source_config 不存在: ${request.source_config_id}`);
      }
      if (!sourceConfig.enabled) {
        throw new Error(`source_config 已禁用: ${request.source_config_id}`);
      }
      if (sourceConfig.access_mode !== 'manual') {
        throw new Error(
          `source_config 不支持手动导入: ${request.source_config_id}`,
        );
      }
      return sourceConfig;
    }

    const sourceConfig = await this.sourceConfigService.ensureManualImportSourceConfig(
      request.source_config,
    );

    if (!sourceConfig.enabled) {
      throw new Error(`source_config 已禁用: ${sourceConfig.id}`);
    }

    return sourceConfig;
  }

  private flattenInput(
    input: ManualImportRequest['input'],
  ): FlattenedManualImportItem[] {
    if (input.type !== 'batch') {
      return [
        {
          index: 0,
          batch_label: null,
          batch_metadata: null,
          payload: input,
        },
      ];
    }

    return this.flattenBatchInput(input);
  }

  private flattenBatchInput(
    input: ManualImportBatchInput,
  ): FlattenedManualImportItem[] {
    if (input.items.length === 0) {
      throw new Error('batch 导入至少需要一条记录');
    }

    return input.items.map((payload, index) => ({
      index,
      batch_label: normalizeNullableText(input.label),
      batch_metadata: input.metadata ?? null,
      payload,
    }));
  }

  private normalizeItem(
    item: FlattenedManualImportItem,
  ): NormalizedManualImportItem {
    const externalId = normalizeNullableText(item.payload.external_id);
    const authorName = normalizeNullableText(item.payload.author_name);
    const publishedAt = this.normalizePublishedAt(
      item.payload.published_at ?? null,
      item,
    );
    const language = normalizeNullableText(item.payload.language);
    const title = normalizeNullableText(item.payload.title);
    const snapshotRef = normalizeNullableText(item.payload.snapshot_ref);

    if (item.payload.type === 'text') {
      const contentRaw = normalizeNullableText(item.payload.content);
      if (!contentRaw) {
        throw new ManualImportInputError({
          type: 'text',
          code: 'invalid_input',
          message: '文本导入内容不能为空',
          source_url: null,
          external_id: externalId,
        });
      }

      const contentHash = this.buildContentHash(title, contentRaw, null);
      return {
        type: 'text',
        external_id: externalId,
        source_url: null,
        author_name: authorName,
        published_at: publishedAt,
        language,
        title,
        content_raw: contentRaw,
        content_hash: contentHash,
        dedupe_key: externalId ? `external:${externalId}` : `hash:${contentHash}`,
        snapshot_ref: snapshotRef,
        metadata: this.buildItemMetadata(item, {
          import_type: 'text',
        }),
      };
    }

    const sourceUrl = this.normalizeUrl(item.payload.url, item);
    const note = normalizeNullableText(item.payload.note);
    const content = normalizeNullableText(item.payload.content);
    const contentRaw = [title, content, note, sourceUrl].filter(Boolean).join(
      '\n\n',
    );
    const contentHash = this.buildContentHash(title, contentRaw, sourceUrl);

    return {
      type: 'link',
      external_id: externalId,
      source_url: sourceUrl,
      author_name: authorName,
      published_at: publishedAt,
      language,
      title,
      content_raw: contentRaw,
      content_hash: contentHash,
      dedupe_key: externalId
        ? `external:${externalId}`
        : `url:${sourceUrl.toLowerCase()}`,
      snapshot_ref: snapshotRef,
      metadata: this.buildItemMetadata(item, {
        import_type: 'link',
        has_content: Boolean(content),
        has_note: Boolean(note),
      }),
    };
  }

  private normalizePublishedAt(
    value: string | null,
    item: FlattenedManualImportItem,
  ): string | null {
    const normalized = normalizeNullableText(value);
    if (!normalized) {
      return null;
    }

    const parsed = dayjs(normalized);
    if (!parsed.isValid()) {
      throw new ManualImportInputError({
        type: item.payload.type,
        code: 'invalid_input',
        message: `发布时间格式无效: ${normalized}`,
        source_url:
          item.payload.type === 'link' ? normalizeNullableText(item.payload.url) : null,
        external_id: normalizeNullableText(item.payload.external_id),
      });
    }

    return parsed.format('YYYY-MM-DD HH:mm:ss');
  }

  private normalizeUrl(
    rawUrl: string,
    item: FlattenedManualImportItem,
  ): string {
    const normalized = normalizeNullableText(rawUrl);
    if (!normalized) {
      throw new ManualImportInputError({
        type: 'link',
        code: 'invalid_input',
        message: '链接导入 url 不能为空',
        source_url: null,
        external_id: normalizeNullableText(item.payload.external_id),
      });
    }

    try {
      return new URL(normalized).toString();
    } catch {
      throw new ManualImportInputError({
        type: 'link',
        code: 'invalid_input',
        message: `链接格式无效: ${normalized}`,
        source_url: normalized,
        external_id: normalizeNullableText(item.payload.external_id),
      });
    }
  }

  private buildContentHash(
    title: string | null,
    contentRaw: string,
    sourceUrl: string | null,
  ): string {
    return toContentFingerprint(
      [title, contentRaw, sourceUrl]
        .filter(Boolean)
        .join('\n')
        .toLowerCase(),
    );
  }

  private buildItemMetadata(
    item: FlattenedManualImportItem,
    extras: AiDemandJsonObject,
  ): AiDemandJsonObject | null {
    return {
      ...((item.batch_metadata ?? {}) as AiDemandJsonObject),
      ...((item.payload.metadata ?? {}) as AiDemandJsonObject),
      ...extras,
      batch_item_index: item.index,
      batch_label: item.batch_label,
      import_channel: 'manual',
    };
  }

  private async persistItem(
    batchId: string,
    actorId: string | null,
    item: FlattenedManualImportItem,
    normalized: NormalizedManualImportItem,
  ): Promise<ManualImportPersistedSignal> {
    return withAiDemandTransaction(this.dataSource, async (manager) => {
      const duplicateTarget = await this.repository.findDuplicateCandidate(
        normalized.dedupe_key,
        normalized.content_hash,
        manager,
      );

      let dedupeBasis: ManualImportPersistedSignal['dedupe_basis'] = null;
      if (duplicateTarget) {
        dedupeBasis = duplicateTarget.dedupe_key === normalized.dedupe_key
          ? 'dedupe_key'
          : 'content_hash';
      }

      const rawSignal: AiDemandRawSignal = {
        id: createAiDemandId('signal'),
        collection_batch_id: batchId,
        external_id: normalized.external_id,
        source_url: normalized.source_url,
        author_name: normalized.author_name,
        published_at: normalized.published_at,
        language: normalized.language,
        title: normalized.title,
        content_raw: normalized.content_raw,
        content_hash: normalized.content_hash,
        dedupe_key: normalized.dedupe_key,
        is_duplicate: Boolean(duplicateTarget),
        duplicate_of: duplicateTarget?.id ?? null,
        snapshot_ref: normalized.snapshot_ref,
        metadata: normalized.metadata,
        ingested_at: formatAiDemandTimestamp(),
      };

      const persisted = await this.repository.createRawSignal(rawSignal, manager);
      await this.repository.createStateTransition(
        {
          id: createAiDemandId('state'),
          object_type: 'raw_signal',
          object_id: persisted.id,
          from_state: null,
          to_state: duplicateTarget ? 'duplicate_marked' : 'collected',
          trigger_type: actorId ? 'human' : 'system',
          trigger_by: actorId,
          reason: duplicateTarget ? '导入时命中基础去重规则' : '手动导入入库',
          created_at: formatAiDemandTimestamp(),
        },
        manager,
      );
      await this.repository.createAuditEvent(
        {
          id: createAiDemandId('audit'),
          object_type: 'raw_signal',
          object_id: persisted.id,
          event_type: SIGNAL_IMPORTED_EVENT,
          event_payload: {
            collection_batch_id: batchId,
            import_type: normalized.type,
            source_url: normalized.source_url,
            dedupe_key: normalized.dedupe_key,
            content_hash: normalized.content_hash,
          },
          actor_type: actorId ? 'human' : 'system',
          actor_id: actorId,
          created_at: formatAiDemandTimestamp(),
        },
        manager,
      );

      if (duplicateTarget) {
        await this.repository.createAuditEvent(
          {
            id: createAiDemandId('audit'),
            object_type: 'raw_signal',
            object_id: persisted.id,
            event_type: SIGNAL_DUPLICATE_EVENT,
            event_payload: {
              duplicate_of: duplicateTarget.id,
              dedupe_basis: dedupeBasis,
              imported_item_index: item.index,
            },
            actor_type: actorId ? 'human' : 'system',
            actor_id: actorId,
            created_at: formatAiDemandTimestamp(),
          },
          manager,
        );
      }

      return {
        raw_signal: persisted,
        duplicate_target_id: duplicateTarget?.id ?? null,
        dedupe_basis: dedupeBasis,
      };
    });
  }

  private toFailureRecord(
    item: FlattenedManualImportItem,
    error: unknown,
  ): ManualImportFailureRecord {
    if (error instanceof ManualImportInputError) {
      return {
        index: item.index,
        ...error.failure,
      };
    }

    const defaultMessage =
      error instanceof Error ? error.message : '未知持久化错误';

    return {
      index: item.index,
      type: item.payload.type,
      code: 'persistence_failed',
      message: defaultMessage,
      source_url:
        item.payload.type === 'link'
          ? normalizeNullableText(item.payload.url)
          : null,
      external_id: normalizeNullableText(item.payload.external_id),
    };
  }

  private buildFailureSummary(
    failures: ManualImportFailureRecord[],
  ): string | null {
    if (failures.length === 0) {
      return null;
    }

    return JSON.stringify({
      failed_count: failures.length,
      failures: failures.slice(0, 10),
    });
  }
}
