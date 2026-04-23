import { EntitySchema } from 'typeorm';
import type { AiDemandCleanedSignal } from '@super-pro/ai-demand-contracts';

export class CleanedSignalEntity implements AiDemandCleanedSignal {
  id!: string;
  raw_signal_id!: string;
  content_clean!: string;
  normalized_problem!: string | null;
  keywords!: string[];
  sentiment!: string | null;
  pain_level!: number | null;
  is_duplicate!: boolean;
  duplicate_of!: string | null;
  is_noise!: boolean;
  pii_masked!: boolean;
  quality_score!: number | null;
  processor_version!: string;
}

export const CleanedSignalEntitySchema = new EntitySchema<CleanedSignalEntity>({
  name: 'AiDemandCleanedSignal',
  target: CleanedSignalEntity,
  tableName: 'cleaned_signal',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    raw_signal_id: {
      name: 'raw_signal_id',
      type: String,
      length: 64,
      nullable: false,
    },
    content_clean: { name: 'content_clean', type: 'longtext', nullable: false },
    normalized_problem: {
      name: 'normalized_problem',
      type: 'text',
      nullable: true,
    },
    keywords: { name: 'keywords', type: 'json', nullable: false },
    sentiment: { name: 'sentiment', type: String, length: 32, nullable: true },
    pain_level: { name: 'pain_level', type: Number, nullable: true },
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
    is_noise: { name: 'is_noise', type: Boolean, nullable: false, default: false },
    pii_masked: {
      name: 'pii_masked',
      type: Boolean,
      nullable: false,
      default: false,
    },
    quality_score: {
      name: 'quality_score',
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
    },
    processor_version: {
      name: 'processor_version',
      type: String,
      length: 64,
      nullable: false,
    },
  },
  indices: [
    { name: 'idx_cleaned_signal_raw_signal_id', columns: ['raw_signal_id'] },
    { name: 'idx_cleaned_signal_duplicate_of', columns: ['duplicate_of'] },
    { name: 'idx_cleaned_signal_is_noise', columns: ['is_noise'] },
  ],
  relations: {
    rawSignal: {
      type: 'many-to-one',
      target: 'AiDemandRawSignal',
      joinColumn: { name: 'raw_signal_id', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
  },
});
