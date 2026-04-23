import type { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import type { AiDemandSourceConfig } from '@super-pro/ai-demand-contracts';
import { getAiDemandRepositoryByKey } from '../ai-demand.repository.ts';
import { createAiDemandId, normalizeNullableText } from '../shared/runtime-support.ts';
import type {
  SaveSourceConfigInput,
  SourceConfigListFilters,
} from './source-config.dto.ts';

const DEFAULT_MANUAL_IMPORT_SOURCE_ID = 'source_manual_import';

export class SourceConfigService {
  constructor(private readonly dataSource: DataSource) {}

  async listSourceConfigs(
    filters: SourceConfigListFilters = {},
  ): Promise<AiDemandSourceConfig[]> {
    const where: FindOptionsWhere<AiDemandSourceConfig> = {};

    if (typeof filters.enabled === 'boolean') {
      where.enabled = filters.enabled;
    }
    if (filters.access_mode) {
      where.access_mode = filters.access_mode;
    }
    if (filters.source_type) {
      where.source_type = filters.source_type;
    }

    return this.repository.find({
      where,
      order: {
        name: 'ASC',
      },
    });
  }

  async getSourceConfigById(
    sourceConfigId: string,
  ): Promise<AiDemandSourceConfig | null> {
    return this.repository.findOne({
      where: {
        id: sourceConfigId,
      },
    });
  }

  async saveSourceConfig(
    input: SaveSourceConfigInput,
  ): Promise<AiDemandSourceConfig> {
    const nowId = normalizeNullableText(input.id) ?? createAiDemandId('source');
    const normalizedName = normalizeNullableText(input.name);
    if (!normalizedName) {
      throw new Error('source_config.name is required');
    }

    const entity = this.repository.create({
      id: nowId,
      name: normalizedName,
      source_type: input.source_type ?? 'import',
      access_mode: input.access_mode ?? 'manual',
      enabled: input.enabled ?? true,
      schedule_expr: normalizeNullableText(input.schedule_expr),
      metadata: input.metadata ?? null,
    });

    return this.repository.save(entity);
  }

  async ensureManualImportSourceConfig(
    input?: SaveSourceConfigInput | null,
  ): Promise<AiDemandSourceConfig> {
    if (!input) {
      const existing = await this.getSourceConfigById(
        DEFAULT_MANUAL_IMPORT_SOURCE_ID,
      );

      if (existing) {
        return existing;
      }

      return this.saveSourceConfig({
        id: DEFAULT_MANUAL_IMPORT_SOURCE_ID,
        name: 'Manual Import',
        source_type: 'import',
        access_mode: 'manual',
        enabled: true,
        metadata: {
          trigger: 'manual_import',
        },
      });
    }

    return this.saveSourceConfig({
      ...input,
      access_mode: 'manual',
    });
  }

  private get repository(): Repository<AiDemandSourceConfig> {
    return getAiDemandRepositoryByKey(
      this.dataSource,
      'source_config',
    ) as Repository<AiDemandSourceConfig>;
  }
}
