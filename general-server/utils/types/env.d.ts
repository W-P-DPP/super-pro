declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
    JWT_ENABLED: string;
    JWT_SECRET: string;
    REDIS_URL?: string;
    FILE_ROOT_PATH?: string;
    RUBBISH_ROOT_PATH?: string;
    FILE_UPLOAD_CHUNK_ROOT_PATH?: string;
    MAILER_HOST?: string;
    MAILER_PORT?: string;
    MAILER_SECURE?: string;
    MAILER_USER?: string;
    MAILER_PASS?: string;
    MAILER_FROM?: string;
    MAILER_ALERT_TO?: string;
    EXCEPTION_EMAIL_TO?: string;
    CONTACT_FORM_EMAIL_TO?: string;
    CONTACT_FORM_EMAIL_SUBJECT_PREFIX?: string;
    LOGIN_PASSWORD_PUBLIC_KEY?: string;
    LOGIN_PASSWORD_PRIVATE_KEY?: string;
  }
}
