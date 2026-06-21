import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../app.ts';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';

type ContactRow = {
  id: number
  name: string
  email: string
  subject: string
  message: string
  source_url: string
  source_name: string
  ip: string
  user_agent: string
  mail_status: string
  mail_sent_at: Date | string | null
  mail_error: string | null
  create_by: string | null
  create_time: Date | string | null
  update_by: string | null
  update_time: Date | string | null
  remark: string | null
}

const CONTACT_TABLE_NAME = 'resume_contact_message';
const CONTACT_TABLE_COLUMNS = [
  'id',
  'name',
  'email',
  'subject',
  'message',
  'source_url',
  'source_name',
  'ip',
  'user_agent',
  'mail_status',
  'mail_sent_at',
  'mail_error',
  'create_by',
  'create_time',
  'update_by',
  'update_time',
  'remark',
].join(', ');

let app: Express;
let originalRows: ContactRow[] = [];

async function getContactRows(): Promise<ContactRow[]> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  return dataSource.query(
    `SELECT ${CONTACT_TABLE_COLUMNS} FROM ${CONTACT_TABLE_NAME} ORDER BY id ASC`,
  ) as Promise<ContactRow[]>;
}

async function clearContactTable(): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  await dataSource.query(`DELETE FROM ${CONTACT_TABLE_NAME}`);
}

async function insertContactRows(rows: ContactRow[]): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  for (const row of rows) {
    await dataSource.query(
      `
        REPLACE INTO ${CONTACT_TABLE_NAME}
          (${CONTACT_TABLE_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.name,
        row.email,
        row.subject,
        row.message,
        row.source_url,
        row.source_name,
        row.ip,
        row.user_agent,
        row.mail_status,
        row.mail_sent_at,
        row.mail_error,
        row.create_by,
        row.create_time,
        row.update_by,
        row.update_time,
        row.remark,
      ],
    );
  }
}

beforeAll(async () => {
  await initDataBase();
  app = createApp();
  originalRows = await getContactRows();
});

beforeEach(async () => {
  process.env.JWT_ENABLED = 'false';
  await clearContactTable();
});

afterAll(async () => {
  await clearContactTable();
  await insertContactRows(originalRows);
  process.env.JWT_ENABLED = 'false';
  const dataSource = getDataSource();
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

describe('contact anonymous api', () => {
  it('POST /api/contact/submitMessage 应匿名保存记录并标记邮件已发送', async () => {
    const res = await request(app)
      .post('/api/contact/submitMessage')
      .set('User-Agent', 'integration-test-agent')
      .send({
        name: '张三',
        email: 'zhangsan@example.com',
        subject: '合作咨询',
        message: '这里是一条新的联系方式消息。',
        sourceUrl: 'http://127.0.0.1:19697/resume',
        sourceName: 'resume-template',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '提交联系方式成功',
      data: expect.objectContaining({
        id: expect.any(Number),
        name: '张三',
        email: 'zhangsan@example.com',
        subject: '合作咨询',
        mailStatus: 'sent',
      }),
    });

    const rows = await getContactRows();
    expect(rows).toEqual([
      expect.objectContaining({
        name: '张三',
        email: 'zhangsan@example.com',
        subject: '合作咨询',
        source_name: 'resume-template',
        mail_status: 'sent',
        ip: expect.any(String),
        user_agent: 'integration-test-agent',
      }),
    ]);
  });

  it('开启 JWT 后联系方式提交接口仍允许匿名访问', async () => {
    process.env.JWT_ENABLED = 'true';

    const res = await request(app)
      .post('/api/contact/submitMessage')
      .send({
        name: '李四',
        email: 'lisi@example.com',
        subject: '匿名提交',
        message: 'JWT 打开后也应该允许匿名提交。',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '提交联系方式成功',
    });
  });

  it('参数错误时应返回中文校验错误', async () => {
    const res = await request(app)
      .post('/api/contact/submitMessage')
      .send({
        name: '王五',
        email: 'invalid-email',
        subject: '测试',
        message: '测试消息',
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      msg: '联系邮箱格式不正确',
    });
  });
});
