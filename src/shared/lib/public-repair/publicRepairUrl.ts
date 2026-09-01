import { PUBLIC_APP_ORIGIN } from '@/shared/config';

export function getPublicRepairPath(token: string): string {
  return `/public/vehicles/${token}`;
}

export function getPublicRepairAppUrl(token: string): string {
  return `${PUBLIC_APP_ORIGIN}${getPublicRepairPath(token)}`;
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
