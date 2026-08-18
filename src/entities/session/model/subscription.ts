import type { SubscriptionStatus, User } from './types';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isNaN(time) ? null : time;
}

export function getSubscriptionStatus(user: User | null | undefined): SubscriptionStatus | null {
  if (!user) {
    return null;
  }

  if (user.subscription_status) {
    if (user.subscription_status === 'trial') {
      const endsAt = parseDate(user.trial_ends_at);

      if (endsAt != null && endsAt <= Date.now()) {
        return 'expired';
      }
    }

    if (user.subscription_status === 'active') {
      const endsAt = parseDate(user.subscription_ends_at);

      if (endsAt != null && endsAt <= Date.now()) {
        return 'expired';
      }
    }

    return user.subscription_status;
  }

  const trialEndsAt = parseDate(user.trial_ends_at);

  if (trialEndsAt != null) {
    return trialEndsAt > Date.now() ? 'trial' : 'expired';
  }

  return null;
}

/** Старые аккаунты без полей подписки не блокируем. */
export function isSubscriptionBlocked(user: User | null | undefined): boolean {
  const status = getSubscriptionStatus(user);

  return status === 'expired' || status === 'blocked';
}

export function getTrialDaysLeft(user: User | null | undefined): number | null {
  if (getSubscriptionStatus(user) !== 'trial') {
    return null;
  }

  const endsAt = parseDate(user?.trial_ends_at);

  if (endsAt == null) {
    return null;
  }

  return Math.max(0, Math.ceil((endsAt - Date.now()) / MS_IN_DAY));
}

export function getPostAuthPath(user: User): string {
  return isSubscriptionBlocked(user) ? '/billing' : '/dashboard';
}
