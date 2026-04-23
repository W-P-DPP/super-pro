export const AI_DEMAND_CORE_OBJECT_KEYS = [
  'source_config',
  'collection_batch',
  'raw_signal',
  'cleaned_signal',
  'problem_cluster',
  'opportunity_brief',
  'scoring_profile',
  'opportunity',
  'prd_draft',
  'review_task',
  'workflow_run',
  'prompt_execution',
  'state_transition',
  'audit_event',
] as const;

export type AiDemandCoreObjectKey = (typeof AI_DEMAND_CORE_OBJECT_KEYS)[number];
