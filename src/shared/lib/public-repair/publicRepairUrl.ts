export function getPublicRepairPath(token: string): string {
  return `/public/repairs/${token}`;
}

export function getPublicRepairAppUrl(token: string): string {
  if (typeof window === 'undefined') {
    return getPublicRepairPath(token);
  }

  return `${window.location.origin}${getPublicRepairPath(token)}`;
}

export function extractPublicToken(
  publicToken?: string | null,
  publicUrl?: string | null,
): string | null {
  if (publicToken) {
    return publicToken;
  }

  if (!publicUrl) {
    return null;
  }

  const match = publicUrl.match(/\/public\/repairs\/([^/?#]+)/);

  return match?.[1] ?? null;
}
