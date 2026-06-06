import type { StoredAuthSession } from '@super-pro/shared-types';

type AuthSessionOptions = {
  storageKey: string;
  directTokenStorageKey?: string | false;
  cookieStorageKey?: string | false;
};

const DEFAULT_AUTH_SESSION_COOKIE_KEY = 'super-pro.auth-session';

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

function readCookieValue(cookieKey: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookieEntries = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of cookieEntries) {
    const separatorIndex = entry.indexOf('=');
    const key =
      separatorIndex >= 0 ? entry.slice(0, separatorIndex).trim() : entry.trim();

    if (key !== cookieKey) {
      continue;
    }

    return separatorIndex >= 0 ? entry.slice(separatorIndex + 1) : '';
  }

  return null;
}

function clearAuthSessionCookie(cookieKey: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${cookieKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function readCookieAuthSession(cookieKey: string) {
  const rawValue = readCookieValue(cookieKey)?.trim();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as unknown;
    if (isStoredAuthSession(parsed)) {
      return parsed;
    }
  } catch {}

  clearAuthSessionCookie(cookieKey);
  return null;
}

function writeAuthSessionCookie(cookieKey: string, session: StoredAuthSession) {
  if (typeof document === 'undefined') {
    return;
  }

  const serialized = encodeURIComponent(JSON.stringify(session));
  const expires =
    typeof session.expiresAt === 'number' && Number.isFinite(session.expiresAt)
      ? `; expires=${new Date(session.expiresAt).toUTCString()}`
      : '';

  document.cookie = `${cookieKey}=${serialized}; path=/; SameSite=Lax${expires}`;
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
  const normalizedOptions = {
    directTokenStorageKey: 'token',
    cookieStorageKey: DEFAULT_AUTH_SESSION_COOKIE_KEY,
    ...options,
  } satisfies Omit<Required<AuthSessionOptions>, 'directTokenStorageKey' | 'cookieStorageKey'> & {
    directTokenStorageKey: string | false;
    cookieStorageKey: string | false;
  };

  function writeReusableAuthSession(session: StoredAuthSession) {
    const storage = getStorage();

    if (isExpiredAuthSession(session)) {
      clearReusableAuthSession();
      return null;
    }

    storage?.setItem(normalizedOptions.storageKey, JSON.stringify(session));

    if (normalizedOptions.cookieStorageKey) {
      writeAuthSessionCookie(normalizedOptions.cookieStorageKey, session);
    }

    return session;
  }

  function readReusableAuthSession() {
    const storage = getStorage();
    if (!storage && !normalizedOptions.cookieStorageKey) {
      return null;
    }

    const rawValue = storage?.getItem(normalizedOptions.storageKey);
    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (isStoredAuthSession(parsed) && !isExpiredAuthSession(parsed)) {
          return parsed;
        }
      } catch {}

      storage?.removeItem(normalizedOptions.storageKey);
    }

    if (normalizedOptions.cookieStorageKey) {
      const cookieSession = readCookieAuthSession(normalizedOptions.cookieStorageKey);

      if (cookieSession && !isExpiredAuthSession(cookieSession)) {
        storage?.setItem(normalizedOptions.storageKey, JSON.stringify(cookieSession));
        return cookieSession;
      }

      if (cookieSession) {
        clearAuthSessionCookie(normalizedOptions.cookieStorageKey);
      }
    }

    return null;
  }

  function getReusableAuthToken() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    if (normalizedOptions.directTokenStorageKey) {
      const directToken = storage.getItem(normalizedOptions.directTokenStorageKey)?.trim();
      if (directToken) {
        return directToken;
      }
    }

    return readReusableAuthSession()?.token ?? null;
  }

  function hasReusableAuthToken() {
    return Boolean(getReusableAuthToken());
  }

  function clearReusableAuthSession() {
    const storage = getStorage();
    if (!storage) {
      if (normalizedOptions.cookieStorageKey) {
        clearAuthSessionCookie(normalizedOptions.cookieStorageKey);
      }
      return;
    }

    storage.removeItem(normalizedOptions.storageKey);
    if (normalizedOptions.directTokenStorageKey) {
      storage.removeItem(normalizedOptions.directTokenStorageKey);
    }

    if (normalizedOptions.cookieStorageKey) {
      clearAuthSessionCookie(normalizedOptions.cookieStorageKey);
    }
  }

  return {
    readReusableAuthSession,
    writeReusableAuthSession,
    getReusableAuthToken,
    hasReusableAuthToken,
    clearReusableAuthSession,
  };
}
