import { EntitySchema } from 'typeorm';
import type { AiDemandPrdDraft } from '@super-pro/ai-demand-contracts';

export class PrdDraftEntity implements AiDemandPrdDraft {
  id!: string;
  opportunity_id!: string;
  version!: number;
  title!: string;
  background!: string;
  target_user!: string;
  problem_statement!: string;
  solution_hypothesis!: string;
  scope_in!: string[];
  scope_out!: string[];
  risks!: string[];
  open_questions!: string[];
  citations!: AiDemandPrdDraft['citations'];
  status!: 'generated' | 'in_review' | 'approved' | 'superseded' | 'rejected';
}

export const PrdDraftEntitySchema = new EntitySchema<PrdDraftEntity>({
  name: 'AiDemandPrdDraft',
  target: PrdDraftEntity,
  tableName: 'prd_draft',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    opportunity_id: {
      name: 'opportunity_id',
      type: String,
      length: 64,
      nullable: false,
    },
    version: { name: 'version', type: Number, nullable: false },
    title: { name: 'title', type: String, length: 255, nullable: false },
    background: { name: 'background', type: 'text', nullable: false },
    target_user: {
      name: 'target_user',
      type: String,
      length: 255,
      nullable: false,
    },
    problem_statement: {
      name: 'problem_statement',
      type: 'text',
      nullable: false,
    },
    solution_hypothesis: {
      name: 'solution_hypothesis',
      type: 'text',
      nullable: false,
    },
    scope_in: { name: 'scope_in', type: 'json', nullable: false },
    scope_out: { name: 'scope_out', type: 'json', nullable: false },
    risks: { name: 'risks', type: 'json', nullable: false },
    open_questions: { name: 'open_questions', type: 'json', nullable: false },
    citations: { name: 'citations', type: 'json', nullable: false },
    status: {
      name: 'status',
      type: String,
      length: 32,
      nullable: false,
      default: 'generated',
    },
  },
  indices: [
    { name: 'idx_prd_draft_opportunity_id', columns: ['opportunity_id'] },
    {
      name: 'uq_prd_draft_opportunity_version',
      columns: ['opportunity_id', 'version'],
      unique: true,
    },
    { name: 'idx_prd_draft_status', columns: ['status'] },
  ],
  relations: {
    opportunity: {
      type: 'many-to-one',
      target: 'AiDemandOpportunity',
      joinColumn: { name: 'opportunity_id', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
  },
});
