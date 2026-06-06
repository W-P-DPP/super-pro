import type { StoredAuthSession } from '@super-pro/shared-types';

type AuthSessionOptions = {
  storageKey: string;
  directTokenStorageKey?: string;
};

function isExpiredAuthSession(session: StoredAuthSession) {
  return (
    typeof session.expiresAt === 'number' &&
    Number.isFinite(session.expiresAt) &&
    session.expiresAt <= Date.now()
  );
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    candidate.tokenType === 'Bearer' &&
    (candidate.expiresAt == null || typeof candidate.expiresAt === 'number')
  );
}

export function createAuthSessionStore(options: AuthSessionOptions) {
  const normalizedOptions: Required<AuthSessionOptions> = {
    directTokenStorageKey: 'token',
    ...options,
  };

  function readReusableAuthSession() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    const rawValue = storage.getItem(normalizedOptions.storageKey);
    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (isStoredAuthSession(parsed) && !isExpiredAuthSession(parsed)) {
          return parsed;
        }
      } catch {}

      storage.removeItem(normalizedOptions.storageKey);
    }

    return null;
  }

  function getReusableAuthToken() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    const directToken = storage.getItem(normalizedOptions.directTokenStorageKey)?.trim();
    if (directToken) {
      return directToken;
    }

    return readReusableAuthSession()?.token ?? null;
  }

  function hasReusableAuthToken() {
    return Boolean(getReusableAuthToken());
  }

  function clearReusableAuthSession() {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(normalizedOptions.storageKey);
    storage.removeItem(normalizedOptions.directTokenStorageKey);
  }

  return {
    readReusableAuthSession,
    getReusableAuthToken,
    hasReusableAuthToken,
    clearReusableAuthSession,
  };
}
