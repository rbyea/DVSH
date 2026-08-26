import { getPlanByDurationMs } from './plans';

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const DAYS_IN_MONTH = 30.4375;
const STORAGE_PREFIX = 'dvsh.paid-period-ms.';

function periodMsFromRemaining(remainingMs: number): number {
  const plan = getPlanByDurationMs(remainingMs);

  if (plan) {
    return plan.months * DAYS_IN_MONTH * MS_IN_DAY;
  }

  return remainingMs;
}

function readStoredPeriodMs(key: string): number | null {
  try {
    const saved = Number(localStorage.getItem(key));

    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
}

function writeStoredPeriodMs(key: string, periodMs: number): void {
  try {
    localStorage.setItem(key, String(periodMs));
  } catch {
    // private mode / quota
  }
}

/**
 * Доля оставшегося оплаченного срока. Длину периода запоминаем по дате окончания:
 * 4 месяца сначала 100%, затем полоса уезжает от конца. После продления дата меняется —
 * шкала снова полная.
 */
export function getPaidPeriodProgressPercent(
  userId: number,
  endsAt: string,
  remainingMs: number,
): number {
  if (remainingMs <= 0) {
    return 0;
  }

  const key = `${STORAGE_PREFIX}${userId}:${endsAt}`;
  const stored = readStoredPeriodMs(key);
  let periodMs = stored ?? periodMsFromRemaining(remainingMs);

  if (remainingMs > periodMs) {
    periodMs = periodMsFromRemaining(remainingMs);
  }

  if (stored !== periodMs) {
    writeStoredPeriodMs(key, periodMs);
  }

  return Math.min(100, Math.max(10, Math.round((remainingMs / periodMs) * 100)));
}
