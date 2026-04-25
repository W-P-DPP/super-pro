import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class ContactMessageEntity extends BaseEntity {
  id!: number
  name!: string
  email!: string
  subject!: string
  message!: string
  sourceUrl!: string
  sourceName!: string
  ip!: string
  userAgent!: string
  mailStatus!: string
  mailSentAt?: Date | string | null
  mailError?: string | null
}

export const ContactMessageEntitySchema = new EntitySchema<ContactMessageEntity>({
  name: 'ContactMessage',
  target: ContactMessageEntity,
  tableName: 'resume_contact_message',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    name: {
      name: 'name',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '联系人姓名',
    },
    email: {
      name: 'email',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '联系人邮箱',
    },
    subject: {
      name: 'subject',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '主题',
    },
    message: {
      name: 'message',
      type: 'text',
      nullable: false,
      comment: '消息内容',
    },
    sourceUrl: {
      name: 'source_url',
      type: String,
      length: 512,
      nullable: false,
      default: '',
      comment: '来源页面',
    },
    sourceName: {
      name: 'source_name',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '来源名称',
    },
    ip: {
      name: 'ip',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '来源 IP',
    },
    userAgent: {
      name: 'user_agent',
      type: String,
      length: 512,
      nullable: false,
      default: '',
      comment: '浏览器 UA',
    },
    mailStatus: {
      name: 'mail_status',
      type: String,
      length: 32,
      nullable: false,
      default: 'pending',
      comment: '邮件状态',
    },
    mailSentAt: {
      name: 'mail_sent_at',
      type: 'datetime',
      nullable: true,
      comment: '邮件发送时间',
    },
    mailError: {
      name: 'mail_error',
      type: 'text',
      nullable: true,
      comment: '邮件失败原因',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_resume_contact_message_create_time',
      columns: ['createTime'],
    },
    {
      name: 'idx_resume_contact_message_mail_status',
      columns: ['mailStatus'],
    },
  ],
});
