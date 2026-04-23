export const AI_DEMAND_REVIEW_STAGES = [
  'pre_prd_gate',
  'post_prd_gate',
] as const;

export type AiDemandReviewStage = (typeof AI_DEMAND_REVIEW_STAGES)[number];

export const AI_DEMAND_REVIEW_TASK_STATUSES = [
  'pending',
  'in_review',
  'completed',
  'cancelled',
] as const;

export type AiDemandReviewTaskStatus =
  (typeof AI_DEMAND_REVIEW_TASK_STATUSES)[number];

export const AI_DEMAND_GATE_1_DECISIONS = [
  'approved_for_prd',
  'needs_more_evidence',
  'blocked',
] as const;

export type AiDemandGate1Decision =
  (typeof AI_DEMAND_GATE_1_DECISIONS)[number];

export const AI_DEMAND_GATE_2_DECISIONS = [
  'approved',
  'changes_requested',
  'rejected',
] as const;

export type AiDemandGate2Decision =
  (typeof AI_DEMAND_GATE_2_DECISIONS)[number];

export const AI_DEMAND_REVIEW_DECISIONS = [
  ...AI_DEMAND_GATE_1_DECISIONS,
  ...AI_DEMAND_GATE_2_DECISIONS,
] as const;

export type AiDemandReviewDecision =
  (typeof AI_DEMAND_REVIEW_DECISIONS)[number];

export const AI_DEMAND_WORKFLOW_STAGES = [
  'signal_collection',
  'signal_cleaning',
  'problem_clustering',
  'opportunity_brief_building',
  'opportunity_scoring',
  'pre_prd_gate_review',
  'prd_generation',
  'post_prd_gate_review',
] as const;

export type AiDemandWorkflowStage = (typeof AI_DEMAND_WORKFLOW_STAGES)[number];

export const AI_DEMAND_WORKFLOW_RUN_STATUSES = [
  'pending',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export type AiDemandWorkflowRunStatus =
  (typeof AI_DEMAND_WORKFLOW_RUN_STATUSES)[number];

export const AI_DEMAND_PROMPT_STAGES = [
  'signal_normalization',
  'signal_deduplication',
  'problem_clustering',
  'opportunity_brief_generation',
  'opportunity_scoring',
  'pre_prd_gate_assist',
  'prd_draft_generation',
  'post_prd_review_assist',
] as const;

export type AiDemandPromptStage = (typeof AI_DEMAND_PROMPT_STAGES)[number];

export const AI_DEMAND_PROMPT_EXECUTION_STATUSES = [
  'pending',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export type AiDemandPromptExecutionStatus =
  (typeof AI_DEMAND_PROMPT_EXECUTION_STATUSES)[number];

export const AI_DEMAND_SIGNAL_STATES = [
  'collected',
  'cleaning',
  'cleaned',
  'flagged_noise',
  'duplicate_marked',
  'failed',
] as const;

export type AiDemandSignalState = (typeof AI_DEMAND_SIGNAL_STATES)[number];

export const AI_DEMAND_PROBLEM_CLUSTER_STATES = [
  'pending',
  'ready',
  'brief_pending',
  'archived',
] as const;

export type AiDemandProblemClusterState =
  (typeof AI_DEMAND_PROBLEM_CLUSTER_STATES)[number];

export const AI_DEMAND_OPPORTUNITY_BRIEF_STATES = [
  'draft',
  'ready_for_scoring',
  'awaiting_pre_prd_gate',
  'approved_for_prd',
  'needs_more_evidence',
  'blocked',
  'archived',
] as const;

export type AiDemandOpportunityBriefState =
  (typeof AI_DEMAND_OPPORTUNITY_BRIEF_STATES)[number];

export const AI_DEMAND_OPPORTUNITY_STATES = [
  'draft',
  'scored',
  'approved_for_prd',
  'prd_generating',
  'prd_generated',
  'in_post_prd_review',
  'approved',
  'changes_requested',
  'rejected',
] as const;

export type AiDemandOpportunityState =
  (typeof AI_DEMAND_OPPORTUNITY_STATES)[number];

export const AI_DEMAND_PRD_DRAFT_STATES = [
  'generated',
  'in_review',
  'approved',
  'superseded',
  'rejected',
] as const;

export type AiDemandPrdDraftState = (typeof AI_DEMAND_PRD_DRAFT_STATES)[number];

export const AI_DEMAND_STATE_TRANSITION_TRIGGER_TYPES = [
  'system',
  'human',
] as const;

export type AiDemandStateTransitionTriggerType =
  (typeof AI_DEMAND_STATE_TRANSITION_TRIGGER_TYPES)[number];

export const AI_DEMAND_AUDIT_ACTOR_TYPES = [
  'system',
  'human',
  'model',
] as const;

export type AiDemandAuditActorType =
  (typeof AI_DEMAND_AUDIT_ACTOR_TYPES)[number];

export type AiDemandStateValue =
  | AiDemandOpportunityBriefState
  | AiDemandOpportunityState
  | AiDemandProblemClusterState
  | AiDemandPrdDraftState
  | AiDemandPromptExecutionStatus
  | AiDemandReviewTaskStatus
  | AiDemandSignalState
  | AiDemandWorkflowRunStatus;
