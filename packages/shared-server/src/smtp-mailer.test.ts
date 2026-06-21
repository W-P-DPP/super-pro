import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSmtpMailer,
  createSmtpMailerFromEnv,
  resolveSmtpMailerConfigFromEnv,
  splitEmailRecipients,
} from './smtp-mailer.ts';

describe('shared-server smtp mailer', () => {
  const sendMail = vi.fn();
  const transportFactory = vi.fn(() => ({
    sendMail,
  }));

  beforeEach(() => {
    sendMail.mockReset();
    transportFactory.mockClear();
  });

  it('creates smtp config from env', () => {
    expect(resolveSmtpMailerConfigFromEnv({
      MAILER_HOST: 'smtp.qq.com',
      MAILER_PORT: '465',
      MAILER_SECURE: 'true',
      MAILER_USER: 'bot@qq.com',
      MAILER_PASS: 'auth-code',
      MAILER_FROM: 'notice@qq.com',
    })).toEqual({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: 'bot@qq.com',
      pass: 'auth-code',
      from: 'notice@qq.com',
    });
  });

  it('returns undefined when smtp env is incomplete', () => {
    expect(createSmtpMailerFromEnv({
      MAILER_HOST: 'smtp.qq.com',
      MAILER_PORT: '465',
    })).toBeUndefined();
  });

  it('sends mail with default sender', async () => {
    const mailer = createSmtpMailer({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: 'bot@qq.com',
      pass: 'auth-code',
      from: 'notice@qq.com',
    }, {
      transportFactory,
    });

    await mailer.sendMail({
      to: ['owner@qq.com'],
      subject: 'test subject',
      text: 'test body',
      replyTo: 'reply@qq.com',
    });

    expect(transportFactory).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
    }));
    expect(sendMail).toHaveBeenCalledWith({
      from: 'notice@qq.com',
      to: ['owner@qq.com'],
      subject: 'test subject',
      text: 'test body',
      replyTo: 'reply@qq.com',
    });
  });

  it('splits recipients with comma and semicolon', () => {
    expect(splitEmailRecipients('owner1@qq.com; owner2@qq.com,owner3@qq.com')).toEqual([
      'owner1@qq.com',
      'owner2@qq.com',
      'owner3@qq.com',
    ]);
  });
});
