const COOKIE_CONSENT_KEY = 'dvsh_cookie_consent_v1';

export function hasAcceptedCookieConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function acceptCookieConsent(): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}
