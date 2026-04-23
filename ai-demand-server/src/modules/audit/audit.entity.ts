import { EntitySchema } from 'typeorm';
import type { AiDemandAuditEvent } from '@super-pro/ai-demand-contracts';
import { dateTimeStringTransformer } from '../shared/entity-support.ts';

export class AuditEventEntity implements AiDemandAuditEvent {
  id!: string;
  object_type!: AiDemandAuditEvent['object_type'];
  object_id!: string;
  event_type!: string;
  event_payload!: AiDemandAuditEvent['event_payload'];
  actor_type!: 'system' | 'human' | 'model';
  actor_id!: string | null;
  created_at!: string;
}

export const AuditEventEntitySchema = new EntitySchema<AuditEventEntity>({
  name: 'AiDemandAuditEvent',
  target: AuditEventEntity,
  tableName: 'audit_event',
  columns: {
    id: { name: 'id', type: String, length: 64, primary: true },
    object_type: {
      name: 'object_type',
      type: String,
      length: 64,
      nullable: false,
    },
    object_id: { name: 'object_id', type: String, length: 64, nullable: false },
    event_type: {
      name: 'event_type',
      type: String,
      length: 128,
      nullable: false,
    },
    event_payload: { name: 'event_payload', type: 'json', nullable: false },
    actor_type: {
      name: 'actor_type',
      type: String,
      length: 16,
      nullable: false,
    },
    actor_id: { name: 'actor_id', type: String, length: 128, nullable: true },
    created_at: {
      name: 'created_at',
      type: 'datetime',
      nullable: false,
      transformer: dateTimeStringTransformer,
    },
  },
  indices: [
    { name: 'idx_audit_event_object', columns: ['object_type', 'object_id'] },
    { name: 'idx_audit_event_type', columns: ['event_type'] },
    { name: 'idx_audit_event_created_at', columns: ['created_at'] },
  ],
});
