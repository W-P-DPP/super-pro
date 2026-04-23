import { EntitySchema } from 'typeorm';
import type {
  AiDemandCollectionBatch,
  AiDemandRawSignal,
} from '@super-pro/ai-demand-contracts';
import { dateTimeStringTransformer } from '../shared/entity-support.ts';

export class CollectionBatchEntity implements AiDemandCollectionBatch {
  id!: string;
  source_config_id!: string;
  status!: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  started_at!: string | null;
  finished_at!: string | null;
  raw_count!: number;
  accepted_count!: number;
  error_summary!: string | null;
  metadata!: AiDemandCollectionBatch['metadata'];
}

export class RawSignalEntity implements AiDemandRawSignal {
  id!: string;
  collection_batch_id!: string;
  external_id!: string | null;
  source_url!: string | null;
  author_name!: string | null;
  published_at!: string | null;
  language!: string | null;
  title!: string | null;
  content_raw!: string;
  content_hash!: string | null;
  dedupe_key!: string | null;
  is_duplicate!: boolean;
  duplicate_of!: string | null;
  snapshot_ref!: string | null;
  metadata!: AiDemandRawSignal['metadata'];
  ingested_at!: string;
}

export const CollectionBatchEntitySchema = new EntitySchema<CollectionBatchEntity>({
  name: 'AiDemandCollectionBatch',
  target: CollectionBatchEntity,
  tableName: 'collection_batch',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    source_config_id: {
      name: 'source_config_id',
      type: String,
      length: 64,
      nullable: false,
    },
    status: {
      name: 'status',
      type: String,
      length: 32,
      nullable: false,
      default: 'pending',
    },
    started_at: {
      name: 'started_at',
      type: 'datetime',
      nullable: true,
      transformer: dateTimeStringTransformer,
    },
    finished_at: {
      name: 'finished_at',
      type: 'datetime',
      nullable: true,
      transformer: dateTimeStringTransformer,
    },
    raw_count: { name: 'raw_count', type: Number, nullable: false, default: 0 },
    accepted_count: {
      name: 'accepted_count',
      type: Number,
      nullable: false,
      default: 0,
    },
    error_summary: { name: 'error_summary', type: 'text', nullable: true },
    metadata: { name: 'metadata', type: 'json', nullable: true },
  },
  indices: [
    { name: 'idx_collection_batch_source_config_id', columns: ['source_config_id'] },
    { name: 'idx_collection_batch_status', columns: ['status'] },
  ],
  relations: {
    sourceConfig: {
      type: 'many-to-one',
      target: 'AiDemandSourceConfig',
      joinColumn: { name: 'source_config_id', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
  },
});

export const RawSignalEntitySchema = new EntitySchema<RawSignalEntity>({
  name: 'AiDemandRawSignal',
  target: RawSignalEntity,
  tableName: 'raw_signal',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    collection_batch_id: {
      name: 'collection_batch_id',
      type: String,
      length: 64,
      nullable: false,
    },
    external_id: {
      name: 'external_id',
      type: String,
      length: 255,
      nullable: true,
    },
    source_url: {
      name: 'source_url',
      type: String,
      length: 1024,
      nullable: true,
    },
    author_name: {
      name: 'author_name',
      type: String,
      length: 255,
      nullable: true,
    },
    published_at: {
      name: 'published_at',
      type: 'datetime',
      nullable: true,
      transformer: dateTimeStringTransformer,
    },
    language: { name: 'language', type: String, length: 32, nullable: true },
    title: { name: 'title', type: String, length: 512, nullable: true },
    content_raw: { name: 'content_raw', type: 'longtext', nullable: false },
    content_hash: {
      name: 'content_hash',
      type: String,
      length: 64,
      nullable: true,
    },
    dedupe_key: {
      name: 'dedupe_key',
      type: String,
      length: 255,
      nullable: true,
    },
    is_duplicate: {
      name: 'is_duplicate',
      type: Boolean,
      nullable: false,
      default: false,
    },
    duplicate_of: {
      name: 'duplicate_of',
      type: String,
      length: 64,
      nullable: true,
    },
    snapshot_ref: {
      name: 'snapshot_ref',
      type: String,
      length: 1024,
      nullable: true,
    },
    metadata: { name: 'metadata', type: 'json', nullable: true },
    ingested_at: {
      name: 'ingested_at',
      type: 'datetime',
      nullable: false,
      transformer: dateTimeStringTransformer,
    },
  },
  indices: [
    { name: 'idx_raw_signal_collection_batch_id', columns: ['collection_batch_id'] },
    { name: 'idx_raw_signal_external_id', columns: ['external_id'] },
    { name: 'idx_raw_signal_content_hash', columns: ['content_hash'] },
    { name: 'idx_raw_signal_dedupe_key', columns: ['dedupe_key'] },
    { name: 'idx_raw_signal_duplicate_of', columns: ['duplicate_of'] },
    { name: 'idx_raw_signal_published_at', columns: ['published_at'] },
  ],
  relations: {
    collectionBatch: {
      type: 'many-to-one',
      target: 'AiDemandCollectionBatch',
      joinColumn: { name: 'collection_batch_id', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
    duplicateTarget: {
      type: 'many-to-one',
      target: 'AiDemandRawSignal',
      joinColumn: { name: 'duplicate_of', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
  },
});
