import type {
  AiDemandId,
  AiDemandJsonObject,
  AiDemandNullable,
  AiDemandTimestamp,
} from './common.ts';
import type { AiDemandCoreObjectKey } from './core-object.ts';
import type {
  AiDemandAuditActorType,
  AiDemandOpportunityBriefState,
  AiDemandOpportunityState,
  AiDemandProblemClusterState,
  AiDemandPrdDraftState,
  AiDemandPromptExecutionStatus,
  AiDemandPromptStage,
  AiDemandReviewDecision,
  AiDemandReviewStage,
  AiDemandReviewTaskStatus,
  AiDemandStateTransitionTriggerType,
  AiDemandStateValue,
  AiDemandWorkflowRunStatus,
  AiDemandWorkflowStage,
} from './state.ts';
import type {
  AiDemandGateRule,
  AiDemandScoreBreakdownItem,
  AiDemandScoringDimension,
  AiDemandScoringNormalization,
  AiDemandScoringScale,
  AiDemandScoringWeights,
} from './scoring.ts';

export type AiDemandReviewObjectType = 'opportunity' | 'prd_draft';

export const AI_DEMAND_SOURCE_TYPES = [
  'forum',
  'social',
  'qa',
  'import',
] as const;

export type AiDemandSourceType = (typeof AI_DEMAND_SOURCE_TYPES)[number];

export const AI_DEMAND_SOURCE_ACCESS_MODES = [
  'manual',
  'scheduled',
] as const;

export type AiDemandSourceAccessMode =
  (typeof AI_DEMAND_SOURCE_ACCESS_MODES)[number];

export const AI_DEMAND_COLLECTION_BATCH_STATUSES = [
  'pending',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export type AiDemandCollectionBatchStatus =
  (typeof AI_DEMAND_COLLECTION_BATCH_STATUSES)[number];

export type AiDemandTokenUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type AiDemandCitation = {
  source_signal_id: AiDemandNullable<AiDemandId>;
  source_url: AiDemandNullable<string>;
  quote: AiDemandNullable<string>;
  note: AiDemandNullable<string>;
};

export type AiDemandSourceConfig = {
  id: AiDemandId;
  name: string;
  source_type: AiDemandSourceType;
  access_mode: AiDemandSourceAccessMode;
  enabled: boolean;
  schedule_expr: AiDemandNullable<string>;
  metadata: AiDemandNullable<AiDemandJsonObject>;
};

export type AiDemandCollectionBatch = {
  id: AiDemandId;
  source_config_id: AiDemandId;
  status: AiDemandCollectionBatchStatus;
  started_at: AiDemandNullable<AiDemandTimestamp>;
  finished_at: AiDemandNullable<AiDemandTimestamp>;
  raw_count: number;
  accepted_count: number;
  error_summary: AiDemandNullable<string>;
  metadata: AiDemandNullable<AiDemandJsonObject>;
};

export type AiDemandRawSignal = {
  id: AiDemandId;
  collection_batch_id: AiDemandId;
  external_id: AiDemandNullable<string>;
  source_url: AiDemandNullable<string>;
  author_name: AiDemandNullable<string>;
  published_at: AiDemandNullable<AiDemandTimestamp>;
  language: AiDemandNullable<string>;
  title: AiDemandNullable<string>;
  content_raw: string;
  content_hash: AiDemandNullable<string>;
  dedupe_key: AiDemandNullable<string>;
  is_duplicate: boolean;
  duplicate_of: AiDemandNullable<AiDemandId>;
  snapshot_ref: AiDemandNullable<string>;
  metadata: AiDemandNullable<AiDemandJsonObject>;
  ingested_at: AiDemandTimestamp;
};

export type AiDemandCleanedSignal = {
  id: AiDemandId;
  raw_signal_id: AiDemandId;
  content_clean: string;
  normalized_problem: AiDemandNullable<string>;
  keywords: string[];
  sentiment: AiDemandNullable<string>;
  pain_level: AiDemandNullable<number>;
  is_duplicate: boolean;
  duplicate_of: AiDemandNullable<AiDemandId>;
  is_noise: boolean;
  pii_masked: boolean;
  quality_score: AiDemandNullable<number>;
  processor_version: string;
};

export type AiDemandProblemCluster = {
  id: AiDemandId;
  title: string;
  summary: string;
  cluster_key: string;
  size: number;
  confidence_score: number;
  status: AiDemandProblemClusterState;
  representative_signal_ids: AiDemandId[];
  generated_by_run_id: AiDemandNullable<AiDemandId>;
};

export type AiDemandOpportunityBrief = {
  id: AiDemandId;
  problem_cluster_id: AiDemandId;
  title: string;
  brief_statement: string;
  target_user: string;
  evidence_signal_ids: AiDemandId[];
  evidence_summary: string;
  boundary_note: AiDemandNullable<string>;
  distribution_hypothesis: AiDemandNullable<string>;
  visibility_hypothesis: AiDemandNullable<string>;
  gap_notes: AiDemandNullable<string>;
  status: AiDemandOpportunityBriefState;
  generated_by_run_id: AiDemandNullable<AiDemandId>;
};

export type AiDemandScoringProfile = {
  id: AiDemandId;
  name: string;
  strategy_key: string;
  version: string;
  dimensions: AiDemandScoringDimension[];
  weights: AiDemandScoringWeights;
  scale?: AiDemandNullable<AiDemandScoringScale>;
  normalization?: AiDemandNullable<AiDemandScoringNormalization>;
  gate_rules: AiDemandGateRule[];
  enabled: boolean;
  metadata: AiDemandNullable<AiDemandJsonObject>;
};

export type AiDemandOpportunity = {
  id: AiDemandId;
  opportunity_brief_id: AiDemandId;
  scoring_profile_id: AiDemandId;
  name: string;
  opportunity_statement: string;
  score_total: number;
  score_breakdown: AiDemandScoreBreakdownItem[];
  score_confidence: AiDemandNullable<number>;
  score_rationale: string;
  risk_notes: string[];
  status: AiDemandOpportunityState;
};

export type AiDemandPrdDraft = {
  id: AiDemandId;
  opportunity_id: AiDemandId;
  version: number;
  title: string;
  background: string;
  target_user: string;
  problem_statement: string;
  solution_hypothesis: string;
  scope_in: string[];
  scope_out: string[];
  risks: string[];
  open_questions: string[];
  citations: AiDemandCitation[];
  status: AiDemandPrdDraftState;
};

export type AiDemandReviewTask = {
  id: AiDemandId;
  object_type: AiDemandReviewObjectType;
  object_id: AiDemandId;
  review_stage: AiDemandReviewStage;
  assignee: AiDemandNullable<string>;
  status: AiDemandReviewTaskStatus;
  decision: AiDemandNullable<AiDemandReviewDecision>;
  comment: AiDemandNullable<string>;
  decided_at: AiDemandNullable<AiDemandTimestamp>;
};

export type AiDemandWorkflowRun = {
  id: AiDemandId;
  workflow_type: AiDemandWorkflowStage;
  target_type: AiDemandCoreObjectKey;
  target_id: AiDemandId;
  status: AiDemandWorkflowRunStatus;
  attempt: number;
  started_at: AiDemandNullable<AiDemandTimestamp>;
  finished_at: AiDemandNullable<AiDemandTimestamp>;
  error_detail: AiDemandNullable<string>;
};

export type AiDemandPromptExecution = {
  id: AiDemandId;
  workflow_run_id: AiDemandId;
  target_type: AiDemandCoreObjectKey;
  target_id: AiDemandId;
  prompt_stage: AiDemandPromptStage;
  prompt_name: string;
  prompt_version: string;
  model_name: string;
  input_ref: string;
  output_ref: AiDemandNullable<string>;
  token_usage: AiDemandNullable<AiDemandTokenUsage>;
  latency_ms: AiDemandNullable<number>;
  status: AiDemandPromptExecutionStatus;
};

export type AiDemandStateTransition = {
  id: AiDemandId;
  object_type: AiDemandCoreObjectKey;
  object_id: AiDemandId;
  from_state: AiDemandNullable<AiDemandStateValue>;
  to_state: AiDemandStateValue;
  trigger_type: AiDemandStateTransitionTriggerType;
  trigger_by: AiDemandNullable<string>;
  reason: AiDemandNullable<string>;
  created_at: AiDemandTimestamp;
};

export type AiDemandAuditEvent = {
  id: AiDemandId;
  object_type: AiDemandCoreObjectKey;
  object_id: AiDemandId;
  event_type: string;
  event_payload: AiDemandJsonObject;
  actor_type: AiDemandAuditActorType;
  actor_id: AiDemandNullable<string>;
  created_at: AiDemandTimestamp;
};

export type AiDemandCoreObjectContractMap = {
  source_config: AiDemandSourceConfig;
  collection_batch: AiDemandCollectionBatch;
  raw_signal: AiDemandRawSignal;
  cleaned_signal: AiDemandCleanedSignal;
  problem_cluster: AiDemandProblemCluster;
  opportunity_brief: AiDemandOpportunityBrief;
  scoring_profile: AiDemandScoringProfile;
  opportunity: AiDemandOpportunity;
  prd_draft: AiDemandPrdDraft;
  review_task: AiDemandReviewTask;
  workflow_run: AiDemandWorkflowRun;
  prompt_execution: AiDemandPromptExecution;
  state_transition: AiDemandStateTransition;
  audit_event: AiDemandAuditEvent;
};
