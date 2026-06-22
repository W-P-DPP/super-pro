import type { StoredAuthSession } from '@super-pro/shared-types';

type AuthSessionOptions = {
  storageKey: string;
  directTokenStorageKey?: string | false;
  cookieStorageKey?: string | false;
  enableQueryHandoff?: boolean;
  enableWindowNameHandoff?: boolean;
  storageMode?: 'hybrid' | 'cookie';
};

const DEFAULT_AUTH_SESSION_COOKIE_KEY = 'super-pro.auth-session';
const AUTH_HANDOFF_KEY = 'super-pro.auth-handoff';
const QUERY_AUTH_HANDOFF_PARAM = 'spauth';

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

function parseAuthHandoffPayload(rawValue: string | null | undefined) {
  const trimmedValue = rawValue?.trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const payload = parsed as Record<string, unknown>;
    if (payload.key !== AUTH_HANDOFF_KEY || !isStoredAuthSession(payload.session)) {
      return null;
    }

    return payload.session;
  } catch {
    return null;
  }
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
    enableQueryHandoff: false,
    enableWindowNameHandoff: false,
    storageMode: 'hybrid',
    ...options,
  } satisfies Omit<
    Required<AuthSessionOptions>,
    'directTokenStorageKey' | 'cookieStorageKey'
  > & {
    directTokenStorageKey: string | false;
    cookieStorageKey: string | false;
  };

  function consumeQueryAuthHandoff() {
    if (!normalizedOptions.enableQueryHandoff || typeof window === 'undefined') {
      return null;
    }

    const rawHandoff = new URLSearchParams(window.location.search).get(
      QUERY_AUTH_HANDOFF_PARAM,
    );
    const session = parseAuthHandoffPayload(rawHandoff);
    if (!session) {
      return null;
    }

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete(QUERY_AUTH_HANDOFF_PARAM);
    const nextSearch = searchParams.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;

    window.history?.replaceState?.(null, '', nextUrl);
    return writeReusableAuthSession(session);
  }

  function consumeWindowNameAuthHandoff() {
    if (!normalizedOptions.enableWindowNameHandoff || typeof window === 'undefined') {
      return null;
    }

    const session = parseAuthHandoffPayload(window.name);
    if (!session) {
      return null;
    }

    window.name = '';
    return writeReusableAuthSession(session);
  }

  function clearLegacyLocalAuthArtifacts(storage: Storage | null) {
    if (!storage) {
      return;
    }

    storage.removeItem(normalizedOptions.storageKey);
    storage.removeItem(
      normalizedOptions.directTokenStorageKey || 'token',
    );
  }

  function writeReusableAuthSession(session: StoredAuthSession) {
    const storage = getStorage();

    if (isExpiredAuthSession(session)) {
      clearReusableAuthSession();
      return null;
    }

    if (normalizedOptions.storageMode === 'cookie') {
      clearLegacyLocalAuthArtifacts(storage);
    } else {
      storage?.setItem(normalizedOptions.storageKey, JSON.stringify(session));
    }

    if (normalizedOptions.cookieStorageKey) {
      writeAuthSessionCookie(normalizedOptions.cookieStorageKey, session);
    }

    return session;
  }

  function readReusableAuthSession() {
    const handoffSession = consumeQueryAuthHandoff() ?? consumeWindowNameAuthHandoff();
    if (handoffSession) {
      return handoffSession;
    }

    const storage = getStorage();
    if (
      !normalizedOptions.cookieStorageKey &&
      normalizedOptions.storageMode === 'cookie'
    ) {
      clearLegacyLocalAuthArtifacts(storage);
      return null;
    }

    if (!storage && !normalizedOptions.cookieStorageKey) {
      return null;
    }

    if (normalizedOptions.cookieStorageKey) {
      const cookieSession = readCookieAuthSession(normalizedOptions.cookieStorageKey);

      if (cookieSession && !isExpiredAuthSession(cookieSession)) {
        if (normalizedOptions.storageMode === 'cookie') {
          clearLegacyLocalAuthArtifacts(storage);
        } else {
          storage?.setItem(normalizedOptions.storageKey, JSON.stringify(cookieSession));
        }
        return cookieSession;
      }

      if (cookieSession) {
        clearAuthSessionCookie(normalizedOptions.cookieStorageKey);
      }
    }

    if (normalizedOptions.storageMode === 'cookie') {
      clearLegacyLocalAuthArtifacts(storage);
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

    if (normalizedOptions.directTokenStorageKey) {
      const directToken = storage?.getItem(normalizedOptions.directTokenStorageKey)?.trim();
      if (directToken) {
        return {
          token: directToken,
          tokenType: 'Bearer' as const,
        };
      }
    }

    return null;
  }

  function getReusableAuthToken() {
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

    clearLegacyLocalAuthArtifacts(storage);

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
