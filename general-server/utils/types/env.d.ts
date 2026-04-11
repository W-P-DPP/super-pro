declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    NODE_ENV: 'development' | 'production';
    JWT_ENABLED: string;
    JWT_SECRET: string;
    LOGIN_PASSWORD_PUBLIC_KEY?: string;
    LOGIN_PASSWORD_PRIVATE_KEY?: string;
  }
}
