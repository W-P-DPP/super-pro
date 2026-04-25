import { jest } from '@jest/globals';
import type {
  ContactRepositoryPort,
  CreateContactMessageEntityInput,
  UpdateContactMessageMailStatusInput,
} from '../../src/contact/contact.repository.ts';
import { ContactMessageEntity } from '../../src/contact/contact.entity.ts';
import {
  ContactBusinessError,
  ContactService,
} from '../../src/contact/contact.service.ts';

function cloneEntity(entity: ContactMessageEntity) {
  return Object.assign(new ContactMessageEntity(), entity);
}

function createRepositoryMock(records: ContactMessageEntity[]): ContactRepositoryPort {
  return {
    async createMessage(input: CreateContactMessageEntityInput) {
      const entity = Object.assign(new ContactMessageEntity(), {
        id: 99,
        ...input,
        mailStatus: 'pending',
        createTime: '2026-04-25 10:00:00',
      });
      records.push(entity);
      return cloneEntity(entity);
    },
    async updateMailStatus(id: number, input: UpdateContactMessageMailStatusInput) {
      const current = records.find((record) => record.id === id);
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

      return cloneEntity(current);
    },
  };
}

describe('ContactService', () => {
  it('提交成功时应保存记录并标记邮件已发送', async () => {
    const records: ContactMessageEntity[] = [];
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const service = new ContactService({
      repository: createRepositoryMock(records),
      getMailer: () => ({
        sendMail,
      }),
      getRecipients: () => ['owner@example.com'],
      getSubjectPrefix: () => '[resume-contact]',
    });

    const result = await service.submitMessage({
      name: '张三',
      email: 'zhangsan@example.com',
      subject: '合作咨询',
      message: '你好，我想了解合作机会。',
      sourceUrl: 'https://example.com/resume',
      sourceName: 'resume-template',
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });

    expect(result).toEqual(expect.objectContaining({
      id: 99,
      name: '张三',
      email: 'zhangsan@example.com',
      subject: '合作咨询',
      mailStatus: 'sent',
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: ['owner@example.com'],
      subject: '[resume-contact] 合作咨询',
      replyTo: 'zhangsan@example.com',
      text: expect.stringContaining('记录 ID: 99'),
    }));
    expect(records[0]).toMatchObject({
      id: 99,
      mailStatus: 'sent',
    });
  });

  it('邮件发送失败时应保留数据库记录并返回中文错误', async () => {
    const records: ContactMessageEntity[] = [];
    const service = new ContactService({
      repository: createRepositoryMock(records),
      getMailer: () => ({
        sendMail: jest.fn().mockRejectedValue(new Error('smtp failed')),
      }),
      getRecipients: () => ['owner@example.com'],
    });

    await expect(service.submitMessage({
      name: '李四',
      email: 'lisi@example.com',
      subject: '测试',
      message: '测试消息',
    })).rejects.toMatchObject<Partial<ContactBusinessError>>({
      message: '联系方式已保存，但邮件通知发送失败',
    });

    expect(records[0]).toMatchObject({
      id: 99,
      mailStatus: 'failed',
      mailError: 'smtp failed',
    });
  });

  it('邮箱格式非法时应返回 400 错误', async () => {
    const service = new ContactService({
      repository: createRepositoryMock([]),
      getMailer: () => undefined,
      getRecipients: () => [],
    });

    await expect(service.submitMessage({
      name: '王五',
      email: 'invalid-email',
      subject: '测试',
      message: '测试消息',
    })).rejects.toMatchObject<Partial<ContactBusinessError>>({
      statusCode: 400,
      message: '联系邮箱格式不正确',
    });
  });
});
