import type { AiDemandCoreObjectKey } from '@super-pro/ai-demand-contracts';
import type { EntitySchema } from 'typeorm';
import { AuditEventEntitySchema } from './audit/audit.entity.ts';
import { OpportunityBriefEntitySchema } from './opportunity-brief/opportunity-brief.entity.ts';
import {
  OpportunityEntitySchema,
  ScoringProfileEntitySchema,
} from './opportunity-score/opportunity-score.entity.ts';
import { ProblemClusterEntitySchema } from './problem-cluster/problem-cluster.entity.ts';
import { PrdDraftEntitySchema } from './prd-draft/prd-draft.entity.ts';
import {
  PromptExecutionEntitySchema,
  ReviewTaskEntitySchema,
  StateTransitionEntitySchema,
  WorkflowRunEntitySchema,
} from './review-gate/review-gate.entity.ts';
import { CollectionBatchEntitySchema, RawSignalEntitySchema } from './signal-ingest/signal-ingest.entity.ts';
import { CleanedSignalEntitySchema } from './signal-process/signal-process.entity.ts';
import { SourceConfigEntitySchema } from './source-config/source-config.entity.ts';

export const AI_DEMAND_ENTITY_SCHEMAS = [
  SourceConfigEntitySchema,
  CollectionBatchEntitySchema,
  RawSignalEntitySchema,
  CleanedSignalEntitySchema,
  ProblemClusterEntitySchema,
  OpportunityBriefEntitySchema,
  ScoringProfileEntitySchema,
  OpportunityEntitySchema,
  PrdDraftEntitySchema,
  ReviewTaskEntitySchema,
  WorkflowRunEntitySchema,
  PromptExecutionEntitySchema,
  StateTransitionEntitySchema,
  AuditEventEntitySchema,
] as const;

export const AI_DEMAND_ENTITY_SCHEMAS_BY_KEY: Record<
  AiDemandCoreObjectKey,
  EntitySchema<any>
> = {
  source_config: SourceConfigEntitySchema,
  collection_batch: CollectionBatchEntitySchema,
  raw_signal: RawSignalEntitySchema,
  cleaned_signal: CleanedSignalEntitySchema,
  problem_cluster: ProblemClusterEntitySchema,
  opportunity_brief: OpportunityBriefEntitySchema,
  scoring_profile: ScoringProfileEntitySchema,
  opportunity: OpportunityEntitySchema,
  prd_draft: PrdDraftEntitySchema,
  review_task: ReviewTaskEntitySchema,
  workflow_run: WorkflowRunEntitySchema,
  prompt_execution: PromptExecutionEntitySchema,
  state_transition: StateTransitionEntitySchema,
  audit_event: AuditEventEntitySchema,
};
