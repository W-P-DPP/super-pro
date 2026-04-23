import { EntitySchema } from 'typeorm';
import type { AiDemandProblemCluster } from '@super-pro/ai-demand-contracts';

export class ProblemClusterEntity implements AiDemandProblemCluster {
  id!: string;
  title!: string;
  summary!: string;
  cluster_key!: string;
  size!: number;
  confidence_score!: number;
  status!: 'pending' | 'ready' | 'brief_pending' | 'archived';
  representative_signal_ids!: string[];
  generated_by_run_id!: string | null;
}

export const ProblemClusterEntitySchema = new EntitySchema<ProblemClusterEntity>({
  name: 'AiDemandProblemCluster',
  target: ProblemClusterEntity,
  tableName: 'problem_cluster',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    title: { name: 'title', type: String, length: 255, nullable: false },
    summary: { name: 'summary', type: 'text', nullable: false },
    cluster_key: {
      name: 'cluster_key',
      type: String,
      length: 191,
      nullable: false,
    },
    size: { name: 'size', type: Number, nullable: false, default: 0 },
    confidence_score: {
      name: 'confidence_score',
      type: 'decimal',
      precision: 5,
      scale: 4,
      nullable: false,
      default: 0,
    },
    status: {
      name: 'status',
      type: String,
      length: 32,
      nullable: false,
      default: 'pending',
    },
    representative_signal_ids: {
      name: 'representative_signal_ids',
      type: 'json',
      nullable: false,
    },
    generated_by_run_id: {
      name: 'generated_by_run_id',
      type: String,
      length: 64,
      nullable: true,
    },
  },
  indices: [
    { name: 'uq_problem_cluster_cluster_key', columns: ['cluster_key'], unique: true },
    { name: 'idx_problem_cluster_status', columns: ['status'] },
    { name: 'idx_problem_cluster_generated_by_run_id', columns: ['generated_by_run_id'] },
  ],
  relations: {
    generatedByRun: {
      type: 'many-to-one',
      target: 'AiDemandWorkflowRun',
      joinColumn: { name: 'generated_by_run_id', referencedColumnName: 'id' },
      onDelete: 'RESTRICT',
    },
  },
});
