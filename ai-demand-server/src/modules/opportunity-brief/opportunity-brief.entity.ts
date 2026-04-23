import { EntitySchema } from 'typeorm';
import type { AiDemandOpportunityBrief } from '@super-pro/ai-demand-contracts';

export class OpportunityBriefEntity implements AiDemandOpportunityBrief {
  id!: string;
  problem_cluster_id!: string;
  title!: string;
  brief_statement!: string;
  target_user!: string;
  evidence_signal_ids!: string[];
  evidence_summary!: string;
  boundary_note!: string | null;
  distribution_hypothesis!: string | null;
  visibility_hypothesis!: string | null;
  gap_notes!: string | null;
  status!:
    | 'draft'
    | 'ready_for_scoring'
    | 'awaiting_pre_prd_gate'
    | 'approved_for_prd'
    | 'needs_more_evidence'
    | 'blocked'
    | 'archived';
  generated_by_run_id!: string | null;
}

export const OpportunityBriefEntitySchema =
  new EntitySchema<OpportunityBriefEntity>({
    name: 'AiDemandOpportunityBrief',
    target: OpportunityBriefEntity,
    tableName: 'opportunity_brief',
    columns: {
      id: { name: 'id', type: String, length: 64, primary: true },
      problem_cluster_id: {
        name: 'problem_cluster_id',
        type: String,
        length: 64,
        nullable: false,
      },
      title: { name: 'title', type: String, length: 255, nullable: false },
      brief_statement: {
        name: 'brief_statement',
        type: 'text',
        nullable: false,
      },
      target_user: {
        name: 'target_user',
        type: String,
        length: 255,
        nullable: false,
      },
      evidence_signal_ids: {
        name: 'evidence_signal_ids',
        type: 'json',
        nullable: false,
      },
      evidence_summary: {
        name: 'evidence_summary',
        type: 'text',
        nullable: false,
      },
      boundary_note: { name: 'boundary_note', type: 'text', nullable: true },
      distribution_hypothesis: {
        name: 'distribution_hypothesis',
        type: 'text',
        nullable: true,
      },
      visibility_hypothesis: {
        name: 'visibility_hypothesis',
        type: 'text',
        nullable: true,
      },
      gap_notes: { name: 'gap_notes', type: 'text', nullable: true },
      status: {
        name: 'status',
        type: String,
        length: 48,
        nullable: false,
        default: 'draft',
      },
      generated_by_run_id: {
        name: 'generated_by_run_id',
        type: String,
        length: 64,
        nullable: true,
      },
    },
    indices: [
      {
        name: 'idx_opportunity_brief_problem_cluster_id',
        columns: ['problem_cluster_id'],
      },
      { name: 'idx_opportunity_brief_status', columns: ['status'] },
      {
        name: 'idx_opportunity_brief_generated_by_run_id',
        columns: ['generated_by_run_id'],
      },
    ],
    relations: {
      problemCluster: {
        type: 'many-to-one',
        target: 'AiDemandProblemCluster',
        joinColumn: { name: 'problem_cluster_id', referencedColumnName: 'id' },
        onDelete: 'RESTRICT',
      },
      generatedByRun: {
        type: 'many-to-one',
        target: 'AiDemandWorkflowRun',
        joinColumn: { name: 'generated_by_run_id', referencedColumnName: 'id' },
        onDelete: 'RESTRICT',
      },
    },
  });
