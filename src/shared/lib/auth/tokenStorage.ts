const SESSION_COOKIE = 'dvsh_session';
const LEGACY_STORAGE_KEY = 'dvsh_access_token';
const SESSION_MAX_AGE_SEC = 20160 * 60;

function readCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;

  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();

    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
}

function writeSessionCookie(): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function deleteSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function dropLegacyLocalToken(): void {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Private mode / disabled storage
  }
}

dropLegacyLocalToken();

export function getAccessToken(): string | null {
  return readCookie(SESSION_COOKIE) === '1' ? '1' : null;
}

export function setAccessToken(_token?: string): void {
  dropLegacyLocalToken();
  writeSessionCookie();
}

export function clearAccessToken(): void {
  dropLegacyLocalToken();
  deleteSessionCookie();
}

export function hasAccessToken(): boolean {
  return readCookie(SESSION_COOKIE) === '1';
}
