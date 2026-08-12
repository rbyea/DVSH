const PUBLIC_NOTICE_KEY = 'dvsh_public_pdn_notice_v1';
const LEGACY_PUBLIC_NOTICE_PREFIX = 'dvsh_public_pdn_notice_';

/** Persists across sessions so the client is not asked again on every visit. */
export function hasAcceptedPublicPdnNotice(token?: string): boolean {
  try {
    if (localStorage.getItem(PUBLIC_NOTICE_KEY) === '1') {
      return true;
    }

    // Migrate old per-link session flag once.
    if (token && sessionStorage.getItem(`${LEGACY_PUBLIC_NOTICE_PREFIX}${token}`) === '1') {
      localStorage.setItem(PUBLIC_NOTICE_KEY, '1');
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function acceptPublicPdnNotice(_token?: string): void {
  try {
    localStorage.setItem(PUBLIC_NOTICE_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}
