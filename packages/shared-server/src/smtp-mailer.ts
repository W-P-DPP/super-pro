import { createRequire } from 'node:module';

export type MailMessage = {
  from?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export type MailTransport = {
  sendMail: (message: MailMessage) => Promise<unknown> | unknown;
};

export type MailTransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}) => MailTransport;

export type SmtpMailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

type EnvLike = Record<string, string | undefined>;

const require = createRequire(import.meta.url);

function parseBoolean(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function splitEmailRecipients(value: string | undefined) {
  return (value ?? '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createNodeMailerTransportFactory(): MailTransportFactory {
  return (options) => {
    const nodemailer = require('nodemailer') as {
      createTransport: MailTransportFactory;
    };

    return nodemailer.createTransport(options);
  };
}

export function createSmtpMailer(
  config: SmtpMailerConfig,
  options: {
    transportFactory?: MailTransportFactory;
  } = {},
) {
  const transport = (options.transportFactory ?? createNodeMailerTransportFactory())({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return {
    async sendMail(message: MailMessage) {
      await transport.sendMail({
        ...message,
        from: message.from ?? config.from,
      });
    },
  };
}

export function resolveSmtpMailerConfigFromEnv(env: EnvLike = process.env) {
  const host = env.MAILER_HOST?.trim();
  const port = Number(env.MAILER_PORT);
  const user = env.MAILER_USER?.trim();
  const pass = env.MAILER_PASS?.trim();

  if (!host || !Number.isFinite(port) || !user || !pass) {
    return undefined;
  }

  return {
    host,
    port,
    secure: parseBoolean(env.MAILER_SECURE) ?? port === 465,
    user,
    pass,
    from: env.MAILER_FROM?.trim() || user,
  } satisfies SmtpMailerConfig;
}

export function createSmtpMailerFromEnv(
  env: EnvLike = process.env,
  options: {
    transportFactory?: MailTransportFactory;
  } = {},
) {
  const config = resolveSmtpMailerConfigFromEnv(env);
  if (!config) {
    return undefined;
  }

  return createSmtpMailer(config, options);
}
