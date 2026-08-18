import { useEffect, useMemo, useState } from 'react';

import { useAppDispatch } from '@/app/store';
import {
  buildStationWorksStats,
  getStationMasterSharePercent,
  useGetStationQuery,
  type StationWorksStats,
} from '@/entities/master';
import { repairsApi, useGetRepairsQuery, type RepairDetail } from '@/entities/repair-order';

const EMPTY_STATS: StationWorksStats = {
  worksCount: 0,
  amount: 0,
  masterShare: 0,
  stationShare: 0,
  byMaster: [],
  works: [],
};

export function useStationCompletedWorks() {
  const dispatch = useAppDispatch();
  const { data: station } = useGetStationQuery();
  const [shareVersion, setShareVersion] = useState(0);
  const sharePercent = useMemo(
    () => getStationMasterSharePercent(station),
    [station, shareVersion],
  );

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

  return {
    stats: repairIds.length === 0 ? EMPTY_STATS : stats,
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
