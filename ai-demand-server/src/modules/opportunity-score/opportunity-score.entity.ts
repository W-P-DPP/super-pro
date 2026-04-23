import { EntitySchema } from 'typeorm';
import type {
  AiDemandOpportunity,
  AiDemandScoringProfile,
} from '@super-pro/ai-demand-contracts';

export class ScoringProfileEntity implements AiDemandScoringProfile {
  id!: string;
  name!: string;
  strategy_key!: string;
  version!: string;
  dimensions!: AiDemandScoringProfile['dimensions'];
  weights!: AiDemandScoringProfile['weights'];
  scale?: AiDemandScoringProfile['scale'];
  normalization?: AiDemandScoringProfile['normalization'];
  gate_rules!: AiDemandScoringProfile['gate_rules'];
  enabled!: boolean;
  metadata!: AiDemandScoringProfile['metadata'];
}

export class OpportunityEntity implements AiDemandOpportunity {
  id!: string;
  opportunity_brief_id!: string;
  scoring_profile_id!: string;
  name!: string;
  opportunity_statement!: string;
  score_total!: number;
  score_breakdown!: AiDemandOpportunity['score_breakdown'];
  score_confidence!: number | null;
  score_rationale!: string;
  risk_notes!: string[];
  status!:
    | 'draft'
    | 'scored'
    | 'approved_for_prd'
    | 'prd_generating'
    | 'prd_generated'
    | 'in_post_prd_review'
    | 'approved'
    | 'changes_requested'
    | 'rejected';
}

export const ScoringProfileEntitySchema = new EntitySchema<ScoringProfileEntity>({
  name: 'AiDemandScoringProfile',
  target: ScoringProfileEntity,
  tableName: 'scoring_profile',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    name: { name: 'name', type: String, length: 255, nullable: false },
    strategy_key: {
      name: 'strategy_key',
      type: String,
      length: 128,
      nullable: false,
    },
    version: { name: 'version', type: String, length: 64, nullable: false },
    dimensions: { name: 'dimensions', type: 'json', nullable: false },
    weights: { name: 'weights', type: 'json', nullable: false },
    scale: { name: 'scale', type: 'json', nullable: true },
    normalization: { name: 'normalization', type: 'json', nullable: true },
    gate_rules: { name: 'gate_rules', type: 'json', nullable: false },
    enabled: { name: 'enabled', type: Boolean, nullable: false, default: true },
    metadata: { name: 'metadata', type: 'json', nullable: true },
  },
  indices: [
    { name: 'idx_scoring_profile_strategy_key', columns: ['strategy_key'] },
    { name: 'idx_scoring_profile_enabled', columns: ['enabled'] },
    {
      name: 'uq_scoring_profile_strategy_version',
      columns: ['strategy_key', 'version'],
      unique: true,
    },
  ],
});

export const OpportunityEntitySchema = new EntitySchema<OpportunityEntity>({
  name: 'AiDemandOpportunity',
  target: OpportunityEntity,
  tableName: 'opportunity',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    opportunity_brief_id: {
      name: 'opportunity_brief_id',
      type: String,
      length: 64,
      nullable: false,
    },
    scoring_profile_id: {
      name: 'scoring_profile_id',
      type: String,
      length: 64,
      nullable: false,
    },
    name: { name: 'name', type: String, length: 255, nullable: false },
    opportunity_statement: {
      name: 'opportunity_statement',
      type: 'text',
      nullable: false,
    },
    score_total: {
      name: 'score_total',
      type: 'decimal',
      precision: 8,
      scale: 2,
      nullable: false,
      default: 0,
    },
    score_breakdown: { name: 'score_breakdown', type: 'json', nullable: false },
    score_confidence: {
      name: 'score_confidence',
      type: 'decimal',
      precision: 5,
      scale: 4,
      nullable: true,
    },
    score_rationale: { name: 'score_rationale', type: 'text', nullable: false },
    risk_notes: { name: 'risk_notes', type: 'json', nullable: false },
    status: {
      name: 'status',
      type: String,
      length: 48,
      nullable: false,
      default: 'draft',
    },
  },
  indices: [
    {
      name: 'idx_opportunity_opportunity_brief_id',
      columns: ['opportunity_brief_id'],
    },
    { name: 'idx_opportunity_scoring_profile_id', columns: ['scoring_profile_id'] },
    { name: 'idx_opportunity_status', columns: ['status'] },
  ],
  relations: {
    opportunityBrief: {
      type: 'many-to-one',
      target: 'AiDemandOpportunityBrief',
      joinColumn: { name: 'opportunity_brief_id', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
    scoringProfile: {
      type: 'many-to-one',
      target: 'AiDemandScoringProfile',
      joinColumn: { name: 'scoring_profile_id', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
  },
});
