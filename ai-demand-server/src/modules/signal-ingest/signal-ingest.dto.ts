import type {
  AiDemandCollectionBatch,
  AiDemandJsonObject,
  AiDemandRawSignal,
  AiDemandSourceConfig,
  AiDemandWorkflowRun,
} from '@super-pro/ai-demand-contracts';
import type { SaveSourceConfigInput } from '../source-config/source-config.dto.ts';

export type ManualImportLeafType = 'text' | 'link';

export interface ManualImportBaseInput {
  external_id?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  language?: string | null;
  title?: string | null;
  snapshot_ref?: string | null;
  metadata?: AiDemandJsonObject | null;
}

export interface ManualImportTextInput extends ManualImportBaseInput {
  type: 'text';
  content: string;
}

export interface ManualImportLinkInput extends ManualImportBaseInput {
  type: 'link';
  url: string;
  content?: string | null;
  note?: string | null;
}

export type ManualImportLeafInput =
  | ManualImportLinkInput
  | ManualImportTextInput;

export interface ManualImportBatchInput {
  type: 'batch';
  items: ManualImportLeafInput[];
  label?: string | null;
  metadata?: AiDemandJsonObject | null;
}

export type ManualImportInput = ManualImportBatchInput | ManualImportLeafInput;

export interface ManualImportRequest {
  actor_id?: string | null;
  source_config_id?: string | null;
  source_config?: SaveSourceConfigInput | null;
  input: ManualImportInput;
}

export interface ManualImportFailureRecord {
  index: number;
  type: ManualImportLeafType;
  code: 'invalid_input' | 'persistence_failed';
  message: string;
  source_url: string | null;
  external_id: string | null;
}

export interface ManualImportPersistedSignal {
  raw_signal: AiDemandRawSignal;
  duplicate_target_id: string | null;
  dedupe_basis: 'content_hash' | 'dedupe_key' | null;
}

export interface ManualImportResult {
  source_config: AiDemandSourceConfig;
  batch: AiDemandCollectionBatch;
  workflow_run: AiDemandWorkflowRun;
  imported_signals: ManualImportPersistedSignal[];
  failures: ManualImportFailureRecord[];
}
