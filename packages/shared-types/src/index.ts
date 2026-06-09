export type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

export type StoredAuthSession = {
  token: string;
  tokenType: 'Bearer';
  expiresAt?: number;
};

export * from './admin-menu.ts';
export * from './auth.ts';
export * from './screen.ts';
export * from './todo.ts';
