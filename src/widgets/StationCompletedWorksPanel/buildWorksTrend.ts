import { parseISO } from 'date-fns';

import type { CompletedWorkRow } from '@/entities/master';
import type { CompletedWorksPeriod } from '@/features/station/completed-works';

export type WorksTrendPoint = {
  label: string;
  count: number;
  amount: number;
  masterShare: number;
  stationShare: number;
};

type Granularity = 'day' | 'week' | 'month';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonday(date: Date): Date {
  const day = startOfDay(date);
  const weekday = day.getDay();
  const shift = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + shift);

  return day;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function bucketStart(date: Date, granularity: Granularity): Date {
  if (granularity === 'month') {
    return startOfMonth(date);
  }

  if (granularity === 'week') {
    return startOfMonday(date);
  }

  return startOfDay(date);
}

function nextBucket(date: Date, granularity: Granularity): Date {
  const next = new Date(date);

  if (granularity === 'month') {
    next.setMonth(next.getMonth() + 1);
  } else if (granularity === 'week') {
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function formatBucketLabel(date: Date, granularity: Granularity): string {
  if (granularity === 'month') {
    return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
  }

  if (granularity === 'week') {
    const end = new Date(date);
    end.setDate(end.getDate() + 6);

    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function resolveGranularity(
  period: CompletedWorksPeriod,
  customRange: [string, string] | null,
  spanDays: number,
): Granularity {
  if (period === 'week' || period === 'month') {
    return 'day';
  }

  if (period === 'quarter') {
    return 'week';
  }

  if (period === 'custom' && customRange) {
    if (spanDays <= 21) {
      return 'day';
    }

    if (spanDays <= 120) {
      return 'week';
    }

    return 'month';
  }

  if (spanDays <= 21) {
    return 'day';
  }

  if (spanDays <= 120) {
    return 'week';
  }

  return 'month';
}

function resolveBounds(
  period: CompletedWorksPeriod,
  customRange: [string, string] | null,
  works: CompletedWorkRow[],
): { from: Date; to: Date } | null {
  const times = works
    .map((work) => parseISO(work.completedAt).getTime())
    .filter((time) => !Number.isNaN(time));

  if (times.length === 0) {
    return null;
  }

  const dataFrom = startOfDay(new Date(Math.min(...times)));
  const dataTo = startOfDay(new Date(Math.max(...times)));
  const today = startOfDay(new Date());

  if (period === 'custom' && customRange) {
    return {
      from: startOfDay(parseISO(customRange[0])),
      to: startOfDay(parseISO(customRange[1])),
    };
  }

  if (period === 'week') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);

    return { from, to: today };
  }

  if (period === 'month') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);

    return { from, to: today };
  }

  if (period === 'quarter') {
    const from = new Date(today);
    from.setDate(from.getDate() - 89);

    return { from, to: today };
  }

  return { from: dataFrom, to: dataTo };
}

export function buildWorksTrend(
  works: CompletedWorkRow[],
  period: CompletedWorksPeriod,
  customRange: [string, string] | null,
): WorksTrendPoint[] {
  const bounds = resolveBounds(period, customRange, works);

  if (!bounds) {
    return [];
  }

  const spanDays = Math.max(
    1,
    Math.round((bounds.to.getTime() - bounds.from.getTime()) / DAY_MS) + 1,
  );
  const granularity = resolveGranularity(period, customRange, spanDays);
  const from = bucketStart(bounds.from, granularity);
  const to = bucketStart(bounds.to, granularity);
  const totals = new Map<number, WorksTrendPoint>();

  for (
    let cursor = new Date(from);
    cursor.getTime() <= to.getTime();
    cursor = nextBucket(cursor, granularity)
  ) {
    totals.set(cursor.getTime(), {
      label: formatBucketLabel(cursor, granularity),
      count: 0,
      amount: 0,
      masterShare: 0,
      stationShare: 0,
    });
  }

  for (const work of works) {
    const time = parseISO(work.completedAt).getTime();

    if (Number.isNaN(time)) {
      continue;
    }

    const key = bucketStart(new Date(time), granularity).getTime();
    const bucket = totals.get(key);

    if (!bucket) {
      continue;
    }

    bucket.count += 1;
    bucket.amount += work.price;
    bucket.masterShare += work.masterShare;
    bucket.stationShare += work.stationShare;
  }

  return [...totals.entries()].sort((a, b) => a[0] - b[0]).map(([, point]) => point);
}
