import type {
  AiDemandJsonObject,
  AiDemandSourceAccessMode,
  AiDemandSourceConfig,
  AiDemandSourceType,
} from '@super-pro/ai-demand-contracts';

export interface SaveSourceConfigInput {
  id?: string;
  name: string;
  source_type?: AiDemandSourceType;
  access_mode?: AiDemandSourceAccessMode;
  enabled?: boolean;
  schedule_expr?: string | null;
  metadata?: AiDemandJsonObject | null;
}

export interface SourceConfigListFilters {
  enabled?: boolean;
  access_mode?: AiDemandSourceConfig['access_mode'];
  source_type?: AiDemandSourceConfig['source_type'];
}
