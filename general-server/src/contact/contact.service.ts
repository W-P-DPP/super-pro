import {
  createSmtpMailerFromEnv,
  splitEmailRecipients,
} from '@super-pro/shared-server';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  ContactMessageResponseDto,
  ContactValidationErrorContextDto,
  SubmitContactMessageRequestDto,
} from './contact.dto.ts';
import type { ContactMessageEntity } from './contact.entity.ts';
import {
  contactRepository,
  type ContactRepositoryPort,
} from './contact.repository.ts';

const DEFAULT_SOURCE_NAME = 'resume-template';
const DEFAULT_SUBJECT_PREFIX = '[resume-contact]';

type ContactNotificationMailer = {
  sendMail: (message: {
    to: string | string[]
    subject: string
    text: string
    replyTo?: string
  }) => Promise<unknown> | unknown
};

type ContactServiceOptions = {
  repository?: ContactRepositoryPort
  getMailer?: () => ContactNotificationMailer | undefined
  getRecipients?: () => string[]
  getSubjectPrefix?: () => string
};

export class ContactBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: ContactValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ContactBusinessError';
  }
}

function ensureString(
  value: unknown,
  field: string,
  label: string,
  options: {
    maxLength?: number
  } = {},
) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ContactBusinessError(
      `${label}不能为空`,
      {
        nodePath: 'contact',
        field,
        reason: `${label}必须是非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalized = value.trim();
  if (options.maxLength && normalized.length > options.maxLength) {
    throw new ContactBusinessError(
      `${label}长度不能超过 ${options.maxLength} 个字符`,
      {
        nodePath: 'contact',
        field,
        reason: `${label}长度超出限制`,
        value: normalized.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalized;
}

function normalizeOptionalString(
  value: unknown,
  field: string,
  label: string,
  options: {
    maxLength?: number
    fallback?: string
  } = {},
) {
  if (value === undefined || value === null || value === '') {
    return options.fallback ?? '';
  }

  if (typeof value !== 'string') {
    throw new ContactBusinessError(
      `${label}必须是字符串`,
      {
        nodePath: 'contact',
        field,
        reason: `${label}必须是字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalized = value.trim();
  if (options.maxLength && normalized.length > options.maxLength) {
    throw new ContactBusinessError(
      `${label}长度不能超过 ${options.maxLength} 个字符`,
      {
        nodePath: 'contact',
        field,
        reason: `${label}长度超出限制`,
        value: normalized.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalized;
}

function ensureEmail(value: unknown) {
  const email = ensureString(value, 'email', '联系邮箱', {
    maxLength: 128,
  });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ContactBusinessError(
      '联系邮箱格式不正确',
      {
        nodePath: 'contact',
        field: 'email',
        reason: '联系邮箱必须符合标准邮箱格式',
        value: email,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return email;
}

function normalizeDateTime(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return undefined;
}

function toResponseDto(entity: ContactMessageEntity): ContactMessageResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    subject: entity.subject,
    message: entity.message,
    sourceUrl: entity.sourceUrl,
    sourceName: entity.sourceName,
    mailStatus: entity.mailStatus,
    ...(normalizeDateTime(entity.createTime) ? { createTime: normalizeDateTime(entity.createTime) } : {}),
  };
}

function validateSubmitInput(
  input: SubmitContactMessageRequestDto | Record<string, unknown>,
): SubmitContactMessageRequestDto {
  return {
    name: ensureString(input.name, 'name', '姓名', {
      maxLength: 64,
    }),
    email: ensureEmail(input.email),
    subject: ensureString(input.subject, 'subject', '主题', {
      maxLength: 128,
    }),
    message: ensureString(input.message, 'message', '消息内容', {
      maxLength: 2048,
    }),
    sourceUrl: normalizeOptionalString(input.sourceUrl, 'sourceUrl', '来源页面', {
      maxLength: 512,
    }),
    sourceName: normalizeOptionalString(input.sourceName, 'sourceName', '来源名称', {
      maxLength: 128,
      fallback: DEFAULT_SOURCE_NAME,
    }),
    ip: normalizeOptionalString(input.ip, 'ip', '来源 IP', {
      maxLength: 64,
    }),
    userAgent: normalizeOptionalString(input.userAgent, 'userAgent', '浏览器标识', {
      maxLength: 512,
    }),
  };
}

function buildNotificationText(entity: ContactMessageEntity) {
  return [
    '收到一条新的简历联系方式提交记录',
    '',
    `记录 ID: ${entity.id}`,
    `姓名: ${entity.name}`,
    `邮箱: ${entity.email}`,
    `主题: ${entity.subject}`,
    `来源名称: ${entity.sourceName || '-'}`,
    `来源页面: ${entity.sourceUrl || '-'}`,
    `来源 IP: ${entity.ip || '-'}`,
    `浏览器标识: ${entity.userAgent || '-'}`,
    `提交时间: ${normalizeDateTime(entity.createTime) ?? '-'}`,
    '',
    '消息内容:',
    entity.message,
  ].join('\n');
}

function createDefaultMailer() {
  const mailer = createSmtpMailerFromEnv(process.env);
  if (mailer) {
    return mailer;
  }

  if (process.env.NODE_ENV === 'test') {
    return {
      async sendMail() {
        return undefined;
      },
    } satisfies ContactNotificationMailer;
  }

  return undefined;
}

function resolveDefaultRecipients() {
  const recipients = splitEmailRecipients(
    process.env.CONTACT_FORM_EMAIL_TO
    ?? process.env.EXCEPTION_EMAIL_TO
    ?? process.env.MAILER_ALERT_TO
    ?? process.env.MAILER_USER,
  );

  if (recipients.length > 0) {
    return recipients;
  }

  if (process.env.NODE_ENV === 'test') {
    return ['test@example.com'];
  }

  return [];
}

function resolveSubjectPrefix() {
  return process.env.CONTACT_FORM_EMAIL_SUBJECT_PREFIX?.trim() || DEFAULT_SUBJECT_PREFIX;
}

export class ContactService {
  private readonly repository: ContactRepositoryPort;
  private readonly getMailer: () => ContactNotificationMailer | undefined;
  private readonly getRecipients: () => string[];
  private readonly getSubjectPrefix: () => string;

  constructor(options: ContactServiceOptions = {}) {
    this.repository = options.repository ?? contactRepository;
    this.getMailer = options.getMailer ?? createDefaultMailer;
    this.getRecipients = options.getRecipients ?? resolveDefaultRecipients;
    this.getSubjectPrefix = options.getSubjectPrefix ?? resolveSubjectPrefix;
  }

  async submitMessage(
    input: SubmitContactMessageRequestDto | Record<string, unknown>,
  ): Promise<ContactMessageResponseDto> {
    const payload = validateSubmitInput(input);
    const saved = await this.repository.createMessage({
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      message: payload.message,
      sourceUrl: payload.sourceUrl ?? '',
      sourceName: payload.sourceName ?? DEFAULT_SOURCE_NAME,
      ip: payload.ip ?? '',
      userAgent: payload.userAgent ?? '',
    });

    if (!saved) {
      throw new ContactBusinessError(
        '保存联系方式记录失败',
        {
          nodePath: 'contact',
          field: 'create',
          reason: '联系方式记录创建失败',
        },
        HttpStatus.ERROR,
      );
    }

    const mailer = this.getMailer();
    const recipients = this.getRecipients();
    if (!mailer || recipients.length === 0) {
      await this.repository.updateMailStatus(saved.id, {
        mailStatus: 'failed',
        mailError: 'contact mailer is not configured',
        mailSentAt: null,
      });

      throw new ContactBusinessError(
        '联系方式已保存，但邮件通知配置缺失',
        {
          nodePath: 'contact',
          field: 'mailer',
          reason: '联系表单邮件通知未配置',
        },
        HttpStatus.ERROR,
      );
    }

    try {
      await mailer.sendMail({
        to: recipients,
        subject: `${this.getSubjectPrefix()} ${saved.subject}`,
        text: buildNotificationText(saved),
        replyTo: saved.email,
      });

      const updated = await this.repository.updateMailStatus(saved.id, {
        mailStatus: 'sent',
        mailSentAt: new Date(),
        mailError: null,
      });

      return toResponseDto(updated ?? Object.assign(saved, {
        mailStatus: 'sent',
      }));
    } catch (error) {
      await this.repository.updateMailStatus(saved.id, {
        mailStatus: 'failed',
        mailSentAt: null,
        mailError: error instanceof Error ? error.message : String(error),
      });

      throw new ContactBusinessError(
        '联系方式已保存，但邮件通知发送失败',
        {
          nodePath: 'contact',
          field: 'mail',
          reason: '联系表单通知邮件发送失败',
        },
        HttpStatus.ERROR,
      );
    }
  }
}

export const contactService = new ContactService();
