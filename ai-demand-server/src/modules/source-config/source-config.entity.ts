import { EntitySchema } from 'typeorm';
import type { AiDemandSourceConfig } from '@super-pro/ai-demand-contracts';

export class SourceConfigEntity implements AiDemandSourceConfig {
  id!: string;
  name!: string;
  source_type!: 'forum' | 'social' | 'qa' | 'import';
  access_mode!: 'manual' | 'scheduled';
  enabled!: boolean;
  schedule_expr!: string | null;
  metadata!: AiDemandSourceConfig['metadata'];
}

export const SourceConfigEntitySchema = new EntitySchema<SourceConfigEntity>({
  name: 'AiDemandSourceConfig',
  target: SourceConfigEntity,
  tableName: 'source_config',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    name: { name: 'name', type: String, length: 255, nullable: false },
    source_type: {
      name: 'source_type',
      type: String,
      length: 32,
      nullable: false,
    },
    access_mode: {
      name: 'access_mode',
      type: String,
      length: 32,
      nullable: false,
    },
    enabled: { name: 'enabled', type: Boolean, nullable: false, default: true },
    schedule_expr: {
      name: 'schedule_expr',
      type: String,
      length: 255,
      nullable: true,
    },
    metadata: { name: 'metadata', type: 'json', nullable: true },
  },
  indices: [
    { name: 'idx_source_config_source_type', columns: ['source_type'] },
    { name: 'idx_source_config_enabled', columns: ['enabled'] },
  ],
});
