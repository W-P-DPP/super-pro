import { EntitySchema } from 'typeorm';
import type {
  AiDemandPromptExecution,
  AiDemandReviewTask,
  AiDemandStateTransition,
  AiDemandWorkflowRun,
} from '@super-pro/ai-demand-contracts';
import { dateTimeStringTransformer } from '../shared/entity-support.ts';

export class ReviewTaskEntity implements AiDemandReviewTask {
  id!: string;
  object_type!: 'opportunity' | 'prd_draft';
  object_id!: string;
  review_stage!: 'pre_prd_gate' | 'post_prd_gate';
  assignee!: string | null;
  status!: 'pending' | 'in_review' | 'completed' | 'cancelled';
  decision!:
    | 'approved_for_prd'
    | 'needs_more_evidence'
    | 'blocked'
    | 'approved'
    | 'changes_requested'
    | 'rejected'
    | null;
  comment!: string | null;
  decided_at!: string | null;
}

export class WorkflowRunEntity implements AiDemandWorkflowRun {
  id!: string;
  workflow_type!:
    | 'signal_collection'
    | 'signal_cleaning'
    | 'problem_clustering'
    | 'opportunity_brief_building'
    | 'opportunity_scoring'
    | 'pre_prd_gate_review'
    | 'prd_generation'
    | 'post_prd_gate_review';
  target_type!: AiDemandWorkflowRun['target_type'];
  target_id!: string;
  status!: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  attempt!: number;
  started_at!: string | null;
  finished_at!: string | null;
  error_detail!: string | null;
}

export class PromptExecutionEntity implements AiDemandPromptExecution {
  id!: string;
  workflow_run_id!: string;
  target_type!: AiDemandPromptExecution['target_type'];
  target_id!: string;
  prompt_stage!:
    | 'signal_normalization'
    | 'signal_deduplication'
    | 'problem_clustering'
    | 'opportunity_brief_generation'
    | 'opportunity_scoring'
    | 'pre_prd_gate_assist'
    | 'prd_draft_generation'
    | 'post_prd_review_assist';
  prompt_name!: string;
  prompt_version!: string;
  model_name!: string;
  input_ref!: string;
  output_ref!: string | null;
  token_usage!: AiDemandPromptExecution['token_usage'];
  latency_ms!: number | null;
  status!: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
}

export class StateTransitionEntity implements AiDemandStateTransition {
  id!: string;
  object_type!: AiDemandStateTransition['object_type'];
  object_id!: string;
  from_state!: AiDemandStateTransition['from_state'];
  to_state!: AiDemandStateTransition['to_state'];
  trigger_type!: 'system' | 'human';
  trigger_by!: string | null;
  reason!: string | null;
  created_at!: string;
}

export const ReviewTaskEntitySchema = new EntitySchema<ReviewTaskEntity>({
  name: 'AiDemandReviewTask',
  target: ReviewTaskEntity,
  tableName: 'review_task',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    object_type: {
      name: 'object_type',
      type: String,
      length: 32,
      nullable: false,
    },
    object_id: { name: 'object_id', type: String, length: 64, nullable: false },
    review_stage: {
      name: 'review_stage',
      type: String,
      length: 32,
      nullable: false,
    },
    assignee: { name: 'assignee', type: String, length: 128, nullable: true },
    status: {
      name: 'status',
      type: String,
      length: 32,
      nullable: false,
      default: 'pending',
    },
    decision: { name: 'decision', type: String, length: 64, nullable: true },
    comment: { name: 'comment', type: 'text', nullable: true },
    decided_at: {
      name: 'decided_at',
      type: 'datetime',
      nullable: true,
      transformer: dateTimeStringTransformer,
    },
  },
  indices: [
    {
      name: 'idx_review_task_object_stage',
      columns: ['object_type', 'object_id', 'review_stage'],
    },
    { name: 'idx_review_task_status', columns: ['status'] },
  ],
});

export const WorkflowRunEntitySchema = new EntitySchema<WorkflowRunEntity>({
  name: 'AiDemandWorkflowRun',
  target: WorkflowRunEntity,
  tableName: 'workflow_run',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    workflow_type: {
      name: 'workflow_type',
      type: String,
      length: 64,
      nullable: false,
    },
    target_type: {
      name: 'target_type',
      type: String,
      length: 64,
      nullable: false,
    },
    target_id: { name: 'target_id', type: String, length: 64, nullable: false },
    status: {
      name: 'status',
      type: String,
      length: 32,
      nullable: false,
      default: 'pending',
    },
    attempt: { name: 'attempt', type: Number, nullable: false, default: 1 },
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
    error_detail: { name: 'error_detail', type: 'text', nullable: true },
  },
  indices: [
    { name: 'idx_workflow_run_target', columns: ['target_type', 'target_id'] },
    { name: 'idx_workflow_run_status', columns: ['status'] },
    {
      name: 'uq_workflow_run_target_attempt',
      columns: ['workflow_type', 'target_type', 'target_id', 'attempt'],
      unique: true,
    },
  ],
});

export const PromptExecutionEntitySchema =
  new EntitySchema<PromptExecutionEntity>({
    name: 'AiDemandPromptExecution',
    target: PromptExecutionEntity,
    tableName: 'prompt_execution',
    columns: {
      id: { name: 'id', type: String, length: 64, primary: true },
      workflow_run_id: {
        name: 'workflow_run_id',
        type: String,
        length: 64,
        nullable: false,
      },
      target_type: {
        name: 'target_type',
        type: String,
        length: 64,
        nullable: false,
      },
      target_id: { name: 'target_id', type: String, length: 64, nullable: false },
      prompt_stage: {
        name: 'prompt_stage',
        type: String,
        length: 64,
        nullable: false,
      },
      prompt_name: {
        name: 'prompt_name',
        type: String,
        length: 128,
        nullable: false,
      },
      prompt_version: {
        name: 'prompt_version',
        type: String,
        length: 64,
        nullable: false,
      },
      model_name: {
        name: 'model_name',
        type: String,
        length: 128,
        nullable: false,
      },
      input_ref: {
        name: 'input_ref',
        type: String,
        length: 1024,
        nullable: false,
      },
      output_ref: {
        name: 'output_ref',
        type: String,
        length: 1024,
        nullable: true,
      },
      token_usage: { name: 'token_usage', type: 'json', nullable: true },
      latency_ms: { name: 'latency_ms', type: Number, nullable: true },
      status: {
        name: 'status',
        type: String,
        length: 32,
        nullable: false,
        default: 'pending',
      },
    },
    indices: [
      { name: 'idx_prompt_execution_workflow_run_id', columns: ['workflow_run_id'] },
      { name: 'idx_prompt_execution_target', columns: ['target_type', 'target_id'] },
      { name: 'idx_prompt_execution_status', columns: ['status'] },
    ],
    relations: {
      workflowRun: {
        type: 'many-to-one',
        target: 'AiDemandWorkflowRun',
        joinColumn: { name: 'workflow_run_id', referencedColumnName: 'id' },
        onDelete: 'RESTRICT',
      },
    },
  });

export const StateTransitionEntitySchema =
  new EntitySchema<StateTransitionEntity>({
    name: 'AiDemandStateTransition',
    target: StateTransitionEntity,
    tableName: 'state_transition',
    columns: {
      id: { name: 'id', type: String, length: 64, primary: true },
      object_type: {
        name: 'object_type',
        type: String,
        length: 64,
        nullable: false,
      },
      object_id: { name: 'object_id', type: String, length: 64, nullable: false },
      from_state: {
        name: 'from_state',
        type: String,
        length: 64,
        nullable: true,
      },
      to_state: { name: 'to_state', type: String, length: 64, nullable: false },
      trigger_type: {
        name: 'trigger_type',
        type: String,
        length: 16,
        nullable: false,
      },
      trigger_by: {
        name: 'trigger_by',
        type: String,
        length: 128,
        nullable: true,
      },
      reason: { name: 'reason', type: 'text', nullable: true },
      created_at: {
        name: 'created_at',
        type: 'datetime',
        nullable: false,
        transformer: dateTimeStringTransformer,
      },
    },
    indices: [
      { name: 'idx_state_transition_object', columns: ['object_type', 'object_id'] },
      { name: 'idx_state_transition_created_at', columns: ['created_at'] },
    ],
  });
