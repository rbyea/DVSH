import { PUBLIC_APP_ORIGIN } from '@/shared/config';

export function getPublicRepairPath(token: string): string {
  return `/public/vehicles/${token}`;
}

export function getPublicRepairAppUrl(token: string): string {
  return `${PUBLIC_APP_ORIGIN}${getPublicRepairPath(token)}`;
}

/** Local cabinet preview uses the running origin so the new public UI is visible. */
export function getPublicRepairPreviewUrl(token: string): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}${getPublicRepairPath(token)}`;
  }

  return getPublicRepairAppUrl(token);
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

  const match = publicUrl.match(/\/public\/(?:vehicles|repairs)\/([^/?#]+)/);

  return match?.[1] ?? null;
}
