import { useGetStationQuery } from '@/entities/master';

export function useStationReferralLink() {
  const { data: profile, isLoading } = useGetStationQuery();
  const code = profile?.referral_code?.trim() ?? '';
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const link = code && origin ? `${origin}/register?ref=${encodeURIComponent(code)}` : '';

  return {
    code,
    isLoading,
    link,
  };
}
