import type { DataSource, EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { ContactMessageEntity } from './contact.entity.ts';

export interface CreateContactMessageEntityInput {
  name: string
  email: string
  subject: string
  message: string
  sourceUrl: string
  sourceName: string
  ip: string
  userAgent: string
}

export interface UpdateContactMessageMailStatusInput {
  mailStatus: string
  mailSentAt?: Date | null
  mailError?: string | null
}

export interface ContactRepositoryPort {
  createMessage(input: CreateContactMessageEntityInput): Promise<ContactMessageEntity | null>
  updateMailStatus(
    id: number,
    input: UpdateContactMessageMailStatusInput,
  ): Promise<ContactMessageEntity | null>
}

let ensureTablePromise: Promise<void> | null = null;

async function ensureContactMessageTable(dataSource: DataSource) {
  if (ensureTablePromise) {
    return ensureTablePromise;
  }

  ensureTablePromise = dataSource.query(`
    CREATE TABLE IF NOT EXISTS resume_contact_message (
      id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
      name VARCHAR(64) NOT NULL DEFAULT '' COMMENT '联系人姓名',
      email VARCHAR(128) NOT NULL DEFAULT '' COMMENT '联系人邮箱',
      subject VARCHAR(128) NOT NULL DEFAULT '' COMMENT '主题',
      message TEXT NOT NULL COMMENT '消息内容',
      source_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '来源页面',
      source_name VARCHAR(128) NOT NULL DEFAULT '' COMMENT '来源名称',
      ip VARCHAR(64) NOT NULL DEFAULT '' COMMENT '来源 IP',
      user_agent VARCHAR(512) NOT NULL DEFAULT '' COMMENT '浏览器 UA',
      mail_status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '邮件状态',
      mail_sent_at DATETIME NULL COMMENT '邮件发送时间',
      mail_error TEXT NULL COMMENT '邮件失败原因',
      create_by VARCHAR(64) NULL COMMENT '创建者',
      create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_by VARCHAR(64) NULL COMMENT '更新者',
      update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      remark VARCHAR(255) NULL COMMENT '备注',
      PRIMARY KEY (id),
      KEY idx_resume_contact_message_create_time (create_time),
      KEY idx_resume_contact_message_mail_status (mail_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历联系方式记录表'
  `)
    .then(() => {
      ensureTablePromise = null;
    })
    .catch((error) => {
      ensureTablePromise = null;
      throw error;
    });

  return ensureTablePromise;
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    await ensureContactMessageTable(current);
    return current;
  }

  const dataSource = await initDataBase();
  await ensureContactMessageTable(dataSource);
  return dataSource;
}

export class ContactRepository implements ContactRepositoryPort {
  private async getRepository(manager?: EntityManager): Promise<Repository<ContactMessageEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      return dataSource.getRepository(ContactMessageEntity);
    }

    return manager.getRepository(ContactMessageEntity);
  }

  async createMessage(input: CreateContactMessageEntityInput): Promise<ContactMessageEntity | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      sourceUrl: input.sourceUrl,
      sourceName: input.sourceName,
      ip: input.ip,
      userAgent: input.userAgent,
      mailStatus: 'pending',
      createBy: 'anonymous-contact',
      updateBy: 'anonymous-contact',
    });

    const saved = await repository.save(entity);
    return repository.findOne({
      where: { id: saved.id },
    });
  }

  async updateMailStatus(
    id: number,
    input: UpdateContactMessageMailStatusInput,
  ): Promise<ContactMessageEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    current.mailStatus = input.mailStatus;
    current.mailSentAt = Object.prototype.hasOwnProperty.call(input, 'mailSentAt')
      ? (input.mailSentAt ?? null)
      : current.mailSentAt;
    current.mailError = Object.prototype.hasOwnProperty.call(input, 'mailError')
      ? (input.mailError ?? null)
      : current.mailError;
    current.updateBy = 'anonymous-contact';

    await repository.save(current);
    return repository.findOne({
      where: { id },
    });
  }
}

export const contactRepository = new ContactRepository();
