const PUBLIC_NOTICE_PREFIX = 'dvsh_public_pdn_notice_';

export function hasAcceptedPublicPdnNotice(token: string): boolean {
  try {
    return sessionStorage.getItem(`${PUBLIC_NOTICE_PREFIX}${token}`) === '1';
  } catch {
    return false;
  }
}

export function acceptPublicPdnNotice(token: string): void {
  try {
    sessionStorage.setItem(`${PUBLIC_NOTICE_PREFIX}${token}`, '1');
  } catch {
    // ignore
  }
}
