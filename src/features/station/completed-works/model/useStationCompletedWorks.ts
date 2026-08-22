import { useEffect, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';

import { useAppDispatch } from '@/app/store';
import {
  buildStationWorksStats,
  getStationMasterSharePercent,
  useGetStationQuery,
  type StationWorksStats,
} from '@/entities/master';
import { repairsApi, useGetRepairsQuery, type RepairDetail } from '@/entities/repair-order';

export type CompletedWorksPeriod = 'all' | 'week' | 'month' | 'quarter' | 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayStart(value: string | Date): number {
  const date = typeof value === 'string' ? parseISO(value) : value;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return start.getTime();
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPresetRange(period: CompletedWorksPeriod): [string, string] | null {
  if (period === 'all' || period === 'custom') {
    return null;
  }

  const end = new Date();
  const start = new Date();

  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'month') {
    start.setDate(start.getDate() - 29);
  } else {
    start.setDate(start.getDate() - 89);
  }

  return [toYmd(start), toYmd(end)];
}

export function useStationCompletedWorks() {
  const dispatch = useAppDispatch();
  const { data: station } = useGetStationQuery();
  const [shareVersion, setShareVersion] = useState(0);
  const [period, setPeriodState] = useState<CompletedWorksPeriod>('all');
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const sharePercent = useMemo(
    () => getStationMasterSharePercent(station),
    [station, shareVersion],
  );

  const setPeriod = (next: CompletedWorksPeriod) => {
    setPeriodState(next);

    if (next !== 'custom') {
      setCustomRange(null);
    }
  };

  const dateRange = period === 'custom' ? customRange : getPresetRange(period);

  const completedQuery = useGetRepairsQuery({ status: 'completed', per_page: 30, page: 1 });
  const doneQuery = useGetRepairsQuery({ status: 'done', per_page: 30, page: 1 });

  const repairIds = useMemo(() => {
    const map = new Map<string, true>();
    const ordered: string[] = [];

    for (const item of [...(completedQuery.data?.data ?? []), ...(doneQuery.data?.data ?? [])]) {
      if (map.has(item.id)) {
        continue;
      }

      map.set(item.id, true);
      ordered.push(item.id);
    }

    return ordered.slice(0, 40);
  }, [completedQuery.data?.data, doneQuery.data?.data]);

  const [repairs, setRepairs] = useState<RepairDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (repairIds.length === 0) {
      setRepairs([]);
      setIsLoadingDetails(false);
      return;
    }

    setIsLoadingDetails(true);

    void (async () => {
      const results = await Promise.all(
        repairIds.map(async (id) => {
          try {
            return await dispatch(repairsApi.endpoints.getRepair.initiate(id)).unwrap();
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setRepairs(results.filter((item): item is RepairDetail => item != null));
      setIsLoadingDetails(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, repairIds]);

  const stats = useMemo(
    () => buildStationWorksStats(repairs, sharePercent),
    [repairs, sharePercent],
  );

  const periodStats = useMemo<StationWorksStats>(() => {
    if (dateRange == null) {
      return stats;
    }

    const fromAt = toDayStart(dateRange[0]);
    const toAt = toDayStart(dateRange[1]) + DAY_MS;

    if (Number.isNaN(fromAt) || Number.isNaN(toAt)) {
      return stats;
    }

    const filtered = repairs.filter((repair) => {
      const completedAt = parseISO(repair.updated_at).getTime();

      if (Number.isNaN(completedAt)) {
        return false;
      }

      return completedAt >= fromAt && completedAt < toAt;
    });

    return buildStationWorksStats(filtered, sharePercent);
  }, [dateRange, repairs, stats, sharePercent]);

  return {
    stats: periodStats,
    period,
    setPeriod,
    customRange,
    setCustomRange,
    sharePercent,
    refreshSharePercent: () => setShareVersion((value) => value + 1),
    isLoading:
      completedQuery.isLoading || doneQuery.isLoading || (repairIds.length > 0 && isLoadingDetails),
    isError: completedQuery.isError && doneQuery.isError,
    refetch: () => {
      void completedQuery.refetch();
      void doneQuery.refetch();
    },
  };
}
